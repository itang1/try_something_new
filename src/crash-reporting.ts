import * as Sentry from '@sentry/react-native';

// Set in .env.local or the EAS environment. Without it nothing is sent, so local and fork builds stay quiet.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  // Development builds already show errors on screen.
  enabled: !!DSN && !__DEV__,
  environment: __DEV__ ? 'development' : 'production',
  // Places, plans and locations stay on the device. Crash reports carry no user details or IP address.
  sendDefaultPii: false,
  tracesSampleRate: 0.2,
  integrations: [Sentry.expoRouterIntegration()],
});

export const wrap = Sentry.wrap;

/** Expo Router's per-route error boundary, reporting to Sentry before it shows the fallback. */
export const wrapErrorBoundary = Sentry.wrapExpoRouterErrorBoundary;
