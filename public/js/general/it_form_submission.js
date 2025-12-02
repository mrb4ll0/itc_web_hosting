import { ITCFirebaseLogic } from "../fireabase/ITCFirebaseLogic.js";
import { Student } from "../model/Student.js";
import { firebaseConfig, onAuthStateChanged } from "../config/firebaseInit.js";
import { CompanyCloud } from "../fireabase/CompanyCloud.js";
import { db, auth } from "../config/firebaseInit.js";
import { StudentCloudDB } from "../fireabase/StudentCloud.js";
import {
  generateShareableUrl,
  getNigerianIndustryDescription,
  isFormExist,
  viewExistingFile,
} from "./generalmethods.js";
import { CloudStorage } from "../fireabase/Cloud_Storage.js";
import { ITBaseCompanyCloud } from "../fireabase/ITBaseCompanyCloud.js";
import { StudentApplication } from "../model/studentApplication.js";
const itc_firebase_logic = new ITCFirebaseLogic();
const it_base_companycloud = new ITBaseCompanyCloud();
/** @type {import('../fireabase/CompanyCloud.js').CompanyCloud} */
const companyCloud = new CompanyCloud();
/** @type {import('../fireabase/StudentCloud.js').StudentCloudDB} */
const studentCloudDB = new StudentCloudDB();
const cloudStorage = new CloudStorage();
const it_base_company_cloud = new ITBaseCompanyCloud();

