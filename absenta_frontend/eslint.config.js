import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import absentaHardening from './config/eslint-plugin-absenta-hardening.js'

export default defineConfig([
  globalIgnores(['dist', 'android/**/build/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/utils/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/utils/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/types/**/*.{ts,tsx,d.ts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/setupTests.ts'],
    rules: {
      'no-var': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/services/**/*.{ts,tsx}', 'src/store/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-case-declarations': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'react-hooks/rules-of-hooks': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  {
    files: ['src/providers/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'react-hooks/rules-of-hooks': 'warn',
      'no-prototype-builtins': 'warn',
    },
  },
  {
    files: ['src/api/**/*.{ts,tsx}'],
    rules: {
      'no-useless-catch': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-useless-catch': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
  {
    files: ['src/main.tsx'],
    rules: {
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/debug/**/*.{ts,tsx}'],
    rules: {
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    plugins: {
      'absenta-hardening': absentaHardening,
    },
    rules: {
      'absenta-hardening/safe-map-chaining': 'error',
      'absenta-hardening/no-unsafe-as-any': 'error',
    },
  },
])
