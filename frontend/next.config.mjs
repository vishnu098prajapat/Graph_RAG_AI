/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdf.js optionally requires the native "canvas" package (Node only); we only render in the browser.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
