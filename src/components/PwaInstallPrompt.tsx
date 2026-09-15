import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Bell, Check, Sparkles } from 'lucide-react';
import { requestNotificationPermission } from '@/lib/pwa';
import { useToast } from '@/components/Toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Check if running as installed standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // If already installed, don't show install prompt, but offer push notifications if not granted
    if (isStandaloneMode) {
      if (
        'Notification' in window &&
        Notification.permission === 'default' &&
        !sessionStorage.getItem('bussid_pwa_notif_dismissed')
      ) {
        const timer = setTimeout(() => setShowNotificationPrompt(true), 4000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Capture Chrome / Android PWA install event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Don't show if user dismissed in this session
      if (!sessionStorage.getItem('bussid_pwa_install_dismissed')) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App installed handler
    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      toast('success', 'BUSSID Ventures app installed successfully!');
    };

    const handleCustomTrigger = () => {
      setShowInstallBanner(true);
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else {
        toast('info', 'To install on Chrome: Tap the top menu (⋮) and select "Install app" or "Add to Home screen".');
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('trigger-pwa-install', handleCustomTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('trigger-pwa-install', handleCustomTrigger);
    };
  }, [toast, deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast('info', 'To install on Chrome: Tap the menu (⋮) and choose "Add to Home screen" or "Install App".');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowInstallBanner(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('bussid_pwa_install_dismissed', 'true');
  };

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setShowNotificationPrompt(false);
    if (res === 'granted') {
      toast('success', 'Push notifications enabled! You will get live convoy and livery updates.');
    } else {
      toast('info', 'Notifications were not enabled.');
    }
  };

  const handleDismissNotifications = () => {
    setShowNotificationPrompt(false);
    sessionStorage.setItem('bussid_pwa_notif_dismissed', 'true');
  };

  return (
    <>
      {/* 1. INSTALL APP BANNER */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40"
          >
            <div className="glass-strong border border-neon/40 p-4 rounded-2xl shadow-[0_0_30px_rgba(0,255,136,0.2)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-neon" />
                </div>
                <div>
                  <div className="font-display text-xs font-bold text-bone uppercase tracking-wider flex items-center gap-1.5">
                    Install BUSSID App
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neon/20 text-neon font-mono">
                      PWA
                    </span>
                  </div>
                  <p className="text-bone/60 text-[11px] font-body leading-tight mt-0.5">
                    Add to home screen for 1-tap launch and offline livery access.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleInstallClick}
                  className="btn-neon text-xs py-1.5 px-3 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Install
                </button>
                <button
                  onClick={handleDismissInstall}
                  className="p-1.5 text-bone/40 hover:text-bone rounded-lg transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. PUSH NOTIFICATION PROMPT */}
      <AnimatePresence>
        {showNotificationPrompt && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40"
          >
            <div className="glass-strong border border-amber-400/40 p-4 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.15)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
                </div>
                <div>
                  <div className="font-display text-xs font-bold text-bone uppercase tracking-wider">
                    Enable Convoy & Livery Alerts
                  </div>
                  <p className="text-bone/60 text-[11px] font-body leading-tight mt-0.5">
                    Never miss a multiplayer convoy room code or new livery drop!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleEnableNotifications}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-dark-bg font-mono font-bold text-xs hover:bg-amber-300 transition"
                >
                  Enable
                </button>
                <button
                  onClick={handleDismissNotifications}
                  className="p-1.5 text-bone/40 hover:text-bone rounded-lg transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
