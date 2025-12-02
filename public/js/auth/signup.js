// signup.js - Enhanced signup functionality with fixed password toggle

import {
  auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "../config/firebaseInit.js";
import { Student } from "../model/Student.js";
import { ITCFirebaseLogic } from "../fireabase/ITCFirebaseLogic.js";

const itc_firebase_logic = new ITCFirebaseLogic();

document.addEventListener("DOMContentLoaded", function () {
  
  const signupForm = document.getElementById("signup-form");
  const signupBtn = document.getElementById("signup-btn");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const passwordStrengthBar = document.getElementById("password-strength-bar");
  const passwordStrengthText = document.getElementById(
    "password-strength-text"
  );
  const googleLogin = document.getElementById("googlebtn");

  googleLogin.addEventListener("click", function (event) {
    handleGoogleLogin(event);
  });

  const passwordToggles = document.querySelectorAll(".password-toggle");

  passwordToggles.forEach((toggle) => {
    toggle.addEventListener("click", function () {

      const input = this.closest(".relative").querySelector(
        'input[type="password"], input[type="text"]'
      );
      

      if (input) {
        const type =
          input.getAttribute("type") === "password" ? "text" : "password";
        input.setAttribute("type", type);

      
        const icon = this.querySelector("svg");
        if (icon) {
          if (type === "text") {
      
            icon.innerHTML =
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />';
          } else {
      
            icon.innerHTML =
              '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />';
          }
        }
      }
    });
  });

  
  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      const password = this.value;
      const strength = calculatePasswordStrength(password);

  
      if (passwordStrengthBar) {
        passwordStrengthBar.style.width = `${strength.percentage}%`;
        passwordStrengthBar.className = `progress-bar rounded-full ${strength.color}`;
      }

      // Update strength text
      if (passwordStrengthText) {
        passwordStrengthText.textContent = strength.text;
        passwordStrengthText.className = `text-xs font-medium ${strength.textColor}`;
      }

      // Validate password match
      validatePasswordMatch();
    });
  }

  // Confirm password validation
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", validatePasswordMatch);
  }

  // Form submission
  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      // Show loading state
      setButtonState("loading");
      const formData = new FormData(signupForm);
      const school = formData.get("school") !== 'other' && formData.get("school")? formData.get("school"):formData.get("other-school"); 
      console.log("other-school "+school);
       
      const studentData = new Student({
        fullName: formData.get("full-name"),
        email: formData.get("email"),
        phoneNumber: formData.get("phone-number"),
        school: school,
        matricNumber: formData.get("matric-number"),
        level: formData.get("academic-level"),
        courseOfStudy: formData.get("course-of-study"),
        // Set default values for other required fields
        uid: "", // This will be set after Firebase auth
        bio: "",
        role: "student",
        imageUrl: "",
        skills: [],
        resumeUrl: "",
        certifications: [],
        portfolioDescription: "",
        pastInternships: [],
        dateOfBirth: "",
        department: "", // You might want to add this field to your form
        institution: school, // Using school as institution
        portfolio: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      let userCredential;
       console.log("email is "+formData.get("email")+" password "+formData.get("password"));
      try {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.get("email"),
          formData.get("password")
        );
      } catch (error) {
        let errorMessage = "An error occurred during signup.";

        if (error.code === "auth/email-already-in-use") {
          errorMessage =
            "This email is already in use. Please use a different email or try logging in.";
        }

        alert(errorMessage);
        // or use your notification system
        showNotification(errorMessage, "error");
      }

      if (userCredential == null) {
        setTimeout(() => {
          setButtonState("default");
        }, 3000);
        return;
      }
      try {
        await itc_firebase_logic.addStudent(studentData, userCredential.user);
        setButtonState("success");
        showNotification("Account created successfully!", "success");

        // Redirect after successful signup
        setTimeout(() => {
          window.location.href = "../auth/login.html";
        }, 2000);
      } catch (error) {
        setButtonState("error");
        showNotification(error.message, "error");
        console.error("Full error details:", error);
        console.error("Stack trace:", error.stack);

        setTimeout(() => {
          setButtonState("default");
        }, 3000);
      }
    });
  }

  // Helper functions
  function calculatePasswordStrength(password) {
    let strength = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) strength += 25;
    else feedback.push("at least 8 characters");

    // Lowercase check
    if (/[a-z]/.test(password)) strength += 25;
    else feedback.push("lowercase letters");

    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 25;
    else feedback.push("uppercase letters");

    // Number/Special character check
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25;
    else feedback.push("numbers or special characters");

    // Determine strength level
    let text, color, textColor;
    if (strength <= 25) {
      text = "Weak";
      color = "bg-error";
      textColor = "text-error";
    } else if (strength <= 50) {
      text = "Fair";
      color = "bg-yellow-500";
      textColor = "text-yellow-500";
    } else if (strength <= 75) {
      text = "Good";
      color = "bg-primary";
      textColor = "text-primary";
    } else {
      text = "Strong";
      color = "bg-success";
      textColor = "text-success";
    }

    return {
      percentage: strength,
      text: text,
      color: color,
      textColor: textColor,
      feedback: feedback,
    };
  }

  function validatePasswordMatch() {
    const password = passwordInput ? passwordInput.value : "";
    const confirmPassword = confirmPasswordInput
      ? confirmPasswordInput.value
      : "";

    if (
      confirmPasswordInput &&
      confirmPassword &&
      password !== confirmPassword
    ) {
      confirmPasswordInput.classList.add("border-error");
      confirmPasswordInput.classList.remove(
        "border-border-light",
        "dark:border-border-dark"
      );
      return false;
    } else if (confirmPasswordInput) {
      confirmPasswordInput.classList.remove("border-error");
      confirmPasswordInput.classList.add(
        "border-border-light",
        "dark:border-border-dark"
      );
      return true;
    }
    return true;
  }

  function validateForm() {
    // Check if passwords match
    if (!validatePasswordMatch()) {
      showNotification("Passwords do not match", "error");
      return false;
    }

    // Check if terms are accepted
    const termsCheckbox = document.getElementById("terms");
    if (termsCheckbox && !termsCheckbox.checked) {
      showNotification("Please accept the terms and conditions", "error");
      return false;
    }

    return true;
  }

  function setButtonState(state) {
    if (!signupBtn) return;

    const defaultText = "Create Account";
    const loadingText = "Creating Account...";
    const successText = "Account Created!";
    const errorText = "Error Creating Account";

    switch (state) {
      case "loading":
        signupBtn.disabled = true;
        signupBtn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${loadingText}
        `;
        signupBtn.classList.add("cursor-not-allowed", "opacity-75");
        break;

      case "success":
        signupBtn.disabled = true;
        signupBtn.innerHTML = `
          <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          ${successText}
        `;
        signupBtn.classList.remove("bg-primary", "hover:bg-primary-dark");
        signupBtn.classList.add("bg-success", "cursor-not-allowed");
        break;

      case "error":
        signupBtn.disabled = false;
        signupBtn.textContent = errorText;
        signupBtn.classList.remove("bg-primary", "hover:bg-primary-dark");
        signupBtn.classList.add("bg-error");
        break;

      default:
        signupBtn.disabled = false;
        signupBtn.innerHTML = `
          <span class="absolute left-0 inset-y-0 flex items-center pl-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white/70 group-hover:text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
          </span>
          ${defaultText}
        `;
        signupBtn.classList.remove(
          "bg-success",
          "bg-error",
          "cursor-not-allowed",
          "opacity-75"
        );
        signupBtn.classList.add("bg-primary", "hover:bg-primary-dark");
        break;
    }
  }

  function showNotification(message, type) {
    // Remove existing notifications
    const existingNotification = document.querySelector(".notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-transform duration-300 translate-x-full`;

    // Set notification content based on type
    let bgColor, icon;
    if (type === "success") {
      bgColor = "bg-success";
      icon = `
        <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      `;
    } else {
      bgColor = "bg-error";
      icon = `
        <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;
    }

    notification.innerHTML = `
      <div class="flex items-center text-white ${bgColor} p-3 rounded-lg">
        ${icon}
        <span>${message}</span>
      </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.remove("translate-x-full");
    }, 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.add("translate-x-full");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  async function handleGoogleLogin(event) {
    event.preventDefault();

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const student = {
        email: user.email,
        name: user.displayName,
        uid: user.uid,
      };

       const studentData = new Student({
        fullName: user.displayName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        school: "",
        matricNumber: "",
        level: "",
        courseOfStudy: "",
        // Set default values for other required fields
        uid: user.uid,
        bio: "",
        role: "student",
        imageUrl: user.photoURL,
        skills: [],
        resumeUrl: "",
        certifications: [],
        portfolioDescription: "",
        pastInternships: [],
        dateOfBirth: "",
        department: "", // You might want to add this field to your form
        institution: "", // Using school as institution
        portfolio: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
       await itc_firebase_logic.addStudent(studentData, user);
      localStorage.setItem("student", JSON.stringify(student));
      window.location.replace("../dashboard/itc_dashboard.html");
    } catch (error) {
      alert(error.message);
    }
  }



  });
