/**
 * ClientErrorLogger
 * Tarayıcı / Frontend tarafındaki tüm konsol hatalarını, React çökmelerini
 * ve yakalanmamış istisnaları merkezi Sistem Loglarına iletir.
 */

class ClientErrorLogger {
  private isInitialized = false;
  private recentErrors = new Set<string>();
  private readonly THROTTLE_WINDOW_MS = 5000;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. window.onerror (Unhandled JavaScript Exceptions)
    window.addEventListener('error', (event) => {
      // Ignore cross-origin script error or benign extensions
      if (!event.message || event.message === 'Script error.') return;

      const message = event.message || 'Bilinmeyen İstemci Hatası';

      // Ignore benign Vite dev server HMR / WebSocket drops when HMR is disabled in cloud sandbox
      if (
        message.includes('WebSocket') ||
        message.includes('websocket') ||
        message.includes('closed without opened') ||
        message.includes('failed to connect to websocket')
      ) {
        return;
      }

      const stack = event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`;

      this.sendErrorLog('ERROR', 'CLIENT_UI', `Tarayıcı UI Hatası: ${message}`, stack, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught_exception'
      });
    });

    // 2. window.onunhandledrejection (Unhandled Promise Rejections in UI)
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason?.message || String(reason) || 'İstemci Promise Hatası';
      const stack = reason?.stack;

      // Ignore cancelled axios requests, benign navigation aborts, or Vite HMR websocket drops
      if (
        message.includes('canceled') ||
        message.includes('AbortError') ||
        message.includes('WebSocket') ||
        message.includes('websocket') ||
        message.includes('closed without opened') ||
        message.includes('failed to connect to websocket')
      ) {
        return;
      }

      this.sendErrorLog('ERROR', 'CLIENT_UI', `İstemci Asenkron Hata: ${message}`, stack, {
        type: 'unhandled_rejection'
      });
    });

    // 3. console.error interception in Browser
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const self = this;

    console.error = function (...args: any[]) {
      originalConsoleError.apply(console, args);

      try {
        const fullMsg = args
          .map((a) => (a instanceof Error ? a.message : typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');

        // Vite / React dev warnings that are harmless
        if (
          fullMsg.includes('failed to connect to websocket') ||
          fullMsg.includes('WebSocket closed without opened') ||
          fullMsg.includes('closed without opened') ||
          fullMsg.includes('[vite]') ||
          fullMsg.includes('Download the React DevTools')
        ) {
          return;
        }

        const errObj = args.find((a) => a instanceof Error);
        const stack = errObj?.stack;

        self.sendErrorLog('ERROR', 'BROWSER', `İstemci Konsol Hatası: ${fullMsg.substring(0, 300)}`, stack, {
          type: 'console_error'
        });
      } catch {
        // Safe failover
      }
    };

    console.warn = function (...args: any[]) {
      originalConsoleWarn.apply(console, args);

      try {
        const fullMsg = args
          .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');

        if (
          fullMsg.includes('failed to connect to websocket') ||
          fullMsg.includes('[vite]') ||
          fullMsg.includes('Download the React DevTools')
        ) {
          return;
        }

        // Only forward important warnings (like network / security / react lifecycle)
        if (fullMsg.toLowerCase().includes('failed') || fullMsg.toLowerCase().includes('deprecated') || fullMsg.toLowerCase().includes('warning:')) {
          self.sendErrorLog('WARN', 'BROWSER', `İstemci Uyarısı: ${fullMsg.substring(0, 300)}`, undefined, {
            type: 'console_warn'
          });
        }
      } catch {
        // Safe failover
      }
    };
  }

  private sendErrorLog(
    level: 'ERROR' | 'WARN' | 'FATAL',
    module: 'CLIENT_UI' | 'BROWSER',
    message: string,
    stackTrace?: string,
    context?: Record<string, any>
  ) {
    // Deduplicate identical errors within 5 seconds to prevent flood
    const dedupeKey = `${level}:${message.substring(0, 80)}`;
    if (this.recentErrors.has(dedupeKey)) return;
    this.recentErrors.add(dedupeKey);
    setTimeout(() => this.recentErrors.delete(dedupeKey), this.THROTTLE_WINDOW_MS);

    const payload = {
      level,
      module,
      message,
      stackTrace: stackTrace || null,
      contextData: {
        ...context,
        url: window.location.pathname + window.location.search,
        userAgent: navigator.userAgent.substring(0, 150)
      }
    };

    try {
      fetch('/api/logs/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {
        // Ignore network drops for logger itself
      });
    } catch {
      // Safe fail
    }
  }
}

export const clientErrorLogger = new ClientErrorLogger();
