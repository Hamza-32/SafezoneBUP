'use client';

// Route-level error boundary.
//
// Without one, any uncaught render error replaces the entire application with
// React's blank "Application error" screen — which is how a null contact
// field in Lost & Found took down emergency reporting along with it.
//
// The emergency number is on this page deliberately. If the application has
// failed, the person looking at it may be the one who needed it most, and
// telling them to call 999 costs nothing and does not depend on any of the
// code that just broke.

import { useEffect } from 'react';
import { AlertTriangle, Phone, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="icon-tile mb-5 h-12 w-12 bg-primary/10 text-primary">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-foreground">Something went wrong</h1>

          <p className="mb-6 text-muted-foreground">
            This page failed to load. The rest of the application is unaffected, and nothing
            you submitted has been lost.
          </p>

          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              If you are dealing with an emergency right now, do not wait for this page.
            </p>
            <a
              href="tel:999"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Phone className="mr-2 h-4 w-4" />
              Call 999
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              Police, fire and ambulance. Toll free, 24 hours.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-input bg-background px-6 font-medium transition-colors hover:bg-muted"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try again
            </button>
            <a
              href="/"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-input bg-background px-6 font-medium transition-colors hover:bg-muted"
            >
              Back to home
            </a>
          </div>

          {error.digest && (
            // Useful when someone reports a fault: it ties this screen to the
            // corresponding entry in the server logs without exposing a stack
            // trace to the visitor.
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Reference: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
