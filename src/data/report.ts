import { Alert, Linking, Share } from 'react-native';
import type { Entry, Place } from './catalog';

// Kept in .env.local rather than the public repo, so the address isn't scraped.
const EMAIL = process.env.EXPO_PUBLIC_REPORT_EMAIL;
// The drive-time Worker also files place reports as GitHub issues (POST /report).
const ROUTING_URL = process.env.EXPO_PUBLIC_ROUTING_URL;

/** Reports go through the in-app form when the Worker is set up, otherwise by email. */
export const canReportInApp = !!ROUTING_URL;
export const canReport = canReportInApp || !!EMAIL;
export const canSendFeedback = !!EMAIL;

export type Reason = 'closed' | 'wrong-activity' | 'wrong-location' | 'other';

export const REASONS: { reason: Reason; label: string }[] = [
  { reason: 'closed', label: 'Closed for good' },
  { reason: 'wrong-activity', label: 'Not a place for this activity' },
  { reason: 'wrong-location', label: 'Wrong location on the map' },
  { reason: 'other', label: 'Something else' },
];

export type PlaceReport = {
  placeId: string;
  placeName: string;
  activityId: string;
  activityName: string;
  city: string;
  reason: Reason;
  note: string;
};

/** The Worker's report endpoint, or null without one. */
export function reportUrl(routingUrl = ROUTING_URL): string | null {
  return routingUrl ? new URL('/report', routingUrl).toString() : null;
}

/** Files a report through the Worker. Throws when it can't, so the form can offer email instead. */
export async function sendPlaceReport(report: PlaceReport): Promise<void> {
  const url = reportUrl();
  if (!url) throw new Error('Reports are not set up');
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
  if (!response.ok) throw new Error(`Report failed with ${response.status}`);
}

/** Opens a filled-in email about a wrong or closed place, or the share sheet when there's no mail app. */
export async function emailPlaceReport(place: Place, entry: Entry, cityName: string, note = '') {
  const subject = `Wrong place: ${place.name}`;
  const body = [
    `Place: ${place.name} (${place.id})`,
    `Activity: ${entry.name} (${entry.activityId})`,
    `City: ${cityName}`,
    '',
    note || "What's wrong? (closed, not a place for this activity, wrong location, something else)",
    '',
  ].join('\n');
  const url = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    if (!EMAIL) throw new Error('No email');
    await Linking.openURL(url);
  } catch {
    await Share.share({ message: `${subject}\n\n${body}` });
  }
}

/** Opens an email for general feedback, with the app version and platform filled in. */
export async function sendFeedback(version: string | undefined, platform: string) {
  const subject = 'Feedback on Try Something New';
  const body = ['', '', '---', `Version ${version ?? 'unknown'} on ${platform}`].join('\n');
  const url = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No mail app', `Write to ${EMAIL} with your feedback.`);
  }
}
