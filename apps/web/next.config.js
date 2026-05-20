/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    INTERNAL_API_URL: process.env.INTERNAL_API_URL || "http://localhost:3000",
  },
};

export default nextConfig;
