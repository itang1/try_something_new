import { Share } from 'react-native';
import type { Entry, Place } from './catalog';
import { formatDay } from './days';

function when(day: string): string {
  const label = formatDay(day);
  return label === 'Today' || label === 'Tomorrow' ? ` ${label.toLowerCase()}` : ` on ${label}`;
}

/** Opens the share sheet with an invite. The link is a Google Maps search, which opens on any phone. */
export function inviteFriend(entry: Entry, place: Place | null, day: string | null) {
  const details = `${entry.name}${day ? when(day) : ''}${place ? ` at ${place.name}` : ''}`;
  const link = place ? `\nhttps://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}` : '';
  return Share.share({ message: `Want to come with me? ${details}${link}` });
}
