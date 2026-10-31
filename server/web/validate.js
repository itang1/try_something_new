// Checks for what the site stores, matching supabase/migrations/20261031200000_growth_counts.sql so bad input never
// reaches Supabase.
import { isActivityId } from './catalog.js';

export const SHARE_KINDS = ['tried', 'invite', 'bucket', 'partner', 'other'];
export const LINK_EVENTS = ['visit', 'app_store', 'play_store', 'open_app', 'waitlist'];

/** The kind of share a link came from, from its `?s=`. Anything unknown is "other". Never who shared it. */
export function parseShareKind(value) {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return SHARE_KINDS.includes(s) ? s : 'other';
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A waitlist row, or an error to show. City and source are optional. A filled-in `website` field is the honeypot that
 * only bots see, reported as `bot` so the caller can pretend it worked.
 * @returns {{ row: { email: string, city: string | null, source: string | null } } | { error: string } | { bot: true }}
 */
export function validateWaitlist(input) {
  if (text(input?.website)) return { bot: true };
  const email = text(input?.email);
  if (email.length < 3 || email.length > 254 || !EMAIL.test(email)) return { error: 'Please enter a valid email address.' };
  const city = text(input?.city);
  if (city.length > 80) return { error: 'Please keep the city under 80 characters.' };
  const source = text(input?.source).toLowerCase();
  return {
    row: { email, city: city || null, source: /^[a-z0-9_-]{1,40}$/.test(source) ? source : null },
  };
}

/**
 * A link_events row, or null when the event isn't one the table takes. The activity must be one the site knows.
 * @returns {{ event: string, share_kind: string, activity_id: string | null } | null}
 */
export function validateCount(input) {
  const event = text(input?.event);
  if (!LINK_EVENTS.includes(event)) return null;
  const id = text(input?.activity_id);
  if (id && !isActivityId(id)) return null;
  return { event, share_kind: parseShareKind(input?.share_kind), activity_id: id || null };
}

/** A store link from a var, only when it's https. */
export function storeUrl(value) {
  const url = text(value);
  return /^https:\/\/[^\s"'<>]+$/.test(url) ? url : null;
}
