import { auth, db } from "../../../js/config/firebaseInit.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";

const it_base_companycloud = new ITBaseCompanyCloud();

class TabManager {
  constructor() {
    this.companyId = null;
    this.currentTab = "overview";
    this.loadedTabs = new Map();
    this.tabContentContainer = document.getElementById("tab-content-container");

    // Data properties from CompanyDashboardManager
    this.applications = [];
    this.applicationsByStatus = {};
    this.trainingStudentsByDate = {};
    this.applicationStats = {};
    this.currentFilters = {};
    this.currentPage = 1;

    this.init();
  }

  async init() {
    await this.initializeDashboard();
    this.setupTabEvents();
    await this.loadTab("overview");
  }

  async initializeDashboard() {
    try {
      await auth.authStateReady();

      if (!auth.currentUser) {
        alert("No authenticated user found. Please log in.");
        window.location.href = "../../auth/company_login.html";
        return;
      }

      this.companyId = auth.currentUser.uid;

      // Load all applications for the company
      this.applications = await it_base_companycloud.getAllCompanyApplications(
        this.companyId
      );

      // Process and categorize the applications
      await this.processApplicationsData();

      // Initialize shared elements and event listeners
      this.initializeSharedElements();
      this.initializeSharedEventListeners();
    } catch (error) {
      console.error("Error loading initial data:", error);
      this.handleLoadError(error);
    }
  }

  async processApplicationsData() {
    if (!this.applications || this.applications.length === 0) {
      console.log("No applications found for this company");
      this.applicationsByStatus = {
        pending: [],
        shortlisted: [],
        accepted: [],
        rejected: [],
      };
      return;
    }

    const now = new Date();

    // Categorize applications by status
    this.applicationsByStatus = {
      pending: this.applications.filter(
        (app) =>
          !app.application.status ||
          app.application.status === "pending" ||
          app.application.status === "submitted"
      ),
      shortlisted: this.applications.filter(
        (app) =>
          app.application.status === "shortlisted" ||
          app.application.status === "reviewed"
      ),
      accepted: this.applications.filter(
        (app) =>
          app.application.status === "accepted" ||
          app.application.status === "approved"
      ),
      rejected: this.applications.filter(
        (app) =>
          app.application.status === "rejected" ||
          app.application.status === "declined"
      ),
    };

    // Categorize by training date
    this.trainingStudentsByDate = {
      current: this.applications.filter((app) => {
        if (!app.application.duration.startDate) return false;
        const startDate = new Date(app.application.duration.startDate);
        const endDate = app.application.duration.endDate
          ? new Date(app.application.duration.endDate)
          : null;
        return startDate <= now && (!endDate || endDate >= now);
      }),
      upcoming: this.applications.filter((app) => {
        if (!app.application.duration.startDate) return false;
        const startDate = new Date(app.application.duration.startDate);
        return startDate > now;
      }),
      completed: this.applications.filter((app) => {
        if (!app.application.duration.endDate) return false;
        const endDate = new Date(app.application.duration.endDate);
        return endDate < now;
      }),
      notStarted: this.applications.filter((app) => {
        return !app.application.duration.startDate;
      }),
    };

    // Calculate statistics
    this.calculateApplicationStats();

    //console.log("Applications by status:", this.applicationsByStatus);
    //console.log("Training students by date:", this.trainingStudentsByDate);
  }

  calculateApplicationStats() {
    const total = this.applications.length;
    const shortlistedCount = this.applicationsByStatus.shortlisted.length;
    const acceptedCount = this.applicationsByStatus.accepted.length;
    const rejectedCount = this.applicationsByStatus.rejected.length;
    const pendingCount = this.applicationsByStatus.pending.length;

    this.applicationStats = {
      total: total,
      shortlisted: shortlistedCount,
      accepted: acceptedCount,
      rejected: rejectedCount,
      pending: pendingCount,
      shortlistedRate:
        total > 0 ? ((shortlistedCount / total) * 100).toFixed(1) : 0,
      acceptanceRate:
        total > 0 ? ((acceptedCount / total) * 100).toFixed(1) : 0,
    };

    console.log("Application statistics:", this.applicationStats);
  }

