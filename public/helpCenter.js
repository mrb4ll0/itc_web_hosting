import { db, auth, collection, addDoc } from "./js/config/firebaseInit.js";

document.addEventListener("DOMContentLoaded", () => {
  const questionForm = document.getElementById('questionForm');
  const submitBtn = document.querySelector('#questionForm button[type="submit"]');
  
  questionForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const questionText = document.getElementById("question").value.trim();
    
    // Validation
    if(!email) {
      alert("Kindly enter your email");
      return;
    }
    
    if(!questionText) {
      alert("Kindly enter your question");
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }
    
    // Create data object
    const questionData = {
      email: email,
      question: questionText,
      timestamp: new Date().toISOString(),
      status: "new",
      createdAt: new Date() // Firestore timestamp
    };
    
    // Show loading state
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    // Optional: Add a loading spinner
    submitBtn.style.opacity = '0.7';
    submitBtn.style.cursor = 'not-allowed';
    
    try {
      // Submit to Firestore
      const docRef = await addDoc(collection(db, "helpcenter"), questionData);
      
      // Success
      alert("Question submitted successfully! Reference ID: " + docRef.id);
      
      // Clear form
      document.getElementById("email").value = '';
      document.getElementById("question").value = '';
      
    } catch (error) {
      // Error
      console.error("Error submitting question:", error);
      alert("There was an error submitting your question. Please try again.");
    } finally {
      // Reset button state (always runs, whether success or error)
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    }
  });
});