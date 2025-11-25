import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
import {
  auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "../../../js/config/firebaseInit.js";
import { IndustrialTraining } from "../../../js/model/internship_model.js";
import { Company } from "../../../js/model/Company.js";
import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";
import {CloudStorage} from "../../../js/fireabase/Cloud_Storage.js";
const cloudStorage = new CloudStorage();
const itc_firebase_logic = new ITBaseCompanyCloud();

class NewIndustrialTrainingEdit {
  constructor() {
    this.companyCloud = new ITBaseCompanyCloud();
    this.currentCompany = null;
    this.isEditMode = false;
    this.currentITId = null;
    this.init();
  }

  init() {
    //console.log("NewIndustrialTraining initialized");
    this.checkEditMode();
    this.showLoadingDialog();
    this.checkAuthState();

    // Initialize file upload properties
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

    // Setup event listeners and file upload
    this.attachEventListeners();
    this.setupFormValidation();
    this.setupFileUpload();
    this.setupUniversalFormToggle();
  }

  setupUniversalFormToggle() {
    const universalRadio = document.getElementById("use-as-universal");
    const singleRadio = document.getElementById("use-for-single");
    const radioSection = document.getElementById("radiosection");
    radioSection.style.display = "none";
  }
  setupFileUpload() {
    if (!this.fileUploadArea || !this.fileInput) {
      console.warn("File upload elements not found");
      return;
    }

    // // Click on upload area to trigger file input
    // this.fileUploadArea.addEventListener("click", () => {
    //   this.fileInput.click();
    // });

    // Handle file selection
    this.fileInput.addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
    });

    // Drag and drop functionality
    this.fileUploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.fileUploadArea.classList.add("dragover");
    });

    this.fileUploadArea.addEventListener("dragleave", () => {
      this.fileUploadArea.classList.remove("dragover");
    });

    this.fileUploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      this.fileUploadArea.classList.remove("dragover");
      this.handleFiles(e.dataTransfer.files);
    });
  }

  // Handle file validation and preview
  handleFiles(files) {
    //console.log("Files length is " + files.length);

    if (files.length > 0) {
      const radioSection = document.getElementById("radiosection");
      if (radioSection) {
        radioSection.style.display = "";
      }
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
    removeBtn.addEventListener("click", () => {
      // Remove from uploaded files array
      const index = this.uploadedFiles.indexOf(file);
      if (index > -1) {
        this.uploadedFiles.splice(index, 1);
        if (this.uploadedFiles.length === 0) {
          const radioSection = document.getElementById("radiosection");
          if (radioSection) {
            radioSection.style.display = "none";
          }
        }
      }

      // Remove preview
      preview.remove();
    });

    preview.appendChild(icon);
    preview.appendChild(fileName);
    preview.appendChild(removeBtn);

    if (this.filePreviewContainer) {
      this.filePreviewContainer.appendChild(preview);
    }
  }

  showLoadingDialog() {
    const loadingDialog = document.createElement("div");
    loadingDialog.id = "loading-dialog";
    loadingDialog.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    loadingDialog.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div class="flex flex-col items-center gap-4">
          <div class="loading-spinner w-16 h-16 border-4 border-blue-200 border-t-primary rounded-full animate-spin"></div>
          <h3 class="text-xl font-semibold text-gray-800 dark:text-white text-center">
            ${
              this.isEditMode
                ? "Loading Industrial Training Data..."
                : "Loading Form..."
            }
          </h3>
          <p class="text-gray-600 dark:text-gray-400 text-center">
            ${
              this.isEditMode
                ? "Please wait while we load your industrial training data"
                : "Please wait while we prepare the form"
            }
          </p>
        </div>
      </div>
    `;
    document.body.appendChild(loadingDialog);

    // Disable form while loading
    this.setFormEnabled(false);
  }

  showProgressDialog(title = "Processing...", initialMessage = "Starting process...") {
    const progressDialog = document.createElement("div");
    progressDialog.id = "progress-dialog";
    progressDialog.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    
    progressDialog.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div class="flex flex-col items-center gap-4">
                <div class="loading-spinner w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                
                <h3 class="text-xl font-semibold text-gray-800 dark:text-white text-center">
                    ${title}
                </h3>
                
                <p id="progress-message" class="text-gray-600 dark:text-gray-400 text-center">
                    ${initialMessage}
                </p>
                
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div id="progress-bar" class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
                </div>
                
                <div class="flex justify-between w-full text-sm text-gray-500 dark:text-gray-400">
                    <span id="progress-percentage">0%</span>
                    <span id="progress-status">Initializing...</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(progressDialog);
    this.setFormEnabled(false);
    
    // Return methods to update the progress
    return {
        updateProgress: (percentage, message, status = "Processing...") => {
            const progressBar = document.getElementById("progress-bar");
            const progressMessage = document.getElementById("progress-message");
            const progressPercentage = document.getElementById("progress-percentage");
            const progressStatus = document.getElementById("progress-status");
            
            if (progressBar) progressBar.style.width = `${percentage}%`;
            if (progressMessage) progressMessage.textContent = message;
            if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
            if (progressStatus) progressStatus.textContent = status;
        },
        close: () => this.hideLoadingDialog()
    };
}

hideProgressDialog() {
    const progressDialog = document.getElementById("progress-dialog");
    if (progressDialog) {
        progressDialog.remove();
    }
    
    // Also hide the generic loading dialog if it exists
    this.hideLoadingDialog();
    
    // Re-enable form
    this.setFormEnabled(true);
}  
// Hide loading dialog
  hideLoadingDialog() {
    const loadingDialog = document.getElementById("loading-dialog");
    if (loadingDialog) {
      loadingDialog.remove();
    }

    // Re-enable form
    this.setFormEnabled(true);
  }

  // Enable/disable form elements
  setFormEnabled(enabled) {
    const form = document.querySelector("form");
    if (!form) return;

    const formElements = form.querySelectorAll(
      "input, textarea, select, button"
    );
    formElements.forEach((element) => {
      if (element.id !== "submit") {
        // Don't disable submit button during loading
        element.disabled = !enabled;
      }
    });

    if (enabled) {
      form.classList.remove("opacity-50", "pointer-events-none");
    } else {
      form.classList.add("opacity-50", "pointer-events-none");
    }
  }

  // Check if we're in edit mode by looking for ID in URL
  checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const itId = urlParams.get("id");

    if (itId) {
      this.isEditMode = true;
      this.currentITId = itId;
      //console.log("Edit mode activated for IT ID:", itId);

      // Update page title and button text for edit mode
      this.updateUIForEditMode();
    }
  }

  updateUIForEditMode() {
    // Update page title
    const pageTitle = document.querySelector("h1");
    if (pageTitle) {
      pageTitle.textContent = "Edit Industrial Training Posting";
    }

    // Update submit button text
    const submitButton = document.getElementById("submit");
    if (submitButton) {
      const span = submitButton.querySelector("span");
      if (span) {
        span.textContent = "Update Posting";
      }
    }
  }

  async checkAuthState() {
    try {
      await auth.authStateReady();
      const user = auth.currentUser;

      if (!user) {
        alert("No user logged in, redirecting to login");
        window.location.href = "company_login.html";
        return;
      }

      //console.log("User authenticated:", user.uid);
      await this.loadCompanyData(user.uid);

      // If in edit mode, load the existing industrial training data
      if (this.isEditMode) {
        await this.loadIndustrialTrainingData();
      } else {
        this.hideLoadingDialog();
      }
    } catch (error) {
      console.error("Auth state check error:", error);
      window.location.href = "company_login.html";
    }
  }

  async loadIndustrialTrainingData() {
    try {
      if (!this.currentITId || !this.currentCompany) {
        throw new Error("Missing IT ID or company data");
      }

      //console.log("Loading industrial training data for ID:", this.currentITId);

      const industrialTraining =
        await this.companyCloud.getIndustrialTrainingById(
          this.currentCompany.id,
          this.currentITId
        );

      if (!industrialTraining) {
        throw new Error("Industrial training not found");
      }

      //console.log("Industrial training loaded:", industrialTraining);
     await this.prefillForm(industrialTraining);
    } catch (error) {
      console.error("Error loading industrial training data:", error);
      this.showNotification(
        "Error loading industrial training data. Please try again.",
        "error"
      );
    } finally {
      this.hideLoadingDialog();
    }
  }

 async prefillForm(industrialTraining) {
    try {
      //console.log("Prefilling form with data:", industrialTraining);

      // Basic information
      this.setFieldValue("title", industrialTraining.title);
      this.setFieldValue("location", industrialTraining.address);
      this.setFieldValue("detail-description", industrialTraining.description);
      this.setFieldValue(
        "requiredskillls",
        industrialTraining.eligibilityCriteria
      );
      this.setFieldValue("intake", industrialTraining.intakeCapacity);
      this.setFieldValue("Stipend", industrialTraining.stipend);
      this.setFieldValue("contactperson", industrialTraining.contactPerson);
      this.setFieldValue("aptitude-test", industrialTraining.aptitudeTest);

      // Status
      if (industrialTraining.status) {
        this.setFieldValue("status", industrialTraining.status);
      }

      //console.log("it details " + industrialTraining);

      // Department handling
      this.prefillDepartment(industrialTraining.department);

      // Aptitude test
      this.prefillAptitudeTest(industrialTraining.aptitudeTestRequired);
      let fileUrls ;
      await auth.authStateReady();
      const company = await this.companyCloud.getCompany(auth.currentUser.uid);
         //console.log("company json "+JSON.stringify(company));
        if(company.forms.length != 0)
        {
            //console.log("industrialTraining.files "+industrialTraining.files);
      this.prefillAttachedFiles(company.forms);
        }
        else
        {
            //console.log("industrialTraining.files "+industrialTraining.files);
      this.prefillAttachedFiles(industrialTraining.files);
        }
    

      //console.log("Form prefilled successfully");
    } catch (error) {
      console.error("Error prefilling form:", error);
      throw error;
    }
  }

  async prefillAttachedFiles(urls) {
    const filePreview = document.getElementById("file-preview-container");
    const radioSection = document.getElementById("radiosection");
    radioSection.style.display = "none";
    if (!filePreview) {
      console.error("File preview container not found");
      return;
    }
     if(urls.length != 0)
     {
       radioSection.style.display = "";
     }

    // Clear any existing content
    filePreview.innerHTML = "";

    if (!urls) {
      //console.log("No URLs provided to prefill");
      return;
    }
      //console.log("raw url "+JSON.stringify(urls));
    // Case 1: urls is a string (single URL)
    if (typeof urls === "string") {
      //console.log("Prefilling with single URL:", urls);
      this.createFilePreviewFromURL(urls);
      return;
    }

    // Case 2: urls is an array of URLs
    if (Array.isArray(urls)) {
      //console.log("Prefilling with URL array:", urls);

      // Filter out any non-string values and empty URLs
      const validUrls = urls.filter(
        (url) => typeof url === "string" && url.trim().length > 0
      );

      if (validUrls.length === 0) {
        //console.log("No valid URLs in array");
        return;
      }

      validUrls.forEach((url) => {
        this.createFilePreviewFromURL(url);
      });
      return;
    }

    await auth.authStateReady();

    let company = await itc_firebase_logic.getCompany(auth.currentUser.uid);

    if (company && company.forms && company.forms.length !== 0) {
      //console.log(
      //   "Prefilling attached files from company forms:",
      //   company.forms
      // );

      // Handle forms array -form information or attached files from forms
      company.forms.forEach((form, index) => {
        this.createFormPreview(form, index);
      });
      radioSection.style.display = "";
      return;
    }

    // if (company && company.logoURL) {
    //   //console.log(
    //     "Prefilling attached files with company logo:",
    //     company.logoURL
    //   );
    //   this.createFilePreviewFromURL(company.logoURL, "Company Logo");
    //   radioSection.style.display = "";
    //   return;
    // }

    //console.log("No files to prefill");
  }

  // Helper method to create file preview from URL
  createFilePreviewFromURL(url, fileName = "Uploaded File") {
    const filePreview = document.getElementById("file-preview-container");

    const preview = document.createElement("div");
    preview.className =
      "file-preview flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700";

    const icon = document.createElement("span");
    icon.className =
      "material-symbols-outlined text-gray-600 dark:text-gray-400";

    // Determine icon based on file type from URL extension
    if (url.includes(".pdf")) {
      icon.textContent = "picture_as_pdf";
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      icon.textContent = "image";
    } else {
      icon.textContent = "description";
    }

    const fileInfo = document.createElement("div");
    fileInfo.className = "flex-1";

    const fileNameElement = document.createElement("span");
    fileNameElement.className =
      "block text-sm font-medium text-gray-900 dark:text-white";
    fileNameElement.textContent = fileName;

    // Create View button instead of direct link
    const viewButton = document.createElement("button");
    viewButton.className =
      "block text-xs text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer";
    viewButton.textContent = "View File";
    viewButton.addEventListener("click", () => {
      this.downloadAndDisplayFile(url, fileName);
    });

    fileInfo.appendChild(fileNameElement);
    fileInfo.appendChild(viewButton);

    const removeBtn = document.createElement("button");
    removeBtn.innerHTML =
      '<span class="material-symbols-outlined text-gray-500 hover:text-red-500">close</span>';
    removeBtn.addEventListener("click",async () => {
      const isConfirmed = confirm("Are you sure you want to remove this file ? the action can't be undone");

      if (isConfirmed) {
         this.showProgressDialog();
        await auth.authStateReady();
         await this.companyCloud.removeFormUrl(auth.currentUser.uid,url);
         await this.companyCloud.removeFileFromIT(auth.currentUser.uid, this.currentITId,url);
         await cloudStorage.deleteFile(url);
        preview.remove();
        this.hideProgressDialog();
        this.showNotification("File removed successfully", "success");
        const radioSection = document.getElementById("radiosection");
        if (radioSection) {
          radioSection.style.display = "none";
        }
      } else {
        //console.log("File removal cancelled");
      }
    });

    preview.appendChild(icon);
    preview.appendChild(fileInfo);
    preview.appendChild(removeBtn);
    filePreview.appendChild(preview);
  }

  // Method to download and display file in dialog
  async downloadAndDisplayFile(url, fileName) {
    try {
      // Show loading state
      this.showLoadingDialog("Loading file...");
     //console.log("url is "+url);
      // Download the file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);

      // Create and show the dialog
      this.showFileDialog(fileUrl, fileName, blob.type);

      this.hideLoadingDialog();
    } catch (error) {
      console.error("Error downloading file:", error);
      this.hideLoadingDialog();
      this.showNotification("Failed to load file", "error");

      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  }

  // Method to create and show file dialog
  showFileDialog(fileUrl, fileName, fileType) {
    // Remove existing dialog if any
    const existingDialog = document.getElementById("file-viewer-dialog");
    if (existingDialog) {
      existingDialog.remove();
    }

    // Create dialog overlay
    const dialog = document.createElement("div");
    dialog.id = "file-viewer-dialog";
    dialog.className =
      "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4";

    // Create dialog content
    dialog.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1 mr-4" id="dialog-file-name">${fileName}</h3>
        <div class="flex items-center gap-2">
          <button id="dialog-download" class="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Download">
            <span class="material-symbols-outlined">download</span>
          </button>
          <button id="dialog-close" class="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Content Area - Scrollable -->
      <div class="flex-1 overflow-hidden flex flex-col">
        <!-- Pagination Controls (for multi-page documents) -->
        <div id="pagination-controls" class="hidden flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <button id="prev-page" class="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-lg">chevron_left</span>
            Previous
          </button>
          
          <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span id="current-page">1</span>
            <span>of</span>
            <span id="total-pages">1</span>
          </div>
          
          <button id="next-page" class="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
            Next
            <span class="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>

        <!-- File Content - Scrollable -->
        <div id="file-content" class="flex-1 overflow-auto p-6">
          <div id="file-display" class="flex items-center justify-center min-h-full">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p class="text-gray-600 dark:text-gray-400">Loading file content...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(dialog);

    // Add event listeners
    this.setupDialogEventListeners(dialog, fileUrl, fileName, fileType);

    // Load the file content
    this.loadFileContent(fileUrl, fileName, fileType);
  }

  // Setup dialog event listeners
  setupDialogEventListeners(dialog, fileUrl, fileName, fileType) {
    // Close button
    const closeBtn = dialog.querySelector("#dialog-close");
    closeBtn.addEventListener("click", () => {
      // Revoke the object URL to free memory
      URL.revokeObjectURL(fileUrl);
      dialog.remove();
    });

    // Download button
    const downloadBtn = dialog.querySelector("#dialog-download");
    downloadBtn.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    // Close on overlay click
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        URL.revokeObjectURL(fileUrl);
        dialog.remove();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", function closeOnEscape(e) {
      if (e.key === "Escape") {
        URL.revokeObjectURL(fileUrl);
        dialog.remove();
        document.removeEventListener("keydown", closeOnEscape);
      }
    });
  }

  // Load and display file content based on type
  async loadFileContent(fileUrl, fileName, fileType) {
    const fileDisplay = document.getElementById("file-display");
    const paginationControls = document.getElementById("pagination-controls");

    try {
      if (fileType.includes("pdf")) {
        await this.displayPDF(fileUrl, fileDisplay, paginationControls);
      } else if (fileType.includes("image")) {
        this.displayImage(fileUrl, fileDisplay);
      } else if (fileType.includes("text") || fileName.endsWith(".txt")) {
        await this.displayText(fileUrl, fileDisplay);
      } else {
        this.displayUnsupported(fileDisplay, fileName);
      }
    } catch (error) {
      console.error("Error loading file content:", error);
      this.displayError(fileDisplay, "Failed to load file content");
    }
  }

  // Display PDF with pagination
  async displayPDF(fileUrl, container, paginationControls) {
    // For PDF, you would typically use a PDF.js library
    // This is a simplified version - you might want to use a proper PDF viewer

    container.innerHTML = `
    <div class="w-full text-center">
      <p class="text-gray-600 dark:text-gray-400 mb-4">PDF files are best viewed in a dedicated PDF viewer.</p>
      <iframe 
        src="${fileUrl}" 
        class="w-full h-96 border border-gray-300 dark:border-gray-600 rounded-lg"
        title="PDF Document"
      ></iframe>
      <div class="mt-4">
        <a href="${fileUrl}" download class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <span class="material-symbols-outlined">download</span>
          Download PDF
        </a>
      </div>
    </div>
  `;

    // Show pagination controls for PDF
    paginationControls.classList.remove("hidden");
  }

  // Display image
  displayImage(fileUrl, container) {
    container.innerHTML = `
    <div class="flex justify-center">
      <img 
        src="${fileUrl}" 
        alt="Preview" 
        class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
        onerror="this.style.display='none'; document.getElementById('image-error').style.display='block';"
      >
      <div id="image-error" class="hidden text-center text-red-600 dark:text-red-400">
        Failed to load image
      </div>
    </div>
  `;
  }

  // Display text file
  async displayText(fileUrl, container) {
    try {
      const response = await fetch(fileUrl);
      const text = await response.text();

      container.innerHTML = `
      <div class="w-full max-w-4xl mx-auto">
        <pre class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[60vh] overflow-y-auto">${this.escapeHtml(
          text
        )}</pre>
      </div>
    `;
    } catch (error) {
      throw new Error("Failed to load text file");
    }
  }

  // Display unsupported file type
  displayUnsupported(container, fileName) {
    container.innerHTML = `
    <div class="text-center">
      <span class="material-symbols-outlined text-6xl text-gray-400 dark:text-gray-600 mb-4">description</span>
      <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Unsupported File Type</h4>
      <p class="text-gray-600 dark:text-gray-400 mb-4">This file type cannot be previewed in the browser.</p>
      <p class="text-sm text-gray-500 dark:text-gray-500">File: ${fileName}</p>
    </div>
  `;
  }

  // Display error
  displayError(container, message) {
    container.innerHTML = `
    <div class="text-center">
      <span class="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
      <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading File</h4>
      <p class="text-gray-600 dark:text-gray-400">${message}</p>
    </div>
  `;
  }

  // Utility function to escape HTML
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Add CSS for better scrolling
  addFileViewerStyles() {
    const style = document.createElement("style");
    style.textContent = `
    #file-viewer-dialog {
      backdrop-filter: blur(4px);
    }
    #file-content {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e0 #f7fafc;
    }
    #file-content::-webkit-scrollbar {
      width: 6px;
    }
    #file-content::-webkit-scrollbar-track {
      background: #f7fafc;
    }
    #file-content::-webkit-scrollbar-thumb {
      background-color: #cbd5e0;
      border-radius: 3px;
    }
    .dark #file-content::-webkit-scrollbar-track {
      background: #1a202c;
    }
    .dark #file-content::-webkit-scrollbar-thumb {
      background-color: #4a5568;
    }
  `;
    document.head.appendChild(style);
  }
  // Helper method to create form preview
  createFormPreview(form, index) {
    const filePreview = document.getElementById("file-preview-container");

    const preview = document.createElement("div");
    preview.className =
      "file-preview flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800";

    const icon = document.createElement("span");
    icon.className =
      "material-symbols-outlined text-blue-600 dark:text-blue-400";
    icon.textContent = "description";

    const formInfo = document.createElement("div");
    formInfo.className = "flex-1";

    const formName = document.createElement("span");
    formName.className =
      "block text-sm font-medium text-blue-900 dark:text-blue-100";
    formName.textContent = form.title || `Form ${index + 1}`;

    const formType = document.createElement("span");
    formType.className = "block text-xs text-blue-700 dark:text-blue-300";
    formType.textContent = `Type: ${form.type || "Unknown"}`;

    const formStatus = document.createElement("span");
    formStatus.className = `inline-block mt-1 px-2 py-1 text-xs rounded-full ${
      form.isActive
        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }`;
    formStatus.textContent = form.isActive ? "Active" : "Inactive";

    formInfo.appendChild(formName);
    formInfo.appendChild(formType);
    formInfo.appendChild(formStatus);

    preview.appendChild(icon);
    preview.appendChild(formInfo);

    filePreview.appendChild(preview);
  }
  setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value !== undefined && value !== null) {
      field.value = value;
    }
  }

  prefillDepartment(department) {
    const otherDepartmentContainer = document.getElementById(
      "other-department-container"
    );
    const otherDepartmentInput = document.querySelector(
      "#other-department-container input"
    );

    if (otherDepartmentInput && department) {
      otherDepartmentInput.value = department;
    }
  }

  prefillAptitudeTest(aptitudeTestRequired) {
    const aptitudeTestSelect = document.getElementById("aptitude-test");
    if (aptitudeTestSelect) {
      aptitudeTestSelect.value = aptitudeTestRequired ? "yes" : "no";
    }
  }

  async loadCompanyData(userId) {
    try {
      this.currentCompany = await this.companyCloud.getCompany(userId);

      if (!this.currentCompany) {
        throw new Error("Company profile not found");
      }

      //console.log("Company loaded:", this.currentCompany.name);
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

      const loadingText = this.isEditMode ? "Updating..." : "Posting...";

      submitButton.innerHTML = `
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>${loadingText}</span>
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
        const buttonText = this.isEditMode ? "Update" : "Submit";
        submitButton.innerHTML = `
                <span>${buttonText}</span>
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

    // Validate all fields
    const isValid = this.validateForm();
    if (!isValid) {
      this.showNotification(
        "Please fix the errors in the form before submitting.",
        "error"
      );
      return;
    }

    try {
      // Show loading state
      this.setSubmitButtonLoading(true);

      // Collect form data
      const formData = await this.collectFormData();
      //console.log("formData is " + JSON.stringify(formData));

      if (this.isEditMode) {
        // Update existing industrial training
        await this.updateIndustrialTraining(formData);
      } else {
        // Create new industrial training
        await this.createIndustrialTraining(formData);
      }
    } catch (error) {
      console.error("Error processing industrial training:", error);
      this.showNotification(
        `Failed to ${
          this.isEditMode ? "update" : "post"
        } industrial training. Please try again.`,
        "error"
      );
      this.setSubmitButtonLoading(false);
    }
  }

  async updateIndustrialTraining(formData) {
    try {
      const updates = {
        title: formData.title,
        department: formData.department,
        address: formData.location,
        description: formData.description,
        eligibilityCriteria: formData.requirements,
        aptitudeTestRequired: formData.aptitudeTest === "yes",
        intakeCapacity: formData.intake,
        stipend: formData.stipend,
        status: formData.status,
        contactPerson: formData.contactPerson,
        updatedAt: new Date(),
      };

      await this.companyCloud.updateIndustrialTraining(
        this.currentCompany.id,
        this.currentITId,
        updates
      );

      this.showNotification(
        "Industrial Training opportunity updated successfully!",
        "success"
      );

      // Redirect to dashboard after success
      setTimeout(() => {
        window.location.href = "company_dashboard.html";
      }, 2000);
    } catch (error) {
      console.error("Error updating industrial training:", error);
      throw error;
    }
  }

  async createIndustrialTraining(formData) {
    try {
      // Create IndustrialTraining object
      const industrialTraining = this.createIndustrialTrainingObject(formData);

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
      console.error("Error creating industrial training:", error);
      throw error;
    }
  }

  validateForm() {
    const requiredFields = document.querySelectorAll("[required]");
    //console.log("requiredFields " + requiredFields.length);
    let isValid = true;

    // First, validate all regular required fields
    requiredFields.forEach((field) => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    // Validate department fields
    if (!this.validateDepartmentFields()) {
      isValid = false;
    }

    //console.log("isValid is " + isValid);
    return isValid;
  }

  validateDepartmentFields() {
    const otherDepartmentInput = document.getElementById("department-input");

    if (otherDepartmentInput) {
      this.clearFieldError(otherDepartmentInput);

      if (!otherDepartmentInput.value.trim()) {
        this.showFieldError(
          otherDepartmentInput,
          "Please specify the department name"
        );
        return false;
      }
    }

    return true;
  }

  async collectFormData() {
    const otherDepartmentInput = document.querySelector(
      "#other-department-container input"
    );

    let department = "";
    if (otherDepartmentInput) {
      department = otherDepartmentInput.value.trim();
    }

    await auth.authStateReady();
    //console.log("uploads is null or undefined ?" + this.uploadedFiles);
    let uploadResults = await cloudStorage.uploadMultipleFiles(
      this.uploadedFiles,
      auth.currentUser.uid,
      "applications-form"
    );
    if (uploadResults.length == 0) {
      this.showNotification(
        "An error Occure while uploading the form, kindly retry the uplaod"
      );
    }
    let formUrls = uploadResults
      .map((result) => result.url) // Get only the URL from each result
      .filter((url) => url !== null); // Remove any failed uploads

    //console.log("Extracted URLs only:", formUrls);
    if (document.getElementById("use-as-universal")) {
      //console.log("is universal form and form is " + JSON.stringify(formUrls));
      await auth.authStateReady();
      await this.companyCloud.updateCompanyProfile(auth.currentUser.uid, {
        form: formUrls,
      });
      //console.log("is universal form added ");
    }

    return {
      title: document.getElementById("title").value.trim(),
      department: department,
      location: document.getElementById("location").value.trim(),
      description: document.getElementById("detail-description").value.trim(),
      requirements: document.getElementById("requiredskillls").value.trim(),
      aptitudeTest: document.getElementById("aptitude-test").value,
      intake: parseInt(document.getElementById("intake").value) || 1,
      stipend: document.getElementById("Stipend").value.trim(),
      status: document.getElementById("status").value,
      contactPerson: document.getElementById("contactperson").value.trim(),
      form: formUrls,
    };
  }

  createIndustrialTrainingObject(formData) {
    return new IndustrialTraining({
      title: formData.title,
      department: formData.department,
      location: formData.location,
      description: formData.description,
      requirements: formData.requirements,
      aptitudeTestRequired: formData.aptitudeTest === "yes",
      intakeCapacity: formData.intake,
      stipend: formData.stipend,
      status: formData.status,
      contactPerson: formData.contactPerson,
      company: this.currentCompany,
      postedAt: new Date(),
      applications: [],
    });
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
  new NewIndustrialTrainingEdit();
});
