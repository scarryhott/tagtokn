module.exports = {
  presets: [
    '@babel/preset-env',
    ['@babel/preset-react', { 
      runtime: 'automatic', 
      importSource: '@emotion/react',
      // Ensure proper JSX transformation
      development: process.env.NODE_ENV === 'development',
    }],
  ],
  plugins: [
    // Ensure proper JSX transformation with Emotion
    ['@babel/plugin-transform-react-jsx', {
      runtime: 'automatic',
      importSource: '@emotion/react',
    }],
    // Enable Emotion CSS prop support
    '@emotion/babel-plugin',
  ],
  // Ensure Babel processes node_modules
  ignore: [
    /[\\/]node_modules[\\/](?!@emotion)[^\\/]+[\\/](?!(@emotion|@babel|@rollup)[\\/])/
  ],
};
