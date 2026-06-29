/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

// Lock down server actions to the production origin when APP_URL is set,
// so a stray `*` from a previous config doesn't quietly allow CSRF from any
// domain. Fall back to the existing `['*']` for local dev / unconfigured envs.
function serverActionOrigins() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) return ['*'];
  try {
    return [new URL(appUrl).origin];
  } catch {
    return ['*'];
  }
}

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    serverActions: { allowedOrigins: serverActionOrigins() },
  },
};

module.exports = nextConfig;
