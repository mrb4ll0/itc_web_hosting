import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";
import {
  auth,
  db,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
} from "../../../js/config/firebaseInit.js";

const itc_firebase_logic = new ITCFirebaseLogic();

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.filteredNotifications = [];
    this.currentTab = "all";
    this.currentFilter = "all";
    this.companyId = null;
    this.unsubscribe = null;

    // Filters for different categories
    this.filters = [
      { id: "all", label: "All", icon: "notifications" },
      { id: "unread", label: "Unread", icon: "mark_email_unread" },
      { id: "applications", label: "Applications", icon: "person_add" },
      { id: "students", label: "Students", icon: "school" },
      { id: "system", label: "System", icon: "warning" },
      { id: "reminders", label: "Reminders", icon: "notifications_active" },
    ];

    // Tabs for different views
    this.tabs = [
      { id: "all", label: "All" },
      { id: "unread", label: "Unread" },
      { id: "important", label: "Important" },
    ];

    // Notification types with icons and colors
    this.notificationTypes = {
      newApplication: {
        label: "New Application",
        icon: "person_add_alt",
        color: "notification-app",
        colorLight: "notification-app-light",
      },
      applicationUpdate: {
        label: "Application Update",
        icon: "update",
        color: "notification-app",
        colorLight: "notification-app-light",
      },
      studentMessage: {
        label: "Student Message",
        icon: "message",
        color: "notification-student",
        colorLight: "notification-student-light",
      },
      studentDocument: {
        label: "Document",
        icon: "description",
        color: "notification-student",
        colorLight: "notification-student-light",
      },
      systemAlert: {
        label: "System Alert",
        icon: "warning",
        color: "notification-system",
        colorLight: "notification-system-light",
      },
      payment: {
        label: "Payment",
        icon: "payments",
        color: "notification-payment",
        colorLight: "notification-payment-light",
      },
      reminder: {
        label: "Reminder",
        icon: "notifications_active",
        color: "notification-reminder",
        colorLight: "notification-reminder-light",
      },
    };

    this.initializeElements();
    this.bindEvents();
    this.init();
  }

  async init() {
    try {
      await auth.authStateReady();
      const user = auth.currentUser;

      if (!user) {
        this.showError("Please sign in to view notifications");
        return;
      }

      this.companyId = user.uid;
      await this.loadCompanyData();
      await this.loadNotifications();
      this.renderNotifications();
    } catch (error) {
      console.error("Error initializing notification manager:", error);
      this.showError("Failed to load notifications");
    }
  }

  async loadCompanyData() {
    try {
      this.company = await itc_firebase_logic.getCompany(this.companyId);
      if (this.company && this.company.logoURL) {
        const profileImg = document.getElementById("company-logo");
        if (profileImg) {
          profileImg.style.backgroundImage = `url('${this.company.logoURL}')`;
        }
      }
    } catch (error) {
      console.error("Error loading company data:", error);
    }
  }

  initializeElements() {
    // Get DOM elements
    this.markAllReadBtn = document.getElementById("markAllReadBtn");
    this.fabMarkAllRead = document.getElementById("fabMarkAllRead");
    this.settingsBtn = document.getElementById("settingsBtn");
    this.retryBtn = document.getElementById("retryBtn");
    this.filterChips = document.getElementById("filterChips");
    this.notificationTabs = document.getElementById("notificationTabs");
    this.notificationsContainer = document.getElementById(
      "notificationsContainer"
    );
    this.loadingSkeleton = document.getElementById("loadingSkeleton");
    this.emptyState = document.getElementById("emptyState");
    this.errorState = document.getElementById("errorState");
    this.errorMessage = document.getElementById("errorMessage");

    // Create filter chips
    this.renderFilterChips();

    // Create tabs
    this.renderTabs();
  }

  bindEvents() {
    // Event listeners
    this.markAllReadBtn?.addEventListener("click", () => this.markAllAsRead());
    this.fabMarkAllRead?.addEventListener("click", () => this.markAllAsRead());
    this.settingsBtn?.addEventListener("click", () => this.showSettings());
    this.retryBtn?.addEventListener("click", () => this.loadNotifications());
  }

  renderFilterChips() {
    if (!this.filterChips) return;

    this.filterChips.innerHTML = this.filters
      .map(
        (filter) => `
            <button 
                class="filter-chip flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  this.currentFilter === filter.id
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }"
                data-filter="${filter.id}"
            >
                <span class="material-symbols-outlined text-sm">${
                  filter.icon
                }</span>
                ${filter.label}
            </button>
        `
      )
      .join("");

    // Add click events to filter chips
    this.filterChips.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.setActiveFilter(filter);
      });
    });
  }

  renderTabs() {
    if (!this.notificationTabs) return;

    this.notificationTabs.innerHTML = this.tabs
      .map(
        (tab) => `
            <button 
                class="tab flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  this.currentTab === tab.id
                    ? "border-primary-500 text-primary-500"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }"
                data-tab="${tab.id}"
            >
                ${tab.label}
            </button>
        `
      )
      .join("");

    // Add click events to tabs
    this.notificationTabs.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabId = e.currentTarget.dataset.tab;
        this.setActiveTab(tabId);
      });
    });
  }

  setActiveFilter(filter) {
    this.currentFilter = filter;
    this.renderFilterChips();
    this.filterNotifications();
    this.renderNotifications();
  }

  setActiveTab(tab) {
    this.currentTab = tab;
    this.renderTabs();
    this.filterNotifications();
    this.renderNotifications();
  }

  async loadNotifications() {
    try {
      this.showLoading(true);
      this.hideError();

      // Setup real-time listener for notifications
      const notificationsRef = collection(
        db,
        "users",
        "companies",
        "companies",
        this.companyId,
        "notifications"
      );
      const notificationsQuery = query(notificationsRef);

      // Unsubscribe from previous listener if exists
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      this.unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          this.notifications = [];
          snapshot.forEach((doc) => {
            const notification = {
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
            };
            this.notifications.push(notification);
          });

          // Sort by date (newest first)
          this.notifications.sort((a, b) => b.createdAt - a.createdAt);

          this.filterNotifications();
          this.renderNotifications();
          this.showLoading(false);
        },
        (error) => {
          console.error("Error loading notifications:", error);
          this.showError("Failed to load notifications");
          this.showLoading(false);
        }
      );
    } catch (error) {
      console.error("Error loading notifications:", error);
      this.showError("Failed to load notifications");
      this.showLoading(false);
    }
  }

  filterNotifications() {
    let filtered = [...this.notifications];

    // Apply tab filter
    switch (this.currentTab) {
      case "unread":
        filtered = filtered.filter((n) => !n.read);
        break;
      case "important":
        filtered = filtered.filter((n) => n.important);
        break;


    }

    // Apply category filter
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((notification) => {
        console.log("notification type "+notification.type);
        switch (this.currentFilter) {
          case "unread":
            return !notification.read;
          case "applications":
            return (
              notification.type === "newApplication" ||
              notification.type === "applicationUpdate" ||notification.type === "new_application"
            );
          case "students":
            return (
              notification.type === "studentMessage" ||
              notification.type === "studentDocument"
            );
          case "system":
            return (
              notification.type === "systemAlert" ||
              notification.type === "payment"
            );
          case "reminders":
            return notification.type === "reminder";
          default:
            return true;
        }
      });
    }

    this.filteredNotifications = filtered;
  }

  renderNotifications() {
    if (!this.notificationsContainer) return;

    // Clear container
    const existingNotifications =
      this.notificationsContainer.querySelectorAll(".notification-item");
    existingNotifications.forEach((el) => el.remove());

    if (this.filteredNotifications.length === 0) {
      this.showEmptyState(this.currentTab);
      return;
    }

    this.hideEmptyState();

    // Render each notification
    this.filteredNotifications.forEach((notification, index) => {
      const notificationElement = this.createNotificationElement(
        notification,
        index
      );
      this.notificationsContainer.appendChild(notificationElement);
    });
  }

  createNotificationElement(notification, index) {
    const notificationType =
      this.notificationTypes[notification.type] ||
      this.notificationTypes.systemAlert;
    const timeAgo = this.formatTimeAgo(notification.createdAt);

    // Check if this is an application notification
    const isApplicationNotification = 
      notification.type === 'new_application' || 
      notification.type === 'newApplication' ||
      notification.type === 'application_update' ||
      notification.type === 'applicationUpdate';

    const notificationDiv = document.createElement("div");
    notificationDiv.className = `notification-item bg-white dark:bg-darkcard rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:shadow-md ${
      !notification.read ? "border-l-4 border-l-primary-500" : ""
    } ${isApplicationNotification ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`;
    notificationDiv.dataset.notificationId = notification.id;
    notificationDiv.dataset.notificationType = notification.type;

    notificationDiv.innerHTML = `
            <div class="p-4 flex items-start gap-4">
                <div class="flex-shrink-0">
                    <div class="w-12 h-12 rounded-xl ${
                      notificationType.color
                    } flex items-center justify-center">
                        <span class="material-symbols-outlined text-white">${
                          notificationType.icon
                        }</span>
                    </div>
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="font-semibold text-gray-800 dark:text-white truncate ${
                          !notification.read ? "font-bold" : ""
                        }">
                            ${notification.title}
                        </h3>
                        <div class="flex items-center gap-2">
                            ${
                              notification.important
                                ? `
                                <span class="material-symbols-outlined text-amber-500 text-sm">star</span>
                            `
                                : ""
                            }
                            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${timeAgo}</span>
                        </div>
                    </div>
                    
                    <div class="mb-3 ${isApplicationNotification ? 'group' : ''}">
                        <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 ${
                          isApplicationNotification ? 'group-hover:text-primary-500 transition-colors duration-200' : ''
                        }">
                            ${notification.message}
                        </p>
                        ${
                          isApplicationNotification
                            ? `<p class="text-xs text-primary-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Click to view application details →</p>`
                            : ""
                        }
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="px-2 py-1 text-xs font-medium rounded ${
                          notificationType.colorLight
                        }">
                            ${notificationType.label}
                        </span>
                        
                        <div class="flex items-center gap-1">
                            <button class="notification-option-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400" data-action="markRead" title="${
                              notification.read
                                ? "Mark as unread"
                                : "Mark as read"
                            }">
                                <span class="material-symbols-outlined text-sm">
                                    ${
                                      notification.read
                                        ? "mark_email_unread"
                                        : "mark_email_read"
                                    }
                                </span>
                            </button>
                            <button class="notification-option-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400" data-action="important" title="${
                              notification.important
                                ? "Remove important"
                                : "Mark important"
                            }">
                                <span class="material-symbols-outlined text-sm">
                                    ${
                                      notification.important
                                        ? "star"
                                        : "star_outline"
                                    }
                                </span>
                            </button>
                            <button class="notification-option-btn p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400" data-action="delete" title="Delete">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                ${
                  !notification.read
                    ? `
                    <div class="flex-shrink-0">
                        <div class="w-2 h-2 rounded-full bg-primary-500"></div>
                    </div>
                `
                    : ""
                }
            </div>
        `;

    // Add event listeners
    notificationDiv.addEventListener("click", (e) => {
      if (!e.target.closest(".notification-option-btn")) {
        if (isApplicationNotification) {
          // For application notifications, navigate to application details
          this.openApplicationDetails(notification);
        } else {
          // For other notifications, show details
          this.showNotificationDetails(notification);
        }
      }
    });

    const optionButtons = notificationDiv.querySelectorAll(
      ".notification-option-btn"
    );
    optionButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.handleNotificationAction(notification.id, action);
      });
    });

    return notificationDiv;
  }

  // Method to open application details
  openApplicationDetails(notification) {
    try {
      // Mark as read first if not already read
      if (!notification.read) {
        this.handleNotificationAction(notification.id, 'markRead');
      }

      // Extract application data from notification
      const data = notification.data || {};
      
      // Try different possible keys for application ID
      const applicationId = 
        data.applicationId || 
        data.application_id || 
        data.id || 
        notification.id.split('_')[0]; // Fallback: use part of notification ID
      
      // Extract student ID if available
      const studentId = 
        data.studentId || 
        data.student_id || 
        data.userId || 
        data.user_id;
      
      // Extract opportunity ID if available
      const opportunityId = 
        data.internshipId || 
        data.opportunity_id || 
        data.jobId || 
        data.job_id;
      
      // Log for debugging
      console.log('Opening application details:', {
        applicationId,
        studentId,
        opportunityId,
        notificationData: data
      });

      // Construct URL
      let url = 'student_profile.html';
      const params = new URLSearchParams();
      
      if (opportunityId) {
        params.append('itid', opportunityId);
      }

      if (applicationId) {
        params.append('id', applicationId);
      }
      
      if (studentId) {
        params.append('studentId', studentId);
      }
      
      
      
      // Add notification ID for tracking
      params.append('fromNotification', notification.id);
      
      // Add any other relevant data
      if (data.studentName) params.append('studentName', data.studentName);
      if (data.opportunityTitle) params.append('opportunityTitle', data.opportunityTitle);
      if (data.status) params.append('status', data.status);
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      // Show loading toast
      this.showToast('Opening application details...', 'info');
      
      // Navigate after a short delay for better UX
      
      setTimeout(() => {
        console.log('Navigating to:', url);
        window.location.href = url;
      }, 300);

    } catch (error) {
      console.error('Error opening application details:', error);
      
      // Fallback to general applications page
      this.showToast('Could not open specific application. Opening applications list...', 'warning');
      setTimeout(() => {
        window.location.href = 'applications.html';
      }, 500);
    }
  }

  // Also update the showNotificationDetails method to handle application notifications specially
  showNotificationDetails(notification) {
    // Check if this is an application notification
    const isApplicationNotification = 
      notification.type === 'new_application' || 
      notification.type === 'newApplication' ||
      notification.type === 'application_update' ||
      notification.type === 'applicationUpdate';

    if (isApplicationNotification) {
      this.showApplicationNotificationModal(notification);
    } else {
      this.showGeneralNotificationModal(notification);
    }
  }

  // Special modal for application notifications
  showApplicationNotificationModal(notification) {
    const notificationType = this.notificationTypes[notification.type] || this.notificationTypes.systemAlert;
    const formattedDate = this.formatDate(notification.createdAt);
    const data = notification.data || {};

    const modal = document.getElementById('notificationDetailModal');
    const modalContent = modal.querySelector('.p-6');
    
    modalContent.innerHTML = `
      <div class="flex justify-between items-start mb-6">
        <div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-2">${notification.title}</h3>
          <p class="text-gray-500 dark:text-gray-400">${formattedDate}</p>
        </div>
        <button id="closeDetailModalBtn" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <span class="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
        </button>
      </div>
      
      <div class="flex items-center gap-4 mb-6">
        <div class="w-14 h-14 rounded-xl ${notificationType.color} flex items-center justify-center">
          <span class="material-symbols-outlined text-white text-2xl">${notificationType.icon}</span>
        </div>
        <div>
          <span class="px-3 py-1 text-sm font-medium rounded-full ${notificationType.colorLight}">
            Application Notification
          </span>
          ${notification.important ? `
            <span class="ml-2 px-3 py-1 text-sm font-medium rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              Important
            </span>
          ` : ''}
          ${!notification.read ? `
            <span class="ml-2 px-3 py-1 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Unread
            </span>
          ` : ''}
        </div>
      </div>
      
      <div class="mb-6">
        <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Message</h4>
        <p class="text-gray-600 dark:text-gray-300 leading-relaxed p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          ${notification.message}
        </p>
      </div>
      
      ${data.studentName || data.opportunityTitle ? `
        <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Application Summary</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${data.studentName ? `
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Student</p>
                <p class="font-medium text-gray-800 dark:text-white">${data.studentName}</p>
              </div>
            ` : ''}
            ${data.opportunityTitle ? `
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Opportunity</p>
                <p class="font-medium text-gray-800 dark:text-white">${data.opportunityTitle}</p>
              </div>
            ` : ''}
            ${data.status ? `
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                <p class="font-medium text-gray-800 dark:text-white">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    data.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    data.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    data.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }">
                    ${data.status}
                  </span>
                </p>
              </div>
            ` : ''}
            ${data.appliedDate ? `
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Applied Date</p>
                <p class="font-medium text-gray-800 dark:text-white">${data.appliedDate}</p>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="flex gap-3 mt-8">
        <button id="closeModalBtn" class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Close
        </button>
        <button id="viewApplicationBtn" class="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-sm">visibility</span>
          View Full Application
        </button>
      </div>
    `;
    
    // Add event listeners
    modalContent.querySelector('#closeDetailModalBtn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    
    modalContent.querySelector('#closeModalBtn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    
    modalContent.querySelector('#viewApplicationBtn')?.addEventListener('click', () => {
      this.openApplicationDetails(notification);
      modal.classList.add('hidden');
    });
    
    modal.classList.remove('hidden');
  }

  // General notification modal (for non-application notifications)
  showGeneralNotificationModal(notification) {
    const notificationType = this.notificationTypes[notification.type] || this.notificationTypes.systemAlert;
    const formattedDate = this.formatDate(notification.createdAt);
    
    const modal = document.getElementById('notificationDetailModal');
    const modalContent = modal.querySelector('.p-6');
    
    modalContent.innerHTML = `
      <div class="flex justify-between items-start mb-6">
        <div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-2">${notification.title}</h3>
          <p class="text-gray-500 dark:text-gray-400">${formattedDate}</p>
        </div>
        <button id="closeDetailModalBtn" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <span class="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
        </button>
      </div>
      
      <div class="flex items-center gap-4 mb-6">
        <div class="w-14 h-14 rounded-xl ${notificationType.color} flex items-center justify-center">
          <span class="material-symbols-outlined text-white text-2xl">${notificationType.icon}</span>
        </div>
        <div>
          <span class="px-3 py-1 text-sm font-medium rounded-full ${notificationType.colorLight}">
            ${notificationType.label}
          </span>
          ${notification.important ? `
            <span class="ml-2 px-3 py-1 text-sm font-medium rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              Important
            </span>
          ` : ''}
        </div>
      </div>
      
      <div class="mb-8">
        <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Details</h4>
        <p class="text-gray-600 dark:text-gray-300 leading-relaxed">${notification.message}</p>
      </div>
      
      ${notification.data ? `
        <div class="mb-8">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Additional Information</h4>
          <div class="space-y-2">
            ${Object.entries(notification.data).map(([key, value]) => `
              <div class="flex">
                <span class="w-32 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">${key}:</span>
                <span class="text-sm text-gray-800 dark:text-white">${value}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="flex gap-3">
        <button id="closeModalBtn" class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
          Close
        </button>
        ${!notification.read ? `
          <button id="markReadBtn" data-notification-id="${notification.id}" class="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium">
            Mark as Read
          </button>
        ` : ''}
      </div>
    `;
    
    // Add event listeners
    modalContent.querySelector('#closeDetailModalBtn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    
    modalContent.querySelector('#closeModalBtn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    
    const markReadBtn = modalContent.querySelector('#markReadBtn');
    if (markReadBtn) {
      markReadBtn.addEventListener('click', () => {
        const notificationId = markReadBtn.dataset.notificationId;
        this.handleNotificationAction(notificationId, 'markRead');
        modal.classList.add('hidden');
      });
    }
    
    modal.classList.remove('hidden');
  }

  async handleNotificationAction(notificationId, action) {
    try {
      const notificationRef = doc(
        db,
        "users",
        "companies",
        "companies",
        this.companyId,
        "notifications",
        notificationId
      );

      switch (action) {
        case "markRead":
          const notification = this.notifications.find(
            (n) => n.id === notificationId
          );
          await updateDoc(notificationRef, {
            read: !notification?.read,
            updatedAt: new Date(),
          });
          break;

        case "important":
          const notificationData = this.notifications.find(
            (n) => n.id === notificationId
          );
          await updateDoc(notificationRef, {
            important: !notificationData?.important,
            updatedAt: new Date(),
          });
          break;

        case "delete":
          await deleteDoc(notificationRef);
          break;
      }
    } catch (error) {
      console.error("Error handling notification action:", error);
      this.showToast("Failed to update notification", "error");
    }
  }

  async markAllAsRead() {
    try {
      const batch = [];
      const unreadNotifications = this.notifications.filter((n) => !n.read);

      for (const notification of unreadNotifications) {
        const notificationRef = doc(
          db,
          "companies",
          this.companyId,
          "notifications",
          notification.id
        );
        batch.push(
          updateDoc(notificationRef, {
            read: true,
            updatedAt: new Date(),
          })
        );
      }

      await Promise.all(batch);
      this.showToast("All notifications marked as read", "success");
    } catch (error) {
      console.error("Error marking all as read:", error);
      this.showToast("Failed to mark all as read", "error");
    }
  }

  async deleteNotification(notificationId) {
    try {
      const notificationRef = doc(
        db,
        "companies",
        this.companyId,
        "notifications",
        notificationId
      );
      await deleteDoc(notificationRef);
      this.showToast("Notification deleted", "success");
    } catch (error) {
      console.error("Error deleting notification:", error);
      this.showToast("Failed to delete notification", "error");
    }
  }

  showNotificationDetails(notification) {
    const notificationType =
      this.notificationTypes[notification.type] ||
      this.notificationTypes.systemAlert;
    const formattedDate = this.formatDate(notification.createdAt);

    const modal = document.getElementById("notificationDetailModal");
    const modalContent = modal.querySelector(".p-6");

    modalContent.innerHTML = `
        <div class="flex justify-between items-start mb-6">
            <div>
                <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-2">${
                  notification.title
                }</h3>
                <p class="text-gray-500 dark:text-gray-400">${formattedDate}</p>
            </div>
            <button id="closeDetailModalBtn" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <span class="material-symbols-outlined text-gray-600 dark:text-gray-400">close</span>
            </button>
        </div>
        
        <div class="flex items-center gap-4 mb-6">
            <div class="w-14 h-14 rounded-xl ${
              notificationType.color
            } flex items-center justify-center">
                <span class="material-symbols-outlined text-white text-2xl">${
                  notificationType.icon
                }</span>
            </div>
            <div>
                <span class="px-3 py-1 text-sm font-medium rounded-full ${
                  notificationType.colorLight
                }">
                    ${notificationType.label}
                </span>
                ${
                  notification.important
                    ? `
                    <span class="ml-2 px-3 py-1 text-sm font-medium rounded-full bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                        Important
                    </span>
                `
                    : ""
                }
            </div>
        </div>
        
        <div class="mb-8">
            <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Details</h4>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">${
              notification.message
            }</p>
        </div>
        
        ${
          notification.data
            ? `
            <div class="mb-8">
                <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">Additional Information</h4>
                <div class="space-y-2">
                    ${Object.entries(notification.data)
                      .map(
                        ([key, value]) => `
                        <div class="flex">
                            <span class="w-32 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">${key}:</span>
                            <span class="text-sm text-gray-800 dark:text-white">${value}</span>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `
            : ""
        }
        
        <div class="flex gap-3">
            <button id="closeModalBtn" class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                Close
            </button>
            ${
              !notification.read
                ? `
                <button id="markReadBtn" data-notification-id="${notification.id}" class="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium">
                    Mark as Read
                </button>
            `
                : ""
            }
        </div>
    `;

    // Add event listeners
    modalContent
      .querySelector("#closeDetailModalBtn")
      ?.addEventListener("click", () => {
        modal.classList.add("hidden");
      });

    modalContent
      .querySelector("#closeModalBtn")
      ?.addEventListener("click", () => {
        modal.classList.add("hidden");
      });

    const markReadBtn = modalContent.querySelector("#markReadBtn");
    if (markReadBtn) {
      markReadBtn.addEventListener("click", () => {
        const notificationId = markReadBtn.dataset.notificationId;
        this.handleNotificationAction(notificationId, "markRead");
        modal.classList.add("hidden");
      });
    }

    modal.classList.remove("hidden");
  }
  showSettings() {
    const modal = document.getElementById("settingsModal");
    const modalContent = modal.querySelector(".p-6");

    // Load current settings
    this.loadNotificationSettings().then((settings) => {
      modalContent.innerHTML = `
                <div class="space-y-6">
                    <!-- Delivery Methods -->
                    <div>
                        <h4 class="text-base font-semibold text-gray-800 dark:text-white mb-3">Delivery Methods</h4>
                        <div class="space-y-3">
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">Push Notifications</span>
                                <input type="checkbox" id="pushEnabled" ${
                                  settings.pushEnabled ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">Email Notifications</span>
                                <input type="checkbox" id="emailEnabled" ${
                                  settings.emailEnabled ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                        </div>
                    </div>
                    
                    <!-- Notification Behavior -->
                    <div>
                        <h4 class="text-base font-semibold text-gray-800 dark:text-white mb-3">Notification Behavior</h4>
                        <div class="space-y-3">
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">Sound</span>
                                <input type="checkbox" id="soundEnabled" ${
                                  settings.soundEnabled ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">Vibration</span>
                                <input type="checkbox" id="vibrateEnabled" ${
                                  settings.vibrateEnabled ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                        </div>
                    </div>
                    
                    <!-- Notification Types -->
                    <div>
                        <h4 class="text-base font-semibold text-gray-800 dark:text-white mb-3">Notification Types</h4>
                        <div class="space-y-3">
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">New Applications</span>
                                <input type="checkbox" id="newApplications" ${
                                  settings.newApplications ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">Application Updates</span>
                                <input type="checkbox" id="applicationUpdates" ${
                                  settings.applicationUpdates ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">Student Messages</span>
                                <input type="checkbox" id="studentMessages" ${
                                  settings.studentMessages ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">System Alerts</span>
                                <input type="checkbox" id="systemAlerts" ${
                                  settings.systemAlerts ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">Payment Notifications</span>
                                <input type="checkbox" id="paymentNotifications" ${
                                  settings.paymentNotifications ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                            <label class="flex items-center justify-between">
                                <span class="text-gray-700 dark:text-gray-300">Reminders</span>
                                <input type="checkbox" id="reminders" ${
                                  settings.reminders ? "checked" : ""
                                } class="w-4 h-4 text-primary-500 rounded border-gray-300 focus:ring-primary-500">
                            </label>
                        </div>
                    </div>
                </div>
            `;

      modal.classList.remove("hidden");
    });
  }

  async loadNotificationSettings() {
    try {
      const settingsRef = doc(
        db,
        "companies",
        this.companyId,
        "settings",
        "notifications"
      );
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        return settingsDoc.data();
      }

      // Return default settings
      return {
        pushEnabled: true,
        emailEnabled: false,
        soundEnabled: true,
        vibrateEnabled: true,
        newApplications: true,
        applicationUpdates: true,
        studentMessages: true,
        systemAlerts: true,
        paymentNotifications: true,
        reminders: false,
      };
    } catch (error) {
      console.error("Error loading notification settings:", error);
      return {
        pushEnabled: true,
        emailEnabled: false,
        soundEnabled: true,
        vibrateEnabled: true,
        newApplications: true,
        applicationUpdates: true,
        studentMessages: true,
        systemAlerts: true,
        paymentNotifications: true,
        reminders: false,
      };
    }
  }

  async saveNotificationSettings() {
    try {
      const settings = {
        pushEnabled: document.getElementById("pushEnabled").checked,
        emailEnabled: document.getElementById("emailEnabled").checked,
        soundEnabled: document.getElementById("soundEnabled").checked,
        vibrateEnabled: document.getElementById("vibrateEnabled").checked,
        newApplications: document.getElementById("newApplications").checked,
        applicationUpdates:
          document.getElementById("applicationUpdates").checked,
        studentMessages: document.getElementById("studentMessages").checked,
        systemAlerts: document.getElementById("systemAlerts").checked,
        paymentNotifications: document.getElementById("paymentNotifications")
          .checked,
        reminders: document.getElementById("reminders").checked,
        updatedAt: new Date(),
      };

      const settingsRef = doc(
        db,
        "companies",
        this.companyId,
        "settings",
        "notifications"
      );
      await setDoc(settingsRef, settings, { merge: true });

      this.showToast("Settings saved successfully", "success");
      closeSettingsModal();
    } catch (error) {
      console.error("Error saving notification settings:", error);
      this.showToast("Failed to save settings", "error");
    }
  }

  formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 30) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return "Just now";
    }
  }

  formatDate(date) {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  showLoading(show) {
    if (show) {
      this.loadingSkeleton?.classList.remove("hidden");
      this.hideEmptyState();
      this.hideError();
    } else {
      this.loadingSkeleton?.classList.add("hidden");
    }
  }

  showEmptyState(tabType) {
    const emptyState = document.getElementById("emptyState");
    if (!emptyState) return;

    let title = "No Notifications";
    let message = "Notifications will appear here";
    let icon = "notifications_none";

    switch (tabType) {
      case "unread":
        title = "No Unread Notifications";
        message = "You're all caught up!";
        icon = "done_all";
        break;
      case "important":
        title = "No Important Notifications";
        message = "No important notifications at the moment";
        icon = "star_outline";
        break;
    }

    emptyState.innerHTML = `
            <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span class="material-symbols-outlined text-gray-400 text-4xl">${icon}</span>
            </div>
            <h3 class="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">${title}</h3>
            <p class="text-gray-500 dark:text-gray-400">${message}</p>
        `;

    emptyState.classList.remove("hidden");
    this.hideError();
  }

  hideEmptyState() {
    this.emptyState?.classList.add("hidden");
  }

  showError(message) {
    if (this.errorState && this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorState.classList.remove("hidden");
      this.hideEmptyState();
      this.showLoading(false);
    }
  }

  hideError() {
    this.errorState?.classList.add("hidden");
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white animate-fade-in z-50 ${
      type === "success"
        ? "bg-green-500"
        : type === "error"
        ? "bg-red-500"
        : type === "warning"
        ? "bg-yellow-500"
        : "bg-blue-500"
    }`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%, 10px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Global functions for modal interactions
// Global functions for modal interactions
function closeNotificationDetail() {
    const modal = document.getElementById('notificationDetailModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function closeConfirmationModal() {
    const modal = document.getElementById('confirmationModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function saveSettings() {
    if (window.notificationManager) {
        window.notificationManager.saveNotificationSettings();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const notificationManager = new NotificationManager();
    window.notificationManager = notificationManager;
    
    // Add global event listeners for modals
    document.addEventListener('click', function(e) {
        // Handle confirmation modal delete
        if (e.target && e.target.id === 'confirmDeleteBtn') {
            const notificationId = e.target.dataset.notificationId;
            if (notificationId && window.notificationManager) {
                window.notificationManager.deleteNotification(notificationId);
                closeConfirmationModal();
            }
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.notificationManager) {
        window.notificationManager.cleanup();
    }
});