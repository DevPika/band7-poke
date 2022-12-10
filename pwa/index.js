/* Push notification logic. */

const VAPID_PUBLIC_KEY = "INSERT_GENERATED_PUBLIC_KEY_HERE";
const SERVER_URL = "INSERT_SERVER_URL_HERE";

async function registerServiceWorker() {
  await navigator.serviceWorker.register('./sw.js');
  updateUI();
}

async function unregisterServiceWorker() {
  const registration = await navigator.serviceWorker.getRegistration();
  await registration.unregister();
  updateUI();
}

// Convert a base64 string to Uint8Array.
// Must do this so the server can understand the VAPID_PUBLIC_KEY.
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray; 
};

async function subscribeToPush() {
  // const registration = await navigator.serviceWorker.getRegistration();
  // console.log(registration);

  try {
    const status = await Notification.requestPermission();
    if (status === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  // console.log(subscription);
  // TODO userName can be used in the future
  // for now avoiding as those without web push api can also have usernames if they send it with notification each time
  postToServer('/add-subscription', {
    "subscription": subscription,
    "userName": ""
  });
  updateUI();
    }
  } catch (error) {
    console.log('Error enabling push notification', error);
  }  
}

async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  postToServer('/remove-subscription', { 
    endpoint: subscription.endpoint
  });
  await subscription.unsubscribe();
  updateUI();
}

async function notifyMe() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  const userNameEl = document.getElementById('userName');
  // console.log(userNameEl.value);
  const subjectEl = document.getElementById('notification-subject');
  const messageEl = document.getElementById('notification-message');
  const response = await postToServer('/notify-me', {
    endpoint: subscription.endpoint,
    userName: userNameEl.value,
    subject: subjectEl.value,
    message: messageEl.value
  });
  // postToServer('/notify-me', { endpoint: subscription.endpoint, userName: userName });
}

async function notifyAll() {
  const userNameEl = document.getElementById('userName');
  const subjectEl = document.getElementById('notification-subject');
  const messageEl = document.getElementById('notification-message');
  const response = await postToServer('/notify-all', { 
    userName: userNameEl.value,
    subject: subjectEl.value,
    message: messageEl.value
  });
  if (response.status === 409) {
    document.getElementById('notification-status-message').textContent =
        'There are no subscribed endpoints to send messages to, yet.';
  }
}

/* UI logic. */

async function updateUI() {
  const registrationButton = document.getElementById('register');
  const unregistrationButton = document.getElementById('unregister');
  const registrationStatus = document.getElementById('registration-status-message');
  const subscriptionButton = document.getElementById('subscribe');
  const unsubscriptionButton = document.getElementById('unsubscribe');
  const subscriptionStatus = document.getElementById('subscription-status-message');
  const notifyMeButton = document.getElementById('notify-me');
  const notificationStatus = document.getElementById('notification-status-message');
  // Disable all buttons by default.
  registrationButton.disabled = true;
  unregistrationButton.disabled = true;
  subscriptionButton.disabled = true;
  unsubscriptionButton.disabled = true;
  notifyMeButton.disabled = true;
  // Service worker is not supported so we can't go any further.
  if (!'serviceWorker' in navigator) {
    registrationStatus.textContent = "This browser doesn't support service workers.";
    subscriptionStatus.textContent = "Push subscription on this client isn't possible because of lack of service worker support.";
    notificationStatus.textContent = "Push notification to this client isn't possible because of lack of service worker support.";
    return;
  }  
  const registration = await navigator.serviceWorker.getRegistration();
  // Service worker is available and now we need to register one.
  if (!registration) {
    registrationButton.disabled = false;
    registrationStatus.textContent = 'No service worker has been registered yet.';
    subscriptionStatus.textContent = "Push subscription on this client isn't possible until a service worker is registered.";
    notificationStatus.textContent = "Push notification to this client isn't possible until a service worker is registered.";
    return;
  }
  registrationStatus.textContent =
      `Service worker registered. Scope: ${registration.scope}`;
  const subscription = await registration.pushManager.getSubscription();
  // Service worker is registered and now we need to subscribe for push
  // or unregister the existing service worker.
  if (!subscription) {
    unregistrationButton.disabled = false;
    subscriptionButton.disabled = false;
    subscriptionStatus.textContent = 'Ready to subscribe this client to push.';
    notificationStatus.textContent = 'Push notification to this client will be possible once subscribed.';
    return;
  }
  // Service worker is registered and subscribed for push and now we need
  // to unregister service worker, unsubscribe to push, or send notifications.
  subscriptionStatus.textContent =
      `Service worker subscribed to push. Endpoint: ${subscription.endpoint}`;
  notificationStatus.textContent = 'Ready to send a push notification to this client!';
  unregistrationButton.disabled = false;
  notifyMeButton.disabled = false;
  unsubscriptionButton.disabled = false;
}

