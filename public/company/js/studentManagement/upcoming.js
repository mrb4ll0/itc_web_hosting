import {
  generateShareableUrl,
  getAvatarInitials,
  hideLoadingDialog,
  removeNotification,
  showLoadingDialog,
  showNotification,
  updateNotification,
} from "../../../js/general/generalmethods.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
const it_base_companycloud = new ITBaseCompanyCloud();

export default class UpcomingTraining {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.name = "UpcomingTraining";
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filteredUpcoming = [];
  }

  async init() {
    console.log("Initializing Upcoming Training Tab");
    this.initializeElements();
    this.initializeEventListeners();
    await this.buildUpcomingContent();
  }

  refresh(tabManager) {
    this.tabManager = tabManager;
    this.buildUpcomingContent();
  }

  initializeElements() {
    // Table and pagination elements
    this.upcomingTableBody = document.getElementById("upcoming-table-body");
    this.exportBtn = document.getElementById("export-upcoming-btn");
    this.scheduleTrainingBtn = document.getElementById("schedule-training-btn");

    // Stats elements
    this.totalUpcomingCount = document.getElementById("total-upcoming-count");
    this.startingThisMonthCount = document.getElementById(
      "starting-this-month-count"
    );
    this.startingNextWeekCount = document.getElementById(
      "starting-next-week-count"
    );
    this.needPreparationCount = document.getElementById(
      "need-preparation-count"
    );

    // Pagination elements
    this.prevPageBtn = document.getElementById("upcoming-prev-page");
    this.nextPageBtn = document.getElementById("upcoming-next-page");
    this.paginationNumbers = document.getElementById(
      "upcoming-pagination-numbers"
    );
    this.paginationStart = document.getElementById("upcoming-pagination-start");
    this.paginationEnd = document.getElementById("upcoming-pagination-end");
    this.paginationTotal = document.getElementById("upcoming-pagination-total");

    // Preparation sections
    this.startingSoonList = document.getElementById("starting-soon-list");
    this.startingSoonCount = document.getElementById("starting-soon-count");
    this.preparationNeededList = document.getElementById(
      "preparation-needed-list"
    );
    this.preparationNeededCount = document.getElementById(
      "preparation-needed-count"
    );
    this.monthlySchedule = document.getElementById("monthly-schedule");
    this.sendGeneralNotificationBtn = document.getElementById(
      "send-general-notification"
    );
    this.sendCustomNotificationBtn = document.getElementById(
      "send-custom-notification"
    );

    console.log("Upcoming Training elements initialized");
  }

  initializeEventListeners() {
    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        this.exportUpcoming();
      });
    }

    // Schedule training button
    if (this.scheduleTrainingBtn) {
      this.scheduleTrainingBtn.addEventListener("click", () => {
        this.scheduleTraining();
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

     if (this.sendGeneralNotificationBtn) {
        this.sendGeneralNotificationBtn.addEventListener("click", () => {
            this.sendGeneralNotification();
        });
    }
    
    // Custom notification button
    if (this.sendCustomNotificationBtn) {
        this.sendCustomNotificationBtn.addEventListener("click", () => {
            this.openCustomNotificationModal();
        });
    }

  }

  async sendGeneralNotification() {
    if (this.filteredUpcoming.length === 0) {
        showNotification("No upcoming trainees to notify", "warning");
        return;
    }
    
    const loadingNotification = showNotification(
        `Sending general notification to ${this.filteredUpcoming.length} trainees...`,
        'loading',
        0
    );
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        // Send notification to each trainee
        for (const trainee of this.filteredUpcoming) {
            try {
                const studentId = trainee.application.student.uid;
                const studentName = trainee.application.student.fullName;
                const opportunityTitle = trainee.opportunity?.title || "Industrial Training";
                const startDate = trainee.application.duration?.startDate;
                
                const formattedStartDate = startDate ? 
                    new Date(startDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }) : 'soon';
                
                const notificationData = {
                    title: "Upcoming Training Reminder",
                    message: `This is a friendly reminder that your ${opportunityTitle} is scheduled to start on ${formattedStartDate}. Please ensure you're prepared for your training session.`,
                    type: "general_reminder",
                    status: "unread",
                    applicationId: trainee.application.id,
                    companyName: trainee.training?.company?.name || "Our Company",
                    reminderType: "general",
                    scheduledDate: startDate || null,
                    opportunityTitle: opportunityTitle,
                    studentName: studentName
                };
                
                await it_base_companycloud.sendNotificationToStudent(studentId, notificationData);
                successCount++;
                
                // Small delay to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Failed to send notification to ${trainee.application.student.fullName}:`, error);
                errorCount++;
            }
        }
        
        // Update notification with results
        updateNotification(
            loadingNotification,
            `General notification sent! Success: ${successCount}, Failed: ${errorCount}`,
            successCount > 0 ? 'success' : 'error'
        );
        
        setTimeout(() => {
            removeNotification(loadingNotification);
        }, 5000);
        
    } catch (error) {
        console.error("Error sending general notification:", error);
        updateNotification(
            loadingNotification,
            `Failed to send general notification: ${error.message}`,
            'error'
        );
        setTimeout(() => removeNotification(loadingNotification), 5000);
    }
}

