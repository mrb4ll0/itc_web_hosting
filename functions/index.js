const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("node:crypto");
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
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

const APPLICATION_FEE_NAIRA = 500;

exports.submitPaidApplication = onCall(async request => {
  const data = request.data || {}; const context = request;
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
    if (!Number.isInteger(balance) || balance < 1) throw new functions.https.HttpsError("failed-precondition", "You need at least one application slot before submitting.");
    const byKind = kind => documents.find(file => String(file.kind || "") === kind)?.url || "";
    transaction.create(reservationRef, { uid, companyId, internshipId, applicationId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.create(applicationRef, { id: uid, student: {...student.data(), uid, slotBalance: balance - 1}, internship: {...internship.data(), id: internshipId, company: { id: companyId, name: data.companyName || internship.data().companyName || "Company", logoURL: data.companyLogo || "" }}, applicationStatus: "pending", applicationDate: admin.firestore.FieldValue.serverTimestamp(), submittedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), durationDetails: { startDate: draft.startDate || null, endDate: draft.endDate || null, description: String(draft.description || "").trim(), selectedDuration: String(draft.selectedDuration || ""), durationInDays: Number(draft.durationInDays || 0) }, idCardUrl: byKind("idCard"), itLetterUrl: byKind("itLetter"), resumeURL: byKind("resume"), coverLetter: byKind("coverLetter"), attachedFormUrls: documents.filter(file => file.kind === "other").map(file => file.url), documents, notifyTrainee: true, source: "web", paymentStatus: "paid", applicationFee: APPLICATION_FEE_NAIRA, slotsUsed: 1, slotTransactionId: transactionRef.id });
    transaction.update(internshipRef, { applicationsCount: admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.update(studentRef, { slotBalance: balance - 1, [`applications.${companyId}`]: internshipId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    transaction.create(transactionRef, { id: transactionRef.id, userId: uid, studentId: uid, companyId, internshipId, applicationId, slotCount: -1, amountNaira: APPLICATION_FEE_NAIRA, type: "slot_usage", status: "completed", description: "Industrial training application slot", createdAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  return { applicationId, paymentStatus: "paid", amount: APPLICATION_FEE_NAIRA, slotsUsed: 1 };
});

const paystackSecretKey = defineSecret("PAYSTACK_SECRET_KEY");
const paystackSecret = () => paystackSecretKey.value();
const defaultPaymentConfig = {slotUnitAmountKobo: 50000, minimumSlotPurchase: 5, maximumSlotPurchase: 100, paymentsEnabled: true};
const readPaymentConfig = async () => {
  const snapshot = await admin.firestore().doc("platform_config/payments").get();
  const value = snapshot.exists ? snapshot.data() : {};
  return {slotUnitAmountKobo: Number(value.slotUnitAmountKobo || 50000), minimumSlotPurchase: Number(value.minimumSlotPurchase || 5), maximumSlotPurchase: Number(value.maximumSlotPurchase || 100), paymentsEnabled: value.paymentsEnabled !== false};
};
const paymentMatches = (payment, record) => String(payment.reference || "") === record.paystackReference && Number(payment.amount) === Number(record.amountKobo) && String(payment.currency || "").toUpperCase() === "NGN" && String(payment.metadata?.transactionId || "") === record.transactionId && String(payment.metadata?.studentId || "") === record.studentId && Number(payment.metadata?.slotCount) === Number(record.slotCount) && payment.metadata?.type === "slot_purchase";

async function completeSlotPurchase(transactionId, payment) {
  const db = admin.firestore(); const paymentRef = db.doc(`payment_transactions/${transactionId}`); let credited = false;
  await db.runTransaction(async transaction => {
    const paymentSnapshot = await transaction.get(paymentRef);
    if (!paymentSnapshot.exists) throw new functions.https.HttpsError("not-found", "Payment transaction not found.");
    const record = paymentSnapshot.data(); if (record.status === "success") return;
    if (!paymentMatches(payment, record)) throw new functions.https.HttpsError("failed-precondition", "Paystack payment details do not match this transaction.");
    const studentRef = db.doc(`users/students/students/${record.studentId}`); const student = await transaction.get(studentRef);
    if (!student.exists) throw new functions.https.HttpsError("not-found", "Student profile not found.");
    credited = true;
    transaction.update(studentRef, {slotBalance: admin.firestore.FieldValue.increment(record.slotCount), transactionIds: admin.firestore.FieldValue.arrayUnion(transactionId), updatedAt: admin.firestore.FieldValue.serverTimestamp()});
    transaction.update(paymentRef, {status: "success", paidAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), lastGatewayResponse: String(payment.gateway_response || "Successful"), paystackTransactionId: String(payment.id || "")});
  });
  return credited;
}

exports.initializeSlotPayment = onCall({secrets: [paystackSecretKey]}, async request => {
  const data = request.data || {}; const context = request;
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in before purchasing slots.");
  const slotCount = Number(data.slotCount); const config = await readPaymentConfig();
  if (!config.paymentsEnabled) throw new functions.https.HttpsError("failed-precondition", "Slot payments are temporarily unavailable.");
  if (!Number.isInteger(slotCount) || slotCount < config.minimumSlotPurchase || slotCount > config.maximumSlotPurchase) throw new functions.https.HttpsError("invalid-argument", `Choose between ${config.minimumSlotPurchase} and ${config.maximumSlotPurchase} slots.`);
  if (!Number.isSafeInteger(config.slotUnitAmountKobo) || config.slotUnitAmountKobo <= 0) throw new functions.https.HttpsError("failed-precondition", "Payment pricing is not configured correctly.");
  const db = admin.firestore(); const student = await db.doc(`users/students/students/${context.auth.uid}`).get();
  if (!student.exists) throw new functions.https.HttpsError("not-found", "Student profile not found.");
  const email = String(context.auth.token.email || student.data().email || "").trim(); const secret = paystackSecret();
  if (!email) throw new functions.https.HttpsError("failed-precondition", "Your student account needs an email address.");
  if (!secret) throw new functions.https.HttpsError("failed-precondition", "Paystack is not configured for this project.");
  const paymentRef = db.collection("payment_transactions").doc(); const transactionId = paymentRef.id; const reference = `ITC_SLOT_${transactionId}`; const amountKobo = slotCount * config.slotUnitAmountKobo;
  await paymentRef.create({transactionId, studentId: context.auth.uid, type: "slot_purchase", gateway: "paystack", currency: "NGN", slotCount, unitAmountKobo: config.slotUnitAmountKobo, amountKobo, amountNaira: amountKobo / 100, status: "initialized", paystackReference: reference, authorizationUrl: null, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), paidAt: null, purpose: "Student application slot recharge", metadata: {productName: `${slotCount} Application Slots`, source: "web"}, verificationAttempts: 0, lastGatewayResponse: null, failureReason: null});
  const response = await fetch("https://api.paystack.co/transaction/initialize", {method: "POST", headers: {Authorization: `Bearer ${secret}`, "Content-Type": "application/json"}, body: JSON.stringify({email, amount: amountKobo, reference, currency: "NGN", callback_url: String(data.callbackUrl || "https://itconnectweb-eea87.web.app/app/#wallet"), metadata: {transactionId, studentId: context.auth.uid, slotCount, type: "slot_purchase"}})}); const result = await response.json();
  if (!response.ok || result.status !== true) { await paymentRef.update({status: "failed", failureReason: String(result.message || "Initialization failed"), updatedAt: admin.firestore.FieldValue.serverTimestamp()}); throw new functions.https.HttpsError("internal", result.message || "Paystack could not initialize this payment."); }
  await paymentRef.update({status: "pending", authorizationUrl: result.data.authorization_url, updatedAt: admin.firestore.FieldValue.serverTimestamp()});
  return {transactionId, reference, authorizationUrl: result.data.authorization_url};
});

exports.verifySlotPayment = onCall({secrets: [paystackSecretKey]}, async request => {
  const data = request.data || {}; const context = request;
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in before verifying payment.");
  const transactionId = String(data.transactionId || "").trim(); const paymentRef = admin.firestore().doc(`payment_transactions/${transactionId}`); const snapshot = await paymentRef.get();
  if (!snapshot.exists || snapshot.data().studentId !== context.auth.uid) throw new functions.https.HttpsError("permission-denied", "This payment does not belong to your account.");
  if (snapshot.data().status === "success") return {transactionId, status: "success", credited: false};
  const secret = paystackSecret(); if (!secret) throw new functions.https.HttpsError("failed-precondition", "Paystack is not configured for this project.");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(snapshot.data().paystackReference)}`, {headers: {Authorization: `Bearer ${secret}`}}); const result = await response.json();
  await paymentRef.update({verificationAttempts: admin.firestore.FieldValue.increment(1), lastGatewayResponse: String(result.data?.gateway_response || result.message || ""), updatedAt: admin.firestore.FieldValue.serverTimestamp()});
  if (!response.ok || result.status !== true) throw new functions.https.HttpsError("unavailable", result.message || "Paystack verification is temporarily unavailable.");
  if (result.data?.status !== "success") { const status = ["failed", "abandoned"].includes(result.data?.status) ? result.data.status : "pending"; await paymentRef.update({status, failureReason: status === "pending" ? null : String(result.data?.gateway_response || status), updatedAt: admin.firestore.FieldValue.serverTimestamp()}); return {transactionId, status, credited: false}; }
  const credited = await completeSlotPurchase(transactionId, result.data); return {transactionId, status: "success", credited};
});

exports.paystackWebhook = onRequest({secrets: [paystackSecretKey]}, async (req, res) => {
  const secret = paystackSecret(); const signature = String(req.get("x-paystack-signature") || ""); const expected = secret ? crypto.createHmac("sha512", secret).update(req.rawBody).digest("hex") : "";
  if (!secret || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) { console.warn("Rejected Paystack webhook with invalid signature."); return res.status(401).send("Invalid signature"); }
  if (req.body?.event !== "charge.success") return res.status(200).send("Ignored");
  try { await completeSlotPurchase(String(req.body.data?.metadata?.transactionId || ""), req.body.data); return res.status(200).send("OK"); } catch (error) { console.error("Paystack webhook processing failed", error); return res.status(400).send("Transaction mismatch"); }
});

exports.getWalletSummary = onCall(async request => {
  const context = request;
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in to view your wallet.");
  const db = admin.firestore(); const student = await db.doc(`users/students/students/${context.auth.uid}`).get();
  if (!student.exists) throw new functions.https.HttpsError("not-found", "Student profile not found.");
  const config = await readPaymentConfig();
  const [funding, usage] = await Promise.all([db.collection("payment_transactions").where("studentId", "==", context.auth.uid).limit(50).get(), db.collection("slot_transactions").where("userId", "==", context.auth.uid).limit(50).get()]);
  const millis = value => value && typeof value.toMillis === "function" ? value.toMillis() : 0;
  const transactions = [...funding.docs.map(entry => ({id: entry.id, type: "funding", slotCount: Number(entry.data().slotCount || 0), amountNaira: Number(entry.data().amountNaira || 0), status: String(entry.data().status || "pending"), createdAt: millis(entry.data().createdAt), description: String(entry.data().metadata?.productName || "Application slots")})), ...usage.docs.map(entry => ({id: entry.id, type: "application", slotCount: -1, amountNaira: Number(entry.data().amountNaira || APPLICATION_FEE_NAIRA), status: String(entry.data().status || "completed"), createdAt: millis(entry.data().createdAt), description: String(entry.data().description || "Application slot used")}))].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  const balance = Number(student.data().slotBalance || 0);
  return {slotBalance: balance, slotUnitAmountKobo: config.slotUnitAmountKobo, minimumSlotPurchase: config.minimumSlotPurchase, maximumSlotPurchase: config.maximumSlotPurchase, paymentsEnabled: config.paymentsEnabled, transactions};
});

exports.reviewCompanyApplication = onCall(async request => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in before reviewing an application.");
  const companyId = request.auth.uid;
  const internshipId = String(request.data?.internshipId || "").trim();
  const applicationId = String(request.data?.applicationId || "").trim();
  const status = String(request.data?.status || "").trim().toLowerCase();
  const note = String(request.data?.note || "").trim().slice(0, 600);
  if (!internshipId || !applicationId || !["accepted", "rejected"].includes(status)) throw new functions.https.HttpsError("invalid-argument", "A valid application decision is required.");
  if (status === "rejected" && !note) throw new functions.https.HttpsError("invalid-argument", "Add a reason before declining the application.");

  const db = admin.firestore();
  const companyRef = db.doc(`users/companies/companies/${companyId}`);
  const internshipRef = companyRef.collection("IT").doc(internshipId);
  const applicationRef = internshipRef.collection("applications").doc(applicationId);
  const traineeId = `${companyId}_${internshipId}_${applicationId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 1400);
  const traineeRef = db.doc(`trainees/${traineeId}`);
  let resultStatus = status;

  await db.runTransaction(async transaction => {
    const [company, internship, application, trainee] = await Promise.all([transaction.get(companyRef), transaction.get(internshipRef), transaction.get(applicationRef), transaction.get(traineeRef)]);
    if (!company.exists || company.data().isActive === false || company.data().isBlocked === true) throw new functions.https.HttpsError("permission-denied", "This company account cannot review applications.");
    if (!internship.exists || !application.exists) throw new functions.https.HttpsError("not-found", "The application or opportunity no longer exists.");
    const companyData = company.data(); const authorityId = companyData.isUnderAuthority === true && companyData.authorityLinkStatus === "APPROVED" ? String(companyData.authorityId || "") : "";
    const control = authorityId ? await transaction.get(db.doc(`users/authorities/authorities/${authorityId}/company_controls/${companyId}`)) : null;
    const policy = control?.exists ? control.data() : {companyCanAccept: true, companyCanReject: true, authorityFinalApprovalRequired: Boolean(authorityId)};
    if (status === "accepted" && policy.companyCanAccept !== true) throw new functions.https.HttpsError("permission-denied", String(policy.reason || "Your linked authority requires this application to be reviewed by them."));
    if (status === "rejected" && policy.companyCanReject !== true) throw new functions.https.HttpsError("permission-denied", String(policy.reason || "Your linked authority has restricted company rejection decisions."));
    const applicationData = application.data();
    const currentStatus = String(applicationData.applicationStatus || "pending").toLowerCase();
    if (applicationData.isDeleted === true || currentStatus === "deleted") throw new functions.https.HttpsError("failed-precondition", "This application was removed and cannot be reviewed.");
    if (currentStatus !== "pending" && currentStatus !== status) throw new functions.https.HttpsError("already-exists", `This application has already been ${currentStatus}.`);
    if (currentStatus === status) return;

    const student = applicationData.student && typeof applicationData.student === "object" ? applicationData.student : {};
    const duration = applicationData.durationDetails && typeof applicationData.durationDetails === "object" ? applicationData.durationDetails : {};
    const studentId = String(student.uid || student.id || applicationData.studentId || applicationId.split("_")[0] || "");
    const studentName = String(student.fullName || student.name || "Student");
    const internshipTitle = String(internship.data().title || "Industrial training opportunity");
    const companyName = String(companyData.companyName || companyData.name || "Company");
    const now = admin.firestore.FieldValue.serverTimestamp();
    const awaitingAuthority = status === "accepted" && authorityId && policy.authorityFinalApprovalRequired !== false;
    resultStatus = awaitingAuthority ? "awaiting_authority" : status;
    transaction.update(applicationRef, {applicationStatus: resultStatus, companyStatus: status, companyReviewedAt: now, companyReviewedBy: companyId, companyReviewNote: note, ...(awaitingAuthority ? {authorityStatus: "pending", authorityApproved: false} : {}), ...(status === "rejected" ? {rejectionReason: note} : {}), statusHistory: admin.firestore.FieldValue.arrayUnion({status: resultStatus, note, timestamp: new Date().toISOString(), actor: "company"})});
    if (status === "accepted" && !awaitingAuthority && !trainee.exists) transaction.create(traineeRef, {studentId, studentName, companyId, companyName, applicationId, internshipId, status: "accepted", startDate: duration.startDate || null, endDate: duration.endDate || null, actualStartDate: null, actualEndDate: null, supervisorIds: [], department: String(student.courseOfStudy || student.course || ""), role: internshipTitle, description: String(duration.description || applicationData.description || ""), requirements: {selectedDuration: String(duration.selectedDuration || "")}, milestones: [], evaluations: [], studentLogbook: [], studentFeedback: [], completionReview: {}, progress: 0, metadata: {source: "it_connect", createdFromApplication: true}, createdAt: now, updatedAt: now});
    if (studentId) {
      const notificationRef = db.collection(`users/students/students/${studentId}/notifications`).doc();
      transaction.create(notificationRef, {targetStudentId: studentId, status: awaitingAuthority ? "Awaiting authority approval" : `Application ${status}`, message: awaitingAuthority ? `${internshipTitle}: the company accepted your application. It is awaiting authority approval.` : `${internshipTitle}: your application was ${status}.${note ? ` ${note}` : ""}`, actionId: "open_applications", applicationId, internshipId, companyId, timestamp: now, read: false});
    }
  });
  return {applicationId, internshipId, status: resultStatus};
});

exports.setCompanyApplicationPolicy = onCall(async request => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in as an authority.");
  const authorityId = request.auth.uid; const companyId = String(request.data?.companyId || "").trim();
  if (!companyId) throw new functions.https.HttpsError("invalid-argument", "Select a linked company.");
  const db = admin.firestore(); const authorityRef = db.doc(`users/authorities/authorities/${authorityId}`); const companyRef = db.doc(`users/companies/companies/${companyId}`); const controlRef = authorityRef.collection("company_controls").doc(companyId);
  await db.runTransaction(async transaction => { const [authority, company] = await Promise.all([transaction.get(authorityRef), transaction.get(companyRef)]); if (!authority.exists || authority.data().isApproved !== true) throw new functions.https.HttpsError("permission-denied", "This authority account cannot manage company policies."); if (!company.exists || company.data().authorityId !== authorityId || company.data().isUnderAuthority !== true || company.data().authorityLinkStatus !== "APPROVED") throw new functions.https.HttpsError("permission-denied", "This company is not linked to your authority."); transaction.set(controlRef, {authorityId, companyId, companyCanAccept: request.data?.companyCanAccept === true, companyCanReject: request.data?.companyCanReject !== false, authorityFinalApprovalRequired: request.data?.authorityFinalApprovalRequired !== false, reason: String(request.data?.reason || "").trim().slice(0, 300), updatedBy: authorityId, updatedAt: admin.firestore.FieldValue.serverTimestamp()}, {merge: true}); });
  return {companyId, updated: true};
});

exports.getAuthorityCompanyPolicies = onCall(async request => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in as an authority.");
  const authorityId = request.auth.uid; const db = admin.firestore(); const authority = await db.doc(`users/authorities/authorities/${authorityId}`).get();
  if (!authority.exists || authority.data().isApproved !== true) throw new functions.https.HttpsError("permission-denied", "This authority cannot view company policies.");
  const snapshot = await db.collection(`users/authorities/authorities/${authorityId}/company_controls`).get();
  return {policies: snapshot.docs.map(entry => ({companyId: entry.id, companyCanAccept: entry.data().companyCanAccept !== false, companyCanReject: entry.data().companyCanReject !== false, authorityFinalApprovalRequired: entry.data().authorityFinalApprovalRequired !== false, reason: String(entry.data().reason || "")}))};
});

exports.getCompanyApplicationPolicy = onCall(async request => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in as a company.");
  const companyId = request.auth.uid; const db = admin.firestore(); const company = await db.doc(`users/companies/companies/${companyId}`).get();
  if (!company.exists) throw new functions.https.HttpsError("not-found", "Company profile not found.");
  const data = company.data(); const authorityId = data.isUnderAuthority === true && data.authorityLinkStatus === "APPROVED" ? String(data.authorityId || "") : "";
  if (!authorityId) return {companyCanAccept: true, companyCanReject: true, authorityFinalApprovalRequired: false, reason: "", linkedAuthority: false};
  const control = await db.doc(`users/authorities/authorities/${authorityId}/company_controls/${companyId}`).get(); const policy = control.exists ? control.data() : {};
  return {companyCanAccept: policy.companyCanAccept !== false, companyCanReject: policy.companyCanReject !== false, authorityFinalApprovalRequired: policy.authorityFinalApprovalRequired !== false, reason: String(policy.reason || ""), linkedAuthority: true};
});

exports.reviewAuthorityApplication = onCall(async request => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in as an authority.");
  const authorityId = request.auth.uid; const companyId = String(request.data?.companyId || "").trim(); const internshipId = String(request.data?.internshipId || "").trim(); const applicationId = String(request.data?.applicationId || "").trim(); const status = String(request.data?.status || "").toLowerCase(); const note = String(request.data?.note || "").trim().slice(0, 600);
  if (!companyId || !internshipId || !applicationId || !["accepted", "rejected"].includes(status) || !note) throw new functions.https.HttpsError("invalid-argument", "Complete the authority decision and note.");
  const db = admin.firestore(); const authorityRef = db.doc(`users/authorities/authorities/${authorityId}`); const companyRef = db.doc(`users/companies/companies/${companyId}`); const internshipRef = companyRef.collection("IT").doc(internshipId); const applicationRef = internshipRef.collection("applications").doc(applicationId); const traineeId = `${companyId}_${internshipId}_${applicationId}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 1400); const traineeRef = db.doc(`trainees/${traineeId}`);
  await db.runTransaction(async transaction => { const [authority, company, internship, application, trainee] = await Promise.all([transaction.get(authorityRef), transaction.get(companyRef), transaction.get(internshipRef), transaction.get(applicationRef), transaction.get(traineeRef)]); if (!authority.exists || authority.data().isApproved !== true) throw new functions.https.HttpsError("permission-denied", "This authority cannot review applications."); if (!company.exists || company.data().authorityId !== authorityId || company.data().isUnderAuthority !== true || company.data().authorityLinkStatus !== "APPROVED") throw new functions.https.HttpsError("permission-denied", "This company is no longer linked to your authority."); if (!internship.exists || !application.exists) throw new functions.https.HttpsError("not-found", "The application no longer exists."); const app = application.data(); const current = String(app.applicationStatus || "pending").toLowerCase(); if (!["pending", "awaiting_authority"].includes(current)) throw new functions.https.HttpsError("already-exists", `This application has already been ${current}.`); const student = app.student && typeof app.student === "object" ? app.student : {}; const duration = app.durationDetails && typeof app.durationDetails === "object" ? app.durationDetails : {}; const studentId = String(student.uid || student.id || app.studentId || applicationId.split("_")[0] || ""); const studentName = String(student.fullName || student.name || "Student"); const title = String(internship.data().title || "Industrial training opportunity"); const companyName = String(company.data().companyName || company.data().name || "Company"); const now = admin.firestore.FieldValue.serverTimestamp(); transaction.update(applicationRef, {applicationStatus: status, authorityStatus: status, authorityApproved: status === "accepted", authorityReviewNote: note, authorityReviewedAt: now, authorityReviewedBy: authorityId, ...(status === "accepted" ? {approvedByAuthorityId: authorityId, approvedByAuthorityName: String(authority.data().name || authority.data().authorityName || "Authority"), authorityApprovedAt: now} : {rejectionReason: note}), statusHistory: admin.firestore.FieldValue.arrayUnion({status, note, timestamp: new Date().toISOString(), actor: "authority"})}); if (status === "accepted" && !trainee.exists) transaction.create(traineeRef, {studentId, studentName, companyId, companyName, applicationId, internshipId, status: "accepted", startDate: duration.startDate || null, endDate: duration.endDate || null, actualStartDate: null, actualEndDate: null, supervisorIds: [], department: String(student.courseOfStudy || student.course || ""), role: title, description: String(duration.description || app.description || ""), requirements: {selectedDuration: String(duration.selectedDuration || "")}, milestones: [], evaluations: [], studentLogbook: [], studentFeedback: [], completionReview: {}, progress: 0, metadata: {source: "it_connect", approvedByAuthorityId: authorityId}, createdAt: now, updatedAt: now}); const auditRef = authorityRef.collection("audit_logs").doc(); transaction.create(auditRef, {actorId: authorityId, type: "application_decision", applicationId, internshipId, companyId, studentId, outcome: status, note, createdAt: now}); if (studentId) { const notificationRef = db.collection(`users/students/students/${studentId}/notifications`).doc(); transaction.create(notificationRef, {targetStudentId: studentId, status: `Authority ${status}`, message: `${title}: your application was ${status} by the authority. ${note}`, actionId: "open_applications", applicationId, internshipId, companyId, timestamp: now, read: false}); } });
  return {companyId, internshipId, applicationId, status};
});

exports.setCompanyOpportunityStatus = onCall(async request => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in before updating an opportunity.");
  const companyId = request.auth.uid;
  const internshipId = String(request.data?.internshipId || "").trim();
  const status = String(request.data?.status || "").trim().toLowerCase();
  if (!internshipId || !["open", "closed"].includes(status)) throw new functions.https.HttpsError("invalid-argument", "Choose a valid opportunity status.");

  const db = admin.firestore();
  const companyRef = db.doc(`users/companies/companies/${companyId}`);
  const internshipRef = companyRef.collection("IT").doc(internshipId);
  await db.runTransaction(async transaction => {
    const [company, internship] = await Promise.all([transaction.get(companyRef), transaction.get(internshipRef)]);
    if (!company.exists || company.data().isActive === false || company.data().isBlocked === true || company.data().isSuspended === true) throw new functions.https.HttpsError("permission-denied", "This company account cannot manage opportunities.");
    if (!internship.exists || internship.data().isDeleted === true) throw new functions.https.HttpsError("not-found", "This opportunity no longer exists.");
    const current = String(internship.data().status || "open").toLowerCase();
    if (current === status) return;
    transaction.update(internshipRef, {status, acceptingApplications: status === "open", closedAt: status === "closed" ? admin.firestore.FieldValue.serverTimestamp() : null, reopenedAt: status === "open" ? admin.firestore.FieldValue.serverTimestamp() : null, updatedAt: admin.firestore.FieldValue.serverTimestamp(), statusUpdatedBy: companyId});
  });
  return {internshipId, status};
});

exports.listPublicCompanies = onCall(async request => {
  if (!request.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in to browse companies.");
  const db = admin.firestore(); const snapshot = await db.collection("users/companies/companies").get();
  const visible = snapshot.docs.filter(entry => { const data = entry.data(); return data.isActive !== false && data.isApproved !== false && data.allowed !== false && data.isBlocked !== true && data.isSuspended !== true && data.isArchived !== true; });
  const companies = await Promise.all(visible.map(async entry => { const data = entry.data(); let opportunityCount = 0; try { const opportunities = await entry.ref.collection("IT").get(); opportunityCount = opportunities.docs.filter(item => item.data().isDeleted !== true && String(item.data().status || "open").toLowerCase() === "open").length; } catch { /* Directory remains available without counts. */ } return {id: entry.id, name: String(data.companyName || data.name || "Company"), username: String(data.username || ""), logoUrl: String(data.logoURL || data.imageUrl || ""), industry: String(data.industry || ""), state: String(data.state || ""), address: String(data.address || ""), description: String(data.description || ""), website: String(data.website || ""), email: String(data.email || ""), phoneNumber: String(data.phoneNumber || ""), verified: data.isVerified === true, authorityName: String(data.authorityName || ""), opportunityCount}; }));
  companies.sort((a, b) => a.name.localeCompare(b.name)); return {companies};
});