/* Utility functions. */
// https://www.section.io/engineering-education/how-to-use-cors-in-nodejs-with-express/
async function postToServer(url, data) {
  let fullUrl = SERVER_URL+url;
  return response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    // mode: 'cors',
    body: JSON.stringify(data)
  });
}

window.onload = updateUI;



/* eslint-disable */
// https://gist.github.com/pedrouid/b4056fd1f754918ddae86b32cf7d803e
// https://web.dev/push-notifications-client-codelab/
// https://web.dev/push-notifications-server-codelab/
/*
async function generateVAPIDKeys() {
  try {
    const key = await window.crypto.subtle.generateKey(
      {
          name: "ECDH",
          namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
      },
      true, //whether the key is extractable (i.e. can be used in exportKey)
      ["deriveKey", "deriveBits"] //can be any combination of "deriveKey" and "deriveBits"
    )
    async function exportCryptoKey(key) {
      
      const exportedKeyBuffer = new Uint8Array(exported);
    
      const exportKeyOutput = document.querySelector(".exported-key");
      exportKeyOutput.textContent = `[${exportedKeyBuffer}]`;
    }

    async function getBase64Pair(key){
      //returns a keypair object
      // console.log(key);
      console.log(key.publicKey);
      console.log(key.privateKey);
      // const curve = crypto.createECDH('prime256v1');
      // curve.generateKeys();
      
      try {
        let publicKeyBuffer = await window.crypto.subtle.exportKey(
          "raw",
          key.publicKey
        );
      } catch (e) {
        console.log(e);
      }

      try {
        let privateKeyBuffer = await window.crypto.subtle.exportKey(
          "raw",
          key.privateKey
        );
      } catch (e) {
        console.log(e);
      }
      
  
      // Occassionally the keys will not be padded to the correct lengh resulting
      // in errors, hence this padding.
      // See https://github.com/web-push-libs/web-push/issues/295 for history.
      if (privateKeyBuffer.length < 32) {
        const padding = Buffer.alloc(32 - privateKeyBuffer.length);
        padding.fill(0);
        privateKeyBuffer = Buffer.concat([padding, privateKeyBuffer]);
      }
  
      if (publicKeyBuffer.length < 65) {
        const padding = Buffer.alloc(65 - publicKeyBuffer.length);
        padding.fill(0);
        publicKeyBuffer = Buffer.concat([padding, publicKeyBuffer]);
      }
  
      return {
        publicKey: await arraybuffer_to_base64(publicKeyBuffer),
        privateKey: await arraybuffer_to_base64(privateKeyBuffer)
      };
    }
    return getBase64Pair(key);
  }
  catch(err){
      console.error(err);
  };
}

const arraybuffer_to_base64 = async (data) => {
  // Use a FileReader to generate a base64 data URI
  const base64url = await new Promise((r) => {
      const reader = new FileReader()
      reader.onload = () => r(reader.result)
      reader.readAsDataURL(new Blob([data]))
  })


  // The result looks like "data:application/octet-stream;base64,<your base64 data>", 
  // so we split off the beginning:

  return base64url.split(",", 2)[1]
}
const newKeys = await generateVAPIDKeys();
console.log(JSON.stringify(newKeys));
*/
