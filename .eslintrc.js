module.exports = {
    env: {
        node: true,
        es2023: true,
        jest: true,
    },
    extends: ['eslint:recommended', 'prettier'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-duplicate-imports': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
    },
};
