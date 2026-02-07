import { defineConfig } from "eslint/config";

export default defineConfig({
    files: ['src/**/*.js'],
    rules: {
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
        curly: ['error', 'multi-line'],
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    },
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
    }
});