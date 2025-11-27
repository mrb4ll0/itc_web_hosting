// Import everything from your Firebase config
import {
  auth,
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  onAuthStateChanged,
} from "../js/config/firebaseInit.js";

// Import your local modules
import { CompanyCloud } from "../js/fireabase/CompanyCloud.js";
import { safeConvertToTimestamp } from "./general/generalmethods.js";
import { Student } from "./model/Student.js";
import { StudentCloudDB } from "./fireabase/StudentCloud.js";
var companyCloud = new CompanyCloud();
var studentCloudDB = new StudentCloudDB();

class NotificationManager {
  constructor() {
    this.currentStudentUid = null;
    this.notifications = [];
    this.unsubscribe = null;
    this.currentTab = "all";
    this.selectedNotification = null;
     this.isLoadingNotifications = true;
    this.init();
  }

  async init() {
    try {
      ////console.log('Starting auth initialization...');

      // Use authStateReady to wait for auth initialization
      await auth.authStateReady();
      this.currentStudent = await studentCloudDB.getStudentById(auth.currentUser.uid);

      if (auth.currentUser) {
        this.currentStudentUid = auth.currentUser.uid;
        ////console.log('User authenticated:', this.currentStudentUid);

        // Set up header profile
        this.setupHeaderProfile();

        // Set up event listeners
        this.setupEventListeners();

        // Start listening to notifications
        this.startNotificationsStream();
      } else {
        // If no user, wait for auth state change
        await new Promise((resolve, reject) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Clean up the listener immediately
            if (user) {
              this.currentStudentUid = user.uid;
              ////console.log('User authenticated via listener:', this.currentStudentUid);
              resolve();
            } else {
              reject(new Error("User not authenticated after waiting"));
            }
          });

          // Timeout after 5 seconds
          setTimeout(() => {
            unsubscribe();
            reject(new Error("Auth state change timeout"));
          }, 5000);
        });

        // Set up header profile
        this.setupHeaderProfile();

        // Set up event listeners
        this.setupEventListeners();

