import {
  getAvatarElement,
  getAvatarInitials,
  messageDialog,
} from "../../../js/general/generalmethods.js";
import { CurrentStudentService } from "../../../js/migration/MigrationService.js";
import { MigrationNotification } from "../../../js/migration/MigrationNotification.js";
import { Timestamp } from "../../../js/config/firebaseInit.js";

export default class CurrentTraining {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.currentStudentService = new CurrentStudentService();
    this.migrationNotification = new MigrationNotification(
      this.currentStudentService
    );
    this.name = "current_trainee";
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filteredTrainees = [];
    this.originalTrainees = [];
    this.currentSearchTerm = "";
  }

  async init() {
    //console.log("Initializing Current Training Tab");
    this.initializeElements();
    this.initializeEventListeners();
    await this.buildTrainingContent();
    // Check for pending migrations after content is loaded
    await this.checkForPendingMigrations();
  }

  refresh(tabManager) {
    this.tabManager = tabManager;
    this.buildTrainingContent();
  }

  initializeElements() {
    // Table and pagination elements
    this.traineesTableBody = document.getElementById("trainees-table-body");
    this.exportBtn = document.getElementById("export-trainees-btn");
    this.addTraineeBtn = document.getElementById("add-trainee-btn");

    // Stats elements
    this.activeTraineesCount = document.getElementById("active-trainees-count");
    this.completionRate = document.getElementById("completion-rate");
    this.averageProgress = document.getElementById("average-progress");
    this.endingSoonCount = document.getElementById("ending-soon-count");

    // Pagination elements
    this.prevPageBtn = document.getElementById("trainees-prev-page");
    this.nextPageBtn = document.getElementById("trainees-next-page");
    this.paginationNumbers = document.getElementById(
      "trainees-pagination-numbers"
    );
    this.paginationStart = document.getElementById("trainees-pagination-start");
    this.paginationEnd = document.getElementById("trainees-pagination-end");
    this.paginationTotal = document.getElementById("trainees-pagination-total");

    // Activity sections
    this.recentActivitiesList = document.getElementById(
      "recent-activities-list"
    );
    this.upcomingDeadlinesList = document.getElementById(
      "upcoming-deadlines-list"
    );

    this.searchInput = document.getElementById("trainees-search-input");
    this.institutionFilter = document.getElementById(
      "trainees-institution-filter"
    );
    this.progressFilter = document.getElementById("trainees-progress-filter");
    this.statusFilter = document.getElementById("trainees-status-filter");
    this.clearFiltersBtn = document.getElementById("clear-trainees-filters");
    this.activeFiltersDisplay = document.getElementById(
      "active-filters-display"
    );

    // Add migration button to your header
    this.migrationBtn = document.getElementById("migrate-students-btn");
    if (!this.migrationBtn) {
      // Create it if it doesn't exist
      const header = document.querySelector(
        ".flex.justify-between.items-center"
      );
      if (header) {
        const migrateBtn = document.createElement("button");
        migrateBtn.id = "migrate-students-btn";
        migrateBtn.className =
          "flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors";
        migrateBtn.innerHTML = `
          <span class="material-symbols-outlined text-base">system_update</span>
          Check Migrations
        `;
        migrateBtn.addEventListener("click", async () =>
          this.checkForPendingMigrations()
        );
        header.appendChild(migrateBtn);
        this.migrationBtn = migrateBtn;
      }
    }
    //console.log("Current Training elements initialized");
  }

  initializeEventListeners() {
    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        this.exportTrainees();
      });
    }

    // Add trainee button
    if (this.addTraineeBtn) {
      this.addTraineeBtn.addEventListener("click", () => {
        this.addTrainee();
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

    // Search functionality
    if (this.searchInput) {
      this.searchInput.addEventListener("input", (e) => {
        this.handleSearch(e.target.value);
      });
    }

    // Filter functionality
    if (this.institutionFilter) {
      this.institutionFilter.addEventListener("change", () => {
        this.applyAllFilters();
      });
    }

    if (this.progressFilter) {
      this.progressFilter.addEventListener("change", () => {
        this.applyAllFilters();
      });
    }

    if (this.statusFilter) {
      this.statusFilter.addEventListener("change", () => {
        this.applyAllFilters();
      });
    }

    // Clear filters
    if (this.clearFiltersBtn) {
      this.clearFiltersBtn.addEventListener("click", () => {
        this.clearFilters();
      });
    }
  }

  handleSearch(searchTerm) {
    this.currentSearchTerm = searchTerm.toLowerCase();
    this.applyAllFilters();
  }

  applyAllFilters() {
    let filtered = [...this.originalTrainees];

    // Search filter
    if (this.currentSearchTerm) {
      filtered = filtered.filter((trainee) => {
        const student = this.getTraineeStudent(trainee);
        const training = this.getTraineeTraining(trainee);
        const institution = student.institution || "";

        const searchableText = [
          student.fullName || "",
          student.email || "",
          training.title || "",
          institution,
          student.courseOfStudy || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(this.currentSearchTerm);
      });
    }

    // Institution filter
    const institutionValue = this.institutionFilter?.value;
    if (institutionValue && institutionValue !== "all") {
      filtered = filtered.filter((trainee) => {
        const student = this.getTraineeStudent(trainee);
        const institution = student.institution || "";
        return institution.toLowerCase().includes(institutionValue);
      });
    }

    // Progress filter
    const progressValue = this.progressFilter?.value;
    if (progressValue && progressValue !== "all") {
      filtered = filtered.filter((trainee) => {
        const progress = this.getTraineeProgress(trainee);

        switch (progressValue) {
          case "0-25":
            return progress >= 0 && progress <= 25;
          case "26-50":
            return progress >= 26 && progress <= 50;
          case "51-75":
            return progress >= 51 && progress <= 75;
          case "76-100":
            return progress >= 76 && progress <= 99;
          case "completed":
            return progress === 100;
          default:
            return true;
        }
      });
    }

    // Status filter
    const statusValue = this.statusFilter?.value;
    if (statusValue && statusValue !== "all") {
      const now = new Date();

      filtered = filtered.filter((trainee) => {
        const progress = this.getTraineeProgress(trainee);
        const endDate = this.getTraineeEndDate(trainee);
        const daysRemaining = endDate
          ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
          : null;

        switch (statusValue) {
          case "active":
            return progress < 100 && (!daysRemaining || daysRemaining > 7);
          case "ending-soon":
            return (
              daysRemaining !== null && daysRemaining <= 7 && progress < 100
            );
          case "almost-done":
            return progress >= 75 && progress < 100;
          case "completed":
            return progress === 100;
          default:
            return true;
        }
      });
    }

    this.filteredTrainees = filtered;
    this.currentPage = 1;
    this.renderTraineesTable();
    this.updatePagination();
    this.updateStats();
    this.updateActiveFiltersDisplay();
  }

  getTraineeStudent(trainee) {
  if (trainee.application) {
    return trainee.application.student || {};
  }
  return trainee.studentInfo || {};
}

getTraineeTraining(trainee) {
  if (trainee.application) {
    return trainee.training || trainee.industrialTraining || trainee.application.internship || {};
  }
  return trainee.trainingInfo || {};
}


  applyFilters() {
    let filtered = [...(this.originalTrainees || this.filteredTrainees)];

    // Store original data if not already stored
    if (!this.originalTrainees) {
      this.originalTrainees = [...this.filteredTrainees];
    }

    // Search filter
    if (this.currentSearchTerm) {
      filtered = filtered.filter((trainee) => {
        const student = trainee.studentInfo || {};
        const training = trainee.training || {};
        const institution = student.institution || "";

        const searchableText = [
          student.fullName || "",
          student.email || "",
          training.title || "",
          institution,
          student.courseOfStudy || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(this.currentSearchTerm);
      });
    }

    // Institution filter
    const institutionValue = this.institutionFilter?.value;
    if (institutionValue && institutionValue !== "all") {
      filtered = filtered.filter((trainee) => {
        const institution = trainee.studentInfo?.institution || "";
        return institution.toLowerCase().includes(institutionValue);
      });
    }

    // Progress filter
    const progressValue = this.progressFilter?.value;
    if (progressValue && progressValue !== "all") {
      filtered = filtered.filter((trainee) => {
        const progress = trainee.progress.overall || 0;

        switch (progressValue) {
          case "0-25":
            return progress >= 0 && progress <= 25;
          case "26-50":
            return progress >= 26 && progress <= 50;
          case "51-75":
            return progress >= 51 && progress <= 75;
          case "76-100":
            return progress >= 76 && progress <= 99;
          case "completed":
            return progress === 100;
          default:
            return true;
        }
      });
    }

    // Status filter
    const statusValue = this.statusFilter?.value;
    if (statusValue && statusValue !== "all") {
      const now = new Date();

      filtered = filtered.filter((trainee) => {
        const progress = trainee.progress.overall || 0;
        const endDate = trainee.duration?.endDate
          ? new Date(trainee.duration.endDate)
          : null;
        const daysRemaining = endDate
          ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
          : null;

        switch (statusValue) {
          case "active":
            return progress < 100 && (!daysRemaining || daysRemaining > 7);
          case "ending-soon":
            return (
              daysRemaining !== null && daysRemaining <= 7 && progress < 100
            );
          case "almost-done":
            return progress >= 75 && progress < 100;
          case "completed":
            return progress === 100;
          default:
            return true;
        }
      });
    }

    this.filteredTrainees = filtered;
    this.currentPage = 1; // Reset to first page when filtering
    this.renderTraineesTable();
    this.updatePagination();
    this.updateStats();
    this.updateActiveFiltersDisplay();
  }

  clearFilters() {
    // Clear input fields
    if (this.searchInput) this.searchInput.value = "";
    if (this.institutionFilter) this.institutionFilter.value = "all";
    if (this.progressFilter) this.progressFilter.value = "all";
    if (this.statusFilter) this.statusFilter.value = "all";

    // Clear stored data
    this.currentSearchTerm = "";

    // Reset to original data
    this.filteredTrainees = [...this.originalTrainees];

    this.currentPage = 1;
    this.renderTraineesTable();
    this.updatePagination();
    this.updateStats();
    this.updateActiveFiltersDisplay();
  }
  updateActiveFiltersDisplay() {
    if (!this.activeFiltersDisplay) return;

    const activeFilters = [];

    // Search term
    if (this.currentSearchTerm) {
      activeFilters.push({
        type: "search",
        label: `Search: "${this.currentSearchTerm}"`,
        clear: () => {
          this.searchInput.value = "";
          this.currentSearchTerm = "";
          this.applyAllFilters(); // ✅ Fixed: call applyAllFilters
        },
      });
    }

    // Institution filter
    if (this.institutionFilter && this.institutionFilter.value !== "all") {
      activeFilters.push({
        type: "institution",
        label: `Institution: ${
          this.institutionFilter.options[this.institutionFilter.selectedIndex]
            .text
        }`,
        clear: () => {
          this.institutionFilter.value = "all";
          this.applyAllFilters(); // ✅ Fixed: call applyAllFilters
        },
      });
    }

    // Progress filter
    if (this.progressFilter && this.progressFilter.value !== "all") {
      activeFilters.push({
        type: "progress",
        label: `Progress: ${
          this.progressFilter.options[this.progressFilter.selectedIndex].text
        }`,
        clear: () => {
          this.progressFilter.value = "all";
          this.applyAllFilters(); // ✅ Fixed: call applyAllFilters
        },
      });
    }

    // Status filter
    if (this.statusFilter && this.statusFilter.value !== "all") {
      activeFilters.push({
        type: "status",
        label: `Status: ${
          this.statusFilter.options[this.statusFilter.selectedIndex].text
        }`,
        clear: () => {
          this.statusFilter.value = "all";
          this.applyAllFilters();
        },
      });
    }
    // Update display
    if (activeFilters.length > 0) {
      this.activeFiltersDisplay.classList.remove("hidden");
      this.activeFiltersDisplay.innerHTML = activeFilters
        .map(
          (filter) => `
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
        ${filter.label}
        <button type="button" class="hover:text-primary/70 transition-colors" data-filter-type="${filter.type}">
          <span class="material-symbols-outlined text-base">close</span>
        </button>
      </span>
    `
        )
        .join("");

      // Add event listeners to clear buttons
      this.activeFiltersDisplay.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", (e) => {
          const filterType = e.currentTarget.dataset.filterType;
          const filter = activeFilters.find((f) => f.type === filterType);
          if (filter) filter.clear();
        });
      });
    } else {
      this.activeFiltersDisplay.classList.add("hidden");
      this.activeFiltersDisplay.innerHTML = "";
    }
  }

  async buildTrainingContent() {
    //console.log("Building training content...");

    const currentTrainees =
      this.tabManager.getTrainingStudentsByDate("current");
    // Use already migrated students or applications
    const currentStudents =
      await this.currentStudentService.getAllCurrentStudents();
    //console.log("current Trainees ", currentTrainees);
    if (currentTrainees.length > 0) {
      // Use migrated students
      this.originalTrainees = currentTrainees;
      console.log("originalTrainees " + JSON.stringify(this.originalTrainees));
      //console.log(`🎯 Using ${currentStudents.length} migrated students`);
    } else {
      // Use applications (not yet migrated)
      this.originalTrainees = currentStudents;
      // //console.log(
      //   `📋 Using ${currentTrainees.length} applications (not migrated yet)`
      // );
    }
    this.filteredTrainees = this.applyInitialFilters(this.originalTrainees);

    this.updateStats();
    this.renderTraineesTable();
    this.updatePagination();
    this.renderRecentActivities();
    this.renderUpcomingDeadlines();
  }

  // Check for pending migrations
  async checkForPendingMigrations() {
    const currentApplications =
      this.tabManager.getTrainingStudentsByDate("current");

    // Check if there are pending migrations
    const hasPendingMigrations =
      await this.migrationNotification.checkAndShowMigrationNotification(
        currentApplications
      );

    if (hasPendingMigrations) {
      //console.log("📢 Migration notification shown to user");
    } else {
      //console.log("✅ No pending migrations found");
    }
  }

  // Rename this method to avoid naming conflict
  applyInitialFilters(trainees) {
    const filters = this.tabManager.currentFilters || {};
    let filtered = [...trainees];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((trainee) => {
        const student = trainee.studentInfo || {};
        const training = trainee.training || {}; // FIXED: changed from 'training' to 'trainee.training'

        return (
          (student.name || "").toLowerCase().includes(searchTerm) ||
          (student.email || "").toLowerCase().includes(searchTerm) ||
          (training.title || "").toLowerCase().includes(searchTerm) ||
          (student.institution || "").toLowerCase().includes(searchTerm)
        );
      });
    }

    return filtered;
  }

  applyFilters(trainees) {
    const filters = this.tabManager.currentFilters || {};
    let filtered = [...trainees];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((trainee) => {
        const student = trainee.studentInfo || {};
        const opportunity = trainee.opportunity || {};

        return (
          (student.name || "").toLowerCase().includes(searchTerm) ||
          (student.email || "").toLowerCase().includes(searchTerm) ||
          (training.title || "").toLowerCase().includes(searchTerm) ||
          (student.institution || "").toLowerCase().includes(searchTerm)
        );
      });
    }

    return filtered;
  }

  updateStats() {
    const totalTrainees = this.filteredTrainees.length;

    // Calculate stats
    const now = new Date();
    const endingThisMonth = this.filteredTrainees.filter((trainee) => {
      const endDate = this.getTraineeEndDate(trainee);
      if (!endDate) return false;

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return endDate <= endOfMonth && endDate >= now;
    }).length;

    const averageProgress =
      this.filteredTrainees.length > 0
        ? Math.round(
            this.filteredTrainees.reduce(
              (sum, trainee) => sum + this.getTraineeProgress(trainee),
              0
            ) / this.filteredTrainees.length
          )
        : 0;

    const completedCount = this.filteredTrainees.filter(
      (trainee) => this.getTraineeProgress(trainee) === 100
    ).length;

    const completionRate =
      totalTrainees > 0
        ? Math.round((completedCount / totalTrainees) * 100)
        : 0;

    // Update DOM
    if (this.activeTraineesCount) {
      this.activeTraineesCount.textContent = totalTrainees;
    }
    if (this.completionRate) {
      this.completionRate.textContent = `${completionRate}%`;
    }
    if (this.averageProgress) {
      this.averageProgress.textContent = `${averageProgress}%`;
    }
    if (this.endingSoonCount) {
      this.endingSoonCount.textContent = endingThisMonth;
    }
  }

  // Helper method to get end date from any trainee structure
  getTraineeEndDate(trainee) {
    if (trainee.application?.duration?.endDate) {
      return new Date(trainee.application.duration.endDate);
    }
    if (trainee.trainingInfo?.duration?.endDate) {
      return new Date(trainee.trainingInfo.duration.endDate);
    }
    if (trainee.duration?.endDate) {
      return new Date(trainee.duration.endDate);
    }
    if (trainee.training?.duration?.endDate) {
      return new Date(trainee.training.duration.endDate);
    }
    return null;
  }

  // Helper method to get progress from any trainee structure
  getTraineeProgress(trainee) {
    // Application-based structure
    if (trainee.application) {
      return (
        trainee.application.progress ||
        trainee.training?.progress ||
        trainee.progress?.overall ||
        0
      );
    }

    // Normalized structure
    if (trainee.trainingInfo) {
      return trainee.trainingInfo.progress || trainee.progress?.overall || 0;
    }

    // Direct progress structure
    if (trainee.progress) {
      return typeof trainee.progress === "object"
        ? trainee.progress.overall || 0
        : trainee.progress || 0;
    }

    return 0;
  }
  renderTraineesTable() {
    if (!this.traineesTableBody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentTrainees = this.filteredTrainees.slice(startIndex, endIndex);

    this.traineesTableBody.innerHTML = "";

    if (currentTrainees.length === 0) {
      this.traineesTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <div class="flex flex-col items-center">
              <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">school</span>
              <p class="text-lg font-medium mb-1">No active trainees</p>
              <p class="text-sm">All current training sessions will appear here</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    currentTrainees.forEach((traineeData, index) => {
      const row = this.createTraineeRow(traineeData, startIndex + index);
      this.traineesTableBody.appendChild(row);
    });
  }

  createTraineeRow(traineeData, index) {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors";

    // Extract data based on structure type
    let student, training, duration, progress, traineeId;

    if (traineeData.application) {
      // Application-based structure
      student = traineeData.application.student || {};
      training =
        traineeData.training ||
        traineeData.industrialTraining ||
        traineeData.application.internship ||
        {};
      duration = traineeData.application.duration || {};
      progress =
        traineeData.application.progress || traineeData.progress?.overall || 0;
      traineeId = traineeData.application.id || traineeData.id;
    } else {
      // Normalized structure
      student = traineeData.studentInfo || {};
      training = traineeData.trainingInfo || {};
      duration = traineeData.duration || {};
      progress =
        traineeData.progress?.overall ||
        traineeData.trainingInfo?.progress ||
        0;
      traineeId = traineeData.id;
    }

    // Handle progress format (could be object or number)
    const progressValue =
      typeof progress === "object" ? progress.overall || 0 : progress || 0;

    const safeConvertDate = (date) => {
      if (!date) return null;

      try {
        // If it's already a Date object
        if (date instanceof Date) {
          return date.toISOString();
        }

        // If it's a Firestore Timestamp, convert to Date then ISO string
        if (date instanceof Timestamp) {
          return date.toDate().toISOString();
        }

        // If it's a string or number, try to convert
        if (typeof date === "string" || typeof date === "number") {
          let parsedDate;

          // Handle the specific number format you're seeing (seconds since epoch)
          if (typeof date === "number") {
            // Check if it's in seconds (your case) vs milliseconds
            if (date > 10000000000) {
              // Number is too large to be seconds since 1970, treat as milliseconds
              parsedDate = new Date(date);
            } else {
              // Number is in seconds, convert to milliseconds
              parsedDate = new Date(date * 1000);
            }
          } else {
            // It's a string, try direct conversion
            parsedDate = new Date(date);
          }

          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString();
          }
        }

        console.warn("Invalid date encountered:", date, typeof date);
        return null;
      } catch (error) {
        console.error("Error converting date:", error, date);
        return null;
      }
    };

    const formatForDisplay = (isoString) => {
      if (!isoString) return "No date set";
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const isoStartDate = safeConvertDate(duration.startDate);
    const isoEndDate = safeConvertDate(duration.endDate);

    // Calculate days remaining
    const daysRemaining = isoEndDate
      ? Math.ceil((new Date(isoEndDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const startDate = formatForDisplay(isoStartDate);
    const endDate = formatForDisplay(isoEndDate);

    const statusConfig = this.getStatusConfig(progressValue, daysRemaining);

    // Get avatar content
    const avatarContent = getAvatarInitials(student.fullName, student.imageUrl);
    const hasImage = avatarContent.startsWith("url(");

    row.innerHTML = `
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
            ${student.fullName || "Unknown Trainee"}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            ${student.email || "No email"}
          </div>
        </div>
      </div>
    </td>
    <td class="px-6 py-4 whitespace-nowrap">
      <div class="text-sm text-gray-900 dark:text-white">${
        training.title || "N/A"
      }</div>
    </td>
    <td class="px-6 py-4 whitespace-nowrap">
      <div class="text-sm text-gray-900 dark:text-white">${
        student.institution || "N/A"
      }</div>
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
      ${startDate}
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
      ${endDate}
      ${
        daysRemaining !== null
          ? `<div class="text-xs text-gray-400">${daysRemaining} days left</div>`
          : ""
      }
    </td>
    <td class="px-6 py-4 whitespace-nowrap">
      <div class="flex items-center">
        <div class="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
          <div class="bg-green-500 h-2 rounded-full transition-all duration-300" 
               style="width: ${progressValue}%"></div>
        </div>
        <span class="text-sm text-gray-700 dark:text-gray-300">${progressValue}%</span>
      </div>
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
        <button class="view-trainee text-primary hover:text-blue-700 transition-colors" data-trainee-id="${traineeId}">
          <span class="material-symbols-outlined text-base">visibility</span>
        </button>
        <button class="edit-progress text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors" data-trainee-id="${traineeId}">
          <span class="material-symbols-outlined text-base">edit</span>
        </button>
        <button class="send-message text-green-600 hover:text-green-800 transition-colors" data-trainee-id="${traineeId}">
          <span class="material-symbols-outlined text-base">mail</span>
        </button>
      </div>
    </td>
  `;

    this.attachTraineeEventListeners(row, traineeId);
    return row;
  }
  getStatusConfig(progress, daysRemaining) {
    if (progress === 100) {
      return {
        class:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        text: "Completed",
        icon: "check_circle",
      };
    } else if (daysRemaining !== null && daysRemaining <= 7) {
      return {
        class:
          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        text: "Ending Soon",
        icon: "warning",
      };
    } else if (progress >= 75) {
      return {
        class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        text: "Almost Done",
        icon: "trending_up",
      };
    } else if (progress >= 50) {
      return {
        class:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        text: "In Progress",
        icon: "pace",
      };
    } else {
      return {
        class: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        text: "Started",
        icon: "play_arrow",
      };
    }
  }

  attachTraineeEventListeners(row, traineeId) {
    //console.log("even listener traineId is "+traineeId);
    const viewBtn = row.querySelector(".view-trainee");
    const editBtn = row.querySelector(".edit-progress");
    const messageBtn = row.querySelector(".send-message");

    if (viewBtn) {
      viewBtn.addEventListener("click", () => this.viewTrainee(traineeId));
    }
    if (editBtn) {
      editBtn.addEventListener("click", async () =>
        this.editProgress(traineeId)
      );
    }
    if (messageBtn) {
      messageBtn.addEventListener("click", () => this.sendMessage(traineeId));
    }
  }

  // Pagination methods (similar to Applications class)
  updatePagination() {
    const totalTrainees = this.filteredTrainees.length;
    const totalPages = Math.ceil(totalTrainees / this.itemsPerPage);

    if (this.paginationStart && this.paginationEnd && this.paginationTotal) {
      const start = (this.currentPage - 1) * this.itemsPerPage + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, totalTrainees);

      this.paginationStart.textContent = start;
      this.paginationEnd.textContent = end;
      this.paginationTotal.textContent = totalTrainees;
    }

    if (this.prevPageBtn) {
      this.prevPageBtn.disabled = this.currentPage === 1;
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.disabled =
        this.currentPage === totalPages || totalPages === 0;
    }

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
        pageBtn.addEventListener("click", () => this.goToPage(i));
        this.paginationNumbers.appendChild(pageBtn);
      }
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderTraineesTable();
      this.updatePagination();
    }
  }

  nextPage() {
    const totalPages = Math.ceil(
      this.filteredTrainees.length / this.itemsPerPage
    );
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderTraineesTable();
      this.updatePagination();
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderTraineesTable();
    this.updatePagination();
  }

  // Activity methods
  renderRecentActivities() {
    if (!this.recentActivitiesList) return;

    // Sample activities - replace with real data
    const activities = [];

    if (activities.length === 0) {
      this.recentActivitiesList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">activity</span>
          <p>No recent activities</p>
        </div>
      `;
      return;
    }

    this.recentActivitiesList.innerHTML = activities
      .map(
        (activity) => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">
            ${
              activity.type === "progress"
                ? "trending_up"
                : activity.type === "completed"
                ? "check_circle"
                : "mail"
            }
          </span>
        </div>
        <div class="flex-1">
          <p class="text-sm text-gray-900 dark:text-white">
            <span class="font-medium">${activity.trainee}</span>
            ${
              activity.type === "progress"
                ? "made progress in"
                : activity.type === "completed"
                ? "completed"
                : "sent a message about"
            }
            ${activity.course}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${
            activity.time
          }</p>
        </div>
      </div>
    `
      )
      .join("");
  }

  renderUpcomingDeadlines() {
    if (!this.upcomingDeadlinesList) return;

    const now = new Date();
    const upcomingDeadlines = this.filteredTrainees
      .filter((trainee) => {
        let endDate = null;

        // Handle different data structures
        if (trainee.application) {
          // Application-based structure
          endDate = trainee.application.duration?.endDate
            ? new Date(trainee.application.duration.endDate)
            : null;
        } else if (trainee.trainingInfo) {
          // Normalized structure
          endDate = trainee.trainingInfo.duration?.endDate
            ? new Date(trainee.trainingInfo.duration.endDate)
            : null;
        } else if (trainee.duration) {
          // Direct duration structure
          endDate = trainee.duration.endDate
            ? new Date(trainee.duration.endDate)
            : null;
        }

        if (!endDate) return false;
        const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilEnd <= 30 && daysUntilEnd > 0;
      })
      .sort((a, b) => {
        // Get end dates for sorting
        let endDateA = null,
          endDateB = null;

        if (a.application) {
          endDateA = a.application.duration?.endDate
            ? new Date(a.application.duration.endDate)
            : null;
        } else if (a.trainingInfo) {
          endDateA = a.trainingInfo.duration?.endDate
            ? new Date(a.trainingInfo.duration.endDate)
            : null;
        } else if (a.duration) {
          endDateA = a.duration.endDate ? new Date(a.duration.endDate) : null;
        }

        if (b.application) {
          endDateB = b.application.duration?.endDate
            ? new Date(b.application.duration.endDate)
            : null;
        } else if (b.trainingInfo) {
          endDateB = b.trainingInfo.duration?.endDate
            ? new Date(b.trainingInfo.duration.endDate)
            : null;
        } else if (b.duration) {
          endDateB = b.duration.endDate ? new Date(b.duration.endDate) : null;
        }

        // Handle cases where dates might be null
        if (!endDateA && !endDateB) return 0;
        if (!endDateA) return 1;
        if (!endDateB) return -1;

        return endDateA - endDateB;
      })
      .slice(0, 5);

    if (upcomingDeadlines.length === 0) {
      this.upcomingDeadlinesList.innerHTML = `
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <span class="material-symbols-outlined text-4xl mb-2 opacity-50">event</span>
        <p>No upcoming deadlines</p>
      </div>
    `;
      return;
    }

    this.upcomingDeadlinesList.innerHTML = upcomingDeadlines
      .map((trainee) => {
        // Extract student and training data based on structure
        let student = {};
        let training = {};
        let endDate = null;

        if (trainee.application) {
          // Application-based structure
          student = trainee.application.student || {};
          training =
            trainee.training ||
            trainee.industrialTraining ||
            trainee.application.internship ||
            {};
          endDate = trainee.application.duration?.endDate
            ? new Date(trainee.application.duration.endDate)
            : null;
        } else {
          // Normalized structure
          student = trainee.studentInfo || {};
          training = trainee.trainingInfo || {};
          endDate = trainee.duration?.endDate
            ? new Date(trainee.duration.endDate)
            : null;
        }

        if (!endDate) return ""; // Skip if no end date

        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        return `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">${
            student.fullName || "Unknown Trainee"
          }</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${
            training.title || "N/A"
          }</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-medium ${
            daysLeft <= 7
              ? "text-orange-600 dark:text-orange-400"
              : "text-gray-900 dark:text-white"
          }">
            ${endDate.toLocaleDateString()}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${daysLeft} days left</p>
        </div>
      </div>
    `;
      })
      .join("");
  }
  // Action methods
  viewTrainee(traineeId) {
    //console.log("View trainee details:", traineeId);

    // Find the trainee data
    const traineeData = this.filteredTrainees.find(
      (trainee) => trainee.id === traineeId
    );

    if (!traineeData) {
      console.error("Trainee not found:", traineeId);
      return;
    }

    // Show student profile modal
    this.showStudentProfile(traineeData);
  }

  showStudentProfile(traineeData) {
    const student = traineeData.studentInfo || {};
    const training = traineeData.trainingInfo || {};
    const duration = traineeData.duration || {};
    ////console.log("students is "+JSON.stringify(student));

    const isoStartDate = this.safeConvertDate(duration.startDate);
    const isoEndDate = this.safeConvertDate(duration.endDate);

    ////console.log("application "+JSON.stringify(application));
    let progressValue = 0;
    if (
      typeof traineeData.progress === "object" &&
      traineeData.progress !== null
    ) {
      // If progress is an object, try to get the overall progress
      progressValue = traineeData.progress.overall || 0;
    } else {
      // If progress is a number or undefined
      progressValue = traineeData.progress || 0;
    }

    const progress = Math.round(progressValue);

    // Calculate days remaining
    const daysRemaining = isoEndDate.iso
      ? Math.ceil(
          (new Date(isoEndDate.iso) - new Date()) / (1000 * 60 * 60 * 24)
        )
      : null;

    var startDate = isoStartDate.display;
    var endDate = isoEndDate.display;

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
    modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Student Profile</h2>
        <button id="close-profile" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <span class="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      <!-- Student Basic Info -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-start gap-6">
          <div class="flex-shrink-0">
            ${getAvatarElement(student.fullName, student.imageUrl, 80)}
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">${
              student.fullName || "Unknown Student"
            }</h3>
            <p class="text-gray-600 dark:text-gray-400">${
              student.email || "No email"
            }</p>
            <div class="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                <span class="text-gray-600 dark:text-gray-400 ml-2">${
                  student.phoneNumber || "Not provided"
                }</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">Institution:</span>
                <span class="text-gray-600 dark:text-gray-400 ml-2">${
                  student.institution || "Not provided"
                }</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">Course:</span>
                <span class="text-gray-600 dark:text-gray-400 ml-2">${
                  student.courseOfStudy || "Not provided"
                }</span>
              </div>
              <div>
                <span class="font-medium text-gray-700 dark:text-gray-300">Department:</span>
                <span class="text-gray-600 dark:text-gray-400 ml-2">${
                  student.department || "Not provided"
                }</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Training Information -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Training Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Program Details</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Industrial Training:</span>
                <span class="font-medium text-gray-900 dark:text-white">${
                  training.title || "N/A"
                }</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Supervisor:</span>
                <span class="font-medium text-gray-900 dark:text-white">${
                  training.supervisor || "Not assigned"
                }</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Department:</span>
                <span class="font-medium text-gray-900 dark:text-white">${
                  training.department || "N/A"
                }</span>
              </div>
            </div>
          </div>
          <div>
            <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Duration</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Start Date:</span>
                <span class="font-medium text-gray-900 dark:text-white">${startDate}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">End Date:</span>
                <span class="font-medium text-gray-900 dark:text-white">${endDate}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Days Remaining:</span>
                <span class="font-medium ${
                  daysRemaining !== null && daysRemaining <= 7
                    ? "text-orange-600"
                    : "text-gray-900 dark:text-white"
                }">
                  ${
                    daysRemaining !== null ? `${daysRemaining} days` : "Not set"
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress Tracking -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Tracking</h3>
        <div class="space-y-4">
          <!-- Overall Progress -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
              <span class="text-sm font-bold text-gray-900 dark:text-white">${progress}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div class="bg-green-500 h-3 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
            </div>
          </div>

          <!-- Milestones (Sample data - replace with real milestones) -->
          <div>
            <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-3">Training Milestones</h4>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">Orientation Completed</span>
                <span class="material-symbols-outlined text-green-500 text-sm">check_circle</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">Technical Training</span>
                <span class="material-symbols-outlined ${
                  progress >= 50 ? "text-green-500" : "text-gray-400"
                } text-sm">
                  ${progress >= 50 ? "check_circle" : "schedule"}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">Project Phase</span>
                <span class="material-symbols-outlined ${
                  progress >= 75 ? "text-green-500" : "text-gray-400"
                } text-sm">
                  ${progress >= 75 ? "check_circle" : "schedule"}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600 dark:text-gray-400">Final Evaluation</span>
                <span class="material-symbols-outlined ${
                  progress === 100 ? "text-green-500" : "text-gray-400"
                } text-sm">
                  ${progress === 100 ? "check_circle" : "schedule"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bench Information -->
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bench Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Current Bench -->
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-blue-700 dark:text-blue-300">Current Bench</h4>
              <span class="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                Coming Soon
              </span>
            </div>
            <p class="text-sm text-blue-600 dark:text-blue-400 mb-3">
              ${this.getCurrentBenchDescription(progress)}
            </p>
            <div class="text-xs text-blue-500 dark:text-blue-400">
              <span class="material-symbols-outlined text-xs mr-1">info</span>
              Feature under development
            </div>
          </div>

          <!-- Next Bench -->
          <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-green-700 dark:text-green-300">Next Bench</h4>
              <span class="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 text-xs rounded-full">
                Coming Soon
              </span>
            </div>
            <p class="text-sm text-green-600 dark:text-green-400 mb-3">
              ${this.getNextBenchDescription(progress)}
            </p>
            <div class="text-xs text-green-500 dark:text-green-400">
              <span class="material-symbols-outlined text-xs mr-1">trending_up</span>
              Planned progression path
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance & Performance -->
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance & Performance</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Attendance Summary -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Attendance Rate</span>
              <span class="material-symbols-outlined text-gray-400 text-sm">calendar_today</span>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">92%</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Based on 45/49 days</p>
          </div>

          <!-- Performance Rating -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Performance</span>
              <span class="material-symbols-outlined text-gray-400 text-sm">star</span>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">4.2/5.0</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Supervisor rating</p>
          </div>

          <!-- Tasks Completed -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks Completed</span>
              <span class="material-symbols-outlined text-gray-400 text-sm">task_alt</span>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">24/30</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Assigned tasks</p>
          </div>
        </div>

        <!-- Recent Activities -->
        <div class="mt-6">
          <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Activities</h4>
          <div class="space-y-3">
            <div class="flex items-center gap-3 text-sm">
              <span class="material-symbols-outlined text-green-500 text-base">check_circle</span>
              <span class="text-gray-600 dark:text-gray-400">Completed project module - 2 days ago</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span class="material-symbols-outlined text-blue-500 text-base">assignment</span>
              <span class="text-gray-600 dark:text-gray-400">Submitted weekly report - 5 days ago</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <span class="material-symbols-outlined text-purple-500 text-base">groups</span>
              <span class="text-gray-600 dark:text-gray-400">Team meeting attended - 1 week ago</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
        <button id="close-profile-btn" class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
          Close
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector("#close-profile");
    const closeProfileBtn = modal.querySelector("#close-profile-btn");

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    closeBtn.addEventListener("click", closeModal);
    closeProfileBtn.addEventListener("click", closeModal);

    // Close when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Helper methods for bench descriptions
  getCurrentBenchDescription(progress) {
    if (progress < 25)
      return "Beginner Level - Learning fundamentals and basic concepts";
    if (progress < 50)
      return "Intermediate Level - Applying knowledge to practical tasks";
    if (progress < 75)
      return "Advanced Level - Working on complex projects independently";
    if (progress < 100)
      return "Expert Level - Mentoring others and handling advanced tasks";
    return "Graduated - Training completed successfully";
  }

  getNextBenchDescription(progress) {
    if (progress < 25)
      return "Move to Intermediate Level - Start practical applications";
    if (progress < 50)
      return "Advance to Advanced Level - Take on complex projects";
    if (progress < 75)
      return "Progress to Expert Level - Begin mentoring responsibilities";
    if (progress < 100)
      return "Prepare for Graduation - Final evaluations and documentation";
    return "Career Placement - Job opportunities and next steps";
  }

  async editProgress(traineeId) {
    //console.log("Edit progress for trainee:", traineeId);

    // Find the trainee data
    const traineeData = this.filteredTrainees.find(
      (trainee) => trainee.id === traineeId
    );

    if (!traineeData) {
      console.error("Trainee not found:", traineeId);
      return;
    }

    const application = traineeData.trainingInfo;
    const student = traineeData.studentInfo || {};

    // Get progress - handle both object and number cases
    let progressValue = 0;
    if (
      typeof traineeData.progress === "object" &&
      traineeData.progress !== null
    ) {
      // If progress is an object, try to get the overall progress
      progressValue = traineeData.progress.overall || 0;
    } else {
      // If progress is a number or undefined
      progressValue = traineeData.progress || 0;
    }

    const currentProgress = Math.round(progressValue);

    // Show progress update dialog
    const newProgress = prompt(
      `Update progress for ${
        student.fullName || "Trainee"
      }:\n\nCurrent progress: ${currentProgress}%\nEnter new progress (0-100):`,
      currentProgress
    );

    if (newProgress !== null) {
      const progressValue = parseInt(newProgress);
      if (!isNaN(progressValue) && progressValue >= 0 && progressValue <= 100) {
        var isUpdated =
          await this.currentStudentService.updateStudentProgressInFirebase(
            traineeId,
            progressValue
          );
        if (isUpdated) {
          this.updateLocalTraineeProgress();
          this.renderTraineesTable();
        }
      } else {
        alert("Please enter a valid progress value between 0 and 100");
      }
    }
  }

  updateLocalTraineeProgress(traineeId, progressValue, notes = "") {
    // Find the trainee in filteredTrainees
    const traineeIndex = this.filteredTrainees.findIndex(
      (t) => t.id === traineeId
    );
    if (traineeIndex !== -1) {
      // Update progress
      this.filteredTrainees[traineeIndex].progress = {
        ...this.filteredTrainees[traineeIndex].progress,
        overall: progressValue,
        lastUpdated: new Date().toISOString(),
      };

      // Add note if provided
      if (notes.trim()) {
        if (!this.filteredTrainees[traineeIndex].progress.notes) {
          this.filteredTrainees[traineeIndex].progress.notes = [];
        }
        this.filteredTrainees[traineeIndex].progress.notes.push({
          note: notes,
          timestamp: new Date().toISOString(),
          type: "progress_update",
        });
      }

      // Also update in currentStudents map if it exists
      if (
        this.currentStudentService &&
        this.currentStudentService.currentStudents
      ) {
        const currentStudent =
          this.currentStudentService.currentStudents.get(traineeId);
        if (currentStudent) {
          currentStudent.progress.overall = progressValue;
          currentStudent.progress.lastUpdated = new Date().toISOString();

          if (notes.trim()) {
            if (!currentStudent.progress.notes) {
              currentStudent.progress.notes = [];
            }
            currentStudent.progress.notes.push({
              note: notes,
              timestamp: new Date().toISOString(),
              type: "progress_update",
            });
          }
        }
      }

      //console.log(`📝 Updated local progress for trainee ${traineeId}`);
    }
  }

  sendMessage(traineeId) {
    //console.log("Send message to trainee:", traineeId);

    // Find the trainee/application data
    const traineeData = this.filteredTrainees.find(
      (trainee) => trainee.id === traineeId
    );

    if (!traineeData) {
      console.error("Trainee not found:", traineeId);
      return;
    }

    const student = traineeData.studentInfo || {};
    const training = traineeData.trainingInfo || {};

    // Open message dialog
    this.messageDialog(
      false, // isBroadcast - set to false for single recipient
      traineeData,
      false
    );
  }

  messageDialog(hideCancel = true, traineeData, fromEdit = true) {
    var currentTrainee = traineeData;
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

    // Get student data from traineeData.studentInfo
    const studentEmail = currentTrainee.studentInfo?.email || "";
    const studentName = currentTrainee.studentInfo?.fullName || "Student";
    const studentUid = currentTrainee.studentInfo?.uid || "";

    // Get training/company data from traineeData.trainingInfo
    const companyName =
      currentTrainee.trainingInfo?.companyName || "Our Company";
    const trainingTitle =
      currentTrainee.trainingInfo?.title || "Industrial Training";

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

    var edit = fromEdit
      ? '<p style="margin: 0 0 20px 0; color: #333;">Kindly leave a note for the student</p>'
      : '<h2 style="margin: 0 0 20px 0; color: #333;">Contact Student</h2>';
    //console.log("from edit is " + fromEdit);

    modal.innerHTML = `
        ${edit}  
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

      <!-- Training Information -->
      <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 4px;">
          <div style="display: flex; justify-content: between; gap: 16px;">
              <div>
                  <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #6c757d;">Training Program</label>
                  <span style="font-weight: 500;">${trainingTitle}</span>
              </div>
              <div>
                  <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #6c757d;">Company</label>
                  <span style="font-weight: 500;">${companyName}</span>
              </div>
          </div>
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

I'd like to schedule a time to discuss your progress in the ${trainingTitle} program at ${companyName}.

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
              <option value="bench_progress">Bench Progress Update</option>
              <option value="attendance_concern">Attendance Concern</option>
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
    const communicationModeRadios = modal.querySelectorAll(
      'input[name="communication-mode"]'
    );
    const templateSelect = modal.querySelector("#message-templates");

    // Message templates - updated for current trainees
    const messageTemplates = {
      progress_check: `Hello {name},

I hope you're doing well with your ${trainingTitle} at ${companyName}. I'd like to check on your progress and see how everything is going.

Could you please provide a brief update on your current tasks, any challenges you're facing, and your overall progress?

Looking forward to hearing from you.

Best regards`,

      meeting_request: `Hello {name},

I'd like to schedule a meeting to discuss your progress in the ${trainingTitle} program and address any questions or concerns you may have.

Please let me know your availability for this week.

Best regards`,

      document_request: `Hello {name},

This is a friendly reminder to submit your required training documents for the ${trainingTitle} program if you haven't already done so.

Please ensure all documents are submitted by the deadline.

Thank you for your cooperation.

Best regards`,

      feedback_request: `Hello {name},

I'd like to get your feedback on the ${trainingTitle} program at ${companyName} so far. Your input is valuable for improving the training experience.

Please share any suggestions, concerns, or feedback you may have about the program.

Best regards`,

      bench_progress: `Hello {name},

I wanted to check on your progress with your current bench level in the ${trainingTitle} program. 

How are you finding the current bench requirements? Do you need any additional support or resources to progress to the next level?

Best regards`,

      attendance_concern: `Hello {name},

I've noticed some concerns with your attendance record in the ${trainingTitle} program. Regular attendance is important for your progress and successful completion of the training.

Please ensure you maintain consistent attendance and inform us in advance if you're unable to attend.

Best regards`,
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
      communicationModeRadios.forEach((radio) => (radio.disabled = disabled));
    };

    // Communication mode change handler
    communicationModeRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.value === "email") {
          emailField.style.display = "block";
          sendNotificationBtn.style.display = "none";
          sendEmailBtn.style.display = "flex";
        } else {
          emailField.style.display = "none";
          sendNotificationBtn.style.display = "flex";
          sendEmailBtn.style.display = "none";
        }
      });
    });

    // Template selection handler
    templateSelect.addEventListener("change", (e) => {
      const template = e.target.value;
      if (template && messageTemplates[template]) {
        messageTextarea.value = messageTemplates[template]
          .replace(/{name}/g, studentNameInput.value)
          .replace(/{training}/g, trainingTitle)
          .replace(/{company}/g, companyName);
      }
    });

    // Only add cancel event listener if cancel button exists
    if (!hideCancel) {
      modal
        .querySelector("#cancel-message")
        .addEventListener("click", closeModal);
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
        if (!studentUid) {
          alert("Student information is missing");
          setNotificationLoadingState(false);
          disableInputs(false);
          return;
        }

        const result = await it_base_companycloud.sendNotificationToStudent(
          studentUid,
          {
            title: `Message from ${companyName} - ${trainingTitle}`,
            message: messageText,
            type: "message",
            timestamp: new Date().toISOString(),
            trainingProgram: trainingTitle,
            company: companyName,
          }
        );

        if (result.success) {
          setTimeout(() => {
            alert(`Notification sent to ${studentName}`);
            closeModal();
          }, 500);
        } else {
          alert(
            "Failed to send notification: " + (result.error || "Unknown error")
          );
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
        const subject = `${trainingTitle} - Message from ${companyName}`;
        const body = messageText;

        // Encode the email parameters
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(body);

        // Create mailto link
        const mailtoLink = `mailto:${studentEmail}?subject=${encodedSubject}&body=${encodedBody}`;

        // Open email client
        window.open(mailtoLink, "_blank");

        // Simulate sending completion
        setTimeout(() => {
          setEmailLoadingState(false);
          disableInputs(false);
          alert(
            `Email opened for ${studentName}. Please send it from your email client.`
          );
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
    sendEmailBtn.style.display = "none"; // Hide email button initially
  }

  exportTrainees() {
    //console.log("Export trainees");
    const traineesToExport = this.filteredTrainees;
    //console.log("Exporting trainees:", traineesToExport);

    if (!traineesToExport || traineesToExport.length === 0) {
      alert("No trainees to export");
      return;
    }

    try {
      // Define CSV headers
      const headers = [
        "Student Name",
        "Email",
        "Training Program",
        "Company",
        "Department",
        "Start Date",
        "End Date",
        "Progress (%)",
        "Current Bench",
        "Next Bench",
        "Attendance Rate (%)",
        "Performance Rating",
        "Status",
      ];

      // Convert trainees data to CSV rows
      const csvRows = traineesToExport.map((trainee) => {
        const studentInfo = trainee.studentInfoInfo || {};
        const trainingInfo = trainee.trainingInfo || {};
        const duration = trainee.duration || {};
        const progress = trainee.progress || {};
        const benchInfo = trainee.benchInfo || {};
        const attendance = trainee.attendance || {};
        const performance = trainee.performance || {};
        const metadata = trainee.metadata || {};

        return [
          this.escapeCsvValue(studentInfo.fullName || ""),
          this.escapeCsvValue(studentInfo.email || ""),
          this.escapeCsvValue(trainingInfo.title || ""),
          this.escapeCsvValue(trainingInfo.companyName || ""),
          this.escapeCsvValue(trainingInfo.department || ""),
          this.formatDateForExport(duration.startDate),
          this.formatDateForExport(duration.endDate),
          progress.overall || 0,
          benchInfo.currentBench || "",
          benchInfo.nextBench || "",
          attendance.attendanceRate || 0,
          performance.rating || 0,
          metadata.status || "active",
        ];
      });

      // Combine headers and rows
      const csvContent = [headers, ...csvRows]
        .map((row) => row.join(","))
        .join("\n");

      // Create and download CSV file
      this.downloadCsv(csvContent, "trainees_export.csv");

      //console.log(`✅ Successfully exported ${traineesToExport.length} trainees to CSV`);
    } catch (error) {
      console.error("❌ Error exporting trainees:", error);
      alert("Error exporting trainees: " + error.message);
    }
  }

  // Helper method to escape CSV values
  escapeCsvValue(value) {
    if (value === null || value === undefined) return "";

    const stringValue = String(value);

    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }

    return stringValue;
  }

  // Helper method to format dates for export
  formatDateForExport(dateValue) {
    if (!dateValue) return "";

    try {
      // If it's already a string in ISO format
      if (typeof dateValue === "string") {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-US");
        }
      }

      // If it's a Firestore timestamp object
      if (dateValue && typeof dateValue === "object" && dateValue.seconds) {
        const date = new Date(dateValue.seconds * 1000);
        return date.toLocaleDateString("en-US");
      }

      return String(dateValue);
    } catch (error) {
      console.warn("Error formatting date for export:", dateValue, error);
      return String(dateValue);
    }
  }

  // Helper method to download CSV file
  downloadCsv(csvContent, filename) {
    // Create blob
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    // Create download link
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  }

  addTrainee() {
    //console.log("Add new trainee");
    // Implement add trainee functionality
  }

  formatForDisplay(isoString) {
    if (!isoString) return "No date set";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  safeConvertDate(date) {
    if (!date) return { iso: null, display: "No date" };

    try {
      let isoString;

      // Your existing conversion logic
      if (date instanceof Date) {
        isoString = date.toISOString();
      } else if (
        date &&
        typeof date === "object" &&
        "seconds" in date &&
        "nanoseconds" in date &&
        typeof date.seconds === "number" &&
        typeof date.nanoseconds === "number" &&
        typeof date.toDate === "function"
      ) {
        // Firestore Timestamp detection
        isoString = date.toDate().toISOString();
      } else if (typeof date === "string" || typeof date === "number") {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          isoString = parsedDate.toISOString();
        }
      }

      if (isoString) {
        const displayDate = new Date(isoString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return {
          iso: isoString, // For storage: "2025-11-13T00:00:00.000Z"
          display: displayDate, // For UI: "November 13, 2025"
        };
      }

      return { iso: null, display: "Invalid date" };
    } catch (error) {
      console.error("Error converting date:", error, date);
      return { iso: null, display: "Error" };
    }
  }
}
