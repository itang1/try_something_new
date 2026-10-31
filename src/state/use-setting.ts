import { useCallback, useState } from 'react';
import { readSetting, writeSetting } from '@/data/storage';

/** State kept in the settings store, so it is the same after the app restarts. */
export function useSetting<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readSetting(key, fallback));
  const set = useCallback(
    (next: T | ((prev: T) => T)) =>
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        // Writing the same value twice (Strict Mode runs updaters twice) is harmless.
        writeSetting(key, resolved);
        return resolved;
      }),
    [key],
  );
  const reload = useCallback(() => setValue(readSetting(key, fallback)), [key, fallback]);
  return [value, set, reload] as const;
}
