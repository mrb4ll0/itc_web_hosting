import { SupervisorFirestore } from "../js/fireabase/supervisorFirestore.js";
import { Supervisor } from "../js/model/supervisorModel.js";

class SupervisorController {
  constructor() {
    this.firestore = new SupervisorFirestore();
    this.currentUser = null;
    this.companyCode = null;
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
    document
      .getElementById("generateCodeBtn")
      .addEventListener("click", () => this.generateCode());

    // Supervisor management
    document
      .getElementById("refreshBtn")
      .addEventListener("click", () => this.refreshSupervisors());
    document
      .getElementById("assignStudentsBtn")
      .addEventListener("click", () => this.showAssignModal());

    // Modal controls
    document
      .getElementById("closeModalBtn")
      .addEventListener("click", () => this.hideAssignModal());
    document
      .getElementById("cancelAssignBtn")
      .addEventListener("click", () => this.hideAssignModal());
    document
      .getElementById("confirmAssignBtn")
      .addEventListener("click", () => this.assignStudents());

    // Assignment type toggle
    document
      .querySelectorAll('input[name="assignmentType"]')
      .forEach((radio) => {
        radio.addEventListener("change", (e) =>
          this.toggleAssignmentType(e.target.value)
        );
      });
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
      const supervisorsGrid = document.getElementById("supervisorsGrid");
      const emptyState = document.getElementById("emptyState");

      supervisorsGrid.innerHTML = "";

      if (supervisors.length === 0) {
        emptyState.classList.remove("hidden");
        supervisorsGrid.classList.add("hidden");
      } else {
        emptyState.classList.add("hidden");
        supervisorsGrid.classList.remove("hidden");

        supervisors.forEach((supervisor) => {
          const supervisorCard = this.createSupervisorCard(supervisor);
          supervisorsGrid.appendChild(supervisorCard);
        });
      }
    } catch (error) {
      console.error("Error loading supervisors:", error);
      this.showError("Failed to load supervisors");
    }
  }

  createSupervisorCard(supervisor) {
    const card = document.createElement("div");
    card.className =
      "bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6";

    // Check if supervisor is allowed/activated
    const isAllowed = supervisor.allowed === true;
    const statusColor = isAllowed ? "bg-green-500" : "bg-amber-500";
    const statusText = isAllowed ? "Active" : "Action Needed";

    card.innerHTML = `
        <div class="flex items-center space-x-4 mb-4">
            <div class="w-12 h-12 ${statusColor} rounded-full flex items-center justify-center">
                <span class="material-symbols-outlined text-white">${
                  isAllowed ? "person" : "warning"
                }</span>
            </div>
            <div class="flex-1">
                <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-slate-800 dark:text-slate-100">${
                      supervisor.displayName || "Supervisor"
                    }</h3>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isAllowed
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                    }">
                        ${statusText}
                    </span>
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400">${
                  supervisor.email
                }</p>
                ${
                  !isAllowed
                    ? `
                    <p class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Account pending activation
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
              !isAllowed
                ? `
                <div class="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                    <span class="text-amber-600 dark:text-amber-400 text-xs">Status:</span>
                    <span class="text-amber-600 dark:text-amber-400 text-xs font-medium">Pending Activation</span>
                </div>
            `
                : ""
            }
        </div>
        <div class="mt-4 flex space-x-2">
            ${
              isAllowed
                ? `
                <button class="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors manage-supervisor" data-supervisor-id="${supervisor.id}">
                    Manage
                </button>
                <button class="px-3 py-2 bg-slate-500 hover:bg-slate-600 text-white text-sm rounded transition-colors more-actions" data-supervisor-id="${supervisor.id}">
                    <span class="material-symbols-outlined text-sm">more_vert</span>
                </button>
            `
                : `
                <button class="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded transition-colors activate-supervisor" data-supervisor-id="${supervisor.id}">
                    Activate Account
                </button>
                <button class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors reject-supervisor" data-supervisor-id="${supervisor.id}">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            `
            }
        </div>
    `;

    // Add event listeners based on supervisor status
    this.attachSupervisorCardListeners(card, supervisor, isAllowed);

    return card;
  }

  attachSupervisorCardListeners(card, supervisor, isAllowed) {
    if (isAllowed) {
      // Active supervisor actions
      card
        .querySelector(".manage-supervisor")
        .addEventListener("click", () => this.manageSupervisor(supervisor));
      card
        .querySelector(".more-actions")
        .addEventListener("click", () =>
          this.showSupervisorActions(supervisor)
        );
    } else {
      // Pending supervisor actions
      card
        .querySelector(".activate-supervisor")
        .addEventListener("click", () => this.activateSupervisor(supervisor));
      card
        .querySelector(".reject-supervisor")
        .addEventListener("click", () => this.rejectSupervisor(supervisor));
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

showSupervisorActions(supervisor) {
    console.log("Showing actions for supervisor:", supervisor);
    
    // Create and show actions dropdown menu
    this.createActionsDropdown(supervisor);
}

createActionsDropdown(supervisor) {
    // Remove existing dropdown if any
    const existingDropdown = document.querySelector('.supervisor-actions-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'supervisor-actions-dropdown fixed z-50 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none';
    dropdown.style.position = 'absolute';
    
    const isActive = supervisor.allowed === true;
    
    dropdown.innerHTML = `
        <div class="py-1" role="none">
            ${!isActive ? `
                <button class="action-activate flex items-center w-full px-4 py-2 text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900">
                    <span class="material-symbols-outlined text-sm mr-3">check_circle</span>
                    Activate Account
                </button>
            ` : `
                <button class="action-deactivate flex items-center w-full px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900">
                    <span class="material-symbols-outlined text-sm mr-3">pause_circle</span>
                    Deactivate Account
                </button>
            `}
            
            <button class="action-manage flex items-center w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900">
                <span class="material-symbols-outlined text-sm mr-3">manage_accounts</span>
                Manage Students
            </button>
            
            <button class="action-view flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <span class="material-symbols-outlined text-sm mr-3">visibility</span>
                View Details
            </button>
            
            <button class="action-email flex items-center w-full px-4 py-2 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900">
                <span class="material-symbols-outlined text-sm mr-3">mail</span>
                Send Email
            </button>
            
            ${isActive ? `
                <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                <button class="action-reassign flex items-center w-full px-4 py-2 text-sm text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900">
                    <span class="material-symbols-outlined text-sm mr-3">swap_horiz</span>
                    Reassign All Students
                </button>
            ` : ''}
            
            <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
            <button class="action-remove flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900">
                <span class="material-symbols-outlined text-sm mr-3">delete</span>
                Remove Supervisor
            </button>
        </div>
    `;

    // Add event listeners
    this.attachActionListeners(dropdown, supervisor);

    // Position and show dropdown
    this.positionDropdown(dropdown);
    document.body.appendChild(dropdown);

    // Close dropdown when clicking outside
    this.setupDropdownCloseHandler(dropdown);
}

attachActionListeners(dropdown, supervisor) {
    const isActive = supervisor.allowed === true;

    // Activate/Deactivate
    if (!isActive) {
        dropdown.querySelector('.action-activate').addEventListener('click', () => {
            this.activateSupervisor(supervisor);
            dropdown.remove();
        });
    } else {
        dropdown.querySelector('.action-deactivate').addEventListener('click', () => {
            this.deactivateSupervisor(supervisor);
            dropdown.remove();
        });
    }

    // Manage Students
    dropdown.querySelector('.action-manage').addEventListener('click', () => {
        this.manageSupervisor(supervisor);
        dropdown.remove();
    });

    // View Details
    dropdown.querySelector('.action-view').addEventListener('click', () => {
        this.viewSupervisorDetails(supervisor);
        dropdown.remove();
    });

    // Send Email
    dropdown.querySelector('.action-email').addEventListener('click', () => {
        this.emailSupervisor(supervisor);
        dropdown.remove();
    });

    // Reassign Students (only for active supervisors)
    if (isActive) {
        dropdown.querySelector('.action-reassign').addEventListener('click', () => {
            this.reassignAllStudents(supervisor);
            dropdown.remove();
        });
    }

    // Remove Supervisor
    dropdown.querySelector('.action-remove').addEventListener('click', () => {
        this.removeSupervisor(supervisor);
        dropdown.remove();
    });
}

positionDropdown(dropdown) {
    // Get the position of the more_vert button that was clicked
    const moreButton = document.querySelector(`.more-actions[data-supervisor-id="${supervisor.id}"]`);
    if (moreButton) {
        const rect = moreButton.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        dropdown.style.left = `${rect.left + window.scrollX - 200}px`; // Adjust positioning
    }
}

setupDropdownCloseHandler(dropdown) {
    const closeHandler = (event) => {
        if (!dropdown.contains(event.target) && !event.target.closest('.more-actions')) {
            dropdown.remove();
            document.removeEventListener('click', closeHandler);
        }
    };

    // Close on outside click after a small delay to allow for the current click to register
    setTimeout(() => {
        document.addEventListener('click', closeHandler);
    }, 100);
}

// Additional action methods
async activateSupervisor(supervisor) {
    try {
        console.log('Activating supervisor:', supervisor.id);
        
        const confirmed = confirm(`Are you sure you want to activate ${supervisor.displayName}? This will allow them full access to the system.`);
        
        if (!confirmed) return;

        const success = await this.firestore.activateSupervisorAccount(supervisor.id);
        
        if (success) {
            this.showSuccess(`Supervisor ${supervisor.displayName} activated successfully`);
            await this.refreshSupervisors();
        } else {
            this.showError('Failed to activate supervisor account');
        }

    } catch (error) {
        console.error('Error activating supervisor:', error);
        this.showError('Failed to activate supervisor account');
    }
}

async deactivateSupervisor(supervisor) {
    try {
        console.log('Deactivating supervisor:', supervisor.id);
        
        const confirmed = confirm(`Are you sure you want to deactivate ${supervisor.displayName}? They will lose access to the system.`);
        
        if (!confirmed) return;

        const success = await this.firestore.deactivateSupervisorAccount(supervisor.id);
        
        if (success) {
            this.showSuccess(`Supervisor ${supervisor.displayName} deactivated successfully`);
            await this.refreshSupervisors();
        } else {
            this.showError('Failed to deactivate supervisor account');
        }

    } catch (error) {
        console.error('Error deactivating supervisor:', error);
        this.showError('Failed to deactivate supervisor account');
    }
}

viewSupervisorDetails(supervisor) {
    console.log('Viewing supervisor details:', supervisor);
    
    // Create and show a details modal
    this.showSupervisorDetailsModal(supervisor);
}

showSupervisorDetailsModal(supervisor) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
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
                    <div class="w-16 h-16 ${supervisor.allowed ? 'bg-green-500' : 'bg-amber-500'} rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-2xl">person</span>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold text-slate-800 dark:text-slate-100">${supervisor.displayName || 'Supervisor'}</h4>
                        <p class="text-slate-600 dark:text-slate-400">${supervisor.email}</p>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${supervisor.allowed ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'}">
                            ${supervisor.allowed ? 'Active' : 'Pending Activation'}
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Student Capacity</label>
                        <p class="text-slate-800 dark:text-slate-200">${supervisor.studentCount} / ${supervisor.maxStudents}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Application Capacity</label>
                        <p class="text-slate-800 dark:text-slate-200">${supervisor.applicationCount} / ${supervisor.maxApplications}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Created</label>
                        <p class="text-slate-800 dark:text-slate-200">${supervisor.createdAt ? supervisor.createdAt.toLocaleDateString() : 'Unknown'}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-slate-600 dark:text-slate-400">Last Login</label>
                        <p class="text-slate-800 dark:text-slate-200">${supervisor.lastLogin ? supervisor.lastLogin.toLocaleDateString() : 'Never'}</p>
                    </div>
                </div>

                ${supervisor.activatedAt ? `
                    <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4">
                        <div class="flex items-center">
                            <span class="material-symbols-outlined text-green-500 mr-2">check_circle</span>
                            <span class="text-green-800 dark:text-green-300 text-sm">Activated on ${supervisor.activatedAt.toLocaleDateString()}</span>
                        </div>
                    </div>
                ` : ''}

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
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => modal.remove());
    });

    modal.querySelector('.manage-from-modal').addEventListener('click', () => {
        modal.remove();
        this.manageSupervisor(supervisor);
    });

    document.body.appendChild(modal);
}

emailSupervisor(supervisor) {
    console.log('Emailing supervisor:', supervisor);
    const subject = encodeURIComponent('IT Connect - Supervisor Account');
    const body = encodeURIComponent(`Hello ${supervisor.displayName},\n\n`);
    window.location.href = `mailto:${supervisor.email}?subject=${subject}&body=${body}`;
}

async reassignAllStudents(supervisor) {
    try {
        if (supervisor.studentCount === 0) {
            this.showError('No students to reassign');
            return;
        }

        const confirmed = confirm(`Are you sure you want to reassign all ${supervisor.studentCount} students from ${supervisor.displayName}? This will remove all current assignments.`);
        
        if (!confirmed) return;

        const success = await this.firestore.reassignAllStudents(supervisor.id);
        
        if (success) {
            this.showSuccess(`All students reassigned from ${supervisor.displayName}`);
            await this.refreshSupervisors();
        } else {
            this.showError('Failed to reassign students');
        }

    } catch (error) {
        console.error('Error reassigning students:', error);
        this.showError('Failed to reassign students');
    }
}

async removeSupervisor(supervisor) {
    try {
        const confirmed = confirm(`Are you sure you want to remove ${supervisor.displayName}? This action cannot be undone and will remove all their assignments.`);
        
        if (!confirmed) return;

        const reason = prompt('Please provide a reason for removal (optional):');
        
        const success = await this.firestore.removeSupervisor(supervisor.id, reason);
        
        if (success) {
            this.showSuccess(`Supervisor ${supervisor.displayName} removed successfully`);
            await this.refreshSupervisors();
        } else {
            this.showError('Failed to remove supervisor');
        }

    } catch (error) {
        console.error('Error removing supervisor:', error);
        this.showError('Failed to remove supervisor');
    }
}
  showAssignModal() {
    document.getElementById("assignStudentsModal").classList.remove("hidden");
  }

  hideAssignModal() {
    document.getElementById("assignStudentsModal").classList.add("hidden");
  }

  toggleAssignmentType(type) {
    const manualAssignment = document.getElementById("manualAssignment");
    if (type === "manual") {
      manualAssignment.classList.remove("hidden");
    } else {
      manualAssignment.classList.add("hidden");
    }
  }

  async assignStudents() {
    try {
      const assignmentType = document.querySelector(
        'input[name="assignmentType"]:checked'
      ).value;

      if (assignmentType === "random") {
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
    document.getElementById("codeGenerationSection").classList.add("hidden");
    document.getElementById("generatedCodeSection").classList.add("hidden");
    document.getElementById("supervisorKeySection").classList.add("hidden");
    document.getElementById("supervisorsSection").classList.add("hidden");
    document.getElementById("loadingSection").classList.add("hidden");
  }

  showCodeGenerationSection() {
    this.hideAllSections();
    document.getElementById("codeGenerationSection").classList.remove("hidden");
  }

  showGeneratedCodeSection() {
    document.getElementById("generatedCodeSection").classList.remove("hidden");
  }

  hideCodeGenerationSection() {
    document.getElementById("codeGenerationSection").classList.add("hidden");
  }

  showLoading(show) {
    if (show) {
      this.hideAllSections();
      document.getElementById("loadingSection").classList.remove("hidden");
    } else {
      document.getElementById("loadingSection").classList.add("hidden");
    }
  }

  showError(message) {
    // Implement toast or alert notification
    alert(`Error: ${message}`);
  }

  showSuccess(message) {
    // Implement toast notification
    alert(`Success: ${message}`);
  }
}

export { SupervisorController };

document.addEventListener("DOMContentLoaded", async () => {
  const controller = new SupervisorController();
  await controller.init();
});
