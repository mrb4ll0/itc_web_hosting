import {
  auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
} from "../config/firebaseInit.js";
import { Student } from "../model/Student.js";

class Login {
  constructor() {
    this.auth = auth;
    this.provider = new GoogleAuthProvider();
    document.body.style.display = "none";

    this.checkAuthState();

    this.form = document.querySelector("form");
    this.emailInput = document.getElementById("email-address");
    this.passwordInput = document.getElementById("password");
    this.rememberMe = document.getElementById("remember-me");
    this.googleBtn = document.getElementById("googleSignInBtn");
    this.loginBtn = document.getElementById("loginBtn");
    this.forgetPasswordLink = document.getElementById("forget-password");

    this.initListeners();
    this.loadRememberedUser();
  }

  checkAuthState() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        //console.log("User already logged in:", user.email);
        localStorage.setItem(
          "student",
          JSON.stringify({
            email: user.email,
            name: user.displayName || "",
            uid: user.uid,
            image: user.photoURL || "",
          })
        );

        window.location.replace("../dashboard/itc_dashboard.html");
      } else {
        //console.log("No user session found — showing login form.");
        document.body.style.display = "block";
      }
    });
  }

  loadRememberedUser() {
    const savedEmail = localStorage.getItem("itc_email");
    if (savedEmail) {
      this.emailInput.value = savedEmail;
      this.rememberMe.checked = true;
    }
  }

  initListeners() {
    this.form.addEventListener("submit", (e) => this.handleEmailLogin(e));

    if (this.googleBtn) {
      this.googleBtn.addEventListener("click", (e) =>
        this.handleGoogleLogin(e)
      );
    }
    //console.log("Forget Password Link:", this.forgetPasswordLink);
    if (this.forgetPasswordLink) {
      this.forgetPasswordLink.addEventListener("click", (e) =>
        this.handleForgotPassword()
      );
    }
  }

  async handleForgotPassword() {
    const email = document.getElementById("email-address").value.trim();

    if (!email) {
      this.showNotification(
        "Please enter your email address to reset password.",
        "warning"
      );
      document.getElementById("email-address").focus();
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

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showNotification(message, type = "info") {
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

  async handleEmailLogin(event) {
    event.preventDefault();

    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value.trim();

    if (email === "" || password === "") {
      alert("Please fill in both fields.");
      return;
    }

    //console.log("about to login with credential");

    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      //console.log("email is "+email+" password is "+password);

      if (userCredential == null) {
        return;
      }
      var student = Student.fromUserCredential(userCredential);

      if (student == null) {
        alert("No User found ");
        return;
      }
      //alert(`Welcome ${email}!`);
      this.rememberUser(email);
      localStorage.setItem("student", JSON.stringify(student));

      window.location.href = "../dashboard/itc_dashboard.html";
    } catch (error) {
      console.error("Full login error object:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      let errorMessage = "Login failed. ";

      switch (error.code) {
        case "auth/network-request-failed":
          errorMessage +=
            "Network error. Please:\n• Check your internet connection\n• Disable VPN if using one\n• Try refreshing the page\n• Check if Firebase services are blocked by browser extensions";
          break;
        case "auth/invalid-email":
          errorMessage += "Invalid email address format.";
          break;
        case "auth/user-disabled":
          errorMessage += "This account has been disabled.";
          break;
        case "auth/user-not-found":
          errorMessage +=
            "No account found with this email. Please sign up first.";
          break;
        case "auth/wrong-password":
          errorMessage += "Incorrect password.";
          break;
        case "auth/too-many-requests":
          errorMessage += "Too many failed attempts. Please try again later.";
          break;
        default:
          errorMessage += `Error: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      // Reset button state
      this.loginBtn.disabled = false;
      this.loginBtn.textContent = "Sign in";
    }
  }

  rememberUser(email) {
    if (this.rememberMe.checked) {
      localStorage.setItem("itc_email", email);
    } else {
      localStorage.removeItem("itc_email");
    }
  }

  async handleGoogleLogin(event) {
    event.preventDefault();

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account", // 👈 Always show "Choose an account" popup
      });

      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      alert(`Signed in as ${user.displayName}`);

      const student = {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
      };
      localStorage.setItem("student", JSON.stringify(student));

      window.location.replace("../dashboard/itc_dashboard.html");
    } catch (error) {
      alert(error.message);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => new Login());
