import { Redirect } from 'expo-router';

// The app opens on the Competitions tab.
export default function Index() {
  return <Redirect href="/competitions" />;
}
