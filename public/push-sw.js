// Custom push notification handler for the service worker

// Vibration patterns per notification type (ms: vibrate, pause, vibrate...)
const VIBRATION_PATTERNS = {
  new_lead:     [200, 100, 200, 100, 300],  // excited double-tap + long
  followup:     [300, 200, 300],              // steady double reminder
  status_change:[150, 80, 150],               // quick subtle tap
  sale:         [100, 50, 100, 50, 100, 50, 300], // celebration burst
  alert:        [400, 150, 400],              // urgent double
  system:       [100],                        // single gentle tap
  test:         [200, 100, 200],              // simple confirmation
  default:      [150, 75, 150],               // balanced default
};

// Tag prefix per type so different types stack independently
const TAG_PREFIX = {
  new_lead:     'qi-lead',
  followup:     'qi-followup',
  status_change:'qi-status',
  sale:         'qi-sale',
  alert:        'qi-alert',
  system:       'qi-system',
  test:         'qi-test',
  default:      'qi-notif',
};

self.addEventListener('push', (event) => {
  let data = { title: 'Quintal Ideal', body: 'Nova notificação', url: '/', type: 'default' };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    // If parsing fails, use defaults
  }

  const type = data.type || 'default';
  const vibrate = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.default;
  const tagBase = TAG_PREFIX[type] || TAG_PREFIX.default;

  const options = {
    body: data.body,
    icon: '/notification-icon.png',
    badge: '/favicon.png',
    tag: tagBase + '-' + Date.now(),
    renotify: true,
    vibrate,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ver agora' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
