import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { ApiError } from '@/api/client';
import { useCompetitionActions } from '@/api/mutations';
import type { ViewerState } from '@/api/types';
import { uploadVideo } from '@/api/upload';
import { AppText, BottomSheet, Button, Card, Notice, ProgressBar } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errorMessage';
import { formatDate } from '@/lib/format';
import { colors, spacing } from '@/theme';

/** Kept in line with the backend (MAX_UPLOAD_MB and the 15-minute submission rule). */
const MAX_UPLOAD_MB = 200;
const MAX_DURATION_SEC = 15 * 60;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-matroska'];

type Step = 'pick' | 'ready' | 'uploading' | 'done';

type Props = {
  slug: string;
  viewer: ViewerState;
  onClose: () => void;
  onWatch: (url: string) => void;
};

/**
 * expo-image-picker reports duration in milliseconds on iOS/Android but in seconds on
 * web (it reads <video>.duration), and some web recordings report Infinity. Normalise to
 * milliseconds, or null when unknown.
 */
function durationMs(asset: ImagePicker.ImagePickerAsset): number | null {
  const d = asset.duration;
  if (d == null || !Number.isFinite(d) || d <= 0) return null;
  return Platform.OS === 'web' ? d * 1000 : d;
}

const mb = (bytes?: number) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '');
const mmss = (ms?: number | null) => {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Pick → check → upload (with progress, cancellable) → submit. Mounted only while open. */
export function UploadSheet({ slug, viewer, onClose, onWatch }: Props) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { submit } = useCompetitionActions(slug);

  const [step, setStep] = useState<Step>('pick');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const existing = viewer.submission;

  /** Catch problems before spending the user's data on an upload the server would refuse. */
  const validate = (a: ImagePicker.ImagePickerAsset): string | null => {
    if (a.mimeType && !ALLOWED_TYPES.includes(a.mimeType)) return t.errors.UNSUPPORTED_FILE_TYPE;
    if (a.fileSize && a.fileSize > MAX_UPLOAD_MB * 1024 * 1024) return t.errors.FILE_TOO_LARGE;
    const ms = durationMs(a);
    if (ms && ms / 1000 > MAX_DURATION_SEC) return t.errors.VIDEO_TOO_LONG;
    return null;
  };

  const pick = async () => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false });
      if (result.canceled || !result.assets[0]) return;
      const picked = result.assets[0];
      const problem = validate(picked);
      setAsset(picked);
      setError(problem);
      setStep('ready');
    } catch {
      setError(t.upload.permission);
    }
  };

  const upload = async () => {
    if (!asset) return;
    setError(null);
    setProgress(0);
    setStep('uploading');
    abort.current = new AbortController();
    try {
      const video = await uploadVideo(asset, { onProgress: setProgress, signal: abort.current.signal });
      const ms = durationMs(asset);
      await submit.mutateAsync({ video, durationSec: ms ? Math.max(1, Math.round(ms / 1000)) : undefined });
      setStep('done');
      toast(t.toast.submitted);
    } catch (err) {
      setStep('ready');
      setError(err instanceof ApiError && err.code === 'UPLOAD_CANCELLED' ? null : errorMessage(err, t.errors));
    }
  };

  const title = step === 'done' ? undefined : existing ? t.upload.replaceTitle : t.upload.title;

  return (
    <BottomSheet visible title={title} onClose={onClose} dismissable={step !== 'uploading'}>
      {step === 'done' ? (
        <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
          <Ionicons name="cloud-done" size={64} color={colors.success} />
          <AppText variant="title" align="center">
            {t.upload.doneTitle}
          </AppText>
          <AppText variant="body" align="center">
            {t.upload.doneBody(viewer.submission?.revision ?? 1)}
          </AppText>
          <Button label={t.checkout.done} onPress={onClose} style={{ alignSelf: 'stretch', marginTop: spacing.sm }} />
        </View>
      ) : (
        <>
          <AppText variant="label">{t.upload.requirements(MAX_UPLOAD_MB)}</AppText>

          {existing && step === 'pick' ? (
            <Card flat style={{ gap: spacing.sm }}>
              <AppText variant="label" color={colors.text}>
                {t.upload.current(existing.revision, formatDate(existing.submittedAt, lang))}
              </AppText>
              <Button label={t.upload.watchCurrent} variant="secondary" onPress={() => onWatch(existing.video.url)} />
            </Card>
          ) : null}

          {asset ? (
            <Card flat style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="videocam" size={22} color={colors.primaryText} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" weight="medium" color={colors.text} numberOfLines={1}>
                  {asset.fileName ?? 'video'}
                </AppText>
                <AppText variant="caption">{[mb(asset.fileSize), mmss(durationMs(asset))].filter(Boolean).join(' · ')}</AppText>
              </View>
            </Card>
          ) : null}

          {step === 'uploading' ? (
            <View style={{ gap: spacing.sm }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
              <AppText variant="label" weight="medium" color={colors.primaryText}>
                {t.upload.uploading(Math.round(progress * 100))}
              </AppText>
              <ProgressBar value={progress} height={8} />
              <Button label={t.upload.cancel} variant="danger" onPress={() => abort.current?.abort()} />
            </View>
          ) : (
            <>
              <Notice text={error} />
              {step === 'ready' && asset && !validate(asset) ? (
                <Button label={t.upload.submit} onPress={upload} loading={submit.isPending} />
              ) : null}
              <Button
                label={asset ? t.upload.chooseAnother : t.upload.choose}
                variant={asset ? 'secondary' : 'primary'}
                onPress={pick}
              />
            </>
          )}
        </>
      )}
    </BottomSheet>
  );
}
