import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useCompetitionActions } from '@/api/mutations';
import type { CompetitionDetails, ViewerState } from '@/api/types';
import { AppText, BottomSheet, Button, Card, Notice } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useCountdown } from '@/hooks/useCountdown';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errorMessage';
import { formatDate, formatMinSec, formatMoney } from '@/lib/format';
import { pendingReferral } from '@/lib/pendingReferral';
import { colors, fonts, radius, spacing } from '@/theme';

const HOLD_MINUTES = 10;
type Step = 'confirm' | 'pay' | 'expired' | 'done';

type Props = {
  slug: string;
  competition: CompetitionDetails;
  viewer: ViewerState;
  onClose: () => void;
  onUploadNow: () => void;
};

/**
 * Register → pay, as one sheet:
 *   confirm  – summary + optional referral code; reserving the seat starts the hold
 *   pay      – mock gateway with a live hold timer, success or simulated failure
 *   expired  – the hold ran out before paying
 *   done     – confirmed, with a shortcut to upload
 * Mounted only while open, so every opening starts fresh.
 */
export function CheckoutSheet({ slug, competition, viewer, onClose, onUploadNow }: Props) {
  const { t, pick, lang } = useI18n();
  const toast = useToast();
  const { register, releaseSeat, pay } = useCompetitionActions(slug);

  const [step, setStep] = useState<Step>(viewer.action.type === 'complete_payment' ? 'pay' : 'confirm');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pendingReferral.get().then((code) => code && setReferralCode(code));
  }, []);

  // The server is the source of truth: once confirmed, we're done whatever the local step says.
  const shown: Step = viewer.registration?.status === 'confirmed' && step !== 'confirm' ? 'done' : step;

  const fee = competition.entryFee ? formatMoney(competition.entryFee) : t.free;
  const order = viewer.pendingPayment;
  const busy = register.isPending || pay.isPending || releaseSeat.isPending;

  const reserve = async () => {
    setError(null);
    try {
      const state = await register.mutateAsync(referralCode.trim() || undefined);
      await pendingReferral.clear();
      if (state.registration?.status === 'confirmed') {
        setStep('done'); // free competition: no payment step
      } else {
        setStep('pay');
      }
    } catch (err) {
      setError(errorMessage(err, t.errors));
    }
  };

  const payNow = async (outcome: 'success' | 'failure') => {
    if (!order) return;
    setError(null);
    try {
      await pay.mutateAsync({ orderId: order.orderId, outcome });
      setStep('done');
      toast(t.toast.registered);
    } catch (err) {
      setError(errorMessage(err, t.errors));
    }
  };

  const release = async () => {
    try {
      await releaseSeat.mutateAsync();
      toast(t.toast.seatReleased, 'info');
      onClose();
    } catch (err) {
      setError(errorMessage(err, t.errors));
    }
  };

  const title = shown === 'pay' ? t.checkout.payTitle : shown === 'done' ? undefined : t.checkout.confirmTitle;

  return (
    <BottomSheet visible title={title} onClose={onClose} dismissable={!pay.isPending}>
      {shown === 'confirm' ? (
        <>
          <Summary competition={competition} fee={fee} seatsLeft={viewer.seats.left} />
          {competition.entryFee ? (
            <AppText variant="label">{t.checkout.holdNote(HOLD_MINUTES)}</AppText>
          ) : null}
          <View style={{ gap: spacing.xs }}>
            <AppText variant="label" weight="medium" color={colors.text}>
              {t.checkout.referralLabel}
            </AppText>
            <TextInput
              value={referralCode}
              onChangeText={(v) => setReferralCode(v.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
              placeholder={t.checkout.referralPlaceholder}
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={16}
              accessibilityLabel={t.checkout.referralLabel}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md,
                fontFamily: fonts.medium,
                fontSize: 15,
                color: colors.text,
                letterSpacing: 1,
              }}
            />
          </View>
          <Notice text={error} />
          <Button
            label={competition.entryFee ? t.checkout.reserveAndPay(fee) : t.checkout.registerFree}
            onPress={reserve}
            loading={register.isPending}
          />
        </>
      ) : shown === 'pay' && order && viewer.registration?.holdExpiresAt ? (
        <PayStep
          fee={fee}
          orderId={order.orderId}
          holdExpiresAt={viewer.registration.holdExpiresAt}
          title={pick(competition.title)}
          error={error}
          busy={busy}
          paying={pay.isPending}
          releasing={releaseSeat.isPending}
          onPay={() => payNow('success')}
          onFail={() => payNow('failure')}
          onRelease={release}
          onExpire={() => {
            setError(null);
            setStep('expired');
          }}
        />
      ) : shown === 'expired' ? (
        <>
          <Notice tone="warning" text={t.checkout.holdExpired} />
          <Button label={t.checkout.tryAgain} onPress={() => setStep('confirm')} />
        </>
      ) : shown === 'done' ? (
        <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <AppText variant="title" align="center">
            {t.checkout.successTitle}
          </AppText>
          <AppText variant="body" align="center">
            {t.checkout.successBody(formatDate(competition.schedule.submissionEndsAt, lang))}
          </AppText>
          <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm }}>
            {viewer.timeline.isSubmissionWindowOpen ? <Button label={t.checkout.uploadNow} onPress={onUploadNow} /> : null}
            <Button label={t.checkout.done} variant="secondary" onPress={onClose} />
          </View>
        </View>
      ) : (
        // Failed while fetching the order: show the error and let them close.
        <>
          <Notice text={error ?? t.errors.default} />
          <Button label={t.checkout.done} variant="secondary" onPress={onClose} />
        </>
      )}
    </BottomSheet>
  );
}

