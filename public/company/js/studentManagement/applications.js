import {
  generateShareableUrl,
  getAvatarInitials,
  messageDialog,
} from "../../../js/general/generalmethods.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
const it_base_companycloud = new ITBaseCompanyCloud();

export default class Applications {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.fullName = "Applications";
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.selectedApplications = new Set();
    this.filteredApplications = [];
    this.currentFilters = {
      name: '',
      training: '',
      status: ''
    };
  }

  async init() {
    //console.log("Initializing Applications Tab");
    this.initializeElements();
    this.initializeEventListeners();
    await this.buildApplicationsContent();
  }

  refresh(tabManager) {
    this.tabManager = tabManager;
    this.buildApplicationsContent();
  }

  initializeElements() {
    // Table and mobile list elements
    this.applicationsTableBody = document.getElementById(
      "applications-table-body"
    );
    this.applicationsMobileList = document.getElementById(
      "applications-mobile-list"
    );
    this.selectAllCheckbox = document.getElementById("select-all-applications");
    this.exportBtn = document.getElementById("export-applications-btn");
    this.bulkActionsBtn = document.getElementById("bulk-actions-btn");

    // Pagination elements
    this.prevPageBtn = document.getElementById("prev-page");
    this.nextPageBtn = document.getElementById("next-page");
    this.paginationNumbers = document.getElementById("pagination-numbers");
    this.paginationStart = document.getElementById("pagination-start");
    this.paginationEnd = document.getElementById("pagination-end");
    this.paginationTotal = document.getElementById("pagination-total");

    // Filter elements
    this.nameFilter = document.getElementById("name-filter");
    this.trainingFilter = document.getElementById("training-filter");
    this.statusFilter = document.getElementById("status-filter");
    this.clearFiltersBtn = document.getElementById("clear-filters");

    //console.log("Applications elements initialized");
  }

  initializeEventListeners() {
    // Select all checkbox
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.addEventListener("change", (e) => {
        this.handleSelectAll(e.target.checked);
      });
    }

    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        this.exportApplications();
      });
    }

    // Bulk actions button
    if (this.bulkActionsBtn) {
      this.bulkActionsBtn.addEventListener("click", () => {
        this.showBulkActions();
      });
    }

    // Pagination
    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener("click", () => {
        this.previousPage();
      });
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () => {
        this.nextPage();
      });
    }

    // Filter event listeners
    if (this.nameFilter) {
      this.nameFilter.addEventListener("input", (e) => {
        this.handleFilterChange('name', e.target.value);
      });
    }

    if (this.trainingFilter) {
      this.trainingFilter.addEventListener("change", (e) => {
        this.handleFilterChange('training', e.target.value);
      });
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener("change", (e) => {
        this.handleFilterChange('status', e.target.value);
      });
    }

    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener("click", () => {
        this.clearFilters();
      });
    }

    // Listen to global filter changes from TabManager
    this.setupGlobalFilterListeners();
  }

  handleFilterChange(filterType, value) {
    this.currentFilters[filterType] = value;
    this.currentPage = 1; // Reset to first page when filtering
    this.buildApplicationsContent();
  }

  clearFilters() {
    // Reset filter inputs
    if (this.nameFilter) this.nameFilter.value = '';
    if (this.trainingFilter) this.trainingFilter.value = '';
    if (this.statusFilter) this.statusFilter.value = '';

    // Reset filter state
    this.currentFilters = {
      name: '',
      training: '',
      status: ''
    };

    this.currentPage = 1;
    this.buildApplicationsContent();
  }

  setupGlobalFilterListeners() {
    // These would be connected to the global search and filters
    // from the main dashboard through the TabManager
  }

  async buildApplicationsContent() {
    console.log("Building applications content...");

    const applications = this.tabManager.getAllCompanyApplications();
    this.filteredApplications = this.applyFilters(applications);

    // Populate training filter dropdown
    this.populateTrainingFilter(applications);

    this.renderApplicationsTable();
    this.updatePagination();
  }

  populateTrainingFilter(applications) {
    if (!this.trainingFilter) return;

    // Get unique training opportunities
    const trainings = new Set();
    applications.forEach(app => {
      const training = app.opportunity || app.training?.title || 'Unknown Training';
      if (training) {
        trainings.add(training);
      }
    });

    // Get current value before clearing
    const currentValue = this.trainingFilter.value;

    // Clear existing options except the first one
    const defaultOption = this.trainingFilter.querySelector('option[value=""]');
    this.trainingFilter.innerHTML = '';
    if (defaultOption) {
      this.trainingFilter.appendChild(defaultOption);
    } else {
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'All Trainings';
      this.trainingFilter.appendChild(defaultOption);
    }

    // Add training options
    Array.from(trainings).sort().forEach(training => {
      const option = document.createElement('option');
      option.value = training;
      option.textContent = training;
      this.trainingFilter.appendChild(option);
    });

    // Restore current value if it still exists
    if (currentValue && Array.from(trainings).includes(currentValue)) {
      this.trainingFilter.value = currentValue;
    }
  }

  applyFilters(applications) {
    let filtered = [...applications];

    // Name filter
    if (this.currentFilters.name) {
      const searchTerm = this.currentFilters.name.toLowerCase();
      filtered = filtered.filter((app) => {
        const student = app.application.student || {};
        return (
          (student.fullName || "").toLowerCase().includes(searchTerm) ||
          (student.email || "").toLowerCase().includes(searchTerm)
        );
      });
    }

    // Training filter
    if (this.currentFilters.training) {
      filtered = filtered.filter((app) => {
        const training = app.opportunity || app.training?.title || '';
        return training === this.currentFilters.training;
      });
    }

    // Status filter
    if (this.currentFilters.status) {
      filtered = filtered.filter((app) => {
        const status = app.application.status || app.application.applicationStatus || '';
        return status.toLowerCase() === this.currentFilters.status.toLowerCase();
      });
    }

    return filtered;
  }

  renderApplicationsTable() {
    if (!this.applicationsTableBody && !this.applicationsMobileList) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentApplications = this.filteredApplications.slice(
      startIndex,
      endIndex
    );

    // Clear both table and mobile list
    if (this.applicationsTableBody) {
      this.applicationsTableBody.innerHTML = "";
    }
    if (this.applicationsMobileList) {
      this.applicationsMobileList.innerHTML = "";
    }

    if (currentApplications.length === 0) {
      const emptyMessage = `
        <tr>
          <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <div class="flex flex-col items-center">
              <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">inbox</span>
              <p class="text-lg font-medium mb-1">No applications found</p>
              <p class="text-sm">Try adjusting your search or filters</p>
            </div>
          </td>
        </tr>
      `;

      const mobileEmptyMessage = `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
          <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">inbox</span>
          <p class="text-lg font-medium mb-1 text-gray-500 dark:text-gray-400">No applications found</p>
          <p class="text-sm text-gray-400">Try adjusting your search or filters</p>
        </div>
      `;

      if (this.applicationsTableBody) {
        this.applicationsTableBody.innerHTML = emptyMessage;
      }
      if (this.applicationsMobileList) {
        this.applicationsMobileList.innerHTML = mobileEmptyMessage;
      }
      return;
    }

    // Render desktop table
    if (this.applicationsTableBody) {
      currentApplications.forEach((applicationData, index) => {
        const application = applicationData.application;
        const student = application.student || {};
        const opportunity = applicationData.opportunity || {};
        //console.log("opportunity " + opportunity);
        const applicationId = application.id || `app-${startIndex + index}`;

        const row = this.createApplicationRow(
          applicationId,
          student,
          application,
          opportunity,
          startIndex + index,
          applicationData
        );
        this.applicationsTableBody.appendChild(row);
      });
    }

    // Render mobile list
    if (this.applicationsMobileList) {
      currentApplications.forEach((applicationData, index) => {
        const card = this.createMobileApplicationCard(
          applicationData,
          startIndex + index
        );
        this.applicationsMobileList.appendChild(card);
      });
    }
  }

  createApplicationRow(
    applicationId,
    student,
    application,
    opportunity,
    index,
    appData
  ) {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors";
    row.dataset.applicationId = applicationId;

    const appliedDate = application.applicationDate;
    // console.log(
    //   "Applied date for application ",
    //   applicationId,
    //   " is ",
    //   appliedDate
    // );
    const formattedDate = appliedDate
      ? new Date(appliedDate).toLocaleDateString()
      : "N/A";

    const status = application.status || "pending";
    const statusConfig = this.getStatusConfig(status);

    const avatarContent = getAvatarInitials(student.fullName, student.imageUrl);
    const hasImage = avatarContent.startsWith("url(");

    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <input type="checkbox" class="application-checkbox rounded border-gray-300 text-primary focus:ring-primary" data-application-id="${applicationId}">
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
           <div class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
             hasImage
               ? "bg-cover bg-center"
               : "bg-gradient-to-br from-blue-500 to-purple-600"
           }" ${hasImage ? `style="background-image: ${avatarContent}"` : ""}>
          ${!hasImage ? avatarContent : ""}
        </div>
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              ${student.fullName || "Unknown Student"}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              ${student.email || "No email"}
            </div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-white">${
          opportunity || "N/A"
        }</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-white">${
          student.institution || "N/A"
        }</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${formattedDate}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusConfig.class
        }">
          ${
            statusConfig.icon
              ? `<span class="material-symbols-outlined text-xs mr-1">${statusConfig.icon}</span>`
              : ""
          }
          ${statusConfig.text}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex gap-2">
          <button class="view-application text-primary hover:text-blue-700 transition-colors" data-application-id="${applicationId}">
            <span class="material-symbols-outlined text-base">visibility</span>
          </button>
          <button class="edit-application text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors" data-application-id="${applicationId}">
            <span class="material-symbols-outlined text-base">undo</span>
          </button>
          <button class="delete-application text-red-600 hover:text-red-800 transition-colors" data-application-id="${applicationId}">
            <span class="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </td>
    `;

    // Add event listeners to the row elements
    this.attachRowEventListeners(row, appData);

    return row;
  }

  // New method for mobile cards
  createMobileApplicationCard(applicationData, index) {
    const application = applicationData.application;
    const student = application.student || {};
    const opportunity = applicationData.training || {};
    const applicationId = application.id || `app-${index}`;

    const appliedDate = application.applicationDate;
    const formattedDate = appliedDate
      ? new Date(appliedDate).toLocaleDateString()
      : "N/A";

    const status = application.status || "pending";
    const statusConfig = this.getStatusConfig(status);

    const avatarContent = getAvatarInitials(student.fullName, student.imageUrl);
    const hasImage = avatarContent.startsWith("url(");

    const card = document.createElement("div");
    card.className =
      "bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700";
    card.dataset.applicationId = applicationId;

    card.innerHTML = `
      <!-- Header with checkbox and student info -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <input type="checkbox" class="application-checkbox rounded border-gray-300 text-primary focus:ring-primary" data-application-id="${applicationId}">
          <div class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
            hasImage
              ? "bg-cover bg-center"
              : "bg-gradient-to-br from-blue-500 to-purple-600"
          }" ${hasImage ? `style="background-image: ${avatarContent}"` : ""}>
            ${!hasImage ? avatarContent : ""}
          </div>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusConfig.class
        }">
          ${statusConfig.text}
        </span>
      </div>

      <!-- Student Details -->
      <div class="space-y-2 mb-4">
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white text-sm">${
            student.fullName || "Unknown Student"
          }</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">${
            student.email || "No email"
          }</p>
        </div>
        
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="font-medium text-gray-600 dark:text-gray-300">Industrial Training:</span>
            <p class="text-gray-900 dark:text-white truncate">${
              opportunity.title || "N/A"
            }</p>
          </div>
          <div>
            <span class="font-medium text-gray-600 dark:text-gray-300">Institution:</span>
            <p class="text-gray-900 dark:text-white truncate">${
              student.institution || "N/A"
            }</p>
          </div>
          <div class="col-span-2">
            <span class="font-medium text-gray-600 dark:text-gray-300">Applied:</span>
            <p class="text-gray-900 dark:text-white">${formattedDate}</p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
        <button class="view-application flex-1 bg-primary text-white text-xs py-2 rounded-lg hover:bg-primary/90 transition-colors" data-application-id="${applicationId}">
          View
        </button>
        <button class="edit-application flex-1 bg-gray-600 text-white text-xs py-2 rounded-lg hover:bg-gray-700 transition-colors" data-application-id="${applicationId}">
          Reverse
        </button>
        <button class="delete-application flex-1 bg-red-600 text-white text-xs py-2 rounded-lg hover:bg-red-700 transition-colors" data-application-id="${applicationId}">
          Delete
        </button>
      </div>
    `;

    // Attach event listeners to mobile card
    this.attachMobileCardEventListeners(card, applicationData);
    return card;
  }

  // Method to attach event listeners to mobile cards
  attachMobileCardEventListeners(card, applicationData) {
    const checkbox = card.querySelector(".application-checkbox");
    const viewBtn = card.querySelector(".view-application");
    const editBtn = card.querySelector(".edit-application");
    const deleteBtn = card.querySelector(".delete-application");

    if (checkbox) {
      checkbox.addEventListener("change", (e) => {
        this.handleApplicationSelect(
          applicationData.application.id,
          e.target.checked
        );
      });
    }

    if (viewBtn) {
      viewBtn.addEventListener("click", () =>
        this.viewApplication(applicationData)
      );
    }

    if (editBtn) {
      editBtn.addEventListener("click", async () =>
        this.editApplication(applicationData)
      );
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () =>
        this.deleteApplication(applicationData)
      );
    }
  }

  getStatusConfig(status) {
    const configs = {
      pending: {
        class:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        text: "Pending",
        icon: "schedule",
      },
      shortlisted: {
        class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        text: "Shortlisted",
        icon: "star",
      },
      accepted: {
        class:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        text: "Accepted",
        icon: "check_circle",
      },
      rejected: {
        class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        text: "Rejected",
        icon: "cancel",
      },
      submitted: {
        class: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        text: "Submitted",
        icon: "send",
      },
    };

    return configs[status] || configs.pending;
  }

  attachRowEventListeners(row, appData) {
    // Checkbox
    const checkbox = row.querySelector(".application-checkbox");
    if (checkbox) {
      checkbox.addEventListener("change", (e) => {
        this.handleApplicationSelect(appData.application.id, e.target.checked);
      });
    }

    // View button
    const viewBtn = row.querySelector(".view-application");
    if (viewBtn) {
      viewBtn.addEventListener("click", () => {
        this.viewApplication(appData);
      });
    }

    // Edit button
    const editBtn = row.querySelector(".edit-application");
    if (editBtn) {
      editBtn.addEventListener("click", async () => {
        this.editApplication(appData);
      });
    }

    // Delete button
    const deleteBtn = row.querySelector(".delete-application");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        this.deleteApplication(appData);
      });
    }
  }

  handleSelectAll(checked) {
    // Handle both desktop and mobile checkboxes
    const desktopCheckboxes = this.applicationsTableBody
      ? this.applicationsTableBody.querySelectorAll(".application-checkbox")
      : [];
    const mobileCheckboxes = this.applicationsMobileList
      ? this.applicationsMobileList.querySelectorAll(".application-checkbox")
      : [];

    const allCheckboxes = [...desktopCheckboxes, ...mobileCheckboxes];

    allCheckboxes.forEach((checkbox) => {
      checkbox.checked = checked;
      const applicationId = checkbox.dataset.applicationId;

      if (checked) {
        this.selectedApplications.add(applicationId);
      } else {
        this.selectedApplications.delete(applicationId);
      }
    });

    this.updateBulkActionsButton();
  }

  handleApplicationSelect(applicationId, selected) {
    if (selected) {
      this.selectedApplications.add(applicationId);
    } else {
      this.selectedApplications.delete(applicationId);
      // Uncheck select all if any checkbox is unchecked
      if (this.selectAllCheckbox) {
        this.selectAllCheckbox.checked = false;
      }
    }

    this.updateBulkActionsButton();
  }

  updateBulkActionsButton() {
    if (this.bulkActionsBtn) {
      const count = this.selectedApplications.size;
      if (count > 0) {
        this.bulkActionsBtn.innerHTML = `
          <span class="material-symbols-outlined text-base">playlist_add_check</span>
          Bulk Actions (${count})
        `;
        this.bulkActionsBtn.disabled = false;
      } else {
        this.bulkActionsBtn.innerHTML = `
          <span class="material-symbols-outlined text-base">playlist_add_check</span>
          Bulk Actions
        `;
        this.bulkActionsBtn.disabled = false;
      }
    }
  }

  updatePagination() {
    const totalApplications = this.filteredApplications.length;
    const totalPages = Math.ceil(totalApplications / this.itemsPerPage);

    // Update pagination info
    if (this.paginationStart && this.paginationEnd && this.paginationTotal) {
      const start = (this.currentPage - 1) * this.itemsPerPage + 1;
      const end = Math.min(
        this.currentPage * this.itemsPerPage,
        totalApplications
      );

      this.paginationStart.textContent = start;
      this.paginationEnd.textContent = end;
      this.paginationTotal.textContent = totalApplications;
    }

    // Update pagination buttons
    if (this.prevPageBtn) {
      this.prevPageBtn.disabled = this.currentPage === 1;
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.disabled =
        this.currentPage === totalPages || totalPages === 0;
    }

    // Update page numbers
    if (this.paginationNumbers) {
      this.paginationNumbers.innerHTML = "";

      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = `px-3 py-1 rounded border ${
          i === this.currentPage
            ? "border-primary bg-primary text-white"
            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`;
        pageBtn.textContent = i;
        pageBtn.addEventListener("click", () => {
          this.goToPage(i);
        });

        this.paginationNumbers.appendChild(pageBtn);
      }
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderApplicationsTable();
      this.updatePagination();
    }
  }

  nextPage() {
    const totalPages = Math.ceil(
      this.filteredApplications.length / this.itemsPerPage
    );
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderApplicationsTable();
      this.updatePagination();
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderApplicationsTable();
    this.updatePagination();
  }

  // Action Methods
  viewApplication(applicationData) {
    var itid = applicationData.training.id;
    var appId = applicationData.application.id;
    if (!itid || !appId) {
      console.log("itid " + itid);
      console.log("appId " + appId);
      return;
    }
    console.log("View application:", applicationData);
    if (typeof generateShareableUrl === "function") {
      const profileUrl = generateShareableUrl(
        "/company/student_profile.html",
        itid,
        appId
      );

      console.log("Generated URL:", profileUrl);
      window.location.href = profileUrl;
    }
  }

  async editApplication(appData, e = null) {
    console.log("Edit application:", appData);

    if (appData.application.applicationStatus == "pending") {
      alert("Status is Pending Already");
      return;
    }

    // Find the edit button that was clicked
    const editButton = event?.target?.closest(".edit-application");
    if (editButton) {
      this.showButtonLoading(
        editButton,
        '<span class="material-symbols-outlined text-base">undo</span>'
      );
    }

    try {
      this.showGlobalLoading("Reversing application...");
      await this.tabManager.updateApplicationStatus(
        appData.application.id,
        "pending"
      );
      this.renderApplicationsTable();
      messageDialog(true, appData.application, true);
    } catch (error) {
      console.error("Error reversing application:", error);
      alert("Failed to reverse application. Please try again.");
    } finally {
      this.hideGlobalLoading();
      if (editButton) {
        this.hideButtonLoading(editButton);
      }
    }
  }

  async deleteApplication(appData) {
    if (
      !confirm(
        "Are you sure you want to delete this application? This action cannot be undone."
      )
    ) {
      return;
    }

    // Find the delete button that was clicked
    const deleteButton = event?.target?.closest(".delete-application");
    if (deleteButton) {
      this.showButtonLoading(
        deleteButton,
        '<span class="material-symbols-outlined text-base">delete</span>'
      );
    }

    try {
      this.showGlobalLoading("Deleting application...");
      console.log("Delete application:", appData);

      await this.removeApplicationFromData(appData.application.id);

      this.buildApplicationsContent();

      // Show success message
      this.showTempMessage("Application deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting application:", error);
      this.showTempMessage("Failed to delete application", "error");
    } finally {
      this.hideGlobalLoading();
      if (deleteButton) {
        this.hideButtonLoading(deleteButton);
      }
    }
  }

  async removeApplicationFromData(applicationId) {
    try {
      // Remove from main applications array in tabManager
      const allApplications = this.tabManager.getAllCompanyApplications();
      const applicationIndex = allApplications.findIndex(
        (app) => app.application.id === applicationId
      );

      // Find the application to get the IT ID
      const application = allApplications.find(
        (app) => app.application.id === applicationId
      );

      console.log("given applications is applciation");
      if (!application) {
        console.warn(`Application ${applicationId} not found`);
        return Promise.resolve();
      }

      if (applicationIndex !== -1) {
        // Remove the application from the array
        allApplications.splice(applicationIndex, 1);
        console.log(
          `Removed application ${applicationId} at index ${applicationIndex}`
        );
      }

      // Also remove from filtered applications
      const filteredIndex = this.filteredApplications.findIndex(
        (app) => app.application.id === applicationId
      );

      if (filteredIndex !== -1) {
        this.filteredApplications.splice(filteredIndex, 1);
      }

      // Remove from selected applications
      this.selectedApplications.delete(applicationId);

      // Get the correct IDs for deletion
      const itId = application.opportunityId; // This matches your data structure
      const compId = application.training.company.id; // Get company ID from tabManager

      if (!itId || !compId) {
        throw new Error("Missing IT ID or Company ID for deletion");
      }

      console.log(
        `Deleting application: Company=${compId}, IT=${itId}, App=${applicationId}`
      );

      await it_base_companycloud.deleteCompanyApplication(
        compId,
        itId,
        applicationId
      );
      //console.log("given application is "+ JSON.stringify(application));
      messageDialog(true,application.application);
      this.tabManager.processApplicationsData();
      this.tabManager.updateSharedStats();
      this.tabManager.refreshCurrentTab();

      return Promise.resolve();
    } catch (error) {
      console.error("Error in removeApplicationFromData:", error);
      // Re-throw the error so calling code can handle it
      throw error;
    }
  }

  exportApplications() {
  console.log("Export applications");
  
  const applicationsToExport =
    this.selectedApplications.size > 0
      ? this.filteredApplications.filter((app) =>
          this.selectedApplications.has(app.application.id)
        )
      : this.filteredApplications;

  if (applicationsToExport.length === 0) {
    alert("No applications to export");
    return;
  }

  try {
    this.showGlobalLoading("Preparing export...");
    
    // Generate CSV
    const csvContent = this.generateCSV(applicationsToExport);
    
    // Create and trigger download
    this.downloadCSV(csvContent, `applications_${new Date().toISOString().split('T')[0]}.csv`);
    
    this.showTempMessage(`Exported ${applicationsToExport.length} applications successfully`, "success");
    
  } catch (error) {
    console.error("Error exporting applications:", error);
    this.showTempMessage("Failed to export applications", "error");
  } finally {
    this.hideGlobalLoading();
  }
}

generateCSV(applications) {
  const headers = [
    'Student Name',
    'Student Email', 
    'Institution',
    'Industrial Training',
    'Applied Date',
    'Status',
    'Cover Letter',
    'Resume URL'
  ];

  // CSV header row
  let csv = headers.join(',') + '\n';

  // Data rows
  applications.forEach(app => {
    const application = app.application;
    const student = application.student || {};
    const row = [
      `"${(student.fullName || '').replace(/"/g, '""')}"`,
      `"${(student.email || '').replace(/"/g, '""')}"`,
      `"${(student.institution || '').replace(/"/g, '""')}"`,
      `"${(app.opportunity || '').replace(/"/g, '""')}"`,
      `"${application.applicationDate ? new Date(application.applicationDate).toLocaleDateString() : ''}"`,
      `"${application.applicationStatus || ''}"`,
      `"${(application.coverLetter || '').replace(/"/g, '""')}"`,
      `"${application.resumeURL || ''}"`
    ];
    csv += row.join(',') + '\n';
  });

  return csv;
}

