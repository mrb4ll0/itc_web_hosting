import { getAvatarInitials } from "../../../js/general/generalmethods.js";

export default class Applications {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.fullName = "Applications";
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.selectedApplications = new Set();
    this.filteredApplications = [];
  }

  async init() {
    console.log("Initializing Applications Tab");
    this.initializeElements();
    this.initializeEventListeners();
    await this.buildApplicationsContent();
  }

  refresh(tabManager) {
    this.tabManager = tabManager;
    this.buildApplicationsContent();
  }

  initializeElements() {
    // Table and pagination elements
    this.applicationsTableBody = document.getElementById(
      "applications-table-body"
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

    console.log("Applications elements initialized");
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

    // Listen to global filter changes from TabManager
    this.setupGlobalFilterListeners();
  }

  setupGlobalFilterListeners() {
    // These would be connected to the global search and filters
    // from the main dashboard through the TabManager
  }

  async buildApplicationsContent() {
    console.log("Building applications content...");

    const applications = this.tabManager.getAllCompanyApplications();
    this.filteredApplications = this.applyFilters(applications);

    this.renderApplicationsTable();
    this.updatePagination();
  }

  applyFilters(applications) {
    const filters = this.tabManager.currentFilters || {};
    let filtered = [...applications];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((app) => {
        const student = app.application.student || {};
        const opportunity = app.opportunity || {};

        return (
          (student.fullName || "").toLowerCase().includes(searchTerm) ||
          (student.email || "").toLowerCase().includes(searchTerm) ||
          (opportunity.course || "").toLowerCase().includes(searchTerm) ||
          (opportunity.institution || "").toLowerCase().includes(searchTerm) ||
          (app.application.status || "").toLowerCase().includes(searchTerm)
        );
      });
    }

    // Status filter
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter(
        (app) =>
          (app.application.status || "").toLowerCase() ===
          filters.status.toLowerCase()
      );
    }

    // Institution filter
    if (filters.institution && filters.institution !== "all") {
      filtered = filtered.filter(
        (app) =>
          (app.opportunity?.institution || "").toLowerCase() ===
          filters.institution.toLowerCase()
      );
    }

    // Course filter
    if (filters.course && filters.course !== "all") {
      filtered = filtered.filter(
        (app) =>
          (app.opportunity?.course || "").toLowerCase() ===
          filters.course.toLowerCase()
      );
    }

    return filtered;
  }

  renderApplicationsTable() {
    if (!this.applicationsTableBody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentApplications = this.filteredApplications.slice(
      startIndex,
      endIndex
    );

    this.applicationsTableBody.innerHTML = "";

    if (currentApplications.length === 0) {
      this.applicationsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            <div class="flex flex-col items-center">
              <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">inbox</span>
              <p class="text-lg font-medium mb-1">No applications found</p>
              <p class="text-sm">Try adjusting your search or filters</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    currentApplications.forEach((applicationData, index) => {
      const application = applicationData.application;
      const student = application.student || {};
      const opportunity = applicationData.opportunity || {};
      const applicationId = application.id || `app-${startIndex + index}`;

      const row = this.createApplicationRow(
        applicationId,
        student,
        application,
        opportunity,
        startIndex + index
      );
      this.applicationsTableBody.appendChild(row);
    });
  }

  createApplicationRow(
    applicationId,
    student,
    application,
    opportunity,
    index
  ) {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors";
    row.dataset.applicationId = applicationId;

    const appliedDate = application.applicationDate;
    console.log(
      "Applied date for application ",
      applicationId,
      " is ",
      appliedDate
    );
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
            <span class="material-symbols-outlined text-base">edit</span>
          </button>
          <button class="delete-application text-red-600 hover:text-red-800 transition-colors" data-application-id="${applicationId}">
            <span class="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </td>
    `;

    // Add event listeners to the row elements
    this.attachRowEventListeners(row, applicationId);

    return row;
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

  attachRowEventListeners(row, applicationId) {
    // Checkbox
    const checkbox = row.querySelector(".application-checkbox");
    if (checkbox) {
      checkbox.addEventListener("change", (e) => {
        this.handleApplicationSelect(applicationId, e.target.checked);
      });
    }

    // View button
    const viewBtn = row.querySelector(".view-application");
    if (viewBtn) {
      viewBtn.addEventListener("click", () => {
        this.viewApplication(applicationId);
      });
    }

    // Edit button
    const editBtn = row.querySelector(".edit-application");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        this.editApplication(applicationId);
      });
    }

    // Delete button
    const deleteBtn = row.querySelector(".delete-application");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        this.deleteApplication(applicationId);
      });
    }
  }

  handleSelectAll(checked) {
    const checkboxes = this.applicationsTableBody.querySelectorAll(
      ".application-checkbox"
    );

    checkboxes.forEach((checkbox) => {
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
  viewApplication(applicationId) {
    console.log("View application:", applicationId);
    // Implement view application logic
    // Could open a modal or navigate to detail page
  }

  editApplication(applicationId) {
    console.log("Edit application:", applicationId);
    // Implement edit application logic
  }

  deleteApplication(applicationId) {
    if (
      confirm(
        "Are you sure you want to delete this application? This action cannot be undone."
      )
    ) {
      console.log("Delete application:", applicationId);
      // Implement delete application logic
      // Refresh the table after deletion
      this.buildApplicationsContent();
    }
  }

  exportApplications() {
    console.log("Export applications");
    // Implement export logic (CSV, Excel, etc.)
    const applicationsToExport =
      this.selectedApplications.size > 0
        ? this.filteredApplications.filter((app) =>
            this.selectedApplications.has(app.application.id)
          )
        : this.filteredApplications;

    console.log("Exporting applications:", applicationsToExport);
    // Add actual export implementation here
  }

  showBulkActions() {
    if (this.selectedApplications.size === 0) {
      alert("Please select at least one application to perform bulk actions.");
      return;
    }

    // Simple bulk actions menu - you can enhance this with a proper dropdown
    const action = prompt(
      `Bulk actions for ${this.selectedApplications.size} applications:\n\nEnter action (status: pending/shortlisted/accepted/rejected):`
    );

    if (
      action &&
      ["pending", "shortlisted", "accepted", "rejected"].includes(
        action.toLowerCase()
      )
    ) {
      this.performBulkAction(action.toLowerCase());
    } else if (action) {
      alert(
        "Invalid action. Please use: pending, shortlisted, accepted, or rejected"
      );
    }
  }

  async performBulkAction(action) {
    console.log(
      `Performing bulk action: ${action} on ${this.selectedApplications.size} applications`
    );

    // Here you would typically make API calls to update the applications
    // For now, we'll just show a confirmation and refresh

    if (
      confirm(
        `Are you sure you want to mark ${this.selectedApplications.size} applications as ${action}?`
      )
    ) {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Clear selection and refresh
      this.selectedApplications.clear();
      if (this.selectAllCheckbox) {
        this.selectAllCheckbox.checked = false;
      }
      this.buildApplicationsContent();

      alert(
        `Successfully updated ${this.selectedApplications.size} applications to ${action}`
      );
    }
  }
}
