import {
  auth,
  db,
  addDoc,
  collection,
  serverTimestamp,
  signInAnonymously,
} from "./js/config/firebaseInit.js";

document.addEventListener("DOMContentLoaded", () => {
  const questionForm = document.getElementById('questionForm');
  const submitBtn = document.querySelector('#questionForm button[type="submit"]');
  const formStatus = document.getElementById("formStatus");
  
  questionForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const questionText = document.getElementById("question").value.trim();
    
    // Validation
    if(!email) {
      formStatus.textContent = "Enter the email address we should reply to.";
      document.getElementById("email").focus();
      return;
    }
    
    if(!questionText) {
      formStatus.textContent = "Describe how we can help.";
      document.getElementById("question").focus();
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      formStatus.textContent = "Enter a valid email address.";
      return;
    }
    
    // Create data object
    const questionData = {
      email: email,
      question: questionText,
      timestamp: new Date().toISOString(),
      status: "new",
      createdAt: serverTimestamp(),
      source: "public_help_center"
    };
    
    // Show loading state
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    // Optional: Add a loading spinner
    submitBtn.style.opacity = '0.7';
    submitBtn.style.cursor = 'not-allowed';
    formStatus.textContent = "Sending your request…";
    
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      // Submit to Firestore
      const docRef = await addDoc(collection(db, "helpcenter"), questionData);
      
      // Success
      formStatus.textContent = "Request received. Your reference is " + docRef.id + ".";
      
      // Clear form
      document.getElementById("email").value = '';
      document.getElementById("question").value = '';
      
    } catch (error) {
      // Error
      console.error("Error submitting question:", error);
      formStatus.textContent = "We couldn’t send your request. Please check your connection and try again.";
    } finally {
      // Reset button state (always runs, whether success or error)
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    }
  });
});
