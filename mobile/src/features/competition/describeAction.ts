import type { CompetitionDetails, ViewerState } from '@/api/types';
import type { Lang } from '@/i18n';
import type { strings } from '@/i18n/strings';
import { formatDate, formatMinSec, formatMoney } from '@/lib/format';

export type ActionDescription = { label: string; sublabel?: string; enabled: boolean };

/**
 * Turns the server's `action` into button text. The *decision* is made by the server;
 * this only words it. Kept pure so it is trivial to unit test.
 */
export function describeAction(
  viewer: ViewerState,
  competition: Pick<CompetitionDetails, 'entryFee'>,
  t: (typeof strings)['en'],
  lang: Lang,
  now: number,
): ActionDescription {
  const { action, registration, submission } = viewer;
  const date = (iso: string | null) => (iso ? formatDate(iso, lang) : '');
  const enabled = action.enabled;

  switch (action.type) {
    case 'register':
      return {
        label: `${t.cta.register} · ${competition.entryFee ? formatMoney(competition.entryFee) : t.free}`,
        sublabel: action.at ? t.ctaSub.until(date(action.at)) : undefined,
        enabled,
      };
    case 'complete_payment': {
      const left = registration?.holdExpiresAt ? Date.parse(registration.holdExpiresAt) - now : 0;
      return { label: t.cta.complete_payment, sublabel: t.ctaSub.holdExpires(formatMinSec(left)), enabled };
    }
    case 'upload_submission':
      return { label: t.cta.upload_submission, sublabel: t.registered, enabled };
    case 'replace_submission':
      return { label: t.cta.replace_submission, sublabel: t.ctaSub.submittedRevision(submission?.revision ?? 1), enabled };
    case 'registration_not_open':
    case 'submission_not_open':
      return { label: t.cta[action.type], sublabel: t.ctaSub.on(date(action.at)), enabled };
    case 'awaiting_results':
      return { label: t.cta.awaiting_results, sublabel: t.ctaSub.on(date(action.at)), enabled };
    case 'sold_out':
    case 'registration_closed':
      return { label: t.cta[action.type], sublabel: t.ctaSub.tryOtherCompetitions, enabled };
    default:
      return { label: t.cta[action.type], enabled };
  }
}
