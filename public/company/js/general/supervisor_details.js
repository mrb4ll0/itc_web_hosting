import { SupervisorManagementService } from "./supervisorManagementService.js";

class SupervisorManagementController {
  constructor(supervisorId) {
    this.supervisorId = supervisorId;
    this.managementService = new SupervisorManagementService();
    this.currentSupervisor = null;
    this.assignedStudents = [];
    this.availableStudents = [];
    this.selectedStudents = new Set();
  }

  async init() {
    try {
      this.showLoading(true);

      // Check authentication
      const currentUser = await this.managementService.getCurrentUser();
      if (!currentUser) {
        window.location.href = "/login.html";
        return;
      }

      document.getElementById("userEmail").textContent = currentUser.email;
      this.setupEventListeners();
      await this.loadSupervisorData();
    } catch (error) {
      console.error("Error initializing supervisor management:", error);
      this.showError("Failed to load supervisor management");
    } finally {
      this.showLoading(false);
    }
  }

  setupEventListeners() {
    // Navigation
    document.getElementById("backToDashboard").addEventListener("click", () => {
      window.location.href = "supervisor_management.html";
    });

    // Supervisor actions
    document
      .getElementById("refreshBtn")
      .addEventListener("click", () => this.refreshData());
    document
      .getElementById("activateSupervisorBtn")
      .addEventListener("click", () => this.activateSupervisor());
    document
      .getElementById("deactivateSupervisorBtn")
      .addEventListener("click", () => this.deactivateSupervisor());

    // Student assignment
    document
      .getElementById("assignStudentsBtn")
      .addEventListener("click", () => this.showAssignModal());
    document
      .getElementById("searchStudents")
      .addEventListener("input", (e) =>
        this.filterAvailableStudents(e.target.value)
      );

    // Modal controls
    document
      .getElementById("closeModalBtn")
      .addEventListener("click", () => this.hideAssignModal());
    document
      .getElementById("cancelAssignBtn")
      .addEventListener("click", () => this.hideAssignModal());
    document
      .getElementById("confirmAssignBtn")
      .addEventListener("click", () => this.assignSelectedStudents());

    // Error handling
    document
      .getElementById("retryBtn")
      .addEventListener("click", () => this.init());
  }

  async loadSupervisorData() {
    try {
      // Load supervisor details
      this.currentSupervisor = await this.managementService.getSupervisorById(
        this.supervisorId
      );
      if (!this.currentSupervisor) {
        throw new Error("Supervisor not found");
      }

      // Update UI with supervisor data
      this.updateSupervisorUI();

      // Load students data
      await this.loadStudentsData();

      this.showMainContent();
    } catch (error) {
      console.error("Error loading supervisor data:", error);
      throw error;
    }
  }

