import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@next/swc-win32-x64-msvc/**',
      'node_modules/@napi-rs/canvas-win32-x64-msvc/**',
      'node_modules/@img/**',
      'node_modules/typescript/**',
      'public/changepdf.jpg',
      'public/changepdf.jpg',
      'public/*.pdf',
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
