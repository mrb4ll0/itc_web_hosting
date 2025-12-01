import { auth, db } from "../../../js/config/firebaseInit.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
import { IndustrialTraining } from "../../../js/model/internship_model.js";

class ITPostView {
  constructor() {
    this.companyCloud = new ITBaseCompanyCloud();
    this.currentTraining = null;
    this.currentCompany = null;
    this.init();
  }

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.trainingId = urlParams.get("id");
    await auth.authStateReady();
    if (!auth.currentUser) {
      alert("Profile not found. You'll be redirected to login.");
      window.location.href = "../auth/companyLogin.js";
      return;
    }

    this.showLoadingDialog("Loading training details...");
    await this.loadTrainingData();
    this.setupEventListeners();
  }

  showLoadingDialog(message = "Loading...") {
    // Remove existing loading dialog if any
    this.hideLoadingDialog();

    const loadingHtml = `
            <div id="loading-dialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 flex items-center gap-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">${message}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Please wait...</p>
                    </div>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML("beforeend", loadingHtml);
  }

  hideLoadingDialog() {
    const loadingDialog = document.getElementById("loading-dialog");
    if (loadingDialog) {
      loadingDialog.remove();
    }
  }

  showErrorDialog(message) {
    this.hideLoadingDialog();

    const errorHtml = `
            <div id="error-dialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="material-symbols-outlined text-red-500">error</span>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Error</h3>
                    </div>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">${message}</p>
                    <div class="flex justify-end">
                        <button id="error-ok-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;
    document.body.insertAdjacentHTML("beforeend", errorHtml);

    // Add event listener for OK button
    document.getElementById("error-ok-btn").addEventListener("click", () => {
      this.hideErrorDialog();
      window.location.href = "company_dashboard.html";
    });
  }

  hideErrorDialog() {
    const errorDialog = document.getElementById("error-dialog");
    if (errorDialog) {
      errorDialog.remove();
    }
  }

  async loadTrainingData() {
    try {
      // Get training ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const trainingId = urlParams.get("id");

      if (!trainingId) {
        throw new Error("Training ID not found in URL");
      }
      await auth.authStateReady();
      // Load training data
      this.currentTraining = await this.companyCloud.getIndustrialTrainingById(
        auth.currentUser.uid,
        this.trainingId
      );

      if (!this.currentTraining) {
        throw new Error("Training opportunity not found");
      }

      // Load company data
      this.currentCompany = await this.companyCloud.getCompany(
        auth.currentUser.uid
      );

      if (!this.currentCompany) {
        throw new Error("Company data not found");
      }

      // Populate the UI with data
      this.populateTrainingData();
      this.hideLoadingDialog();
    } catch (error) {
      console.error("Error loading training data:", error);
      this.showErrorDialog(error.message || "Failed to load training details");
    }
  }

  populateTrainingData() {
    if (!this.currentTraining || !this.currentCompany) return;

    // Populate header and basic info
    this.setElementText("training-title", this.currentTraining.title);
    this.setElementText(
      "company-name",
      `Posted by ${this.currentCompany.name}`
    );
    this.setElementText("breadcrumb-current", this.currentTraining.title);

    // Update status badge
    this.updateStatusBadge(this.currentTraining.status);

    // Populate "At a Glance" section
    this.setElementText(
      "department-value",
      this.currentTraining.department || "Not specified"
    );
    this.setElementText(
      "location-value",
      this.currentTraining.address || "Not specified"
    );
    this.setElementText(
      "stipend-value",
      this.currentTraining.stipend || "Not specified"
    );

    // Aptitude test
    const aptitudeText = this.currentTraining.aptitudeTestRequired
      ? "Yes"
      : "No";
    this.setElementText("aptitude-value", aptitudeText);

    // Dates (if available)
    if (this.currentTraining.startDate && this.currentTraining.endDate) {
      const startDate = this.formatTimestamp(
        this.currentTraining.startDate,
        "short"
      );
      const endDate = this.formatTimestamp(
        this.currentTraining.endDate,
        "short"
      );
      this.setElementText("dates-value", `${startDate} - ${endDate}`);
    } else {
      this.setElementText("dates-value", "Flexible");
    }

    // Populate applications overview
    this.updateApplicationsOverview();

    // Populate detailed content
    this.populateDetailedContent();

    // Update user avatar if company has logo
    if (this.currentCompany.logoURL) {
      document.getElementById(
        "user-avatar"
      ).style.backgroundImage = `url('${this.currentCompany.logoURL}')`;
    }
  }

  updateStatusBadge(status) {
    const statusBadge = document.getElementById("status-badge");
    const closeButton = document.getElementById("close-button");

    if (status === "open") {
      statusBadge.textContent = "Open";
      statusBadge.className =
        "inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300";
      closeButton.textContent = "Close Posting";
    } else {
      statusBadge.textContent = "Closed";
      statusBadge.className =
        "inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300";
      closeButton.textContent = "Open Posting";
    }
  }

  updateApplicationsOverview() {
    // Update positions filled
    const filled =
      this.currentTraining.applications?.filter(
        (app) => app.status === "accepted"
      ).length || 0;
    const total = this.currentTraining.intakeCapacity || 0;
    const totalApplications = this.currentTraining.applications?.length || 0;

    this.setElementText("positions-value", `${filled} / ${total}`);
    this.setElementText(
      "applications-count",
      `${totalApplications} total applications received.`
    );

    // Update progress bar
    const percentage = total > 0 ? (filled / total) * 100 : 0;
    document.getElementById("progress-bar").style.width = `${percentage}%`;

    // Update applications badge
    this.setElementText("applications-badge", totalApplications.toString());
  }

  populateDetailedContent() {
    // Description
    this.setElementText(
      "description-content",
      this.currentTraining.description || "No description provided."
    );

    // Requirements/Skills
    this.setElementText(
      "requiredskillls-content",
      this.currentTraining.eligibilityCriteria ||
        "No specific requirements listed."
    );

    // Skills tags
    this.populateSkillsTags();

    // Additional sections if data exists
    this.populateAdditionalSections();
  }

  populateSkillsTags() {
    const skillsContainer = document.getElementById("skills-container");
    skillsContainer.innerHTML = "";

    let skills = [];
    if (this.currentTraining.eligibilityCriteria) {
      skills = this.currentTraining.eligibilityCriteria;
    }
    skillsContainer.innerHTML = skills;
  }

  extractSkillsFromText(text) {
    const commonSkills = [
      "JavaScript",
      "Python",
      "Java",
      "React",
      "Node.js",
      "HTML",
      "CSS",
      "Git",
      "SQL",
      "REST APIs",
      "Problem Solving",
    ];
    const foundSkills = commonSkills.filter((skill) =>
      text.toLowerCase().includes(skill.toLowerCase())
    );
    return foundSkills.length > 0 ? foundSkills : ["Various technical skills"];
  }

  populateAdditionalSections() {
    // Populate responsibilities if available
    if (this.currentTraining.responsibilities) {
      this.populateList(
        "responsibilities-list",
        this.currentTraining.responsibilities
      );
    }

    // Populate learning outcomes if available
    if (this.currentTraining.learningOutcomes) {
      this.populateList("outcomes-list", this.currentTraining.learningOutcomes);
    }
  }

  populateList(listId, items) {
    const listElement = document.getElementById(listId);
    if (!listElement) return;

    listElement.innerHTML = "";
    items.forEach((item, index) => {
      const li = document.createElement("li");
      li.textContent = item;
      li.id = `${listId}-item-${index}`;
      listElement.appendChild(li);
    });
  }

  setupEventListeners() {
    // Edit button
    document.getElementById("edit-button").addEventListener("click", () => {
      this.editTraining();
    });

    // Close/Open button
    document.getElementById("close-button").addEventListener("click", () => {
      this.toggleTrainingStatus();
    });

    // Tab navigation
    document.getElementById("details-tab").addEventListener("click", (e) => {
      e.preventDefault();
      this.showDetailsTab();
    });

    document
      .getElementById("applications-tab")
      .addEventListener("click", (e) => {
        e.preventDefault();
        this.showApplicationsTab();
      });

    document.getElementById("analytics-tab").addEventListener("click", (e) => {
      e.preventDefault();
      this.showAnalyticsTab();
    });

    // Breadcrumb navigation
    document
      .getElementById("breadcrumb-dashboard")
      .addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "company_dashboard.html";
      });

    document
      .getElementById("breadcrumb-industrial-training")
      .addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "company_training_list.html";
      });
  }

  showDetailsTab() {
    this.switchToTab("details-tab", "tab-content");
  }

  async showApplicationsTab() {
    try {
      this.showLoadingDialog("Loading applications...");

      await auth.authStateReady();
      if (!auth.currentUser) {
        throw new Error("User not found");
      }

      // Get applications for this specific industrial training
      const applications =
        await this.companyCloud.getApplicationsForIndustrialTraining(
          auth.currentUser.uid,
          this.trainingId
        );

      // Check screen size and populate appropriate view
      this.populateResponsiveApplicationsView(applications);

      // Update applications overview
      this.updateApplicationsOverviewWithData(applications);

      // Switch to applications tab
      this.switchToTab("applications-tab", "applications-tab-content");

      this.hideLoadingDialog();
    } catch (error) {
      console.error("Error loading applications:", error);
      this.hideLoadingDialog();
      this.showNotification("Failed to load applications", "error");
      // Still switch to applications tab even if there's an error
      this.switchToTab("applications-tab", "applications-content");
    }
  }

  // NEW METHOD: Populate the appropriate view based on screen size
  populateResponsiveApplicationsView(applications) {
    // Check if we're on mobile or desktop
    const isMobile = window.innerWidth < 768; // md breakpoint

    if (isMobile) {
      // Hide desktop table, show mobile list
      this.hideDesktopTable();
      this.populateMobileApplicationsList(applications);
    } else {
      // Hide mobile list, show desktop table
      this.hideMobileList();
      this.populateApplicationsTable(applications);
    }
  }

  hideDesktopTable() {
    const tableContainer = document.querySelector(
      ".overflow-x-auto.hidden.md\\:block"
    );
    if (tableContainer) {
      tableContainer.classList.add("hidden");
    }
  }

  // NEW METHOD: Hide mobile list
  hideMobileList() {
    const mobileList = document.getElementById("mobile-applications-list");
    if (mobileList) {
      mobileList.classList.add("hidden");
    }
  }

  showAnalyticsTab() {
    this.switchToTab("analytics-tab", "analytics-content");
  }

  switchToTab(tabId, contentId) {
    // Remove active classes from all tabs
    document.querySelectorAll('[id$="-tab"]').forEach((tab) => {
      tab.classList.remove("border-primary", "text-primary");
      tab.classList.add(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      );
    });

    // Hide all tab content
    document.querySelectorAll("[data-tab-content]").forEach((content) => {
      content.classList.add("hidden");
    });

    // Activate current tab
    const activeTab = document.getElementById(tabId);
    const activeContent = document.getElementById(contentId);
    if (activeTab && activeContent) {
      activeTab.classList.add("border-primary", "text-primary");
      activeTab.classList.remove(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      );
      activeContent.classList.remove("hidden");
    } else {
      console.error(`Tab or content not found: ${tabId}, ${contentId}`);
    }
  }

  populateApplicationsTable(applications) {
    const tbody = document.getElementById("applications-table-body");
    const tableContainer = document.querySelector(
      ".overflow-x-auto.hidden.md\\:block"
    );
    if (!tbody) {
      console.error("Applications table body not found");
      return;
    }
    // Show table container
    if (tableContainer) {
      tableContainer.classList.remove("hidden");
      tableContainer.classList.add("hidden", "md:block"); // Ensure responsive classes
    }

    if (!applications || applications.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                            <span class="material-symbols-outlined text-4xl">person_search</span>
                            <h3 class="text-lg font-medium">No Applications Yet</h3>
                            <p class="text-sm">Applications will appear here when students apply to this opportunity.</p>
                        </div>
                    </td>
                </tr>
            `;
      return;
    }

    tbody.innerHTML = applications
      .map(
        (application, index) => `
            <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            ${application.student?.name?.charAt(0) || "S"}
                        </div>
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">
                                ${
                                  application.student?.fullName ||
                                  "Unknown Student"
                                }
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                ${application.student?.email || "No email"}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    ${application.student?.courseOfStudy || "Not specified"}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    ${application.student?.institution || "Not specified"}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getApplicationStatusBadge(
                      application.applicationStatus
                    )}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    ${this.formatTimestamp(
                      application.applicationDate,
                      "short"
                    )}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <!-- View Application Button -->
                        <button class="view-application-btn p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                data-application-id="${application.id}"
                                title="View Application">
                            <span class="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        
                        <!-- Download Resume Button -->
                        ${
                          application.student?.resumeURL
                            ? `
                            <button class="download-resume-btn p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                    data-resume-url="${application.student.resumeURL}"
                                    title="Download Resume">
                                <span class="material-symbols-outlined text-lg">download</span>
                            </button>
                        `
                            : `
                            <button class="p-2 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                    disabled
                                    title="No resume available">
                                <span class="material-symbols-outlined text-lg">download</span>
                            </button>
                        `
                        }
                        
                        <!-- Accept and Reject Buttons (only for pending applications) -->
                        ${
                          application.applicationStatus === "pending"
                            ? `
                            <div class="flex items-center gap-1">
                                <!-- Accept Button -->
                                <button class="accept-application-btn p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                        data-application-id="${application.id}"
                                        title="Accept Application">
                                    <span class="material-symbols-outlined text-lg">check_circle</span>
                                </button>
                                
                                <!-- Reject Button -->
                                <button class="reject-application-btn p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        data-application-id="${application.id}"
                                        title="Reject Application">
                                    <span class="material-symbols-outlined text-lg">cancel</span>
                                </button>
                            </div>
                        `
                            : ""
                        }
                        
                        <!-- Status Change Button (for non-pending applications) -->
                        ${
                          application.applicationStatus !== "pending"
                            ? `
                            <button class="change-status-btn p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                    data-application-id="${application.id}"
                                    data-current-status="${application.applicationStatus}"
                                    title="Change Status">
                                <span class="material-symbols-outlined text-lg">swap_horiz</span>
                            </button>
                        `
                            : ""
                        }
                    </div>
                </td>
            </tr>
        `
      )
      .join("");

    // Attach event listeners to application rows
    this.attachApplicationEventListeners(applications);
  }

  populateMobileApplicationsList(applications) {
    const mobileList = document.getElementById("mobile-applications-list");
    if (!mobileList) {
      console.error("Mobile applications list container not found");
      return;
    }

    mobileList.classList.remove("hidden");
    mobileList.classList.add("md:hidden", "space-y-4");

    if (!applications || applications.length === 0) {
      mobileList.innerHTML = `
                <div class="text-center py-12">
                    <div class="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                        <span class="material-symbols-outlined text-6xl">person_search</span>
                        <h3 class="text-lg font-medium">No Applications Yet</h3>
                        <p class="text-sm text-center">Applications will appear here when students apply to this opportunity.</p>
                    </div>
                </div>
            `;
      return;
    }

    mobileList.innerHTML = applications
      .map(
        (application, index) => `
            <div class="application-card bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <!-- Student Info Header -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            ${application.student?.name?.charAt(0) || "S"}
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900 dark:text-white text-base">
                                ${
                                  application.student?.fullName ||
                                  "Unknown Student"
                                }
                            </h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">${
                              application.student?.email || "No email"
                            }</p>
                        </div>
                    </div>
                    <span class="application-status-badge ${this.getApplicationStatusClass(
                      application.applicationStatus
                    )}">
                        ${this.getApplicationStatusText(
                          application.applicationStatus
                        )}
                    </span>
                </div>

                <!-- Application Details -->
                <div class="space-y-3 text-sm mb-4">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-gray-600 dark:text-gray-400">Course:</span>
                        <span class="text-gray-900 dark:text-white text-right">${
                          application.student?.courseOfStudy || "Not specified"
                        }</span>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-gray-600 dark:text-gray-400">Institution:</span>
                        <span class="text-gray-900 dark:text-white text-right">${
                          application.student?.institution || "Not specified"
                        }</span>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-gray-600 dark:text-gray-400">Applied:</span>
                        <span class="text-gray-900 dark:text-white">${this.formatTimestamp(
                          application.applicationDate,
                          "short"
                        )}</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button class="view-application-btn-mobile flex-1 min-w-[120px] px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                            data-application-id="${application.id}">
                        <span class="material-symbols-outlined text-lg">visibility</span>
                        View
                    </button>
                    
                    ${
                      application.student?.resumeURL
                        ? `
                        <button class="download-resume-btn-mobile flex-1 min-w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                data-resume-url="${application.student.resumeURL}">
                            <span class="material-symbols-outlined text-lg">download</span>
                            Resume
                        </button>
                    `
                        : ""
                    }
                    
                    ${
                      application.applicationStatus === "pending"
                        ? `
                        <div class="flex gap-2 w-full mt-2">
                            <button class="accept-application-btn-mobile flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                    data-application-id="${application.id}">
                                <span class="material-symbols-outlined text-lg">check_circle</span>
                                Accept
                            </button>
                            <button class="reject-application-btn-mobile flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                    data-application-id="${application.id}">
                                <span class="material-symbols-outlined text-lg">cancel</span>
                                Reject
                            </button>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>
        `
      )
      .join("");

    // Attach mobile event listeners
    this.attachMobileApplicationEventListeners(applications);
  }

  // NEW METHOD: Get application status class for mobile
  getApplicationStatusClass(status) {
    const statusClasses = {
      pending: "status-pending",
      under_review: "status-under-review",
      accepted: "status-accepted",
      rejected: "status-rejected",
      hired: "status-hired",
    };

    return statusClasses[status] || "status-pending";
  }

  // NEW METHOD: Attach mobile application event listeners
  attachMobileApplicationEventListeners(applications) {
    // View application buttons - mobile
    document
      .querySelectorAll(".view-application-btn-mobile")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          const applicationId = e.currentTarget.getAttribute(
            "data-application-id"
          );
          this.viewApplicationDetails(applicationId, applications);
        });
      });

    // Download resume buttons - mobile
    document
      .querySelectorAll(".download-resume-btn-mobile")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          const resumeUrl = e.currentTarget.getAttribute("data-resume-url");
          this.downloadResume(resumeUrl);
        });
      });

    // Accept application buttons - mobile
    document
      .querySelectorAll(".accept-application-btn-mobile")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          const applicationId = e.currentTarget.getAttribute(
            "data-application-id"
          );
          this.updateApplicationStatus(applicationId, "accepted");
        });
      });

    // Reject application buttons - mobile
    document
      .querySelectorAll(".reject-application-btn-mobile")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          const applicationId = e.currentTarget.getAttribute(
            "data-application-id"
          );
          this.updateApplicationStatus(applicationId, "rejected");
        });
      });
  }

  async editTraining() {
    // Redirect to edit page with training ID
    const trainingId = new URLSearchParams(window.location.search).get("id");
    window.location.href = `edit_industrial_training.html?id=${trainingId}`;
  }

  async toggleTrainingStatus() {
    if (!this.currentTraining) return;

    const newStatus =
      this.currentTraining.status === "open" ? "closed" : "open";
    const confirmMessage =
      newStatus === "closed"
        ? "Are you sure you want to close this training opportunity? This will stop accepting new applications."
        : "Are you sure you want to reopen this training opportunity?";

    if (!confirm(confirmMessage)) return;

    this.showLoadingDialog(
      `${newStatus === "closed" ? "Closing" : "Opening"} training...`
    );

    try {
      await auth.authStateReady();
      await this.companyCloud.setITStatus(
        auth.currentUser.uid,
        this.currentTraining.id,
        newStatus
      );

      // Update local state
      this.currentTraining.status = newStatus;

      // Update UI
      this.updateStatusBadge(newStatus);
      this.hideLoadingDialog();

      this.showNotification(
        `Training opportunity ${
          newStatus === "closed" ? "closed" : "opened"
        } successfully!`,
        "success"
      );
    } catch (error) {
      console.error("Error updating training status:", error);
      this.hideLoadingDialog();
      this.showNotification("Failed to update training status", "error");
    }
  }

  getApplicationStatusBadge(status) {
    const statusConfig = {
      pending: {
        class:
          "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
        text: "Pending",
      },
      under_review: {
        class:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
        text: "Under Review",
      },
      accepted: {
        class:
          "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
        text: "Accepted",
      },
      rejected: {
        class: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
        text: "Rejected",
      },
      hired: {
        class:
          "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
        text: "Hired",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              config.class
            }">
                <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${
                  status === "pending"
                    ? "bg-yellow-500"
                    : status === "accepted"
                    ? "bg-green-500"
                    : status === "rejected"
                    ? "bg-red-500"
                    : status === "under_review"
                    ? "bg-blue-500"
                    : "bg-purple-500"
                }"></span>
                ${config.text}
            </span>
        `;
  }

  attachApplicationEventListeners(applications) {
    // View application buttons
    document.querySelectorAll(".view-application-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const applicationId = e.currentTarget.getAttribute(
          "data-application-id"
        );
        this.viewApplicationDetails(applicationId, applications);
      });
    });

    // Download resume buttons
    document.querySelectorAll(".download-resume-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const resumeUrl = e.currentTarget.getAttribute("data-resume-url");
        this.downloadResume(resumeUrl);
      });
    });

    // Accept application buttons
    document.querySelectorAll(".accept-application-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const applicationId = e.currentTarget.getAttribute(
          "data-application-id"
        );
        this.acceptApplication(applicationId);
      });
    });

    // Reject application buttons
    document.querySelectorAll(".reject-application-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const applicationId = e.currentTarget.getAttribute(
          "data-application-id"
        );
        this.rejectApplication(applicationId);
      });
    });

    // Change status buttons (for non-pending applications)
    document.querySelectorAll(".change-status-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const applicationId = e.currentTarget.getAttribute(
          "data-application-id"
        );
        const currentStatus = e.currentTarget.getAttribute(
          "data-current-status"
        );
        this.showStatusChangeModal(applicationId, currentStatus);
      });
    });
  }

  // New methods for accepting/rejecting applications
  async acceptApplication(applicationId) {
    if (!confirm("Are you sure you want to accept this application?")) {
      return;
    }

    try {
      this.showLoadingDialog("Accepting application...");
      await this.updateApplicationStatus(applicationId, "accepted");
      this.showNotification("Application accepted successfully!", "success");
    } catch (error) {
      console.error("Error accepting application:", error);
      this.showNotification("Failed to accept application", "error");
    }
  }

  async rejectApplication(applicationId) {
    if (!confirm("Are you sure you want to reject this application?")) {
      return;
    }

    try {
      this.showLoadingDialog("Rejecting application...");
      await this.updateApplicationStatus(applicationId, "rejected");
      this.showNotification("Application rejected successfully!", "success");
    } catch (error) {
      console.error("Error rejecting application:", error);
      this.showNotification("Failed to reject application", "error");
    }
  }

  // Method to show status change modal for non-pending applications
  showStatusChangeModal(applicationId, currentStatus) {
    const modalHtml = `
        <div id="status-change-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full">
                <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Change Application Status</h3>
                    <button id="close-status-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div class="p-6">
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Current status: <span class="font-medium ${this.getStatusColorClass(
                          currentStatus
                        )}">${this.getApplicationStatusText(
      currentStatus
    )}</span>
                    </p>
                    
                    <div class="space-y-2">
                        <!-- Pending Option -->
                        ${
                          currentStatus !== "pending"
                            ? `
                            <button class="status-change-option w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3 transition-all hover:scale-[1.02]"
                                    data-status="pending"
                                    data-application-id="${applicationId}">
                                <span class="material-symbols-outlined text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">schedule</span>
                                <div>
                                    <div class="font-medium">Pending</div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400">Set back to pending review</div>
                                </div>
                                <span class="ml-auto material-symbols-outlined text-gray-400">arrow_forward</span>
                            </button>
                        `
                            : ""
                        }
                        
                        <!-- Accepted Option -->
                        ${
                          currentStatus !== "accepted"
                            ? `
                            <button class="status-change-option w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3 transition-all hover:scale-[1.02]"
                                    data-status="accepted"
                                    data-application-id="${applicationId}">
                                <span class="material-symbols-outlined text-green-500 bg-green-100 dark:bg-green-900/30 p-2 rounded-full">check_circle</span>
                                <div>
                                    <div class="font-medium">Accepted</div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400">Accept the application</div>
                                </div>
                                <span class="ml-auto material-symbols-outlined text-gray-400">arrow_forward</span>
                            </button>
                        `
                            : ""
                        }
                        
                        <!-- Rejected Option -->
                        ${
                          currentStatus !== "rejected"
                            ? `
                            <button class="status-change-option w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3 transition-all hover:scale-[1.02]"
                                    data-status="rejected"
                                    data-application-id="${applicationId}">
                                <span class="material-symbols-outlined text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded-full">cancel</span>
                                <div>
                                    <div class="font-medium">Rejected</div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400">Reject the application</div>
                                </div>
                                <span class="ml-auto material-symbols-outlined text-gray-400">arrow_forward</span>
                            </button>
                        `
                            : ""
                        }
                        
                        <!-- Current Status Indicator (only shows if no other options available) -->
                        ${
                          currentStatus === "pending" ||
                          currentStatus === "accepted" ||
                          currentStatus === "rejected"
                            ? `
                            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div class="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <span class="material-symbols-outlined text-lg ${this.getStatusIconColor(
                                      currentStatus
                                    )}">
                                        ${
                                          currentStatus === "pending"
                                            ? "schedule"
                                            : currentStatus === "accepted"
                                            ? "check_circle"
                                            : "cancel"
                                        }
                                    </span>
                                    <span class="font-medium ${this.getStatusTextColor(
                                      currentStatus
                                    )}">Currently ${this.getApplicationStatusText(
                                currentStatus
                              )}</span>
                                </div>
                            </div>
                        `
                            : ""
                        }
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Add event listeners for modal
    document
      .getElementById("close-status-modal")
      .addEventListener("click", () => {
        this.closeStatusChangeModal();
      });

    // Status change option buttons
    document.querySelectorAll(".status-change-option").forEach((button) => {
      button.addEventListener("click", (e) => {
        const newStatus = e.currentTarget.getAttribute("data-status");
        const appId = e.currentTarget.getAttribute("data-application-id");

        // Add confirmation for reject action
        if (newStatus === "rejected") {
          if (
            !confirm(
              "Are you sure you want to reject this application? This action cannot be undone."
            )
          ) {
            return;
          }
        }

        this.updateApplicationStatus(appId, newStatus);
        this.closeStatusChangeModal();
      });
    });

    // Close modal when clicking outside
    document
      .getElementById("status-change-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "status-change-modal") {
          this.closeStatusChangeModal();
        }
      });
  }
  getStatusColorClass(status) {
    const colorClasses = {
      pending: "text-yellow-600 dark:text-yellow-400",
      accepted: "text-green-600 dark:text-green-400",
      rejected: "text-red-600 dark:text-red-400",
    };

    return colorClasses[status] || "text-gray-600 dark:text-gray-400";
  }

  // Helper method to get status icon color
  getStatusIconColor(status) {
    const iconColors = {
      pending: "text-yellow-500",
      accepted: "text-green-500",
      rejected: "text-red-500",
    };

    return iconColors[status] || "text-gray-500";
  }

  getStatusTextColor(status) {
    const textColors = {
      pending: "text-yellow-700 dark:text-yellow-300",
      accepted: "text-green-700 dark:text-green-300",
      rejected: "text-red-700 dark:text-red-300",
    };

    return textColors[status] || "text-gray-700 dark:text-gray-300";
  }

  closeStatusChangeModal() {
    const modal = document.getElementById("status-change-modal");
    if (modal) {
      modal.remove();
    }
  }

  // Helper method to get status text
  getApplicationStatusText(status) {
    const statusTexts = {
      pending: "Pending",
      under_review: "Pending",
      accepted: "Accepted",
      rejected: "Rejected",
      hired: "Accepted",
    };

    return statusTexts[status] || "Unknown";
  }

  async viewApplicationDetails(applicationId, applications) {
    const application = applications.find((app) => app.id === applicationId);
    if (!application) return;

    // Create and show application details modal
    this.showApplicationModal(application);
  }

  showApplicationModal(application) {
    const modalHtml = `
            <div id="application-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div class="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Application Details</h3>
                        <button id="close-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    <div class="p-6 space-y-6">
                        <!-- Student Information -->
                        <div>
                            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Student Information</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label class="text-gray-500 dark:text-gray-400">Name</label>
                                    <p class="text-gray-900 dark:text-white">${
                                      application.student?.name || "N/A"
                                    }</p>
                                </div>
                                <div>
                                    <label class="text-gray-500 dark:text-gray-400">Email</label>
                                    <p class="text-gray-900 dark:text-white">${
                                      application.student?.email || "N/A"
                                    }</p>
                                </div>
                                <div>
                                    <label class="text-gray-500 dark:text-gray-400">Course</label>
                                    <p class="text-gray-900 dark:text-white">${
                                      application.student?.courseOfStudy ||
                                      "N/A"
                                    }</p>
                                </div>
                                <div>
                                    <label class="text-gray-500 dark:text-gray-400">Institution</label>
                                    <p class="text-gray-900 dark:text-white">${
                                      application.student?.institution || "N/A"
                                    }</p>
                                </div>
                            </div>
                        </div>

                        <!-- Application Details -->
                        <div>
                            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Application Details</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label class="text-gray-500 dark:text-gray-400">Applied On</label>
                                    <p class="text-gray-900 dark:text-white">${this.formatTimestamp(
                                      application.applicationDate,
                                      "long"
                                    )}</p>
                                </div>
                                <div>
                                    <label class="text-gray-500 dark:text-gray-400">Status</label>
                                    <div class="mt-1">${this.getApplicationStatusBadge(
                                      application.applicationStatus
                                    )}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            ${
                              application.student?.resumeURL
                                ? `
                                <button class="download-resume-modal-btn px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        data-resume-url="${application.student.resumeURL}">
                                    Download Resume
                                </button>
                            `
                                : ""
                            }
                            
                            ${
                              application.applicationStatus === "pending"
                                ? `
                                <div class="flex gap-2">
                                    <button class="reject-application-btn px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                            data-application-id="${application.id}">
                                        Reject
                                    </button>
                                    <button class="accept-application-btn px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                            data-application-id="${application.id}">
                                        Accept
                                    </button>
                                </div>
                            `
                                : ""
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Add event listeners for modal
    document.getElementById("close-modal").addEventListener("click", () => {
      this.closeApplicationModal();
    });

    // Download resume from modal
    const downloadBtn = document.querySelector(".download-resume-modal-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", (e) => {
        const resumeUrl = e.currentTarget.getAttribute("data-resume-url");
        this.downloadResume(resumeUrl);
      });
    }

    // Accept/Reject buttons in modal
    const acceptBtn = document.querySelector(".accept-application-btn");
    const rejectBtn = document.querySelector(".reject-application-btn");

    if (acceptBtn) {
      acceptBtn.addEventListener("click", (e) => {
        const applicationId = e.currentTarget.getAttribute(
          "data-application-id"
        );
        this.updateApplicationStatus(applicationId, "accepted");
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", (e) => {
        const applicationId = e.currentTarget.getAttribute(
          "data-application-id"
        );
        this.updateApplicationStatus(applicationId, "rejected");
      });
    }

    // Close modal when clicking outside
    document
      .getElementById("application-modal")
      .addEventListener("click", (e) => {
        if (e.target.id === "application-modal") {
          this.closeApplicationModal();
        }
      });
  }

  closeApplicationModal() {
    const modal = document.getElementById("application-modal");
    if (modal) {
      modal.remove();
    }
  }

  downloadResume(resumeUrl) {
    if (!resumeUrl) {
      this.showNotification("No resume available for download", "warning");
      return;
    }

    // Open resume in new tab or trigger download
    window.open(resumeUrl, "_blank");
  }

  showStatusDropdown(button, applicationId) {
    // Remove existing dropdowns
    this.closeAllDropdowns();

    const dropdown = document.createElement("div");
    dropdown.className =
      "absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1";
    dropdown.innerHTML = `
            <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    data-status="under_review" data-application-id="${applicationId}">
                <span class="material-symbols-outlined text-blue-500 text-sm">visibility</span>
                Mark as Under Review
            </button>
            <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    data-status="accepted" data-application-id="${applicationId}">
                <span class="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                Accept Application
            </button>
            <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    data-status="rejected" data-application-id="${applicationId}">
                <span class="material-symbols-outlined text-red-500 text-sm">cancel</span>
                Reject Application
            </button>
        `;

    button.parentElement.style.position = "relative";
    button.parentElement.appendChild(dropdown);

    // Add event listeners to dropdown options
    dropdown.querySelectorAll(".status-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const status = e.currentTarget.getAttribute("data-status");
        const appId = e.currentTarget.getAttribute("data-application-id");
        this.updateApplicationStatus(appId, status);
        dropdown.remove();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      dropdown.remove();
    });
  }

  closeAllDropdowns() {
    const dropdowns = document.querySelectorAll(
      ".absolute.border.rounded-lg.shadow-lg"
    );
    dropdowns.forEach((dropdown) => dropdown.remove());
  }

  async updateApplicationStatus(applicationId, newStatus) {
    try {
      this.showLoadingDialog("Updating application status...");

      await auth.authStateReady();
      await this.companyCloud.updateApplicationStatus(
        auth.currentUser.uid,
        this.trainingId,
        applicationId,
        newStatus
      );

      // Reload applications to reflect the change
      await this.showApplicationsTab();

      this.hideLoadingDialog();
      this.showNotification(`Application ${newStatus} successfully`, "success");
    } catch (error) {
      console.error("Error updating application status:", error);
      this.hideLoadingDialog();
      this.showNotification("Failed to update application status", "error");
    }
  }

  updateApplicationsOverviewWithData(applications) {
    if (!applications) return;

    const totalApplications = applications.length;
    const pendingCount = applications.filter(
      (app) => app.applicationStatus === "pending"
    ).length;
    const acceptedCount = applications.filter(
      (app) => app.applicationStatus === "accepted"
    ).length;
    const rejectedCount = applications.filter(
      (app) => app.applicationStatus === "rejected"
    ).length;

    // Update overview cards if they exist
    this.setElementText("total-applications", totalApplications.toString());
    this.setElementText("pending-applications", pendingCount.toString());
    this.setElementText("accepted-applications", acceptedCount.toString());
    this.setElementText("rejected-applications", rejectedCount.toString());
  }

  // Utility methods
  setElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
    }
  }

  formatTimestamp(timestamp, format = "medium") {
    if (!timestamp) return "Not specified";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

      const formats = {
        short: () => date.toLocaleDateString("en-US"),
        medium: () =>
          date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        long: () =>
          date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
      };

      return formats[format] ? formats[format]() : date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid date";
    }
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

window.addEventListener("DOMContentLoaded", () => {
  new ITPostView();
});
