const nextEslint = require('eslint-config-next');
const tseslint = require('typescript-eslint');

module.exports = [
  {
    ignores: [".next/", "node_modules/", "out/", "build/"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-var-requires": "off"
    },
  },
];