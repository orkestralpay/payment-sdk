import perfectionist from 'eslint-plugin-perfectionist';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      perfectionist,
    },
    rules: {
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          groups: [
            'type',
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
        },
      ],
      'perfectionist/sort-interfaces': [
        'error',
        {
          type: 'natural',
          partitionByNewLine: true,
        },
      ],
      'perfectionist/sort-objects': [
        'error',
        {
          type: 'natural',
          partitionByNewLine: true,
        },
      ],
      'perfectionist/sort-object-types': [
        'error',
        {
          type: 'natural',
          partitionByNewLine: true,
        },
      ],
      'perfectionist/sort-enums': [
        'error',
        {
          type: 'natural',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  },
];
