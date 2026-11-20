import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'coverage/', '.vercel/'] },
  js.configs.recommended,
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: ['api/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
      'no-implicit-globals': 'off',
      curly: ['error', 'multi-line'],
      'no-throw-literal': 'error',
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'no-unneeded-ternary': 'error',
      'prefer-arrow-callback': 'error',
      'no-useless-rename': 'error',
      'no-useless-computed-key': 'error',
      'symbol-description': 'error',
    },
  },
];