openCustomNotificationModal() {
    if (this.filteredUpcoming.length === 0) {
        showNotification("No upcoming trainees to notify", "warning");
        return;
    }
    
    const modalHTML = `
    <div id="customNotificationModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 max-w-2xl">
            <div class="flex justify-between items-center pb-3">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Send Custom Notification</h3>
                <button class="close-custom-notification-modal text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="mt-4">
                <form id="customNotificationForm">
                    <div class="space-y-4">
                        <!-- Recipient Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Send To
                            </label>
                            <select id="notificationRecipient" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                                <option value="all">All Upcoming Trainees (${this.filteredUpcoming.length})</option>
                                ${this.filteredUpcoming.map(trainee => 
                                    `<option value="${trainee.application.id}">${trainee.application.student.fullName}</option>`
                                ).join('')}
                            </select>
                        </div>

                        <!-- Notification Title -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Title *
                            </label>
                            <input 
                                type="text" 
                                id="notificationTitle"
                                required
                                placeholder="Enter notification title"
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                value="Training Update"
                            >
                        </div>

                        <!-- Notification Message -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Message *
                            </label>
                            <textarea 
                                id="notificationMessage"
                                rows="4"
                                required
                                placeholder="Enter your notification message here..."
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            ></textarea>
                        </div>

                        <!-- Notification Type -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Notification Type
                            </label>
                            <select id="notificationType" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                                <option value="general">General</option>
                                <option value="reminder">Reminder</option>
                                <option value="update">Update</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <button 
                            type="button" 
                            class="cancel-custom-notification px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            class="send-custom-notification px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            Send Notification
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    this.initializeCustomNotificationModal();
}

// Initialize custom notification modal
initializeCustomNotificationModal() {
    const modal = document.getElementById("customNotificationModal");
    
    document.getElementById("customNotificationForm").addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendCustomNotification();
    });
    
    // Close modal events
    document.querySelector(".close-custom-notification-modal").addEventListener("click", () => {
        this.closeCustomNotificationModal();
    });
    
    document.querySelector(".cancel-custom-notification").addEventListener("click", () => {
        this.closeCustomNotificationModal();
    });
    
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            this.closeCustomNotificationModal();
        }
    });
}

// Close custom notification modal
closeCustomNotificationModal() {
    const modal = document.getElementById("customNotificationModal");
    if (modal) {
        modal.remove();
    }
}

// Send custom notification
async sendCustomNotification() {
    const recipient = document.getElementById("notificationRecipient").value;
    const title = document.getElementById("notificationTitle").value;
    const message = document.getElementById("notificationMessage").value;
    const type = document.getElementById("notificationType").value;
    
    if (!title || !message) {
        showNotification("Please fill in all required fields", "error");
        return;
    }
    
    const loadingNotification = showNotification("Sending custom notification...", "loading", 0);
    
    try {
        let traineesToNotify = [];
        
        if (recipient === "all") {
            traineesToNotify = this.filteredUpcoming;
        } else {
            const trainee = this.filteredUpcoming.find(t => t.application.id === recipient);
            if (trainee) {
                traineesToNotify = [trainee];
            }
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const trainee of traineesToNotify) {
            try {
                const studentId = trainee.application.student.uid;
                
                const notificationData = {
                    title: title,
                    message: message,
                    type: type,
                    status: "unread",
                    applicationId: trainee.application.id,
                    companyName: trainee.training?.company?.name || "Our Company",
                    reminderType: "custom",
                    scheduledDate: trainee.application.duration?.startDate || null,
                    opportunityTitle: trainee.opportunity?.title || "Industrial Training",
                    studentName: trainee.application.student.fullName
                };
                
                await it_base_companycloud.sendNotificationToStudent(studentId, notificationData);
                successCount++;
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Failed to send custom notification to ${trainee.application.student.fullName}:`, error);
                errorCount++;
            }
        }
        
        this.closeCustomNotificationModal();
        
        updateNotification(
            loadingNotification,
            `Custom notification sent! Success: ${successCount}, Failed: ${errorCount}`,
            successCount > 0 ? 'success' : 'error'
        );
        
        setTimeout(() => removeNotification(loadingNotification), 5000);
        
    } catch (error) {
        console.error("Error sending custom notification:", error);
        updateNotification(
            loadingNotification,
            `Failed to send custom notification: ${error.message}`,
            'error'
        );
        setTimeout(() => removeNotification(loadingNotification), 5000);
    }
}

  async buildUpcomingContent() {
    console.log("Building upcoming training content...");

    const upcomingTrainees =
      this.tabManager.getTrainingStudentsByDate("upcoming");
    this.filteredUpcoming = this.applyFilters(upcomingTrainees);

    this.updateStats();
    this.renderUpcomingTable();
    this.updatePagination();
    this.renderStartingSoon();
    this.renderPreparationNeeded();
    this.renderMonthlySchedule();
  }

  applyFilters(upcoming) {
    const filters = this.tabManager.currentFilters || {};
    let filtered = [...upcoming];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter((trainee) => {
        const student = trainee.application.student || {};
        const opportunity = trainee.opportunity || {};

        return (
          (student.name || "").toLowerCase().includes(searchTerm) ||
          (student.email || "").toLowerCase().includes(searchTerm) ||
          (opportunity.course || "").toLowerCase().includes(searchTerm) ||
          (opportunity.institution || "").toLowerCase().includes(searchTerm)
        );
      });
    }

    return filtered;
  }

  updateStats() {
    const now = new Date();
    const totalUpcoming = this.filteredUpcoming.length;

    // Calculate various stats
    const startingThisMonth = this.filteredUpcoming.filter((trainee) => {
      const startDate = trainee.application.duration?.startDate
        ? new Date(trainee.application.duration.startDate)
        : null;
      if (!startDate) return false;

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return startDate >= startOfMonth && startDate <= endOfMonth;
    }).length;

    const startingNextWeek = this.filteredUpcoming.filter((trainee) => {
      const startDate = trainee.application.duration?.startDate
        ? new Date(trainee.application.duration.startDate)
        : null;
      if (!startDate) return false;

      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      const endOfNextWeek = new Date(nextWeek);
      endOfNextWeek.setDate(nextWeek.getDate() + 7);

      return startDate >= nextWeek && startDate <= endOfNextWeek;
    }).length;

    const needPreparation = this.filteredUpcoming.filter((trainee) => {
      const startDate = trainee.application.duration?.startDate
        ? new Date(trainee.application.duration.startDate)
        : null;
      if (!startDate) return false;

      const daysUntilStart = Math.ceil(
        (startDate - now) / (1000 * 60 * 60 * 24)
      );
      return daysUntilStart <= 14; // Need preparation if starting within 2 weeks
    }).length;

    // Update DOM
    if (this.totalUpcomingCount) {
      this.totalUpcomingCount.textContent = totalUpcoming;
    }
    if (this.startingThisMonthCount) {
      this.startingThisMonthCount.textContent = startingThisMonth;
    }
    if (this.startingNextWeekCount) {
      this.startingNextWeekCount.textContent = startingNextWeek;
    }
    if (this.needPreparationCount) {
      this.needPreparationCount.textContent = needPreparation;
    }
  }

  renderUpcomingTable() {
    if (!this.upcomingTableBody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentUpcoming = this.filteredUpcoming.slice(startIndex, endIndex);

    this.upcomingTableBody.innerHTML = "";

    if (currentUpcoming.length === 0) {
      this.upcomingTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <div class="flex flex-col items-center">
              <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">event_upcoming</span>
              <p class="text-lg font-medium mb-1">No upcoming training sessions</p>
              <p class="text-sm">All scheduled upcoming training will appear here</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    currentUpcoming.forEach((traineeData, index) => {
      const row = this.createUpcomingRow(traineeData, startIndex + index);
      this.upcomingTableBody.appendChild(row);
    });
  }

  createUpcomingRow(traineeData, index) {
    const row = document.createElement("tr");
    row.className = "hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors";

    const application = traineeData.application;
    console.log("application id is " + application.id);
    const student = application.student || {};
    const opportunity = traineeData.opportunity || {};
    const duration = application.duration || {};
    console.log("application is " + JSON.stringify(opportunity));

    const startDate = duration.startDate ? new Date(duration.startDate) : null;
    const endDate = duration.endDate ? new Date(duration.endDate) : null;

    const formattedStartDate = startDate
      ? startDate.toLocaleDateString()
      : "Not scheduled";
    const formattedEndDate = endDate
      ? endDate.toLocaleDateString()
      : "Not specified";

    // Calculate days until start and duration
    const now = new Date();
    const daysUntilStart = startDate
      ? Math.ceil((startDate - now) / (1000 * 60 * 60 * 24))
      : null;
    const durationDays =
      startDate && endDate
        ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        : null;

    const statusConfig = this.getStatusConfig(daysUntilStart);

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
          opportunity || "N/A"
        }</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-white">${
          student.institution || "N/A"
        }</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${formattedStartDate}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium ${
          daysUntilStart !== null
            ? daysUntilStart <= 7
              ? "text-orange-600 dark:text-orange-400"
              : daysUntilStart <= 30
              ? "text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
            : "text-gray-400 dark:text-gray-500"
        }">
          ${
            daysUntilStart !== null ? `${daysUntilStart} days` : "Not scheduled"
          }
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${durationDays ? `${durationDays} days` : "Not specified"}
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
  <button title="View Details" class="view-upcoming text-primary hover:text-blue-700 transition-colors" data-trainee-id="${
    application.id
  }">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
    </svg>
  </button>
  <button title="reschedule training" class="reschedule-training text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors" data-trainee-id="${
    application.id
  }">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
    </svg>
  </button>
  <button title="send reminder" class="send-reminder text-green-600 hover:text-green-800 transition-colors" data-trainee-id="${
    application.id
  }">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
    </svg>
  </button>
  <button title="cancel training" class="hidden cancel-training text-red-600 hover:text-red-800 transition-colors" data-trainee-id="${
    application.id
  }">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
    </svg>
  </button>
