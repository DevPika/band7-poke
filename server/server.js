const express = require('express');
const cors = require('cors');
const webpush = require('web-push');
const bodyparser = require('body-parser');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('.data/db.json');
const db = low(adapter);
const vapidDetails = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT
};

db.defaults({
  subscriptions: []
}).write();

function sendNotifications(subscriptions, subject, message, fromUser) {
  // Create the notification content.
  if (subject === undefined || subject === "") subject = "Be-beep";
  if (message === undefined || message === "") message = "Boop!";
  if (fromUser === undefined || fromUser === "") fromUser = "Mystery User"
  const notification = JSON.stringify({
    title: `${subject} from ${fromUser}`,
    options: {
      body: message
    }
  });
  // body: `ID: ${Math.floor(Math.random() * 100)}`
  // Customize how the push service should attempt to deliver the push message.
  // And provide authentication information.
  const options = {
    TTL: 10000,
    vapidDetails: vapidDetails
  };
  // Send a push message to each client specified in the subscriptions array.
  subscriptions.forEach(entry => {
    const endpoint = entry.subscription.endpoint;
    const id = endpoint.substr((endpoint.length - 8), endpoint.length);
    webpush.sendNotification(entry.subscription, notification, options)
      .then(result => {
        console.log(`Endpoint ID: ${id}`);
        console.log(`Result: ${result.statusCode}`);
      })
      .catch(error => {
        console.log(`Endpoint ID: ${id}`);
        console.log(`Error: ${JSON.stringify(error)} `);
      });
  });
}

const app = express();
app.use(bodyparser.json());
app.use(express.static('public'));
// app.use(cors({
//     origin: 'https://mature-just-headphones.glitch.me'
// }));
app.use(cors());

app.post('/add-subscription', (request, response) => {
  console.log(`Subscribing ${request.body.subscription.endpoint}`);
  db.get('subscriptions')
    .push(request.body)
    .write();
  response.sendStatus(200);
});

app.post('/remove-subscription', (request, response) => {
  console.log(`Unsubscribing ${request.body.endpoint}`);
  db.get('subscriptions')
    .remove({subscription: {endpoint: request.body.endpoint}})
    .write();
  response.sendStatus(200);
});

app.post('/notify-me', (request, response) => {
  console.log(`Notifying ${request.body.endpoint}`);
  const subject = request.body.subject;
  const message = request.body.message;
  const fromUser = request.body.userName;
  const subscription = 
      db.get('subscriptions').find({subscription: {endpoint: request.body.endpoint}}).value();
  // console.log(JSON.stringify(subscription));
  sendNotifications([subscription], subject, message, fromUser);
  response.sendStatus(200);
});

app.post('/notify-all', (request, response) => {
  console.log('Notifying all subscribers');
  const subject = request.body.subject;
  const message = request.body.message;
  const fromUser = request.body.userName;
  const subscriptions =
      db.get('subscriptions').cloneDeep().value();
  if (subscriptions.length > 0) {
    sendNotifications(subscriptions, subject, message, fromUser);
    response.sendStatus(200);
  } else {
    response.sendStatus(409);
  }
});

app.get('/', (request, response) => {
  response.sendFile(__dirname + '/views/index.html');
});

const listener = app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${listener.address().port}`);
});
