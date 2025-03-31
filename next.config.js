/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add a rule to handle the undici package
    config.module.rules.push({
      test: /node_modules\/undici\/.*\.js$/,
      type: 'javascript/auto',
    });

    // Remove the existing CSS rule if it exists
    config.module.rules = config.module.rules.filter(rule => 
      !(rule.test && rule.test.toString() === /\.css$/.toString())
    );

    // Add the new CSS rule
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader', 'postcss-loader'],
    });

    return config;
  },
  transpilePackages: ['undici']
};

module.exports = nextConfig; 