        // Start listening to notifications
        this.startNotificationsStream();
      }
    } catch (error) {
      console.error("Error initializing notification manager:", error);
      this.showError(
        "Please log in to view notifications. Redirecting to login..."
      );
      this.redirectToLogin();
    }
  }

  redirectToLogin() {
    // Use a relative path that works with your project structure
    const loginPaths = [
      "../login.html",
      "../../login.html",
      "/login.html",
      "login.html",
      "../index.html",
      "../../index.html",
      "/index.html",
      "index.html",
    ];

    // Try to find the correct login page
    let found = false;
    for (const path of loginPaths) {
      const link = document.createElement("a");
      link.href = path;
      // Check if this might be the correct path (basic check)
      if (!path.includes("undefined") && path.length > 0) {
        ////console.log('Attempting redirect to:', path);
        setTimeout(() => {
          window.location.href = path;
        }, 2000);
        found = true;
        break;
      }
    }

    if (!found) {
      // Last resort - go back to home
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  }

  setupHeaderProfile() {
    const profileElement = document.getElementById("header-profile");
    const user = auth.currentUser;

      const image = this.currentStudent.imageUrl;
      ////console.log("image is "+image);
    if (image) {
      profileElement.style.backgroundImage = `url('${image}')`;
      profileElement.classList.remove("loading-skeleton");
    } else if (user?.displayName) {
      // Generate default avatar
      const name = user.displayName;
      const initial = name.charAt(0).toUpperCase();
      const colors = ["607afb", "10b981", "f59e0b", "ef4444", "8b5cf6"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        initial
      )}&background=${color}&color=fff&size=40&bold=true`;

      profileElement.style.backgroundImage = `url('${avatarUrl}')`;
      profileElement.classList.remove("loading-skeleton");
    } else {
      // Fallback to a generic avatar
      profileElement.style.backgroundImage = `url('https://ui-avatars.com/api/?name=U&background=607afb&color=fff&size=40&bold=true')`;
      profileElement.classList.remove("loading-skeleton");
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchTab(tab.dataset.tab);
      });
    });

    // Dialog controls
    const closeDialogBtn = document.getElementById("close-dialog");
    const closeDialogBtn2 = document.getElementById("close-dialog-btn");
    const markReadBtn = document.getElementById("mark-read-btn");
    const dialog = document.getElementById("notification-dialog");

    if (closeDialogBtn) {
      closeDialogBtn.addEventListener("click", () => this.closeDialog());
    }
    if (closeDialogBtn2) {
      closeDialogBtn2.addEventListener("click", () => this.closeDialog());
    }
    if (markReadBtn) {
      markReadBtn.addEventListener("click", () => this.markAsRead());
    }
    if (dialog) {
      dialog.addEventListener("click", (e) => {
        if (e.target.id === "notification-dialog") {
          this.closeDialog();
        }
      });
    }
  }

  switchTab(tab) {
    this.currentTab = tab;

    // Update active tab styling
    document.querySelectorAll("[data-tab]").forEach((tabElement) => {
      if (tabElement.dataset.tab === tab) {
        tabElement.classList.add("border-primary", "text-primary");
        tabElement.classList.remove(
          "border-transparent",
          "text-gray-500",
          "dark:text-gray-400"
        );
      } else {
        tabElement.classList.remove("border-primary", "text-primary");
        tabElement.classList.add(
          "border-transparent",
          "text-gray-500",
          "dark:text-gray-400"
        );
      }
    });

    this.renderNotifications();
  }

  startNotificationsStream() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    ////console.log('Starting notifications stream for user:', this.currentStudentUid);

    // Add error handling for the notifications stream
    try {
      this.unsubscribe = unifiedNotificationsStream(
        this.currentStudentUid,
        (notifications) => {
          ////console.log('Received notifications:', notifications.length);
          this.notifications = notifications;
          this.isLoadingNotifications = false;
          ////console.log("isloadingNotifications is "+this.isLoadingNotifications );
          this.renderNotifications();
        }
      );
    } catch (error) {
      console.error("Error starting notifications stream:", error);
      this.showError(
        "Failed to load notifications stream. Please refresh the page."
      );
    }
  }

  renderNotifications() {
    const container = document.getElementById("notifications-container");
    const loading = document.getElementById("loading-state");
    const empty = document.getElementById("empty-state");

    if (this.isLoadingNotifications) {
      if (loading) loading.classList.remove("hidden");
      if (empty) empty.classList.add("hidden");
      if (container) container.classList.add("hidden");
      return;
    }

    // Hide loading
    if (loading) loading.classList.add("hidden");

    if (!container) {
      console.error("Notifications container not found");
      return;
    }

    if (this.notifications.length === 0) {
      container.classList.add("hidden");
      if (empty) empty.classList.remove("hidden");
      return;
    }

    if (empty) empty.classList.add("hidden");
    container.classList.remove("hidden");

    // Filter notifications based on current tab
    let filteredNotifications = this.notifications;
    if (this.currentTab === "unread") {
      // You can add read status to your notifications if needed
      // For now, we'll show all as we don't have read status
      filteredNotifications = this.notifications;
    } else if (this.currentTab === "archived") {
      // You can add archived status to your notifications if needed
      filteredNotifications = [];
    }

    container.innerHTML = filteredNotifications
      .map(
        (notification, index) => `
        <div class="notification-item relative flex cursor-pointer items-start gap-4 rounded-lg bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-background-dark/50 dark:hover:bg-background-dark"
             data-index="${index}">
          <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
            notification.type === "private"
              ? "bg-primary/10 text-primary"
              : "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
          }">
            <span class="material-symbols-outlined">
              ${this.getNotificationIcon(notification)}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 dark:text-white truncate">
              ${this.escapeHtml(notification.title)}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              ${this.escapeHtml(notification.body)}
            </p>
          </div>
          <div class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            ${this.formatTimeAgo(notification.timestamp)}
          </div>
          ${
            notification.type === "private"
              ? '<div class="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary"></div>'
              : ""
          }
        </div>
      `
      )
      .join("");

    // Add click event listeners to notification items
    container.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", () => {
        const index = parseInt(item.dataset.index);
        this.showNotificationDetails(this.notifications[index]);
      });
    });
  }

  getNotificationIcon(notification) {
    const icons = {
      private: "mark_email_unread",
      general: "campaign",
    };
    return icons[notification.type] || "notifications";
  }

  showNotificationDetails(notification) {
    this.selectedNotification = notification;

    const dialog = document.getElementById("notification-dialog");
    const icon = document.getElementById("dialog-icon");
    const title = document.getElementById("dialog-notification-title");
    const timestamp = document.getElementById("dialog-timestamp");
    const body = document.getElementById("dialog-body");

    if (!dialog || !icon || !title || !timestamp || !body) {
      console.error("Dialog elements not found");
      return;
    }

    // Update dialog content
    title.textContent = notification.title;
    timestamp.textContent = this.formatDetailedTime(notification.timestamp);
    body.textContent = notification.body;

    // Update icon based on notification type
    icon.className = `flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
      notification.type === "private"
        ? "bg-primary/10 text-primary"
        : "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
    }`;
    icon.innerHTML = `<span class="material-symbols-outlined text-lg">${this.getNotificationIcon(
      notification
    )}</span>`;

    // Show dialog
    dialog.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  closeDialog() {
    const dialog = document.getElementById("notification-dialog");
    if (dialog) {
      dialog.classList.add("hidden");
      document.body.style.overflow = "auto";
      this.selectedNotification = null;
    }
  }

  markAsRead() {
    if (this.selectedNotification) {
      // Here you would update the notification as read in Firestore
      // For now, we'll just close the dialog
      ////console.log("Marking as read:", this.selectedNotification);
      this.closeDialog();
    }
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }

  formatDetailedTime(timestamp) {
    return new Date(timestamp).toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    console.error("Notification Error:", message);
    // Create a temporary error message
    const errorDiv = document.createElement("div");
    errorDiv.className =
      "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(errorDiv)) {
        document.body.removeChild(errorDiv);
      }
    }, 5000);
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Unified notifications stream function
function unifiedNotificationsStream(studentUid, callback) {
  if (!studentUid) {
    console.error("No student UID provided for notifications stream");
    return () => {}; // Return empty cleanup function
  }

  ////console.log('Setting up notifications stream for:', studentUid);

  let privateUnsubscribe = null;
  let generalUnsubscribe = null;

  try {
    const privateQuery = query(
      collection(
        db,
        "users",
        "students",
        "students",
        studentUid,
        "notifications"
      ),
      orderBy("timestamp", "desc")
    );

    const generalQuery = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    let privateNotifications = [];
    let generalNotifications = [];

    const updateAndNotify = () => {
      const all = [...privateNotifications, ...generalNotifications];
      all.sort((a, b) => b.timestamp - a.timestamp);
      callback(all);
    };

    privateUnsubscribe = onSnapshot(
      privateQuery,
      async (snapshot) => {
        ////console.log('Private notifications updated:', snapshot.docs.length);

        // Use await with Promise.all to wait for all async operations
        privateNotifications = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            var company = null;
            var compName = "";

            if (data.senderId) {
              try {
                company = await companyCloud.getCompanyById(data.senderId);
                // Fixed the company check - your original condition was incorrect
                if (company && company.name && company.name !== "") {
                  compName = company.name;
                }
              } catch (error) {
                console.error("Error fetching company:", error);
                compName = "Unknown Company";
              }
            }

            return {
              title: compName
                ? `New Notification from ${compName}`
                : "New Notification",
              body: data.message || "No Message",
              timestamp: safeConvertToTimestamp(data.timestamp),
              type: "private",
              id: doc.id,
              docRef: doc.ref,
            };
          })
        );
        updateAndNotify();
      },
      (error) => {
        console.error("Error listening to private notifications:", error);
      }
    );

    generalUnsubscribe = onSnapshot(
      generalQuery,
      (snapshot) => {
        ////console.log('General notifications updated:', snapshot.docs.length);
        generalNotifications = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            title: data.title || "No Title",
            body: data.body || "No Message",
            timestamp: (data.createdAt?.toDate() || new Date()).getTime(),
            type: "general",
            id: doc.id,
            docRef: doc.ref,
          };
        });
        updateAndNotify();
      },
      (error) => {
        console.error("Error listening to general notifications:", error);
      }
    );
  } catch (error) {
    console.error("Error setting up notifications stream:", error);
  }

  // Return cleanup function
  return () => {
    ////console.log('Cleaning up notifications stream');
    if (privateUnsubscribe) privateUnsubscribe();
    if (generalUnsubscribe) generalUnsubscribe();
  };
}
// Initialize the notification manager when DOM is loaded
let notificationManager;
document.addEventListener("DOMContentLoaded", () => {
  notificationManager = new NotificationManager();
});

// Cleanup when leaving the page
window.addEventListener("beforeunload", () => {
  if (notificationManager) {
    notificationManager.destroy();
  }
});

