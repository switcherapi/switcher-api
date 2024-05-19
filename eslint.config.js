import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ...js.configs.recommended,
        files: ['src/**/*.js']
    },
    {
        files: ['src/**/*.js'],
        rules: {
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            curly: ['error', 'multi-line'],
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node
            }
        }
    }
];