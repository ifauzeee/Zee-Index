const nextEslint = require('eslint-config-next');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
    ...nextEslint,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "warn"
        }
    },
    {
        files: ["*.js", "*.cjs"],
        rules: {
            "@typescript-eslint/no-var-requires": "off"
        }
    }
);