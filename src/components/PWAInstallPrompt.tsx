import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useState } from 'react';

export default function PWAInstallPrompt() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-card border rounded-lg shadow-lg p-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Download className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">Install RS Dashboard</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Install this app on your desktop for quick access.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={install} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
