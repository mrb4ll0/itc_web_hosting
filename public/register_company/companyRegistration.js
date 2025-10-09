import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

class CompanyRegistration {
  constructor() {
    // Initialize Firebase
    const firebaseConfig = {
      apiKey: "AIzaSyBW2DIp-3tlsOZIHtBhKKdxDRtwI6zLvvo",
      authDomain: "it-connect-77048.firebaseapp.com",
      databaseURL: "https://it-connect-77048-default-rtdb.firebaseio.com",
      projectId: "it-connect-77048",
      storageBucket: "it-connect-77048.firebasestorage.app",
      messagingSenderId: "469455600641",
      appId: "1:469455600641:web:bcd8b67ebde5b475b79400",
      measurementId: "G-DK5EYRLFNS"
    };

    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    this.storage = getStorage(this.app);

    // Select elements
    this.form = document.getElementById("companyForm");
    this.logoInput = document.getElementById("companyLogo");
    this.logoPreview = document.getElementById("logoPreview");
    this.messageBox = document.getElementById("message");
    this.submitBtn = document.getElementById("submitBtn");

    // Bind events
    this.initEventListeners();
  }

  initEventListeners() {
    this.logoInput.addEventListener("change", () => this.previewLogo());
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
  }

  previewLogo() {
    const file = this.logoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.logoPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const industry = document.getElementById("industry").value.trim();
    const address = document.getElementById("address").value.trim();
    const localGovt = document.getElementById("localGovt").value.trim();
    const state = document.getElementById("state").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const logo = this.logoInput.files[0];

    if (!name || !industry || !address || !localGovt || !state || !email || !phone) {
      alert("⚠️ Please fill in all fields.");
      return;
    }

    if (!logo) {
      alert("⚠️ Please upload a company logo.");
      return;
    }

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "Registering...";

    // Simulate submission
    setTimeout(() => {
      const id = `${name.replace(/\s+/g, "")}_${phone}`;
      this.messageBox.textContent = `✅ Company "${name}" registered successfully! (ID: ${id})`;
      this.form.reset();
      this.logoPreview.src = "../images/camera-icon.jpg";
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = "Register Company";
    }, 1500);
  }
}

// Initialize the class when the page loads
window.addEventListener("DOMContentLoaded", () => new CompanyRegistration());
