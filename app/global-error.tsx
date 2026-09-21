'use client';

// Last-resort boundary, for an error thrown by the root layout itself.
//
// This one replaces the whole document, so it carries its own <html> and
// <body> and cannot rely on the application's stylesheet having loaded. The
// styles are therefore inline, and the emergency number is plain text and a
// tel: link, so it survives even if nothing else does.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          background: '#ffffff',
          color: '#1a1a1a',
        }}
      >
        <div style={{ maxWidth: '32rem', width: '100%' }}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>SafezoneBUP is unavailable</h1>

          <p style={{ margin: '0 0 1.5rem', color: '#555' }}>
            The application failed to start. This is a fault on our side, not something you did.
          </p>

          <div
            style={{
              border: '1px solid #f0c8c8',
              background: '#fdf5f5',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ margin: '0 0 0.75rem', fontWeight: 600 }}>
              In an emergency, call 999 now.
            </p>
            <a
              href="tel:999"
              style={{
                display: 'inline-block',
                background: '#b91c2c',
                color: '#fff',
                padding: '0.7rem 1.5rem',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Call 999
            </a>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#666' }}>
              Police, fire and ambulance. Toll free, 24 hours.
            </p>
          </div>

          <button
            onClick={reset}
            style={{
              padding: '0.7rem 1.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Try again
          </button>

          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#888' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
