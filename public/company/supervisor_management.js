import { SupervisorFirestore } from "../js/fireabase/supervisorFirestore.js";
import {
  formatTimestamp,
  hideLoadingOverlay,
  safeConvertToTimestamp,
  showLoadingOverlay,
} from "../js/general/generalmethods.js";
import { Supervisor } from "../js/model/supervisorModel.js";

class SupervisorController {
  constructor() {
    this.firestore = new SupervisorFirestore();
    this.currentUser = null;
    this.companyCode = null;
    this.selectedSupervisorId = null;
    this.currentTab = "active"; // Default tab
  }

  async init() {
    try {
      this.showLoading(true);

      // Check authentication
      this.currentUser = await this.firestore.getCurrentUser();
      if (!this.currentUser) {
        window.location.href = "/login.html";
        return;
      }

      this.setupEventListeners();

      // Check if company code exists
      this.companyCode = await this.firestore.getCompanyCode();

      if (this.companyCode) {
        await this.showSupervisorKeySection();
        await this.showSupervisorsSection();
      } else {
        this.showCodeGenerationSection();
      }
    } catch (error) {
      console.error("Error initializing supervisor controller:", error);
      this.showError("Failed to initialize supervisor management");
    } finally {
      this.showLoading(false);
    }
  }

  setupEventListeners() {
    // Code generation
    const generateCodeBtn = document.getElementById("generateCodeBtn");
    if (generateCodeBtn) {
      generateCodeBtn.addEventListener("click", () => this.generateCode());
    }

    // Supervisor management
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshSupervisors());
    }

    const assignStudentsBtn = document.getElementById("assignStudentsBtn");
    if (assignStudentsBtn) {
      assignStudentsBtn.addEventListener("click", () => this.showAssignModal());
    }

    // Tab event listeners
    this.setupTabListeners();

    // Modal controls
    const closeModalBtn = document.getElementById("closeModalBtn");
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", () => this.hideAssignModal());
    }

    const cancelAssignBtn = document.getElementById("cancelAssignBtn");
    if (cancelAssignBtn) {
      cancelAssignBtn.addEventListener("click", () => this.hideAssignModal());
    }

    const confirmAssignBtn = document.getElementById("confirmAssignBtn");
    if (confirmAssignBtn) {
      confirmAssignBtn.addEventListener("click", () => {
        const assignmentType = document.querySelector(
          'input[name="assignmentType"]:checked'
        ).value;

        if (assignmentType === "random") {
          this.assignStudentsRandomly();
        } else {
          this.startManualAssignment();
        }
      });
    }

    // Assignment type toggle
    document
      .querySelectorAll('input[name="assignmentType"]')
      .forEach((radio) => {
        radio.addEventListener("change", (e) =>
          this.toggleAssignmentType(e.target.value)
        );
      });

    // ==================== FILTERING EVENT LISTENERS ====================

    // Mode selection buttons
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // Remove active class from all buttons
        document.querySelectorAll(".mode-btn").forEach((b) => {
          b.classList.remove(
            "active-mode",
            "bg-blue-50",
            "dark:bg-blue-900/30",
            "border-blue-500",
            "text-blue-600",
            "dark:text-blue-400"
          );
        });

        // Add active class to clicked button
        e.currentTarget.classList.add(
          "active-mode",
          "bg-blue-50",
          "dark:bg-blue-900/30",
          "border-blue-500",
          "text-blue-600",
          "dark:text-blue-400"
        );

       // this.applyFilters();
      });
    });

    // Name filter with debounce
    const nameFilter = document.getElementById("nameFilter");
    if (nameFilter) {
      nameFilter.addEventListener(
        "input",
        this.debounce(() => {
          this.applyFilters();
        }, 300)
      );
    }

    // Student count filter
    const studentCountFilter = document.getElementById("studentCountFilter");
    if (studentCountFilter) {
      studentCountFilter.addEventListener("change", () => {
        const customRangeFilter = document.getElementById("customRangeFilter");
        if (studentCountFilter.value === "custom") {
          customRangeFilter.classList.remove("hidden");
        } else {
          customRangeFilter.classList.add("hidden");
        }
        this.applyFilters();
      });
    }

    // Custom range inputs
    const minStudents = document.getElementById("minStudents");
    const maxStudents = document.getElementById("maxStudents");
    if (minStudents && maxStudents) {
      minStudents.addEventListener(
        "input",
        this.debounce(() => {
          this.applyFilters();
        }, 300)
      );
      maxStudents.addEventListener(
        "input",
        this.debounce(() => {
          this.applyFilters();
        }, 300)
      );
    }

    // Sort filter
    const sortFilter = document.getElementById("sortFilter");
    if (sortFilter) {
      sortFilter.addEventListener("change", () => {
        this.applyFilters();
      });
    }

    // Clear filters button
    const clearFiltersBtn = document.getElementById("clearFiltersBtn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        this.clearAllFilters();
      });
    }

    // Export button
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportFilteredData();
      });
    }
  }

  // ==================== FILTERING UTILITY METHODS ====================

  // Debounce utility method
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Apply filters method
  applyFilters() {
    console.log("apply filter ");
    const activeMode =
      document.querySelector(".mode-btn.active-mode")?.dataset.mode || "all";
      this.activeMode = activeMode;
      if(activeMode === "all")
      {
        return;
      }
    const searchTerm =
      document.getElementById("nameFilter")?.value.toLowerCase() || "";
    const studentCountFilter =
      document.getElementById("studentCountFilter")?.value || "";
    const sortBy = document.getElementById("sortFilter")?.value || "name-asc";

    // Filter and sort supervisors based on selected criteria
    const filteredSupervisors = this.filterSupervisors(
      activeMode,
      searchTerm,
      studentCountFilter
    );
    
    const sortedSupervisors = this.sortSupervisors(filteredSupervisors, sortBy);
     this.sortedSupervisors = sortedSupervisors;
    this.displayFilteredSupervisors(sortedSupervisors);
    this.updateFilteredCount(filteredSupervisors.length);
    this.updateActiveFiltersDisplay(activeMode, searchTerm, studentCountFilter);
  }

  // Filter supervisors based on criteria
  filterSupervisors(mode, searchTerm, studentCountFilter) {
    if (!this.supervisors) return [];

    return this.supervisors.filter((supervisor) => {
      if (mode !== "all") {
        const supervisorStatus = supervisor.status?.toLowerCase();
        const modeLower = mode.toLowerCase();

        if (modeLower === "active" && supervisorStatus !== "active") {
          console.log(`Filtered out - Not active: ${supervisor.displayName}`);
          return false;
        }
        if (modeLower === "pending" && supervisorStatus !== "pending") {
          console.log(`Filtered out - Not pending: ${supervisor.displayName}`);
          return false;
        }
        if (modeLower === "inactive" && supervisorStatus !== "inactive") {
          console.log(`Filtered out - Not inactive: ${supervisor.displayName}`);
          return false;
        }
        if (modeLower === "removed" && supervisorStatus !== "removed") {
          console.log(`Filtered out - Not removed: ${supervisor.displayName}`);
          return false;
        }
      }

      // Name search
      if (
        searchTerm &&
        !supervisor.displayName?.toLowerCase().includes(searchTerm)
      ) {
        console.log(
          `Filtered out - Name doesn't match: ${supervisor.displayName}`
        );
        return false;
      }

      // Student count filter
      const studentCount = supervisor.students?.length || 0;
      if (studentCountFilter) {
        let shouldFilter = false;
        switch (studentCountFilter) {
          case "0":
            shouldFilter = studentCount !== 0;
            break;
          case "1-5":
            shouldFilter = studentCount < 1 || studentCount > 5;
            break;
          case "6-10":
            shouldFilter = studentCount < 6 || studentCount > 10;
            break;
          case "11-20":
            shouldFilter = studentCount < 11 || studentCount > 20;
            break;
          case "20+":
            shouldFilter = studentCount < 20;
            break;
          case "custom":
            const min =
              parseInt(document.getElementById("minStudents")?.value) || 0;
            const max =
              parseInt(document.getElementById("maxStudents")?.value) ||
              Infinity;
            shouldFilter = studentCount < min || studentCount > max;
            break;
        }
        if (shouldFilter) {
          console.log(
            `Filtered out - Student count doesn't match: ${studentCount}`
          );
          return false;
        }
      }

      console.log(`Included: ${supervisor.displayName}`);
      return true;
    });
  }
  // Sort supervisors
  sortSupervisors(supervisors, sortBy) {
    return [...supervisors].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return (a.displayName || "").localeCompare(b.displayName || "");
        case "name-desc":
          return (b.displayName || "").localeCompare(a.displayName || "");
        case "students-asc":
          return (a.students?.length || 0) - (b.students?.length || 0);
        case "students-desc":
          return (b.students?.length || 0) - (a.students?.length || 0);
        case "date-newest":
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case "date-oldest":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        default:
          return 0;
      }
    });
  }

  // Display filtered supervisors
  displayFilteredSupervisors(supervisors) {
    const activeTab =
      document.querySelector(".tab-button[data-tab].border-blue-500")?.dataset
        .tab || "active";
    //  this.updateCounters(
    //       activeSupervisors.length,
    //       newSupervisors.length,
    //       inactiveSupervisors.length,
    //       removedSupervisors.length
    //     );
    console.log("active tab is " + activeTab);
    switch (this.activeMode) {
      case "active":
        this.loadTabSupervisors("active", supervisors);
        this.updateCounters(
          supervisors.length,
          this.newSupervisors.length,
          this.inactiveSupervisors.length,
          this.removedSupervisors.length
        );
        break;
      case "new":
        this.loadTabSupervisors("new", supervisors);
        this.updateCounters(
          this.activeSupervisors.length,
          supervisors.length,
          this.inactiveSupervisors.length,
          this.removedSupervisors.length
        );
        break;
      case "inactive":
        this.loadTabSupervisors("inactive", supervisors);
         this.updateCounters(
          this.activeSupervisors.length,
          this.newSupervisors.length,
          supervisors.length,
          this.removedSupervisors.length
        );
        break;
      case "removed":
        this.loadTabSupervisors("removed", supervisors);
         this.updateCounters(
          this.activeSupervisors.length,
          this.newSupervisors.length,
          this.inactiveSupervisors.length,
          supervisors.length
        );
        break;
    }

    //  this.loadTabSupervisors("active", activeSupervisors);
    //   this.loadTabSupervisors("new", newSupervisors);
    //   this.loadTabSupervisors("inactive", inactiveSupervisors);
    //   this.loadTabSupervisors("removed", removedSupervisors);
  }

  // Update filtered count display
  updateFilteredCount(count) {
    const filteredCount = document.getElementById("filteredCount");
    const totalCount = this.allSupervisors?.length || 0;

    if (filteredCount) {
      if (count === totalCount) {
        filteredCount.textContent = `Showing all ${totalCount} supervisors`;
      } else {
        filteredCount.textContent = `Showing ${count} of ${totalCount} supervisors`;
      }
    }
  }

  // Update active filters display
  updateActiveFiltersDisplay(mode, searchTerm, studentCountFilter) {
    const activeFilters = document.getElementById("activeFilters");
    if (!activeFilters) return;

    const filters = [];

    if (mode !== "all") {
      filters.push(`Mode: ${this.capitalizeFirstLetter(mode)}`);
    }

    if (searchTerm) {
      filters.push(`Search: "${searchTerm}"`);
    }

    if (studentCountFilter) {
      let studentFilterText = "";
      switch (studentCountFilter) {
        case "0":
          studentFilterText = "No students";
          break;
        case "1-5":
          studentFilterText = "1-5 students";
          break;
        case "6-10":
          studentFilterText = "6-10 students";
          break;
        case "11-20":
          studentFilterText = "11-20 students";
          break;
        case "20+":
          studentFilterText = "20+ students";
          break;
        case "custom":
          const min = document.getElementById("minStudents")?.value || "0";
          const max = document.getElementById("maxStudents")?.value || "∞";
          studentFilterText = `${min}-${max} students`;
          break;
      }
      filters.push(`Students: ${studentFilterText}`);
    }

    if (filters.length > 0) {
      activeFilters.classList.remove("hidden");
      activeFilters.innerHTML = filters
        .map(
          (filter) =>
            `<span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full flex items-center space-x-1">
                <span>${filter}</span>
                <button class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200" onclick="this.removeFilter('${filter
                  .split(":")[0]
                  .trim()
                  .toLowerCase()}')">
                    <span class="material-symbols-outlined text-xs">close</span>
                </button>
            </span>`
        )
        .join("");
    } else {
      activeFilters.classList.add("hidden");
      activeFilters.innerHTML = "";
    }
  }

  // Clear all filters
  clearAllFilters() {
    // Reset mode to "all"
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.remove(
        "active-mode",
        "bg-blue-50",
        "dark:bg-blue-900/30",
        "border-blue-500",
        "text-blue-600",
        "dark:text-blue-400"
      );
    });
    document
      .querySelector('[data-mode="all"]')
      .classList.add(
        "active-mode",
        "bg-blue-50",
        "dark:bg-blue-900/30",
        "border-blue-500",
        "text-blue-600",
        "dark:text-blue-400"
      );

    // Clear search
    const nameFilter = document.getElementById("nameFilter");
    if (nameFilter) nameFilter.value = "";

    // Reset student count filter
    const studentCountFilter = document.getElementById("studentCountFilter");
    if (studentCountFilter) studentCountFilter.value = "";

    // Hide custom range
    const customRangeFilter = document.getElementById("customRangeFilter");
    if (customRangeFilter) customRangeFilter.classList.add("hidden");

    // Clear custom range inputs
    const minStudents = document.getElementById("minStudents");
    const maxStudents = document.getElementById("maxStudents");
    if (minStudents) minStudents.value = "";
    if (maxStudents) maxStudents.value = "";

    // Reset sort to default
    const sortFilter = document.getElementById("sortFilter");
    if (sortFilter) sortFilter.value = "name-asc";

    // Apply cleared filters
    this.applyFilters();
  }

  // Export filtered data (placeholder)
 exportFilteredData() {
    // Use sortedSupervisors if available, otherwise fall back to all supervisors
    const dataToExport = this.sortedSupervisors || this.supervisors || [];
    
    if (dataToExport.length === 0) {
        console.log("No data to export");
        this.showNotification("No supervisor data available to export", "warning");
        return;
    }

    console.log("Exporting filtered supervisor data...", dataToExport.length, "supervisors");

    // Prepare CSV content
    const headers = [
        'Name',
        'Email', 
        'Status',
        'Student Count',
        'Active',
        'Allowed',
        'Created Date',
        'Last Login'
    ];

    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    dataToExport.forEach(supervisor => {
        const row = [
            `"${(supervisor.displayName || '').replace(/"/g, '""')}"`, // Escape quotes in names
            `"${(supervisor.email || '').replace(/"/g, '""')}"`,
            `"${(supervisor.status || '').replace(/"/g, '""')}"`,
            (supervisor.students?.length || 0).toString(),
            supervisor.isActive ? 'Yes' : 'No',
            supervisor._allowed ? 'Yes' : 'No',
            `"${new Date(supervisor.createdAt || '').toLocaleDateString()}"`,
            `"${new Date(supervisor.lastLogin || '').toLocaleDateString()}"`
        ];
        csvRows.push(row.join(','));
    });

    // Create and download CSV file
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `supervisors_export_${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success notification
    this.showNotification(`Exported ${dataToExport.length} supervisors to ${filename}`, 'success');
    
    console.log(`Exported ${dataToExport.length} supervisors to ${filename}`);
}
  // Utility method
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  setupTabListeners() {
    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const tab = e.currentTarget.getAttribute("data-tab");
        this.switchTab(tab);
      });
    });
  }

  switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.remove(
        "border-blue-500",
        "text-blue-600",
        "dark:text-blue-400"
      );
      btn.classList.add(
        "border-transparent",
        "text-slate-500",
        "dark:text-slate-400"
      );
    });

    const activeTabBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (activeTabBtn) {
      activeTabBtn.classList.remove(
        "border-transparent",
        "text-slate-500",
        "dark:text-slate-400"
      );
      activeTabBtn.classList.add(
        "border-blue-500",
        "text-blue-600",
        "dark:text-blue-400"
      );
    }

    // Update tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.add("hidden");
    });

    const activeContent = document.getElementById(`${tab}SupervisorsContent`);
    if (activeContent) {
      activeContent.classList.remove("hidden");
    }

    this.currentTab = tab;
  }

  async generateCode() {
    try {
      this.showLoading(true);
      const code = await this.firestore.generateCompanyCode();

      document.getElementById("generatedCode").textContent = code;
      this.hideCodeGenerationSection();
      this.showGeneratedCodeSection();

      // After generating code, show the supervisor key section
      await this.showSupervisorKeySection();
      await this.showSupervisorsSection();
    } catch (error) {
      console.error("Error generating code:", error);
      this.showError("Failed to generate registration code");
    } finally {
      this.showLoading(false);
    }
  }

  async showSupervisorKeySection() {
    if (this.companyCode) {
      document.getElementById("supervisorKeyDisplay").textContent =
        this.companyCode;
      document
        .getElementById("supervisorKeySection")
        .classList.remove("hidden");
    }
  }

  async refreshSupervisors() {
    try {
      this.showLoading(true);
      await this.loadSupervisors();
      // After loading, ensure the supervisors section is visible
      this.showSupervisorsContent();
    } catch (error) {
      console.error("Error refreshing supervisors:", error);
      this.showError("Failed to refresh supervisors");
    } finally {
      this.showLoading(false);
    }
  }

  async showSupervisorsSection() {
    await this.loadSupervisors();
    this.showSupervisorsContent();
  }

  async showSupervisorsContent() {
    this.hideAllSections();
    document.getElementById("supervisorKeySection").classList.remove("hidden");
    document.getElementById("supervisorsSection").classList.remove("hidden");
  }

  async loadSupervisors() {
    try {
      const supervisors = await this.firestore.getSupervisors();
      this.supervisors = supervisors;

      // Categorize supervisors - UPDATED FOR 4 TABS
      const newSupervisors = supervisors.filter((s) => {
        const result =
          s.allowed === false &&
          s.rejected !== true &&
          s.status === "pending" &&
          !s.removed;
        return result;
      });

      this.newSupervisors = newSupervisors;

      const activeSupervisors = supervisors.filter((s) => {
        const isNew = newSupervisors.includes(s);
        const result =
          !isNew && s.allowed === true && s.isActive !== false && !s.removed;
        return result;
      });

      this.activeSupervisors = activeSupervisors;

      const inactiveSupervisors = supervisors.filter((s) => {
        const isActive = activeSupervisors.includes(s);
        const isNew = newSupervisors.includes(s);
        const result =
          !isActive &&
          !isNew &&
          !s.removed &&
          (s.allowed === false ||
            s.isActive === false ||
            s.rejected === true ||
            s.status === "rejected");
        return result;
      });

      this.inactiveSupervisors = inactiveSupervisors;

      const removedSupervisors = supervisors.filter((s) => {
        const result = s.removed === true;
        return result;
      });

      this.removedSupervisors = removedSupervisors;

      // Update counters - ADDED REMOVED COUNT
      this.updateCounters(
        activeSupervisors.length,
        newSupervisors.length,
        inactiveSupervisors.length,
        removedSupervisors.length
      );

      // Load each tab - ADDED REMOVED TAB
      this.loadTabSupervisors("active", activeSupervisors);
      this.loadTabSupervisors("new", newSupervisors);
      this.loadTabSupervisors("inactive", inactiveSupervisors);
      this.loadTabSupervisors("removed", removedSupervisors);

      // Auto-switch to new supervisors tab if there are pending approvals
      if (newSupervisors.length > 0 && this.currentTab === "active") {
        this.switchTab("new");
      }
    } catch (error) {
      console.error("Error loading supervisors:", error);
      this.showError("Failed to load supervisors");
    }
  }

  updateCounters(activeCount, newCount, inactiveCount, removedCount) {
    // Update tab badges - ADDED REMOVED COUNT
    document.getElementById("activeCount").textContent = activeCount;
    document.getElementById("newCount").textContent = newCount;
    document.getElementById("inactiveCount").textContent = inactiveCount;
    document.getElementById("removedCount").textContent = removedCount;

    // Update summary cards - ADDED REMOVED COUNT
    document.getElementById("summaryActiveCount").textContent = activeCount;
    document.getElementById("summaryNewCount").textContent = newCount;
    document.getElementById("summaryInactiveCount").textContent = inactiveCount;
    document.getElementById("summaryRemovedCount").textContent = removedCount;

    // Update content counters - ADDED REMOVED COUNT
    document.getElementById("activeSupervisorsCount").textContent = activeCount;
    document.getElementById("newSupervisorsCount").textContent = newCount;
    document.getElementById("inactiveSupervisorsCount").textContent =
      inactiveCount;
    document.getElementById("removedSupervisorsCount").textContent =
      removedCount;
  }

  loadTabSupervisors(tab, supervisors) {
    const grid = document.getElementById(`${tab}SupervisorsGrid`);
    const emptyState = document.getElementById(`${tab}EmptyState`);

    if (!grid || !emptyState) {
      console.error(`Required DOM elements not found for tab: ${tab}`);
      return;
    }

    grid.innerHTML = "";

    if (supervisors.length === 0) {
      emptyState.classList.remove("hidden");
      grid.classList.add("hidden");
    } else {
      emptyState.classList.add("hidden");
      grid.classList.remove("hidden");

      supervisors.forEach((supervisor) => {
        const supervisorCard = this.createSupervisorCard(supervisor, tab);
        grid.appendChild(supervisorCard);
      });
    }
  }

  createSupervisorCard(supervisor, tab = "active") {
    const card = document.createElement("div");
    card.className =
      "bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6";

    // Determine status based on tab and supervisor properties
    let statusColor, statusText, statusClass, icon;

    if (tab === "active") {
      statusColor = "bg-green-500";
      statusText = "Active";
      statusClass =
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      icon = "person";
    } else if (tab === "new") {
      statusColor = "bg-amber-500";
      statusText = "Pending";
      statusClass =
        "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      icon = "pending";
    } else if (tab === "inactive") {
      statusColor = "bg-slate-400";
      statusText = "Inactive";
      statusClass =
        "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300";
      icon = "pause";
    } else if (tab === "removed") {
      statusColor = "bg-red-500";
      statusText = "Removed";
      statusClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      icon = "delete";
    }

    card.innerHTML = `
        <div class="flex items-center space-x-4 mb-4">
            <div class="w-12 h-12 ${statusColor} rounded-full flex items-center justify-center">
                <span class="material-symbols-outlined text-white">${icon}</span>
            </div>
            <div class="flex-1">
                <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-slate-800 dark:text-slate-100">${
                      supervisor.displayName || "Supervisor"
                    }</h3>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                        ${statusText}
                    </span>
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400">${
                  supervisor.email
                }</p>
                ${
                  tab === "new"
                    ? `
                    <p class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Account pending activation
                    </p>
                `
                    : tab === "removed"
                    ? `
                    <p class="text-xs text-red-600 dark:text-red-400 mt-1">
                        Account has been removed
                    </p>
                `
                    : ""
                }
            </div>
        </div>
        <div class="space-y-2 text-sm">
            <div class="flex justify-between">
                <span class="text-slate-600 dark:text-slate-400">Students Assigned:</span>
                <span class="font-medium text-slate-800 dark:text-slate-100">${
                  supervisor.students?.length || 0
                }</span>
            </div>
            <div class="flex justify-between">
                <span class="text-slate-600 dark:text-slate-400">Applications:</span>
                <span class="font-medium text-slate-800 dark:text-slate-100">${
                  supervisor.applications?.length || 0
                }</span>
            </div>
            ${
              tab === "new"
                ? `
                <div class="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                    <span class="text-amber-600 dark:text-amber-400 text-xs">Status:</span>
                    <span class="text-amber-600 dark:text-amber-400 text-xs font-medium">Pending Activation</span>
                </div>
            `
                : tab === "removed" && supervisor.removalReason
                ? `
                <div class="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                    <span class="text-red-600 dark:text-red-400 text-xs">Removal Reason:</span>
                    <span class="text-red-600 dark:text-red-400 text-xs font-medium">${supervisor.removalReason}</span>
                </div>
            `
                : ""
            }
        </div>
        <div class="mt-4 flex space-x-2">
            ${
              tab === "active"
                ? `
                <button class="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors manage-supervisor" data-supervisor-id="${supervisor.id}">
                    Manage
                </button>
                <button class="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white text-sm rounded transition-colors more-actions" data-supervisor-id="${supervisor.id}">
                    <span class="material-symbols-outlined text-sm">more_vert</span>
                </button>
            `
                : tab === "new"
                ? `
                <button class="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded transition-colors activate-supervisor" data-supervisor-id="${supervisor.id}">
                    Activate Account
                </button>
                <button class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors reject-supervisor" data-supervisor-id="${supervisor.id}">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            `
                : tab === "inactive"
                ? `
                <button class="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors reactivate-supervisor" data-supervisor-id="${supervisor.id}">
                    Reactivate
                </button>
                <button class="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white text-sm rounded transition-colors more-actions" data-supervisor-id="${supervisor.id}">
                    <span class="material-symbols-outlined text-sm">more_vert</span>
                </button>
            `
                : tab === "removed"
                ? `
                <button class="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors restore-supervisor" data-supervisor-id="${supervisor.id}">
                    Restore
                </button>
                <button class="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white text-sm rounded transition-colors more-actions" data-supervisor-id="${supervisor.id}">
                    <span class="material-symbols-outlined text-sm">more_vert</span>
                </button>
            `
                : ""
            }
        </div>
    `;

    // Add event listeners based on supervisor status and tab
    this.attachSupervisorCardListeners(card, supervisor, tab);

    return card;
  }

  attachSupervisorCardListeners(card, supervisor, tab) {
    if (tab === "active") {
      // Active supervisor actions
      const manageBtn = card.querySelector(".manage-supervisor");
      const moreBtn = card.querySelector(".more-actions");

      if (manageBtn) {
        manageBtn.addEventListener("click", () =>
          this.manageSupervisor(supervisor)
        );
      }
      if (moreBtn) {
        moreBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.showSupervisorActions(supervisor, e.target);
        });
      }
    } else if (tab === "new") {
      // Pending supervisor actions
      const activateBtn = card.querySelector(".activate-supervisor");
      const rejectBtn = card.querySelector(".reject-supervisor");

      if (activateBtn) {
        activateBtn.addEventListener("click", () =>
          this.activateSupervisor(supervisor)
        );
      }
      if (rejectBtn) {
        rejectBtn.addEventListener("click", () =>
          this.rejectSupervisor(supervisor)
        );
      }
    } else if (tab === "inactive") {
      // Inactive supervisor actions
      const reactivateBtn = card.querySelector(".reactivate-supervisor");
      const moreBtn = card.querySelector(".more-actions");

      if (reactivateBtn) {
        reactivateBtn.addEventListener("click", () =>
          this.reactivateSupervisor(supervisor)
        );
      }
      if (moreBtn) {
        moreBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.showSupervisorActions(supervisor, e.target, "inactive");
        });
      }
    } else if (tab === "removed") {
      // Removed supervisor actions
      const restoreBtn = card.querySelector(".restore-supervisor");
      const moreBtn = card.querySelector(".more-actions");

      if (restoreBtn) {
        restoreBtn.addEventListener("click", () =>
          this.restoreSupervisor(supervisor)
        );
      }
      if (moreBtn) {
        moreBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.showSupervisorActions(supervisor, e.target, "removed");
        });
      }
    }
  }

  // Action methods for supervisor management
  async activateSupervisor(supervisor) {
    try {
      console.log("Activating supervisor:", supervisor.id);

      // Show confirmation dialog
      const confirmed = confirm(
        `Are you sure you want to activate ${
          supervisor.displayName || "this supervisor"
        }? This will allow them full access to the system.`
      );

      if (!confirmed) return;

      // Call service to update supervisor status
      const success = await this.firestore.activateSupervisorAccount(
        supervisor.id
      );

      if (success) {
        this.showSuccess(
          `Supervisor ${supervisor.displayName} activated successfully`
        );
        await this.refreshSupervisors(); // Refresh the list
      } else {
        this.showError("Failed to activate supervisor account");
      }
    } catch (error) {
      console.error("Error activating supervisor:", error);
      this.showError("Failed to activate supervisor account");
    }
  }

  async reactivateSupervisor(supervisor) {
    try {
      console.log("Reactivating supervisor:", supervisor.id);

      const confirmed = confirm(
        `Are you sure you want to reactivate ${
          supervisor.displayName || "this supervisor"
        }?`
      );

      if (!confirmed) return;

      const success = await this.firestore.reactivateSupervisorAccount(
        supervisor.id
      );

      if (success) {
        this.showSuccess(
          `Supervisor ${supervisor.displayName} reactivated successfully`
        );
        await this.refreshSupervisors();
      } else {
        this.showError("Failed to reactivate supervisor account");
      }
    } catch (error) {
      console.error("Error reactivating supervisor:", error);
      this.showError("Failed to reactivate supervisor account");
    }
  }

  async restoreSupervisor(supervisor) {
    try {
      console.log("Restoring supervisor:", supervisor.id);

      const confirmed = confirm(
        `Are you sure you want to restore ${
          supervisor.displayName || "this supervisor"
        }? This will reactivate their account.`
      );

      if (!confirmed) return;

      const success = await this.firestore.restoreSupervisorAccount(
        supervisor.id
      );

      if (success) {
        this.showSuccess(
          `Supervisor ${supervisor.displayName} restored successfully`
        );
        await this.refreshSupervisors();
      } else {
        this.showError("Failed to restore supervisor account");
      }
    } catch (error) {
      console.error("Error restoring supervisor:", error);
      this.showError("Failed to restore supervisor account");
    }
  }

  async rejectSupervisor(supervisor) {
    try {
      console.log("Rejecting supervisor:", supervisor.id);

      // Show confirmation dialog
      const confirmed = confirm(
        `Are you sure you want to reject ${
          supervisor.displayName || "this supervisor"
        }? This action cannot be undone.`
      );

      if (!confirmed) return;

      const reason = prompt(
        "Please provide a reason for rejection (optional):"
      );

      // Call service to reject supervisor
      const success = await this.firestore.rejectSupervisorAccount(
        supervisor.id,
        reason
      );

      if (success) {
        this.showSuccess(`Supervisor ${supervisor.displayName} rejected`);
        await this.refreshSupervisors(); // Refresh the list
      } else {
        this.showError("Failed to reject supervisor account");
      }
    } catch (error) {
      console.error("Error rejecting supervisor:", error);
      this.showError("Failed to reject supervisor account");
    }
  }
  manageSupervisor(supervisor) {
    console.log("Managing supervisor:", supervisor);

    // Navigate to the supervisor management page with supervisor ID
    window.location.href = `supervisor_details.html?id=${supervisor.id}`;
  }

  showSupervisorActions(supervisor, targetElement, tab = "active") {
    // Create and show actions dropdown menu
    this.createActionsDropdown(supervisor, targetElement, tab);
  }

  createActionsDropdown(supervisor, targetElement, tab = "active") {
    // Remove existing dropdown if any
    const existingDropdown = document.querySelector(
      ".supervisor-actions-dropdown"
    );
    if (existingDropdown) {
      existingDropdown.remove();
    }

    // Create dropdown menu
    const dropdown = document.createElement("div");
    dropdown.className =
      "supervisor-actions-dropdown fixed z-50 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none";
    dropdown.style.position = "absolute";

    const isActive = supervisor.allowed === true && tab === "active";
    const isNew = tab === "new";
    const isInactive = tab === "inactive";
    const isRemoved = supervisor.removed === true; // NEW: Check if supervisor is removed

    dropdown.innerHTML = `
        <div class="py-1" role="none">
            ${
              isNew
                ? `
                <button class="action-activate flex items-center w-full px-4 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900">
                    <span class="material-symbols-outlined text-sm mr-3">check_circle</span>
                    Activate Account
                </button>
            `
                : isInactive && !isRemoved
                ? `
                <button class="action-reactivate flex items-center w-full px-4 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900">
                    <span class="material-symbols-outlined text-sm mr-3">play_circle</span>
                    Reactivate Account
                </button>
            `
                : isRemoved
                ? `
                <button class="action-restore flex items-center w-full px-4 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900">
                    <span class="material-symbols-outlined text-sm mr-3">undo</span>
                    Restore User Account
                </button>
            `
                : `
                <button class="action-deactivate flex items-center w-full px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900">
                    <span class="material-symbols-outlined text-sm mr-3">pause_circle</span>
                    Deactivate Account
                </button>
            `
            }
            
            ${
              isActive
                ? `
            <button class="action-manage flex items-center w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900">
                <span class="material-symbols-outlined text-sm mr-3">manage_accounts</span>
                Manage Students
            </button>
            `
                : ""
            }
            
            <button class="action-view flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <span class="material-symbols-outlined text-sm mr-3">visibility</span>
                View Details
            </button>
            
            <button class="action-email flex items-center w-full px-4 py-2 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900">
                <span class="material-symbols-outlined text-sm mr-3">mail</span>
                Send Email
            </button>
            <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
            ${
              isNew
                ? `
                <button class="action-reject flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900">
                    <span class="material-symbols-outlined text-sm mr-3">close</span>
                    Reject Supervisor
                </button>
            `
                : !isRemoved
                ? `
                <button class="action-remove flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900">
                    <span class="material-symbols-outlined text-sm mr-3">delete</span>
                    Remove Supervisor
                </button>
            `
                : `
                <button class="action-permanent-remove flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900">
                    <span class="material-symbols-outlined text-sm mr-3">delete_forever</span>
                    Permanent Delete
                </button>
            `
            }
        </div>
    `;

    // Add event listeners
    this.attachActionListeners(dropdown, supervisor, tab);

    // Position and show dropdown
    this.positionDropdown(dropdown, targetElement);
    document.body.appendChild(dropdown);

    // Close dropdown when clicking outside
    this.setupDropdownCloseHandler(dropdown);
  }
  attachActionListeners(dropdown, supervisor, tab) {
    // Activate/Deactivate/Reactivate/Restore
    if (tab === "new") {
      const activateBtn = dropdown.querySelector(".action-activate");
      if (activateBtn) {
        activateBtn.addEventListener("click", () => {
          this.activateSupervisor(supervisor);
          dropdown.remove();
        });
      }
    } else if (tab === "inactive") {
      const reactivateBtn = dropdown.querySelector(".action-reactivate");
      if (reactivateBtn) {
        reactivateBtn.addEventListener("click", () => {
          this.reactivateSupervisor(supervisor);
          dropdown.remove();
        });
      }
    } else if (tab === "removed") {
      // Handle restore action for removed supervisors
      const restoreBtn = dropdown.querySelector(".action-restore");
      if (restoreBtn) {
        restoreBtn.addEventListener("click", () => {
          this.restoreSupervisor(supervisor);
          dropdown.remove();
        });
      }

      // Also handle permanent delete if needed
      const permanentRemoveBtn = dropdown.querySelector(
        ".action-permanent-remove"
      );
      if (permanentRemoveBtn) {
        permanentRemoveBtn.addEventListener("click", () => {
          // Add your permanent delete logic here
          console.log("Permanent delete clicked for:", supervisor.id);
          dropdown.remove();
        });
      }
    } else {
      // Active supervisors
      const deactivateBtn = dropdown.querySelector(".action-deactivate");
      if (deactivateBtn) {
        deactivateBtn.addEventListener("click", () => {
          this.checkAndReassignStudents(supervisor);
          dropdown.remove();
        });
      }
    }

    // Manage Students (only for active)
    if (tab === "active") {
      const manageBtn = dropdown.querySelector(".action-manage");
      if (manageBtn) {
        manageBtn.addEventListener("click", () => {
          this.manageSupervisor(supervisor);
          dropdown.remove();
        });
      }
    }

    // View Details (available for all)
    const viewBtn = dropdown.querySelector(".action-view");
    if (viewBtn) {
      viewBtn.addEventListener("click", () => {
        this.viewSupervisorDetails(supervisor);
        dropdown.remove();
      });
    }

    // Send Email (available for all)
    const emailBtn = dropdown.querySelector(".action-email");
    if (emailBtn) {
      emailBtn.addEventListener("click", () => {
        this.emailSupervisor(supervisor);
        dropdown.remove();
      });
    }

    // Reject/Remove
    if (tab === "new") {
      const rejectBtn = dropdown.querySelector(".action-reject");
      if (rejectBtn) {
        rejectBtn.addEventListener("click", () => {
          this.rejectSupervisor(supervisor);
          dropdown.remove();
        });
      }
    } else if (tab !== "removed") {
      // Remove button (not available for removed supervisors)
      const removeBtn = dropdown.querySelector(".action-remove");
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          this.checkAndReassignStudents(supervisor);
          dropdown.remove();
        });
      }
    }
  }

  positionDropdown(dropdown, targetElement) {
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX - 200}px`;
  }

  setupDropdownCloseHandler(dropdown) {
    const closeHandler = (event) => {
      if (
        !dropdown.contains(event.target) &&
        !event.target.closest(".more-actions")
      ) {
        dropdown.remove();
        document.removeEventListener("click", closeHandler);
      }
    };

    // Close on outside click after a small delay to allow for the current click to register
    setTimeout(() => {
      document.addEventListener("click", closeHandler);
    }, 100);
  }

  viewSupervisorDetails(supervisor) {
    console.log("Viewing supervisor details:", supervisor);

    // Create and show a details modal
    this.showSupervisorDetailsModal(supervisor);
  }

  showSupervisorDetailsModal(supervisor) {
    console.log("created at is " + supervisor.createdAt);
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50";
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">Supervisor Details</h3>
                <button class="close-modal text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <div class="p-6">
                <div class="flex items-center space-x-4 mb-6">
                    <div class="w-16 h-16 ${
                      supervisor.allowed ? "bg-green-500" : "bg-amber-500"
                    } rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-2xl">person</span>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold text-slate-800 dark:text-slate-100">${
                          supervisor.displayName || "Supervisor"
                        }</h4>
                        <p class="text-slate-600 dark:text-slate-400">${
                          supervisor.email
                        }</p>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          supervisor.allowed
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                        }">
                            ${
                              supervisor.allowed
                                ? "Active"
                                : "Pending Activation"
                            }
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Student Capacity</label>
                        <p class="text-slate-800 dark:text-slate-200">${
                          supervisor.students?.length || 0
                        } / ${supervisor.maxStudents || "N/A"}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Application Capacity</label>
                        <p class="text-slate-800 dark:text-slate-200">${
                          supervisor.applications?.length || 0
                        } / ${supervisor.maxApplications || "N/A"}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Created</label>
                        <p class="text-slate-800 dark:text-slate-200">${formatTimestamp(
                          supervisor.createdAt
                        )}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Last Login</label>
                        <p class="text-slate-800 dark:text-slate-200">${formatTimestamp(
                          supervisor.lastLogin
                        )}</p>
                    </div>
                </div>

                ${
                  supervisor.activatedAt
                    ? `
                    <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                        <div class="flex items-center">
                            <span class="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                            <span class="text-green-800 dark:text-green-300 text-sm">Activated on ${supervisor.activatedAt.toLocaleDateString()}</span>
                        </div>
                    </div>
                `
                    : ""
                }

                <div class="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button class="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors close-modal">
                        Close
                    </button>
                    <button class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors manage-from-modal">
                        Manage Students
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    modal.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", () => modal.remove());
    });

    const manageBtn = modal.querySelector(".manage-from-modal");
    if (manageBtn) {
      manageBtn.addEventListener("click", () => {
        modal.remove();
        this.manageSupervisor(supervisor);
      });
    }

    document.body.appendChild(modal);
  }

  emailSupervisor(supervisor) {
    console.log("Emailing supervisor:", supervisor);
    const subject = encodeURIComponent("IT Connect - Supervisor Account");
    const body = encodeURIComponent(`Hello ${supervisor.displayName},\n\n`);
    window.location.href = `mailto:${supervisor.email}?subject=${subject}&body=${body}`;
  }

  async reassignAllStudents(supervisor) {
    try {
      const studentCount = supervisor.students?.length || 0;
      if (studentCount === 0) {
        this.showError("No students to reassign");
        return;
      }

      const confirmed = confirm(
        `Are you sure you want to reassign all ${studentCount} students from ${supervisor.displayName}? This will remove all current assignments.`
      );

      if (!confirmed) return;

      const success = await this.firestore.reassignAllStudents(supervisor.id);

      if (success) {
        this.showSuccess(
          `All students reassigned from ${supervisor.displayName}`
        );
        await this.refreshSupervisors();
      } else {
        this.showError("Failed to reassign students");
      }
    } catch (error) {
      console.error("Error reassigning students:", error);
      this.showError("Failed to reassign students");
    }
  }

  async removeSupervisor(supervisor) {
    try {
      const confirmed = confirm(
        `Are you sure you want to remove ${supervisor.displayName}? This action cannot be undone and will remove all their assignments.`
      );

      if (!confirmed) {
        console.log("not confirmed ");
        hideLoadingOverlay();
        return;
      }

      const reason = prompt("Please provide a reason for removal (optional):");

      const success = await this.firestore.removeSupervisor(
        supervisor.id,
        reason
      );

      if (success) {
        this.showSuccess(
          `Supervisor ${supervisor.displayName} removed successfully`
        );
        await this.refreshSupervisors();
      } else {
        this.showError("Failed to remove supervisor");
      }
    } catch (error) {
      console.error("Error removing supervisor:", error);
      this.showError("Failed to remove supervisor");
    }
  }

  showAssignModal() {
    const modal = document.getElementById("assignStudentsModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  hideAssignModal() {
    const modal = document.getElementById("assignStudentsModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  toggleAssignmentType(type) {
    const manualAssignment = document.getElementById("manualAssignment");
    const confirmAssignBtn = document.getElementById("confirmAssignBtn");

    if (manualAssignment) {
      if (type === "manual") {
        manualAssignment.classList.remove("hidden");
        this.initializeManualAssignment();
      } else {
        manualAssignment.classList.add("hidden");
        confirmAssignBtn.textContent = "Assign Students";
      }
    }
  }

  async initializeManualAssignment() {
    try {
      // Get active supervisors and students
      const [supervisors, students] = await Promise.all([
        this.firestore.getActiveSupervisors(),
        this.firestore.getAllCurrentTraineesWithData(),
      ]);

      this.renderManualAssignmentInterface(supervisors, students);
    } catch (error) {
      console.error("Error initializing manual assignment:", error);
      this.showNotification(
        "Error loading data for manual assignment",
        "error"
      );
    }
  }

  renderManualAssignmentInterface(supervisors, students) {
    const manualAssignment = document.getElementById("manualAssignment");

    // Add CSS only once
    if (!document.getElementById("manual-assignment-styles")) {
      const style = document.createElement("style");
      style.id = "manual-assignment-styles";
      style.textContent = `
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-track {
                background: #334155;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #475569;
            }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #64748b;
            }
            
            /* Better touch targets for mobile */
            @media (max-width: 640px) {
                .student-checkbox {
                    min-height: 20px;
                    min-width: 20px;
                }
                .manual-assignment-label {
                    min-height: 44px;
                }
            }
        `;
      document.head.appendChild(style);
    }
    manualAssignment.innerHTML = `
        <div class="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto px-1 py-2 manual-assignment-container">
            <!-- Supervisor Selection -->
            <div class="px-2">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Supervisor
                </label>
                <select id="supervisorSelect" class="w-full p-3 text-sm sm:text-base border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Choose a supervisor...</option>
                    ${supervisors
                      .map(
                        (supervisor) => `
                        <option value="${supervisor.id}" data-max="${
                          supervisor.maxStudents || 10
                        }">
                            ${supervisor.displayName} (${
                          supervisor.students?.length || 0
                        } students)
                        </option>
                    `
                      )
                      .join("")}
                </select>
            </div>

            <!-- Students Selection -->
            <div class="px-2">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Select Students to Assign
                </label>
                <div class="max-h-48 sm:max-h-60 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 p-2 custom-scrollbar">
                    ${
                      students.length > 0
                        ? students
                            .map(
                              (student) => `
                        <label class="manual-assignment-label flex items-center space-x-3 p-2 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-600 rounded cursor-pointer transition-colors duration-150">
                            <input type="checkbox" value="${
                              student.uid
                            }" class="student-checkbox rounded text-blue-500 focus:ring-blue-500 h-4 w-4 sm:h-5 sm:w-5">
                            <span class="text-sm sm:text-base text-slate-700 dark:text-slate-300 truncate flex-1">
                                ${
                                  student.studentInfo.fullName ||
                                  student.studentInfo.email ||
                                  student.studentInfo.uid
                                }
                            </span>
                        </label>
                    `
                            )
                            .join("")
                        : `
                        <div class="text-center py-6 sm:py-8">
                            <span class="material-symbols-outlined text-3xl sm:text-4xl text-slate-400 mb-2">group_off</span>
                            <p class="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                                No students available for assignment.
                            </p>
                        </div>
                    `
                    }
                </div>
                <div class="flex justify-between items-center mt-3 px-1">
                    <span class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Selected: <span id="selectedCount" class="font-medium">0</span> students
                    </span>
                    <button id="selectAllBtn" class="text-xs sm:text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-2 py-1 rounded transition-colors">
                        Select All
                    </button>
                </div>
            </div>

            <!-- Assignment Progress -->
            <div id="assignmentProgress" class="hidden px-2">
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                    <div class="flex items-center space-x-2 mb-3">
                        <span class="material-symbols-outlined text-blue-500 text-lg">assignment</span>
                        <h4 class="font-medium text-blue-800 dark:text-blue-300 text-sm sm:text-base">Assignment Preview</h4>
                    </div>
                    <div class="space-y-2 sm:space-y-3" id="progressList">
                        <!-- Progress items will be added here -->
                    </div>
                </div>
            </div>
        </div>
    `;

    this.setupManualAssignmentEvents();
  }

  setupManualAssignmentEvents() {
    const supervisorSelect = document.getElementById("supervisorSelect");
    const studentCheckboxes = document.querySelectorAll(".student-checkbox");
    const selectAllBtn = document.getElementById("selectAllBtn");
    const selectedCount = document.getElementById("selectedCount");
    const confirmAssignBtn = document.getElementById("confirmAssignBtn");

    // Update selected count
    studentCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const selected = document.querySelectorAll(".student-checkbox:checked");
        selectedCount.textContent = selected.length;
      });
    });

    // Select all functionality
    selectAllBtn.addEventListener("click", () => {
      const allChecked = Array.from(studentCheckboxes).every(
        (cb) => cb.checked
      );
      studentCheckboxes.forEach((checkbox) => {
        checkbox.checked = !allChecked;
      });
      const selected = document.querySelectorAll(".student-checkbox:checked");
      selectedCount.textContent = selected.length;
      selectAllBtn.textContent = allChecked ? "Select All" : "Deselect All";
    });

    // Supervisor selection change
    supervisorSelect.addEventListener("change", () => {
      const selectedOption =
        supervisorSelect.options[supervisorSelect.selectedIndex];
      const maxStudents = selectedOption
        ? parseInt(selectedOption.dataset.max)
        : 0;

      if (maxStudents > 0) {
        // You could add validation for max students here
      }
    });

    // Update confirm button text
    confirmAssignBtn.textContent = "Start Manual Assignment";
  }

  async startManualAssignment() {
    const confirmAssignBtn = document.getElementById("confirmAssignBtn");
    confirmAssignBtn.textContent = "Previewing..";
    const supervisorSelect = document.getElementById("supervisorSelect");
    const selectedSupervisorId = supervisorSelect.value;
    const selectedStudents = Array.from(
      document.querySelectorAll(".student-checkbox:checked")
    ).map((cb) => cb.value);

    if (!selectedSupervisorId) {
      this.showNotification("Please select a supervisor", "error");
      return;
    }

    if (selectedStudents.length === 0) {
      this.showNotification("Please select at least one student", "error");
      return;
    }

    //const selectedSupervisor = await this.firestore.getSupervisorById(selectedSupervisorId);
    // Show assignment progress
    this.showAssignmentProgress(selectedSupervisorId, selectedStudents);
  }

  async showAssignmentProgress(supervisorId, studentIds) {
    const assignmentProgress = document.getElementById("assignmentProgress");
    const progressList = document.getElementById("progressList");
    const confirmAssignBtn = document.getElementById("confirmAssignBtn");

    // Get supervisor details
    const supervisors = await this.firestore.getActiveSupervisors();
    const supervisor = supervisors.find((s) => s.id === supervisorId);

    assignmentProgress.classList.remove("hidden");
    confirmAssignBtn.textContent = "Confirm Assignment";
    confirmAssignBtn.onclick = () =>
      this.confirmManualAssignment(supervisorId, studentIds);

    // Show initial progress - mobile optimized
    progressList.innerHTML = `
        <div class="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
            <div class="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <span class="material-symbols-outlined text-blue-500 text-sm flex-shrink-0">person</span>
                <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        ${supervisor.displayName}
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400 truncate">
                        ${supervisor.email}
                    </div>
                </div>
            </div>
            <div class="text-right flex-shrink-0 ml-2">
                <div class="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">To assign</div>
                <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    ${studentIds.length} students
                </div>
            </div>
        </div>
        <div class="text-center py-4 sm:py-6">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Ready to assign students
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Click "Confirm Assignment" to proceed
            </p>
        </div>
    `;

    // Scroll to progress section on mobile
    if (window.innerWidth < 640) {
      assignmentProgress.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }

  async confirmManualAssignment(supervisorId, studentIds) {
    try {
      const confirmAssignBtn = document.getElementById("confirmAssignBtn");
      const progressList = document.getElementById("progressList");

      // Disable confirm button and show processing
      confirmAssignBtn.disabled = true;
      confirmAssignBtn.textContent = "Assigning...";

      progressList.innerHTML = `
            <div class="text-center py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Assigning ${studentIds.length} students...
                </p>
            </div>
        `;

      // Perform the assignment
      await this.firestore.assignStudentsToSupervisor(supervisorId, studentIds);

      // Show success message
      progressList.innerHTML = `
            <div class="text-center py-4">
                <span class="material-symbols-outlined text-green-500 text-4xl mb-2">check_circle</span>
                <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assignment Successful!
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                    ${studentIds.length} students assigned successfully.
                </p>
            </div>
        `;

      confirmAssignBtn.textContent = "Completed";
      confirmAssignBtn.classList.add("bg-green-500", "hover:bg-green-600");

      // Close modal after delay
      setTimeout(() => {
        this.closeAssignModal();
        this.showNotification(
          `Successfully assigned ${studentIds.length} students`,
          "success"
        );
        this.loadSupervisors(); // Refresh the supervisors list
      }, 2000);
    } catch (error) {
      console.error("Error in manual assignment:", error);
      this.showNotification("Error assigning students", "error");

      const confirmAssignBtn = document.getElementById("confirmAssignBtn");
      confirmAssignBtn.disabled = false;
      confirmAssignBtn.textContent = "Try Again";
    }
  }

  closeAssignModal() {
    const modal = document.getElementById("assignStudentsModal");
    modal.classList.add("hidden");

    // Reset modal state
    const confirmAssignBtn = document.getElementById("confirmAssignBtn");
    confirmAssignBtn.disabled = false;
    confirmAssignBtn.textContent = "Assign Students";
    confirmAssignBtn.classList.remove("bg-green-500", "hover:bg-green-600");
    confirmAssignBtn.onclick = null;
  }

  showNotification(message, type = "info") {
    // Create and show notification (you can use your existing notification system)
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === "success"
        ? "bg-green-500 text-white"
        : type === "error"
        ? "bg-red-500 text-white"
        : "bg-blue-500 text-white"
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  async assignStudents() {
    try {
      const assignmentType = document.querySelector(
        'input[name="assignmentType"]:checked'
      );

      if (!assignmentType) {
        this.showError("Please select an assignment type");
        return;
      }

      if (assignmentType.value === "random") {
        await this.firestore.assignStudentsRandomly();
        this.showSuccess("Students assigned randomly to supervisors");
      } else {
        // Manual assignment logic would go here
        this.showSuccess("Manual assignment completed");
      }

      this.hideAssignModal();
      await this.refreshSupervisors();
    } catch (error) {
      console.error("Error assigning students:", error);
      this.showError("Failed to assign students");
    }
  }

  // UI Helper Methods
  hideAllSections() {
    const sections = [
      "codeGenerationSection",
      "generatedCodeSection",
      "supervisorKeySection",
      "supervisorsSection",
      "loadingSection",
    ];

    sections.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.add("hidden");
      }
    });
  }

  showCodeGenerationSection() {
    this.hideAllSections();
    const section = document.getElementById("codeGenerationSection");
    if (section) {
      section.classList.remove("hidden");
    }
  }

  showGeneratedCodeSection() {
    const section = document.getElementById("generatedCodeSection");
    if (section) {
      section.classList.remove("hidden");
    }
  }

  hideCodeGenerationSection() {
    const section = document.getElementById("codeGenerationSection");
    if (section) {
      section.classList.add("hidden");
    }
  }

  showLoading(show) {
    const loadingSection = document.getElementById("loadingSection");
    if (!loadingSection) return;

    if (show) {
      this.hideAllSections();
      loadingSection.classList.remove("hidden");
    } else {
      loadingSection.classList.add("hidden");
    }
  }

  showError(message) {
    // Implement toast or alert notification
    console.error("Error:", message);
    alert(`Error: ${message}`);
  }

  showSuccess(message) {
    // Implement toast notification
    console.log("Success:", message);
    alert(`Success: ${message}`);
  }

  // Add this method to your SupervisorController class
  async checkAndReassignStudents(supervisor) {
    try {
      showLoadingOverlay("Preparing reassignment dialog...");

      // Check if supervisor has students
      const studentCheck = await this.firestore.checkSupervisorHasStudents(
        supervisor.id
      );

      if (!studentCheck.hasStudents) {
        // If no students, just deactivate the supervisor
        const confirmed = confirm(
          `No students assigned to ${supervisor.displayName}. Do you want to deactivate this supervisor account?`
        );

        if (confirmed) {
          await this.firestore.deactivateSupervisorAccount(
            supervisor.id,
            "No students assigned"
          );
          hideLoadingOverlay();
          this.showSuccess(
            `Supervisor ${supervisor.displayName} deactivated successfully`
          );
          await this.refreshSupervisors();
        }
        hideLoadingOverlay();
        return;
      }
      hideLoadingOverlay();
      // If supervisor has students, show reassignment modal
      await this.showReassignmentModal(supervisor, studentCheck);
    } catch (error) {
      console.error("Error in check and reassign:", error);
      this.showError("Failed to process supervisor reassignment");
    } finally {
      this.showLoading(false);
    }
  }

  async showReassignmentModal(supervisor, studentCheck) {
    // Create and show reassignment modal
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50";
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 class="text-xl font-bold text-slate-800 dark:text-slate-100">Reassign Students</h3>
                <button class="close-reassign-modal text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <div class="p-6">
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                    <div class="flex items-start">
                        <span class="material-symbols-outlined text-amber-500 mr-2 mt-0.5">warning</span>
                        <div>
                            <h4 class="font-medium text-amber-800 dark:text-amber-300">Supervisor Has Students Assigned</h4>
                            <p class="text-amber-700 dark:text-amber-400 text-sm mt-1">
                                ${supervisor.displayName} has ${studentCheck.studentCount} student(s) assigned. 
                                You need to reassign these students before deactivating this supervisor.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        Select a supervisor to transfer students to:
                    </label>
                    <div class="space-y-3 max-h-60 overflow-y-auto" id="availableSupervisorsList">
                        <div class="flex items-center justify-center py-8">
                            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 mb-6">
                    <h4 class="font-medium text-slate-700 dark:text-slate-300 mb-2">Summary</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-slate-600 dark:text-slate-400">Current Supervisor:</span>
                            <p class="font-medium text-slate-800 dark:text-slate-200">${supervisor.displayName}</p>
                        </div>
                        <div>
                            <span class="text-slate-600 dark:text-slate-400">Students to Transfer:</span>
                            <p class="font-medium text-slate-800 dark:text-slate-200">${studentCheck.studentCount} student(s)</p>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button class="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors close-reassign-modal">
                        Cancel
                    </button>
                    <button class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" id="confirmReassignBtn" disabled>
                        Reassign Students & Deactivate
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add event listeners
    modal.querySelectorAll(".close-reassign-modal").forEach((btn) => {
      btn.addEventListener("click", () => modal.remove());
    });

    const confirmBtn = modal.querySelector("#confirmReassignBtn");

    // Load available supervisors
    this.loadAvailableSupervisors(
      modal,
      supervisor.id,
      studentCheck,
      confirmBtn
    );

    // Confirm reassignment
    confirmBtn.addEventListener("click", async () => {
      if (!this.selectedSupervisorId) return;

      await this.executeReassignment(
        supervisor,
        this.selectedSupervisorId,
        studentCheck.studentIds,
        modal
      );
    });

    document.body.appendChild(modal);
  }

  async loadAvailableSupervisors(
    modal,
    excludeSupervisorId,
    studentCheck,
    confirmBtn
  ) {
    try {
      const availableSupervisors = await this.firestore.getAvailableSupervisors(
        excludeSupervisorId
      );
      const supervisorsList = modal.querySelector("#availableSupervisorsList");

      if (availableSupervisors.length === 0) {
        supervisorsList.innerHTML = `
                <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">group_off</span>
                    <p>No other active supervisors available.</p>
                    <p class="text-sm mt-1">You need at least one other active supervisor to reassign students.</p>
                </div>
            `;
        return;
      }

      supervisorsList.innerHTML = availableSupervisors
        .map(
          (supervisor) => `
            <div class="supervisor-option flex items-center p-3 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <input type="radio" name="targetSupervisor" value="${supervisor.id}" class="mr-3" id="supervisor-${supervisor.id}">
                <label for="supervisor-${supervisor.id}" class="flex-1 cursor-pointer">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-slate-800 dark:text-slate-200">${supervisor.displayName}</span>
                        <span class="text-sm text-slate-500 dark:text-slate-400">${supervisor.currentStudentCount} students</span>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-400">${supervisor.email}</p>
                </label>
            </div>
        `
        )
        .join("");

      // Add radio button listeners
      supervisorsList
        .querySelectorAll('input[name="targetSupervisor"]')
        .forEach((radio) => {
          radio.addEventListener("change", (e) => {
            this.selectedSupervisorId = e.target.value;
            confirmBtn.disabled = false;

            // Highlight selected option
            supervisorsList
              .querySelectorAll(".supervisor-option")
              .forEach((option) => {
                option.classList.remove(
                  "bg-blue-50",
                  "dark:bg-blue-900/20",
                  "border-blue-300",
                  "dark:border-blue-700"
                );
              });

            if (e.target.checked) {
              e.target
                .closest(".supervisor-option")
                .classList.add(
                  "bg-blue-50",
                  "dark:bg-blue-900/20",
                  "border-blue-300",
                  "dark:border-blue-700"
                );
            }
          });
        });
    } catch (error) {
      console.error("Error loading available supervisors:", error);
      modal.querySelector("#availableSupervisorsList").innerHTML = `
            <div class="text-center py-8 text-red-500">
                <span class="material-symbols-outlined text-4xl mb-2">error</span>
                <p>Failed to load supervisors</p>
            </div>
        `;
    }
  }

  async executeReassignment(
    sourceSupervisor,
    targetSupervisorId,
    studentIds,
    modal
  ) {
    try {
      this.showLoading(true);

      const result = await this.firestore.reassignStudentsAndDeactivate(
        sourceSupervisor.id,
        targetSupervisorId,
        studentIds
      );

      if (result.success) {
        this.showSuccess(
          `Successfully reassigned ${result.reassignedStudents} student(s) and deactivated ${sourceSupervisor.displayName}`
        );
        modal.remove();
        await this.refreshSupervisors();
      } else {
        this.showError("Failed to reassign students and deactivate supervisor");
      }
    } catch (error) {
      console.error("Error executing reassignment:", error);
      this.showError("Failed to complete reassignment process");
    } finally {
      this.showLoading(false);
    }
  }
}

export { SupervisorController };

document.addEventListener("DOMContentLoaded", async () => {
  const controller = new SupervisorController();
  await controller.init();
});
