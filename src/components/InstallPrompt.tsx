import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, we can't detect beforeinstallprompt, so we show it after a delay
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
        >
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 shadow-xl shadow-slate-200">
              <Download className="h-10 w-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900">Install Sunshine</h2>
            <p className="mt-3 text-sm text-slate-500">
              Install our app for a faster, better experience and offline access to your stock data.
            </p>

            <div className="mt-8 w-full space-y-4">
              {isIOS ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">How to install on iOS:</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-4 text-[10px] text-slate-500">
                        <li>Tap the <span className="font-bold">Share</span> button in Safari</li>
                        <li>Scroll down and tap <span className="font-bold">Add to Home Screen</span></li>
                        <li>Tap <span className="font-bold">Add</span> in the top right</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleInstall}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg active:scale-95 transition-all"
                >
                  <Smartphone className="h-5 w-5" />
                  Install Now
                </button>
              )}
              
              <button
                onClick={() => setIsVisible(false)}
                className="w-full py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
