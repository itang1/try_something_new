import { useEffect } from 'react';
import { AppState } from 'react-native';
import { lastSyncedAt, shouldAutoSync, syncNow, useSession } from '@/data/account';
import { useAppState } from '@/state/app-state';

/** While signed in, syncs on launch, when the app goes to the background, and when it comes back after a while. */
export function AutoSync() {
  const session = useSession();
  const { reload } = useAppState();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    const run = (moment: 'launch' | 'active' | 'background') => {
      if (!shouldAutoSync(moment, lastSyncedAt())) return;
      // Offline or a server hiccup just waits for the next time; Settings shows when it last worked.
      syncNow()
        .then(({ pulled }) => pulled && reload())
        .catch(() => {});
    };
    run('launch');
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') run(state);
    });
    return () => subscription.remove();
  }, [userId, reload]);

  return null;
}
