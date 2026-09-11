/** @type {import('next').NextConfig} */

/**
 * Response headers applied to every route.
 *
 * These are cheap, browser-enforced defences. HSTS is only meaningful over
 * HTTPS, which is what Vercel serves, and is harmless on plain HTTP in local
 * development because browsers ignore it there.
 */
const securityHeaders = [
  // Do not let another site frame the app, which blocks clickjacking of the
  // emergency and SOS controls.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop the browser guessing a different content type than the one sent.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Send only the origin when navigating away, never the full path.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nothing here needs these device capabilities except geolocation, which
  // the emergency form uses on its own origin.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=()',
  },
  // Require HTTPS for a year once the browser has seen this header.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig = {
  images: {
    unoptimized: true,
  },

  // Do not advertise the framework version in responses.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
