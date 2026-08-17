/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
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
};

export default nextConfig;
