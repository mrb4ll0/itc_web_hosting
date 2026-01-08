// Import Firebase functions from your firebaseInit.js file
import { 
  db, 
  collection, 
  addDoc, 
  serverTimestamp 
} from "./config/firebaseInit.js";

// Waitlist Modal Functions
function showWaitlistModal() {
  document.getElementById('waitlist-modal')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeWaitlistModal() {
  document.getElementById('waitlist-modal')?.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

// Function to store data in Firebase
async function storeInFirebase(collectionName, data) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      timestamp: serverTimestamp()
    });
    console.log(`Document written to ${collectionName} with ID:`, docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`Error adding to ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
}

// Waitlist Form Submission with Firebase storage
document.getElementById('waitlist-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('waitlist-email').value;
  
  if (!email) {
    alert('Please enter your email address.');
    return;
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  try {
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Joining...
    `;
    submitBtn.disabled = true;

    // Store in Firebase
    const result = await storeInFirebase('waitlist', {
      email: email,
      platform: 'iOS',
      source: 'landing_page',
      status: 'pending'
    });

    if (result.success) {
      alert(`Thank you! You've been added to the iOS waitlist. We'll notify you at ${email} when the app launches.`);
      this.reset();
      closeWaitlistModal();
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}. Please try again.`);
  } finally {
    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = 'Join Waitlist';
      submitBtn.disabled = false;
    }
  }
});

// Feedback Form Submission with Firebase storage
document.getElementById('feedback-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;
  
  if (!email || !message) {
    alert('Please fill in both email and message fields.');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  if (message.trim().length < 10) {
    alert('Please provide more detailed feedback (minimum 10 characters).');
    return;
  }

  try {
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Submitting...
    `;
    submitBtn.disabled = true;

    const result = await storeInFirebase('reports', {
      email: email,
      message: message.trim(),
      type: 'feedback',
      status: 'new',
      source: 'landing_page'
    });

    if (result.success) {
      alert(`Thank you for your feedback! We've received your message and will respond to ${email} within 24-48 hours.`);
      this.reset();
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Error:', error);
    alert(`Error: ${error.message}. Please try again.`);
  } finally {
    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = 'Submit Feedback';
      submitBtn.disabled = false;
    }
  }
});

// File download function
function downloadFile(filename, title) {
  const button = event.target.closest("button");
  const originalText = button.innerHTML;
  button.innerHTML = `
    <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Downloading...
  `;
  button.disabled = true;

  setTimeout(() => {
    const link = document.createElement("a");
    link.href = `/files/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`${title} download started!`);

    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    }, 500);
  }, 1000);
}

// Slideshow functionality
function initSlideshow() {
  const img = document.getElementById("slideshow-image");
  if (img) {
    const images = [
      "images/its1.jpg",
      "images/its2.jpg",
      "images/its3.jpg",
      "images/its4.jpg",
      "images/its5.jpg",
      "images/its6.jpg",
      "images/its7.jpg",
      "images/its8.jpg",
      "images/its9.jpg",
      "images/its10.jpg",
    ];
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
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initSlideshow();
  
  // Close modal when clicking outside
  document.getElementById('waitlist-modal')?.addEventListener('click', function(e) {
    if (e.target === this) {
      closeWaitlistModal();
    }
  });

  // Make functions globally available
  window.showWaitlistModal = showWaitlistModal;
  window.closeWaitlistModal = closeWaitlistModal;
  window.downloadFile = downloadFile;
});