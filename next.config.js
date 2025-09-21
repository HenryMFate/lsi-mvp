/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = nextConfig;
module.exports = {
  ...module.exports,
  async rewrites() {
    return [
      { source: '/sw.js', destination: '/sw.js' }
    ];
  }
};
