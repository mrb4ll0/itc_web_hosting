import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
import { generateShareableUrl, messageDialog } from "../../../js/general/generalmethods.js";
var it_base_companycloud = new ITBaseCompanyCloud();

export default class overview {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.name = "OverviewTab";
  }

  async init() {
    console.log("Initializing Overview Tab");
    this.initializeElements();
    this.initializeEventListeners();
    this.initializeDragAndDrop();
    this.buildOverviewContent();

    // Setup filtering logic
    this.setupFilteringLogic();
  }

  refresh(tabManager) {
    // Update with latest data from TabManager
    this.tabManager = tabManager;
    this.buildOverviewContent();
  }

  initializeElements() {
    // Overview-specific elements
    this.pipelineContainer = document.getElementById("pipeline-container");
    this.pipelineGrid = document.getElementById("pipeline-grid");
    this.pendingApplicationsList = document.getElementById(
      "pending-applications-list"
    );
    this.acceptedList = document.getElementById("accepted-list");
    this.rejectedList = document.getElementById("rejected-list");
    this.currentTraineesSection = document.getElementById(
      "current-trainees-section"
    );
    this.traineesGrid = document.getElementById("trainees-grid");
    console.log(
      "Overview elements initialized traineesGrid:",
      this.traineesGrid
    );
  }

  buildOverviewContent() {
    // Get data from TabManager
    const data = this.tabManager.getDashboardData();
     this.populateFilterOptions(this.tabManager.getAllCompanyApplications());

    this.buildPendingApplicationsSection();
    this.buildAcceptedApplicationsSection();
    this.buildRejectedApplicationsSection();
    this.buildCurrentTraineesSection();
  }

  buildPendingApplicationsSection() {
    if (!this.pendingApplicationsList) return;

    const pendingApplications =
      this.tabManager.getApplicationsByStatus("pending");
    this.buildApplicationCards(
      this.pendingApplicationsList,
      pendingApplications,
      "pending"
    );
  }

  buildAcceptedApplicationsSection() {
    if (!this.acceptedList) return;

    const acceptedApplications =
      this.tabManager.getApplicationsByStatus("accepted");
    this.buildApplicationCards(
      this.acceptedList,
      acceptedApplications,
      "accepted"
    );
  }

  buildRejectedApplicationsSection() {
    if (!this.rejectedList) return;

    const rejectedApplications =
      this.tabManager.getApplicationsByStatus("rejected");
    this.buildApplicationCards(
      this.rejectedList,
      rejectedApplications,
      "rejected"
    );
  }

  buildCurrentTraineesSection() {
    console.log("Building current trainees section...");
    console.log("trainees grid is ", this.traineesGrid);
    if (!this.traineesGrid) return;

    const currentTrainees =
      this.tabManager.getTrainingStudentsByDate("current");
    console.log("about to build trainee cards with ", currentTrainees);
    this.buildTraineeCards(currentTrainees);
  }

  buildApplicationCards(container, applications, status) {
    // Your existing buildApplicationCards implementation
    if (!container) return;

    container.innerHTML = "";

    if (applications.length === 0) {
      const emptyMessages = {
        pending: "No pending applications match your filters",
        accepted: "No accepted applications match your filters",
        rejected: "No rejected applications match your filters",
      };

      container.innerHTML = `
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                    <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">
                        ${
                          status === "pending"
                            ? "inbox"
                            : status === "accepted"
                            ? "check_circle"
                            : "cancel"
                        }
                    </span>
                    <p class="text-gray-500 dark:text-gray-400">${
                      emptyMessages[status]
                    }</p>
                </div>
            `;
      return;
    }

    applications.forEach((applicationData, index) => {
      const application = applicationData.application;
      const student = application.student || {};
      const applicationId = application.id || `app-${index}`;

      const applicationCard = this.createApplicationCard(
        applicationId,
        student,
        application,
        applicationData.opportunity,
        status
      );

      container.appendChild(applicationCard);
    });

    this.attachApplicationEventListeners(applications, status);
  }

  createApplicationCard(
    applicationId,
    student,
    application,
    opportunity,
    status
  ) {
   // console.log("application is ", applicationId, application);
    // Your existing createApplicationCard implementation
    const card = document.createElement("div");
    card.className = `bg-white dark:bg-gray-800 rounded-lg p-4 border ${
      status === "accepted"
        ? "border-green-200 dark:border-green-800"
        : status === "rejected"
        ? "border-red-200 dark:border-red-800"
        : "border-yellow-200 dark:border-yellow-800"
    }`;
    card.id = `${status}-card-${applicationId}`;

    // ... rest of your createApplicationCard implementation
    const applicationDate = application.applicationDate
      ? new Date(application.applicationDate)
      : new Date();
    const timeAgo = this.getTimeAgo(applicationDate);

    const studentName = student.name || student.fullName || "Unknown Student";
    const studentCourse =
      student.courseOfStudy || student.program || "Not specified";
    const studentEmail = student.email || "No email";
    let avatarUrl = student.imageUrl || "";

    if (
      avatarUrl &&
      (avatarUrl.includes("undefined") ||
        avatarUrl.includes("null") ||
        avatarUrl.trim() === "")
    ) {
      avatarUrl = null;
    }

    const avatarHtml = this.createAvatarElement(studentName, avatarUrl);

    const statusIcons = {
      pending: { icon: "schedule", color: "text-yellow-500", label: "Pending" },
      accepted: {
        icon: "check_circle",
        color: "text-green-500",
        label: "Accepted",
      },
      rejected: { icon: "cancel", color: "text-red-500", label: "Rejected" },
    };

    const statusConfig = statusIcons[status] || statusIcons.pending;

    card.innerHTML = `
            <div class="flex items-start gap-3">
                ${avatarHtml}
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-gray-900 dark:text-white truncate">${this.escapeHtml(
                      studentName
                    )}</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                        ${this.escapeHtml(studentCourse)} - ${this.escapeHtml(
      opportunity || "Internship"
    )}
                    </p>
                    <p class="text-xs text-gray-500 truncate" title="${this.escapeHtml(
                      studentEmail
                    )}">
                        ${this.escapeHtml(studentEmail)}
                    </p>
                    <div class="flex items-center gap-1 mt-1">
                        <span class="material-symbols-outlined ${
                          statusConfig.color
                        } text-sm">${statusConfig.icon}</span>
                        <span class="text-xs ${statusConfig.color
                          .replace("text-", "text-")
                          .replace("500", "600")} font-medium">${
      statusConfig.label
    }</span>
                        <span class="text-xs text-gray-500 ml-1">${timeAgo}</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-2 mt-3">
                <button 
                    data-app-id="${applicationId}" 
                    class="view-btn view-${status}  flex-1 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    View
                </button>
                ${this.getActionButtons(status, applicationId)}
            </div>
        `;

    return card;
  }

  getActionButtons(status, applicationId) {
    const seeDetailsBtn = `
    <button id="see-details-btn-${applicationId}" 
            class="flex-1 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
      <span class="material-symbols-outlined text-base">open_in_new</span>
      Details
    </button>
  `;

    switch (status) {
      case "pending":
        return `
         ${seeDetailsBtn}
        <button id="accept-pending-btn-${applicationId}" class="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 transition-colors">
          Accept
        </button>
        <button id="reject-pending-btn-${applicationId}" class="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 transition-colors">
          Reject
        </button>
      `;

      case "accepted":
        return `
         ${seeDetailsBtn}
        <button id="message-accepted-btn-${applicationId}" class="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Contact
        </button>
      `;

      case "rejected":
        return `
          ${seeDetailsBtn}
        <button id="undo-reject-btn-${applicationId}" class="flex-1 bg-gray-600 text-white text-sm py-2 rounded-lg hover:bg-gray-700 transition-colors">
          Undo
        </button>
      `;

      default:
        return "";
    }
  }
  buildTraineeCards(trainees) {
    // Your trainee cards implementation
    console.log("training grid is ", this.traineesGrid);
    if (!this.traineesGrid) return;

    this.traineesGrid.innerHTML = "";

    if (trainees.length === 0) {
      this.traineesGrid.innerHTML = `
                <div class="col-span-full bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                    <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">school</span>
                    <p class="text-gray-500 dark:text-gray-400">No current trainees</p>
                </div>
            `;
      return;
    }

    trainees.forEach((traineeData, index) => {
      const traineeCard = this.createTraineeCard(traineeData, index);
      this.traineesGrid.appendChild(traineeCard);
    });
  }

  createTraineeCard(traineeData, index) {
    // Your createTraineeCard implementation
    const card = document.createElement("div");
    card.className = "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm";

    // ... your trainee card implementation
    return card;
  }

  initializeDragAndDrop() {
    // Your existing drag and drop implementation
    const container = document.getElementById("sections-container");
    if (!container) return;

    // ... your drag and drop code
  }

  // Helper methods
  getTimeAgo(date) {
    // Your existing getTimeAgo implementation
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  }

  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  createAvatarElement(name, imageUrl, size = 80) {
    const sizePx = `${size}px`; // Use real pixels, not Tailwind tokens

    if (imageUrl) {
      return `
            <img src="${imageUrl}" 
                 alt="${name}" 
                 style="width:${sizePx}!important;height:${sizePx}!important;object-fit:cover;border-radius:9999px;"
                 class="shadow-sm border border-gray-200 dark:border-gray-700">
        `;
    } else {
      const initials = this.generateInitials(name);
      return `
            <div style="width:${sizePx}!important;height:${sizePx}!important;border-radius:9999px;"
                 class="bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                ${initials}
            </div>
        `;
    }
  }

  generateInitials(name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  // Event handlers
  handleStatsCardClick(e, cardType) {
    console.log(`Stats card clicked: ${cardType}`);
    // Handle stats card clicks
  }

  attachApplicationEventListeners(applications, status) {
    // Attach event listeners to application cards
  }

  // Cleanup method
  destroy() {
    // Clean up event listeners when tab is switched away
  }
  initializeEventListeners() {
    console.log("Attaching Overview event listeners...");

    const statusFilter = document.getElementById("status-filter");
    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        const selectedStatus = e.target.value;
        console.log(`Filtering by status: ${selectedStatus}`);

        // Rebuild the content based on selected status
        if (selectedStatus === "all") {
          this.buildPendingApplicationsSection();
          this.buildAcceptedApplicationsSection();
          this.buildRejectedApplicationsSection();
        } else {
          const containerMap = {
            pending: this.pendingApplicationsList,
            accepted: this.acceptedList,
            rejected: this.rejectedList,
          };

          const container = containerMap[selectedStatus];
          if (container) {
            const filteredApps =
              this.tabManager.getApplicationsByStatus(selectedStatus);
            this.buildApplicationCards(container, filteredApps, selectedStatus);
          }
        }
      });
    }

    const statsCards = document.querySelectorAll(".stats-card");
    statsCards.forEach((card) => {
      card.addEventListener("click", (e) => {
        const cardType = card.dataset.type || "unknown";
        this.handleStatsCardClick(e, cardType);
      });
    });



    document.addEventListener("click", async (e) => {
      const target = e.target;

      // View button
      if (target.classList.contains("view-btn")) {
        const appId = target.dataset.appId;
        console.log(`View application ${appId}`);
        this.tabManager.openApplicationDetails(appId);
      }

      // Accept button
      if (target.id.startsWith("accept-pending-btn-")) {
        const appId = target.id.replace("accept-pending-btn-", "");
        await this.handleAcceptApplication(appId);
      }

      // Reject button
      if (target.id.startsWith("reject-pending-btn-")) {
        const appId = target.id.replace("reject-pending-btn-", "");
        this.handleRejectApplication(appId);
      }

      // Undo reject
      if (target.id.startsWith("undo-reject-btn-")) {
        const appId = target.id.replace("undo-reject-btn-", "");
        this.handleUndoRejection(appId);
      }

      // Contact button (for accepted applications)
      if (target.id.startsWith("message-accepted-btn-")) {
        const appId = target.id.replace("message-accepted-btn-", "");
        this.handleContactStudent(appId);
      }

      // In initializeEventListeners - add this to your click handler
      if (target.id.startsWith("see-details-btn-")) {
        const parts = target.id.split("-");
        const appId = parts.slice(3).join("-");
        console.log(`See details for application ${appId}`);

        // Find the application data
        const applications = this.tabManager.getAllCompanyApplications();
        const applicationData = applications.find(
          (app) => app.application.id === appId
        );

        if (applicationData) {
          this.openStudentProfile(applicationData);
        } else {
          console.error(`Application ${appId} not found for details view`);
        }
      }
    });
  }

