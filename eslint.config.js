// @ts-check
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
    {
        ignores: [
            'dist/',
            'node_modules/',
            'playwright-report/',
            'allure-results/',
            'allure-report/',
            'eslint.config.js',
        ],
    },
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts', 'tests/**/*.ts', 'playwright.config.ts'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
            },
        },
    }
);
