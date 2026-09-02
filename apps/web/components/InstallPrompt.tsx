'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('opass-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    // Show again after 1 week if dismissed
    if (dismissedTime > oneWeekAgo) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect if app was installed
    const installedHandler = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setShowModal(false);
      localStorage.removeItem('opass-install-dismissed');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: show instructions modal
      setShowModal(true);
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setShowBanner(false);
    } else {
      localStorage.setItem('opass-install-dismissed', Date.now().toString());
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('opass-install-dismissed', Date.now().toString());
  };

  // Don't show anything if already installed
  if (isInstalled) return null;

  // ===== iOS instructions modal (iOS doesn't support beforeinstallprompt) =====
  if (showModal) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);

    return (
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)',
        }}
        onClick={() => setShowModal(false)}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--white, #fff)', borderRadius: 20, padding: 28,
            maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 32, height: 32 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: 'var(--black, #050505)' }}>
            Install OPASS CONNECT
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted, #6B7280)', margin: '0 0 20px', lineHeight: 1.5 }}>
            {isIOS ? (
              <>Tap the <strong>Share</strong> button in Safari, then select <strong>"Add to Home Screen"</strong> to install the app.</>
            ) : isAndroid ? (
              <>Tap the <strong>three-dot menu</strong> in your browser, then select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</>
            ) : (
              <>Click the <strong>install icon</strong> in your browser's address bar, or use your browser menu to install this app.</>
            )}
          </p>

          {isIOS && (
            <div style={{
              background: 'var(--bg, #F7F8FA)', borderRadius: 12, padding: 16, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            }}>
              <svg fill="none" stroke="var(--blue, #0B2D6B)" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 28, height: 28, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              <div style={{ fontSize: 13, color: 'var(--muted, #6B7280)' }}>
                Look for this <strong>Share</strong> icon at the bottom of Safari
              </div>
            </div>
          )}

          <button
            onClick={() => setShowModal(false)}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 999, border: 0,
              background: 'var(--blue-bright, #0051FF)', color: 'white',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', minHeight: 48,
            }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  // ===== Install banner =====
  if (showBanner) {
    return (
      <div
        style={{
          margin: '0 0 16px',
          background: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)',
          borderRadius: 16, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 4px 20px rgba(0,81,255,0.2)',
          animation: 'slide-in 0.3s ease-out',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, overflow: 'hidden',
          background: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="/opass-crest.jpeg" alt="OPASS" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>Install OPASS CONNECT</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>Add to your home screen for the full app experience</div>
        </div>
        <button
          onClick={handleInstall}
          style={{
            background: 'white', color: '#0051FF', border: 0, borderRadius: 999,
            padding: '8px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            flexShrink: 0, minHeight: 36, whiteSpace: 'nowrap',
          }}
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'rgba(255,255,255,0.15)', border: 0, borderRadius: '50%',
            width: 28, height: 28, color: 'white', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
        <style jsx>{`
          @keyframes slide-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ===== Manual install button (always available in menu) =====
  // This is rendered as a small button that can be placed in the menu page
  return null;
}

// Export a standalone button component for the menu page
export function InstallButton({ onTrigger }: { onTrigger?: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      onTrigger?.();
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', background: 'linear-gradient(135deg, #0B2D6B 0%, #0051FF 100%)',
        color: 'white', border: 0, borderRadius: 14, cursor: 'pointer',
        fontSize: 15, fontWeight: 700, textAlign: 'left',
        boxShadow: '0 4px 16px rgba(0,81,255,0.2)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width: 22, height: 22 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div>Install App</div>
        <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>Add to home screen for full experience</div>
      </div>
    </button>
  );
}