downloadCSV(csvContent, filename) {
  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
  showBulkActions() {
    if (this.selectedApplications.size === 0) {
        alert("Please select at least one application to perform bulk actions.");
        return;
    }

    const action = prompt(
        `Bulk actions for ${this.selectedApplications.size} applications:\n\n` +
        `Available actions:\n` +
        `- "accept" → Status: accepted\n` +
        `- "reject" → Status: rejected\n` +
        `- "pend"   → Status: pending\n` +
        `Enter your action:`
    );

    if (action) {
        const normalizedAction = action.toLowerCase().trim();
        
        const actionMap = {
            'accept': 'accepted',
            'reject': 'rejected',
            'pend': 'pending',
        };

        const finalStatus = actionMap[normalizedAction];
        
        if (finalStatus) {
            this.performBulkAction(finalStatus);
        } else {
            alert("Invalid action. Please use: accept, reject or pend");
        }
    }
}

  async performBulkAction(action) {
    console.log(
      `Performing bulk action: ${action} on ${this.selectedApplications.size} applications`
    );

    // Auto-generate message based on status
    const autoMessage = this.generateAutoMessage(action);
    
    // Ask if they want to customize the notification message
    const useCustomMessage = confirm(
        `Update ${this.selectedApplications.size} applications to "${action}"?\n\n` +
        `Auto-generated notification: "${autoMessage}"\n\n` +
        `Click OK to use this message, or Cancel to customize.`
    );

    let notificationMessage = autoMessage;
    
    if (!useCustomMessage) {
        const customMessage = prompt('Enter custom notification message:', autoMessage);
        if (customMessage === null) {
            return; // User cancelled the entire operation
        }
        notificationMessage = customMessage.trim() || autoMessage;
    }

    if (!confirm(`Are you sure you want to mark ${this.selectedApplications.size} applications as ${action}?`)) {
        return;
    }

    // Show loading on bulk actions button
    if (this.bulkActionsBtn) {
        this.showButtonLoading(this.bulkActionsBtn);
    }

    try {
        this.showGlobalLoading(`Updating ${this.selectedApplications.size} applications...`);
        
        // Show bulk progress indicator
        //this.showBulkProgress(this.selectedApplications.size);
        
        console.log("appId is " + JSON.stringify(this.selectedApplications));
        
        // Process all applications with the notification message
        const applicationsArray = Array.from(this.selectedApplications);
        for (const appId of applicationsArray) {
            await this.tabManager.updateApplicationStatus(appId, action, notificationMessage);
        }
        
        // Clear selection and refresh
        this.showTempMessage(
            `Successfully updated ${this.selectedApplications.size} applications to ${action}`,
            "success"
        );
        this.selectedApplications.clear();
        
        if (this.selectAllCheckbox) {
            this.selectAllCheckbox.checked = false;
        }
        
        this.buildApplicationsContent();

    } catch (error) {
        console.error("Error performing bulk action:", error);
        this.showTempMessage("Failed to update applications", "error");
    } finally {
        this.hideGlobalLoading();
        if (this.bulkActionsBtn) {
            this.hideButtonLoading(this.bulkActionsBtn);
        }
    }
}

// Add these helper methods to your class:

/**
 * Generate auto message based on status
 */
generateAutoMessage(status) {
    const messages = {
        'accepted': 'Congratulations! Your application has been accepted. We look forward to working with you.',
        'rejected': 'Thank you for your application. After careful consideration, we have decided to move forward with other candidates at this time.',
        'pending': 'Your application is currently under review. We will notify you once a decision has been made.',
        'shortlisted': 'Great news! Your application has been shortlisted. We will contact you soon for the next steps.'
    };
    return messages[status] || `Your application status has been updated to ${status}.`;
}

/**
 * Show bulk progress indicator
 */
showBulkProgress(total) {
    // Remove existing progress if any
    const existingProgress = document.getElementById('bulk-progress');
    if (existingProgress) {
        existingProgress.remove();
    }

    const progress = document.createElement('div');
    progress.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    progress.innerHTML = `
        <div class="flex items-center gap-2">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Processing ${total} applications...</span>
        </div>
    `;
    progress.id = 'bulk-progress';
    
    document.body.appendChild(progress);
}

/**
 * Hide bulk progress indicator
 */
hideBulkProgress() {
    const progress = document.getElementById('bulk-progress');
    if (progress) {
        progress.remove();
    }
}
  showTempMessage(message, type = "info") {
    const messageDiv = document.createElement("div");
    const bgColor =
      type === "success"
        ? "bg-green-500"
        : type === "error"
        ? "bg-red-500"
        : "bg-blue-500";

    messageDiv.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.style.opacity = "0";
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 300);
    }, 3000);
  }

  showGlobalLoading(message = "Processing...") {
    this.isLoading = true;

    // Create or get loading overlay
    let overlay = document.getElementById("global-loading-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "global-loading-overlay";
      overlay.className = "loading-overlay";
      overlay.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
          <div class="loading-spinner"></div>
          <span class="text-gray-700 dark:text-gray-300">${message}</span>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    // Disable interactive elements
    document.body.classList.add("disabled-during-loading");
  }

  hideGlobalLoading() {
    this.isLoading = false;
    const overlay = document.getElementById("global-loading-overlay");
    if (overlay) {
      overlay.remove();
    }
    document.body.classList.remove("disabled-during-loading");
  }

  showButtonLoading(button, originalText = null) {
    if (!button) return;

    button.dataset.originalText = originalText || button.innerHTML;
    button.classList.add("button-loading");
    button.disabled = true;
  }

  hideButtonLoading(button) {
    if (!button) return;

    button.classList.remove("button-loading");
    button.disabled = false;
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}