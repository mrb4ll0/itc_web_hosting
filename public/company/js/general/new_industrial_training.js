import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
import {
  auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getStorage, ref, getDownloadURL

} from "../../../js/config/firebaseInit.js";
import { IndustrialTraining } from "../../../js/model/internship_model.js";
import { Company } from "../../../js/model/Company.js";
import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";
import {CloudStorage } from "../../../js/fireabase/Cloud_Storage.js";
const itc_firebaselogic = new ITCFirebaseLogic();
const cloudStorage = new CloudStorage();
class NewIndustrialTraining {
  constructor() {
    this.companyCloud = new ITBaseCompanyCloud();
    this.currentCompany = null;

    this.init();
  }

  async checkIfCompanyIndustryIsSet() {
    await auth.authStateReady();
    const company = await itc_firebaselogic.getCompany(auth.currentUser.uid);

    if (
      company == null ||
      company.industry == null ||
      company.industry.trim() === ""
    ) {
      return false;
    }
    return true;
  }

  async showSetCompanyIndustryDialog() {
    // Create modal wrapper
    const dialog = document.createElement("div");
    dialog.id = "industryDialog";
    dialog.className =
      "fixed inset-0 flex items-center justify-center bg-black/50 z-50";

    // Modal content
    dialog.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-[90%] max-w-md p-6">
      <h2 class="text-xl font-bold mb-4 text-center">Set Company Industry</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
        Please enter your company's industry below.
      </p>
      <input
        id="industryInput"
        type="text"
        placeholder="e.g., Technology, Manufacturing, Banking..."
        class="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
      />
      <div class="mt-6 flex justify-end gap-3">
        <button id="submitIndustryBtn"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
          Submit
        </button>
      </div>
    </div>
  `;

    await auth.authStateReady();
    // Append modal to body
    document.body.appendChild(dialog);
    // Submit button → get value & handle it
    document
      .getElementById("submitIndustryBtn")
      .addEventListener("click", () => {
        const industry = document.getElementById("industryInput").value.trim();

        if (!industry) {
          alert("Please enter your industry.");
          return;
        }

        ////console.log("industry after dialog is"+industry);
        this.companyCloud.updateCompanyIndustry(auth.currentUser.uid, industry);

        // Close dialog
        dialog.remove();

        // Optional: Show confirmation message
        alert(`Industry "${industry}" has been set successfully.`);
      });
  }

  setupUniversalFormToggle() {
  const universalRadio = document.getElementById('use-as-universal');
  const singleRadio = document.getElementById('use-for-single');
  const radioSection = document.getElementById('radiosection');
   radioSection.style.display='none';
     
}


  async init() {
    ////console.log("NewIndustrialTraining initialized");
    var isCompanyIndustrySet = await this.checkIfCompanyIndustryIsSet();
    if (!isCompanyIndustrySet) {
      this.showSetCompanyIndustryDialog();
    }

    const companyLogo = document.getElementById("company-logo");
     await auth.authStateReady();
      const company = await itc_firebaselogic.getCompany(auth.currentUser.uid);
       ////console.log("url "+company.logoURL);
      companyLogo.style.backgroundImage = `url('${company.logoURL}')`;

     this.fileUploadArea = document.getElementById("file-upload-area");
    this.fileInput = document.getElementById("file-input");
     this.filePreviewContainer = document.getElementById(
      "file-preview-container"
    );
    this.form = document.getElementById("training-form");
    this.maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
    this.allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    this.uploadedFiles = [];

    this.checkAuthState();
    this.attachEventListeners();
    this.setupFormValidation();
    this.fileUpload();
    this.setupUniversalFormToggle();
  }

  async checkAuthState() {
    try {
      await auth.authStateReady();
      const user = auth.currentUser;

      if (!user) {
        ////console.log("No user logged in, redirecting to login");
        window.location.href = "company_login.html";
        return;
      }

      ////console.log("User authenticated:", user.uid);
      await this.loadCompanyData(user.uid);
    } catch (error) {
      console.error("Auth state check error:", error);
      window.location.href = "company_login.html";
    }
  }

  async loadCompanyData(userId) {
    try {
      this.currentCompany = await this.companyCloud.getCompany(userId);

      if (!this.currentCompany) {
        throw new Error("Company profile not found");
      }

      ////console.log("Company loaded:", this.currentCompany.name);
    } catch (error) {
      console.error("Error loading company data:", error);
      this.showNotification(
        "Error loading company profile. Please complete your company profile first.",
        "error"
      );

      setTimeout(() => {
        window.location.href = "company_profile.html";
      }, 3000);
    }
  }

  attachEventListeners() {
    // Department selection handler

    const otherDepartmentContainer = document.getElementById(
      "other-department-container"
    );

    // Form submission handler
    const submitButton = document.getElementById("submit");
    if (submitButton) {
      submitButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleFormSubmission();
      });
    }

    // Form input validation
    this.setupInputValidation();
  }

  setSubmitButtonLoading(loading) {
    const submitButton = document.getElementById("submit");
    if (!submitButton) return;

    if (loading) {
      // Save original content for later restoration
      submitButton.setAttribute(
        "data-original-content",
        submitButton.innerHTML
      );

      submitButton.innerHTML = `
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Posting...</span>
        `;
      submitButton.disabled = true;
      submitButton.classList.add("opacity-75", "cursor-not-allowed");
    } else {
      // Restore original content
      const originalContent = submitButton.getAttribute(
        "data-original-content"
      );
      if (originalContent) {
        submitButton.innerHTML = originalContent;
      } else {
        // Fallback content
        submitButton.innerHTML = `
                <span>Submit</span>
                <span class="material-symbols-outlined">send</span>
            `;
      }
      submitButton.disabled = false;
      submitButton.classList.remove("opacity-75", "cursor-not-allowed");
    }
  }

  setupFormValidation() {
    const formInputs = document.querySelectorAll("input, textarea, select");

    formInputs.forEach((input) => {
      // Add real-time validation
      input.addEventListener("blur", () => {
        this.validateField(input);
      });

      // Clear validation on input
      input.addEventListener("input", () => {
        this.clearFieldError(input);
      });
    });
  }

  setupInputValidation() {
    // Number input validation for intake field
    const intakeInput = document.querySelector('input[type="number"]');
    if (intakeInput) {
      intakeInput.addEventListener("input", (e) => {
        if (e.target.value < 1) {
          e.target.value = 1;
        }
      });
    }

    // Description character counter
    const descriptionTextarea = document.querySelector("textarea");
    if (descriptionTextarea) {
      descriptionTextarea.addEventListener("input", (e) => {
        const length = e.target.value.length;
        if (length > 1000) {
          this.showFieldError(
            e.target,
            "Description should be less than 1000 characters"
          );
        }
      });
    }
  }

  validateField(field) {
    const value = field.value.trim();

    if (field.hasAttribute("required") && !value) {
      this.showFieldError(field, "This field is required");
      return false;
    }

    // Specific field validations
    switch (field.type) {
      case "email":
        if (value && !this.isValidEmail(value)) {
          this.showFieldError(field, "Please enter a valid email address");
          return false;
        }
        break;
      case "number":
        if (value && parseInt(value) < 1) {
          this.showFieldError(field, "Please enter a positive number");
          return false;
        }
        break;
    }

    this.clearFieldError(field);
    return true;
  }

  showFieldError(field, message) {
    this.clearFieldError(field);

    field.classList.add("border-red-500", "focus:ring-red-500");

    const errorDiv = document.createElement("div");
    errorDiv.className = "text-red-500 text-sm mt-1";
    errorDiv.textContent = message;

    field.parentNode.appendChild(errorDiv);
  }

  clearFieldError(field) {
    field.classList.remove("border-red-500", "focus:ring-red-500");

    const existingError = field.parentNode.querySelector(".text-red-500");
    if (existingError) {
      existingError.remove();
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async handleFormSubmission() {
    if (!this.currentCompany) {
      this.showNotification(
        "Company profile not loaded. Please try again.",
        "error"
      );
      return;
    }

    this.setSubmitButtonLoading(true);
    // Validate all fields
    const isValid = this.validateForm();
    if (!isValid) {
      this.showNotification(
        "Please fix the errors in the form before submitting.",
        "error"
      );
      this.setSubmitButtonLoading(false);
      return;
    }

    try {
      // Show loading state
      this.setSubmitButtonLoading(true);

      // Collect form data
      const formData = await this.collectFormData();

      // Create IndustrialTraining object
      const industrialTraining = this.createIndustrialTrainingObject(formData);
      ////console.log("formData :" + industrialTraining.toMap());

      // Submit to Firebase
      const itId = await this.companyCloud.postIndustrialTraining(
        industrialTraining
      );

      this.showNotification(
        "Industrial Training opportunity posted successfully!",
        "success"
      );

      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.href = "company_dashboard.html";
      }, 2000);
    } catch (error) {
      console.error("Error posting industrial training:", error);
      this.showNotification(
        "Failed to post industrial training. Please try again.",
        "error"
      );
      this.setSubmitButtonLoading(false);
    }
  }

  validateForm() {
    const requiredFields = document.querySelectorAll("[required]");
    ////console.log("requiredFields " + requiredFields.length);
    let isValid = true;

    requiredFields.forEach((field) => {
      if (!this.validateField(field)) {
        isValid = false;
      }

      const departmentValid = this.validateDepartmentFields();
      if (!departmentValid) {
        isValid = false;
      }
      ////console.log("isValid is " + isValid);
    });

    return isValid;
  }

  validateForm() {
    const requiredFields = document.querySelectorAll("[required]");
    ////console.log("requiredFields " + requiredFields.length);
    let isValid = true;

    // First, validate all regular required fields
    requiredFields.forEach((field) => {
      // Skip department select for now - we'll handle it separately
      if (field.id !== "department-select" && !this.validateField(field)) {
        isValid = false;
      }
    });

    // Now handle the conditional department validation separately
    const departmentValid = this.validateDepartmentFields();
    if (!departmentValid) {
      isValid = false;
    }

    ////console.log("isValid is " + isValid);
    return isValid;
  }

  validateDepartmentFields() {
    //const departmentSelect = document.getElementById("department-select");
    const otherDepartmentInput = document.getElementById("department-input");

    if (otherDepartmentInput) {
      this.clearFieldError(otherDepartmentInput);
    }

    return true;
  }

 async collectFormData() {
    const otherDepartmentInput = document.querySelector(
      "#other-department-container input"
    );

     await auth.authStateReady();
    let department = otherDepartmentInput;
    let uploadResults  = await cloudStorage.uploadMultipleFiles(this.uploadedFiles,auth.currentUser.uid,"applications-form");

    let formUrls = uploadResults
  .map(result => result.url)  // Get only the URL from each result
  .filter(url => url !== null); // Remove any failed uploads

      ////console.log("Extracted URLs only:", formUrls);
      if(document.getElementById("use-as-universal"))
      {
         ////console.log("is universal form and form is "+JSON.stringify(formUrls));
        await auth.authStateReady();
        await this.companyCloud.updateCompanyProfile(auth.currentUser.uid,{'form':formUrls});
        ////console.log("is universal form added ");
      }
    return {
      title: document.getElementById("title").value.trim(),
      department: department.value.trim(),
      location: document.getElementById("location").value.trim(),
      description: document.getElementById("detail-description").value.trim(),
      requirements: document.getElementById("requiredskillls").value.trim(),
      aptitudeTest: document.getElementById("aptitude-test").value,
      intake: parseInt(document.getElementById("intake").value) || 1,
      stipend: document.getElementById("Stipend").value.trim(),
      status: document.getElementById("status").value,
      contactPerson: document.getElementById("contactperson").value.trim(),
      form: formUrls
    };
  }

  createIndustrialTrainingObject(formData) {
    return new IndustrialTraining({
      title: formData.title,
      department: formData.department,
      address: formData.location,
      description: formData.description,
      eligibilityCriteria: formData.requirements,
      aptitudeTestRequired: formData.aptitudeTest === "No",
      intakeCapacity: formData.intake,
      stipend: formData.stipend,
      status: formData.status,
      contactPerson: formData.contactPerson,
      company: this.currentCompany,
      postedAt: new Date(),
      applications: [],
      files: formData.form
    });
  }

  setSubmitButtonLoading(loading) {
    const submitButton = document.getElementById('submit');
    if (!submitButton) return;

    if (loading) {
      submitButton.innerHTML = `
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Posting...</span>
            `;
      submitButton.disabled = true;
    } else {
      submitButton.innerHTML = `
                <span>Submit</span>
                <span class="material-symbols-outlined">send</span>
            `;
      submitButton.disabled = false;
    }
  }

  fileUpload() {
    
    // // Click on upload area to trigger file input
    // this.fileUploadArea.addEventListener("click",  ()=>{
    //  this.fileInput.click();
    // });

    // Handle file selection
    this.fileInput.addEventListener("change", (e)=>{
      this.handleFiles(e.target.files);

    });

    // Drag and drop functionality
    this.fileUploadArea.addEventListener("dragover",  (e)=> {
      e.preventDefault();
      this.fileUploadArea.classList.add("dragover");
    });

    this.fileUploadArea.addEventListener("dragleave", ()=> {
      this.fileUploadArea.classList.remove("dragover");
    });

    this.fileUploadArea.addEventListener("drop", (e) =>{
      e.preventDefault();
      this.fileUploadArea.classList.remove("dragover");
      this.handleFiles(e.dataTransfer.files);
    });
  }

  // Handle file validation and preview
  handleFiles(files) {
      ////console.log("files length is "+files.length);
        if(files.length >0)
        {
          document.getElementById('radiosection').style.display='';
        }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > this.maxFileSize) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      // Check file type
      if (!this.allowedTypes.includes(file.type)) {
        alert(
          `File "${file.name}" is not a supported format. Please upload PDF, DOC, DOCX, JPG, or PNG files.`
        );
        continue;
      }

      // Add to uploaded files array
      this.uploadedFiles.push(file);

      // Create preview
      this.createFilePreview(file);
    }

    // Reset file input to allow selecting the same file again
    this.fileInput.value = "";
  }

  // Create file preview element
  createFilePreview(file) {
    const preview = document.createElement("div");
    preview.className = "file-preview";

    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";

    // Set icon based on file type
    if (file.type.includes("image")) {
      icon.textContent = "image";
    } else if (file.type.includes("pdf")) {
      icon.textContent = "picture_as_pdf";
    } else {
      icon.textContent = "description";
    }

    const fileName = document.createElement("span");
    fileName.textContent = file.name;

    const removeBtn = document.createElement("button");
    removeBtn.innerHTML =
      '<span class="material-symbols-outlined">close</span>';
    removeBtn.addEventListener("click",  () =>{
      // Remove from uploaded files array
      const index = this.uploadedFiles.indexOf(file);
      if (index > -1) {
        this.uploadedFiles.splice(index, 1);
         if(this.uploadedFiles.length == 0)
         {
          document.getElementById("radiosection").style.display='none';
         }
      }

      // Remove preview
      preview.remove();
    });

    preview.appendChild(icon);
    preview.appendChild(fileName);
    preview.appendChild(removeBtn);

    this.filePreviewContainer.appendChild(preview);
  }

  showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotification = document.querySelector(".form-notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const typeClasses = {
      success: "bg-green-500 text-white",
      error: "bg-red-500 text-white",
      warning: "bg-yellow-500 text-white",
      info: "bg-blue-500 text-white",
    };

    const notification = document.createElement("div");
    notification.className = `form-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${typeClasses[type]}`;

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
}

// Initialize when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  new NewIndustrialTraining();
});
