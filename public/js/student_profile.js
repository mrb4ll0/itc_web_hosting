import { CompanyCloud } from "../js/fireabase/CompanyCloud.js";
import { auth } from "../js/config/firebaseInit.js";
import { StudentCloudDB } from "./fireabase/StudentCloud.js";
import { CloudStorage } from "./fireabase/Cloud_Storage.js";

const companyCloud = new CompanyCloud();
const cloudStorage = new CloudStorage();

class StudentProfile {
  constructor() {
    this.currentStudent = null;
    this.currentTab = "personal-info"; // Default tab
    this.studentCloudDB = new StudentCloudDB();
    this.init();
  }

  async init() {
    try {
      this.showLoading();

      // Wait for authentication
      await auth.authStateReady();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        this.showError("Please log in to view your profile");
        return;
      }

      // Load student data
      await auth.authStateReady();
      this.currentStudent = await this.studentCloudDB.getStudentById(
        auth.currentUser.uid
      );
      ////console.log("currentstudent data " + JSON.stringify(this.currentStudent));

      if (!this.currentStudent) {
        this.showError("Student profile not found");
        return;
      }

      // Setup tab functionality
      this.setupTabs();

      // Populate the profile
      this.populateProfile();
    } catch (error) {
      console.error("Error loading student profile:", error);
      this.showError("Failed to load profile. Please try again.");
    }
  }

  setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");

    tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const tabName = button.getAttribute("data-tab");
        this.switchTab(tabName);
      });
    });

    // Set up document tab buttons
    this.setupDocumentButtons();
  }

  switchTab(tabName) {
    // Update active tab button
    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
      const isActive = button.getAttribute("data-tab") === tabName;
      button.classList.toggle("border-b-primary", isActive);
      button.classList.toggle("text-primary", isActive);
      button.classList.toggle("border-b-transparent", !isActive);
      button.classList.toggle("text-[#5f668c]", !isActive);
      button.classList.toggle("dark:text-gray-400", !isActive);
    });

    // Update active tab content
    const tabContents = document.querySelectorAll(".tab-content");
    tabContents.forEach((content) => {
      content.classList.toggle("active", content.id === `${tabName}-content`);
    });

    this.currentTab = tabName;

    // Load tab-specific data if needed
    if (tabName === "documents") {
      ////console.log("populated tab is document");
      this.populateDocumentsTab();
    }
  }

  setupDocumentButtons() {
    // studentID buttons
    const uploadStudentIDBtn = document.getElementById("upload-student-id-btn");
    const viewStudentIDBtn = document.getElementById("view-student-id-btn");
    const downloadStudentIDBtn = document.getElementById(
      "download-student-id-btn"
    );

    const uploadITLetterBtn = document.getElementById(
      "upload-student-it-letter-btn"
    );
    const viewITLetterBtn = document.getElementById(
      "view-student-it-letter-btn"
    );
    const downloadITLetterBtn = document.getElementById(
      "download-student-it-letter-btn"
    );

    if (uploadStudentIDBtn) {
      uploadStudentIDBtn.addEventListener("click", () =>
        this.uploadStudentID()
      );
    }

    if (viewStudentIDBtn) {
      viewStudentIDBtn.addEventListener("click", () => this.viewStudentID());
    }

    if (downloadStudentIDBtn) {
      downloadStudentIDBtn.addEventListener("click", () =>
        this.downloadStudentID()
      );
    }

    if (uploadITLetterBtn) {
      uploadITLetterBtn.addEventListener("click", () =>
        this.uploadStudentLetter()
      );
    }

    if (viewITLetterBtn) {
      viewITLetterBtn.addEventListener("click", () => this.viewStudentLetter());
    }

    if (downloadITLetterBtn) {
      downloadITLetterBtn.addEventListener("click", () =>
        this.downloadStudentLetter()
      );
    }

    // Portfolio button
    const editPortfolioBtn = document.getElementById("edit-portfolio-btn");
    if (editPortfolioBtn) {
      editPortfolioBtn.addEventListener("click", () => this.editPortfolio());
    }
  }

  populateProfile() {
    // Hide loading, show content
    this.hideLoading();
    this.showContent();

    ////console.log(this.currentStudent);

    // Populate header profile image
    this.setProfileImage("header-profile-image", this.currentStudent.imageUrl);

    // Populate main profile section
    this.setProfileImage("student-profile-image", this.currentStudent.imageUrl);
    this.setTextContent(
      "student-name",
      this.currentStudent.fullName || "Not Set"
    );
    this.setTextContent(
      "student-matric",
      this.currentStudent.matricNumber || "Not Set"
    );

    ////console.log("student profile "+JSON.stringify(this.currentStudent))
    // Populate personal information
    this.setTextContent(
      "personal-full-name",
      this.currentStudent.fullName || "Not Set"
    );
    this.setTextContent(
      "personal-email",
      this.currentStudent.email || "Not Set"
    );

    this.setTextContent("major", this.currentStudent.major || "Not Set");
    this.setTextContent(
      "personal-phone",
      this.currentStudent.phoneNumber || "Not Set"
    );

    // Populate academic information
    this.setTextContent(
      "academic-school",
      this.currentStudent.school || this.currentStudent.faculty || "Not Set"
    );
    ////console.log("insitituion "+this.currentStudent.institution+" faculty "+this.currentStudent.faculty);
    this.setTextContent(
      "institution",
      this.currentStudent.institution ||
        this.currentStudent.faculty ||
        "Not Set"
    );

    this.setTextContent(
      "academic-department",
      this.currentStudent.department || "Not Set"
    );
    this.setTextContent(
      "academic-course",
      this.currentStudent.courseOfStudy ||
        this.currentStudent.program ||
        "Not Set"
    );
    this.setTextContent(
      "academic-level",
      this.formatLevel(this.currentStudent.level) || "Not Set"
    );
    this.setTextContent(
      "academic-matric",
      this.currentStudent.matricNumber ||
        this.currentStudent.studentId ||
        "Not Set"
    );
  }

  populateDocumentsTab() {
    // Populate student-id section
    ////console.log("currentStudent id "+this.currentStudent.studentIDCard);
    if (this.currentStudent.studentIDCard) {
      this.setTextContent("student-id-file-name", "My studentID.pdf");
      this.setTextContent("student-id-file-size", "2.4 MB");
      document.getElementById("view-student-id-btn").classList.remove("hidden");
      document
        .getElementById("download-student-id-btn")
        .classList.remove("hidden");
    }

    if (this.currentStudent.studentITLetter) {
      this.setTextContent(
        "student-it-letter-file-name",
        "My studentITLetter.pdf"
      );
      this.setTextContent("student-it-letter-file-size", "2.4 MB");
      document
        .getElementById("view-student-it-letter-btn")
        .classList.remove("hidden");
      document
        .getElementById("download-student-it-letter-btn")
        .classList.remove("hidden");
    }

    // Populate portfolio
    if (this.currentStudent.portfolioDescription) {
      this.setTextContent(
        "portfolio-description",
        this.currentStudent.portfolioDescription
      );
    }
  }

  populateCertifications() {
    const certificationsList = document.getElementById("certifications-list");

    if (
      this.currentStudent.certifications &&
      this.currentStudent.certifications.length > 0
    ) {
      certificationsList.innerHTML = this.currentStudent.certifications
        .map(
          (cert) => `
                <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-green-500">verified</span>
                        <div>
                            <p class="font-medium text-gray-900 dark:text-white">${
                              cert.name || "Unnamed Certification"
                            }</p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">${
                              cert.issuer || "Unknown Issuer"
                            } • ${cert.date || "No date"}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 transition-colors text-xs">
                            View
                        </button>
                        <button class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-xs">
                            Remove
                        </button>
                    </div>
                </div>
            `
        )
        .join("");
    } else {
      certificationsList.innerHTML = `
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                    <span class="material-symbols-outlined text-4xl mb-2">workspace_premium</span>
                    <p>No certifications uploaded yet</p>
                </div>
            `;
    }
  }

  // Document management methods
  async uploadStudentID() {
    // Create a file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif";

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const uploadBtn = document.getElementById("upload-student-id-btn");
        const originalText = uploadBtn.innerHTML;
        try {
          // Change button state to loading
          this.setButtonLoadingState(uploadBtn, "Uploading...");
          const downloadUrl = await cloudStorage.uploadFile(
            file,
            this.currentStudent.uid,
            "studentIDCard"
          );

          // Update the current student object locally
          this.currentStudent = this.currentStudent.copyWith({
            studentIDCard: downloadUrl,
          });
          await companyCloud.updateStudentProfile(
            this.currentStudent.uid,
            this.currentStudent.toMap()
          );
          // Update UI
          this.setTextContent("student-id-file-name", file.name);
          this.setTextContent(
            "student-id-file-size",
            this.formatFileSize(file.size)
          );
          document
            .getElementById("view-student-id-btn")
            .classList.remove("hidden");
          document
            .getElementById("download-student-id-btn")
            .classList.remove("hidden");

          // Revert button to original state with success indication
          this.setButtonSuccessState(uploadBtn, "Upload Successful!");

          // After 2 seconds, revert to original state
          setTimeout(() => {
            this.setButtonNormalState(uploadBtn, originalText);
          }, 2000);
        } catch (error) {
          console.error("Error uploading studentID:", error);
          // Revert button to original state with error indication
          this.setButtonErrorState(uploadBtn, "Upload Failed");

          // After 2 seconds, revert to original state
          setTimeout(() => {
            this.setButtonNormalState(uploadBtn, originalText);
          }, 2000);

          alert("Failed to upload studentID. Please try again.");
        }
      }
    };

    fileInput.click();
  }

  viewStudentID() {
    if (this.currentStudent.studentIDCard) {
      window.open(this.currentStudent.studentIDCard, "_blank");
    } else {
      alert("No studentID available to view.");
    }
  }

  downloadStudentID() {
    if (this.currentStudent.studentIDCard) {
      const link = document.createElement("a");
      link.href = this.currentStudent.studentIDCard;
      link.download = "studentID.pdf";
      link.click();
    } else {
      alert("No studentID available to download.");
    }
  }

  // Document management methods
  async uploadStudentLetter() {
    // Create a file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif";

    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const uploadBtn = document.getElementById(
          "upload-student-it-letter-btn"
        );
        const originalText = uploadBtn.innerHTML;
        try {
          // Change button state to loading
          this.setButtonLoadingState(uploadBtn, "Uploading...");
          const downloadUrl = await cloudStorage.uploadFile(
            file,
            this.currentStudent.uid,
            "studentITLetter"
          );

          // Update the current student object locally
          this.currentStudent = this.currentStudent.copyWith({
            studentITLetter: downloadUrl,
          });

          await companyCloud.updateStudentProfile(
            this.currentStudent.uid,
            this.currentStudent.toMap()
          );

          // Update UI
          this.setTextContent("student-it-letter-file-name", file.name);
          this.setTextContent(
            "student-it-letter-file-size",
            this.formatFileSize(file.size)
          );
          document
            .getElementById("view-student-it-letter-btn")
            .classList.remove("hidden");
          document
            .getElementById("download-student-it-letter-btn")
            .classList.remove("hidden");

          // Revert button to original state with success indication
          this.setButtonSuccessState(uploadBtn, "Upload Successful!");

          // After 2 seconds, revert to original state
          setTimeout(() => {
            this.setButtonNormalState(uploadBtn, originalText);
          }, 2000);
        } catch (error) {
          console.error("Error uploading IT Letter:", error);
          // Revert button to original state with error indication
        this.setButtonErrorState(uploadBtn, "Upload Failed");
        
        // After 2 seconds, revert to original state
        setTimeout(() => {
          this.setButtonNormalState(uploadBtn, originalText);
        }, 2000);
        }
      }
    };

    fileInput.click();
  }

  viewStudentLetter() {
    ////console.log("student data " + JSON.stringify(this.currentStudent));
    if (this.currentStudent.studentITLetter) {
      var itLetterUrl =
        this.currentStudent.studentITLetter[
          this.currentStudent.studentITLetter.length - 1
        ];
      window.open(itLetterUrl, "_blank");
    } else {
      alert("No studentID available to view.");
    }
  }

  downloadStudentLetter() {
    if (this.currentStudent.studentITLetter) {
      const link = document.createElement("a");
      link.href = this.currentStudent.studentITLetter;
      link.download = "studentLetter.pdf";
      link.click();
    } else {
      alert("No studentID available to download.");
    }
  }

  addCertification() {
    const name = prompt("Enter certification name:");
    if (!name) return;

    const issuer = prompt("Enter issuer:");
    if (!issuer) return;

    const date = prompt("Enter date (YYYY-MM-DD):");
    if (!date) return;

    if (name && issuer && date) {
      const newCert = { name, issuer, date };

      // Add to student's certifications
      if (!this.currentStudent.certifications) {
        this.currentStudent.certifications = [];
      }
      this.currentStudent.certifications.push(newCert);

      // Update UI
      this.populateCertifications();

      // Here you would save to Firebase
      // await companyCloud.updateStudentProfile(this.currentStudent.uid, {
      //     certifications: this.currentStudent.certifications
      // });

      alert("Certification added successfully!");
    }
  }

  editPortfolio() {
    const currentDescription = this.currentStudent.portfolioDescription || "";
    const newDescription = prompt(
      "Edit your portfolio description:",
      currentDescription
    );

    if (newDescription !== null) {
      this.currentStudent.portfolioDescription = newDescription;
      this.setTextContent(
        "portfolio-description",
        newDescription || "No portfolio description added."
      );

      // Here you would save to Firebase
      // await companyCloud.updateStudentProfile(this.currentStudent.uid, {
      //     portfolioDescription: newDescription
      // });

      alert("Portfolio description updated!");
    }
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  setProfileImage(elementId, imageUrl) {
    const element = document.getElementById(elementId);
    if (element && imageUrl) {
      element.style.backgroundImage = `url('${imageUrl}')`;
      // Remove loading class if present
      element.classList.remove("loading-skeleton");

      // Add error handling for broken images
      this.preloadImage(imageUrl).then((success) => {
        if (!success) {
          console.warn(`Image failed to load for ${elementId}`);
          element.style.backgroundImage = `url('${this.generateDefaultAvatar()}')`;
        }
      });
    } else if (element) {
      // No image URL, use default avatar
      element.style.backgroundImage = `url('${this.generateDefaultAvatar()}')`;
      element.classList.remove("loading-skeleton");
    }
  }

  setTextContent(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
      ////console.log("if element is true "+elementId);
      element.textContent = content || "Not Set";
    }
  }

  formatDate(date) {
    if (!date) return null;

    if (date instanceof Date) {
      return date.toLocaleDateString();
    }

    if (typeof date === "string" || typeof date === "number") {
      return new Date(date).toLocaleDateString();
    }

    return null;
  }

  formatLevel(level) {
    if (!level) return null;

    const levelStr = level.toString().toLowerCase();
    if (levelStr.includes("100") || levelStr === "1") return "100 Level";
    if (levelStr.includes("200") || levelStr === "2") return "200 Level";
    if (levelStr.includes("300") || levelStr === "3") return "300 Level";
    if (levelStr.includes("400") || levelStr === "4") return "400 Level";
    if (levelStr.includes("500") || levelStr === "5") return "500 Level";

    return level;
  }

  generateDefaultAvatar() {
    const colors = ["607afb", "10b981", "f59e0b", "ef4444", "8b5cf6"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const name =
      this.currentStudent?.fullName || this.currentStudent?.name || "U";
    const initial = name.charAt(0).toUpperCase();

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      initial
    )}&background=${color}&color=fff&size=150&bold=true`;
  }

  async preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  showLoading() {
    document.getElementById("loading-state").classList.remove("hidden");
    document.getElementById("profile-content").classList.add("hidden");
    document.getElementById("error-state").classList.add("hidden");
  }

  hideLoading() {
    document.getElementById("loading-state").classList.add("hidden");
  }

  showContent() {
    document.getElementById("profile-content").classList.remove("hidden");
  }

  showError(message) {
    document.getElementById("loading-state").classList.add("hidden");
    document.getElementById("profile-content").classList.add("hidden");

    const errorState = document.getElementById("error-state");
    const errorMessage = document.getElementById("error-message");
    const retryBtn = document.getElementById("retry-btn");

    errorMessage.textContent = message;
    errorState.classList.remove("hidden");

    // Setup retry functionality
    retryBtn.onclick = () => {
      this.init();
    };
  }

  // Add method to handle profile updates if needed
  async updateProfile(updates) {
    try {
      if (!this.currentStudent) {
        throw new Error("No student data available");
      }

      await companyCloud.updateStudentProfile(this.currentStudent.uid, updates);

      // Reload student data
      this.currentStudent = await companyCloud.getCurrentStudent();
      // //console.log(
      //   "this.currentStudent is " + JSON.stringify(this.currentStudent)
      // );

      this.populateProfile();

      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      this.showError("Failed to update profile");
      return false;
    }
  }

  /**
   * Set button to loading state
   * @param {HTMLElement} button - The button element
   * @param {string} text - Loading text
   */
  setButtonLoadingState(button, text = "Loading...") {
    button.innerHTML = `
    <span class="flex items-center justify-center gap-2">
      <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${text}
    </span>
  `;
    button.disabled = true;
    button.classList.add("opacity-50", "cursor-not-allowed");
    button.classList.remove("hover:bg-primary/80");
  }

  /**
   * Set button to success state
   * @param {HTMLElement} button - The button element
   * @param {string} text - Success text
   */
  setButtonSuccessState(button, text = "Success!") {
    button.innerHTML = `
    <span class="flex items-center justify-center gap-2">
      <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      ${text}
    </span>
  `;
    button.disabled = true;
    button.classList.add("bg-green-500", "cursor-not-allowed");
    button.classList.remove("bg-primary", "hover:bg-primary/80", "opacity-50");
  }

  /**
   * Set button to error state
   * @param {HTMLElement} button - The button element
   * @param {string} text - Error text
   */
  setButtonErrorState(button, text = "Error!") {
    button.innerHTML = `
    <span class="flex items-center justify-center gap-2">
      <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      ${text}
    </span>
  `;
    button.disabled = true;
    button.classList.add("bg-red-500", "cursor-not-allowed");
    button.classList.remove("bg-primary", "hover:bg-primary/80", "opacity-50");
  }

  /**
   * Reset button to normal state
   * @param {HTMLElement} button - The button element
   * @param {string} text - Original button text
   */
  setButtonNormalState(button, text) {
    button.innerHTML = text;
    button.disabled = false;
    button.classList.remove(
      "opacity-50",
      "cursor-not-allowed",
      "bg-green-500",
      "bg-red-500"
    );
    button.classList.add("bg-primary", "hover:bg-primary/80");
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new StudentProfile();
});

// Make it available globally for debugging
window.StudentProfile = StudentProfile;
