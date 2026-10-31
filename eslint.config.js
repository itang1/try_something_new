const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  // Edge Functions run on Deno, with their own imports.
  { ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'supabase/functions/*'] },
  // The Overture importer has its own dependencies (`npm install --prefix scripts/overture`), which CI doesn't install.
  { files: ['scripts/overture/**'], rules: { 'import/no-unresolved': 'off' } },
]);
