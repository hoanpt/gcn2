/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'pg',
    'bcryptjs',
    'nodemailer',
    'googleapis',
    'formidable',
  ],
  // Tắt strict mode để tránh double-render trong dev (quan trọng với DB init)
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
