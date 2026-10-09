import globals from 'globals';
import js from '@eslint/js';

export default [
  { languageOptions: { globals: globals.node } },
  {
    files: ['**/*.js'],
    rules: {
      ...js.configs.recommended.rules,
      quotes: ['error', 'single'],
      semi: 'error',
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