function PayStep(props: {
  fee: string;
  orderId: string;
  holdExpiresAt: string;
  title: string;
  error: string | null;
  busy: boolean;
  paying: boolean;
  releasing: boolean;
  onPay: () => void;
  onFail: () => void;
  onRelease: () => void;
  onExpire: () => void;
}) {
  const { t } = useI18n();
  const left = useCountdown(props.holdExpiresAt, props.onExpire);
  const urgent = (left?.totalMs ?? 0) < 60_000;

  return (
    <>
      <Card tone="tint" style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primaryText} />
          <AppText variant="caption" weight="semibold" color={colors.primaryText}>
            {t.checkout.testMode}
          </AppText>
        </View>
        <Row label={t.checkout.amount} value={props.fee} strong />
        <Row label={t.checkout.orderId} value={props.orderId} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="label">{t.checkout.seatHeldFor}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityRole="timer">
            <Ionicons name="timer-outline" size={16} color={urgent ? colors.danger : colors.primaryText} />
            <AppText variant="subheading" weight="semibold" color={urgent ? colors.danger : colors.primaryText} style={{ fontVariant: ['tabular-nums'] }}>
              {formatMinSec(left?.totalMs ?? 0)}
            </AppText>
          </View>
        </View>
      </Card>
      <Notice text={props.error} />
      <Button label={t.checkout.pay(props.fee)} onPress={props.onPay} loading={props.paying} disabled={props.busy} />
      <View style={{ gap: 0 }}>
        <Button label={t.checkout.simulateFailure} variant="ghost" onPress={props.onFail} disabled={props.busy} />
        <Button label={t.checkout.releaseSeat} variant="danger" onPress={props.onRelease} loading={props.releasing} disabled={props.busy} />
      </View>
    </>
  );
}

function Summary({ competition, fee, seatsLeft }: { competition: CompetitionDetails; fee: string; seatsLeft: number }) {
  const { t, pick } = useI18n();
  return (
    <Card style={{ gap: spacing.sm }} flat>
      <AppText variant="heading">{pick(competition.title)}</AppText>
      <Row label={t.entryFee} value={fee} strong />
      <Row label={t.prizePool} value={formatMoney(competition.prizePool)} />
      <Row label="" value={seatsLeft ? t.spotsLeft(seatsLeft) : t.allSpotsBooked} />
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant={strong ? 'heading' : 'label'} color={strong ? colors.text : colors.primaryText} numberOfLines={1} style={{ flexShrink: 1 }}>
        {value}
      </AppText>
    </View>
  );
}

