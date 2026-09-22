import type { Lang } from '@/i18n';

/** Paise → "₹ 1,500" with Indian digit grouping (1,00,000). Decimals only when needed. */
export function formatMoney(paise: number, { space = true }: { space?: boolean } = {}): string {
  const rupees = Math.floor(paise / 100);
  const fraction = paise % 100;
  const digits = String(rupees);
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = rest ? `${rest},${last3}` : last3;
  return `₹${space ? ' ' : ''}${grouped}${fraction ? `.${String(fraction).padStart(2, '0')}` : ''}`;
}

const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'],
};

/** "10 Aug 26" (as in the design), in the device's time zone. */
export function formatDate(value: string | Date, lang: Lang): string {
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

/** "11:50 PM" */
export function formatTime(value: string | Date): string {
  const d = new Date(value);
  const h = d.getHours() % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; totalMs: number };

export function splitDuration(ms: number): CountdownParts {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMs: total,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "01d : 06h : 28m : 32s" */
export function formatCountdown(p: CountdownParts): string {
  return `${pad(p.days)}d : ${pad(p.hours)}h : ${pad(p.minutes)}m : ${pad(p.seconds)}s`;
}

/** "09:59" for short holds. */
export function formatMinSec(ms: number): string {
  const p = splitDuration(ms);
  return `${pad(p.minutes + p.hours * 60)}:${pad(p.seconds)}`;
}
