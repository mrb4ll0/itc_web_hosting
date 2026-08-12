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

exports.claimOrganisationAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in before claiming an account.");
  }
  if (context.auth.token.email_verified !== true) {
    throw new functions.https.HttpsError("failed-precondition", "Verify your email before completing the claim.");
  }

  const platformRegistrationId = String(data.platformRegistrationId || "").trim().toUpperCase();
  const role = platformRegistrationId.startsWith("AUTH-") ? "authority" : platformRegistrationId.startsWith("COMP-") ? "company" : "";
  if (!role || !/^(?:AUTH|COMP)-[A-Z0-9]{4}-[A-Z0-9]{4}(?:-[A-Z0-9]{4})?$/.test(platformRegistrationId)) {
    throw new functions.https.HttpsError("invalid-argument", "Enter a valid IT Connect registration ID.");
  }

  const db = admin.firestore();
  const collectionPath = role === "company" ? "users/companies/companies" : "users/authorities/authorities";
  const matches = await db.collection(collectionPath).where("platformRegistrationId", "==", platformRegistrationId).limit(2).get();
  if (matches.empty) throw new functions.https.HttpsError("not-found", "No claimable account matches that registration ID.");
  if (matches.size !== 1) throw new functions.https.HttpsError("failed-precondition", "This registration ID needs administrator review.");

  const sourceRef = matches.docs[0].ref;
  const destinationRef = db.doc(`${collectionPath}/${context.auth.uid}`);
  const reservationRef = db.doc(`platform_registration_ids/${platformRegistrationId}`);
  const verifiedEmail = String(context.auth.token.email || "").trim().toLowerCase();

  await db.runTransaction(async (transaction) => {
    const [source, destination, reservation] = await Promise.all([
      transaction.get(sourceRef), transaction.get(destinationRef), transaction.get(reservationRef),
    ]);
    if (!source.exists) throw new functions.https.HttpsError("not-found", "The claimable profile no longer exists.");
    const profile = source.data();
    if (String(profile.email || "").trim().toLowerCase() !== verifiedEmail) {
      throw new functions.https.HttpsError("permission-denied", "The verified email does not match this organisation account.");
    }
    if (profile.claimedByUid && profile.claimedByUid !== context.auth.uid) {
      throw new functions.https.HttpsError("already-exists", "This organisation account has already been claimed.");
    }
    if (destination.exists && destinationRef.path !== sourceRef.path) {
      throw new functions.https.HttpsError("already-exists", "Your login is already linked to another organisation profile.");
    }
    if (reservation.exists && reservation.data().uid && reservation.data().uid !== sourceRef.id && reservation.data().uid !== context.auth.uid) {
      throw new functions.https.HttpsError("failed-precondition", "The registration ID reservation needs administrator review.");
    }

    transaction.set(destinationRef, {
      ...profile,
      uid: context.auth.uid,
      ...(role === "authority" ? {id: context.auth.uid} : {}),
      platformRegistrationId,
      claimedByUid: context.auth.uid,
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.set(reservationRef, {
      uid: context.auth.uid,
      role,
      createdAt: reservation.exists && reservation.data().createdAt ? reservation.data().createdAt : admin.firestore.FieldValue.serverTimestamp(),
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    if (destinationRef.path !== sourceRef.path) transaction.delete(sourceRef);
  });

  return {role, platformRegistrationId};
});

const APPLICATION_FEE = 500;

exports.submitPaidApplication = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in before submitting an application.");
  const uid = context.auth.uid;
  const companyId = String(data.companyId || "").trim();
  const internshipId = String(data.internshipId || "").trim();
  const draft = data.draft && typeof data.draft === "object" ? data.draft : {};
  const documents = Array.isArray(data.documents) ? data.documents.slice(0, 20) : [];
  if (!companyId || !internshipId) throw new functions.https.HttpsError("invalid-argument", "The company and internship are required.");
  if (String(draft.description || "").trim().length < 40) throw new functions.https.HttpsError("invalid-argument", "The training statement must contain at least 40 characters.");
  for (const file of documents) {
    const storagePath = String(file.storagePath || "");
    if (!storagePath.startsWith(`uploads/${uid}/it_applications/${internshipId}/`)) throw new functions.https.HttpsError("permission-denied", "An uploaded document does not belong to this application.");
  }

  const db = admin.firestore();
  const studentRef = db.doc(`users/students/students/${uid}`);
  const internshipRef = db.doc(`users/companies/companies/${companyId}/IT/${internshipId}`);
  const reservationId = `${uid}_${companyId}_${internshipId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const reservationRef = db.doc(`application_submission_reservations/${reservationId}`);
  const transactionRef = db.collection("slot_transactions").doc();
  const now = new Date(); const part = value => String(value).padStart(2, "0");
  const applicationId = `${uid}_${now.getUTCFullYear()}${part(now.getUTCMonth() + 1)}${part(now.getUTCDate())}_${part(now.getUTCHours())}${part(now.getUTCMinutes())}${part(now.getUTCSeconds())}`;
  const applicationRef = internshipRef.collection("applications").doc(applicationId);

  await db.runTransaction(async transaction => {
    const [student, internship, reservation] = await Promise.all([transaction.get(studentRef), transaction.get(internshipRef), transaction.get(reservationRef)]);
    if (!student.exists) throw new functions.https.HttpsError("not-found", "Your student profile could not be found.");
    if (!internship.exists || internship.data().isDeleted === true) throw new functions.https.HttpsError("not-found", "This opportunity is no longer available.");
    if (reservation.exists) throw new functions.https.HttpsError("already-exists", "You have already applied for this opportunity.");
    const balance = Number(student.data().slotBalance || 0);
    if (!Number.isFinite(balance) || balance < APPLICATION_FEE) throw new functions.https.HttpsError("failed-precondition", `You need a ₦${APPLICATION_FEE} application slot before submitting. Your current balance is ₦${Math.max(0, balance).toLocaleString()}.`);
    const byKind = kind => documents.find(file => String(file.kind || "") === kind)?.url || "";
    transaction.create(reservationRef, { uid, companyId, internshipId, applicationId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.create(applicationRef, { id: uid, student: {...student.data(), uid, slotBalance: balance - APPLICATION_FEE}, internship: {...internship.data(), id: internshipId, company: { id: companyId, name: data.companyName || internship.data().companyName || "Company", logoURL: data.companyLogo || "" }}, applicationStatus: "pending", applicationDate: admin.firestore.FieldValue.serverTimestamp(), submittedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), durationDetails: { startDate: draft.startDate || null, endDate: draft.endDate || null, description: String(draft.description || "").trim(), selectedDuration: String(draft.selectedDuration || ""), durationInDays: Number(draft.durationInDays || 0) }, idCardUrl: byKind("idCard"), itLetterUrl: byKind("itLetter"), resumeURL: byKind("resume"), coverLetter: byKind("coverLetter"), attachedFormUrls: documents.filter(file => file.kind === "other").map(file => file.url), documents, notifyTrainee: true, source: "web", paymentStatus: "paid", applicationFee: APPLICATION_FEE, slotTransactionId: transactionRef.id });
    transaction.update(internshipRef, { applicationsCount: admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.update(studentRef, { slotBalance: balance - APPLICATION_FEE, [`applications.${companyId}`]: internshipId, transactionIds: admin.firestore.FieldValue.arrayUnion(transactionRef.id), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.create(transactionRef, { id: transactionRef.id, userId: uid, studentId: uid, companyId, internshipId, applicationId, amount: APPLICATION_FEE, type: "slot_usage", status: "completed", description: "Industrial training application fee", createdAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  return { applicationId, paymentStatus: "paid", amount: APPLICATION_FEE };
});
