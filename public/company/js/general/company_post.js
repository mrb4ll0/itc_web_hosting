// company-postings.js

import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
import { auth } from "../../../js/config/firebaseInit.js";

class CompanyPostings {
  constructor() {
    this.cloud = new ITBaseCompanyCloud();
    this.currentUser = null;
    this.currentCompany = null;
    this.postings = [];
    this.filteredPostings = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filters = {
      status: "all", // all, active, closed, draft
      sortBy: "date", // date, title, applicants
      searchTerm: "",
    };
    this.init();
  }

  // Add search functionality methods
  attachSearchListener() {
    const searchInput = document.getElementById("search-posting");
    if (!searchInput) return;

    // Search on input with debouncing
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.applySearchFilter(e.target.value);
      }, 300); // 300ms debounce delay
    });

    // Clear search when user clears the input
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        this.applySearchFilter("");
      }
    });
  }

  applySearchFilter(searchTerm) {
    this.filters.searchTerm = searchTerm.toLowerCase().trim();
    this.currentPage = 1;
    this.applyFilters();
  }

  // Update the applyFilters method to include search
  applyFilters() {
    let filtered = this.postings;

    // Apply search filter
    if (this.filters.searchTerm) {
      filtered = filtered.filter(
        (posting) =>
          posting.title.toLowerCase().includes(this.filters.searchTerm) ||
          (posting.department &&
            posting.department
              .toLowerCase()
              .includes(this.filters.searchTerm)) ||
          (posting.location &&
            posting.location.toLowerCase().includes(this.filters.searchTerm))
      );
    }

    // Apply status filter
    if (this.filters.status !== "all") {
      filtered = filtered.filter(
        (posting) => posting.status === this.filters.status
      );
    }

    // Apply sort
    filtered = this.sortPostings(filtered, this.filters.sortBy);

    this.filteredPostings = filtered;
    this.renderTable();
  }

  // Add method to clear all filters
  clearAllFilters() {
    this.filters = {
      status: "all",
      sortBy: "date",
      searchTerm: "",
    };
    this.currentPage = 1;

    // Clear search input
    const searchInput = document.getElementById("search-posting");
    if (searchInput) {
      searchInput.value = "";
    }

    // Reset filter button texts
    const statusBtn = document.querySelector(".status-filter-btn");
    const sortBtn = document.querySelector(".sort-filter-btn");

    if (statusBtn) {
      statusBtn.querySelector("p").textContent = "Status: All";
    }
    if (sortBtn) {
      sortBtn.querySelector("p").textContent = "Sort by: Date";
    }

    this.applyFilters();
  }

  async init() {
    try {
      // Get current user (you'll need to implement this based on your auth system)
      this.currentUser = await this.getCurrentUser();
      if (!this.currentUser) {
        this.showError("Please log in to view your postings");
        return;
      }

      // Get company data
      this.currentCompany = await this.cloud.getCompany(this.currentUser.uid);
      if (!this.currentCompany) {
        this.showError("Company profile not found");
        return;
      }

      this.setCompanyLogo();

      // Load postings data
      await this.loadPostingsData();
    } catch (error) {
      console.error("Error initializing CompanyPostings:", error);
      this.showError("Failed to load postings data");
    }
  }

  setCompanyLogo() {
    const logoElement = document.getElementById("company-logo");
    if (!logoElement || !this.currentCompany) return;

    if (this.currentCompany.logoURL) {
      // Use the logo URL from company data
      logoElement.style.backgroundImage = `url('${this.currentCompany.logoURL}')`;
    } else {
      // Fallback
      this.setDefaultLogo(logoElement);
    }
  }

  async getCurrentUser() {
    await auth.authStateReady();
    return {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
    };
  }

  attachFilterAndSortListeners() {
    // Status filter dropdown
    const statusFilterBtn = document.querySelector(".status-filter-btn");
    const sortFilterBtn = document.querySelector(".sort-filter-btn");

    if (statusFilterBtn) {
      statusFilterBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleStatusDropdown();
      });
    }

    if (sortFilterBtn) {
      sortFilterBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleSortDropdown();
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener("click", () => {
      this.closeAllDropdowns();
    });
  }

  toggleStatusDropdown() {
    this.closeAllDropdowns();

    const statusFilterBtn = document.querySelector(".status-filter-btn");
    const existingDropdown = document.querySelector(".status-dropdown");

    if (existingDropdown) {
      existingDropdown.remove();
      return;
    }

    const dropdown = document.createElement("div");
    dropdown.className =
      "status-dropdown absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1";
    dropdown.innerHTML = `
            <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
              this.filters.status === "all"
                ? "text-primary bg-blue-50 dark:bg-blue-900/20"
                : ""
            }" data-status="all">
                All Statuses
                ${
                  this.filters.status === "all"
                    ? '<span class="material-symbols-outlined text-primary text-lg">check</span>'
                    : ""
                }
            </button>
            <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
              this.filters.status === "Open"
                ? "text-primary bg-blue-50 dark:bg-blue-900/20"
                : ""
            }" data-status="open">
                Open
                ${
                  this.filters.status === "Open"
                    ? '<span class="material-symbols-outlined text-primary text-lg">check</span>'
                    : ""
                }
            </button>
            <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
              this.filters.status === "closed"
                ? "text-primary bg-blue-50 dark:bg-blue-900/20"
                : ""
            }" data-status="closed">
                Closed
                ${
                  this.filters.status === "closed"
                    ? '<span class="material-symbols-outlined text-primary text-lg">check</span>'
                    : ""
                }
            </button>
            <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
              this.filters.status === "draft"
                ? "text-primary bg-blue-50 dark:bg-blue-900/20"
                : ""
            }" data-status="draft">
                Draft
                ${
                  this.filters.status === "draft"
                    ? '<span class="material-symbols-outlined text-primary text-lg">check</span>'
                    : ""
                }
            </button>
        `;

    statusFilterBtn.parentElement.style.position = "relative";
    statusFilterBtn.parentElement.appendChild(dropdown);

    // Add event listeners to dropdown options
    dropdown.querySelectorAll(".status-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const status = e.currentTarget.getAttribute("data-status");
        this.applyStatusFilter(status);
        dropdown.remove();
      });
    });
  }

  toggleSortDropdown() {
    this.closeAllDropdowns();

    const sortFilterBtn = document.querySelector(".sort-filter-btn");
    const existingDropdown = document.querySelector(".sort-dropdown");

    if (existingDropdown) {
      existingDropdown.remove();
      return;
    }

    const dropdown = document.createElement("div");
    dropdown.className =
      "sort-dropdown absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1";
    dropdown.innerHTML = `
            <button class="sort-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
              this.filters.sortBy === "date"
                ? "text-primary bg-blue-50 dark:bg-blue-900/20"
                : ""
            }" data-sort="date">
                Date Posted
                ${
                  this.filters.sortBy === "date"
                    ? '<span class="material-symbols-outlined text-primary text-lg">check</span>'
                    : ""
                }
            </button>
            <button class="sort-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
              this.filters.sortBy === "title"
                ? "text-primary bg-blue-50 dark:bg-blue-900/20"
                : ""
            }" data-sort="title">
                Title
                ${
                  this.filters.sortBy === "title"
                    ? '<span class="material-symbols-outlined text-primary text-lg">check</span>'
                    : ""
                }
            </button>
            <button class="sort-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
              this.filters.sortBy === "applicants"
                ? "text-primary bg-blue-50 dark:bg-blue-900/20"
                : ""
            }" data-sort="applicants">
                Applicants
                ${
                  this.filters.sortBy === "applicants"
                    ? '<span class="material-symbols-outlined text-primary text-lg">check</span>'
                    : ""
                }
            </button>
        `;

    sortFilterBtn.parentElement.style.position = "relative";
    sortFilterBtn.parentElement.appendChild(dropdown);

    // Add event listeners to dropdown options
    dropdown.querySelectorAll(".sort-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();
        const sortBy = e.currentTarget.getAttribute("data-sort");
        this.applySortFilter(sortBy);
        dropdown.remove();
      });
    });
  }

  closeAllDropdowns() {
    const statusDropdown = document.querySelector(".status-dropdown");
    const sortDropdown = document.querySelector(".sort-dropdown");

    if (statusDropdown) statusDropdown.remove();
    if (sortDropdown) sortDropdown.remove();
  }

  applyStatusFilter(status) {
    this.filters.status = status;
    this.currentPage = 1;

    // Update button text
    const statusBtn = document.querySelector(".status-filter-btn");
    const statusText = statusBtn.querySelector("p");

    let displayText = "All";
    if (status === "Open") displayText = "Open";
    else if (status === "closed") displayText = "Closed";
    else if (status === "draft") displayText = "Draft";

    statusText.textContent = `Status: ${displayText}`;

    this.applyFilters();
  }

  applySortFilter(sortBy) {
    this.filters.sortBy = sortBy;
    this.currentPage = 1;

    // Update button text
    const sortBtn = document.querySelector(".sort-filter-btn");
    const sortText = sortBtn.querySelector("p");

    let displayText = "Date";
    if (sortBy === "title") displayText = "Title";
    else if (sortBy === "applicants") displayText = "Applicants";

    sortText.textContent = `Sort by: ${displayText}`;

    this.applyFilters();
  }

  sortPostings(postings, sortBy) {
    const sorted = [...postings];

    switch (sortBy) {
      case "date":
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "applicants":
        sorted.sort((a, b) => b.applicants - a.applicants);
        break;
      default:
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return sorted;
  }

  async loadPostingsData() {
    try {
      // Show loading state
      this.showLoading();

      // Simulate loading delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get all industrial trainings for the company
      const industrialTrainings =
        await this.cloud.getCompanyIndustrialTrainings(this.currentUser.uid);

      // Transform data for table display
      this.postings = await Promise.all(
        industrialTrainings.map(async (it) => {
          const applications =
            await this.cloud.getApplicationsForIndustrialTraining(
              this.currentUser.uid,
              it.id
            );
          const stats = await this.cloud.getApplicationStats(
            this.currentUser.uid,
            it.id
          );

          return {
            id: it.id,
            title: it.title || "Untitled Posting",
            status: it.status || "draft",
            applicants: applications.length,
            startDate: it.startDate || new Date(),
            endDate: it.endDate || new Date(),
            createdAt: it.postedAt || new Date(),
            applicationStats: stats,
            department: it.department || "General",
            location: it.location || "Not specified",
            type: it.type || "Full-time",
          };
        })
      );

      // Sort by creation date (newest first)
      this.postings.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      //  FIX: Initialize filteredPostings with all postings
      this.filteredPostings = [...this.postings];

      //  FIX: Update filter buttons and attach listeners
      this.updateFilterButtons();

      //  FIX: Apply initial filters
      this.applyFilters();

      // Render the table
      this.renderTable();
    } catch (error) {
      console.error("Error loading postings data:", error);
      this.showError("Failed to load postings. Please try again.");
    }
  }

  updateFilterButtons() {
    // Add specific classes to filter buttons for easier selection
    const filterButtons = document.querySelectorAll(".mb-6 .flex.gap-2 button");
    if (filterButtons.length >= 2) {
      filterButtons[0].classList.add("status-filter-btn");
      filterButtons[1].classList.add("sort-filter-btn");
    }

    // ✅ FIX: Attach filter listeners
    this.attachFilterAndSortListeners();

    this.attachSearchListener();
  }

  showLoading() {
    const tbody = document.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-20">
                    <div class="flex flex-col items-center gap-4">
                        <div class="loading-spinner w-12 h-12 border-4 border-blue-200 border-t-primary rounded-full animate-spin"></div>
                        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Loading Your Postings...</h3>
                        <p class="text-gray-500 dark:text-gray-400">Please wait while we load your job postings</p>
                    </div>
                </td>
            </tr>
        `;

    // Hide pagination during loading
    const pagination = document.querySelector(
      'nav[aria-label="Page navigation"]'
    );
    if (pagination) {
      pagination.style.opacity = "0.5";
    }
  }

  renderTable() {
    const tbody = document.querySelector("tbody");
    if (!tbody) return;

    const displayPostings = this.filteredPostings.length > 0 ? this.filteredPostings : this.postings;

    if (displayPostings.length === 0) {
        this.showEmptyState();
        return;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentItems = displayPostings.slice(startIndex, endIndex);

    tbody.innerHTML = currentItems
        .map(
            (posting) => `
            <tr class="bg-white dark:bg-background-dark border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <div class="flex flex-col">
                        <span class="font-semibold">${posting.title}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 mt-1">${posting.department} • ${posting.location}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    ${this.getStatusBadge(posting.status)}
                </td>
                <td class="px-6 py-4 text-gray-700 dark:text-gray-300">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">group</span>
                        <span>${posting.applicants}</span>
                        ${posting.applicationStats && posting.applicationStats.pending > 0
                            ? `
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                ${posting.applicationStats.pending} new
                            </span>
                        `
                            : ""
                        }
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-700 dark:text-gray-300">
                    ${TimestampFormatter.toDateTime(posting.createdAt)}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 group edit-btn" 
                                data-id="${posting.id}" 
                                title="Edit Posting">
                            <span class="material-symbols-outlined text-gray-600 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-primary text-lg">edit</span>
                        </button>
                        <button class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 group view-btn" 
                                data-id="${posting.id}" 
                                title="View Applications">
                            <span class="material-symbols-outlined text-gray-600 dark:text-gray-400 group-hover:text-primary dark:group-hover:text-primary text-lg">visibility</span>
                        </button>
                        <button class="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 group delete-btn" 
                                data-id="${posting.id}" 
                                title="Delete Posting">
                            <span class="material-symbols-outlined text-gray-600 dark:text-gray-400 group-hover:text-red-500 text-lg">delete</span>
                        </button>

                        ${posting.status === 'open' 
                            ? `
                                <button class="p-2 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/50 group close-btn" 
                                        data-id="${posting.id}" 
                                        title="Close Opportunity">
                                    <span class="material-symbols-outlined text-orange-600 dark:text-orange-400 group-hover:text-orange-700 text-lg">lock</span>
                                </button>
                            `
                            : `
                                <button class="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 group open-btn" 
                                        data-id="${posting.id}" 
                                        title="Open Opportunity">
                                    <span class="material-symbols-outlined text-green-600 dark:text-green-400 group-hover:text-green-700 text-lg">lock_open</span>
                                </button>
                            `
                        }
                    </div>
                </td>
            </tr>
        `
        )
        .join("");

    // Show pagination
    const pagination = document.querySelector('nav[aria-label="Page navigation"]');
    if (pagination) {
        pagination.style.opacity = "1";
        this.renderPagination();
    }

    this.attachEventListeners();
}
  getStatusBadge(status) {
    const statusConfig = {
      open: {
        class: "bg-active-green/10 text-active-green",
        dot: "bg-active-green",
        text: "Open",
      },
      open: {
        class: "bg-active-green/10 text-active-green",
        dot: "bg-active-green",
        text: "Open",
      },
      closed: {
        class: "bg-closed-gray/10 text-closed-gray",
        dot: "bg-closed-gray",
        text: "Closed",
      },
      draft: {
        class: "bg-draft-orange/10 text-draft-orange",
        dot: "bg-draft-orange",
        text: "Draft",
      },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return `
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}">
                <span class="w-2 h-2 mr-1.5 ${config.dot} rounded-full"></span>
                ${config.text}
            </span>
        `;
  }

  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startStr = start.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });

    const endStr = end.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return `${startStr} - ${endStr}`;
  }

  showEmptyState() {
    const tbody = document.querySelector("tbody");
    if (!tbody) return;

    let emptyMessage = "";
    let emptyDescription = "";

    if (this.filters.searchTerm || this.filters.status !== "all") {
      // No results for current filters/search
      emptyMessage = "No matching postings found";
      emptyDescription =
        "Try adjusting your search terms or filters to find what you're looking for.";
    } else {
      // No postings at all
      emptyMessage = "No Postings Yet";
      emptyDescription =
        "You haven't created any postings yet. Get started by creating your first one!";
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-20">
                <div class="flex flex-col items-center gap-4">
                    <span class="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">                                                                                                                  
                        ${
                          this.filters.searchTerm ? "search_off" : "description"
                        }
                    </span>
                    <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200">${emptyMessage}</h3>
                    <p class="text-gray-500 dark:text-gray-400 text-center max-w-md">${emptyDescription}</p>
                    ${
                      this.filters.searchTerm || this.filters.status !== "all"
                        ? `
                        <button class="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm clear-filters-btn">
                            Clear Filters
                        </button>
                    `
                        : `
                        <button class="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold h-10 px-5 shadow-sm transition-colors create-posting-btn">
                            <span class="material-symbols-outlined text-xl">add_circle</span>
                            <span class="truncate">Create New Posting</span>
                        </button>
                    `
                    }
                </div>
            </td>
        </tr>
    `;

    this.attachEventListeners();
  }
  showError(message) {
    const tbody = document.querySelector("tbody");
    if (!tbody) return;

    tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-20">
                    <div class="flex flex-col items-center gap-4">
                        <span class="material-symbols-outlined text-6xl text-red-500">error</span>
                        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Failed to Load Postings</h3>
                        <p class="text-gray-500 dark:text-gray-400">${message}</p>
                        <button class="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm retry-btn">
                            Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;

    this.attachEventListeners();
  }

  renderPagination() {
    const totalPages = Math.ceil(this.postings.length / this.itemsPerPage);
    if (totalPages <= 1) {
      const pagination = document.querySelector(
        'nav[aria-label="Page navigation"]'
      );
      if (pagination) {
        pagination.style.display = "none";
      }
      return;
    }

    // You can implement dynamic pagination rendering here
    // For now, it uses the static HTML pagination
  }

  attachEventListeners() {
    // Edit button
    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const postingId = e.currentTarget.getAttribute("data-id");
        this.editPosting(postingId);
      });
    });

    // // Duplicate button
    // document.querySelectorAll(".duplicate-btn").forEach((button) => {
    //   button.addEventListener("click", (e) => {
    //     const postingId = e.currentTarget.getAttribute("data-id");
    //     //this.duplicatePosting(postingId);
    //   });
    // });

    // View applications button
    document.querySelectorAll(".view-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const postingId = e.currentTarget.getAttribute("data-id");
        this.viewApplications(postingId);
      });
    });

    // Delete button
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const postingId = e.currentTarget.getAttribute("data-id");
        this.deletePosting(postingId);
      });
    });

    document.querySelectorAll(".close-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const postingId = e.currentTarget.getAttribute("data-id");
        this.toggleStatus(postingId);
        //console.log("close id  "+postingId);
      });
    });

    document.querySelectorAll(".open-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const postingId = e.currentTarget.getAttribute("data-id");
        this.toggleStatus(postingId);
        //console.log("open id "+postingId);
      });
    });

   


    // Create posting button (empty state)
    const createBtn = document.querySelector(".create-posting-btn");
    if (createBtn) {
      createBtn.addEventListener("click", () => {
        window.location.href = "new_industrial_training.html";
      });
    }

    // Retry button (error state)
    const retryBtn = document.querySelector(".retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        this.loadPostingsData();
      });
    }

    // Clear filters button (filtered empty state)
    const clearFiltersBtn = document.querySelector(".clear-filters-btn");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        this.clearAllFilters();
      });
    }

    // Retry button (error state)
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        this.loadPostingsData();
      });
    }

    // Pagination event listeners
    this.attachPaginationListeners();
  }

     toggleStatus()
     {

     }
  updateResultsCounter() {
    const totalResults = this.filteredPostings.length;
    const totalPostings = this.postings.length;

    // You can add a results counter element to your HTML
    const resultsCounter = document.getElementById("results-counter");
    if (resultsCounter) {
      if (this.filters.searchTerm || this.filters.status !== "all") {
        resultsCounter.textContent = `Showing ${totalResults} of ${totalPostings} postings`;
        resultsCounter.classList.remove("hidden");
      } else {
        resultsCounter.classList.add("hidden");
      }
    }
  }

  // Call this in applyFilters method
  applyFilters() {
    let filtered = this.postings;

    // Apply search filter
    if (this.filters.searchTerm) {
      filtered = filtered.filter(
        (posting) =>
          posting.title.toLowerCase().includes(this.filters.searchTerm) ||
          (posting.department &&
            posting.department
              .toLowerCase()
              .includes(this.filters.searchTerm)) ||
          (posting.location &&
            posting.location.toLowerCase().includes(this.filters.searchTerm))
      );
    }

    // Apply status filter
    if (this.filters.status !== "all") {
      filtered = filtered.filter(
        (posting) => posting.status === this.filters.status
      );
    }

    // Apply sort
    filtered = this.sortPostings(filtered, this.filters.sortBy);

    this.filteredPostings = filtered;

    // Update results counter
    this.updateResultsCounter();

    this.renderTable();
  }

  attachPaginationListeners() {
    // Previous button
    const prevBtn = document.querySelector("nav a:first-child");
    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderTable();
        }
      });
    }

    // Next button
    const nextBtn = document.querySelector("nav a:last-child");
    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const totalPages = Math.ceil(this.postings.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.renderTable();
        }
      });
    }

    // Page number buttons
    document
      .querySelectorAll("nav a:not(:first-child):not(:last-child)")
      .forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          const pageNum = parseInt(e.target.textContent);
          if (!isNaN(pageNum)) {
            this.currentPage = pageNum;
            this.renderTable();
          }
        });
      });
  }

  async editPosting(postingId) {
    //console.log("Edit posting:", postingId);
    // Redirect to edit page or open modal
    window.location.href = `edit_industrial_training.html?id=${postingId}`;
  }

  async viewApplications(postingId) {
    //console.log("View applications for:", postingId);
    // Redirect to applications page
    window.location.href = `it_post_view.html?id=${postingId}`;
  }

  async deletePosting(postingId) {
    if (
      !confirm(
        "Are you sure you want to delete this posting? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await this.cloud.deleteIndustrialTraining(
        this.currentUser.uid,
        postingId
      );

      // Remove from local array
      this.postings = this.postings.filter((p) => p.id !== postingId);

      // Re-render table
      this.renderTable();

      this.showNotification("Posting deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting posting:", error);
      this.showNotification("Failed to delete posting", "error");
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
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
/**
 * Toggle IT status between open and closed
 * @param {string} postingId - The industrial training ID
 */
async toggleStatus(postingId) {
    if (!postingId) {
        console.error("Posting ID is required");
        return;
    }

    try {
        // Show loading state on the button
        const postingRow = document.querySelector(`button[data-id="${postingId}"]`)?.closest('tr');
        if (postingRow) {
            postingRow.style.opacity = '0.6';
            postingRow.style.pointerEvents = 'none';
        }

        // Get the current posting to check its status
        const posting = this.postings.find(p => p.id === postingId);
        if (!posting) {
            throw new Error("Posting not found");
        }

        // Toggle the status using the cloud service
        const newStatus = await this.cloud.toggleITStatus(this.currentUser.uid, postingId);
        
        // Update the local posting data
        posting.status = newStatus;
        
        // Re-render the table to reflect the changes
        this.renderTable();
        
        // Show success notification
        this.showNotification(
            `Posting ${newStatus === 'open' ? 'opened' : 'closed'} successfully!`, 
            "success"
        );

    } catch (error) {
        console.error("Error toggling posting status:", error);
        this.showNotification("Failed to update posting status", "error");
        
        // Reset row state on error
        const postingRow = document.querySelector(`button[data-id="${postingId}"]`)?.closest('tr');
        if (postingRow) {
            postingRow.style.opacity = '1';
            postingRow.style.pointerEvents = 'auto';
        }
    }
}

}

// Initialize the application
window.addEventListener("DOMContentLoaded", () => {
  new CompanyPostings();
});

export { CompanyPostings };

//Date formatter

class TimestampFormatter {
  // Format as relative time (e.g., "2 hours ago")
  static toRelativeTime(timestamp) {
    if (!timestamp) return "N/A";

    const date = timestamp.toDate();
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return this.toShortDate(timestamp);
  }

  // Format as short date: "10/31/2024"
  static toShortDate(timestamp) {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleDateString("en-US");
  }

  // Format as medium date: "Oct 31, 2024"
  static toMediumDate(timestamp) {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Format as long date: "October 31, 2024"
  static toLongDate(timestamp) {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Format with time: "Oct 31, 2024, 3:16 PM"
  static toDateTime(timestamp) {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Format for input fields (YYYY-MM-DD)
  static toInputDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toISOString().split("T")[0];
  }

  // Format for time only: "3:16 PM"
  static toTime(timestamp) {
    if (!timestamp) return "N/A";
    return timestamp.toDate().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Custom format with pattern
  static format(timestamp, format = "medium") {
    const formats = {
      relative: this.toRelativeTime,
      short: this.toShortDate,
      medium: this.toMediumDate,
      long: this.toLongDate,
      datetime: this.toDateTime,
      time: this.toTime,
      input: this.toInputDate,
    };

    const formatter = formats[format] || this.toMediumDate;
    return formatter(timestamp);
  }
}
