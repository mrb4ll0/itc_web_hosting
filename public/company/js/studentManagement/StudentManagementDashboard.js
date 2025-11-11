import { auth, db } from "../../../js/config/firebaseInit.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
import {
  createAvatarElement,
  generateInitials,
} from "../../../js/general/generalmethods.js";
const it_base_companycloud = new ITBaseCompanyCloud();

export class CompanyDashboardManager {
  constructor() {
    this.companyId = null;
    this.currentFilters = {};
    this.currentPage = 1;
    this.init();
  }

  async init() {
    this.initializeElements();
    this.initializeEventListeners();
    await this.loadInitialData();
  }

  async loadInitialData() {
    try {
      await auth.authStateReady();

      if (!auth.currentUser) {
        alert("No authenticated user found. Please log in.");
        window.location.href = "../../auth/company_login.html";
        return;
      }

      this.companyId = auth.currentUser.uid;
      //console.log("Authenticated company ID: " + this.companyId);

      // Load all applications for the company
      this.applications = await it_base_companycloud.getAllCompanyApplications(
        this.companyId
      );
      //console.log("Loaded applications: ", this.applications);

      // Process and categorize the applications
      await this.processApplicationsData();

      // Update UI with the loaded data
      this.populateApplicationsUI();

      // Load additional company data if needed
      await this.loadAdditionalCompanyData();
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

        // Current: started but not ended (or no end date)
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

    console.log("Applications by status:", this.applicationsByStatus);
    console.log("Training students by date:", this.trainingStudentsByDate);
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

  populateApplicationsUI() {
    try {
      // Update summary cards or statistics display
      this.updateSummaryCards();

      // populate pending applications section
      this.buildPendingApplicationsSection();

      //populate rejected applications section
      this.buildRejectedApplicationsSection();

      //populate accepted applications section
      this.buildAcceptedApplicationsSection();

      //populate current trainees section
      this.buildCurrentTraineesSection();

      // Populate applications table or list
      this.renderApplicationsTable();

      // Update charts or graphs if any
      this.updateCharts();
    } catch (error) {
      console.error("Error populating UI:", error);
    }
  }

  updateSummaryCards() {
    // Update UI elements with application statistics
    const totalElement = document.getElementById("total-applications");
    const shortlistedElement = document.getElementById(
      "shortlisted-applications"
    );
    const acceptedElement = document.getElementById("accepted-applications");
    const pendingElement = document.getElementById("pending-applications");

    if (totalElement) totalElement.textContent = this.applicationStats.total;
    if (shortlistedElement)
      shortlistedElement.textContent = this.applicationStats.shortlisted;
    if (acceptedElement)
      acceptedElement.textContent = this.applicationStats.accepted;
    if (pendingElement)
      pendingElement.textContent = this.applicationStats.pending;
  }

  renderApplicationsTable() {
    // Implementation for rendering applications in a table
    const tableBody = document.getElementById("applications-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    this.applications.forEach((app) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${app.application.studentName || "N/A"}</td>
            <td>${app.opportunity}</td>
            <td>${app.application.status || "pending"}</td>
            <td>${new Date(
              app.application.appliedAt || Date.now()
            ).toLocaleDateString()}</td>
            <td>
                <button class="view-btn" data-application-id="${
                  app.application.id
                }">View</button>
                <button class="action-btn" data-application-id="${
                  app.application.id
                }">Action</button>
            </td>
        `;
      tableBody.appendChild(row);
    });

    // Add event listeners to buttons
    this.attachApplicationEventListeners();
  }

  attachApplicationEventListeners() {
    // Add click handlers for view and action buttons
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const applicationId = e.target.getAttribute("data-application-id");
        this.viewApplicationDetails(applicationId);
      });
    });

    document.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const applicationId = e.target.getAttribute("data-application-id");
        this.showApplicationActions(applicationId);
      });
    });
  }

  async loadAdditionalCompanyData() {
    try {
      // Load company profile, industrial trainings, etc.
      //this.companyProfile = await it_base_companycloud.getCompanyProfile(this.companyId);
      this.studentApplications =
        await it_base_companycloud.getAllCompanyApplications(this.companyId);

      if (!this.studentApplications || this.studentApplications.length === 0) {
        alert("No Applications found for this company");
        return;
      }

      this.totalApplicantsValue.textContent = this.studentApplications.length;
      this.pendingReviewValue.textContent =
        this.applicationsByStatus.pending.length;
      this.shortlistedValue.textContent =
        this.applicationsByStatus.accepted.length;
      this.rejectedValue.textContent = this.getTotalStudentOnIT();
    } catch (error) {
      console.error("Error loading additional company data:", error);
    }
  }

  getTotalStudentOnIT() {
    let count = 0;
    const currentDate = new Date();

    this.studentApplications.forEach((applicationData) => {
      const application = applicationData.application;
      const startDate = application.durationStartDate;
      const endDate = application.durationEndDate;
      //console.log("Application Dates:", startDate, endDate);

      // Check if the student is currently on IT (within date range)
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
  handleLoadError(error) {
    const errorMessage = error.message || "Failed to load application data";

    // Show user-friendly error message
    alert(
      `Error loading data: ${errorMessage}. Please try refreshing the page.`
    );

    // Optionally redirect to error page or show retry button
    const retryButton = document.getElementById("retry-loading");
    if (retryButton) {
      retryButton.style.display = "block";
      retryButton.onclick = () => this.loadInitialData();
    }
  }

  // Helper methods for application actions
  viewApplicationDetails(applicationId) {
    const application = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (application) {
      // Implement view details logic
      console.log("Viewing application:", application);
      // this.openApplicationModal(application);
    }
  }

  showApplicationActions(applicationId) {
    const application = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (application) {
      // Implement action menu logic
      console.log("Showing actions for:", application);
      // this.openActionMenu(application);
    }
  }

  updateCharts() {
    // If you have charts for application statistics, update them here
    const ctx = document.getElementById("applications-chart");
    if (ctx) {
      // Chart.js or other chart library implementation
      // this.renderApplicationsChart();
    }
  }

  // **************************************************** Element Initialization **************************************************** //

  initializeElements() {
    // Header Elements
    this.dashboardBody = document.getElementById("dashboard-body");
    this.mainContainer = document.getElementById("mainContainer");
    this.dashboardHeader = document.getElementById("dashboard-header");
    this.headerContainer = document.getElementById("header-container");
    this.headerContent = document.getElementById("header-content");
    this.headerLeft = document.getElementById("header-left");
    this.companyLogo = document.getElementById("company-logo");
    this.companyInfo = document.getElementById("company-info");
    this.dashboardTitle = document.getElementById("dashboard-title");
    this.companySubtitle = document.getElementById("company-subtitle");
    this.addStudentBtn = document.getElementById("add-student-btn");
    this.addStudentIcon = document.getElementById("add-student-icon");
    this.addStudentText = document.getElementById("add-student-text");

    // Main Content
    this.dashboardMain = document.getElementById("dashboard-main");

    // Stats Cards
    this.statsContainer = document.getElementById("stats-container");
    this.totalApplicantsCard = document.getElementById("total-applicants-card");
    this.pendingReviewCard = document.getElementById(
      "pending-applications-card"
    );
    this.shortlistedCard = document.getElementById("shortlisted-card");
    this.rejectedCard = document.getElementById("current-trainees-card");

    // Stats Card Content
    this.totalApplicantsContent = document.getElementById(
      "total-applicants-content"
    );
    this.totalApplicantsIconContainer = document.getElementById(
      "total-applicants-icon-container"
    );
    this.totalApplicantsIcon = document.getElementById("total-applicants-icon");
    this.totalApplicantsText = document.getElementById("total-applicants-text");
    this.totalApplicantsLabel = document.getElementById(
      "total-applicants-label"
    );
    this.totalApplicantsValue = document.getElementById(
      "total-applicants-value"
    );

    this.pendingReviewContent = document.getElementById(
      "pending-applications-content"
    );
    this.pendingReviewIconContainer = document.getElementById(
      "pending-applications-icon-container"
    );
    this.pendingReviewIcon = document.getElementById(
      "pending-applications-icon"
    );
    this.pendingReviewText = document.getElementById(
      "pending-applications-text"
    );
    this.pendingReviewLabel = document.getElementById(
      "pending-applications-label"
    );
    this.pendingReviewValue = document.getElementById("pending-review-value");

    this.shortlistedContent = document.getElementById("shortlisted-content");
    this.shortlistedIconContainer = document.getElementById(
      "shortlisted-icon-container"
    );
    this.shortlistedIcon = document.getElementById("accepted-icon");
    this.shortlistedText = document.getElementById("accepted-text");
    this.shortlistedLabel = document.getElementById("accepted-label");
    this.shortlistedValue = document.getElementById("accepted-value");

    this.rejectContent = document.getElementById("rejected-content");
    this.rejectIconContainer = document.getElementById(
      "rejected-icon-container"
    );
    this.rejectedIcon = document.getElementById("rejected-icon");
    this.rejectedText = document.getElementById("rejected-text");
    this.rejectedLabel = document.getElementById("rejected-label");
    this.rejectedValue = document.getElementById("rejected-value");

    // Tabs
    this.tabsContainer = document.getElementById("tabs-container");
    this.tabsWrapper = document.getElementById("tabs-wrapper");
    this.overviewTab = document.getElementById("overview-tab");
    this.applicationsTab = document.getElementById("applications-tab");
    this.currentTrainee = document.getElementById("current-trainees-tab");
    this.upcomingTab = document.getElementById("upcoming-tab");
    this.analyticsTab = document.getElementById("analytics-tab");

    // Tab Icons and Text
    this.overviewTabIcon = document.getElementById("overview-tab-icon");
    this.overviewTabText = document.getElementById("overview-tab-text");
    this.applicationsTabIcon = document.getElementById("applications-tab-icon");
    this.applicationsTabText = document.getElementById("applications-tab-text");
    this.currentTraineeIcon = document.getElementById(
      "current-trainees-tab-icon"
    );
    this.currentTraineeText = document.getElementById(
      "current-trainees-tab-text"
    );
    this.upcomingTabIcon = document.getElementById("upcoming-tab-icon");
    this.upcomingTabText = document.getElementById("upcoming-tab-text");
    this.analyticsTabIcon = document.getElementById("analytics-tab-icon");
    this.analyticsTabText = document.getElementById("analytics-tab-text");

    // Search and Filters
    this.searchFiltersContainer = document.getElementById(
      "search-filters-container"
    );
    this.searchFiltersContent = document.getElementById(
      "search-filters-content"
    );
    this.searchContainer = document.getElementById("search-container");
    this.searchLabel = document.getElementById("search-label");
    this.searchInputWrapper = document.getElementById("search-input-wrapper");
    this.searchIcon = document.getElementById("search-icon");
    this.searchStudentsInput = document.getElementById("search-students-input");

    this.filtersGrid = document.getElementById("filters-grid");
    this.institutionFilterContainer = document.getElementById(
      "institution-filter-container"
    );
    this.institutionFilterLabel = document.getElementById(
      "institution-filter-label"
    );
    this.institutionFilter = document.getElementById("institution-filter");
    this.institutionAllOption = document.getElementById(
      "institution-all-option"
    );
    this.institutionLagosOption = document.getElementById(
      "institution-lagos-option"
    );
    this.institutionOauOption = document.getElementById(
      "institution-oau-option"
    );

    this.courseFilterContainer = document.getElementById(
      "course-filter-container"
    );
    this.courseFilterLabel = document.getElementById("course-filter-label");
    this.courseFilter = document.getElementById("course-filter");
    this.courseAllOption = document.getElementById("course-all-option");
    this.courseCsOption = document.getElementById("course-cs-option");
    this.courseEeOption = document.getElementById("course-ee-option");

    this.statusFilterContainer = document.getElementById(
      "status-filter-container"
    );
    this.statusFilterLabel = document.getElementById("status-filter-label");
    this.statusFilter = document.getElementById("status-filter");
    this.statusAllOption = document.getElementById("status-all-option");
    this.statusNewOption = document.getElementById("status-new-option");
    this.statusReviewOption = document.getElementById("status-review-option");
    this.statusShortlistedOption = document.getElementById(
      "status-shortlisted-option"
    );

    this.skillsFilterContainer = document.getElementById(
      "skills-filter-container"
    );
    this.skillsFilterLabel = document.getElementById("skills-filter-label");
    this.skillsFilterInput = document.getElementById("skills-filter-input");

    // Pipeline
    this.pipelineContainer = document.getElementById("pipeline-container");
    this.pipelineTitle = document.getElementById("pipeline-title");
    this.pipelineGrid = document.getElementById("pipeline-grid");

    // New Applications Column
    this.newApplicationsColumn = document.getElementById(
      "new-applications-column"
    );
    this.newApplicationsHeader = document.getElementById(
      "new-applications-header"
    );
    this.newApplicationsIndicator = document.getElementById(
      "new-applications-indicator"
    );
    this.newApplicationsTitle = document.getElementById(
      "new-applications-title"
    );
    this.newApplicationsCount = document.getElementById(
      "new-applications-count"
    );
    this.newApplicationsList = document.getElementById("new-applications-list");

    // Application Cards
    this.applicationCard1 = document.getElementById("application-card-1");
    this.applicationCardContent = document.getElementById(
      "application-card-content"
    );
    this.studentAvatar1 = document.getElementById("student-avatar-1");
    this.studentInfo1 = document.getElementById("student-info-1");
    this.studentName1 = document.getElementById("student-name-1");
    this.studentCourse1 = document.getElementById("student-course-1");
    this.applicationDate1 = document.getElementById("application-date-1");
    this.applicationActions1 = document.getElementById("application-actions-1");
    this.viewApplicationBtn1 = document.getElementById(
      "view-application-btn-1"
    );
    this.shortlistApplicationBtn1 = document.getElementById(
      "shortlist-application-btn-1"
    );

    // Other Pipeline Columns
    this.underReviewColumn = document.getElementById("under-review-column");
    this.underReviewHeader = document.getElementById("under-review-header");
    this.underReviewIndicator = document.getElementById(
      "under-review-indicator"
    );
    this.underReviewTitle = document.getElementById("under-review-title");
    this.underReviewCount = document.getElementById("under-review-count");
    this.underReviewList = document.getElementById("under-review-list");

    this.shortlistedColumn = document.getElementById("shortlisted-column");
    this.shortlistedHeader = document.getElementById("shortlisted-header");
    this.shortlistedIndicator = document.getElementById(
      "shortlisted-indicator"
    );
    this.shortlistedTitle = document.getElementById("shortlisted-title");
    this.shortlistedCount = document.getElementById("shortlisted-count");
    this.shortlistedList = document.getElementById("shortlisted-list");

    this.interviewColumn = document.getElementById("interview-column");
    this.interviewHeader = document.getElementById("interview-header");
    this.interviewIndicator = document.getElementById("interview-indicator");
    this.interviewTitle = document.getElementById("interview-title");
    this.interviewCount = document.getElementById("interview-count");
    this.interviewList = document.getElementById("interview-list");

    // Current Trainees Section
    this.rejectedSection = document.getElementById("current-trainees-section");
    this.rejectedTitle = document.getElementById("current-trainees-title");
    this.traineesGrid = document.getElementById("trainees-grid");

    // Trainee Cards
    this.traineeCard1 = document.getElementById("trainee-card-1");
    this.traineeHeader1 = document.getElementById("trainee-header-1");
    this.traineeAvatar1 = document.getElementById("trainee-avatar-1");
    this.traineeInfo1 = document.getElementById("trainee-info-1");
    this.traineeName1 = document.getElementById("trainee-name-1");
    this.traineeRole1 = document.getElementById("trainee-role-1");
    this.traineeStatus1 = document.getElementById("trainee-status-1");
    this.traineeDetails1 = document.getElementById("trainee-details-1");
    this.startDate1 = document.getElementById("start-date-1");
    this.startDateLabel1 = document.getElementById("start-date-label-1");
    this.startDateValue1 = document.getElementById("start-date-value-1");
    this.endDate1 = document.getElementById("end-date-1");
    this.endDateLabel1 = document.getElementById("end-date-label-1");
    this.endDateValue1 = document.getElementById("end-date-value-1");
    this.department1 = document.getElementById("department-1");
    this.departmentLabel1 = document.getElementById("department-label-1");
    this.departmentValue1 = document.getElementById("department-value-1");
    this.traineeActions1 = document.getElementById("trainee-actions-1");
    this.viewProfileBtn1 = document.getElementById("view-profile-btn-1");
    this.messageTraineeBtn1 = document.getElementById("message-trainee-btn-1");
  }

  // **************************************************** Event listeners **************************************************** //

  initializeEventListeners() {
    // Add Student Button
    if (this.addStudentBtn) {
      this.addStudentBtn.addEventListener("click", (e) => {
        this.handleAddStudent(e);
      });
    }

    // Tab Switching
    const tabs = [
      this.overviewTab,
      this.applicationsTab,
      this.currentTrainee,
      this.upcomingTab,
      this.analyticsTab,
    ];

    tabs.forEach((tab) => {
      if (tab) {
        tab.addEventListener("click", (e) => {
          this.handleTabSwitch(e, tab);
        });
      }
    });

    // Search Functionality
    if (this.searchStudentsInput) {
      this.searchStudentsInput.addEventListener("input", (e) => {
        this.handleSearch(e);
      });
    }

    if (this.institutionFilter) {
      this.institutionFilter.addEventListener(
        "focus",
        () => {
          this.lazyLoadInstitutions();
        },
        { once: true }
      ); // Only run once

      this.institutionFilter.addEventListener("change", (e) => {
        this.handleFilterChange(e);
      });
    }
    console.log("Initializing event listeners for course filter");
    if (this.courseFilter) {
      console.log("Setting up lazy load for courses");
      this.courseFilter.addEventListener(
        "focus",
        () => {
          this.lazyLoadCourses();
        },
        { once: true }
      );

      this.courseFilter.addEventListener("change", (e) => {
        this.handleFilterChange(e);
      });
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener("change", (e) => {
        this.handleFilterChange(e);
      });
    }

    if (this.skillsFilterInput) {
      this.skillsFilterInput.addEventListener("input", (e) => {
        this.handleSkillsFilter(e);
      });
    }

    // Application Actions
    if (this.viewApplicationBtn1) {
      this.viewApplicationBtn1.addEventListener("click", (e) => {
        this.handleViewApplication(e, "1");
      });
    }

    if (this.shortlistApplicationBtn1) {
      this.shortlistApplicationBtn1.addEventListener("click", (e) => {
        this.handleShortlistApplication(e, "1");
      });
    }

    // Trainee Actions
    if (this.viewProfileBtn1) {
      this.viewProfileBtn1.addEventListener("click", (e) => {
        this.handleViewProfile(e, "1");
      });
    }

    if (this.messageTraineeBtn1) {
      this.messageTraineeBtn1.addEventListener("click", (e) => {
        this.handleMessageTrainee(e, "1");
      });
    }

    // Stats Cards Click Events (if they should be interactive)
    if (this.totalApplicantsCard) {
      this.totalApplicantsCard.addEventListener("click", (e) => {
        this.handleStatsCardClick(e, "total-applicants");
      });
    }

    if (this.pendingReviewCard) {
      this.pendingReviewCard.addEventListener("click", (e) => {
        this.handleStatsCardClick(e, "pending-applications");
      });
    }

    if (this.shortlistedCard) {
      this.shortlistedCard.addEventListener("click", (e) => {
        this.handleStatsCardClick(e, "shortlisted");
      });
    }

    if (this.rejectedCard) {
      this.rejectedCard.addEventListener("click", (e) => {
        this.handleStatsCardClick(e, "current-trainees");
      });
    }
  }

  //***************************** Course Setup helper method *****************************//

  async lazyLoadCourses() {
    // Check if already loaded
    if (this.coursesLoaded) return;

    try {
      // Show loading state
      this.courseFilter.disabled = true;
      this.courseFilter.innerHTML = "<option>Loading courses...</option>";

      // Extract unique courses from already loaded applications
      const courses = this.extractCoursesFromApplications();

      // Populate the filter
      this.populateCourseFilter(courses);
      this.coursesLoaded = true;
    } catch (error) {
      console.error("Error loading courses:", error);
      this.courseFilter.innerHTML = "<option>Error loading courses</option>";
    } finally {
      this.courseFilter.disabled = false;
    }
  }

  extractCoursesFromApplications() {
    if (!this.studentApplications || this.studentApplications.length === 0) {
      return ["No courses available"];
    }

    const courses = new Set();

    this.studentApplications.forEach((appData) => {
      const course =
        appData.application?.student?.course ||
        appData.application?.student?.program ||
        appData.application?.student?.major ||
        appData.application?.student?.fieldOfStudy;
      console.log("Extracted course:", course);

      if (course) {
        courses.add(course);
      }
    });

    return Array.from(courses).sort();
  }

  populateCourseFilter(courses) {
    this.courseFilter.innerHTML = `
        <option value="all" id="course-all-option">All Courses</option>
        ${courses
          .map((course) => `<option value="${course}">${course}</option>`)
          .join("")}
    `;
  }

  //***************************** Institution Setup helper method *****************************//

  async lazyLoadInstitutions() {
    // Check if already loaded
    if (this.institutionsLoaded) return;

    try {
      // Show loading state
      this.institutionFilter.disabled = true;
      this.institutionFilter.innerHTML =
        "<option>Loading institutions...</option>";

      // Extract unique institutions from already loaded applications
      const institutions = this.extractInstitutionsFromApplications();

      // Populate the filter
      this.populateInstitutionFilter(institutions);
      this.institutionsLoaded = true;
    } catch (error) {
      console.error("Error loading institutions:", error);
      this.institutionFilter.innerHTML =
        "<option>Error loading institutions</option>";
    } finally {
      this.institutionFilter.disabled = false;
    }
  }

  extractInstitutionsFromApplications() {
    if (!this.studentApplications || this.studentApplications.length === 0) {
      return ["No institutions available"];
    }

    const institutions = new Set();

    this.studentApplications.forEach((appData) => {
      const institution =
        appData.application?.student?.institution ||
        appData.application?.student?.school ||
        appData.application?.student?.university;

      if (institution) {
        institutions.add(institution);
      }
    });
    console.log("Extracted institutions:", institutions);

    return Array.from(institutions).sort();
  }

  populateInstitutionFilter(institutions) {
    this.institutionFilter.innerHTML = `
        <option value="all" id="institution-all-option">All Institutions</option>
        ${institutions
          .map((inst) => `<option value="${inst}">${inst}</option>`)
          .join("")}
    `;
  }

  // ACTION HANDLER METHODS

  handleAddStudent(e) {
    e.preventDefault();
    console.log("Add Student button clicked");

    // Show modal or navigate to add student form
    this.showAddStudentModal();

    // You can also add animation/feedback
    this.addStudentBtn.style.transform = "scale(0.95)";
    setTimeout(() => {
      this.addStudentBtn.style.transform = "scale(1)";
    }, 150);
  }

  handleTabSwitch(e, clickedTab) {
    e.preventDefault();

    // Remove active class from all tabs
    const allTabs = [
      this.overviewTab,
      this.applicationsTab,
      this.currentTrainee,
      this.upcomingTab,
      this.analyticsTab,
    ];

    allTabs.forEach((tab) => {
      if (tab) {
        tab.classList.remove("tab-active");
        tab.classList.add(
          "text-gray-600",
          "dark:text-gray-400",
          "hover:bg-gray-100",
          "dark:hover:bg-gray-700"
        );
      }
    });

    // Add active class to clicked tab
    clickedTab.classList.add("tab-active");
    clickedTab.classList.remove(
      "text-gray-600",
      "dark:text-gray-400",
      "hover:bg-gray-100",
      "dark:hover:bg-gray-700"
    );

    // Handle tab content switching
    this.switchTabContent(clickedTab.id);
  }

  switchTabContent(tabId) {
    console.log(`Switching to tab: ${tabId}`);

    // Hide all content sections first
    const sections = [
      this.pipelineContainer,
      this.rejectedSection,
      // Add other content sections as needed
    ];

    sections.forEach((section) => {
      if (section) section.style.display = "none";
    });

    // Show relevant content based on tab
    switch (tabId) {
      case "overview-tab":
        if (this.pipelineContainer)
          this.pipelineContainer.style.display = "block";
        if (this.rejectedSection) this.rejectedSection.style.display = "block";
        break;
      case "applications-tab":
        if (this.pipelineContainer)
          this.pipelineContainer.style.display = "block";
        break;
      case "current-trainees-tab":
        if (this.rejectedSection) this.rejectedSection.style.display = "block";
        break;
      case "upcoming-tab":
        // Show upcoming content
        break;
      case "analytics-tab":
        // Show analytics content
        break;
    }
  }

  handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    console.log(`Searching for: ${searchTerm}`);

    // Implement search logic
    this.filterStudents(searchTerm);
  }

  handleFilterChange(e) {
    const institution = this.institutionFilter
      ? this.institutionFilter.value
      : "all";
    const course = this.courseFilter ? this.courseFilter.value : "all";
    const status = this.statusFilter ? this.statusFilter.value : "all";

    console.log(
      `Filters changed - Institution: ${institution}, Course: ${course}, Status: ${status}`
    );

    // Apply filters
    this.applyFilters(institution, course, status);
  }

  handleSkillsFilter(e) {
    const skills = e.target.value.toLowerCase();
    console.log(`Filtering by skills: ${skills}`);

    // Filter by skills logic
    this.filterBySkills(skills);
  }

  handleViewApplication(e, applicationId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Viewing application: ${applicationId}`);

    // Show application details modal
    this.showApplicationModal(applicationId);
  }

