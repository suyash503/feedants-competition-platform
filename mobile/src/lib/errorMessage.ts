import { ApiError } from '@/api/client';
import type { strings } from '@/i18n/strings';

type ErrorStrings = (typeof strings)['en']['errors'];

/** Turn any thrown error into a message for the user, keyed on the API's stable error code. */
export function errorMessage(err: unknown, errors: ErrorStrings): string {
  if (err instanceof ApiError) {
    return errors[err.code as keyof ErrorStrings] ?? errors.default;
  }
  return errors.default;
}

export const errorCode = (err: unknown) => (err instanceof ApiError ? err.code : undefined);
