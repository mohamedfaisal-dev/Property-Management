import nextVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react/no-unescaped-entities': 'off',
      'import/no-anonymous-default-export': 'off',
      '@next/next/no-img-element': 'warn',
    },
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'eslint-errors.txt',
    ],
  },
];

export default eslintConfig;
