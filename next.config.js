/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add a rule to handle the undici package
    config.module.rules.push({
      test: /node_modules\/undici\/.*\.js$/,
      type: 'javascript/auto',
    });

    return config;
  },
  transpilePackages: ['undici']
};

module.exports = nextConfig; 