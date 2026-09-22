import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { pendingReferral } from '@/lib/pendingReferral';

/** Referral deep link: remember the code, then send the user to the competitions. */
export default function ReferralLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const valid = typeof code === 'string' && /^[A-Za-z0-9]{4,16}$/.test(code);
    (valid ? pendingReferral.set(code) : Promise.resolve()).finally(() => setSaved(true));
  }, [code]);

  return saved ? <Redirect href="/competitions" /> : null;
}
