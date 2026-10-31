import { Share } from 'react-native';
import { track } from './analytics';
import type { Entry, Place } from './catalog';
import { formatDay } from './days';
import { activityLink } from './web-links';

function when(day: string): string {
  const label = formatDay(day);
  return label === 'Today' || label === 'Tomorrow' ? ` ${label.toLowerCase()}` : ` on ${label}`;
}

/** The invite's text: what, when and where, then the place on Google Maps and the idea's web page when there are. */
export function inviteMessage(entry: Entry, place: Place | null, day: string | null, base?: string): string {
  const details = `${entry.name}${day ? when(day) : ''}${place ? ` at ${place.name}` : ''}`;
  // Google Maps search links open on any phone. The web page opens the same idea in the app, or offers it.
  const map = place ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}` : null;
  // Things someone added themselves exist only on their phone, so there's no page for them.
  const page = entry.custom ? null : activityLink(entry.activityId, 'invite', base);
  return [`Want to come with me? ${details}`, map, page].filter(Boolean).join('\n');
}

/** Opens the share sheet with an invite. */
export async function inviteFriend(entry: Entry, place: Place | null, day: string | null) {
  const result = await Share.share({ message: inviteMessage(entry, place, day) });
  if (result.action === Share.sharedAction) track('invite_sent');
  return result;
}
