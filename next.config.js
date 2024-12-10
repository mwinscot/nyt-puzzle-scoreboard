// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false, // Set to true if you want to handle ESLint errors as warnings
  },
}

module.exports = nextConfig;