// Sign-in pages send the browser back to trysomethingnew://auth-callback. expo-web-browser picks that link up and
// finishes signing in, so the router leaves it alone instead of showing a missing screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  return path.includes('auth-callback') ? null : path;
}
