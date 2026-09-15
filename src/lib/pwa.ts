/**
 * Progressive Web App (PWA) & Push Notification Manager
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available.');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker registration failed:', error);
      });
  });
}

/**
 * Request Push Notification permission from the user
 */
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showPwaNotification(
        'BUSSID Ventures Notifications Enabled! 🚌',
        'You will receive live departure alerts for convoys and trending livery updates.',
        '/convoys'
      );
    }
    return permission;
  } catch (err) {
    console.warn('[PWA] Notification request error:', err);
    return 'denied';
  }
}

/**
 * Trigger a local notification via the Service Worker
 */
export async function showPwaNotification(title: string, body: string, url: string = '/') {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [100, 50, 100],
          data: { url },
        } as NotificationOptions);
        return;
      }
    }

    // Fallback if Service Worker ready is not available
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
    });
  } catch (e) {
    console.warn('[PWA] showNotification error:', e);
  }
}