  updateSupervisorUI() {
    const supervisor = this.currentSupervisor;

    // Basic info
    document.getElementById("supervisorName").textContent =
      supervisor.displayName || "Supervisor";
    document.getElementById("supervisorEmail").textContent = supervisor.email;

    // Status badge
    const statusBadge = document.getElementById("supervisorStatus");
    if (supervisor.allowed) {
      statusBadge.className =
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      statusBadge.textContent = "Active";
      document.getElementById("activateSupervisorBtn").classList.add("hidden");
      document
        .getElementById("deactivateSupervisorBtn")
        .classList.remove("hidden");
    } else {
      statusBadge.className =
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      statusBadge.textContent = "Pending Activation";
      document
        .getElementById("activateSupervisorBtn")
        .classList.remove("hidden");
      document
        .getElementById("deactivateSupervisorBtn")
        .classList.add("hidden");
    }

    // Stats - Handle null/undefined cases
    const assignedCount = supervisor.students?.length || 0;
    const applicationCount = supervisor.applications?.length || 0;
    const availableSlots = supervisor.availableStudentSlots || 0;
    

    document.getElementById("assignedStudentsCount").textContent =
      assignedCount;
    document.getElementById("activeApplicationsCount").textContent =
      applicationCount;
    document.getElementById("pendingReviewsCount").textContent = "0"; // You can calculate this based on your data
    document.getElementById("availableSlotsCount").textContent = availableSlots;

    // Disable assign button if no available slots
    const assignBtn = document.getElementById("assignStudentsBtn");
    if (availableSlots <= 0) {
      assignBtn.disabled = true;
      assignBtn.classList.add("opacity-50", "cursor-not-allowed");
    } else {
      assignBtn.disabled = false;
      assignBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }

  async loadStudentsData() {
    try {
      // Load assigned students - handle null case
      this.assignedStudents = await this.managementService.getAssignedStudents(
        this.supervisorId
      );
      this.assignedStudents = this.assignedStudents || []; // Ensure it's always an array
      
      this.renderAssignedStudents();

      // Load available students - handle null case
      this.availableStudents =
        await this.managementService.getAvailableStudents();
      this.availableStudents = this.availableStudents || []; // Ensure it's always an array
      this.renderAvailableStudents();
    } catch (error) {
      console.error("Error loading students data:", error);
      // Set empty arrays on error
      this.assignedStudents = [];
      this.availableStudents = [];
      this.renderAssignedStudents();
      this.renderAvailableStudents();
    }
  }

  renderAssignedStudents() {
    const container = document.getElementById("assignedStudentsList");
    const emptyState = document.getElementById("emptyAssignedStudents");

    // Clear container
    container.innerHTML = "";

    // Filter out invalid/null students
    const validStudents = (this.assignedStudents || []).filter(
      (student) => student && student.uid
    );

    // Handle empty case
    if (validStudents.length === 0) {
      container.classList.add("hidden");
      emptyState.classList.remove("hidden");

      const emptyMessage = emptyState.querySelector("p");
      if (this.currentSupervisor && !this.currentSupervisor.allowed) {
        emptyMessage.textContent =
          "Activate supervisor account to assign students.";
      } else {
        emptyMessage.textContent =
          "Assign students to this supervisor to get started.";
      }
      return;
    }

    container.classList.remove("hidden");
    emptyState.classList.add("hidden");


    // Render only valid students
    validStudents.forEach((student) => {
      const studentElement = this.createAssignedStudentElement(student);
      container.appendChild(studentElement);
    });
  }

  renderAvailableStudents() {
    const container = document.getElementById("availableStudentsList");
    const emptyState = document.getElementById("emptyAvailableStudents");

    // Clear container
    container.innerHTML = "";

    // Handle null/empty case
    if (!this.availableStudents || this.availableStudents.length === 0) {
      container.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    // Get assigned student UIDs from the current supervisor
    const assignedStudentUids = new Set();
    if (this.currentSupervisor && this.currentSupervisor.students) {
      this.currentSupervisor.students.forEach((uid) =>
        assignedStudentUids.add(uid)
      );
    }

    // Also include students from the assignedStudents array (for additional safety)
    if (this.assignedStudents && this.assignedStudents.length > 0) {
      this.assignedStudents.forEach((student) => {
        if (student && student.uid) {
          assignedStudentUids.add(student.uid);
        }
      });
    }

    // Remove duplicates and filter out already assigned students
    const availableAndUniqueStudents = this.getUniqueStudents(
      this.availableStudents
    ).filter((student) => {
      if (!student || !student.uid) return false;

      // Check if this student is already assigned to the current supervisor
      const isAlreadyAssigned = assignedStudentUids.has(student.uid);

      if (isAlreadyAssigned) {
      }

      return !isAlreadyAssigned;
    });

    //console.log(`Available students: ${this.availableStudents.length}, After filtering: ${availableAndUniqueStudents.length}`); // DEBUG

    // Check if we have any students left after filtering
    if (availableAndUniqueStudents.length === 0) {
      container.classList.add("hidden");
      emptyState.classList.remove("hidden");

      // Update empty state message
      const emptyMessage = emptyState.querySelector("p");
      if (this.assignedStudents && this.assignedStudents.length > 0) {
        emptyMessage.textContent =
          "All available students are already assigned to this supervisor.";
      } else {
        emptyMessage.textContent = "No students available to assign.";
      }
      return;
    }

    container.classList.remove("hidden");
    emptyState.classList.add("hidden");

    // Safely render available and unique students
    availableAndUniqueStudents.forEach((student) => {
      if (student && student.uid) {
        const studentElement = this.createAvailableStudentElement(student);
        container.appendChild(studentElement);
      }
    });
  }

  getUniqueStudents(students) {
    const uniqueMap = new Map();

    students.forEach((student) => {
      if (student && student.uid) {
        // Use student UID as the key to ensure uniqueness
        if (!uniqueMap.has(student.uid)) {
          uniqueMap.set(student.uid, student);
        }
      }
    });

    return Array.from(uniqueMap.values());
  }
  createAssignedStudentElement(student) {
    const div = document.createElement("div");
    div.className =
      "flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg";

    // Safe property access with fallbacks
    const studentName = student?.fullName || "Unknown Student";
    const studentEmail = student?.email || "No email";
    const studentCompany = student?.courseOfStudy || "Not Specified ";
    const studentId = student?.id || "unknown";

    div.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-sm">person</span>
                </div>
                <div>
                    <h4 class="font-medium text-slate-800 dark:text-slate-100">${studentName}</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400">${studentEmail}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-500">${studentCompany}</p>
                </div>
            </div>
            <div class="flex space-x-2">
                <button class="p-2 text-slate-400 hover:text-red-500 transition-colors remove-student" data-student-id="${studentId}">
                    <span class="material-symbols-outlined text-lg">person_remove</span>
                </button>
            </div>
        `;

    // Add event listener for remove button
    div.querySelector(".remove-student").addEventListener("click", () => {
      this.removeStudentFromSupervisor(student);
    });

    return div;
  }

  createAvailableStudentElement(student) {
    //console.log('students is '+JSON.stringify(student));
    const div = document.createElement("div");
    div.className =
      "flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg";

    // Safe property access with fallbacks
    const studentName = student?.fullName || "Unknown Student";
    const studentEmail = student?.email || "No email";
    const studentId = student?.uid;
    const courseOfStudy = student?.courseOfStudy || "Not specified";

    div.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-sm">person</span>
                </div>
                <div>
                    <h4 class="font-medium text-slate-800 dark:text-slate-100">${studentName}</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400">${studentEmail}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-500">${courseOfStudy}</p>
                </div>
            </div>
            <button class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors assign-student" data-student-id="${studentId}">
                Assign
            </button>
        `;

    // Add event listener for assign button
    div.querySelector(".assign-student").addEventListener("click", () => {
      this.assignStudentToSupervisor(student);
    });

    return div;
  }

  async assignStudentToSupervisor(student) {
    try {
      if (!student || !student.uid) {
        this.showError("Invalid student data");
        return;
      }

      const success = await this.managementService.assignStudentToSupervisor(
        this.supervisorId,
        student.uid
      );

      if (success) {
        const studentName = student?.name || "Student";
        this.showSuccess(`${studentName} assigned successfully`);
        await this.refreshData();
      } else {
        this.showError("Failed to assign student");
      }
    } catch (error) {
      console.error("Error assigning student:", error);
      this.showError("Failed to assign student");
    }
  }

  async removeStudentFromSupervisor(student) {
    try {
      if (!student || !student.uid) {
        this.showError("Invalid student data");
        return;
      }

      const studentName = student?.name || "Student";
      const confirmed = confirm(
        `Are you sure you want to remove ${studentName} from this supervisor?`
      );

      if (!confirmed) return;

      const success = await this.managementService.removeStudentFromSupervisor(
        this.supervisorId,
        student.uid
      );

      if (success) {
        this.showSuccess(`${studentName} removed successfully`);
        await this.refreshData();
      } else {
        this.showError("Failed to remove student");
      }
    } catch (error) {
      console.error("Error removing student:", error);
      this.showError("Failed to remove student");
    }
  }

  async activateSupervisor() {
    try {
      const success = await this.managementService.activateSupervisor(
        this.supervisorId
      );

      if (success) {
        this.showSuccess("Supervisor activated successfully");
        await this.refreshData();
      } else {
        this.showError("Failed to activate supervisor");
      }
    } catch (error) {
      console.error("Error activating supervisor:", error);
      this.showError("Failed to activate supervisor");
    }
  }

  async deactivateSupervisor() {
    try {
      const confirmed = confirm(
        "Are you sure you want to deactivate this supervisor?"
      );

      if (!confirmed) return;

      const success = await this.managementService.deactivateSupervisor(
        this.supervisorId
      );

      if (success) {
        this.showSuccess("Supervisor deactivated successfully");
        await this.refreshData();
      } else {
        this.showError("Failed to deactivate supervisor");
      }
    } catch (error) {
      console.error("Error deactivating supervisor:", error);
      this.showError("Failed to deactivate supervisor");
    }
  }

  showAssignModal() {
    // Check if there are any available students before showing modal
    if (!this.availableStudents || this.availableStudents.length === 0) {
      this.showError("No students available to assign");
      return;
    }

    this.renderModalAvailableStudents();
    document.getElementById("assignStudentsModal").classList.remove("hidden");
  }

  hideAssignModal() {
    document.getElementById("assignStudentsModal").classList.add("hidden");
    this.selectedStudents.clear();
    this.updateSelectedCount();
  }

  renderModalAvailableStudents() {
    const container = document.getElementById("modalAvailableStudents");
    container.innerHTML = "";

    // Handle null/empty case
    if (!this.availableStudents || this.availableStudents.length === 0) {
      container.innerHTML = `
            <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                <span class="material-symbols-outlined text-4xl mb-2">person_off</span>
                <p>No students available</p>
            </div>
        `;
      return;
    }

    // Get assigned student UIDs from the current supervisor
    const assignedStudentUids = new Set();
    if (this.currentSupervisor && this.currentSupervisor.students) {
      this.currentSupervisor.students.forEach((uid) =>
        assignedStudentUids.add(uid)
      );
    }

    // Filter out already assigned students for the modal too
    const availableAndUniqueStudents = this.getUniqueStudents(
      this.availableStudents
    ).filter(
      (student) =>
        student && student.uid && !assignedStudentUids.has(student.uid)
    );

    if (availableAndUniqueStudents.length === 0) {
      container.innerHTML = `
            <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                <span class="material-symbols-outlined text-4xl mb-2">person_off</span>
                <p>All students are already assigned to this supervisor</p>
            </div>
        `;
      return;
    }

    // Safely render available and unique students
    availableAndUniqueStudents.forEach((student) => {
      if (student && student.uid) {
        const studentElement = this.createModalStudentElement(student);
        container.appendChild(studentElement);
      }
    });
  }
  createModalStudentElement(student) {
    const div = document.createElement("div");
    div.className =
      "flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg";

    const isSelected = this.selectedStudents.has(student.uid);
    const studentName = student?.fullName || "Unknown Student";
    const studentEmail = student?.email || "No email";
    const studentId = student?.uid || "unknown";

    div.innerHTML = `
            <div class="flex items-center space-x-3">
                <input type="checkbox" id="student-${studentId}" class="student-checkbox h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-300 dark:border-slate-600 rounded" ${
      isSelected ? "checked" : ""
    }>
                <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-sm">person</span>
                </div>
                <div>
                    <label for="student-${studentId}" class="font-medium text-slate-800 dark:text-slate-100 cursor-pointer">${studentName}</label>
                    <p class="text-sm text-slate-600 dark:text-slate-400">${studentEmail}</p>
                </div>
            </div>
        `;

    // Add event listener for checkbox
    const checkbox = div.querySelector(".student-checkbox");
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        this.selectedStudents.add(studentId);
      } else {
        this.selectedStudents.delete(studentId);
      }
      this.updateSelectedCount();
    });

