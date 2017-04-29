// [START initialize_firebase_in_sw]
// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.5.2/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
  'messagingSenderId': '1026367273727'
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();
// [END initialize_firebase_in_sw]

// If you would like to customize notifications that are received in the
// background (Web app is closed or not in browser focus) then you should
// implement this optional method.
// [START background_handler]
messaging.setBackgroundMessageHandler(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  if ( ! payload || ! payload.data ) {
    return;
  }

  let notificationTitle;
  let notificationOptions = {
      icon: '/app/assets/logo.png',
      click_action: 'https://killergame-42f36.firebaseapp.com/'
  };

  if (payload.data.new_target) {
    notificationTitle = 'Killing is done';
    notificationOptions = Object.assign({}, notificationOptions, {
      body: 'You have a new target'
    });
  }

  if (payload.data.winner) {
    notificationTitle = 'There is a winner!';
    notificationOptions = Object.assign({}, notificationOptions, {
      body: 'GZ to ' + payload.data.winner + '!!'
    });
  }

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      windowClient.postMessage(payload.data);
    }
  }).then(() => {
    if (payload.data.backgroundNotification && notificationTitle && notificationOptions.body) {
      return self.registration.showNotification(notificationTitle, notificationOptions);
    }
  });

  return promiseChain;


});


self.addEventListener('notificationclick', function(event) {
  let url = 'https://killergame-42f36.firebaseapp.com/';
  event.notification.close(); // Android needs explicit close.
  event.waitUntil(
    clients.matchAll({type: 'window'}).then( windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          // If so, just focus it.
          if (client.url === url && 'focus' in client) {
              return client.focus();
          }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
          return clients.openWindow(url);
      }
    })
  );
});