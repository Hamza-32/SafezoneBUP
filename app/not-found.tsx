// Shown for any URL that does not exist. The application is a single page,
// so this is mostly reached from a stale link or a mistyped address.

import { MapPin, Phone } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="icon-tile mb-5 h-12 w-12 bg-accent/10 text-accent">
            <MapPin className="h-6 w-6" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-foreground">Page not found</h1>

          <p className="mb-6 text-muted-foreground">
            That address does not exist. It may have been a stale link, or a typo.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to home
            </a>
            <a
              href="tel:999"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-input bg-background px-6 font-medium transition-colors hover:bg-muted"
            >
              <Phone className="mr-2 h-4 w-4" />
              Emergency: 999
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