</div>
      </td>
    `;

    this.attachUpcomingEventListeners(row, application.id, traineeData);
    return row;
  }

  getStatusConfig(daysUntilStart) {
    if (daysUntilStart === null) {
      return {
        class: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        text: "Not Scheduled",
        icon: "schedule",
      };
    } else if (daysUntilStart <= 3) {
      return {
        class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        text: "Starting Soon",
        icon: "warning",
      };
    } else if (daysUntilStart <= 7) {
      return {
        class:
          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        text: "Next Week",
        icon: "event_upcoming",
      };
    } else if (daysUntilStart <= 30) {
      return {
        class: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        text: "This Month",
        icon: "calendar_month",
      };
    } else {
      return {
        class:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        text: "Future",
        icon: "event",
      };
    }
  }

  attachUpcomingEventListeners(row, traineeId, appData) {
    const viewBtn = row.querySelector(".view-upcoming");
    const rescheduleBtn = row.querySelector(".reschedule-training");
    const reminderBtn = row.querySelector(".send-reminder");
    const cancelBtn = row.querySelector(".cancel-training");

    if (viewBtn) {
      viewBtn.addEventListener("click", () => this.viewUpcoming(appData));
    }
    if (rescheduleBtn) {
      rescheduleBtn.addEventListener("click", () =>
        this.rescheduleTraining(traineeId)
      );
    }
    if (reminderBtn) {
      reminderBtn.addEventListener("click", () => this.sendReminder(traineeId));
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.cancelTraining(traineeId));
    }
  }

  // Pagination methods
  updatePagination() {
    const totalUpcoming = this.filteredUpcoming.length;
    const totalPages = Math.ceil(totalUpcoming / this.itemsPerPage);

    if (this.paginationStart && this.paginationEnd && this.paginationTotal) {
      const start = (this.currentPage - 1) * this.itemsPerPage + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, totalUpcoming);

      this.paginationStart.textContent = start;
      this.paginationEnd.textContent = end;
      this.paginationTotal.textContent = totalUpcoming;
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
      this.renderUpcomingTable();
      this.updatePagination();
    }
  }

  nextPage() {
    const totalPages = Math.ceil(
      this.filteredUpcoming.length / this.itemsPerPage
    );
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderUpcomingTable();
      this.updatePagination();
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderUpcomingTable();
    this.updatePagination();
  }

  // Preparation sections
  renderStartingSoon() {
    if (!this.startingSoonList) return;

    const now = new Date();
    const startingSoon = this.filteredUpcoming
      .filter((trainee) => {
        const startDate = trainee.application.duration?.startDate
          ? new Date(trainee.application.duration.startDate)
          : null;
        if (!startDate) return false;
        const daysUntilStart = Math.ceil(
          (startDate - now) / (1000 * 60 * 60 * 24)
        );
        return daysUntilStart <= 7 && daysUntilStart > 0;
      })
      .sort(
        (a, b) =>
          new Date(a.application.duration.startDate) -
          new Date(b.application.duration.startDate)
      );

    // Update count
    if (this.startingSoonCount) {
      this.startingSoonCount.textContent = startingSoon.length;
    }

    if (startingSoon.length === 0) {
      this.startingSoonList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">event_upcoming</span>
          <p>No trainees starting in the next 7 days</p>
        </div>
      `;
      return;
    }

    this.startingSoonList.innerHTML = startingSoon
      .map((trainee) => {
        const student = trainee.application.student || {};
        const startDate = new Date(trainee.application.duration.startDate);
        const daysUntilStart = Math.ceil(
          (startDate - now) / (1000 * 60 * 60 * 24)
        );

        return `
        <div class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
              <span class="material-symbols-outlined text-orange-600 dark:text-orange-400 text-sm">event_upcoming</span>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">${
                student.fullName || "Unknown Trainee"
              }</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${
                trainee.opportunity || "N/A"
              }</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-orange-600 dark:text-orange-400">
              ${startDate.toLocaleDateString()}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${daysUntilStart} days</p>
          </div>
        </div>
      `;
      })
      .join("");
  }

  renderPreparationNeeded() {
    if (!this.preparationNeededList) return;

    const now = new Date();
    const preparationNeeded = this.filteredUpcoming
      .filter((trainee) => {
        const startDate = trainee.application.duration?.startDate
          ? new Date(trainee.application.duration.startDate)
          : null;
        if (!startDate) return false;
        const daysUntilStart = Math.ceil(
          (startDate - now) / (1000 * 60 * 60 * 24)
        );
        return daysUntilStart <= 14 && daysUntilStart > 0;
      })
      .sort(
        (a, b) =>
          new Date(a.application.duration.startDate) -
          new Date(b.application.duration.startDate)
      );

    // Update count
    if (this.preparationNeededCount) {
      this.preparationNeededCount.textContent = preparationNeeded.length;
    }

    if (preparationNeeded.length === 0) {
      this.preparationNeededList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">checklist</span>
          <p>All upcoming trainings are prepared</p>
        </div>
      `;
      return;
    }

    this.preparationNeededList.innerHTML = preparationNeeded
      .map((trainee) => {
        const student = trainee.application.student || {};
        const startDate = new Date(trainee.application.duration.startDate);
        const daysUntilStart = Math.ceil(
          (startDate - now) / (1000 * 60 * 60 * 24)
        );

        return `
        <div class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
              <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">checklist</span>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">${
                student.fullName || "Unknown Trainee"
              }</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${
                trainee.opportunity || "N/A"
              }</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-red-600 dark:text-red-400">
              ${startDate.toLocaleDateString()}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Prepare in ${daysUntilStart} days</p>
          </div>
        </div>
      `;
      })
      .join("");
  }

  renderMonthlySchedule() {
    if (!this.monthlySchedule) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Group by month
    const monthlyStats = {};
    this.filteredUpcoming.forEach((trainee) => {
      const startDate = trainee.application.duration?.startDate
        ? new Date(trainee.application.duration.startDate)
        : null;
      if (!startDate) return;

      const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: startDate.getMonth(),
          year: startDate.getFullYear(),
          count: 0,
        };
      }
      monthlyStats[monthKey].count++;
    });

    const sortedMonths = Object.values(monthlyStats)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .slice(0, 4); // Show next 4 months

    if (sortedMonths.length === 0) {
      this.monthlySchedule.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400 col-span-full">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">calendar_month</span>
          <p>No upcoming training schedule</p>
        </div>
      `;
      return;
    }

    this.monthlySchedule.innerHTML = sortedMonths
      .map((monthStat) => {
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const isCurrentMonth =
          monthStat.month === currentMonth && monthStat.year === currentYear;

        return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center border ${
          isCurrentMonth
            ? "border-primary"
            : "border-gray-200 dark:border-gray-600"
        }">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-300">${
            monthNames[monthStat.month]
          } ${monthStat.year}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">${
            monthStat.count
          }</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">training${
            monthStat.count !== 1 ? "s" : ""
          }</p>
        </div>
      `;
      })
      .join("");
  }

  // Action methods
  viewUpcoming(applicationData) {
    console.log("View upcoming trainee:", applicationData);
    var itid = applicationData.training.id;
    var appId = applicationData.application.id;
    if (!itid || !appId) {
      return;
    }
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

  rescheduleTraining(traineeId) {
    console.log("Reschedule training for:", traineeId);
    this.openRescheduleModal(traineeId);
  }

  async sendReminder(traineeId) {
    console.log("Send reminder to:", traineeId);

    // Show loading notification
    var loadingNotification = showNotification(
      "Sending reminder notification...",
      "loading",
      0
    );

    try {
      // Find the application
      const application = this.filteredUpcoming.find(
        (it) => it.application.id === traineeId
      );

      if (!application) {
        console.log("application is " + JSON.stringify(application));
        throw new Error("Application not found");
      }

      var studentId = application.application.student.uid;
      const studentName = application.application.student.fullName;
      const startDate = application.application.duration?.startDate;
      const opportunity = application.opportunity || {};

      // Format the start date for display
      const formattedStartDate = startDate
        ? new Date(startDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "a future date";

      // Create the notification data according to your Firestore structure
      const notificationData = {
        title: "Training Reminder",
        message: `Reminder: Your ${
          opportunity.title || "training"
        } is scheduled to start on ${formattedStartDate}. Please make sure you're prepared!`,
        type: "reminder",
        status: "unread", // This matches your 'read' field but named 'status'
        applicationId: traineeId,
        companyName: application.training?.company?.name || "Our Company",
        // Additional reminder-specific data
        reminderType: "training_start",
        scheduledDate: startDate,
        opportunityTitle: opportunity,
      };

      console.log("Sending reminder notification:", notificationData);

      // Send the notification
      await it_base_companycloud.sendNotificationToStudent(
        studentId,
        notificationData
      );

      // Update notification to success
      updateNotification(
        loadingNotification,
        `Reminder sent successfully to ${studentName}!`,
        "success"
      );

      // Auto-remove success notification after 3 seconds
      setTimeout(() => {
        removeNotification(loadingNotification);
      }, 3000);

      console.log("Reminder sent successfully to student:", studentName);
    } catch (error) {
      console.error("Failed to send reminder:", error);

      // Update notification to error
      updateNotification(
        loadingNotification,
        `Failed to send reminder: ${error.message}`,
        "error"
      );

      // Auto-remove error notification after 5 seconds
      setTimeout(() => {
        removeNotification(loadingNotification);
      }, 5000);
    }
  }
  cancelTraining(traineeId) {
    if (
      confirm(
        "Are you sure you want to cancel this upcoming training? This action cannot be undone."
      )
    ) {
      console.log("Cancel training:", traineeId);
      // Implement cancellation logic
      this.buildUpcomingContent();
    }
  }

 exportUpcoming() {
    console.log("Export upcoming training");
    const upcomingToExport = this.filteredUpcoming;
    
    if (upcomingToExport.length === 0) {
        showNotification("No data to export", "warning");
        return;
    }

    try {
        const loadingNotification = showNotification("Preparing CSV export...", "loading", 0);

        // Ask user if they want basic or detailed export
        const exportType = confirm("Click OK for detailed export, Cancel for basic export") ? 
            'detailed' : 'basic';
        
        const csvContent = this.convertToCSV(upcomingToExport, exportType);
        const filename = `upcoming_training_${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
        
        this.downloadCSV(csvContent, filename);
        
        updateNotification(
            loadingNotification,
            `Exported ${upcomingToExport.length} trainees (${exportType} format)!`,
            'success'
        );
        
        setTimeout(() => removeNotification(loadingNotification), 3000);

    } catch (error) {
        console.error("Export error:", error);
        showNotification(`Export failed: ${error.message}`, "error");
    }
}

convertToCSV(data, exportType = 'basic') {
    if (!data || data.length === 0) return '';
    
    // Basic headers
    const basicHeaders = [
        'Trainee Name',
        'Trainee Email',
        'Industrial Training',
        'Institution',
        'Start Date',
        'End Date',
        'Days Until Start',
        'Training Duration (Days)',
        'Status'
    ];
    
    // Detailed headers
    const detailedHeaders = [
        'Trainee Name',
        'Trainee Email',
        'Industrial Training',
        'Institution',
        'Course of Study',
        'Phone Number',
        'Start Date',
        'End Date',
        'Training Time',
        'Days Until Start',
        'Training Duration (Days)',
        'Reschedule Reason',
        'Reason Details',
        'Application Date',
        'Application Status',
        'Last Updated',
        'Application ID',
        'Student ID'
    ];
    
    const headers = exportType === 'detailed' ? detailedHeaders : basicHeaders;
    
    const rows = data.map(trainee => {
        const application = trainee.application || {};
        const student = application.student || {};
        const duration = application.duration || {};
        const opportunity = trainee.opportunity || {};
        const training = trainee.training || {};
        
        // Common calculations
        const startDate = duration.startDate ? new Date(duration.startDate) : null;
        const now = new Date();
        const daysUntilStart = startDate ? 
            Math.ceil((startDate - now) / (1000 * 60 * 60 * 24)) : 'Not scheduled';
        
        const endDate = duration.endDate ? new Date(duration.endDate) : null;
        const durationDays = (startDate && endDate) ? 
            Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : 'Not specified';
        
        const formatDateForCSV = (dateString) => {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US');
            } catch {
                return dateString;
            }
        };

        const escapeCSV = (field) => {
            if (field === null || field === undefined) return '';
            const stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        if (exportType === 'detailed') {
            return [
                escapeCSV(student.fullName || 'Unknown'),
                escapeCSV(student.email || ''),
                escapeCSV(opportunity || 'Industrial Training'),
                escapeCSV(student.institution || ''),
                escapeCSV(student.courseOfStudy || ''),
                escapeCSV(student.phoneNumber || ''),
                escapeCSV(formatDateForCSV(duration.startDate)),
                escapeCSV(formatDateForCSV(duration.endDate)),
                escapeCSV(duration.time || ''),
                escapeCSV(daysUntilStart),
                escapeCSV(durationDays),
                escapeCSV(duration.reason || ''),
                escapeCSV(duration.reasonDetails || ''),
                escapeCSV(formatDateForCSV(application.applicationDate)),
                escapeCSV(application.applicationStatus || 'pending'),
                escapeCSV(formatDateForCSV(duration.dateUpdated)),
                escapeCSV(application.id || ''),
                escapeCSV(student.uid || '')
            ];
        } else {
            // Basic format
            return [
                escapeCSV(student.fullName || 'Unknown'),
                escapeCSV(student.email || ''),
                escapeCSV(opportunity || 'Industrial Training'),
                escapeCSV(student.institution || ''),
                escapeCSV(formatDateForCSV(duration.startDate)),
                escapeCSV(formatDateForCSV(duration.endDate)),
                escapeCSV(daysUntilStart),
                escapeCSV(durationDays),
                escapeCSV(application.applicationStatus || 'pending')
            ];
        }
    });
    
    const csvArray = [headers, ...rows];
    return csvArray.map(row => row.join(',')).join('\n');
}

downloadCSV(csvContent, filename) {
    // Add UTF-8 BOM for better Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}
  scheduleTraining() {
    console.log("Schedule new training");
    // Implement schedule training functionality
  }

  openRescheduleModal(traineeId) {
    // Create modal HTML
    const modalHTML = `
    <div id="rescheduleModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div class="flex justify-between items-center pb-3">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Reschedule Training</h3>
          <button class="close-reschedule-modal text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="mt-4">
          <!-- Current Schedule -->
          <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Current Schedule</h4>
            <p class="text-sm text-blue-700 dark:text-blue-400" id="currentScheduleText">Loading...</p>
            <p class="text-xs text-blue-600 dark:text-blue-400 mt-1" id="currentScheduleRange"></p>
          </div>

          <!-- New Schedule Form -->
          <form id="rescheduleForm">
            <div class="space-y-4">
              <!-- Start Date Input -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Start Date *
                </label>
                <input 
                  type="date" 
                  id="newTrainingDate"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
              </div>

              <!-- Auto-calculated End Date Display -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Calculated End Date
                </label>
                <div class="p-2 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <p class="text-sm text-gray-700 dark:text-gray-300" id="calculatedEndDate">Select a start date</p>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  End date is automatically calculated based on the original training duration
                </p>
              </div>

              <!-- Time Input -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Time *
                </label>
                <input 
                  type="time" 
                  id="newTrainingTime"
                  required
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
              </div>

              <!-- Reason Dropdown -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Rescheduling
                </label>
                <select 
                  id="rescheduleReason"
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a reason</option>
                  <option value="schedule_conflict">Schedule Conflict</option>
                  <option value="emergency">Emergency</option>
                  <option value="personal_reasons">Personal Reasons</option>
                  <option value="preferred_time">Preferred Time Slot</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <!-- Additional Details -->
              <div id="reasonDetailsContainer" class="hidden">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Additional Details
                </label>
                <textarea 
                  id="reasonDetails"
                  rows="3"
                  placeholder="Please provide more details about the rescheduling reason..."
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                ></textarea>
              </div>

              <!-- Notify Trainee Option -->
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="notifyTrainee"
                  checked
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                >
                <label for="notifyTrainee" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Send notification email to trainee
                </label>
              </div>
            </div>

            <!-- Confirm/Cancel Buttons -->
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button 
                type="button" 
                class="cancel-reschedule px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button 
                type="submit"
                class="confirm-reschedule px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Confirm Reschedule
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

    // Add modal to body
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Initialize modal functionality
    this.initializeRescheduleModal(traineeId);
  }

  initializeRescheduleModal(traineeId) {
    const modal = document.getElementById("rescheduleModal");

    // Set minimum date to today
    const dateInput = document.getElementById("newTrainingDate");
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;

    // Load current schedule and calculate duration
    this.loadRescheduleCurrentSchedule(traineeId);

    // Event listeners with proper context binding
    document
      .getElementById("rescheduleReason")
      .addEventListener("change", (e) => {
        const detailsContainer = document.getElementById(
          "reasonDetailsContainer"
        );
        if (e.target.value === "other") {
          detailsContainer.classList.remove("hidden");
        } else {
          detailsContainer.classList.add("hidden");
          document.getElementById("reasonDetails").value = "";
        }
      });

    // Calculate end date when start date changes
    document
      .getElementById("newTrainingDate")
      .addEventListener("change", (e) => {
        this.calculateEndDate(e.target.value);
      });

    document
      .getElementById("rescheduleForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleRescheduleSubmit(traineeId);
      });

    // Close modal events
    document
      .querySelector(".close-reschedule-modal")
      .addEventListener("click", () => {
        this.closeRescheduleModal();
      });

    document
      .querySelector(".cancel-reschedule")
      .addEventListener("click", () => {
        this.closeRescheduleModal();
      });

    // Close modal when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeRescheduleModal();
      }
    });
  }

  loadRescheduleCurrentSchedule(traineeId) {
    const currentTraining = this.filteredUpcoming.find(
      (t) => t.application.id === traineeId
    );
    console.log("filtered training is " + JSON.stringify(currentTraining));
    const scheduleData = {
      startDate: currentTraining.application.duration.startDate,
      endDate: currentTraining.application.duration.endDate,
      time: "8:00 am",
      traineeName: currentTraining.application.student.fullName,
    };

    // Store the duration for later use
    this.trainingDuration = this.calculateDuration(
      scheduleData.startDate,
      scheduleData.endDate
    );

    // Format dates for display
    const startDateFormatted = this.formatDateForDisplay(
      scheduleData.startDate
    );
    const endDateFormatted = this.formatDateForDisplay(scheduleData.endDate);

    document.getElementById(
      "currentScheduleText"
    ).textContent = `${startDateFormatted} at ${scheduleData.time}`;

    document.getElementById(
      "currentScheduleRange"
    ).textContent = `Original schedule: ${startDateFormatted} to ${endDateFormatted} (${this.trainingDuration} days)`;
  }

  calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const differenceInTime = end.getTime() - start.getTime();
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
    return differenceInDays;
  }

  calculateEndDate(selectedStartDate) {
    if (!selectedStartDate || !this.trainingDuration) {
      document.getElementById("calculatedEndDate").textContent =
        "Select a start date";
      return;
    }

    const startDate = new Date(selectedStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + this.trainingDuration);

    const formattedEndDate = this.formatDateForDisplay(
      endDate.toISOString().split("T")[0]
    );
    document.getElementById("calculatedEndDate").textContent = formattedEndDate;
  }

  formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async handleRescheduleSubmit(traineeId) {
    // Get the button element once
    const submitButton = document.querySelector(".confirm-reschedule");

    // Store original text and state
    const originalText = submitButton.innerText;
    const originalDisabled = submitButton.disabled;

    try {
      // Update button state
      submitButton.innerText = "Submitting...";
      submitButton.disabled = true;

      const startDate = document.getElementById("newTrainingDate").value;

      if (!startDate) {
        alert("Please select a start date");
        return;
      }

      // Calculate the end date based on selected start date
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + this.trainingDuration);
      const endDate = endDateObj.toISOString().split("T")[0];

      const it = this.filteredUpcoming.find(
        (it) => (it.application.id = traineeId)
      );
      var studentid = it.application.student.uid;
      const formData = {
        traineeId: it.application.student.uid,
        startDate: startDate,
        endDate: endDate,
        time: document.getElementById("newTrainingTime").value,
        reason: document.getElementById("rescheduleReason").value,
        reasonDetails: document.getElementById("reasonDetails").value,
        notifyTrainee: document.getElementById("notifyTrainee").checked,
        duration: this.trainingDuration,
      };

      // Validate form
      if (!this.validateRescheduleForm(formData)) {
        return;
      }

      const id = it.application.internship.id;
      console.log("it id is " + JSON.stringify(id));
      console.log("appid " + traineeId);

      await it_base_companycloud.updateCompanyApplicationDuration(
        formData,
        traineeId,
        id,
        studentid
      );

      const formattedStartDate = this.formatDateForDisplay(formData.startDate);
      const formattedEndDate = this.formatDateForDisplay(formData.endDate);
      alert(
        `Training rescheduled successfully!\nNew schedule: ${formattedStartDate} to ${formattedEndDate}\nDuration: ${formData.duration} days`
      );

      this.closeRescheduleModal();
      this.refreshUpcomingData();
    } catch (error) {
      // Handle any errors that occur during submission
      console.error("Reschedule submission error:", error);
      alert("Failed to reschedule training. Please try again.");
    } finally {
      // Always restore button state whether success or failure
      submitButton.innerText = originalText;
      submitButton.disabled = false;
    }
  }

  async refreshUpcomingData() {
    console.log("Refreshing upcoming training data...");

    // Clear any cached data in tabManager
    if (this.tabManager.clearCache) {
      this.tabManager.clearCache();
    }

    // Force reload from Firestore
    await this.tabManager.refreshData();

    // Rebuild the content with fresh data
    await this.buildUpcomingContent();
  }

  validateRescheduleForm(formData) {
    if (!formData.startDate || !formData.time) {
      alert("Please fill in all required fields");
      return false;
    }

    const selectedDate = new Date(formData.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("Please select a future date");
      return false;
    }

    return true;
  }

  closeRescheduleModal() {
    const modal = document.getElementById("rescheduleModal");
    if (modal) {
      modal.remove();
    }
    document.body.style.overflow = "auto";
  }
}