  getTotalStudentOnIT() {
    let count = 0;
    const currentDate = new Date();

    this.applications.forEach((applicationData) => {
      const application = applicationData.application;

      // ✅ Correctly access nested duration object
      const startDate = application.duration?.startDate
        ? new Date(application.duration.startDate)
        : null;
      const endDate = application.duration?.endDate
        ? new Date(application.duration.endDate)
        : null;

      if (
        startDate &&
        endDate &&
        startDate <= currentDate &&
        endDate >= currentDate
      ) {
        count++;
      }
    });

    return count;
  }

  initializeSharedElements() {
    // Initialize elements shared across all tabs
    this.searchStudentsInput = document.getElementById("search-students-input");
    this.institutionFilter = document.getElementById("institution-filter");
    this.courseFilter = document.getElementById("course-filter");
    this.statusFilter = document.getElementById("status-filter");

    // Stats elements
    this.totalApplicantsValue = document.getElementById(
      "total-applicants-value"
    );
    this.pendingReviewValue = document.getElementById("pending-review-value");
    this.shortlistedValue = document.getElementById("accepted-value");
    this.rejectedValue = document.getElementById("rejected-value");

    // Update stats with real data
    this.updateSharedStats();
  }

  updateSharedStats() {
    if (this.totalApplicantsValue) {
      this.totalApplicantsValue.textContent = this.applicationStats.total || 0;
    }
    if (this.pendingReviewValue) {
      this.pendingReviewValue.textContent = this.applicationStats.pending || 0;
    }
    if (this.shortlistedValue) {
      this.shortlistedValue.textContent = this.applicationStats.accepted || 0;
    }
    if (this.rejectedValue) {
      this.rejectedValue.textContent = this.applicationStats.rejected || 0;
    }
  }

  initializeSharedEventListeners() {
    // Search functionality (shared across tabs)
    if (this.searchStudentsInput) {
      this.searchStudentsInput.addEventListener("input", (e) => {
        this.handleSearch(e);
      });
    }

    // Filter functionality (shared across tabs)
    if (this.institutionFilter) {
      this.institutionFilter.addEventListener("change", (e) => {
        this.handleFilterChange(e);
      });
    }

    if (this.courseFilter) {
      this.courseFilter.addEventListener("change", (e) => {
        this.handleFilterChange(e);
      });
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener("change", (e) => {
        this.handleFilterChange(e);
      });
    }
  }