class ITFormSubmission {
  constructor() {
    this.currentInternship = null;
    this.uploadedFiles = {
      idCard: null,
      trainingLetter: null,
      applicationForms: [],
    };
    this.top_right_image = document.getElementById("top-right-image");
    this.isLoading = true;
    this.showLoadingDialog();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        ////console.log(" User is signed in:", user.uid);
        this.loadStudentImage(user.uid);
      } else {
        console.warn("No user signed in");
        alert("account not found, kindly login again");
        this.hideLoadingDialog();
      }
    });
    initializeDurationSection();
    this.init();
    emailjs.init("I1wzz3SQwius_NJlY");
  }

  async setupNewOrExistingFile() {
    try {
      
      const existingFiles = await studentCloudDB.getStudentExistingFile(
        auth.currentUser.uid
      );
     
      // Handle ID Card
      if (existingFiles.studentIdCard && existingFiles.studentIdCard !== "" && existingFiles.studentIdCard.startsWith('https://')) {
        // Show existing ID card option and hide upload area
        document.getElementById("id-card-existing").checked = true;
        document.getElementById("id-card-upload-area").classList.add("hidden");
        document
          .getElementById("id-card-existing-display")
          .classList.remove("hidden");

        // Update the display with actual file information
        const idCardDisplay = document.getElementById(
          "id-card-existing-display"
        );
        const fileNameElement = idCardDisplay.querySelector(
          "p.text-sm.font-medium"
        );
        const uploadDateElement = idCardDisplay.querySelector("p.text-xs");

        // You might want to extract filename from the path or store it separately
        fileNameElement.textContent =
          existingFiles.studentIdCardFileName || "student_id_card.pdf";

        // Set upload date if available, otherwise use a default
        if (existingFiles.studentIdCardUploadDate) {
          uploadDateElement.textContent = `Uploaded on ${new Date(
            existingFiles.uploadedAt
          ).toLocaleDateString()}`;
        } else {
          uploadDateElement.textContent = "Previously uploaded";
        }

        // Add event listener for view button
        document
          .getElementById("id-card-viewbtn")
          .addEventListener("click", () => {
            viewExistingFile(existingFiles.studentIdCard, "ID Card");
          });
      } else {
        // No existing ID card, ensure new upload is selected
        document.getElementById("id-card-new").checked = true;
        document
          .getElementById("id-card-upload-area")
          .classList.remove("hidden");
        document
          .getElementById("id-card-existing-display")
          .classList.add("hidden"); //id-card-existing
           document
          .getElementById("id-card-existing")
          .classList.add("hidden");
            document
          .getElementById("id-card-existing-label")
          .classList.add("hidden");
      }

      // Handle Training Letter
      if (existingFiles.itLetter && existingFiles.itLetter !== "" && existingFiles.itLetter.startsWith('https://')) {
        // Show existing training letter option and hide upload area
        document.getElementById("training-letter-existing").checked = true;
        document
          .getElementById("training-letter-upload-area")
          .classList.add("hidden");
        document
          .getElementById("training-letter-existing-display")
          .classList.remove("hidden");

        // Update the display with actual file information
        const trainingLetterDisplay = document.getElementById(
          "training-letter-existing-display"
        );
        const fileNameElement = trainingLetterDisplay.querySelector(
          "p.text-sm.font-medium"
        );
        const uploadDateElement =
          trainingLetterDisplay.querySelector("p.text-xs");

        // You might want to extract filename from the path or store it separately
        fileNameElement.textContent =
          existingFiles.itLetterFileName || "training_letter.pdf";

        // Set upload date if available, otherwise use a default
        if (existingFiles.itLetterUploadDate) {
          uploadDateElement.textContent = `Uploaded on ${new Date(
            existingFiles.itLetterUploadDate
          ).toLocaleDateString()}`;
        } else {
          uploadDateElement.textContent = "Previously uploaded";
        }

        // Add event listener for view button
        document
          .getElementById("it-letter-viewbtn")
          .addEventListener("click", () => {
            viewExistingFile(existingFiles.itLetter, "Training Letter");
          });
      } else {
        // No existing training letter, ensure new upload is selected
        document.getElementById("training-letter-new").checked = true;
        document
          .getElementById("training-letter-upload-area")
          .classList.remove("hidden");
        document
          .getElementById("training-letter-existing-display")
          .classList.add("hidden");
          document
          .getElementById("training-letter-existing")
          .classList.add("hidden");
          document
          .getElementById("training-letter-existing-label")
          .classList.add("hidden");
      }

      // Add event listeners for radio button changes
      this.setupRadioButtonListeners();
    } catch (error) {
      console.error("Error setting up new or existing files:", error);
      // Fallback: show upload areas for both documents
      document.getElementById("id-card-new").checked = true;
      document.getElementById("training-letter-new").checked = true;
      document.getElementById("id-card-upload-area").classList.remove("hidden");
      document
        .getElementById("training-letter-upload-area")
        .classList.remove("hidden");
      document
        .getElementById("id-card-existing-display")
        .classList.add("hidden");
      document
        .getElementById("training-letter-existing-display")
        .classList.add("hidden");
    }
  }

  // Helper method to setup radio button listeners
  setupRadioButtonListeners() {
    // ID Card radio button listeners
    document.getElementById("id-card-new").addEventListener("change", () => {
      if (document.getElementById("id-card-new").checked) {
        document
          .getElementById("id-card-upload-area")
          .classList.remove("hidden");
        document
          .getElementById("id-card-existing-display")
          .classList.add("hidden");
      }
    });

    document
      .getElementById("id-card-existing")
      .addEventListener("change", () => {
        if (document.getElementById("id-card-existing").checked) {
          document
            .getElementById("id-card-upload-area")
            .classList.add("hidden");
          document
            .getElementById("id-card-existing-display")
            .classList.remove("hidden");
        }
      });

    // Training Letter radio button listeners
    document
      .getElementById("training-letter-new")
      .addEventListener("change", () => {
        if (document.getElementById("training-letter-new").checked) {
          document
            .getElementById("training-letter-upload-area")
            .classList.remove("hidden");
          document
            .getElementById("training-letter-existing-display")
            .classList.add("hidden");
        }
      });

    document
      .getElementById("training-letter-existing")
      .addEventListener("change", () => {
        if (document.getElementById("training-letter-existing").checked) {
          document
            .getElementById("training-letter-upload-area")
            .classList.add("hidden");
          document
            .getElementById("training-letter-existing-display")
            .classList.remove("hidden");
        }
      });
  }

  // Loading dialog methods
  showLoadingDialog() {
    // Remove existing loading dialog if any
    this.hideLoadingDialog();

    const loadingDialog = document.createElement("div");
    loadingDialog.id = "loading-dialog";
    loadingDialog.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    loadingDialog.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Loading</h3>
          <p class="text-slate-600 dark:text-slate-400 text-center">Please wait while we load your industrial training information...</p>
        </div>
      </div>
    `;
    document.body.appendChild(loadingDialog);
    this.isLoading = true;
  }

  hideLoadingDialog() {
    const loadingDialog = document.getElementById("loading-dialog");
    if (loadingDialog) {
      loadingDialog.remove();
    }
    this.isLoading = false;
  }

  async loadStudentImage(userId) {
    const student = await itc_firebase_logic.getStudent(userId);
    if (student) {
      ////console.log("Loaded student data:", student.imageUrl);
      this.top_right_image.style.backgroundImage = `url(${
        student.imageUrl || "../images/default-profile.png"
      })`;
    } else {
      console.error(" Error loading student image:", error);
    }
  }

  getInternshipIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
  }

  async init() {
    await this.checkInternships();
    this.setupEventListeners();
    this.setupDragAndDrop();
  }

  async checkInternships() {
    try {
      
      const internships = await this.fetchInternships();

      if (internships && internships.length > 0) {
        
        this.currentInternship = internships[0];
        this.studentData = await itc_firebase_logic.getStudent(
          auth.currentUser.uid
        );
       
        await this.setupNewOrExistingFile();
        this.showUploadWidget();
        this.displayInternshipInfo();
      } else {
       
        await this.setupNewOrExistingFile();
        this.hideUploadWidget();
        this.showNoInternshipsMessage();
      }
    } catch (error) {
      console.error("Error checking internships:", error);
      this.showErrorMessage();
    }
  }

  async fetchInternships() {
    try {
      const internshipId = this.getInternshipIdFromURL();
      ////console.log("Fetching internship with ID:", internshipId);

      const internship = await companyCloud.getInternshipById(internshipId);
      const applications =
        await it_base_company_cloud.getApplicationsForIndustrialTraining(
          internship.company.id,
          internship.id
        );
      ////console.log("applications is "+JSON.stringify(applications));
      this.applicationsCount = applications.length;
      ////console.log("Raw internship data from Firestore:", internship);

      // Check if internship and files exist
      if (!internship) {
        console.error("No internship found with ID:", internshipId);
        return [];
      }

      ////console.log("Internship files:", internship.files);
      ////console.log("Files length:", internship.files?.length);
      ////console.log("Files type:", typeof internship.files);

      let hasForm;
      let formUrl;

      const company = await companyCloud.getCompany(internship.company.id);
      ////console.log("form is " + JSON.stringify(company));
      if (company.forms.length != 0) {
        hasForm =
          company.forms &&
          Array.isArray(company.forms) &&
          company.forms.length > 0;
        formUrl = hasForm ? company.forms[0] : null;
      } else {
        hasForm =
          internship.files &&
          Array.isArray(internship.files) &&
          internship.files.length > 0;
        formUrl = hasForm ? internship.files[0] : null;
      }
      ////console.log("hasForm " + hasForm);

      ////console.log("formUrl " + formUrl);

      ////console.log("Has form:", hasForm);
      ////console.log("Form URL:", formUrl);

      return [
        {
          id: internship.id,
          name: internship.title,
          companyName: internship.company?.name || "Unknown Company",
          companyId: internship.company?.id,
          hasForm: hasForm,
          formUrl: formUrl,
          rawInternship: internship, // Keep raw data for debugging
          company: internship.company, // Include company data
        },
      ];
    } catch (error) {
      console.error("Error in fetchInternships:", error);
      return [];
    }
  }

  showUploadWidget() {
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.style.display = "block";
    }
  }

  hideUploadWidget() {
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.style.display = "none";
    }
  }

  displayInternshipInfo() {
    if (!this.currentInternship) return;

    ////console.log("Displaying internship info:", this.currentInternship);

    const title = document.getElementById("page-title");
    const subtitle = document.getElementById("page-subtitle");
    const attachFileSection = document.getElementById(
      "application-forms-section"
    );
    const formExist = isFormExist(this.currentInternship);
    ////console.log("form exist " + formExist);
    if (!formExist) {
      attachFileSection.classList.add("hidden");
    }

    if (title) {
      title.innerHTML = `Upload Documents for <span class="text-primary">${this.currentInternship.name}</span>`;
    }

    if (subtitle) {
      subtitle.innerHTML = `Complete your application for <strong>${this.currentInternship.companyName}</strong> by providing the required documents below.`;
    }

    const existingBadge = document.querySelector(".internship-badge");
    if (existingBadge) {
      existingBadge.remove();
    }

    const titleSection = document.querySelector(".text-center");
    const badge = document.createElement("div");
    badge.className = "internship-badge mt-6";

    const downloadButtonHtml = this.currentInternship.hasForm
      ? `<button id="download-form-btn" class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors">
                Print Form
            </button>`
      : '<span class="text-sm text-slate-500">No form available</span>';

    badge.innerHTML = `
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="font-semibold text-blue-900 dark:text-blue-100">${
                          this.currentInternship.name
                        }</h4>
                        <p class="text-sm text-blue-700 dark:text-blue-300">${
                          this.currentInternship.companyName
                        }</p>
                        <p class="text-xs text-blue-600 dark:text-blue-400 mt-1">Form URL: ${
                          this.currentInternship.formUrl
                            ? "Available"
                            : "Not available"
                        }</p>
                    </div>
                    ${downloadButtonHtml}
                </div>
            </div>
        `;

    titleSection.parentNode.insertBefore(badge, titleSection.nextSibling);
    this.hideLoadingDialog();
    const downloadBtn = document.getElementById("download-form-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => this.printForm());
      ////console.log("Download button event listener added");
    } else {
      ////console.log("No download button to add event listener to");
    }
  }

  async printForm() {
    if (!this.currentInternship?.formUrl) {
      this.showNotification("No form available for printing.", "error");
      return;
    }

    const url = this.currentInternship.formUrl;
    const companyName = this.currentInternship.companyName;

    const downloadBtn = document.getElementById("download-form-btn");
    const originalHTML = downloadBtn?.innerHTML || "";
    if (downloadBtn) {
      downloadBtn.innerHTML =
        '<span class="material-symbols-outlined text-base">print</span> Preparing...';
      downloadBtn.disabled = true;
    }

    try {
      const printWindow = window.open("", "_blank", "width=800,height=600");

      if (!printWindow) {
        throw new Error(
          "Popup was blocked. Please allow popups and try again."
        );
      }

      printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print ${companyName} Application Form</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 50px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 80vh;
                    }
                    .loading {
                        font-size: 18px;
                        color: #666;
                    }
                    .spinner {
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #3498db;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 2s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .print-image {
                        max-width: 100%;
                        height: auto;
                        display: none; /* Hidden until loaded */
                    }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="loading no-print">
                    <div class="spinner"></div>
                    <p>Loading document for printing...</p>
                    <p><small>If print doesn't start automatically, use Ctrl+P</small></p>
                </div>
                <img src="${url}" 
                     alt="${companyName} Application Form" 
                     class="print-image"
                     onload="this.style.display='block'; document.querySelector('.loading').style.display='none'; window.print();">
                <div class="no-print" style="margin-top: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; margin: 5px;">Print</button>
                    <button onclick="window.close()" style="padding: 10px 20px; margin: 5px;">Close</button>
                </div>
            </body>
            </html>
        `);

      printWindow.document.close();

      this.showNotification(
        "Print window opened. Use browser print options.",
        "success"
      );
    } catch (error) {
      console.error("Print setup error:", error);
      this.showNotification(`Error: ${error.message}`, "error");
    } finally {
      // Reset button after a delay
      setTimeout(() => {
        if (downloadBtn) {
          downloadBtn.innerHTML = originalHTML;
          downloadBtn.disabled = false;
        }
      }, 3000);
      this.hideLoadingDialog();
    }
  }

  setupEventListeners() {
    ////console.log("Setting up event listeners...");

    // ID Card upload
    const idCardInput = document.getElementById("id-card-upload");
    if (idCardInput) {
      idCardInput.addEventListener("change", (e) =>
        this.handleFileUpload(e, "idCard")
      );
    }

    // Training Letter upload
    const trainingLetterInput = document.getElementById(
      "training-letter-upload"
    );
    if (trainingLetterInput) {
      trainingLetterInput.addEventListener("change", (e) =>
        this.handleFileUpload(e, "trainingLetter")
      );
    }

    // Application Forms upload
    const appFormsInput = document.getElementById("app-forms-upload");
    if (appFormsInput) {
      appFormsInput.addEventListener("change", (e) =>
        this.handleFileUpload(e, "applicationForms")
      );
    }

    // Submit button
    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
      submitBtn.addEventListener("click", (e) =>
        this.handleSubmit(e, this.currentInternship)
      );
    }

    // Cancel button
    const cancelBtn = document.getElementById("cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.handleCancel());
    }

    ////console.log("Event listeners setup complete");
  }

  setupDragAndDrop() {
    ////console.log("Setting up drag and drop...");

    const dropZones = [
      document.getElementById("id-card-upload-area"),
      document.getElementById("training-letter-upload-area"),
      document.getElementById("app-forms-upload-area"),
    ];

    dropZones.forEach((zone, index) => {
      if (!zone) return;

      const fileType =
        index === 0
          ? "idCard"
          : index === 1
          ? "trainingLetter"
          : "applicationForms";

      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        zone.classList.add("drag-over");
      });

      zone.addEventListener("dragleave", () => {
        zone.classList.remove("drag-over");
      });

      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("drag-over");

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleFileUpload({ target: { files } }, fileType);
        }
      });
    });
  }

  handleFileUpload(event, fileType) {
    const files = event.target.files;
    if (!files.length) return;

    const file = files[0];
    ////console.log(`File selected for ${fileType}:`, file.name);

    // Validate file
    if (!this.validateFile(file, fileType)) {
      return;
    }

    // Store file
    if (fileType === "applicationForms") {
      this.uploadedFiles.applicationForms.push(file);
    } else {
      this.uploadedFiles[fileType] = file;
    }

    // Update UI
    this.updateFileDisplay(fileType, file);

    // Simulate verification for ID Card
    if (fileType === "idCard") {
      this.simulateVerification();
    }

    this.showNotification(`${file.name} uploaded successfully!`);
  }

  validateFile(file, fileType) {
    const maxSizes = {
      idCard: 5 * 1024 * 1024, // 5MB
      trainingLetter: 5 * 1024 * 1024, // 5MB
      applicationForms: 10 * 1024 * 1024, // 10MB
    };

    const allowedTypes = {
      idCard: ["image/jpeg", "image/png", "application/pdf"],
      trainingLetter: ["image/jpeg", "image/png", "application/pdf"],
      applicationForms: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    };

    if (file.size > maxSizes[fileType]) {
      this.showNotification(
        `File too large. Maximum size: ${maxSizes[fileType] / (1024 * 1024)}MB`,
        "error"
      );
      return false;
    }

    if (!allowedTypes[fileType].includes(file.type)) {
      this.showNotification(
        "Invalid file type. Please check the allowed formats.",
        "error"
      );
      return false;
    }

    return true;
  }

  updateFileDisplay(fileType, file) {
    let container;
    let uploadArea;

    switch (fileType) {
      case "idCard":
        container = document.getElementById("id-card-section");
        uploadArea = document.getElementById("id-card-upload-area");
        break;
      case "trainingLetter":
        container = document.getElementById("training-letter-section");
        uploadArea = document.getElementById("training-letter-upload-area");
        break;
      case "applicationForms":
        container = document.getElementById("application-forms-section");
        uploadArea = document.getElementById("app-forms-upload-area");
        break;
    }

    if (!container || !uploadArea) return;

    // Hide upload area
    uploadArea.style.display = "none";

    // Create file display
    const displayId = `${fileType}-display`;
    let displayElement = document.getElementById(displayId);

    if (!displayElement) {
      displayElement = document.createElement("div");
      displayElement.id = displayId;
      displayElement.className =
        "mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4";
      container.appendChild(displayElement);
    }

    if (fileType === "applicationForms") {
      this.updateApplicationFormsDisplay(file, displayElement);
    } else {
      displayElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-green-600 dark:text-green-400">description</span>
                        <div>
                            <span class="text-sm font-medium text-green-900 dark:text-green-100">${
                              file.name
                            }</span>
                            <p class="text-xs text-green-700 dark:text-green-300">${this.formatFileSize(
                              file.size
                            )}</p>
                        </div>
                    </div>
                    <button class="text-red-600 hover:text-red-800 delete-file" data-type="${fileType}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            `;

      // Add delete event listener
      displayElement
        .querySelector(".delete-file")
        .addEventListener("click", () => this.deleteFile(fileType));
    }
  }

  updateApplicationFormsDisplay(file, displayElement) {
    const fileElement = document.createElement("div");
    fileElement.className = "mb-2 last:mb-0";
    fileElement.innerHTML = `
            <div class="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-green-600 dark:text-green-400">description</span>
                    <div>
                        <span class="text-sm font-medium text-slate-900 dark:text-slate-100">${
                          file.name
                        }</span>
                        <p class="text-xs text-slate-500 dark:text-slate-400">${this.formatFileSize(
                          file.size
                        )}</p>
                    </div>
                </div>
                <button class="text-red-600 hover:text-red-800 delete-form" data-filename="${
                  file.name
                }">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;

    displayElement.appendChild(fileElement);

    // Add delete event listener
    fileElement.querySelector(".delete-form").addEventListener("click", (e) => {
      const filename = e.target.closest("button").dataset.filename;
      this.deleteApplicationForm(filename);
    });
  }

  async simulateVerification() {
    const statusElement = document.getElementById("id-card-status");
    if (statusElement) {
      // Show verifying state
      statusElement.innerHTML = `
                <span class="material-symbols-outlined text-base mr-1">schedule</span>
                Verifying...
            `;
      statusElement.className =
        "inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-300";

      // Simulate verification process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Show verified state
      statusElement.innerHTML = `
                <span class="material-symbols-outlined text-base mr-1">check_circle</span>
                Verified
            `;
      statusElement.className =
        "inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300";

      this.showNotification("ID Card verified successfully!");
    }
  }

  async checkProfileCompletion() {
    try {
      // Get current student data
      await auth.authStateReady();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        return {
          status: "incomplete",
          missingFields: ["authentication"],
          message: "User not authenticated",
        };
      }

      // Get student data from Firestore
      const student = await studentCloudDB.getStudentById(currentUser.uid);

      if (!student) {
        return {
          status: "incomplete",
          missingFields: ["profile"],
          message: "Student profile not found",
        };
      }

      // Define required fields for profile completion
      const requiredFields = [
        { key: "fullName", label: "Full Name", value: student.fullName },
        { key: "email", label: "Email Address", value: student.email },
        {
          key: "phoneNumber",
          label: "Phone Number",
          value: student.phoneNumber,
        },
        {
          key: "matricNumber",
          label: "Matric Number",
          value: student.matricNumber,
        },
        {
          key: "institution",
          label: "Institution",
          value: student.institution,
        },
        { key: "school", label: "School/Faculty", value: student.school },
        { key: "department", label: "Department", value: student.department },
        {
          key: "courseOfStudy",
          label: "Course of Study",
          value: student.courseOfStudy,
        },
        { key: "level", label: "Level", value: student.level },
        { key: "major", label: "Major", value: student.major },
      ];

      // Check for missing fields
      const missingFields = requiredFields.filter((field) => {
        const value = field.value;
        return (
          !value ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0) ||
          value === "Not Set" ||
          value === "Not specified"
        );
      });

      // Combine all missing fields and documents
      const allMissingFields = [...missingFields.map((field) => field.key)];

      const allMissingFieldDetails = [
        ...missingFields.map((field) => ({
          field: field.key,
          label: field.label,
          type: "profile",
        })),
      ];

      // Determine completion status
      if (allMissingFields.length === 0) {
        return {
          status: "completed",
          missingFields: [],
          missingFieldDetails: [],
          message: "Profile is complete",
          student: student,
        };
      } else {
        return {
          status: "incomplete",
          missingFields: allMissingFields,
          missingFieldDetails: allMissingFieldDetails,
          message: `Profile incomplete. Missing ${allMissingFields.length} field(s)`,
          student: student,
        };
      }
    } catch (error) {
      console.error("Error checking profile completion:", error);
      return {
        status: "error",
        missingFields: ["unknown"],
        message: "Error checking profile completion",
      };
    }
  }
  async handleSubmit(event, it) {
    event.preventDefault();
    // Check profile completion
    // Simulate upload process
    const submitBtn = event.target;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = "Uploading...";
    submitBtn.disabled = true;
    const profileResult = await this.checkProfileCompletion();

    if (profileResult.status !== "completed") {
      // Show error message with missing fields
      const missingFieldsText = profileResult.missingFieldDetails
        .map((field) => field.label)
        .join(", ");

      // Create a user-friendly message
      let message = `Please complete your profile before applying. Missing: ${missingFieldsText}`;

      // Add specific guidance based on missing fields
      if (
        profileResult.missingFieldDetails.some(
          (field) => field.type === "document"
        )
      ) {
        message +=
          '\n\nPlease upload the required documents in the "Documents" tab.';
      }

      if (
        profileResult.missingFieldDetails.some(
          (field) => field.type === "profile"
        )
      ) {
        message +=
          '\n\nPlease complete your personal information in the "Personal Information" tab.';
      }

      // Show alert to user
      alert(message);

      window.location.href = '../../dashboard/student_profile.html';
      this.highlightMissingFields(profileResult.missingFieldDetails);
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      return false; 
    }

    // If profile is complete, proceed with the application
    return await this.submitApplication(event, it, originalText);
  }

  // Helper method to highlight missing fields in the UI
  highlightMissingFields(missingFieldDetails) {
    // Remove any existing highlights first
    this.removeFieldHighlights();

    missingFieldDetails.forEach((fieldInfo) => {
      const element = document.querySelector(
        `[data-field="${fieldInfo.field}"]`
      );
      if (element) {
        element.classList.add(
          "border-red-500",
          "bg-red-50",
          "dark:bg-red-900/20"
        );

        // Add error message if not exists
        let errorElement = element.nextElementSibling;
        if (!errorElement || !errorElement.classList.contains("field-error")) {
          errorElement = document.createElement("div");
          errorElement.className = "field-error text-red-500 text-sm mt-1";
          errorElement.textContent = `${fieldInfo.label} is required`;
          element.parentNode.insertBefore(errorElement, element.nextSibling);
        }
      }
    });

    // Scroll to first missing field
    const firstMissingField = document.querySelector(
      "[data-field].border-red-500"
    );
    if (firstMissingField) {
      firstMissingField.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Helper method to remove field highlights
  removeFieldHighlights() {
    const highlightedFields = document.querySelectorAll(
      "[data-field].border-red-500"
    );
    highlightedFields.forEach((field) => {
      field.classList.remove(
        "border-red-500",
        "bg-red-50",
        "dark:bg-red-900/20"
      );
    });

    // Remove error messages
    const errorMessages = document.querySelectorAll(".field-error");
    errorMessages.forEach((error) => error.remove());
  }

  async submitApplication(event, it, originalText) {
    const submitBtn = event.target;

    if (!validateDurationSection()) {
      alert("Please complete the IT duration section correctly");
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      return false;
    }
        
    let appStatus;
    appStatus = it.rawInternship.status;

    
    const currentApplicationsCount = Math.max(
      it.rawInternship.applicationsCount || 0,
      this.applicationsCount || 0
    );

    this.applicationsCount = currentApplicationsCount;

    // Check if the new applications count equals or exceeds the intake capacity
    if (it.rawInternship.intakeCapacity && currentApplicationsCount >= it.rawInternship.intakeCapacity) {
      appStatus = "closed";
      internship.status = "closed";
     
    } else {
     
    }

     
    const isITClosed = appStatus == "closed";
    if (isITClosed) {
      alert(title + " from " + company + " is closed");
      await it_base_company_cloud.updateInternshipStatus(compid, id);
      return;
    }

    try {
      // Get the current state of radio buttons and existing files
      const useExistingIdCard =
        document.getElementById("id-card-existing").checked;
      const useExistingTrainingLetter = document.getElementById(
        "training-letter-existing"
      ).checked;

      // Get existing files data to check availability
      const existingFiles = await studentCloudDB.getStudentExistingFile(
        auth.currentUser.uid
      );
      const hasExistingIdCard =
        existingFiles.studentIdCard && existingFiles.studentIdCard !== "";
      const hasExistingTrainingLetter =
        existingFiles.itLetter && existingFiles.itLetter !== "";

      // Validate files based on selections
      let hasForm = isFormExist(it);

      // Check if user selected existing files but they don't exist
      if (useExistingIdCard && !hasExistingIdCard) {
        this.showNotification(
          "No existing ID card found. Please upload a new one.",
          "error"
        );
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return false;
      }

      if (useExistingTrainingLetter && !hasExistingTrainingLetter) {
        this.showNotification(
          "No existing training letter found. Please upload a new one.",
          "error"
        );
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return false;
      }

      // Determine missing files
      const missingIdCard = useExistingIdCard
        ? false
        : !this.uploadedFiles.idCard;
      const missingTrainingLetter = useExistingTrainingLetter
        ? false
        : !this.uploadedFiles.trainingLetter;
      const missingApplicationForms =
        hasForm && this.uploadedFiles.applicationForms.length === 0;

      // Show appropriate error messages
      if (missingIdCard || missingTrainingLetter || missingApplicationForms) {
        let errorMessage = "Please ";

        if (missingIdCard) {
          if (hasExistingIdCard) {
            errorMessage +=
              "select 'Use existing ID card' or upload a new one, ";
          } else {
            errorMessage += "upload an ID card, ";
          }
        }

        if (missingTrainingLetter) {
          if (hasExistingTrainingLetter) {
            errorMessage +=
              "select 'Use existing training letter' or upload a new one, ";
          } else {
            errorMessage += "upload a training letter, ";
          }
        }

        if (missingApplicationForms) {
          errorMessage += "fill and upload the application forms, ";
        }

        errorMessage = errorMessage.slice(0, -2); // Remove trailing comma and space
        this.showNotification(errorMessage, "error");
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return false;
      }

      let application;

      // Determine if we need to upload any files
      const hasNewFilesToUpload =
        (!useExistingIdCard && this.uploadedFiles.idCard) ||
        (!useExistingTrainingLetter && this.uploadedFiles.trainingLetter) ||
        (hasForm && this.uploadedFiles.applicationForms.length > 0);

      if (hasNewFilesToUpload) {
       
        const uploadResult = await this.uploadDocuments(
          useExistingIdCard,
          useExistingTrainingLetter
        );

        // Check if upload had errors
        if (uploadResult.error) {
          this.showNotification(
            "File upload failed. Please check your internet connection and try again.",
            "error"
          );
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          return false;
        }

        // Check if any files failed to upload
        const failedUploads =
          uploadResult.uploadResults?.filter((result) => !result.url) || [];
        if (failedUploads.length > 0) {
          this.showNotification(
            `Failed to upload ${failedUploads.length} file(s). Please try again.`,
            "error"
          );
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          return false;
        }

        application = uploadResult.app;
      } else {
        // Create application directly using existing files
        application = StudentApplication.createNewApplication(
          this.studentData,
          this.currentInternship
        );

        // Set the existing file URLs directly
        if (useExistingIdCard && hasExistingIdCard) {
          application.setIdCard(existingFiles.studentIdCard);
        }
        if (useExistingTrainingLetter && hasExistingTrainingLetter) {
          application.setTrainingLetter(existingFiles.itLetter);
        }
      }

      await auth.authStateReady();

      if (!this.currentInternship) {
        this.showNotification(
          "No internship found during submission.",
          "error"
        );
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        return false;
      }
      
      if(!application.student.uid || application.student.uid === '')
        {
          application.student.uid = await auth.currentUser.uid;
        }

     
      // Submit application to Firestore
      const durationData = getDurationData();
      application.setDuration(durationData.duration);
      //console.log("Duration set to " + JSON.stringify(durationData.duration));
      const appid = await it_base_companycloud.submitITApplication(
        this.currentInternship.company.id,
        this.currentInternship.id,
        application.toMap()
      );

      // Only send email if everything succeeded so far
      await emailIndustrialTraining(
        this.studentData,
        this.currentInternship,
        generateShareableUrl(
          "/company/student_profile.html",
          this.currentInternship.id,
          appid
        )
      );

      this.showNotification("Application submitted successfully!", "success");
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      window.location.replace('../../dashboard/opportunities.html');
      return true;
    } catch (error) {
      this.showNotification(
        "Error submitting application. Please try again.",
        "error"
      );
      console.error("Submission error:", error);
      const submitBtn = event.target;
      submitBtn.innerHTML = "Submit Application";
      submitBtn.disabled = false;
      return false;
    }
  }

  async uploadDocuments() {
    await auth.authStateReady();

    try {
      ////console.log("🔄 Starting document upload process...");
      ////console.log("uplaoded file " + JSON.stringify(this.uploadedFiles));
      ////console.log("studentData  " + JSON.stringify(this.studentData));
      const uploadResults = await cloudStorage.uploadFilesToStorage(
        this.uploadedFiles,
        this.studentData
      );

      ////console.log("uplaodedResults  " + JSON.stringify(uploadResults));
      // Check for upload failures
      const failedUploads = uploadResults.filter(
        (result) => !result.url || result.error
      );

      if (failedUploads.length > 0) {
        console.error(" File upload failures detected:", failedUploads);

        // Show specific error messages
        failedUploads.forEach((failed) => {
          console.error(
            `Failed: ${failed.field} - ${failed.file?.name}`,
            failed.error
          );
        });

        return {
          app: null,
          error: true,
          uploadResults: uploadResults,
          failedUploads: failedUploads,
          errorMessage: `${failedUploads.length} file(s) failed to upload`,
        };
      }

      ////console.log("All files uploaded successfully, processing application...");

      const application = cloudStorage.processUploadResults(
        StudentApplication.createNewApplication(
          this.studentData,
          this.currentInternship
        ),
        uploadResults
      );

      return {
        app: application,
        error: false,
        uploadResults: uploadResults,
        failedUploads: [],
      };
    } catch (error) {
      console.error(" Upload documents error:", error);
      return {
        app: null,
        error: true,
        uploadResults: [],
        failedUploads: [],
        errorMessage: error.message,
      };
    }
  }
  handleCancel() {
    if (
      confirm(
        "Are you sure you want to cancel? All uploaded files will be lost."
      )
    ) {
      this.uploadedFiles = {
        idCard: null,
        trainingLetter: null,
        applicationForms: [],
      };

      // Clear all file displays and show upload areas again
      this.resetUploadAreas();
      this.showNotification("Upload cancelled.");
    }
  }

  resetUploadAreas() {
    // Remove all file displays
    document.querySelectorAll('[id$="-display"]').forEach((el) => el.remove());

    // Show upload areas
    const uploadAreas = [
      "id-card-upload-area",
      "training-letter-upload-area",
      "app-forms-upload-area",
    ];

    uploadAreas.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = "flex";
      }
    });

    // Reset ID card status
    const statusElement = document.getElementById("id-card-status");
    if (statusElement) {
      statusElement.innerHTML = `
                <span class="material-symbols-outlined text-base mr-1">check_circle</span>
                Verified
            `;
      statusElement.className =
        "inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300";
    }
  }

  deleteFile(fileType) {
    this.uploadedFiles[fileType] = null;
    const displayElement = document.getElementById(`${fileType}-display`);
    if (displayElement) {
      displayElement.remove();
    }

    // Map fileType to correct upload area ID
    let uploadAreaId;
    switch (fileType) {
      case "idCard":
        uploadAreaId = "id-card-upload-area";
        break;
      case "trainingLetter":
        uploadAreaId = "training-letter-upload-area";
        break;
      case "applicationForms":
        uploadAreaId = "app-forms-upload-area";
        break;
    }

    // Show upload area again
    const uploadArea = document.getElementById(uploadAreaId);
    if (uploadArea) {
      uploadArea.style.display = "flex";
    }

    this.showNotification("File removed.");
  }
  deleteApplicationForm(filename) {
    this.uploadedFiles.applicationForms =
      this.uploadedFiles.applicationForms.filter(
        (file) => file.name !== filename
      );
    const displayElement = document.getElementById("applicationForms-display");

    if (this.uploadedFiles.applicationForms.length === 0) {
      if (displayElement) {
        displayElement.remove();
      }
      const uploadArea = document.getElementById("app-forms-upload-area");
      if (uploadArea) {
        uploadArea.style.display = "flex";
      }
    } else {
      // Remove specific file element
      const fileElement = document
        .querySelector(`button[data-filename="${filename}"]`)
        ?.closest(".mb-2");
      if (fileElement) {
        fileElement.remove();
      }
    }

    this.showNotification("Form removed.");
  }

  showNotification(message, type = "success") {
    // Remove existing notification
    const existingNotification = document.querySelector(".upload-notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.className = `upload-notification fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg border transform transition-transform duration-300 ${
      type === "error"
        ? "bg-red-50 border-red-200 text-red-800"
        : "bg-green-50 border-green-200 text-green-800"
    }`;
    notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined">${
                  type === "error" ? "error" : "check_circle"
                }</span>
                <span class="text-sm font-medium">${message}</span>
            </div>
        `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.transform = "translateX(100%)";
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  showNoInternshipsMessage() {
    const main = document.querySelector("main .mx-auto");
    main.innerHTML = `
            <div class="text-center py-12">
                <span class="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-600 mb-4">work_outline</span>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">No Internships Found</h2>
                <p class="text-slate-600 dark:text-slate-400 mb-8">
                    You don't have any approved internships that require document upload at the moment.
                </p>
                <a href="internships.html" class="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/80 transition-colors">
                    Browse Internships
                </a>
            </div>
        `;
  }

  showErrorMessage() {
    const main = document.querySelector("main .mx-auto");
    main.innerHTML = `
            <div class="text-center py-12">
                <span class="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">Error Loading Data</h2>
                <p class="text-slate-600 dark:text-slate-400 mb-8">
                    There was an error loading your internship information. Please try again later.
                </p>
                <button onclick="location.reload()" class="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/80 transition-colors">
                    Retry
                </button>
            </div>
        `;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

function showEmailNotification(message, type = "success") {
  // Remove existing notification
  const existingNotification = document.querySelector(".upload-notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create a new notification element
  const notification = document.createElement("div");
  notification.className = `email-notification ${type}`;
  notification.innerText = message;

  // Append the notification to the body
  document.body.appendChild(notification);

  // Remove the notification after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

async function emailIndustrialTraining(student, internship, appurl) {
  try {
    ////console.log(
    //   " Preparing to send industrial training application to company..."
    // );

    // First, upload files to Firebase Storage and get their URLs
    // const fileUrls = await uploadFilesToStorage(uploadedFiles, student);

    if (!internship) {
      throw new Error("Internship data is null");
    }

    ////console.log("company data:", internship.company);
    const companyEmail = internship.company?.email;

    if (!companyEmail) {
      throw new Error("Company email not found");
    }

    ////console.log(` Sending email to company: ${companyEmail}`);
    // Prepare email parameters - MUST MATCH YOUR TEMPLATE VARIABLES EXACTLY
    const params = {
      to_email: companyEmail,
      company_name: internship.company?.name,
      name: student.fullName,
      email: student.email,
      internship_title: internship.name,
      time: new Date().toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      message: `Dear ${internship.company?.name},

A new Industrial Training application has been submitted by ${
        student.fullName
      } for the ${internship.name} position.

Student Details:
- Name: ${student.fullName}
- Email: ${student.email}
- Industrial Training: ${internship.name}
- Submission Time: ${new Date().toLocaleString()}

The student has uploaded all required documents including:
- Student ID Card
- Industrial Training Letter  
- Application Forms

All documents are available for your review  .
Kindly visit the below page for the review
${appurl}
You can access the documents via the links provided above. 
Please review the application at your earliest convenience.

If you have any questions or require further information, please do not hesitate to contact the student directly at ${
        student.email
      } or ${student.phone}.
Best regards,
IT Connect Application System`,
    };

    ////console.log("Email parameters:", params);

    // Send email to COMPANY using EmailJS
    const response = await emailjs.send(
      "service_y73pq6i",
      "template_eam0d59",
      params
    );

    ////console.log(
    //   "Email sent to company successfully:",
    //   response.status,
    //   response.text
    // );

    showEmailNotification(
      `Application submitted to ${internship.company?.name} successfully!`,
      "success"
    );
  } catch (error) {
    console.error(" Failed to send email to company:", error);
    showEmailNotification(
      `Error submitting application: ${error.message}`,
      "error"
    );
  }
}

document.addEventListener("DOMContentLoaded", function () {
  ////console.log("DOM loaded, initializing ITFormSubmission...");
  new ITFormSubmission();
});

//******************************* Duration section ******************************* */

export function initializeDurationSection() {
  // Initialize global state
  window.durationState = {
    selectedMonths: 0,
    startDate: null,
    endDate: null,
    isValid: false,
  };

  // Set default start date (1 week from today)
  setDefaultStartDate();

  // Setup all event listeners
  setupDurationEventListeners();

  //console.log("Duration section initialized");
}

function setDefaultStartDate() {
  const today = new Date();
  const defaultStartDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const startDateInput = document.getElementById("start-date-input");
  startDateInput.valueAsDate = defaultStartDate;

  window.durationState.startDate = defaultStartDate;
}

function setupDurationEventListeners() {
  // Duration buttons
  document
    .getElementById("1-month-durationbtn")
    .addEventListener("click", () => handleDurationButtonClick(1));
  document
    .getElementById("3-months-durationbtn")
    .addEventListener("click", () => handleDurationButtonClick(3));
  document
    .getElementById("6-months-durationbtn")
    .addEventListener("click", () => handleDurationButtonClick(6));
  document
    .getElementById("12-months-durationbtn")
    .addEventListener("click", () => handleDurationButtonClick(12));

  // Custom duration input
  document
    .getElementById("custom-duration-input")
    .addEventListener("input", handleCustomDurationInput);

  // Date inputs
  document
    .getElementById("start-date-input")
    .addEventListener("change", handleStartDateChange);
  document
    .getElementById("end-date-input")
    .addEventListener("change", handleEndDateChange);
}

function handleDurationButtonClick(months) {
  // Update state
  window.durationState.selectedMonths = months;

  // Clear custom input
  document.getElementById("custom-duration-input").value = "";

  // Update UI
  highlightSelectedDurationButton(months);
  calculateAndSetEndDate();
  updateDurationSummary();
  validateDurationSection();

  // Hide duration error if fixed
  hideError("duration-error");
}

function highlightSelectedDurationButton(selectedMonths) {
  // Remove highlight from all buttons
  const allButtons = [
    "1-month-durationbtn",
    "3-months-durationbtn",
    "6-months-durationbtn",
    "12-months-durationbtn",
  ];

  allButtons.forEach((buttonId) => {
    const button = document.getElementById(buttonId);
    button.classList.remove("border-primary", "bg-primary/10");
    button.classList.add("border-slate-300", "dark:border-slate-600");
  });

  // Highlight selected button
  const selectedButtonId = `${selectedMonths}-months-durationbtn`;
  const selectedButton = document.getElementById(selectedButtonId);
  if (selectedButton) {
    selectedButton.classList.add("border-primary", "bg-primary/10");
    selectedButton.classList.remove(
      "border-slate-300",
      "dark:border-slate-600"
    );
  }
}

function handleCustomDurationInput(event) {
  const months = parseInt(event.target.value);

  if (months && months > 0 && months <= 24) {
    window.durationState.selectedMonths = months;

    // Remove highlight from predefined buttons
    clearDurationButtonHighlights();

    calculateAndSetEndDate();
    updateDurationSummary();
    validateDurationSection();
    hideError("duration-error");
  } else {
    window.durationState.selectedMonths = 0;
    validateDurationSection();
  }
}

function clearDurationButtonHighlights() {
  const allButtons = [
    "1-month-durationbtn",
    "3-months-durationbtn",
    "6-months-durationbtn",
    "12-months-durationbtn",
  ];

  allButtons.forEach((buttonId) => {
    const button = document.getElementById(buttonId);
    button.classList.remove("border-primary", "bg-primary/10");
    button.classList.add("border-slate-300", "dark:border-slate-600");
  });
}

function calculateAndSetEndDate() {
  if (!window.durationState.startDate || !window.durationState.selectedMonths)
    return;

  const endDate = new Date(window.durationState.startDate);
  endDate.setMonth(endDate.getMonth() + window.durationState.selectedMonths);

  window.durationState.endDate = endDate;

  // Update end date input
  const endDateInput = document.getElementById("end-date-input");
  endDateInput.valueAsDate = endDate;
}

function handleStartDateChange(event) {
  const dateString = event.target.value;
  window.durationState.startDate = dateString ? new Date(dateString) : null;

  if (
    window.durationState.selectedMonths > 0 &&
    window.durationState.startDate
  ) {
    calculateAndSetEndDate();
    updateDurationSummary();
  }

  validateDurationSection();
}

function handleEndDateChange(event) {
  const dateString = event.target.value;
  window.durationState.endDate = dateString ? new Date(dateString) : null;

  if (window.durationState.startDate && window.durationState.endDate) {
    calculateDurationFromDates();
    updateDurationSummary();
  }

  validateDurationSection();
}

function calculateDurationFromDates() {
  if (!window.durationState.startDate || !window.durationState.endDate) return;

  const diffTime = Math.abs(
    window.durationState.endDate - window.durationState.startDate
  );
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));

  window.durationState.selectedMonths = diffMonths;

  // Update custom input
  document.getElementById("custom-duration-input").value = diffMonths;

  // Update button highlights if it matches predefined option
  clearDurationButtonHighlights();
  const matchingButtonId = `${diffMonths}-months-durationbtn`;
  const matchingButton = document.getElementById(matchingButtonId);
  if (matchingButton) {
    matchingButton.classList.add("border-primary", "bg-primary/10");
    matchingButton.classList.remove(
      "border-slate-300",
      "dark:border-slate-600"
    );
  }
}

export function validateDurationSection() {
  const durationValid = validateDurationSelection();
  const datesValid = validateDateSelection();
  const dateLogicValid = validateDateLogic();

  window.durationState.isValid = durationValid && datesValid && dateLogicValid;
  return window.durationState.isValid;
}

function validateDurationSelection() {
  const hasDuration = window.durationState.selectedMonths > 0;

  if (!hasDuration) {
    showError("duration-error");
    return false;
  } else {
    hideError("duration-error");
    return true;
  }
}

function validateDateSelection() {
  const hasStartDate = !!window.durationState.startDate;
  const hasEndDate = !!window.durationState.endDate;

  // Start date validation
  if (!hasStartDate) {
    showError("start-date-error");
  } else {
    hideError("start-date-error");
  }

  // End date validation
  if (!hasEndDate) {
    showError("end-date-error");
  } else {
    hideError("end-date-error");
  }

  return hasStartDate && hasEndDate;
}

function validateDateLogic() {
  if (!window.durationState.startDate || !window.durationState.endDate) {
    hideError("date-logic-error");
    return true; // Skip validation if dates not set
  }

  const isEndDateAfterStartDate =
    window.durationState.endDate > window.durationState.startDate;

  if (!isEndDateAfterStartDate) {
    showError("date-logic-error");
    return false;
  } else {
    hideError("date-logic-error");
    return true;
  }
}

function showError(errorElementId) {
  const errorElement = document.getElementById(errorElementId);
  if (errorElement) {
    errorElement.classList.remove("hidden");
  }
}

function hideError(errorElementId) {
  const errorElement = document.getElementById(errorElementId);
  if (errorElement) {
    errorElement.classList.add("hidden");
  }
}

function updateDurationSummary() {
  const summaryElement = document.getElementById("duration-summary");
  const durationDisplay = document.getElementById("duration-display");
  const dateRangeDisplay = document.getElementById("date-range-display");

  if (
    window.durationState.selectedMonths > 0 &&
    window.durationState.startDate &&
    window.durationState.endDate
  ) {
    const durationText = getDurationText(window.durationState.selectedMonths);
    const startFormatted = formatDate(window.durationState.startDate);
    const endFormatted = formatDate(window.durationState.endDate);

    durationDisplay.textContent = durationText;
    dateRangeDisplay.textContent = `${startFormatted} - ${endFormatted}`;
    summaryElement.classList.remove("hidden");
  } else {
    summaryElement.classList.add("hidden");
  }
}

function getDurationText(months) {
  const durationMap = {
    1: "1 Month",
    3: "3 Months",
    6: "6 Months",
    12: "1 Year",
  };

  return durationMap[months] || `${months} Months`;
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getDurationData() {
  if (!validateDurationSection()) {
    throw new Error("Duration information is incomplete or invalid");
  }

  return {
    duration: {
      months: window.durationState.selectedMonths,
      displayText: getDurationText(window.durationState.selectedMonths),
      startDate: window.durationState.startDate.toISOString().split("T")[0],
      endDate: window.durationState.endDate.toISOString().split("T")[0],
      totalDays: calculateTotalDays(),
      totalWeeks: Math.ceil(window.durationState.selectedMonths * 4.345), // Average weeks per month
    },
    metadata: {
      collectedAt: new Date().toISOString(),
      isValid: window.durationState.isValid,
    },
  };
}

function calculateTotalDays() {
  if (!window.durationState.startDate || !window.durationState.endDate)
    return 0;
  const diffTime = Math.abs(
    window.durationState.endDate - window.durationState.startDate
  );
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function resetDurationSection() {
  window.durationState = {
    selectedMonths: 0,
    startDate: null,
    endDate: null,
    isValid: false,
  };

  clearDurationButtonHighlights();
  document.getElementById("custom-duration-input").value = "";
  document.getElementById("duration-summary").classList.add("hidden");

  // Clear errors
  hideError("duration-error");
  hideError("start-date-error");
  hideError("end-date-error");
  hideError("date-logic-error");

  setDefaultStartDate();
}
