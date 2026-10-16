import { useRouter } from 'expo-router';
import type { Entry } from '@/data/catalog';
import { useAppState } from './app-state';

/** Toggles done, and opens the Done moment when something is newly checked off. */
export function useMarkDone() {
  const router = useRouter();
  const { isDone, toggleDone } = useAppState();
  return (entry: Entry) => {
    const wasDone = isDone(entry.id);
    toggleDone(entry);
    if (!wasDone) router.push(`/done/${entry.id}`);
  };
}
