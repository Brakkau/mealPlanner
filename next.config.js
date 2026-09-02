const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
    instrumentationHook: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow Docker-only builds to proceed without relaxing local dev checks globally.
    ignoreBuildErrors: process.env.NEXT_DOCKER_IGNORE_TS_ERRORS === 'true',
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