    return div;
  }

  updateSelectedCount() {
    document.getElementById(
      "selectedCount"
    ).textContent = `${this.selectedStudents.size} students selected`;
  }

  async assignSelectedStudents() {
    if (this.selectedStudents.size === 0) {
      
      this.showDialogError("Please select at least one student");
      setTimeout(() => {
        this.hideDialogError();
      }, 3000);

      return;
    }
    const subbtn = document.getElementById("confirmAssignBtn");
    const originalText = subbtn.textContent;
    subbtn.textContent = "Assigning....";

    try {
      const success =
        await this.managementService.assignMultipleStudentsToSupervisor(
          this.supervisorId,
          Array.from(this.selectedStudents)
        );

      if (success) {
        this.showSuccess(
          `${this.selectedStudents.size} students assigned successfully`
        );
        this.hideAssignModal();
        await this.refreshData();
      } else {
        subbtn.innerText = originalText;
        this.showError("Failed to assign students");
      }
    } catch (error) {
      subbtn.innerText = originalText;
      console.error("Error assigning multiple students:", error);
      this.showError("Failed to assign students");
    }
  }

  filterAvailableStudents(searchTerm) {
    // Handle null case
    if (!this.availableStudents) {
      this.availableStudents = [];
    }

    const filteredStudents = this.availableStudents.filter((student) => {
      if (!student) return false;

      const nameMatch =
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const emailMatch =
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false;
      const companyMatch =
        student.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false;

      return nameMatch || emailMatch || companyMatch;
    });

    this.renderFilteredAvailableStudents(filteredStudents);
  }

  renderFilteredAvailableStudents(students) {
    const container = document.getElementById("availableStudentsList");
    const emptyState = document.getElementById("emptyAvailableStudents");

    container.innerHTML = "";

    if (!students || students.length === 0) {
      container.classList.add("hidden");
      emptyState.classList.remove("hidden");

      // Update empty state message for search results
      const emptyMessage = emptyState.querySelector("p");
      const searchInput = document.getElementById("searchStudents");
      if (searchInput.value.trim()) {
        emptyMessage.textContent = "No students found matching your search.";
      } else {
        emptyMessage.textContent = "No students available to assign.";
      }
      return;
    }

    container.classList.remove("hidden");
    emptyState.classList.add("hidden");

    students.forEach((student) => {
      if (student && student.uid) {
        const studentElement = this.createAvailableStudentElement(student);
        container.appendChild(studentElement);
      }
    });
  }

  async refreshData() {
    try {
      this.showLoading(true);
      await this.loadSupervisorData();
    } catch (error) {
      console.error("Error refreshing data:", error);
      this.showError("Failed to refresh data");
    } finally {
      this.showLoading(false);
    }
  }

  // UI Helper Methods
  showLoading(show) {
    const loadingSection = document.getElementById("loadingSection");
    const mainContent = document.getElementById("mainContent");
    const errorSection = document.getElementById("errorSection");

    if (show) {
      loadingSection.classList.remove("hidden");
      mainContent.classList.add("hidden");
      errorSection.classList.add("hidden");
    } else {
      loadingSection.classList.add("hidden");
    }
  }

  showMainContent() {
    document.getElementById("loadingSection").classList.add("hidden");
    document.getElementById("mainContent").classList.remove("hidden");
    document.getElementById("errorSection").classList.add("hidden");
  }

  showError(message) {
    try {
      document.getElementById("loadingSection").classList.add("hidden");
      document.getElementById("mainContent").classList.add("hidden");
      document.getElementById("errorSection").classList.remove("hidden");
      document.getElementById("errorMessage").textContent = message;
    } catch (error) {
      console.error(error);
    }
  }

  showDialogError(message) {
    try {
      document.getElementById("dialogError").classList.remove("hidden");
      document.getElementById("dialogError").textContent = message;
    } catch (error) {
      console.error(error);
    }
  }
  hideDialogError() {
    try {
      document.getElementById("dialogError").classList.add("hidden");
      
    } catch (error) {
      console.error(error);
    }
  }

  showSuccess(message) {
    // You can implement a toast notification here
    alert(`Success: ${message}`);
  }
}

export { SupervisorManagementController };
