import { Linking, Share } from 'react-native';
import type { Entry, Place } from './catalog';

// Kept in .env.local rather than the public repo, so the address isn't scraped.
const EMAIL = process.env.EXPO_PUBLIC_REPORT_EMAIL;

export const canReport = !!EMAIL;

/** Opens a filled-in email about a wrong or closed place, or the share sheet when there's no mail app. */
export async function reportPlace(place: Place, entry: Entry, cityName: string) {
  const subject = `Wrong place: ${place.name}`;
  const body = [
    `Place: ${place.name} (${place.id})`,
    `Activity: ${entry.name} (${entry.activityId})`,
    `City: ${cityName}`,
    '',
    "What's wrong? (closed, not a place for this activity, wrong location, something else)",
    '',
  ].join('\n');
  const url = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
  } catch {
    await Share.share({ message: `${subject}\n\n${body}` });
  }
}
