import {
  auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "../../../js/config/firebaseInit.js";
import { CompanyCloud } from "../../../js/fireabase/CompanyCloud.js";
import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";
import { generateShareableUrl } from "../../../js/general/generalmethods.js";
import { Company } from "../../../js/model/Company.js";

class CompanyLogin {
  constructor() {
    this.companyCloud = new CompanyCloud();
    this.itc_firebaselogic = new ITCFirebaseLogic();
    this.init();
  }

  init() {
    ////console.log("CompanyLogin initialized");
    this.attachEventListeners();
    this.setupPasswordToggle();
  }

  attachEventListeners() {
    // Login form submission
    const loginButton = document.getElementById("company-login-button");
    if (loginButton) {
      loginButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Google login
    const googleButton = document.querySelector(
      'button:has(svg[viewbox="0 0 48 48"])'
    );
    if (googleButton) {
      googleButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleGoogleLogin();
      });
    }

    // Enter key support for form
    const emailInput = document.getElementById("company-email");
    const passwordInput = document.getElementById("company-password");

    if (emailInput && passwordInput) {
      [emailInput, passwordInput].forEach((input) => {
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            this.handleLogin();
          }
        });
      });
    }

    // Register link
    const registerLink = document.querySelector(
      'a[href="companyRegistration.html"]'
    );
    if (registerLink) {
      registerLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "companyRegistration.html";
      });
    }

    // Forgot password link
    const forgotPasswordLink = document.querySelector('a[href="#"]');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleForgotPassword();
      });
    }
  }

  setupPasswordToggle() {
    const passwordInput = document.getElementById("company-password");
    const toggleButton = document.querySelector(".material-symbols-outlined");

    if (passwordInput && toggleButton) {
      toggleButton.addEventListener("click", () => {
        this.togglePasswordVisibility(passwordInput, toggleButton);
      });
    }
  }

  togglePasswordVisibility(passwordInput, toggleButton) {
    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggleButton.textContent = "visibility_off";
      toggleButton.title = "Hide password";
    } else {
      passwordInput.type = "password";
      toggleButton.textContent = "visibility";
      toggleButton.title = "Show password";
    }
  }

  async handleLogin() {
    const email = document.getElementById("company-email").value.trim();
    const password = document.getElementById("company-password").value;
    const loginButton = document.getElementById("company-login-button");

    // Validate inputs
    if (!this.validateInputs(email, password)) {
      return;
    }

    // Show loading state
    this.setButtonState(loginButton, "loading", "Logging in...");

    try {
      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      ////console.log("User signed in:", user.uid);

      // Verify this is actually a company account
      const company = await this.itc_firebaselogic.getCompany(user.uid);

      if (!company) {
        throw new Error(
          "No company account found with this email. Please register as a company first."
        );
      }

      // Store company data in localStorage
      localStorage.setItem("currentCompany", JSON.stringify(company.toMap()));
      localStorage.setItem("userRole", "company");

      //localStorage.setItem("itId",this.itId);
      //localStorage.setItem("companyId", this.companyId);
      //localStorage.setItem("appId",this.applicationId);
      //localStorage.setItem("stprofile", true);

      if (localStorage.getItem("stprofile") && localStorage.getItem("stprofile") === 'true') {
        
        const itId = localStorage.getItem("itId");
        const appId = localStorage.getItem("appId");
        localStorage.setItem("stprofile", false);

        if (!itId || !appId) {
          ////console.log("itId and appId is not found");
        } else {
          window.location.href = generateShareableUrl(
            "/company/student_profile.html",
            itId,
            appId
          );
          return;
        }
      }

      // Show success message
      this.showNotification(
        "Login successful! Redirecting to dashboard...",
        "success"
      );

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "../company_dashboard.html";
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
      this.handleLoginError(error);
      this.setButtonState(loginButton, "error", "Login Failed");

      // Reset button after delay
      setTimeout(() => {
        this.setButtonState(loginButton, "default", "Login");
      }, 3000);
    }
  }

  async handleGoogleLogin() {
    const googleButton = document.querySelector(
      'button:has(svg[viewbox="0 0 48 48"])'
    );

    // Show loading state
    this.setButtonState(googleButton, "loading", "Connecting...");

    try {
      const provider = new GoogleAuthProvider();

      // Add scopes if needed
      provider.addScope("email");
      provider.addScope("profile");

      // Sign in with popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      ////console.log("Google sign-in successful:", user.uid);

      // Check if company exists, if not create one
      let company = await this.itc_firebaselogic.getCompany(user.uid);

      if (!company) {
        // Create a new company profile from Google data
        company = await this.createCompanyFromGoogle(user);
      }

      // Store company data
      localStorage.setItem("currentCompany", JSON.stringify(company.toMap()));
      localStorage.setItem("userRole", "company");

       if (localStorage.getItem("stprofile")) {
        const itId = localStorage.getItem("itId");
        const appId = localStorage.getItem("appId");
        localStorage.setItem("stprofile", false);

        if (!itId || !appId) {
          ////console.log("itId and appId is not found");
        } else {
          window.location.href = generateShareableUrl(
            "/company/student_profile.html",
            itId,
            appId
          );
          return;
        }
      }


      // Show success message
      this.showNotification(
        "Google login successful! Redirecting...",
        "success"
      );

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "../company_dashboard.html";
      }, 1500);
    } catch (error) {
      console.error("Google login error:", error);
      this.handleLoginError(error);
      this.setButtonState(googleButton, "error", "Google Login Failed");

      // Reset button after delay
      setTimeout(() => {
        this.setButtonState(googleButton, "default", "Continue with Google");
      }, 3000);
    }
  }

  async createCompanyFromGoogle(user) {
    const companyData = {
      id: user.uid,
      name: user.displayName || "Google Company",
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      address: "",
      state: "",
      localGovernment: "",
      industry: "Technology", // Default industry
      registrationNumber: `GOOGLE-${user.uid.slice(0, 8).toUpperCase()}`,
      logoURL: user.photoURL || "",
      description: "Company created via Google Sign-In",
      website: "",
      foundedYear: new Date().getFullYear(),
      employeesCount: 0,
      socialMedia: {},
      verified: true, // Google accounts are considered verified
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const company = new Company(companyData);

    await this.itc_firebaselogic.addCompany(company);
    return company;
  }

  validateInputs(email, password) {
    // Clear previous errors
    this.clearErrors();

    let isValid = true;

    // Email validation
    if (!email) {
      this.showFieldError("company-email", "Email is required");
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.showFieldError(
        "company-email",
        "Please enter a valid email address"
      );
      isValid = false;
    }

    // Password validation
    if (!password) {
      this.showFieldError("company-password", "Password is required");
      isValid = false;
    } else if (password.length < 6) {
      this.showFieldError(
        "company-password",
        "Password must be at least 6 characters"
      );
      isValid = false;
    }

    return isValid;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add("border-red-500", "focus:ring-red-500");
    field.classList.remove(
      "border-[#dbdde6]",
      "dark:border-gray-700",
      "focus:ring-primary/50"
    );

    // Create or update error message
    let errorElement = field.parentNode.querySelector(".field-error");
    if (!errorElement) {
      errorElement = document.createElement("p");
      errorElement.className = "field-error text-red-500 text-xs mt-1";
      field.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
  }

  clearErrors() {
    // Clear field errors
    const fields = document.querySelectorAll("input");
    fields.forEach((field) => {
      field.classList.remove("border-red-500", "focus:ring-red-500");
      field.classList.add(
        "border-[#dbdde6]",
        "dark:border-gray-700",
        "focus:ring-primary/50"
      );
    });

    // Remove error messages
    const errorElements = document.querySelectorAll(".field-error");
    errorElements.forEach((element) => element.remove());
  }

  handleLoginError(error) {
    let errorMessage = "Login failed. Please try again.";

    switch (error.code) {
      case "auth/invalid-email":
        errorMessage = "Invalid email address format.";
        break;
      case "auth/user-disabled":
        errorMessage = "This account has been disabled.";
        break;
      case "auth/user-not-found":
        errorMessage =
          "No account found with this email. Please register first.";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password. Please try again.";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      case "auth/network-request-failed":
        errorMessage = "Network error. Please check your connection.";
        break;
      case "auth/popup-closed-by-user":
        errorMessage = "Google sign-in was cancelled.";
        break;
      case "auth/popup-blocked":
        errorMessage = "Popup was blocked. Please allow popups for this site.";
        break;
      default:
        if (error.message.includes("company account")) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message || "Login failed. Please try again.";
        }
    }

    this.showNotification(errorMessage, "error");
  }

  async handleForgotPassword() {
    const email = document.getElementById("company-email").value.trim();

    if (!email) {
      this.showNotification(
        "Please enter your email address to reset password.",
        "warning"
      );
      document.getElementById("company-email").focus();
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showNotification("Please enter a valid email address.", "warning");
      return;
    }

    try {
      // You'll need to import sendPasswordResetEmail from Firebase Auth
      const { sendPasswordResetEmail } = await import(
        "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"
      );

      await sendPasswordResetEmail(auth, email);
      this.showNotification(
        "Password reset email sent! Check your inbox.",
        "success"
      );
    } catch (error) {
      console.error("Password reset error:", error);
      this.showNotification(
        "Failed to send reset email. Please try again.",
        "error"
      );
    }
  }

  setButtonState(button, state, text = "") {
    const originalHTML = button.innerHTML;

    switch (state) {
      case "loading":
        button.disabled = true;
        button.innerHTML = `
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>${text}</span>
        `;
        break;
      case "error":
        button.disabled = true;
        button.classList.add("bg-red-600", "hover:bg-red-700");
        button.classList.remove("bg-primary", "hover:bg-primary/90");
        if (text) button.querySelector("span").textContent = text;
        break;
      case "success":
        button.disabled = true;
        button.classList.add("bg-green-600", "hover:bg-green-700");
        button.classList.remove("bg-primary", "hover:bg-primary/90");
        if (text) button.querySelector("span").textContent = text;
        break;
      default:
        button.disabled = false;
        button.classList.remove(
          "bg-red-600",
          "hover:bg-red-700",
          "bg-green-600",
          "hover:bg-green-700"
        );
        button.classList.add("bg-primary", "hover:bg-primary/90");
        if (text) {
          button.innerHTML = `<span class="truncate">${text}</span>`;
        } else {
          button.innerHTML = originalHTML;
        }
    }
  }

  showNotification(message, type = "info")
   {
    // Remove existing notifications
    const existingNotification = document.querySelector(".login-notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `login-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
      type === "success"
        ? "bg-green-500 text-white"
        : type === "error"
        ? "bg-red-500 text-white"
        : type === "warning"
        ? "bg-yellow-500 text-white"
        : "bg-blue-500 text-white"
    }`;

    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-lg">
          ${
            type === "success"
              ? "check_circle"
              : type === "error"
              ? "error"
              : type === "warning"
              ? "warning"
              : "info"
          }
        </span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new CompanyLogin();
});
