import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
import { auth, db } from "../../../js/config/firebaseInit.js";
import generalmethods, {
  getAvatarElement,
  getAvatarElementImg,
} from "../../../js/general/generalmethods.js";
const companyCloud = new ITBaseCompanyCloud();
const it_base_company_cloud = new ITBaseCompanyCloud();

class ApplicationsManager {
  constructor() {
    this.applications = [];
    this.filteredApplications = [];
    this.currentFilters = {
      search: "",
      opportunity: "",
      status: "",
    };
    this.hasSearched = false;
    this.isInitialLoad = true;

    this.init();
  }

  async init() {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) {
      alert("Account not found, you'll be logged out");
      window.location.href = "../company_login.html";
      return;
    }

    this.bindEvents();
    await this.loadApplications();
    this.renderApplications();
  }

  bindEvents() {
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", (e) => {
      this.hasSearched = true;
      this.currentFilters.search = e.target.value.toLowerCase();
      this.filterApplications();
    });

    const opportunityFilter = document.getElementById("opportunity-filter");
    opportunityFilter.addEventListener("change", (e) => {
      this.hasSearched = true;
      this.currentFilters.opportunity = e.target.value;
      this.filterApplications();
    });

    const statusFilter = document.getElementById("status-filter");
    statusFilter.addEventListener("change", (e) => {
      this.hasSearched = true;
      this.currentFilters.status = e.target.value;
      this.filterApplications();
    });
  }

  async loadApplications() {
    try {
      this.showLoadingState();

      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get all applications using the corrected method
      const applicationsData = await companyCloud.getAllCompanyApplications(
        user.uid
      );

      // Transform the data to match your UI expectations
      this.applications = applicationsData.map((item) => {
        const app = item.application; // This is the StudentApplication instance
        return {
          // Application data from StudentApplication instance
          id: app.id,
          studentName: app.studentName,
          studentEmail: app.studentEmail,
          status: app.applicationStatus,
          applicationDate: app.applicationDate,
          coverLetter: app.coverLetter,
          resumeURL: app.resumeURL,

          // Additional data from the mapping
          opportunity: item.opportunity,
          opportunityId: item.opportunityId,
          training: item.training,

          // Student data for search
          student: app.student,

          // For compatibility with existing code
          email: app.studentEmail,
        };
      });

      ////console.log("Loaded applications:", this.applications);

      // Populate opportunities dropdown
      this.populateOpportunitiesDropdown();

      this.filteredApplications = [...this.applications];
      this.renderApplications();
    } catch (error) {
      console.error("Error loading applications:", error);
      this.showError("Failed to load applications: " + error.message);
      this.showEmptyState();
    }
  }

  populateOpportunitiesDropdown() {
    const opportunityFilter = document.getElementById("opportunity-filter");
    const opportunities = [
      ...new Set(
        this.applications.map((app) => app.opportunity).filter(Boolean)
      ),
    ];

    // Clear existing options except the first one
    while (opportunityFilter.options.length > 1) {
      opportunityFilter.remove(1);
    }

    // Add opportunities to dropdown
    opportunities.forEach((opportunity) => {
      const option = document.createElement("option");
      option.value = opportunity;
      option.textContent = opportunity;
      opportunityFilter.appendChild(option);
    });
  }

  filterApplications() {
    this.filteredApplications = this.applications.filter((application) => {
      const matchesSearch =
        !this.currentFilters.search ||
        application.studentName
          ?.toLowerCase()
          .includes(this.currentFilters.search) ||
        application.studentEmail
          ?.toLowerCase()
          .includes(this.currentFilters.search) ||
        application.email?.toLowerCase().includes(this.currentFilters.search);

      const matchesOpportunity =
        !this.currentFilters.opportunity ||
        application.opportunity === this.currentFilters.opportunity;

      const matchesStatus =
        !this.currentFilters.status ||
        application.status === this.currentFilters.status.toLowerCase();

      return matchesSearch && matchesOpportunity && matchesStatus;
    });

    this.renderApplications();
  }

  renderApplications() {
    this.hideAllStates();

    if (this.filteredApplications.length === 0) {
      if (this.isInitialLoad && this.applications.length === 0) {
        this.showEmptyState("No applications yet");
      } else if (this.hasSearched) {
        this.showEmptyState("No applications match your filters");
      } else {
        this.showEmptyState("No applications to display");
      }
      this.isInitialLoad = false;
      return;
    }

    this.isInitialLoad = false;

    const tableContainer = document.getElementById(
      "applications-table-container"
    );
    const listContainer = document.getElementById(
      "applications-list-container"
    );

    if (window.innerWidth >= 640) {
      // Show table on sm+ screens
      tableContainer.classList.remove("hidden");
      listContainer.classList.add("hidden");
    } else {
      // Show list on mobile
      tableContainer.classList.add("hidden");
      listContainer.classList.remove("hidden");
    }

    this.renderDesktopTable();
    this.renderMobileList();
  }

  renderDesktopTable() {
    const tableBody = document.getElementById("applications-table-body");

    tableBody.innerHTML = this.filteredApplications
      .map(
        (application, index) => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <td class="px-4 sm:px-6 py-4">
        <div class="flex items-center">
            ${getAvatarElementImg(
              application.studentName,
              application.student.imageUrl
            )}
            <div class="ml-4">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                    ${application.studentName || "N/A"}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    ${
                      application.studentEmail ||
                      application.email ||
                      "No email"
                    }
                </div>
            </div>
        </div>
    </td>
    <td class="px-4 sm:px-6 py-4 text-sm text-gray-900 dark:text-white">
        ${application.opportunity || "N/A"}
    </td>
    <td class="px-4 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        ${this.formatDate(application.applicationDate)}
    </td>
    <td class="px-4 sm:px-6 py-4">
        ${this.getStatusBadge(application.status)}
    </td>
    <td class="px-4 sm:px-6 py-4 text-sm font-medium">
        <div class="flex items-center space-x-2">
            <button 
                onclick="applicationsManager.viewApplication(${index})"
                class="text-primary hover:text-primary/80 transition-colors p-1 rounded"
                title="View Details"
            >
                <span class="material-symbols-outlined text-lg">visibility</span>
            </button>
            
            ${
              application.status.toLowerCase() === "pending" ||
              application.status.toLowerCase() === "pend"
                ? `
            <button 
                onclick="applicationsManager.acceptApplication(${index})"
                class="text-success hover:text-success/80 transition-colors p-1 rounded"
                title="Accept"
            >
                <span class="material-symbols-outlined text-lg">check_circle</span>
            </button>
            <button 
                onclick="applicationsManager.rejectApplication(${index})"
                class="text-danger hover:text-danger/80 transition-colors p-1 rounded"
                title="Reject"
            >
                <span class="material-symbols-outlined text-lg">cancel</span>
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
  }

  renderMobileList() {
    const listBody = document.getElementById("applications-list-body");

    listBody.innerHTML = this.filteredApplications
      .map(
        (application, index) => `
            <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                         ${getAvatarElementImg(
                           application.studentName,
                           application.student.imageUrl
                         )}
                        <div>
                            <div class="font-medium text-gray-900 dark:text-white">
                                ${application.studentName || "N/A"}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                ${
                                  application.studentEmail ||
                                  application.email ||
                                  "No email"
                                }
                            </div>
                        </div>
                    </div>
                    ${this.getStatusBadge(application.status)}
                </div>
                
                <div class="space-y-2 text-sm mb-4">
                    <div class="flex justify-between">
                        <span class="text-gray-500 dark:text-gray-400">Opportunity:</span>
                        <span class="text-gray-900 dark:text-white font-medium">${
                          application.opportunity || "N/A"
                        }</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500 dark:text-gray-400">Applied:</span>
                        <span class="text-gray-900 dark:text-white">${this.formatDate(
                          application.applicationDate
                        )}</span>
                    </div>
                </div>
                
                <div class="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div class="flex space-x-2">
                        <button 
                            onclick="applicationsManager.viewApplication(${index})"
                            class="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors p-2 rounded-lg"
                        >
                            <span class="material-symbols-outlined text-sm">visibility</span>
                            <span class="text-xs">View</span>
                        </button>
                        <button 
                            onclick="applicationsManager.acceptApplication(${index})"
                            class="flex items-center space-x-1 text-success hover:text-success/80 transition-colors p-2 rounded-lg"
                        >
                            <span class="material-symbols-outlined text-sm">check_circle</span>
                            <span class="text-xs">Accept</span>
                        </button>
                        <button 
                            onclick="applicationsManager.rejectApplication(${index})"
                            class="flex items-center space-x-1 text-danger hover:text-danger/80 transition-colors p-2 rounded-lg"
                        >
                            <span class="material-symbols-outlined text-sm">cancel</span>
                            <span class="text-xs">Reject</span>
                        </button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  // FIXED: Don't override responsive CSS classes
  hideAllStates() {
    document.getElementById("loading-state").classList.add("hidden");
    document.getElementById("empty-state").classList.add("hidden");
  }

  showLoadingState() {
    document.getElementById("loading-state").classList.remove("hidden");
    document.getElementById("empty-state").classList.add("hidden");

    // Hide both table and list during loading
    document
      .getElementById("applications-table-container")
      .classList.add("hidden");
    document
      .getElementById("applications-list-container")
      .classList.add("hidden");
  }

  showEmptyState(message = "No applications found") {
    document.getElementById("loading-state").classList.add("hidden");

    const emptyState = document.getElementById("empty-state");
    emptyState.classList.remove("hidden");
    emptyState.querySelector("h3").textContent = message;

    // Hide both table and list when empty
    document
      .getElementById("applications-table-container")
      .classList.add("hidden");
    document
      .getElementById("applications-list-container")
      .classList.add("hidden");
  }

  clearFilters() {
    this.currentFilters = {
      search: "",
      opportunity: "",
      status: "",
    };

    document.getElementById("search-input").value = "";
    document.getElementById("opportunity-filter").value = "";
    document.getElementById("status-filter").value = "";

    this.filteredApplications = [...this.applications];
    this.renderApplications();
  }

  getStatusBadge(status) {
    const statusConfig = {
      new: {
        class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        text: "New",
      },
      reviewed: {
        class: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
        text: "Reviewed",
      },
      interview: {
        class:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        text: "Interview",
      },
      hired: { class: "bg-success text-white", text: "Hired" },
      rejected: { class: "bg-danger text-white", text: "Rejected" },
      applied: {
        class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        text: "Applied",
      },
      pending: {
        class:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        text: "Pending",
      },
      accepted: { class: "bg-success text-white", text: "Accepted" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return `<span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.class}">${config.text}</span>`;
  }

  formatDate(dateValue) {
    if (!dateValue) return "N/A";

    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  }

  viewApplication(applicationIndex) {
    const application = this.filteredApplications[applicationIndex];
    // //console.log("applciations "+JSON.stringify(application));
    if (application) {
      if (application.training.id && application.id) {
        window.location.href = `student_profile.html?itid=${application.training.id}&id=${application.id}`;
      }
    }
  }

  async acceptApplication(applicationIndex) {
    const application = this.filteredApplications[applicationIndex];
    if (application.status === "accepted") {
      alert("Application is already Accepted ");
      return;
    }
    this.currentApplication = application;
    if (!application) return;

    if (
      confirm(
        `Accept ${application.studentName}'s application for ${application.opportunity}?`
      )
    ) {
      try {
        await this.updateApplicationStatusInFirebase(application, "accepted");
        application.status = "accepted";
        this.renderApplications();
        this.showSuccess("Application accepted successfully");
        this.messageDialog(true);
      } catch (error) {
        console.error("Error accepting application:", error);
        this.showError("Failed to accept application: " + error.message);
      }
    }
  }

  async rejectApplication(applicationIndex) {
    const application = this.filteredApplications[applicationIndex];
    if (application.status === "rejected") {
      alert("Application is already rejected ");
      return;
    }
    if (!application) return;

    if (
      confirm(
        `Reject ${application.studentName}'s application for ${application.opportunity}?`
      )
    ) {
      try {
        await this.updateApplicationStatusInFirebase(application, "rejected");
        application.status = "rejected";
        this.renderApplications();
        this.showSuccess("Application rejected");
        this.messageDialog(true);
      } catch (error) {
        console.error("Error rejecting application:", error);
        this.showError("Failed to reject application: " + error.message);
      }
    }
  }

  showApplicationModal(application) {
    // Get skills from student data if available
    const skills =
      application.student?.skills || application.student?.qualifications || [];

    const coverLetter = application.coverLetter || "No cover letter provided";
    const phone = application.student?.phone || "Not provided";
    const resumeUrl = application.resumeURL || application.resumeUrl || "#";
    const studentId =
      application.student?.id || application.student?.studentId || "N/A";

    const modalHtml = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Application Details
              </h3>
              <button onclick="applicationsManager.closeModal()" class="text-gray-400 hover:text-gray-600">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div class="space-y-4">
              <div>
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">Student Information</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-gray-500 dark:text-gray-400">Name:</span>
                    <span class="ml-2 text-gray-900 dark:text-white">${
                      application.studentName || "N/A"
                    }</span>
                  </div>
                  <div>
                    <span class="text-gray-500 dark:text-gray-400">Student ID:</span>
                    <span class="ml-2 text-gray-900 dark:text-white">${studentId}</span>
                  </div>
                  <div>
                    <span class="text-gray-500 dark:text-gray-400">Email:</span>
                    <span class="ml-2 text-gray-900 dark:text-white">${
                      application.studentEmail || application.email || "N/A"
                    }</span>
                  </div>
                  <div>
                    <span class="text-gray-500 dark:text-gray-400">Phone:</span>
                    <span class="ml-2 text-gray-900 dark:text-white">${phone}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">Opportunity</h4>
                <p class="text-sm text-gray-600 dark:text-gray-300">${
                  application.opportunity || "N/A"
                }</p>
              </div>

              ${
                skills.length > 0
                  ? `
              <div>
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">Skills & Qualifications</h4>
                <div class="flex flex-wrap gap-2">
                  ${skills
                    .map(
                      (skill) => `
                    <span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">${skill}</span>
                  `
                    )
                    .join("")}
                </div>
              </div>
              `
                  : ""
              }

              <div>
                <h4 class="font-medium text-gray-900 dark:text-white mb-2">Cover Letter</h4>
                <p class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">${coverLetter}</p>
              </div>

              <div class="flex gap-3 pt-4">
                ${
                  resumeUrl !== "#"
                    ? `
                <a href="${resumeUrl}" target="_blank" 
                   class="flex-1 bg-primary text-white py-2 px-4 rounded text-center hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2">
                  <span class="material-symbols-outlined text-sm">description</span>
                  <span>View Resume</span>
                </a>
                `
                    : `
                <button disabled
                   class="flex-1 bg-gray-300 text-gray-500 py-2 px-4 rounded text-center cursor-not-allowed flex items-center justify-center space-x-2">
                  <span class="material-symbols-outlined text-sm">description</span>
                  <span>Resume Not Available</span>
                </button>
                `
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.closeModal();
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  closeModal() {
    const existingModal = document.querySelector(".fixed.inset-0.bg-black");
    if (existingModal) {
      existingModal.remove();
    }
  }

  async updateApplicationStatusInFirebase(application, newStatus) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      // Use the existing method from ITBaseCompanyCloud
      await companyCloud.updateApplicationStatus(
        user.uid,
        application.opportunityId,
        application.id,
        newStatus,
        application.student.uid
      );
    } catch (error) {
      console.error("Error updating application in Firebase:", error);
      throw error;
    }
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
                value="${this.currentApplication.student.fullName || ""}"
                style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
        </div>

        <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 6px; font-weight: 500;">Message</label>
            <textarea id="message-text" rows="6" placeholder="Type your message to the student..."
                    style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-family: inherit;">
Hello ${this.currentApplication.student.fullName || "Student"},

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
      modal
        .querySelector("#cancel-message")
        .addEventListener("click", closeModal);
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
        const companyName = this.currentApplication.training.company.name;

        if (!studentUid || !companyName) {
          alert("Student information is missing");
          setLoadingState(false);
          return;
        }

        const result = await it_base_company_cloud.sendNotificationToStudent(
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
        console.error(error);
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

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    const bgColor = type === "success" ? "bg-success" : "bg-danger";
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2`;
    notification.innerHTML = `
      <span class="material-symbols-outlined">${
        type === "success" ? "check_circle" : "error"
      }</span>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  async refreshApplications() {
    await this.loadApplications();
  }
}

// Initialize the applications manager when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.applicationsManager = new ApplicationsManager();
});