messageDialog(hideCancel = true, application) {
  this.currentApplication = application;
  const modalOverlay = document.createElement("div");
  modalOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; 
      align-items: center; z-index: 1000; font-family: sans-serif;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
      background: white; padding: 24px; border-radius: 8px; 
      width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;
  `;

  // Get student email for email mode
  const studentEmail = this.currentApplication.student?.email || '';
  const studentName = this.currentApplication.student?.fullName || 'Student';

  // Conditionally render the buttons based on hideCancel parameter
  const buttonsHTML = hideCancel
      ? `<div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="send-notification" style="padding: 8px 16px; border: 1px solid #007bff; border-radius: 4px; background: white; color: #007bff; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span id="notification-text">Send Notification</span>
              <span id="notification-loading" style="display: none;">Sending...</span>
          </button>
          <button id="send-email" style="padding: 8px 16px; border: none; border-radius: 4px; background: #28a745; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span id="email-text">Send Email</span>
              <span id="email-loading" style="display: none;">Sending...</span>
          </button>
      </div>`
      : `<div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="cancel-message" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">
              Cancel
          </button>
          <button id="send-notification" style="padding: 8px 16px; border: 1px solid #007bff; border-radius: 4px; background: white; color: #007bff; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span id="notification-text">Send Notification</span>
              <span id="notification-loading" style="display: none;">Sending...</span>
          </button>
          <button id="send-email" style="padding: 8px 16px; border: none; border-radius: 4px; background: #28a745; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <span id="email-text">Send Email</span>
              <span id="email-loading" style="display: none;">Sending...</span>
          </button>
      </div>`;

  modal.innerHTML = `
      <h2 style="margin: 0 0 20px 0; color: #333;">Contact Student</h2>
      
      <!-- Communication Mode Selection -->
      <div style="margin-bottom: 20px; padding: 16px; background: #f8f9fa; border-radius: 6px;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #495057;">Communication Method</h3>
          <div style="display: flex; gap: 16px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="radio" name="communication-mode" value="notification" checked>
                  <span>In-App Notification</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="radio" name="communication-mode" value="email">
                  <span>Email</span>
              </label>
          </div>
      </div>

      <!-- Student Information -->
      <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Student Name</label>
          <input type="text" id="student-name" placeholder="Enter student name" 
              value="${studentName}"
              style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
      </div>

      <!-- Email Field (shown when email mode is selected) -->
      <div id="email-field" style="margin-bottom: 16px; display: none;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Email Address</label>
          <input type="email" id="student-email" placeholder="Enter student email" 
              value="${studentEmail}"
              style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
          <small style="color: #6c757d; font-size: 12px;">This will open your default email client</small>
      </div>

      <!-- Message Field -->
      <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Message</label>
          <textarea id="message-text" rows="6" placeholder="Type your message to the student..."
                  style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-family: inherit;">
Hello ${studentName},

I'd like to schedule a time to discuss your industrial training progress.

Are you available sometime this week?

Best regards
          </textarea>
      </div>

      <!-- Message Templates -->
      <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 6px; font-weight: 500;">Quick Templates</label>
          <select id="message-templates" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; background: white;">
              <option value="">Select a template...</option>
              <option value="progress_check">Progress Check</option>
              <option value="meeting_request">Meeting Request</option>
              <option value="document_request">Document Submission Reminder</option>
              <option value="feedback_request">Feedback Request</option>
          </select>
      </div>

      ${buttonsHTML}
  `;

  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  // Get references to elements
  const sendNotificationBtn = modal.querySelector("#send-notification");
  const sendEmailBtn = modal.querySelector("#send-email");
  const notificationText = modal.querySelector("#notification-text");
  const notificationLoading = modal.querySelector("#notification-loading");
  const emailText = modal.querySelector("#email-text");
  const emailLoading = modal.querySelector("#email-loading");
  const studentNameInput = modal.querySelector("#student-name");
  const studentEmailInput = modal.querySelector("#student-email");
  const messageTextarea = modal.querySelector("#message-text");
  const emailField = modal.querySelector("#email-field");
  const communicationModeRadios = modal.querySelectorAll('input[name="communication-mode"]');
  const templateSelect = modal.querySelector("#message-templates");

  // Message templates
  const messageTemplates = {
      progress_check: `Hello {name},

I hope you're doing well with your industrial training. I'd like to check on your progress and see how everything is going.

Could you please provide a brief update on your current tasks and any challenges you're facing?

Looking forward to hearing from you.

Best regards`,

      meeting_request: `Hello {name},

I'd like to schedule a meeting to discuss your industrial training progress and address any questions or concerns you may have.

Please let me know your availability for this week.

Best regards`,

      document_request: `Hello {name},

This is a friendly reminder to submit your required training documents if you haven't already done so.

Please ensure all documents are submitted by the deadline.

Thank you for your cooperation.

Best regards`,

      feedback_request: `Hello {name},

I'd like to get your feedback on the industrial training program so far. Your input is valuable for improving the experience.

Please share any suggestions or concerns you may have.

Best regards`
  };

  // Event handlers
  const closeModal = () => document.body.removeChild(modalOverlay);

  // Function to set loading state for notification
  const setNotificationLoadingState = (isLoading) => {
      if (isLoading) {
          sendNotificationBtn.disabled = true;
          sendNotificationBtn.style.opacity = "0.6";
          sendNotificationBtn.style.cursor = "not-allowed";
          notificationText.style.display = "none";
          notificationLoading.style.display = "inline";
      } else {
          sendNotificationBtn.disabled = false;
          sendNotificationBtn.style.opacity = "1";
          sendNotificationBtn.style.cursor = "pointer";
          notificationText.style.display = "inline";
          notificationLoading.style.display = "none";
      }
  };

  // Function to set loading state for email
  const setEmailLoadingState = (isLoading) => {
      if (isLoading) {
          sendEmailBtn.disabled = true;
          sendEmailBtn.style.opacity = "0.6";
          sendEmailBtn.style.cursor = "not-allowed";
          emailText.style.display = "none";
          emailLoading.style.display = "inline";
      } else {
          sendEmailBtn.disabled = false;
          sendEmailBtn.style.opacity = "1";
          sendEmailBtn.style.cursor = "pointer";
          emailText.style.display = "inline";
          emailLoading.style.display = "none";
      }
  };

  // Function to disable all inputs
  const disableInputs = (disabled) => {
      studentNameInput.disabled = disabled;
      messageTextarea.disabled = disabled;
      if (studentEmailInput) studentEmailInput.disabled = disabled;
      templateSelect.disabled = disabled;
      communicationModeRadios.forEach(radio => radio.disabled = disabled);
  };

  // Communication mode change handler
  communicationModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
          if (e.target.value === 'email') {
              emailField.style.display = 'block';
              sendNotificationBtn.style.display = 'none';
              sendEmailBtn.style.display = 'flex';
          } else {
              emailField.style.display = 'none';
              sendNotificationBtn.style.display = 'flex';
              sendEmailBtn.style.display = 'none';
          }
      });
  });

  // Template selection handler
  templateSelect.addEventListener('change', (e) => {
      const template = e.target.value;
      if (template && messageTemplates[template]) {
          messageTextarea.value = messageTemplates[template].replace(/{name}/g, studentNameInput.value);
      }
  });

  // Only add cancel event listener if cancel button exists
  if (!hideCancel) {
      modal.querySelector("#cancel-message").addEventListener("click", closeModal);
  }

  // Send Notification Handler
  sendNotificationBtn.addEventListener("click", async () => {
      const studentName = studentNameInput.value;
      const messageText = messageTextarea.value;

      if (!studentName || !messageText) {
          alert("Please enter student name and message");
          return;
      }

      // Set loading state
      setNotificationLoadingState(true);
      disableInputs(true);

      try {
          const studentUid = this.currentApplication.student?.uid;
          const companyName = this.currentApplication.companyName || 'Our Company';

          if (!studentUid) {
              alert("Student information is missing");
              setNotificationLoadingState(false);
              disableInputs(false);
              return;
          }

          const result = await it_base_companycloud.sendNotificationToStudent(
              studentUid,
              {
                  title: "New Message from " + companyName,
                  message: messageText,
                  type: "message",
                  timestamp: new Date().toISOString()
              }
          );

          if (result.success) {
              setTimeout(() => {
                  alert(`Notification sent to ${studentName}`);
                  closeModal();
              }, 500);
          } else {
              alert("Failed to send notification: " + (result.error || 'Unknown error'));
              setNotificationLoadingState(false);
              disableInputs(false);
          }
      } catch (error) {
          alert("Error sending notification: " + error.message);
          setNotificationLoadingState(false);
          disableInputs(false);
      }
  });

  // Send Email Handler
  sendEmailBtn.addEventListener("click", async () => {
      const studentName = studentNameInput.value;
      const studentEmail = studentEmailInput.value;
      const messageText = messageTextarea.value;

      if (!studentName || !studentEmail || !messageText) {
          alert("Please enter student name, email, and message");
          return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(studentEmail)) {
          alert("Please enter a valid email address");
          return;
      }

      // Set loading state
      setEmailLoadingState(true);
      disableInputs(true);

      try {
          // Create email subject and body
          const companyName = this.currentApplication.companyName || 'Our Company';
          const subject = `Message from ${companyName} - Industrial Training`;
          const body = messageText;

          // Encode the email parameters
          const encodedSubject = encodeURIComponent(subject);
          const encodedBody = encodeURIComponent(body);

          // Create mailto link
          const mailtoLink = `mailto:${studentEmail}?subject=${encodedSubject}&body=${encodedBody}`;

          // Open email client
          window.open(mailtoLink, '_blank');

          // Simulate sending completion (since we can't track email actually being sent)
          setTimeout(() => {
              setEmailLoadingState(false);
              disableInputs(false);
              alert(`Email opened for ${studentName}. Please send it from your email client.`);
              closeModal();
          }, 1000);

      } catch (error) {
          alert("Error preparing email: " + error.message);
          setEmailLoadingState(false);
          disableInputs(false);
      }
  });

  // Only allow clicking outside to close if cancel button is visible
  if (!hideCancel) {
      modalOverlay.addEventListener("click", (e) => {
          if (e.target === modalOverlay) closeModal();
      });
  }

  // Initialize UI state
  communicationModeRadios[0].checked = true; // Default to notification mode
  sendEmailBtn.style.display = 'none'; // Hide email button initially
}

  openStudentProfile(applicationData) {
  const student = applicationData.application.student || {};
  const application = applicationData.application;
  
  // Get the IT ID and Application ID
  const itId = applicationData.opportunityId || 'unknown';
  const appId = application.id || 'unknown';
  
  console.log('Opening student profile:', { itId, appId, student });
  if(appId==='unknown'){
    console.error('Application ID is unknown, cannot open profile');
    return;
  }
  if(itId==='unknown'){ 
    console.error('Industrial Training ID is unknown, cannot open profile');
    return;
  }
  
  // Use your global method to generate the URL
  if (typeof generateShareableUrl === 'function') {
    const profileUrl = generateShareableUrl(
      "/company/student_profile.html",
      itId,
      appId
    );
    
    console.log('Generated URL:', profileUrl);
    window.location.href = profileUrl;
  } else {
    console.error('generateShareableUrl function not found');
    // Fallback: create a basic URL
    const fallbackUrl = `/company/student_profile.html?itId=${itId}&appId=${appId}`;
    window.location.href = fallbackUrl;
  }
}


  // Add these methods to your Overview class
  async handleAcceptApplication(applicationId) 
  {
    var application = this.tabManager.getAllCompanyApplications().find(app=>
    {
      if(app.application.id === applicationId)
       {
        //console.log("got a match "+JSON.stringify(app.application));
          return app.application;
       }
    }
    );
    //console.log("applications is "+JSON.stringify(application));

    if(!application || !application.application.student)
    {
      // console.log("application student is"+JSON.stringify(application.application.student));
      return;
    }
    if (confirm("Are you sure you want to accept this application?")) {
      console.log(`Accepting application ${applicationId}`);
      const success = await this.tabManager.updateApplicationStatus(
        applicationId,
        "accepted"
      );

      if (success) {
        this.showNotification("Application accepted successfully!", "success");
        messageDialog(true,application.application,false);
        this.refresh(this.tabManager);
      } else {
        this.showNotification("Failed to accept application", "error");
      }
    }
  }

  handleRejectApplication(applicationId) {

    var application = this.tabManager.getAllCompanyApplications().find(app=>
    {
      if(app.application.id === applicationId)
       {
        //console.log("got a match "+JSON.stringify(app.application));
          return app.application;
       }
    }
    );
    //console.log("applications is "+JSON.stringify(application));

    if(!application || !application.application.student)
    {
     //  console.log("application student is"+JSON.stringify(application.application.student));
      return;
    }


    if (confirm("Are you sure you want to reject this application?")) {
      console.log(`Rejecting application ${applicationId}`);
      const success = this.tabManager.updateApplicationStatus(
        applicationId,
        "rejected"
      );

      if (success) {
        this.showNotification("Application rejected", "success");
         messageDialog(true,application.application,false);
        this.refresh(this.tabManager);
      } else {
        this.showNotification("Failed to reject application", "error");
      }
    }
  }

  handleUndoRejection(applicationId) {
    if (confirm("Are you sure you want to undo the rejection?")) {
      console.log(`Undoing rejection for ${applicationId}`);
      const success = this.tabManager.updateApplicationStatus(
        applicationId,
        "pending"
      );

      if (success) {
        this.showNotification(
          "Rejection undone - application is now pending",
          "success"
        );
        this.refresh(this.tabManager);
      } else {
        this.showNotification("Failed to undo rejection", "error");
      }
    }
  }

  handleContactStudent(applicationId) {
    const applicationData = this.tabManager.applications.find(
      (app) => app.application.id === applicationId
    );

    if (applicationData && applicationData.application.student) {
      const student = applicationData.application.student;
      this.messageDialog(false,applicationData.application);
      // const email = student.email;

      // if (email) {
      //   // Open email client or show contact options
      //   window.open(
      //     `mailto:${email}?subject=Regarding Your Training Application`,
      //     "_blank"
      //   );
      // } else {
      //   this.showNotification(
      //     "No email address available for this student",
      //     "warning"
      //   );
      // }
    }
  }

  showNotification(message, type = "info") {
    // Simple notification implementation
    const notification = document.createElement("div");
    const bgColor =
      type === "success"
        ? "bg-green-500"
        : type === "error"
        ? "bg-red-500"
        : type === "warning"
        ? "bg-yellow-500"
        : "bg-blue-500";

    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  //*********************************************** Filtering logic *****************************/

  setupFilteringLogic() {
    console.log("Setting up filtering logic");

    // Initialize filter states
    this.currentFilters = {
      searchMode: "all",
      searchTerm: "",
      institution: "all",
      course: "all",
      status: "all",
    };

    // Add event listeners for all filters
    this.addFilterEventListeners();
  }

  addFilterEventListeners() {
    const searchModeSelect = document.getElementById("search-mode");
    if (searchModeSelect) {
      searchModeSelect.addEventListener("change", (e) => {
        this.handleSearchModeChange(e.target.value);
      });
    }

    // Search input
    const searchInput = document.getElementById("search-students-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.handleSearchInput(e.target.value);
      });
    }

    // Filter changes
    const institutionFilter = document.getElementById("institution-filter");
    const courseFilter = document.getElementById("course-filter");
    const statusFilter = document.getElementById("status-filter");

    if (institutionFilter) {
      institutionFilter.addEventListener("change", (e) => {
        this.handleFilterChange("institution", e.target.value);
      });
    }

    if (courseFilter) {
      courseFilter.addEventListener("change", (e) => {
        this.handleFilterChange("course", e.target.value);
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        this.handleFilterChange("status", e.target.value);
      });
    }
  }

  handleSearchInput(searchTerm) {
    this.currentFilters.searchTerm = searchTerm.trim();
    this.performFiltering();
  }
  handleSearchModeChange(mode) {
    console.log(`Search mode changed to: ${mode}`);
    this.currentFilters.searchMode = mode;

    // Update search placeholder based on mode
    const searchInput = document.getElementById("search-students-input");
    const placeholders = {
      all: "Search across all fields...",
      accepted: "Search accepted students...",
      pending: "Search pending applications...",
      rejected: "Search rejected applications...",
      current: "Search current trainees...",
    };

    if (searchInput) {
      searchInput.placeholder = placeholders[mode] || placeholders.all;
    }

    // Auto-set status filter based on mode
    const statusFilter = document.getElementById("status-filter");
    if (statusFilter) {
      if (["accepted", "pending", "rejected"].includes(mode)) {
        statusFilter.value = mode;
        this.currentFilters.status = mode;
      } else if (mode === "current") {
        statusFilter.value = "accepted"; // Current trainees are typically accepted
        this.currentFilters.status = "accepted";
      } else {
        statusFilter.value = "all";
        this.currentFilters.status = "all";
      }
    }
    console.log("Current filters after mode change:", this.currentFilters);
    this.performFiltering();
  }

  handleFilterChange(filterType, value) {
    this.currentFilters[filterType] = value;
    this.performFiltering();
  }

  // updateUI(filteredData) {
  //   this.updateApplicationSections(filteredData.applicationsByStatus);
  //   this.updateTrainingSections(filteredData.trainingStudentsByDate);
  //   this.updateStats(filteredData);
  // }

  performFiltering() {
    this.applications = this.tabManager.getAllCompanyApplications();
    if (!this.applications) return;
    console.log(
      "Performing filtering with current filters:",
      this.currentFilters
    );
    const filteredData = this.filterApplications();
    this.updateSearchUI(filteredData);
    this.updateActiveFiltersDisplay();
  }

  filterApplications() {
    const applicationsByStatus = {
      pending: this.tabManager.getApplicationsByStatus("pending") || [],
      shortlisted: this.tabManager.getApplicationsByStatus("shortlisted") || [],
      accepted: this.tabManager.getApplicationsByStatus("accepted") || [],
      rejected: this.tabManager.getApplicationsByStatus("rejected") || [],
    };

    const trainingStudentsByDate = {
      current: this.tabManager.getTrainingStudentsByDate("current") || [],
      upcoming: this.tabManager.getTrainingStudentsByDate("upcoming") || [],
      completed: this.tabManager.getTrainingStudentsByDate("completed") || [],
      notStarted: this.tabManager.getTrainingStudentsByDate("notStarted") || [],
    };

    const { searchMode, searchTerm, institution, course, status } =
      this.currentFilters;

    //console.log("applicationsByStatus:", applicationsByStatus);
    //console.log("trainingStudentsByDate:", trainingStudentsByDate);

    let filteredData = {
      applicationsByStatus: {
        pending: [],
        shortlisted: [],
        accepted: [],
        rejected: [],
      },
      trainingStudentsByDate: {
        current: [],
        upcoming: [],
        completed: [],
        notStarted: [],
      },
    };

    console.log("applicationByStatus.accepted:", applicationsByStatus.accepted);
    // Focus filtering based on search mode
    switch (searchMode) {
      case "accepted":
        filteredData.applicationsByStatus.accepted = this.filterSection(
          applicationsByStatus.accepted,
          searchTerm,
          institution,
          course,
          status
        );
        break;

      case "pending":
        filteredData.applicationsByStatus.pending = this.filterSection(
          applicationsByStatus.pending,
          searchTerm,
          institution,
          course,
          status
        );
        break;

      case "rejected":
        filteredData.applicationsByStatus.rejected = this.filterSection(
          applicationsByStatus.rejected,
          searchTerm,
          institution,
          course,
          status
        );
        break;

      case "current":
        filteredData.trainingStudentsByDate.current = this.filterSection(
          trainingStudentsByDate.current,
          searchTerm,
          institution,
          course,
          status
        );
        break;

      default: // 'all' - filter all sections
        Object.keys(applicationsByStatus).forEach((statusKey) => {
          filteredData.applicationsByStatus[statusKey] = this.filterSection(
            applicationsByStatus[statusKey],
            searchTerm,
            institution,
            course,
            status
          );
        });

        Object.keys(trainingStudentsByDate).forEach((dateKey) => {
          filteredData.trainingStudentsByDate[dateKey] = this.filterSection(
            trainingStudentsByDate[dateKey],
            searchTerm,
            institution,
            course,
            status
          );
        });
        break;
    }

    return filteredData;
  }

  filterSection(sectionData, searchTerm, institution, course, status) {
    console.log("sectionData:", sectionData);
    return sectionData.filter((applicationData) => {
      const application = applicationData.application;
      const student = application.student || {};

      // Search term filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          this.searchInField(student.name, searchLower) ||
          this.searchInField(student.fullName, searchLower) ||
          this.searchInField(student.university, searchLower) ||
          this.searchInField(student.institution, searchLower) ||
          this.searchInField(student.courseOfStudy, searchLower) ||
          this.searchInField(student.program, searchLower) ||
          this.searchInField(student.email, searchLower) ||
          this.searchInField(applicationData.opportunity, searchLower);

        if (!matchesSearch) return false;
      }

      // Institution filter
      if (institution !== "all") {
        const studentInstitution =
          student.university || student.institution || "";
        if (studentInstitution.toLowerCase() !== institution.toLowerCase()) {
          return false;
        }
      }

      // Course filter
      if (course !== "all") {
        const industrialTraining = applicationData.opportunity|| "";
        if (industrialTraining.toLowerCase() !== course.toLowerCase()) {
          return false;
        }
      }

      // Status filter (only for applications, not for training students)
      if (status !== "all" && application.status) {
        if (application.status !== status) {
          return false;
        }
      }

      return true;
    });
  }

  searchInField(fieldValue, searchTerm) {
    if (!fieldValue) return false;
    return fieldValue.toLowerCase().includes(searchTerm);
  }

  updateSearchUI(filteredData) {
    console.log("filteredData is ", filteredData);
    switch (this.currentFilters.searchMode) {
      case "accepted":
      case "pending":
      case "rejected":
        this.updateApplicationSectionsBySearchMode(
          filteredData.applicationsByStatus
        );
        break;
      case "current":
        this.updateTrainingSections(filteredData.trainingStudentsByDate);
        break;
    }
    this.updateModeStats(filteredData);
  }
  updateUI(filteredData) {
    console.log("Updating UI with filtered data");
    this.updateApplicationSections(filteredData.applicationsByStatus);
    this.updateTrainingSections(filteredData.trainingStudentsByDate);
    this.updateStats(filteredData);
  }

  updateApplicationSectionsBySearchMode(filteredApplications) {
    switch (this.currentFilters.searchMode) {
      case "pending":
        this.buildApplicationCards(
          document.getElementById("pending-applications-list"),
          filteredApplications.pending,
          "pending"
        );
        document.getElementById("pending-applications-count").textContent =
          filteredApplications.pending.length;
        break;

      case "accepted":
        this.buildApplicationCards(
          document.getElementById("accepted-list"),
          filteredApplications.accepted,
          "accepted"
        );
        document.getElementById("accepted-count").textContent =
          filteredApplications.accepted.length;
        break;

      case "rejected":
        this.buildApplicationCards(
          document.getElementById("rejected-list"),
          filteredApplications.rejected,
          "rejected"
        );
        document.getElementById("rejected-count").textContent =
          filteredApplications.rejected.length;
        break;
    }
  }

  updateApplicationSections(filteredApplications) {
    // Update pending applications
    const pendingList = document.getElementById("pending-applications-list");
    if (pendingList) {
      this.buildApplicationCards(
        pendingList,
        filteredApplications.pending,
        "pending"
      );
    }

    // Update accepted applications
    const acceptedList = document.getElementById("accepted-list");
    if (acceptedList) {
      this.buildApplicationCards(
        acceptedList,
        filteredApplications.accepted,
        "accepted"
      );
    }

    // Update rejected applications
    const rejectedList = document.getElementById("rejected-list");
    if (rejectedList) {
      this.buildApplicationCards(
        rejectedList,
        filteredApplications.rejected,
        "rejected"
      );
    }

    // Update counts
    this.updateApplicationCounts(filteredApplications);
  }

  updateTrainingSections(filteredTraining) {
    // Update current trainees
    const traineesGrid = document.getElementById("trainees-grid");
    if (traineesGrid && this.buildCurrentTraineesSection) {
      // Store filtered data temporarily
      const originalTrainingData = this.trainingStudentsByDate;
      this.trainingStudentsByDate = filteredTraining;

      this.buildCurrentTraineesSection();

      // Restore original data
      this.trainingStudentsByDate = originalTrainingData;
    }

    // Update training counts if needed
    const currentTraineesTitle = document.getElementById(
      "current-trainees-title"
    );
    if (currentTraineesTitle) {
      const count = filteredTraining.current.length;
      currentTraineesTitle.textContent = `Current Trainees ${
        count > 0 ? `(${count})` : ""
      }`;
    }
  }

  updateApplicationCounts(filteredApplications) {
    // Update pending count
    const pendingCount = document.getElementById("pending-applications-count");
    if (pendingCount) {
      pendingCount.textContent = filteredApplications.pending.length;
    }

    // Update accepted count
    const acceptedCount = document.getElementById("accepted-count");
    if (acceptedCount) {
      acceptedCount.textContent = filteredApplications.accepted.length;
    }

    // Update rejected count
    const rejectedCount = document.getElementById("rejected-count");
    if (rejectedCount) {
      rejectedCount.textContent = filteredApplications.rejected.length;
    }
  }

  updateStats(filteredData) {
    // Update quick stats based on filtered data
    console.log("Updating stats with filtered data");
    const totalApplicants = Object.values(
      filteredData.applicationsByStatus
    ).reduce((sum, applications) => sum + applications.length, 0);

    const totalApplicantsValue = document.getElementById(
      "total-applicants-value"
    );
    if (totalApplicantsValue) {
      totalApplicantsValue.textContent = totalApplicants;
    }

    const pendingReviewValue = document.getElementById("pending-review-value");
    if (pendingReviewValue) {
      pendingReviewValue.textContent =
        filteredData.applicationsByStatus.pending.length;
    }

    const acceptedValue = document.getElementById("accepted-value");
    if (acceptedValue) {
      acceptedValue.textContent =
        filteredData.applicationsByStatus.accepted.length;
    }

    const rejectedValue = document.getElementById("rejected-value");
    if (rejectedValue) {
      rejectedValue.textContent =
        filteredData.applicationsByStatus.rejected.length;
    }
  }

  updateModeStats(filteredData) {
    // Update quick stats based on filtered data
    switch (this.currentFilters.searchMode) {
      case "pending":
        const pendingReviewValue = document.getElementById(
          "pending-review-value"
        );
        if (pendingReviewValue) {
          pendingReviewValue.textContent =
            filteredData.applicationsByStatus.pending.length;
        }
        break;

      case "accepted":
        const acceptedValue = document.getElementById("accepted-value");
        if (acceptedValue) {
          acceptedValue.textContent =
            filteredData.applicationsByStatus.accepted.length;
        }
        break;

      case "rejected":
        const rejectedValue = document.getElementById("rejected-value");
        if (rejectedValue) {
          rejectedValue.textContent =
            filteredData.applicationsByStatus.rejected.length;
        }
        break;
    }
  }

  updateActiveFiltersDisplay() {
    console.log("Updating active filters display...");
    const activeFiltersContainer = document.getElementById("active-filters");
    if (!activeFiltersContainer) return;

    console.log("Current filters:", this.currentFilters);

    const activeFilters = Object.entries(this.currentFilters).filter(
      ([key, value]) => {
        if (key === "searchTerm") return value !== "";
        return value !== "all";
      }
    );

    console.log("Active filters after filtering:", activeFilters);

    if (activeFilters.length === 0) {
      activeFiltersContainer.classList.add("hidden");
      return;
    }

    activeFiltersContainer.classList.remove("hidden");

    const filterLabels = {
      searchMode: "Mode",
      searchTerm: "Search",
      institution: "Institution",
      course: "Course",
      status: "Status",
    };

    const modeLabels = {
      all: "All Fields",
      accepted: "Accepted",
      pending: "Pending",
      rejected: "Rejected",
      current: "Current Trainees",
    };

    activeFiltersContainer.innerHTML = activeFilters
      .map(([key, value]) => {
        let displayValue = value;
        if (key === "searchMode") {
          displayValue = modeLabels[value] || value;
        }

        return `
      <div class="active-filter-item bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center gap-2" data-filter-type="${key}">
        <span>${filterLabels[key]}: ${displayValue}</span>
        <button class="clear-filter-btn text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    `;
      })
      .join("");

    // Add event listeners to the clear buttons
    this.attachClearFilterListeners();
  }

  attachClearFilterListeners() {
    const clearButtons = document.querySelectorAll(".clear-filter-btn");
    clearButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        const filterItem = button.closest(".active-filter-item");
        const filterType = filterItem?.dataset.filterType;
        if (filterType) {
          this.clearFilter(filterType);
        }
      });
    });
  }
  clearFilter(filterType) {
    if (filterType === "searchTerm") {
      document.getElementById("search-students-input").value = "";
      this.currentFilters.searchTerm = "";
    } else if (filterType === "searchMode") {
      document.getElementById("search-mode").value = "all";
      this.currentFilters.searchMode = "all";
    } else {
      this.currentFilters[filterType] = "all";
      const element = document.getElementById(`${filterType}-filter`);
      if (element) element.value = "all";
    }

    this.performFiltering();
  }

  clearAllFilters() {
    document.getElementById("search-students-input").value = "";
    this.currentFilters.searchTerm = "";
    document.getElementById("search-mode").value = "all";
    this.currentFilters.searchMode = "all";
    document.getElementById("institution-filter").value = "all";
    this.currentFilters.institution = "all";
    document.getElementById("course-filter").value = "all";
    this.currentFilters.course = "all";
    document.getElementById("status-filter").value = "all";
    this.currentFilters.status = "all";
    this.performFiltering();
  }

  // Method to populate filter options
  populateFilterOptions(applications) {
    this.populateInstitutionOptions(applications);
    this.populateCourseOptions(applications);
  }

  populateInstitutionOptions(applications) {
    const institutionFilter = document.getElementById("institution-filter");
    if (!institutionFilter) return;

    // Clear existing options (keep "All Institutions")
    while (institutionFilter.children.length > 1) {
      institutionFilter.removeChild(institutionFilter.lastChild);
    }

    const institutions = [
      ...new Set(
        applications
          .map(
            (app) =>
              app.application.student?.university ||
              app.application.student?.institution
          )
          .filter(Boolean)
      ),
    ];

    institutions.forEach((institution) => {
      const option = document.createElement("option");
      option.value = institution;
      option.textContent = institution;
      institutionFilter.appendChild(option);
    });
  }

  populateCourseOptions(applications) {
    const courseFilter = document.getElementById("course-filter");
    if (!courseFilter) return;

    // Clear existing options (keep "All Courses")
    while (courseFilter.children.length > 1) {
      courseFilter.removeChild(courseFilter.lastChild);
    }

    const courses = [
      ...new Set(
        applications
          .map(
            (app) =>
              app.opportunity||
              app.application.internship?.title
          )
          .filter(Boolean)
      ),
    ];

    courses.forEach((course) => {
      const option = document.createElement("option");
      option.value = course;
      option.textContent = course;
      courseFilter.appendChild(option);
    });
  }
}
