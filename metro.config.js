// Sentry's config adds debug ids to bundles so crash reports map back to source.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
