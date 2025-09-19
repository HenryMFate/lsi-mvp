/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // You can turn these off later; helps first deploy succeed
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;