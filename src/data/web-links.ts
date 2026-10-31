// The app's website: a page per activity that opens the idea in the app when it's installed (universal and app
// links) and shows the store buttons when it isn't, plus the privacy policy. Set EXPO_PUBLIC_WEB_URL to its origin,
// like https://trysomething.new, in .env or the EAS environment. Without it, shares carry no web link.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

/** The kind of share a link came from. The link carries this, never who shared it. */
export type ShareKind = 'tried' | 'invite' | 'bucket' | 'partner';

/** The origin with a scheme and no trailing slash, or null when it isn't set. */
export function webOrigin(base: string | undefined = WEB_URL): string | null {
  const trimmed = base?.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Just the host, like "trysomething.new", for the app links config. */
export function webHost(base: string | undefined = WEB_URL): string | null {
  const origin = webOrigin(base);
  if (!origin) return null;
  return origin.replace(/^https?:\/\//i, '').split(/[/?#:]/)[0].toLowerCase() || null;
}

/** A link without its scheme, short enough to print, like "trysomething.new/activity/pottery". */
export function displayLink(link: string | null): string | null {
  return link ? link.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[?#].*$/, '') : null;
}

/** The web page for an activity, tagged with the kind of share. Null when the app has no web URL. */
export function activityLink(id: string, kind: ShareKind, base: string | undefined = WEB_URL): string | null {
  const origin = webOrigin(base);
  return origin ? `${origin}/activity/${encodeURIComponent(id)}?s=${kind}` : null;
}

/** The privacy policy page, or null when the app has no web URL. */
export function privacyLink(base: string | undefined = WEB_URL): string | null {
  const origin = webOrigin(base);
  return origin ? `${origin}/privacy` : null;
}
