import {
  db,
  auth,
  collection,
  addDoc,
  serverTimestamp,
  signInAnonymously,
  onAuthStateChanged,
} from "./config/firebaseInit.js";



let currentUser = null;

const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      
      currentUser = user;
      resolve(user);
    } else {
      
      try {
        const credential = await signInAnonymously(auth);
        currentUser = credential.user;
        resolve(credential.user);
      } catch (error) {
        
        console.error("Anonymous sign-in failed:", error);
        resolve(null);
      }
    }
  });
});



function getSessionId() {
  let id = sessionStorage.getItem("itc_session_id");
  if (!id) {
    id = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem("itc_session_id", id);
  }
  return id;
}


function getVisitorContext() {
  return {
    sessionId: getSessionId(),
    uid: currentUser?.uid || null,
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer || "direct",
    pageUrl: window.location.href,
    platform: /Android/i.test(navigator.userAgent)
      ? "Android"
      : /iPhone|iPad/i.test(navigator.userAgent)
      ? "iOS"
      : "Desktop"
  };
}



async function storeInFirebase(collectionName, data) {
  const user = await authReady;

  if (!user) {
    console.warn(`Skipping write to "${collectionName}" — user not authenticated.`);
    return { success: false, error: "not_authenticated" };
  }

  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      timestamp: serverTimestamp()
    });
    console.log(`Saved to "${collectionName}" — document ID: ${docRef.id}`);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`Failed to save to "${collectionName}":`, error);
    return { success: false, error: error.message };
  }
}



// records something the user did — button click, form submit, link tap, etc.
async function logActivity(action, details = {}) {
  return storeInFirebase("activity_logs", {
    action,
    ...details,
    ...getVisitorContext()
  });
}


async function logError(action, error, details = {}) {
  return storeInFirebase("error_logs", {
    action,
    errorMessage: error?.message || String(error),
    errorStack: error?.stack || null,
    ...details,
    ...getVisitorContext()
  });
}


async function logPageVisit() {
  return storeInFirebase("visitor_logs", {
    event: "page_visit",
    ...getVisitorContext()
  });
}



function setButtonLoading(btn, loadingLabel) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <svg style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite" fill="none" viewBox="0 0 24 24"></svg>
    ${loadingLabel}
  `;
  return () => {
    btn.innerHTML = original;
    btn.disabled = false;
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}



document.getElementById("waitlist-form")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("waitlist-email").value.trim();

  if (!email) {
    alert("Please enter your email address.");
    return;
  }

  if (!isValidEmail(email)) {
    await logActivity("waitlist_invalid_email", { email });
    alert("That doesn't look like a valid email address. Double-check and try again.");
    return;
  }

  const submitBtn = this.querySelector('button[type="submit"]');
  const restore = setButtonLoading(submitBtn, "Joining...");

  await logActivity("waitlist_submit_attempt", { email });

  try {
    const result = await storeInFirebase("waitlist", {
      email,
      platform: "iOS",
      source: "landing_page",
      status: "pending",
      sessionId: getSessionId()
    });

    if (result.success) {
      await logActivity("waitlist_joined", { email, docId: result.id });
      alert(`You're on the list! We'll notify you at ${email} when the iOS app is ready.`);
      this.reset();
      closeWaitlistModal();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    await logError("waitlist_submit", error, { email });
    console.error("Waitlist submission error:", error);
    alert("Something went wrong. Please try again in a moment.");
  } finally {
    restore();
  }
});


// ------------------------------------------------------------------
// Feedback form
// ------------------------------------------------------------------

document.getElementById("feedback-form")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!email || !message) {
    alert("Please fill in both fields before submitting.");
    return;
  }

  if (!isValidEmail(email)) {
    await logActivity("feedback_invalid_email", { email });
    alert("That doesn't look like a valid email address. Double-check and try again.");
    return;
  }

  if (message.length < 10) {
    await logActivity("feedback_message_too_short", { email, messageLength: message.length });
    alert("Your message is a bit short — please add a bit more detail.");
    return;
  }

  const submitBtn = this.querySelector('button[type="submit"]');
  const restore = setButtonLoading(submitBtn, "Sending...");

  await logActivity("feedback_submit_attempt", { email });

  try {
    const result = await storeInFirebase("reports", {
      email,
      message,
      type: "feedback",
      status: "new",
      source: "landing_page",
      sessionId: getSessionId()
    });

    if (result.success) {
      await logActivity("feedback_submitted", { email, docId: result.id });
      alert(`Got it, thanks! We'll get back to you at ${email} within 24-48 hours.`);
      this.reset();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    await logError("feedback_submit", error, { email });
    console.error("Feedback submission error:", error);
    alert("Something went wrong. Please try again in a moment.");
  } finally {
    restore();
  }
});




function trackPlayStoreClick(appName, appId) {
  logActivity("playstore_click", { appName, appId });
}

window.trackPlayStoreClick = trackPlayStoreClick;


function showWaitlistModal() {
  document.getElementById("waitlist-modal")?.classList.add("open");
  document.body.style.overflow = "hidden";
  logActivity("waitlist_modal_opened");
}

function closeWaitlistModal() {
  document.getElementById("waitlist-modal")?.classList.remove("open");
  document.body.style.overflow = "";
  logActivity("waitlist_modal_closed");
}

window.showWaitlistModal = showWaitlistModal;
window.closeWaitlistModal = closeWaitlistModal;



function initSlideshow() {
  const img = document.getElementById("slideshow-image");
  if (!img) return;

  const images = Array.from({ length: 10 }, (_, i) => `images/its${i + 1}.jpg`);
  let current = 0;

  setInterval(() => {
    current = (current + 1) % images.length;
    img.style.opacity = 0;
    setTimeout(() => {
      img.src = images[current];
      img.style.opacity = 1;
    }, 500);
  }, 4000);
}



window.addEventListener("error", (event) => {
  logError("unhandled_js_error", {
    message: event.message,
    stack: event.error?.stack || null
  }, {
    filename: event.filename,
    lineNumber: event.lineno,
    columnNumber: event.colno
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logError("unhandled_promise_rejection", {
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack || null
  });
});



document.addEventListener("DOMContentLoaded", async () => {

  await authReady;

  logPageVisit();
  initSlideshow();


  const arrivedAt = Date.now();
  window.addEventListener("beforeunload", () => {
    const secondsOnPage = Math.round((Date.now() - arrivedAt) / 1000);
    logActivity("page_exit", { secondsOnPage });
  });
});
