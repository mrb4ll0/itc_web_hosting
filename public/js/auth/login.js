import {
  auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
} from "../config/firebaseInit.js";
import { StudentCloudDB } from "../fireabase/StudentCloud.js";
import { Student } from "../model/Student.js";
const studentCloudDB = new StudentCloudDB();

class Login {
  constructor() {
    this.auth = auth;
    this.provider = new GoogleAuthProvider();
    document.body.style.display = "none";

    // Initialize elements first
    this.initElements();

    // Then check auth state - THIS WAS THE MAIN ISSUE (commented out)
    this.checkAuthState();

    this.initListeners();
    this.loadRememberedUser();
  }

  initElements() {
    try {
      this.form = document.querySelector("form");
      this.emailInput = document.getElementById("email-address");
      this.passwordInput = document.getElementById("password");
      this.rememberMe = document.getElementById("remember-me");
      this.googleBtn = document.getElementById("googleSignInBtn");
      this.loginBtn = document.getElementById("loginBtn");
      this.forgetPasswordLink = document.getElementById("forget-password");

      if (!this.form) {
        console.error("Form element not found");
      }
    } catch (error) {
      console.error("Error initializing elements:", error);
      // Ensure form is visible even if element initialization fails
      document.body.style.display = "block";
    }
  }

  checkAuthState() {
    onAuthStateChanged(this.auth, async (user) => {
      console.log("Auth state changed, user:", user);

      if (user) {
        console.log("User already logged in:", user.email);

        try {
          // Check if student exists in database
          const student = await studentCloudDB.getStudentById(user.uid);

          if (!student) {
            console.error("Student not found in database for UID:", user.uid);
            this.showNotification(
              "Student account "+user.email +" not found. Please contact support.",
              "error"
            );
            document.body.style.display = "block";
            return;
          }

          // Store student data
          localStorage.setItem(
            "student",
            JSON.stringify({
              email: user.email,
              name: user.displayName || "",
              uid: user.uid,
              image: user.photoURL || "",
            })
          );

          // Redirect to dashboard
          console.log("Redirecting to dashboard...");
          window.location.replace("../dashboard/itc_dashboard.html");
        } catch (error) {
          console.error("Error checking student data:", error);
          this.showNotification(
            "Error verifying account. Please try logging in again.",
            "error"
          );
          document.body.style.display = "block";
        }
      } else {
        // No user logged in, show the login form
        console.log("No user logged in, showing login form");
        document.body.style.display = "block";
      }
    });

    // Fallback: if auth state check takes too long, show the form anyway
    setTimeout(() => {
      if (document.body.style.display === "none") {
        console.warn(
          "Auth state check taking too long, showing form as fallback"
        );
        document.body.style.display = "block";
      }
    }, 3000);
  }

  loadRememberedUser() {
    const savedEmail = localStorage.getItem("itc_email");
    if (savedEmail && this.emailInput) {
      this.emailInput.value = savedEmail;
      this.rememberMe.checked = true;
    }
  }

  initListeners() {
    if (this.form) {
      this.form.addEventListener("submit", (e) => this.handleEmailLogin(e));
    } else {
      console.error("Form not found for event listener");
    }

    if (this.googleBtn) {
      this.googleBtn.addEventListener("click", (e) =>
        this.handleGoogleLogin(e)
      );
    }

    if (this.forgetPasswordLink) {
      this.forgetPasswordLink.addEventListener("click", (e) =>
        this.handleForgotPassword()
      );
    }
  }

  async handleForgotPassword() {
    const email = this.emailInput ? this.emailInput.value.trim() : "";

    if (!email) {
      this.showNotification(
        "Please enter your email address to reset password.",
        "warning"
      );
      if (this.emailInput) this.emailInput.focus();
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
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  async handleEmailLogin(event) {
    event.preventDefault();

    if (!this.loginBtn) {
      console.error("Login button not found");
      return;
    }

    this.loginBtn.textContent = "Logging....";
    this.loginBtn.disabled = true;

    const email = this.emailInput ? this.emailInput.value.trim() : "";
    const password = this.passwordInput ? this.passwordInput.value.trim() : "";

    if (email === "" || password === "") {
      this.showNotification("Please fill in both fields.", "warning");
      this.resetLoginButton();
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      if (userCredential == null) {
        this.showNotification("Login failed. Please try again.", "error");
        this.resetLoginButton();
        return;
      }

      const student = Student.fromUserCredential(userCredential);
      const studentC = await studentCloudDB.getStudentById(student.uid);

      if (!studentC) {
        this.showNotification("Student account not found in system.", "error");
        this.resetLoginButton();
        return;
      }

      if (!student) {
        this.showNotification("No user found.", "error");
        this.resetLoginButton();
        return;
      }

      this.showNotification("Welcome " + email, "success");
      this.rememberUser(email);
      localStorage.setItem("student", JSON.stringify(student));

      // Use small delay to ensure notification is seen
      setTimeout(() => {
        window.location.href = "../dashboard/itc_dashboard.html";
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);

      let errorMessage = "Login failed. ";

      switch (error.code) {
        case "auth/network-request-failed":
          errorMessage +=
            "Network error. Please:\n• Check your internet connection\n• Disable VPN if using one\n• Try refreshing the page";
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

      this.showNotification(errorMessage, "error");
    } finally {
      this.resetLoginButton();
    }
  }

  resetLoginButton() {
    if (this.loginBtn) {
      this.loginBtn.disabled = false;
      this.loginBtn.textContent = "Log in";
    }
  }

  rememberUser(email) {
    if (this.rememberMe && this.rememberMe.checked) {
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
        prompt: "select_account",
      });

      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      this.showNotification(`Signed in as ${user.displayName}`, "success");

      const student = {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
      };
      localStorage.setItem("student", JSON.stringify(student));

      // Check if student exists in database
      const studentC = await studentCloudDB.getStudentById(user.uid);
      if (!studentC) {
        this.showNotification("Student account "+user.email+" not found in system.", "error");
        return;
      }

      setTimeout(() => {
        window.location.replace("../dashboard/itc_dashboard.html");
      }, 1000);
    } catch (error) {
      console.error("Google login error:", error);
      this.showNotification(`Google login failed: ${error.message}`, "error");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing Login...");
  try {
    new Login();
  } catch (error) {
    console.error("Failed to initialize Login:", error);
    // Ensure the form is visible even if initialization fails completely
    document.body.style.display = "block";
  }
});
