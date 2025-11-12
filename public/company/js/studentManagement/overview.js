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
  }

  buildOverviewContent() {
    // Get data from TabManager
    const data = this.tabManager.getDashboardData();

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
    if (!this.traineesGrid) return;

    const currentTrainees =
      this.tabManager.getTrainingStudentsByDate("current");
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
                    id="view-${status}-btn-${applicationId}" 
                    class="flex-1 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                    View
                </button>
                ${this.getActionButtons(status, applicationId)}
            </div>
        `;

    return card;
  }

  getActionButtons(status, applicationId) {
    // Your existing getActionButtons implementation
    switch (status) {
      case "pending":
        return `
                    <button id="accept-pending-btn-${applicationId}" class="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 transition-colors">
                        Accept
                    </button>
                    <button id="reject-pending-btn-${applicationId}" class="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 transition-colors">
                        Reject
                    </button>
                `;

      case "accepted":
        return `
                    <button id="message-accepted-btn-${applicationId}" class="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Contact
                    </button>
                `;

      case "rejected":
        return `
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

    // ✅ Example: Status filter (if exists)
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

    // ✅ Example: Stats card clicks (overview numbers or summary widgets)
    const statsCards = document.querySelectorAll(".stats-card");
    statsCards.forEach((card) => {
      card.addEventListener("click", (e) => {
        const cardType = card.dataset.type || "unknown";
        this.handleStatsCardClick(e, cardType);
      });
    });

    // ✅ Example: “View”, “Accept”, “Reject” buttons on application cards
    document.addEventListener("click", (e) => {
      const target = e.target;

      // View button
      if (target.id.startsWith("view-")) {
        const appId = target.id.split("-").pop();
        console.log(`View application ${appId}`);
        this.tabManager.openApplicationDetails(appId);
      }

      // Accept button
      if (target.id.startsWith("accept-pending-btn-")) {
        const appId = target.id.replace("accept-pending-btn-", "");
        console.log(`Accepting application ${appId}`);
        this.tabManager.updateApplicationStatus(appId, "accepted");
        this.refresh(this.tabManager);
      }

      // Reject button
      if (target.id.startsWith("reject-pending-btn-")) {
        const appId = target.id.replace("reject-pending-btn-", "");
        console.log(`Rejecting application ${appId}`);
        this.tabManager.updateApplicationStatus(appId, "rejected");
        this.refresh(this.tabManager);
      }

      // Undo reject
      if (target.id.startsWith("undo-reject-btn-")) {
        const appId = target.id.replace("undo-reject-btn-", "");
        console.log(`Undoing rejection for ${appId}`);
        this.tabManager.updateApplicationStatus(appId, "pending");
        this.refresh(this.tabManager);
      }
    });

    const refreshButton = document.getElementById("refresh-overview");
    if (refreshButton) {
      refreshButton.addEventListener("click", () => {
        console.log("Refreshing Overview tab...");
        this.refresh(this.tabManager);
      });
    }
  }
}
