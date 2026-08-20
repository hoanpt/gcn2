/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    'pg',
    'bcryptjs',
    'nodemailer',
    'googleapis',
    'formidable',
    'jszip',
  ],
  // Tắt strict mode để tránh double-render trong dev (quan trọng với DB init)
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=3600' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
