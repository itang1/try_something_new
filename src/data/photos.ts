import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/** iOS moves the app's folder on updates, so a kept photo is found again by its file name. */
export function keptPhotoUri(stored: string): string {
  return new File(Paths.document, 'photos', stored.split('/').pop() ?? '').uri;
}

/** Lets the user pick a photo, then copies it into the app so it survives being deleted from the camera roll. */
export async function pickAndKeepPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets[0]) return null;
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ idempotent: true });
  const source = new File(result.assets[0].uri);
  const kept = new File(dir, `${Date.now()}-${source.name}`);
  source.copy(kept);
  return kept.uri;
}
