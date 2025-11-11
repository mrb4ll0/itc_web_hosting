// application_details.js
import { ITBaseCompanyCloud } from "../../js/fireabase/ITBaseCompanyCloud.js";
import { auth } from "../../js/config/firebaseInit.js";
import { viewExistingFile } from "../../js/general/generalmethods.js";

class StudentApplication {
  constructor() {
    this.itBaseCompanyCloud = new ITBaseCompanyCloud();
    this.applicationId = this.getApplicationIdFromURL();
    this.companyId = null;
    this.itId = null;
    this.currentApplication = null;

    this.init();
  }

  /**
   * Get application ID from URL parameters
   */
  getApplicationIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
  }

  /**
   * Get IT ID from URL parameters
   */
  getITIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("itid");
  }

  /**
   * Get company ID from authenticated user
   */
  async getCompanyId() {
    await auth.authStateReady();
    return auth.currentUser?.uid;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Wait for authentication
      await auth.authStateReady();
      this.companyId = await this.getCompanyId();
      this.itId = this.getITIdFromURL();

      if (!auth.currentUser) {
        alert("Please log in to view application details");
        if (this.itId && this.applicationId) {
          localStorage.setItem("itId", this.itId);
          localStorage.setItem("appId", this.applicationId);
          localStorage.setItem("stprofile", true);
        }

        window.location.href = "../company/auth/company_login.html";
        return;
      }

      this.companyId = await this.getCompanyId();
      this.itId = this.getITIdFromURL();
      // //console.log(
      //   "this.applicationId " +
      //     this.applicationId +
      //     " this.companyId " +
      //     this.companyId +
      //     " this.itId " +
      //     this.itId
      // );
      if (!this.applicationId || !this.companyId || !this.itId) {
        this.showError("Invalid URL parameters");
        return;
      }

      await this.loadApplicationData();
      this.setupEventListeners();
    } catch (error) {
      console.error("Error initializing application details:", error);
      this.showError("Failed to load application details");
    }
  }

  /**
   * Load application data from Firestore
   */
  async loadApplicationData() {
    try {
      this.showLoading(true);
      await auth.authStateReady();
      const company = await this.itBaseCompanyCloud.getCompany(
        auth.currentUser.uid
      );
      if (!company) {
        this.showError("Account not found you'll be taken to the login page");
        if (this.itId && this.applicationId) {
          localStorage.setItem("itId", this.itId);
          localStorage.setItem("appId", this.applicationId);
          localStorage.setItem("stprofile", true);
        }
        setTimeout(() => {
          window.location.href = "../company/auth/company_login.html";
        }, 1500);
        return;
      }

      this.currentApplication =
        await this.itBaseCompanyCloud.getApplicationById(
          this.companyId,
          this.itId,
          this.applicationId
        );

      if (!this.currentApplication && this.itId && this.applicationId) {
        this.showError("Application not found");
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = "../company/company_dashboard.html";
        }, 1000);
        return;
      }

      this.populateApplicationData();
      this.showLoading(false);
    } catch (error) {
      console.error("Error loading application data:", error);
      this.showError("Failed to load application data");
      this.showLoading(false);
    }
  }

  /**
   * Populate the HTML with application data
   */
  populateApplicationData() {
    const app = this.currentApplication;
    //console.log("app is "+JSON.stringify(app));

    // Set page title
    document.getElementById(
      "applicant-name-title"
    ).textContent = `${app.student.fullName}'s Application`;

    // Set submission date
    const submissionDate =
      app.applicationDate instanceof Date
        ? app.applicationDate
        : new Date(app.applicationDate);
    document.getElementById(
      "submission-date"
    ).textContent = `Submitted on ${submissionDate.toLocaleDateString()}`;

    // Update status badges
    this.updateStatusBadges(app.applicationStatus);

    // Populate applicant information
    const student = app.student;

    // Avatar (only set if URL exists)
    if (student.imageUrl) {
      document.getElementById(
        "applicant-avatar"
      ).style.backgroundImage = `url('${student.imageUrl}')`;
    } else {
      document.getElementById("applicant-avatar").style.backgroundImage =
        "none";
    }

    // Full Name (fallback if missing)
    document.getElementById("applicant-full-name").textContent =
      student.fullName?.trim() || "Not Specified";

    // Education (show only available parts)
    const institution = student.institution?.trim();
    const course = student.courseOfStudy?.trim();

    if (institution && course) {
      document.getElementById(
        "applicant-education"
      ).textContent = `${institution}, ${course}`;
    } else if (institution) {
      document.getElementById("applicant-education").textContent = institution;
    } else if (course) {
      document.getElementById("applicant-education").textContent = course;
    } else {
      document.getElementById("applicant-education").textContent =
        "Institution: Not Specified";
    }

    // Graduation (only show if available)
    document.getElementById("applicant-graduation").textContent =
      student.level?.trim()
        ? `Level: ${student.level}`
        : "Expected Graduation: Not Specified";

    // //console.log(
    //   "applicant Education " +
    //     app.student.institution +
    //     " " +
    //     app.student.courseOfStudy
    // );
    // //console.log("applicant level " + app.student.level);
    // //console.log("applicant Education " + app.student.institution);
    // //console.log("applicant Education " + app.student.institution);

    // Populate applicant details
     //console.log("student profile "+JSON.stringify(app.student));
    document.getElementById("full-name-value").textContent =
      app.student.fullName;
    document.getElementById("university-value").textContent =
      app.student.institution;
    document.getElementById("major-value").textContent =
      app.student.major;
    document.getElementById("gpa-value").textContent =
      app.student.matricNumber || "Not specified";

    // Populate contact information
    document.getElementById("email-value").textContent = app.student.email;
    document.getElementById("phone-value").textContent =
      app.student.phoneNumber;

    // Populate documents section
    this.populateDocuments(app);

    // Set industrial training info
    // //console.log("appIt " + JSON.stringify(app));
    document.getElementById("internship-title-field").textContent =
      app.internship.title;
    this.populateInternshipInfo(app);
  }

  populateInternshipInfo(app) {
    if (!app.internship) {
      console.warn("No internship data available");
      return;
    }

    // Set internship information
    this.setTextContent(
      "internship-title-value",
      app.position || "Not specified"
    );
    this.setTextContent(
      "internship-company-value",
      app.companyName || "Not specified"
    );
    this.setTextContent(
      "internship-department-value",
      app.internship.department || "Not specified"
    );
    this.setTextContent(
      "internship-location-value",
      app.internship.address || "Not specified"
    );

    // You can also update the page title to include the position
    const titleElement = document.getElementById("applicant-name-title");
    if (titleElement && app.position) {
      titleElement.textContent = `${app.studentName}'s Application - ${app.position}`;
    }
  }

  setTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text || "Not specified";
    } else {
      console.warn(`Element with ID '${elementId}' not found`);
    }
  }

  /**
   * Update status badges based on application status
   */
  updateStatusBadges(status) {
    // Hide all badges first
    document.getElementById("status-new").style.display = "none";
    document.getElementById("status-under-review").style.display = "none";
    document.getElementById("status-rejected").style.display = "none";
    document.getElementById("status-accepted").style.display = "none";

    // Show the appropriate badge
    switch (status.toLowerCase()) {
      case "pending":
      case "new":
        document.getElementById("status-new").style.display = "inline-flex";
        break;
      case "under review":
        document.getElementById("status-under-review").style.display =
          "inline-flex";
        break;
      case "rejected":
        document.getElementById("status-rejected").style.display =
          "inline-flex";
        break;
      case "accepted":
        document.getElementById("status-accepted").style.display =
          "inline-flex";
        break;
    }
  }

  /**
   * Populate documents section with file URLs
   */
  /**
   * Populate documents section with file URLs
   */
  populateDocuments(application) {
    const files = application.applicationFiles || {};
    //console.log("applicationFiles " + JSON.stringify(files));

    // ID Card
     var idCard = files.idCard ?? application.student.studentIDCard
     var itLetter = files.trainingLetter ?? application.student.studentITLetter;
    if (idCard) {
      this.setupDocumentButtons("id-card", idCard);
    } else {
      document.getElementById("id-card-document").style.display = "none";
    }

    // Training Letter (Application Letter)
    if (itLetter) {
      this.setupDocumentButtons("application-letter", itLetter);
    } else {
      document.getElementById("application-letter-document").style.display =
        "none";
    }

    // Resume (Academic Transcript)
    if (files.resume) {
      this.setupDocumentButtons("transcript", files.resume);
    } else {
      document.getElementById("transcript-document").style.display = "none";
    }

    // Application Forms - FIXED VERSION
    //console.log("files is " + JSON.stringify(files));

    if (
      files.applicationForms &&
      Array.isArray(files.applicationForms) &&
      files.applicationForms.length > 0
    ) {
      this.setupMultipleDocuments("application-forms", files.applicationForms);
    } else {
      // Hide the application forms section when no forms exist
      const applicationFormsSection = document.getElementById(
        "application-forms-document"
      );
      if (applicationFormsSection) {
        applicationFormsSection.style.display = "none";
      }
    }

    // Other Documents - FIXED VERSION
    if (
      files.otherDocuments &&
      Array.isArray(files.otherDocuments) &&
      files.otherDocuments.length > 0
    ) {
      this.setupMultipleDocuments("other-documents", files.otherDocuments);
    } else {
      // Hide the other documents section when no documents exist
      const otherDocumentsSection = document.getElementById(
        "other-documents-document"
      );
      if (otherDocumentsSection) {
        otherDocumentsSection.style.display = "none";
      }
    }
  }
  /**
   * Setup view/download buttons for a single document
   */
  setupDocumentButtons(documentType, fileUrl) {
    const viewBtn = document.getElementById(`view-${documentType}`);
    const downloadBtn = document.getElementById(`download-${documentType}`);

    if (viewBtn) {
      viewBtn.onclick = () => this.viewDocument(fileUrl);
    }
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadDocument(fileUrl);
    }
  }

  /**
   * Setup buttons for multiple documents
   */
  setupMultipleDocuments(documentType, fileUrls) {
    //console.log("mutiple files " + fileUrls);
    if (fileUrls.length > 0) {
      //console.log("multiple files is greater than 0");
      this.setupDocumentButtons(documentType, fileUrls[0]);
    }
  }

  /**
   * View document in new tab
   */
  viewDocument(fileUrl) {
    viewExistingFile(fileUrl);
  }

  /**
   * Download document
   */
  downloadDocument(fileUrl) {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileUrl.split("/").pop() || "document";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Setup event listeners for action buttons
   */
  setupEventListeners() {
    // Accept Application
    document
      .getElementById("accept-application-button")
      .addEventListener("click", () => {
        this.updateApplicationStatus("accepted");
      });

    // Reject Application
    document
      .getElementById("reject-application-button")
      .addEventListener("click", () => {
        this.updateApplicationStatus("rejected");
      });

    // Schedule Interview
    document
      .getElementById("schedule-interview-button")
      .addEventListener("click", () => {
        this.messageDialog(false);
      });
  }

  /**
   * Notify student about their application status with a professional message
   * @param {string} status - The application status (accepted, rejected, pending, etc.)
   * @param {string} reason - Optional reason for the status decision
   */
  async notifyStudent(status = "", reason = "") {
    // Validate input parameters
    var studentUid = this.currentApplication.student.uid;
    if (!status || status.trim() === "") {
      console.warn("Status is required for student notification");
      return;
    }

    // Ensure we have the necessary data
    if (!this.currentApplication || !this.currentApplication.internship) {
      console.error("Current application data is missing");
      alert("Unable to send notification: Application data not found");
      return;
    }

    if (!studentUid) {
      console.error("Student UID is missing");
      alert("Unable to send notification: Student information not found");
      return;
    }

    try {
      // Get internship details for personalized message
      const internship = this.currentApplication.internship;
      const companyName = internship.company?.name || "Our Company";

      // Construct professional message based on status
      let message = this.buildStatusMessage(
        status,
        reason,
        internship.title,
        companyName
      );

      // Send notification to student
      const result = await this.itBaseCompanyCloud.sendNotificationToStudent(
        studentUid,
        {
          title: `${internship.title} - Application ${this.formatStatus(
            status
          )}`,
          message: message,
          type: "application_status",
        }
      );

      // Handle result
      if (result.success) {
        //console.log(`Status notification sent to student: ${status}`);
        alert(` ${this.getSuccessMessage(status)}`);

        // Close modal if exists in current context
        if (typeof closeModal === "function") {
          closeModal();
        }
      } else {
        console.error("Failed to send notification:", result.error);
        alert(` Failed to send notification: ${result.error}`);
      }
    } catch (error) {
      console.error("Error in notifyStudent method:", error);
      alert(
        "An error occurred while sending the notification. Please try again."
      );
    }
  }

  /**
   * Build a professional message based on application status
   * @param {string} status - Application status
   * @param {string} reason - Optional reason
   * @param {string} internshipTitle - Internship title
   * @param {string} companyName - Company name
   * @returns {string} Formatted message
   */
  buildStatusMessage(status, reason, internshipTitle, companyName) {
    const statusLower = status.toLowerCase();
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = "";

    switch (statusLower) {
      case "accepted":
        message = `Dear Student,

We are delighted to inform you that you have been accepted for the "${internshipTitle}" position at ${companyName}!

${reason ? `Additional notes: ${reason}\n\n` : ""}
This is a wonderful achievement and we are excited about the potential you bring to our team.

Our HR department will contact you within the next 3 business days to discuss:
• Onboarding process and start date
• Training schedule and orientation
• Required documentation
• Any other preliminary details

Congratulations on your selection! We look forward to welcoming you to the ${companyName} family and are excited to see the contributions you will make to our organization.

Welcome aboard!

Best regards,
${companyName} Hiring Team`;
        break;

      case "approved":
        message = `Dear Student,

We are pleased to inform you that your application for the "${internshipTitle}" position at ${companyName} has been approved.

${reason ? `Additional notes: ${reason}\n\n` : ""}
Our team will contact you shortly with further details regarding your onboarding process and start date.

We look forward to welcoming you to our team!

Best regards,
${companyName} Team`;
        break;

      case "rejected":
      case "declined":
        message = `Dear Student,

Thank you for your interest in the "${internshipTitle}" position at ${companyName} and for the time you invested in the application process.

After careful consideration, we have decided to move forward with other candidates at this time.

${
  reason
    ? `Feedback: ${reason}\n\n`
    : "We encourage you to apply for future opportunities that match your skills and experience.\n\n"
}
We appreciate your interest in ${companyName} and wish you the best in your job search.

Sincerely,
${companyName} Team`;
        break;

      case "pending":
      case "under_review":
        message = `Dear Student,

This is to confirm that we have received your application for the "${internshipTitle}" position at ${companyName}.

Your application is currently under review by our hiring team. We appreciate your patience during this process.

${
  reason
    ? `Note: ${reason}\n\n`
    : "We will notify you as soon as we have an update regarding your application.\n\n"
}
Thank you for your interest in joining ${companyName}.

Best regards,
${companyName} Team`;
        break;

      case "shortlisted":
        message = `Dear Student,

We are pleased to inform you that your application for the "${internshipTitle}" position at ${companyName} has been shortlisted.

Your qualifications and experience have impressed our hiring team, and we would like to learn more about you.

${
  reason
    ? `Next steps: ${reason}\n\n`
    : "Our team will contact you shortly to schedule the next stage of the selection process.\n\n"
}
Congratulations on this achievement!

Sincerely,
${companyName} Team`;
        break;

      case "interview":
        message = `Dear Student,

We are impressed with your application for the "${internshipTitle}" position at ${companyName} and would like to invite you for an interview.

${
  reason
    ? `Interview details: ${reason}\n\n`
    : "Please check your email for available time slots and further instructions.\n\n"
}
We look forward to learning more about your qualifications and discussing how you can contribute to our team.

Best regards,
${companyName} Team`;
        break;

      default:
        message = `Dear Student,

This is an update regarding your application for the "${internshipTitle}" position at ${companyName}.

Status: ${this.formatStatus(status)}
${reason ? `Details: ${reason}\n\n` : ""}
If you have any questions, please don't hesitate to contact us.

Sincerely,
${companyName} Team`;
    }

    return message;
  }

  /**
   * Format status for display
   * @param {string} status - Raw status
   * @returns {string} Formatted status
   */
  formatStatus(status) {
    const statusMap = {
      accepted: "Accepted 🎉",
      approved: "Approved",
      rejected: "Not Selected",
      declined: "Not Selected",
      pending: "Under Review",
      under_review: "Under Review",
      shortlisted: "Shortlisted",
      interview: "Interview Scheduled",
    };

    return (
      statusMap[status.toLowerCase()] ||
      status.charAt(0).toUpperCase() + status.slice(1)
    );
  }

  /**
   * Get success message based on status
   * @param {string} status - Application status
   * @returns {string} Success message
   */
  getSuccessMessage(status) {
    const messages = {
      accepted:
        "🎉 Acceptance notification sent to student successfully! Welcome to the team!",
      approved: "Approval notification sent to student successfully!",
      rejected: "Reject notification sent to student professionally",
      declined: "Decision notification sent to student",
      pending: "Status update sent to student",
      shortlisted: "Shortlist notification sent to student successfully!",
      interview: "Interview invitation sent to student!",
    };

    return (
      messages[status.toLowerCase()] ||
      "Notification sent to student successfully!"
    );
  }

 messageDialog(hideCancel = true) {
    const modalOverlay = document.createElement("div");
    modalOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; 
        align-items: center; z-index: 1000; font-family: sans-serif;
    `;

    const modal = document.createElement("div");
    modal.style.cssText = `
        background: white; padding: 24px; border-radius: 8px; 
        width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;
    `;

    // Conditionally render the buttons based on hideCancel parameter
    const buttonsHTML = hideCancel
        ? `<div style="display: flex; justify-content: flex-end;">
            <button id="send-message" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span id="send-text">Send Message</span>
                <span id="send-loading" style="display: none;">Sending...</span>
            </button>
        </div>`
        : `<div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancel-message" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">
                Cancel
            </button>
            <button id="send-message" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <span id="send-text">Send Message</span>
                <span id="send-loading" style="display: none;">Sending...</span>
            </button>
        </div>`;

    modal.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #333;">Send Message to Student</h2>
        
        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">Student Name</label>
            <input type="text" id="student-name" placeholder="Enter student name" 
                value="${this.currentApplication.student.fullName || ''}"
                style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
        </div>

        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">Message</label>
            <textarea id="message-text" rows="6" placeholder="Type your message to the student..."
                    style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-family: inherit;">
Hello ${this.currentApplication.student.fullName || 'Student'},

I'd like to schedule a time to discuss your industrial training progress.

Are you available sometime this week?

Best regards
            </textarea>
        </div>

        ${buttonsHTML}
    `;

    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    // Get references to elements
    const sendButton = modal.querySelector("#send-message");
    const sendText = modal.querySelector("#send-text");
    const sendLoading = modal.querySelector("#send-loading");
    const studentNameInput = modal.querySelector("#student-name");
    const messageTextarea = modal.querySelector("#message-text");

    // Event handlers
    const closeModal = () => document.body.removeChild(modalOverlay);

    // Function to set loading state
    const setLoadingState = (isLoading) => {
        if (isLoading) {
            sendButton.disabled = true;
            sendButton.style.opacity = "0.6";
            sendButton.style.cursor = "not-allowed";
            sendText.style.display = "none";
            sendLoading.style.display = "inline";
            
            // Also disable inputs during loading
            studentNameInput.disabled = true;
            messageTextarea.disabled = true;
        } else {
            sendButton.disabled = false;
            sendButton.style.opacity = "1";
            sendButton.style.cursor = "pointer";
            sendText.style.display = "inline";
            sendLoading.style.display = "none";
            
            // Re-enable inputs
            studentNameInput.disabled = false;
            messageTextarea.disabled = false;
        }
    };

    // Only add cancel event listener if cancel button exists
    if (!hideCancel) {
        modal.querySelector("#cancel-message").addEventListener("click", closeModal);
    }

    sendButton.addEventListener("click", async () => {
        const studentName = studentNameInput.value;
        const messageText = messageTextarea.value;

        if (!studentName || !messageText) {
            alert("Please enter student name and message");
            return;
        }

        // Set loading state
        setLoadingState(true);

        try {
            const studentUid = this.currentApplication.student.uid;
            const companyName = this.currentApplication.companyName;

            if (!studentUid || !companyName) {
                alert("Student information is missing");
                setLoadingState(false);
                return;
            }

            const result = await this.itBaseCompanyCloud.sendNotificationToStudent(
                studentUid,
                {
                    title: "New Message from " + companyName,
                    message: messageText.replace("{name}", studentName),
                    type: "message",
                }
            );

            if (result.success) {
                // Success - close modal after a brief delay to show success state
                setTimeout(() => {
                    alert(`Message sent to ${studentName}`);
                    closeModal();
                }, 500);
            } else {
                alert("Failed to send message: " + result.error);
                setLoadingState(false);
            }
        } catch (error) {
            alert("Error sending message: " + error.message);
            setLoadingState(false);
        }
    });

    // Only allow clicking outside to close if cancel button is visible
    if (!hideCancel) {
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }
}
  /**
   * Update application status
   */
  async updateApplicationStatus(newStatus) {
    try {
      if (!this.currentApplication) return;

      await this.itBaseCompanyCloud.updateApplicationStatus(
        this.companyId,
        this.itId,
        this.applicationId,
        newStatus
      );

      // Update local application object
      this.currentApplication.applicationStatus = newStatus;

      // Update UI
      this.updateStatusBadges(newStatus);

      // Show success message
      this.notifyStudent(newStatus);
      this.showNotification(`Application ${newStatus} successfully`, "success");
      this.messageDialog();
    } catch (error) {
      console.error("Error updating application status:", error);
      this.showNotification("Failed to update application status", "error");
    }
  }

  /**
   * Show loading state
   */
  showLoading(show) {
    const loadingElement =
      document.getElementById("loading-indicator") ||
      this.createLoadingIndicator();
    loadingElement.style.display = show ? "block" : "none";

    if (show) {
      document.getElementById("application-card").style.opacity = "0.5";
      document.getElementById("application-card").style.pointerEvents = "none";
    } else {
      document.getElementById("application-card").style.opacity = "1";
      document.getElementById("application-card").style.pointerEvents = "auto";
    }
  }

  /**
   * Create loading indicator if it doesn't exist
   */
  createLoadingIndicator() {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading-indicator";
    loadingDiv.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg">
                    <p class="text-gray-700">Loading application details...</p>
                </div>
            </div>
        `;
    document.body.appendChild(loadingDiv);
    return loadingDiv;
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, "error");

    // You might want to redirect after showing error
    setTimeout(() => {
      //window.location.href = '/company/applications.html';
    }, 3000);
  }

  /**
   * Show notification
   */
  showNotification(message, type = "info") {
    // Remove existing notification
    const existingNotification = document.getElementById("notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.id = "notification";
    notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white ${
      type === "error"
        ? "bg-red-500"
        : type === "success"
        ? "bg-green-500"
        : "bg-blue-500"
    } z-50`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new StudentApplication();
});
