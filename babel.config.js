module.exports = {
  presets: [
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
        importSource: '@emotion/react',
      },
    ],
  ],
  plugins: [
    '@emotion/babel-plugin',
    ['@babel/plugin-transform-react-jsx', {
      runtime: 'automatic',
      importSource: '@emotion/react',
    }],
  ],
};