  handleShortlistApplication(e, applicationId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Shortlisting application: ${applicationId}`);

    // Update UI to show shortlisted state
    const applicationCard = document.getElementById(
      `application-card-${applicationId}`
    );
    if (applicationCard) {
      applicationCard.style.borderColor = "#10B981"; // Green border
      applicationCard.style.backgroundColor = "#F0FDF4"; // Light green background

      // Update button text/state
      const shortlistBtn = document.getElementById(
        `shortlist-application-btn-${applicationId}`
      );
      if (shortlistBtn) {
        shortlistBtn.textContent = "Shortlisted ✓";
        shortlistBtn.disabled = true;
        shortlistBtn.style.backgroundColor = "#10B981";
      }
    }

    // You might want to move this card to the shortlisted column
    this.moveToShortlisted(applicationId);
  }

  handleViewProfile(e, traineeId) {
    e.preventDefault();
    console.log(`Viewing trainee profile: ${traineeId}`);

    // Show trainee profile modal or navigate to profile page
    this.showTraineeProfile(traineeId);
  }

  handleMessageTrainee(e, traineeId) {
    e.preventDefault();
    console.log(`Messaging trainee: ${traineeId}`);

    // Open messaging interface
    this.openMessaging(traineeId);
  }

  handleStatsCardClick(e, cardType) {
    console.log(`Stats card clicked: ${cardType}`);

    // Navigate to relevant section or show detailed view
    switch (cardType) {
      case "total-applicants":
        this.switchToTab("applications-tab");
        break;
      case "pending-applications":
        this.highlightPendingApplications();
        break;
      case "shortlisted":
        this.showShortlistedView();
        break;
      case "current-trainees":
        this.switchToTab("current-trainees-tab");
        break;
    }
  }

  // HELPER METHODS

  showAddStudentModal() {
    // Implementation for showing add student modal
    console.log("Showing add student modal");
    // You can create a modal or use an existing one
  }

  filterStudents(searchTerm) {
    // Implementation for filtering students based on search term
    // This would typically filter the student lists in your pipeline and trainee sections
  }

  applyFilters(institution, course, status) {
    // Implementation for applying multiple filters
  }

  filterBySkills(skills) {
    // Implementation for filtering by skills
  }

  showApplicationModal(applicationId) {
    // Implementation for showing application details
  }

  moveToShortlisted(applicationId) {
    // Implementation for moving application to shortlisted column
  }

  showTraineeProfile(traineeId) {
    // Implementation for showing trainee profile
  }

  openMessaging(traineeId) {
    // Implementation for opening messaging interface
  }

  switchToTab(tabId) {
    const tab = document.getElementById(tabId);
    if (tab) {
      this.handleTabSwitch(new Event("click"), tab);
    }
  }

  highlightPendingApplications() {
    // Implementation for highlighting pending applications
  }

  showShortlistedView() {
    // Implementation for showing shortlisted view
  }

  // ************************************ Pending Review implmentations ************************************ //
  buildPendingApplicationsSection() {
    const pendingApplicationsList = document.getElementById(
      "pending-applications-list"
    );

    if (!pendingApplicationsList) return;

    // Clear existing content
    pendingApplicationsList.innerHTML = "";

    const pendingApplications = this.applicationsByStatus.pending;

    if (pendingApplications.length === 0) {
      pendingApplicationsList.innerHTML = `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
        <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">inbox</span>
        <p class="text-gray-500 dark:text-gray-400">No pending applications</p>
      </div>
    `;
      return;
    }

    // Update the pending count
    const pendingCountElement = document.getElementById(
      "pending-applications-count"
    );
    if (pendingCountElement) {
      pendingCountElement.textContent = pendingApplications.length;
    }

    // Build application cards
    pendingApplications.forEach((applicationData, index) => {
      const application = applicationData.application;
      const student = application.student || {};
      const applicationId = application.id || `app-${index}`;

      const applicationCard = this.createPendingApplicationCard(
        applicationId,
        student,
        application,
        applicationData.opportunity
      );

      pendingApplicationsList.appendChild(applicationCard);
    });

    // Re-attach event listeners for the new cards
    this.attachPendingApplicationEventListeners();
  }

  createPendingApplicationCard(
    applicationId,
    student,
    application,
    opportunity
  ) {
    const card = document.createElement("div");
    card.className =
      "bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600";
    card.id = `application-card-${applicationId}`;

    // Format application date
    const applicationDate = application.applicationDate
      ? new Date(application.applicationDate)
      : new Date();
    const timeAgo = this.getTimeAgo(applicationDate);
    console.log("Formatted time ago:", timeAgo);
    console.log("Application date:", application.applicationDate);
    console.log("application object:" + JSON.stringify(application));

    // Get student information with fallbacks
    const studentName = student.name || student.fullName || "Unknown Student";
    const studentCourse =
      student.courseOfStudy || student.program || "Not specified";
    //console.log("student imageUrl:", student.imageUrl);
    let avatarUrl = student.imageUrl || "";
    if (
      avatarUrl &&
      (avatarUrl.includes("undefined") ||
        avatarUrl.includes("null") ||
        avatarUrl.trim() === "")
    ) {
      avatarUrl = null; // Force using initials
    }

    const avatarHtml = createAvatarElement(studentName, avatarUrl, 40);
    card.innerHTML = `
    <div class="flex items-start gap-3">
      ${avatarHtml}
      <div class="flex-1">
        <h4 class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(
          studentName
        )}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${this.escapeHtml(studentCourse)} - ${this.escapeHtml(
      opportunity || "Internship"
    )}
        </p>
        <span class="text-xs text-gray-500">${timeAgo}</span>
      </div>
    </div>
    <div class="flex gap-2 mt-3">
      <button 
        id="view-application-btn-${applicationId}" 
        class="flex-1 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        View
      </button>
      <button 
        id="accept-application-btn-${applicationId}" 
        class="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        Accept
      </button>
      <button 
        id="reject-application-btn-${applicationId}" 
        class="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 transition-colors"
      >
        Reject
      </button>
    </div>
  `;

    return card;
  }

  attachPendingApplicationEventListeners() {
    const pendingApplications = this.applicationsByStatus.pending;

    pendingApplications.forEach((applicationData) => {
      const application = applicationData.application;
      const applicationId = application.id;

      // View button
      const viewBtn = document.getElementById(
        `view-application-btn-${applicationId}`
      );
      if (viewBtn) {
        viewBtn.addEventListener("click", (e) => {
          this.handleViewApplication(e, applicationId);
        });
      }

      // Accept button
      const acceptBtn = document.getElementById(
        `accept-application-btn-${applicationId}`
      );
      if (acceptBtn) {
        acceptBtn.addEventListener("click", (e) => {
          this.handleAcceptApplication(e, applicationId);
        });
      }

      // Reject button
      const rejectBtn = document.getElementById(
        `reject-application-btn-${applicationId}`
      );
      if (rejectBtn) {
        rejectBtn.addEventListener("click", (e) => {
          this.handleRejectApplication(e, applicationId);
        });
      }
    });
  }

  // Helper methods
  getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString();
  }

  escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Action handlers for pending applications
  handleAcceptApplication(e, applicationId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Accepting application: ${applicationId}`);

    // Find the application
    const applicationData = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (!applicationData) return;

    // Update status in your database
    this.updateApplicationStatus(applicationId, "accepted")
      .then(() => {
        // Remove from pending and add to accepted
        this.moveApplicationToStatus(applicationId, "pending", "accepted");

        // Update UI
        this.buildPendingApplicationsSection();
        this.buildAcceptedApplicationsSection(); // You'll need to create this method

        // Show success feedback
        this.showNotification("Application accepted successfully", "success");
      })
      .catch((error) => {
        console.error("Error accepting application:", error);
        this.showNotification("Failed to accept application", "error");
      });
  }

  handleRejectApplication(e, applicationId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Rejecting application: ${applicationId}`);

    // Confirm rejection
    if (!confirm("Are you sure you want to reject this application?")) {
      return;
    }

    const applicationData = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (!applicationData) return;

    // Update status in your database
    this.updateApplicationStatus(applicationId, "rejected")
      .then(() => {
        // Remove from pending and add to rejected
        this.moveApplicationToStatus(applicationId, "pending", "rejected");

        // Update UI
        this.buildPendingApplicationsSection();
        this.buildRejectedApplicationsSection(); // You'll need to create this method

        // Show success feedback
        this.showNotification("Application rejected", "success");
      })
      .catch((error) => {
        console.error("Error rejecting application:", error);
        this.showNotification("Failed to reject application", "error");
      });
  }

  // Database update method (you'll need to implement this based on your Firestore structure)
  async updateApplicationStatus(applicationId, newStatus) {
    // Update the application status in Firestore
    return await it_base_companycloud.updateApplicationStatus(
      applicationId,
      newStatus
    );
  }

  moveApplicationToStatus(applicationId, fromStatus, toStatus) {
    // Remove from current status array
    this.applicationsByStatus[fromStatus] = this.applicationsByStatus[
      fromStatus
    ].filter((app) => app.application.id !== applicationId);

    // Find the application and update its status
    const applicationData = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (applicationData) {
      applicationData.application.status = toStatus;
      this.applicationsByStatus[toStatus].push(applicationData);
    }

    // Recalculate stats
    this.calculateApplicationStats();
  }

  // ************************************ Accepted Applications implementations ************************************ //
  buildAcceptedApplicationsSection() {
    const acceptedApplicationsList = document.getElementById("accepted-list");
    if (!acceptedApplicationsList) return;

    // Clear existing content
    acceptedApplicationsList.innerHTML = "";

    const acceptedApplications = this.applicationsByStatus.accepted;

    if (acceptedApplications.length === 0) {
      acceptedApplicationsList.innerHTML = `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
        <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">check_circle</span>
        <p class="text-gray-500 dark:text-gray-400">No accepted applications</p>
      </div>
    `;
      return;
    }

    // Update the accepted count
    const acceptedCountElement = document.getElementById("accepted-count");
    if (acceptedCountElement) {
      acceptedCountElement.textContent = acceptedApplications.length;
    }

    // Build application cards
    acceptedApplications.forEach((applicationData, index) => {
      const application = applicationData.application;
      const student = application.student || {};
      const applicationId = application.id || `app-${index}`;

      const applicationCard = this.createAcceptedApplicationCard(
        applicationId,
        student,
        application,
        applicationData.opportunity
      );

      acceptedApplicationsList.appendChild(applicationCard);
    });

    // Re-attach event listeners for the new cards
    this.attachAcceptedApplicationEventListeners();
  }

  createAcceptedApplicationCard(
    applicationId,
    student,
    application,
    opportunity
  ) {
    const card = document.createElement("div");
    card.className =
      "bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-green-200 dark:border-green-800";
    card.id = `accepted-card-${applicationId}`;

    // Format application date
    const applicationDate = application.applicationDate
      ? new Date(application.applicationDate)
      : new Date();
    const timeAgo = this.getTimeAgo(applicationDate);

    // Get student information with fallbacks
    const studentName = student.name || student.fullName || "Unknown Student";
    const studentCourse =
      student.courseOfStudy || student.program || "Not specified";
    let avatarUrl = student.imageUrl || "";
    if (
      avatarUrl &&
      (avatarUrl.includes("undefined") ||
        avatarUrl.includes("null") ||
        avatarUrl.trim() === "")
    ) {
      avatarUrl = null; // Force using initials
    }

    const avatarHtml = createAvatarElement(studentName, avatarUrl, 40);
    card.innerHTML = `
    <div class="flex items-start gap-3">
      ${avatarHtml}
      <div class="flex-1">
        <h4 class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(
          studentName
        )}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${this.escapeHtml(studentCourse)} - ${this.escapeHtml(
      opportunity || "Internship"
    )}
        </p>
        <span class="text-xs text-gray-500">Accepted ${timeAgo}</span>
      </div>
    </div>
    <div class="flex gap-2 mt-3">
      <button 
        id="view-accepted-btn-${applicationId}" 
        class="flex-1 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        View
      </button>
      <button 
        id="message-accepted-btn-${applicationId}" 
        class="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Message
      </button>
    </div>
  `;

    return card;
  }

  attachAcceptedApplicationEventListeners() {
    const acceptedApplications = this.applicationsByStatus.accepted;

    acceptedApplications.forEach((applicationData) => {
      const application = applicationData.application;
      const applicationId = application.id;

      // View button
      const viewBtn = document.getElementById(
        `view-accepted-btn-${applicationId}`
      );
      if (viewBtn) {
        viewBtn.addEventListener("click", (e) => {
          this.handleViewApplication(e, applicationId);
        });
      }

      // Message button
      const messageBtn = document.getElementById(
        `message-accepted-btn-${applicationId}`
      );
      if (messageBtn) {
        messageBtn.addEventListener("click", (e) => {
          this.handleMessageStudent(e, applicationId);
        });
      }
    });
  }

  // ************************************ Rejected Applications implementations ************************************ //
  buildRejectedApplicationsSection() {
    const rejectedApplicationsList = document.getElementById("rejected-list");
    if (!rejectedApplicationsList) return;

    // Clear existing content
    rejectedApplicationsList.innerHTML = "";

    const rejectedApplications = this.applicationsByStatus.rejected;

    if (rejectedApplications.length === 0) {
      rejectedApplicationsList.innerHTML = `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
        <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">cancel</span>
        <p class="text-gray-500 dark:text-gray-400">No rejected applications</p>
      </div>
    `;
      return;
    }

    // Update the rejected count
    const rejectedCountElement = document.getElementById("rejected-count");
    if (rejectedCountElement) {
      rejectedCountElement.textContent = rejectedApplications.length;
    }

    // Build application cards
    rejectedApplications.forEach((applicationData, index) => {
      const application = applicationData.application;
      const student = application.student || {};
      const applicationId = application.id || `app-${index}`;

      const applicationCard = this.createRejectedApplicationCard(
        applicationId,
        student,
        application,
        applicationData.opportunity
      );

      rejectedApplicationsList.appendChild(applicationCard);
    });

    // Re-attach event listeners for the new cards
    this.attachRejectedApplicationEventListeners();
  }

  createRejectedApplicationCard(
    applicationId,
    student,
    application,
    opportunity
  ) {
    const card = document.createElement("div");
    card.className =
      "bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-red-200 dark:border-red-800";
    card.id = `rejected-card-${applicationId}`;

    // Format application date
    const applicationDate = application.applicationDate
      ? new Date(application.applicationDate)
      : new Date();
    const timeAgo = this.getTimeAgo(applicationDate);

    // Get student information with fallbacks
    const studentName = student.name || student.fullName || "Unknown Student";
    const studentCourse =
      student.courseOfStudy || student.program || "Not specified";
    let avatarUrl = student.imageUrl || "";
    if (
      avatarUrl &&
      (avatarUrl.includes("undefined") ||
        avatarUrl.includes("null") ||
        avatarUrl.trim() === "")
    ) {
      avatarUrl = null; // Force using initials
    }

    const avatarHtml = createAvatarElement(studentName, avatarUrl, 40);
    card.innerHTML = `
    <div class="flex items-start gap-3">
      ${avatarHtml}
      <div class="flex-1">
        <h4 class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(
          studentName
        )}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${this.escapeHtml(studentCourse)} - ${this.escapeHtml(
      opportunity || "Internship"
    )}
        </p>
        <span class="text-xs text-gray-500">Rejected ${timeAgo}</span>
      </div>
    </div>
    <div class="flex gap-2 mt-3">
      <button 
        id="view-rejected-btn-${applicationId}" 
        class="flex-1 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        View
      </button>
      <button 
        id="undo-reject-btn-${applicationId}" 
        class="flex-1 bg-gray-600 text-white text-sm py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        Undo
      </button>
    </div>
  `;

    return card;
  }

  attachRejectedApplicationEventListeners() {
    const rejectedApplications = this.applicationsByStatus.rejected;

    rejectedApplications.forEach((applicationData) => {
      const application = applicationData.application;
      const applicationId = application.id;

      // View button
      const viewBtn = document.getElementById(
        `view-rejected-btn-${applicationId}`
      );
      if (viewBtn) {
        viewBtn.addEventListener("click", (e) => {
          this.handleViewApplication(e, applicationId);
        });
      }

      // Undo button
      const undoBtn = document.getElementById(
        `undo-reject-btn-${applicationId}`
      );
      if (undoBtn) {
        undoBtn.addEventListener("click", (e) => {
          this.handleUndoRejection(e, applicationId);
        });
      }
    });
  }

  // Action handlers for accepted/rejected applications
  handleMessageStudent(e, applicationId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Messaging student for application: ${applicationId}`);

    // Find the application
    const applicationData = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (!applicationData) return;

    // Implement messaging logic here
    this.showNotification("Opening messaging interface", "info");
  }

  handleUndoRejection(e, applicationId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Undoing rejection for application: ${applicationId}`);

    const applicationData = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (!applicationData) return;

    // Update status back to pending
    this.updateApplicationStatus(applicationId, "pending")
      .then(() => {
        // Move from rejected back to pending
        this.moveApplicationToStatus(applicationId, "rejected", "pending");

        // Update UI
        this.buildRejectedApplicationsSection();
        this.buildPendingApplicationsSection();

        // Show success feedback
        this.showNotification("Application moved back to pending", "success");
      })
      .catch((error) => {
        console.error("Error undoing rejection:", error);
        this.showNotification("Failed to undo rejection", "error");
      });
  }

  // ************************************ Accepted Applications implementations ************************************ //
  buildAcceptedApplicationsSection() {
    const acceptedApplicationsList = document.getElementById("accepted-list");
    if (!acceptedApplicationsList) return;

    // Clear existing content
    acceptedApplicationsList.innerHTML = "";

    const acceptedApplications = this.applicationsByStatus.accepted;

    if (acceptedApplications.length === 0) {
      acceptedApplicationsList.innerHTML = `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
        <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">check_circle</span>
        <p class="text-gray-500 dark:text-gray-400">No accepted applications</p>
      </div>
    `;
      return;
    }

    // Update the accepted count
    const acceptedCountElement = document.getElementById("accepted-count");
    if (acceptedCountElement) {
      acceptedCountElement.textContent = acceptedApplications.length;
    }

    // Build application cards
    acceptedApplications.forEach((applicationData, index) => {
      const application = applicationData.application;
      const student = application.student || {};
      const applicationId = application.id || `app-${index}`;

      const applicationCard = this.createAcceptedApplicationCard(
        applicationId,
        student,
        application,
        applicationData.opportunity
      );

      acceptedApplicationsList.appendChild(applicationCard);
    });

    // Re-attach event listeners for the new cards
    this.attachAcceptedApplicationEventListeners();
  }

  createAcceptedApplicationCard(
    applicationId,
    student,
    application,
    opportunity
  ) {
    const card = document.createElement("div");
    card.className =
      "bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-green-200 dark:border-green-800";
    card.id = `accepted-card-${applicationId}`;

    // Format application date and accepted date
    const applicationDate = application.applicationDate
      ? new Date(application.applicationDate)
      : new Date();
    const acceptedDate = application.statusUpdatedAt || applicationDate;
    const timeAgo = this.getTimeAgo(acceptedDate);

    // Get student information with fallbacks
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
      avatarUrl = null; // Force using initials
    }

    const avatarHtml = createAvatarElement(studentName, avatarUrl, 40);
    card.innerHTML = `
    <div class="flex items-start gap-3">
      ${avatarHtml}
      <div class="flex-1">
        <h4 class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(
          studentName
        )}</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${this.escapeHtml(studentCourse)}
        </p>
        <p class="text-xs text-gray-500 truncate" title="${this.escapeHtml(
          studentEmail
        )}">
          ${this.escapeHtml(studentEmail)}
        </p>
        <div class="flex items-center gap-1 mt-1">
          <span class="material-symbols-outlined text-green-500 text-sm">check_circle</span>
          <span class="text-xs text-green-600 font-medium">Accepted</span>
          <span class="text-xs text-gray-500 ml-1">${timeAgo}</span>
        </div>
      </div>
    </div>
    <div class="flex gap-2 mt-3">
      <button 
        id="view-accepted-btn-${applicationId}" 
        class="flex-1 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        View Details
      </button>
      <button 
        id="message-accepted-btn-${applicationId}" 
        class="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Contact
      </button>
    </div>
  `;

    return card;
  }

  attachAcceptedApplicationEventListeners() {
    const acceptedApplications = this.applicationsByStatus.accepted;

    acceptedApplications.forEach((applicationData) => {
      const application = applicationData.application;
      const applicationId = application.id;

      // View button
      const viewBtn = document.getElementById(
        `view-accepted-btn-${applicationId}`
      );
      if (viewBtn) {
        viewBtn.addEventListener("click", (e) => {
          this.handleViewAcceptedApplication(e, applicationId);
        });
      }

      // Contact button
      const contactBtn = document.getElementById(
        `message-accepted-btn-${applicationId}`
      );
      if (contactBtn) {
        contactBtn.addEventListener("click", (e) => {
          this.handleContactStudent(e, applicationId);
        });
      }
    });
  }

  // Action handlers for accepted applications
  handleViewAcceptedApplication(e, applicationId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Viewing accepted application: ${applicationId}`);

    // Find the application
    const applicationData = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (!applicationData) return;

    // Show detailed view of accepted application
    this.showApplicationDetailsModal(applicationData, "accepted");
  }

  handleContactStudent(e, applicationId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Contacting student for application: ${applicationId}`);

    // Find the application
    const applicationData = this.applications.find(
      (app) => app.application.id === applicationId
    );
    if (!applicationData) return;

    const student = applicationData.application.student || {};
    const studentEmail = student.email;
    const studentName = student.name || student.fullName || "Student";

    if (studentEmail) {
      // Open email client or messaging interface
      const subject = `Regarding Your Accepted Application - ${applicationData.opportunity}`;
      const mailtoLink = `mailto:${studentEmail}?subject=${encodeURIComponent(
        subject
      )}`;
      window.open(mailtoLink, "_blank");
    } else {
      this.showNotification(
        "No email address available for this student",
        "warning"
      );
    }
  }

  // Method to show application details in a modal
  showApplicationDetailsModal(applicationData, status) {
    const application = applicationData.application;
    const student = application.student || {};
    const opportunity = applicationData.opportunity;

    // Create and show modal with application details
    const modalHtml = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">
              Application Details
            </h3>
            <button id="close-modal" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div class="space-y-6">
            <!-- Student Info -->
            <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              ${createAvatarElement(
                student.name || "Student",
                student.imageUrl,
                60
              )}
              <div>
                <h4 class="font-semibold text-gray-900 dark:text-white">${this.escapeHtml(
                  student.name || "Unknown Student"
                )}</h4>
                <p class="text-sm text-gray-600 dark:text-gray-400">${this.escapeHtml(
                  student.courseOfStudy || "Not specified"
                )}</p>
                <p class="text-sm text-gray-500">${this.escapeHtml(
                  student.email || "No email"
                )}</p>
              </div>
              <div class="ml-auto">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  status === "accepted"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : status === "rejected"
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                }">
                  ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            </div>
            
            <!-- Opportunity Details -->
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Opportunity</h4>
              <p class="text-gray-700 dark:text-gray-300">${this.escapeHtml(
                opportunity
              )}</p>
            </div>
            
            <!-- Application Date -->
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-2">Application Timeline</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-500">Applied</p>
                  <p class="text-gray-700 dark:text-gray-300">${
                    application.applicationDate
                      ? new Date(
                          application.applicationDate
                        ).toLocaleDateString()
                      : "Unknown"
                  }</p>
                </div>
                <div>
                  <p class="text-gray-500">Status Updated</p>
                  <p class="text-gray-700 dark:text-gray-300">${
                    application.statusUpdatedAt
                      ? new Date(
                          application.statusUpdatedAt
                        ).toLocaleDateString()
                      : "Unknown"
                  }</p>
                </div>
              </div>
            </div>
            
            <!-- Additional Actions -->
            <div class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button class="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors">
                Download Documents
              </button>
              <button class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

    // Add modal to DOM
    const modalContainer = document.createElement("div");
    modalContainer.id = "application-details-modal";
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // Add close event listener
    const closeBtn = document.getElementById("close-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.removeChild(modalContainer);
      });
    }

    // Close modal when clicking outside
    modalContainer.addEventListener("click", (e) => {
      if (e.target === modalContainer) {
        document.body.removeChild(modalContainer);
      }
    });
  }

  //******************************************** Current Training Section *************************** */

  buildCurrentTraineesSection() {
    const traineesGrid = document.getElementById("trainees-grid");
    if (!traineesGrid) return;

    // Clear existing content
    traineesGrid.innerHTML = "";

    const currentTrainees = this.trainingStudentsByDate.current;

    if (currentTrainees.length === 0) {
      traineesGrid.innerHTML = `
            <div class="col-span-full bg-gray-50 dark:bg-gray-700 rounded-xl p-8 text-center">
                <span class="material-symbols-outlined text-gray-400 text-5xl mb-4">engineering</span>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No Current Trainees</h3>
                <p class="text-gray-500 dark:text-gray-400">There are no active trainees at the moment.</p>
            </div>
        `;
      return;
    }

    // Update section title with count
    const sectionTitle = document.getElementById("current-trainees-title");
    if (sectionTitle) {
      sectionTitle.textContent = `Current Trainees (${currentTrainees.length})`;
    }

    // Build trainee cards
    currentTrainees.forEach((traineeData, index) => {
      const traineeCard = this.createTraineeCard(traineeData, index);
      traineesGrid.appendChild(traineeCard);
    });

    // Attach event listeners
    this.attachTraineeEventListeners();
  }

  createTraineeCard(traineeData, index) {
    const application = traineeData.application;
    const student = application.student || {};
    const duration = application.duration || {};
    const internship = traineeData.internship || {};

    const traineeId = application.id || `trainee-${index}`;
    const studentName = student.name || student.fullName || "Unknown Student";
    const studentCourse =
      student.courseOfStudy || student.program || "Not specified";
    const internshipTitle = internship.title || "Internship";
    const department = internship.department || "Not specified";

    let avatarUrl = student.imageUrl || "";
    if (
      avatarUrl &&
      (avatarUrl.includes("undefined") ||
        avatarUrl.includes("null") ||
        avatarUrl.trim() === "")
    ) {
      avatarUrl = null;
    }

    // Format dates
    const startDate = duration.startDate ? new Date(duration.startDate) : null;
    const endDate = duration.endDate ? new Date(duration.endDate) : null;

    const startDateFormatted = startDate
      ? startDate.toLocaleDateString()
      : "Not set";
    const endDateFormatted = endDate ? endDate.toLocaleDateString() : "Not set";

    // Calculate progress if both dates are available
    const progressInfo = this.calculateTrainingProgress(startDate, endDate);

    const avatarHtml = createAvatarElement(studentName, avatarUrl, 60);

    const card = document.createElement("div");
    card.className =
      "bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-green-100 dark:border-green-900";
    card.id = `trainee-card-${traineeId}`;

    card.innerHTML = `
        <div class="flex items-center gap-4 mb-4">
            ${avatarHtml}
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-900 dark:text-white truncate">${this.escapeHtml(
                  studentName
                )}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 truncate">${this.escapeHtml(
                  internshipTitle
                )}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-green-600 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">Active</span>
                    ${
                      progressInfo
                        ? `<span class="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">${progressInfo.percentage}%</span>`
                        : ""
                    }
                </div>
            </div>
        </div>
        
        ${
          progressInfo
            ? `
        <div class="mb-4">
            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Training Progress</span>
                <span>${progressInfo.percentage}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div class="bg-green-600 h-2 rounded-full" style="width: ${progressInfo.percentage}%"></div>
            </div>
        </div>
        `
            : ""
        }
        
        <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex justify-between items-center">
                <span>Start Date:</span>
                <span class="font-medium text-gray-900 dark:text-white">${startDateFormatted}</span>
            </div>
            <div class="flex justify-between items-center">
                <span>End Date:</span>
                <span class="font-medium text-gray-900 dark:text-white">${endDateFormatted}</span>
            </div>
            <div class="flex justify-between items-center">
                <span>Department:</span>
                <span class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(
                  department
                )}</span>
            </div>
            <div class="flex justify-between items-center">
                <span>Program:</span>
                <span class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(
                  studentCourse
                )}</span>
            </div>
            ${
              progressInfo && progressInfo.remainingDays
                ? `
            <div class="flex justify-between items-center">
                <span>Remaining:</span>
                <span class="font-medium text-gray-900 dark:text-white">${progressInfo.remainingDays} days</span>
            </div>
            `
                : ""
            }
        </div>
        
        <div class="flex gap-2 mt-4">
            <button 
                id="view-profile-btn-${traineeId}" 
                class="flex-1 bg-primary text-white text-sm py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
                Profile
            </button>
            <button 
                id="message-trainee-btn-${traineeId}" 
                class="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                Message
            </button>
        </div>
    `;

    return card;
  }

  calculateTrainingProgress(startDate, endDate) {
    if (!startDate || !endDate) return null;

    const now = new Date();
    const totalDuration = endDate - startDate;
    const elapsedDuration = now - startDate;

    if (totalDuration <= 0 || elapsedDuration < 0) return null;

    const percentage = Math.min(
      100,
      Math.max(0, Math.round((elapsedDuration / totalDuration) * 100))
    );
    const remainingDays = Math.max(
      0,
      Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    );

    return {
      percentage,
      remainingDays,
      elapsedDays: Math.floor(elapsedDuration / (1000 * 60 * 60 * 24)),
    };
  }

  attachTraineeEventListeners() {
    const currentTrainees = this.trainingStudentsByDate.current;

    currentTrainees.forEach((traineeData) => {
      const application = traineeData.application;
      const traineeId = application.id;

      // View Profile button
      const viewProfileBtn = document.getElementById(
        `view-profile-btn-${traineeId}`
      );
      if (viewProfileBtn) {
        viewProfileBtn.addEventListener("click", (e) => {
          this.handleViewTraineeProfile(e, traineeId);
        });
      }

      // Message button
      const messageBtn = document.getElementById(
        `message-trainee-btn-${traineeId}`
      );
      if (messageBtn) {
        messageBtn.addEventListener("click", (e) => {
          this.handleMessageTrainee(e, traineeId);
        });
      }
    });
  }
  // ************************************ Trainee Action Handlers ************************************ //
  handleViewTraineeProfile(e, traineeId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Viewing trainee profile: ${traineeId}`);

    const traineeData = this.trainingStudentsByDate.current.find(
      (trainee) => trainee.application.id === traineeId
    );

    if (!traineeData) return;

    this.showTraineeProfileModal(traineeData);
  }

  handleMessageTrainee(e, traineeId) {
    e.preventDefault();
    e.stopPropagation();

    console.log(`Messaging trainee: ${traineeId}`);

    const traineeData = this.trainingStudentsByDate.current.find(
      (trainee) => trainee.application.id === traineeId
    );

    if (!traineeData) return;

    const student = traineeData.application.student || {};
    const studentEmail = student.email;
    const studentName = student.name || student.fullName || "Trainee";

    if (studentEmail) {
      const subject = `Regarding Your Training - ${
        traineeData.internship?.title || "Internship"
      }`;
      const mailtoLink = `mailto:${studentEmail}?subject=${encodeURIComponent(
        subject
      )}`;
      window.open(mailtoLink, "_blank");
    } else {
      this.showNotification(
        "No email address available for this trainee",
        "warning"
      );
    }
  }
  showTraineeProfileModal(traineeData) {
    const application = traineeData.application;
    const student = application.student || {};
    const duration = application.duration || {};
    const internship = traineeData.internship || {};

    const studentName = student.name || student.fullName || "Unknown Student";
    const studentEmail = student.email || "No email";
    const studentPhone = student.phone || student.mobileNo || "Not provided";
    const studentCourse =
      student.courseOfStudy || student.program || "Not specified";
    const university =
      student.university || student.institution || "Not specified";

    let avatarUrl = student.imageUrl || "";
    if (
      avatarUrl &&
      (avatarUrl.includes("undefined") ||
        avatarUrl.includes("null") ||
        avatarUrl.trim() === "")
    ) {
      avatarUrl = null;
    }

    const avatarHtml = createAvatarElement(studentName, avatarUrl, 80);
    const progressInfo = this.calculateTrainingProgress(
      duration.startDate ? new Date(duration.startDate) : null,
      duration.endDate ? new Date(duration.endDate) : null
    );

    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                            Trainee Profile
                        </h3>
                        <button id="close-trainee-modal" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    <div class="space-y-6">
                        <!-- Header -->
                        <div class="flex items-center gap-6">
                            ${avatarHtml}
                            <div class="flex-1">
                                <h4 class="text-2xl font-bold text-gray-900 dark:text-white">${this.escapeHtml(
                                  studentName
                                )}</h4>
                                <p class="text-lg text-gray-600 dark:text-gray-400">${this.escapeHtml(
                                  internship.title || "Intern"
                                )}</p>
                                <div class="flex items-center gap-2 mt-2">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Active Trainee
                                    </span>
                                    ${
                                      progressInfo
                                        ? `
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        ${progressInfo.percentage}% Complete
                                    </span>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        ${
                          progressInfo
                            ? `
                        <div>
                            <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <span>Training Progress</span>
                                <span>${progressInfo.remainingDays} days remaining</span>
                            </div>
                            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div class="bg-green-600 h-3 rounded-full transition-all duration-300" style="width: ${progressInfo.percentage}%"></div>
                            </div>
                        </div>
                        `
                            : ""
                        }

                        <!-- Personal Information -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h5 class="font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h5>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Email:</span>
                                        <span class="text-gray-900 dark:text-white">${this.escapeHtml(
                                          studentEmail
                                        )}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Phone:</span>
                                        <span class="text-gray-900 dark:text-white">${this.escapeHtml(
                                          studentPhone
                                        )}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Course:</span>
                                        <span class="text-gray-900 dark:text-white">${this.escapeHtml(
                                          studentCourse
                                        )}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">University:</span>
                                        <span class="text-gray-900 dark:text-white">${this.escapeHtml(
                                          university
                                        )}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Training Information -->
                            <div>
                                <h5 class="font-semibold text-gray-900 dark:text-white mb-3">Training Information</h5>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Department:</span>
                                        <span class="text-gray-900 dark:text-white">${this.escapeHtml(
                                          internship.department ||
                                            "Not specified"
                                        )}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Start Date:</span>
                                        <span class="text-gray-900 dark:text-white">${
                                          duration.startDate
                                            ? new Date(
                                                duration.startDate
                                              ).toLocaleDateString()
                                            : "Not set"
                                        }</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">End Date:</span>
                                        <span class="text-gray-900 dark:text-white">${
                                          duration.endDate
                                            ? new Date(
                                                duration.endDate
                                              ).toLocaleDateString()
                                            : "Not set"
                                        }</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-500">Supervisor:</span>
                                        <span class="text-gray-900 dark:text-white">${this.escapeHtml(
                                          internship.supervisor ||
                                            "Not assigned"
                                        )}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button class="flex-1 bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium">
                                Schedule Meeting
                            </button>
                            <button class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                Send Message
                            </button>
                            <button class="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
                                View Documents
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to DOM
    const modalContainer = document.createElement("div");
    modalContainer.id = "trainee-profile-modal";
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // Add close event listener
    const closeBtn = document.getElementById("close-trainee-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.removeChild(modalContainer);
      });
    }

    // Close modal when clicking outside
    modalContainer.addEventListener("click", (e) => {
      if (e.target === modalContainer) {
        document.body.removeChild(modalContainer);
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  new CompanyDashboardManager();
   setTimeout(() => {
    new SectionReorderManager();
  }, 500);
});

//****************************************** Drag and Drop Functionality ********************* */

class SectionReorderManager {
  constructor() {
    this.draggedSection = null;
    this.sectionOrder = this.getSavedSectionOrder() || ["pipeline", "trainees"];
    
    // Initialize after a small delay to ensure DOM is ready
    setTimeout(() => {
      this.initialize();
    }, 100);
  }

  initialize() {
    this.sectionsContainer = document.getElementById("sections-container");
    if (!this.sectionsContainer) {
      console.error("Sections container not found!");
      return;
    }

    this.initializeDragAndDrop();
    this.renderSectionsInOrder();
  }

  initializeDragAndDrop() {
    // Mouse events for drag handle
    document.addEventListener("mousedown", this.handleMouseDown.bind(this));
    document.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("mouseup", this.handleMouseUp.bind(this));

    // Button controls
    document.addEventListener("click", this.handleButtonClick.bind(this));
    
    // Add reset button
    this.addResetButton();
  }

  addResetButton() {
    const headerContent = document.getElementById("header-content");
    if (!headerContent) return;

    // Check if reset button already exists
    if (document.getElementById("reset-layout-btn")) return;

    const resetButton = document.createElement("button");
    resetButton.id = "reset-layout-btn";
    resetButton.textContent = "Reset Layout";
    resetButton.className = "bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors ml-4";
    resetButton.addEventListener("click", () => {
      this.resetToDefaultOrder();
    });

    headerContent.appendChild(resetButton);
  }

  handleMouseDown(e) {
    if (e.target.closest(".reorder-handle")) {
      e.preventDefault();
      const section = e.target.closest(".draggable-section");
      if (section) {
        this.startDrag(section, e.clientY);
      }
    }
  }

  handleMouseMove(e) {
    if (this.draggedSection) {
      e.preventDefault();
      this.updateDrag(e.clientY);
    }
  }

  handleMouseUp(e) {
    if (this.draggedSection) {
      e.preventDefault();
      this.endDrag();
    }
  }

  handleButtonClick(e) {
    if (e.target.closest(".move-up-btn")) {
      e.preventDefault();
      const section = e.target.closest(".draggable-section");
      if (section) {
        this.moveSectionUp(section);
      }
    } else if (e.target.closest(".move-down-btn")) {
      e.preventDefault();
      const section = e.target.closest(".draggable-section");
      if (section) {
        this.moveSectionDown(section);
      }
    }
  }

  startDrag(section, startY) {
    this.draggedSection = section;
    this.dragStartY = startY;
    
    section.classList.add("dragging");
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";

    // Create ghost element
    this.ghostElement = section.cloneNode(true);
    this.ghostElement.style.opacity = "0.7";
    this.ghostElement.style.position = "fixed";
    this.ghostElement.style.zIndex = "1000";
    this.ghostElement.style.pointerEvents = "none";
    this.ghostElement.style.width = `${section.offsetWidth}px`;
    this.ghostElement.style.left = `${section.getBoundingClientRect().left}px`;
    this.ghostElement.style.top = `${section.getBoundingClientRect().top}px`;
    this.ghostElement.style.margin = "0";
    this.ghostElement.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
    
    document.body.appendChild(this.ghostElement);
  }

  updateDrag(currentY) {
    if (!this.draggedSection || !this.ghostElement) return;

    const deltaY = currentY - this.dragStartY;
    this.ghostElement.style.transform = `translateY(${deltaY}px)`;

    // Find the section we're hovering over
    const sections = Array.from(
      document.querySelectorAll(".draggable-section:not(.dragging)")
    );
    
    let targetSection = null;
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (currentY >= rect.top && currentY <= rect.bottom) {
        targetSection = section;
        break;
      }
    }

    // Update visual feedback
    sections.forEach((section) => section.classList.remove("drag-over"));
    if (targetSection) {
      targetSection.classList.add("drag-over");
    }
  }

  endDrag() {
    if (!this.draggedSection) return;

    const sections = Array.from(
      document.querySelectorAll(".draggable-section:not(.dragging)")
    );
    const targetSection = sections.find((section) =>
      section.classList.contains("drag-over")
    );

    if (targetSection) {
      const targetIndex = this.getSectionIndex(targetSection);
      this.moveSectionToIndex(this.draggedSection, targetIndex);
    }

    // Clean up
    this.draggedSection.classList.remove("dragging");
    sections.forEach((section) => section.classList.remove("drag-over"));

    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    this.draggedSection = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    this.saveSectionOrder();
  }

  moveSectionUp(section) {
    const currentIndex = this.getSectionIndex(section);
    if (currentIndex > 0) {
      this.moveSectionToIndex(section, currentIndex - 1);
      this.saveSectionOrder();
    }
  }

  moveSectionDown(section) {
    const currentIndex = this.getSectionIndex(section);
    const sections = document.querySelectorAll(".draggable-section");
    if (currentIndex < sections.length - 1) {
      this.moveSectionToIndex(section, currentIndex + 1);
      this.saveSectionOrder();
    }
  }

  moveSectionToIndex(section, newIndex) {
    const sections = Array.from(
      document.querySelectorAll(".draggable-section")
    );
    const currentIndex = this.getSectionIndex(section);

    if (currentIndex === -1 || newIndex < 0 || newIndex >= sections.length)
      return;

    // Remove from current position
    sections.splice(currentIndex, 1);
    // Insert at new position
    sections.splice(newIndex, 0, section);

    // Reorder in DOM
    const container = document.getElementById("sections-container");
    if (container) {
      // Clear and reappend in new order
      container.innerHTML = "";
      sections.forEach((sec) => container.appendChild(sec));
    }

    // Update section order array
    this.updateSectionOrderArray();
  }

  getSectionIndex(section) {
    const sections = Array.from(
      document.querySelectorAll(".draggable-section")
    );
    return sections.indexOf(section);
  }

  updateSectionOrderArray() {
    const sections = Array.from(
      document.querySelectorAll(".draggable-section")
    );
    this.sectionOrder = sections.map((section) => section.dataset.section);
  }

  renderSectionsInOrder() {
    const container = document.getElementById("sections-container");
    if (!container) {
      console.error("Sections container not found for rendering!");
      return;
    }

    // Get all draggable sections
    const sections = Array.from(document.querySelectorAll(".draggable-section"));
    if (sections.length === 0) {
      console.warn("No draggable sections found!");
      return;
    }

    // Create a map of sections by their data-section attribute
    const sectionsMap = {};
    sections.forEach(section => {
      const sectionId = section.dataset.section;
      if (sectionId) {
        sectionsMap[sectionId] = section;
      }
    });

    // Clear container
    container.innerHTML = "";

    // Add sections in saved order
    this.sectionOrder.forEach((sectionId) => {
      if (sectionsMap[sectionId]) {
        container.appendChild(sectionsMap[sectionId]);
      }
    });

    console.log("Sections rendered in order:", this.sectionOrder);
  }

  getSavedSectionOrder() {
    try {
      return JSON.parse(localStorage.getItem("dashboardSectionOrder"));
    } catch (error) {
      console.warn("Could not load saved section order:", error);
      return null;
    }
  }

  saveSectionOrder() {
    this.updateSectionOrderArray();
    try {
      localStorage.setItem(
        "dashboardSectionOrder",
        JSON.stringify(this.sectionOrder)
      );
      console.log("Section order saved:", this.sectionOrder);
    } catch (error) {
      console.warn("Could not save section order:", error);
    }
  }

  // Method to reset to default order
  resetToDefaultOrder() {
    this.sectionOrder = ["pipeline", "trainees"];
    this.renderSectionsInOrder();
    this.saveSectionOrder();
    
    // Show confirmation
    this.showNotification("Layout reset to default order", "success");
  }

  showNotification(message, type = "info") {
    // Simple notification implementation
    console.log(`${type}: ${message}`);
    
  }
}