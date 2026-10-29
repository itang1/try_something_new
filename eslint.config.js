const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*'] },
  // The Overture importer has its own dependencies (`npm install --prefix scripts/overture`), which CI doesn't install.
  { files: ['scripts/overture/**'], rules: { 'import/no-unresolved': 'off' } },
]);
