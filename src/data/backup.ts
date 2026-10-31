import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { applyCatalogAliases } from './cities';
import { keptPhotoUri } from './photos';
import { exportUserData, mergeUserData, type UserData } from './storage';

const APP = 'try-something-new';
const FORMAT = 1;

/** One JSON file with the user's history, plans, lists and settings, and their photos inline as base64. */
type Backup = { app: typeof APP; format: number; exportedAt: string; data: UserData; photos: Record<string, string> };

// Photo names come from the file, so only plain names are written back, never a path.
const SAFE_NAME = /^[\w-][\w.-]*$/;

/** Writes a backup and opens the share sheet, so it can go to Files, Drive, AirDrop or email. */
export async function shareBackup(): Promise<void> {
  const data = exportUserData();
  const photos: Record<string, string> = {};
  for (const row of data.tables.reflections ?? []) {
    if (typeof row.photo !== 'string') continue;
    const file = new File(keptPhotoUri(row.photo));
    if (file.exists && SAFE_NAME.test(file.name)) photos[file.name] = await file.base64();
  }
  const backup: Backup = { app: APP, format: FORMAT, exportedAt: new Date().toISOString(), data, photos };
  const day = backup.exportedAt.slice(0, 10);
  const file = new File(Paths.cache, `try-something-new-backup-${day}.json`);
  await file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save backup' });
}

/**
 * Lets the user pick a backup and adds it to what's on the phone. Nothing on the phone is removed.
 * Returns how many items were new, or null if the user canceled.
 */
export async function restoreBackup(): Promise<number | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'application/octet-stream', 'text/plain'] });
  if (picked.canceled) return null;
  const backup = parse(await picked.result.text());
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ idempotent: true });
  for (const [name, base64] of Object.entries(backup.photos ?? {})) {
    const kept = new File(dir, name);
    if (SAFE_NAME.test(name) && typeof base64 === 'string' && !kept.exists) await kept.write(base64, { encoding: 'base64' });
  }
  const added = mergeUserData(backup.data);
  applyCatalogAliases();
  return added;
}

function parse(text: string): Backup {
  let backup: Partial<Backup>;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a Try Something New backup.");
  }
  if (backup?.app !== APP || !backup.data?.tables || !backup.data.settings) {
    throw new Error("This file isn't a Try Something New backup.");
  }
  if (typeof backup.format !== 'number' || backup.format > FORMAT) {
    throw new Error('This backup is from a newer version of the app. Update the app, then try again.');
  }
  return backup as Backup;
}
