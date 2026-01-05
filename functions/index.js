const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });  // VERY IMPORTANT!

admin.initializeApp();

exports.sendNotification = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { token, title, body } = req.body;

      const message = {
        notification: { title, body },
        token: token,
          webpush: {
          notification: {
            title: title,
            body: body,
            vibrate: [200, 100, 200], // Vibrate → pause → vibrate
            icon: "/icons/icon-192.png",
            badge: "/icons/badge.png",
          },
        },
      };

      const response = await admin.messaging().send(message);
      return res.status(200).send({ success: true, response });
    } catch (error) {
      console.error(error);
      return res.status(500).send(error);
    }
  });
});