  // Tab Management Methods
  setupTabEvents() {
    const tabs = document.querySelectorAll(
      'button[class*="px-6 py-3 rounded-lg"]'
    );

    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabId = e.currentTarget.id;
        this.switchTab(tabId);
      });
    });
  }

  async switchTab(tabId) {
    // Update tab styles
    this.updateTabStyles(tabId);

    // Load and show tab content
    await this.loadTab(tabId);

    this.currentTab = tabId;
  }

  updateTabStyles(activeTabId) {
    const tabs = document.querySelectorAll(
      'button[class*="px-6 py-3 rounded-lg"]'
    );

    tabs.forEach((tab) => {
      if (tab.id === activeTabId) {
        tab.classList.add("tab-active");
        tab.classList.remove(
          "text-gray-600",
          "dark:text-gray-400",
          "hover:bg-gray-100",
          "dark:hover:bg-gray-700"
        );
      } else {
        tab.classList.remove("tab-active");
        tab.classList.add(
          "text-gray-600",
          "dark:text-gray-400",
          "hover:bg-gray-100",
          "dark:hover:bg-gray-700"
        );
      }
    });
  }

  async loadTab(tabId) {
    this.showLoadingState();

    try {
      // Always re-fetch and re-initialize tab
      const htmlContent = await this.fetchHTML(
        `../company/studentManagement/${tabId}.html`
      );
      this.tabContentContainer.innerHTML = htmlContent;

      // Initialize tab-specific JS
      await this.initializeTabJS(tabId);

      // Store updated instance
      const tabInstance = window[`${this.getTabClassName(tabId)}Instance`];
      this.loadedTabs.set(tabId, {
        html: htmlContent,
        instance: tabInstance,
      });
    } catch (error) {
      console.error(`Error loading tab ${tabId}:`, error);
      this.tabContentContainer.innerHTML = `
            <div class="text-center py-8 text-red-600">
                Error loading tab content. Please try again.
            </div>
        `;
    }
  }

  async initializeTabJS(tabId) {
    const tabClass = this.getTabClassName(tabId);
    const jsPath = `./${tabClass}.js`;

    try {
      // Dynamically import the tab's JavaScript
      const module = await import(jsPath);

      // Initialize the tab class with TabManager instance
      if (module.default) {
        const tabInstance = new module.default(this); // Pass TabManager instance
        window[`${tabClass}Instance`] = tabInstance;
        await tabInstance.init();
      }
    } catch (error) {
      console.log(error);
      console.warn(
        `No JavaScript module found for ${tabId}, continuing without it.`
      );
    }
  }

  getTabClassName(tabId) {
    // Convert 'overview-tab' to 'OverviewTab'
    return tabId;
  }

  async fetchHTML(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  }

  showLoadingState() {
    this.tabContentContainer.innerHTML = `
            <div class="flex justify-center items-center py-12">
                <div class="loading-animation">
                    <svg width="80" height="40" viewBox="0 0 100 40">
                        <circle cx="20" cy="20" r="8" fill="#3b82f6">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0s"/>
                        </circle>
                        <circle cx="50" cy="20" r="8" fill="#3b82f6">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.2s"/>
                        </circle>
                        <circle cx="80" cy="20" r="8" fill="#3b82f6">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.4s"/>
                        </circle>
                    </svg>
                </div>
            </div>
        `;
  }

  // Data Management Methods
  async refreshData() {
    try {
      // Reload applications data
      this.applications = await it_base_companycloud.getAllCompanyApplications(
        this.companyId
      );
      await this.processApplicationsData();
      this.updateSharedStats();

      // Refresh current tab if it's loaded
      this.refreshCurrentTab();
    } catch (error) {
      console.error("Error refreshing data:", error);
      this.handleLoadError(error);
    }
  }

  refreshCurrentTab() {
    if (this.currentTab && this.loadedTabs.has(this.currentTab)) {
      const tabInstance = this.loadedTabs.get(this.currentTab).instance;
      if (tabInstance && tabInstance.refresh) {
        tabInstance.refresh(this);
      }
    }
  }

  // Filter and Search Methods
  handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    this.currentFilters.search = searchTerm;
    this.applyFilters();
  }

  handleFilterChange(e) {
    const filterType = e.target.id.replace("-filter", "");
    const value = e.target.value;

    if (value === "all") {
      delete this.currentFilters[filterType];
    } else {
      this.currentFilters[filterType] = value;
    }

    this.applyFilters();
  }

  applyFilters() {
    // Apply current filters and refresh the current tab
    this.refreshCurrentTab();
  }

  clearAllFilters() {
    this.currentFilters = {};
    if (this.searchStudentsInput) this.searchStudentsInput.value = "";
    if (this.institutionFilter) this.institutionFilter.value = "all";
    if (this.courseFilter) this.courseFilter.value = "all";
    if (this.statusFilter) this.statusFilter.value = "all";

    this.applyFilters();
  }

  // Utility Methods
  getCurrentTabInstance() {
    return this.loadedTabs.get(this.currentTab)?.instance;
  }

  getApplicationsByStatus(status) {
    return this.applicationsByStatus[status] || [];
  }

  getTrainingStudentsByDate(category) {
    return this.trainingStudentsByDate[category] || [];
  }

  getAllCompanyApplications() {
    return this.applications;
  }

  getApplicationData() {
    return this.applicationData;
  }

  // Error Handling
  handleLoadError(error) {
    const errorMessage = error.message || "Failed to load application data";
    alert(
      `Error loading data: ${errorMessage}. Please try refreshing the page.`
    );

    const retryButton = document.getElementById("retry-loading");
    if (retryButton) {
      retryButton.style.display = "block";
      retryButton.onclick = () => this.refreshData();
    }
  }

  // Data export for tabs
  getDashboardData() {
    return {
      applications: this.applications,
      applicationsByStatus: this.applicationsByStatus,
      trainingStudentsByDate: this.trainingStudentsByDate,
      applicationStats: this.applicationStats,
      currentFilters: this.currentFilters,
      companyId: this.companyId,
    };
  }
}

// Initialize the tab system when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.tabManager = new TabManager();
});

export default TabManager;
