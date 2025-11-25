import { ITCFirebaseLogic } from "../fireabase/ITCFirebaseLogic.js";
import { Student } from "../model/Student.js";
import { CompanyCloud } from "../fireabase/CompanyCloud.js";
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  query,
  collection,
  orderBy,
  onSnapshot,
} from "../config/firebaseInit.js";
import { StudentCloudDB } from "../fireabase/StudentCloud.js";
import {
  getNigerianIndustryDescription,
  hideLoadingDialog,
  showLoadingDialog,
} from "../general/generalmethods.js";
import { ITBaseCompanyCloud } from "../fireabase/ITBaseCompanyCloud.js";

const itc_firebase_logic = new ITCFirebaseLogic();
/** @type {import('../fireabase/CompanyCloud.js').CompanyCloud} */
const companyCloud = new CompanyCloud();
/** @type {import('../fireabase/StudentCloud.js').StudentCloudDB} */
const studentCloudDB = new StudentCloudDB();
const it_base_company_cloud = new ITBaseCompanyCloud();

export class ITCDashBoard {
  constructor() {
    //console.log("ITCDashBoard initialized");

    this.auth = auth;
    this.db = db;
    this.student = null;
    this.notificationCleanup = null;
    this.init();
  }

  async init() {
    await auth.authStateReady();
    let user = auth.currentUser;
    //console.log("Auth state changed. User:", user);
    if (user) {
      //console.log("User is signed in:", user.email);
      this.student = await itc_firebase_logic.getStudent(user.uid);
      if (this.student == null) {
        //console.log("student is null");
        alert("profile not founds you'll be logout");
        await signOut(auth);
        localStorage.removeItem("student");
        window.location.href = "../index.html";
      }
      //console.log(this.student.toMap());

      // Initialize notification ticker with real data
      this.initializeNotificationTicker(user.uid);
      this.activities = document.getElementById("activitiesLink");
      if (this.activities) {
        this.activities.addEventListener("click", async (e) => {
          
          const hasSelectedApplication =
            this.student?.selectedApplication != null &&
            this.student.selectedApplication !== "";

          if (hasSelectedApplication) {
            window.location.href = "../dashboard/activities.html";
          } else {
            const accepted = await this.chooseApplication();
            if (this.student.selectedApplication) {
              window.location.href = "../dashboard/activities.html";
            }
          }
        });
      }

      loadApplications();
      loadRecommendedCompanies();

      var studentName = document.getElementById("studentName");
      //console.log("studentName", studentName);
      if (studentName)
        studentName.textContent = this.student.fullName || "Student Name";
      var studentProfileImage = document.getElementById(
        "student_profile_image"
      );
      if (studentProfileImage) {
        const imageUrl =
          this.student.imageUrl ||
          getAvatarInitials(this.student.fullName, this.student.imageUrl);
        studentProfileImage.style.backgroundImage = `url('${imageUrl}')`;
      }
      var nameLabel = document.getElementById("welcomeMessage");
      if (nameLabel) {
        nameLabel.textContent = `Welcome back, ${
          this.student.fullName || "Student Name"
        }! Here's a summary of your industrial training journey.`;
      }
    } else {
      //console.log("No user is signed in, redirecting to login.");
      alert("An error occure , you'll be redirect to the login page");
      window.location.replace("../auth/login.html");
    }
  }

  async chooseApplication() {
    showLoadingDialog("Loading accepted applications");
    await auth.authStateReady();
    this.applications = await companyCloud.getStudentInternships(
      auth.currentUser.uid
    );

    this.acceptedApplications = this.applications.filter(
      (app) => app.applicationStatus === "accepted"
    );

    this.studentApplications = await Promise.all(
      this.acceptedApplications.map(async (app) => {
        return await it_base_company_cloud.getApplicationById(
          app.companyId,
          app.internship.id,
          app.applicationId
        );
      })
    );

    if (this.studentApplications.length === 0) {
      return false;
    }

    // If only one accepted application, auto-select it
    if (this.studentApplications.length === 1) {
      return await this.confirmApplicationSelection(
        this.studentApplications[0]
      );
    }

    // Show selection dialog for multiple applications
    return await this.showApplicationSelectionDialog();
  }

  async showApplicationSelectionDialog() {
    hideLoadingDialog();
    return new Promise((resolve) => {
      // Create modal HTML
      const modalHTML = `
            <div id="applicationSelectionModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 class="text-xl font-semibold text-gray-800 dark:text-white">
                            Choose Your Training
                        </h3>
                        <p class="text-gray-600 dark:text-gray-300 text-sm mt-1">
                            Select which Training you want to manage activities for.
                        </p>
                       <p class="flex items-center text-red-600 bg-red-50 rounded-lg p-3 text-sm">
    <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
    </svg>
    Kindly note this will only appear if no application have being selected before
</p>
                    </div>

                    <!-- Applications List -->
                    <div class="p-6 overflow-y-auto max-h-96">
                        <div class="space-y-4" id="applicationsList">
                            ${this.studentApplications
                              .map(
                                (app, index) => `
                                <div class="application-option border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                                     data-app-index="${index}">
                                    <div class="flex items-start justify-between">
                                        <div class="flex-1">
                                            <h4 class="font-semibold text-gray-800 dark:text-white text-lg">${
                                              app.internship.title ||
                                              "No Position"
                                            }</h4>
                                            <p class="text-gray-600 dark:text-gray-300 mt-1">${
                                              app.companyName ||
                                              "Unknown Company"
                                            }</p>
                                            
                                            <!-- Location -->
                                            <div class="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                                </svg>
                                                <span class="truncate">${this.getLocationString(
                                                  app.internship
                                                )}</span>
                                            </div>

                                            <!-- Duration -->
                                            ${
                                              app.duration?.startDate
                                                ? `
                                                <div class="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <svg class="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                    </svg>
                                                    <span>${this.formatDate(
                                                      app.duration.startDate
                                                    )} - ${this.formatDate(
                                                    app.duration.endDate
                                                  )}</span>
                                                </div>
                                            `
                                                : ""
                                            }

                                            <!-- Status Badge -->
                                            <div class="mt-3">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                                    ${app.applicationStatus}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <!-- Selection Indicator -->
                                        <div class="ml-4 flex items-center">
                                            <div class="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full transition-colors duration-200"></div>
                                        </div>
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-500 dark:text-gray-400">
                                ${this.studentApplications.length} internship${
        this.studentApplications.length > 1 ? "s" : ""
      } available
                            </span>
                            <div class="flex space-x-3">
                                <button id="cancelSelection" class="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-medium rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button id="confirmSelection" class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" disabled>
                                    Confirm Selection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

      // Add modal to page
      document.body.insertAdjacentHTML("beforeend", modalHTML);

      const modal = document.getElementById("applicationSelectionModal");
      let selectedApplication = null;

      // Add event listeners
      const applicationOptions = document.querySelectorAll(
        ".application-option"
      );
      const confirmButton = document.getElementById("confirmSelection");
      const cancelButton = document.getElementById("cancelSelection");

      // Handle application selection
      applicationOptions.forEach((option) => {
        option.addEventListener("click", (e) => {
          // Remove selection from all options
          applicationOptions.forEach((opt) => {
            opt.classList.remove(
              "border-blue-500",
              "bg-blue-50",
              "dark:bg-blue-900/20"
            );
            opt
              .querySelector(".w-5")
              .classList.remove("border-blue-500", "bg-blue-500");
            opt
              .querySelector(".w-5")
              .classList.add("border-gray-300", "dark:border-gray-600");
          });

          // Add selection to clicked option
          option.classList.add(
            "border-blue-500",
            "bg-blue-50",
            "dark:bg-blue-900/20"
          );
          option
            .querySelector(".w-5")
            .classList.add("border-blue-500", "bg-blue-500");
          option
            .querySelector(".w-5")
            .classList.remove("border-gray-300", "dark:border-gray-600");

          // Enable confirm button
          confirmButton.disabled = false;

          // Store selected application
          const appIndex = option.getAttribute("data-app-index");
          selectedApplication = this.studentApplications[appIndex];
        });
      });

      // Handle confirm selection
      confirmButton.addEventListener("click", async () => {
        if (selectedApplication) {
          modal.remove();
          const success = await this.confirmApplicationSelection(
            selectedApplication
          );
          resolve(success);
        }
      });

      // Handle cancel
      cancelButton.addEventListener("click", () => {
        modal.remove();
        resolve(false);
      });

      // Close modal when clicking outside
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve(false);
        }
      });

      // Close modal with Escape key
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          modal.remove();
          document.removeEventListener("keydown", handleEscape);
          resolve(false);
        }
      };
      document.addEventListener("keydown", handleEscape);
    });
  }

  async confirmApplicationSelection(application) {
    try {
      // Store the selected application
      this.selectedApplication = application;
      await auth.authStateReady();
      await studentCloudDB.setSelectedApplication(
        auth.currentUser.uid,
        application.id
      );

        if(!this.student)
        {
          alert("try again, student data is not available currently");
          return;
        }
      this.student.selectedApplication = application.id;

      // Show success message
      this.showSuccessMessage(
        `You've selected ${application.position} at ${application.companyName}`
      );

      return true;
    } catch (error) {
      console.error("Error confirming application selection:", error);
      this.showErrorMessage("Failed to save your selection. Please try again.");
      return false;
    }
  }

  // Utility methods
  getLocationString(internship) {
    if (!internship.company) return "Location not specified";

    const { address, localGovernment, state } = internship.company;
    const locationParts = [address, localGovernment, state].filter(
      (part) => part && part.trim()
    );
    return locationParts.join(", ") || "Location not specified";
  }

  formatDate(date) {
    if (!date) return "Not set";
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  showSuccessMessage(message) {
    this.showToast(message, 'success');
}

showErrorMessage(message) {
    this.showToast(message, 'error');
}

showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${
        type === 'success' ? 'border-green-500' :
        type === 'error' ? 'border-red-500' :
        type === 'warning' ? 'border-yellow-500' :
        'border-blue-500'
    }`;
    
    // Icon based on type
    const icons = {
        success: `
            <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
        `,
        error: `
            <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
        `,
        warning: `
            <svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
        `,
        info: `
            <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
        `
    };

    toast.innerHTML = `
        <div class="p-4">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    ${icons[type]}
                </div>
                <div class="ml-3 w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                        ${message}
                    </p>
                </div>
                <div class="ml-4 flex-shrink-0 flex">
                    <button class="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none close-toast">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add to page
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 10);

    // Auto remove after 5 seconds
    const autoRemove = setTimeout(() => {
        this.removeToast(toast);
    }, 5000);

    // Close button event
    toast.querySelector('.close-toast').addEventListener('click', () => {
        clearTimeout(autoRemove);
        this.removeToast(toast);
    });

    // Also remove on click
    toast.addEventListener('click', (e) => {
        if (e.target.closest('.close-toast')) return;
        clearTimeout(autoRemove);
        this.removeToast(toast);
    });
}

removeToast(toast) {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

  //******************************** Notification section **************************  */
  initializeNotificationTicker(studentUid) {
    const ticker = document.getElementById("notificationTicker");
    if (!ticker) {
      console.error("Notification ticker element not found");
      return;
    }


    // Set initial loading message
    ticker.innerHTML = `
      <div class="ticker-item flex items-center text-white text-sm font-medium">
        <span class="mr-2">⏳</span>
        Loading notifications...
      </div>
    `;

    // Set up the unified notifications stream
    this.notificationCleanup = unifiedNotificationsStream(
      studentUid,
      (notifications) => {
        this.updateNotificationTicker(notifications);
      }
    );
  }

  updateNotificationTicker(notifications) {
    const ticker = document.getElementById("notificationTicker");
    if (!ticker) return;

    // Clear existing content
    ticker.innerHTML = "";

    if (notifications.length === 0) {
      // Show default message when no notifications
      const defaultElement = document.createElement("div");
      defaultElement.className =
        "ticker-item flex items-center text-white text-sm font-medium";
      defaultElement.innerHTML = `
        <span class="mr-2">📢</span>
        No new notifications - Check back later for updates!
      `;
      ticker.appendChild(defaultElement);

      // Duplicate for seamless looping
      const duplicateElement = defaultElement.cloneNode(true);
      ticker.appendChild(duplicateElement);
      return;
    }

    // Filter to show only recent notifications (last 24 hours or limit to 10)
    const recentNotifications = notifications
      .filter((notification) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return notification.timestamp >= oneDayAgo;
      })
      .slice(0, 10); // Limit to 10 most recent

    if (recentNotifications.length === 0) {
      const noRecentElement = document.createElement("div");
      noRecentElement.className =
        "ticker-item flex items-center text-white text-sm font-medium";
      noRecentElement.innerHTML = `
        <span class="mr-2">📅</span>
        No recent notifications
      `;
      ticker.appendChild(noRecentElement);
      ticker.appendChild(noRecentElement.cloneNode(true));
      return;
    }

    // Convert notifications to ticker items
    recentNotifications.forEach((notification) => {
      const notificationElement = this.createTickerItem(notification);
      ticker.appendChild(notificationElement);

      // Duplicate for seamless looping
      const duplicateElement = notificationElement.cloneNode(true);
      ticker.appendChild(duplicateElement);
    });

  }

  createTickerItem(notification, isDefault = false) {
    const element = document.createElement("div");
    element.className =
      "ticker-item flex items-center text-white text-sm font-medium cursor-pointer";
    element.setAttribute("data-notification-id", notification.id);
    element.setAttribute("data-notification-type", notification.type);

    // Choose icon based on notification type and content
    const icon = this.getNotificationIcon(notification);
    const displayText = this.formatNotificationText(notification);

    element.innerHTML = `
      <span class="mr-2">${icon}</span>
      ${displayText}
    `;

    // Add click handler
    element.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering any parent click handlers

      if (isDefault) {
        // For default/no notifications message, always go to notifications page
        window.location.href = "notifications.html";
      } else {
        // For actual notifications, use the smart routing
        this.handleNotificationClick(notification);
      }
    });

    return element;
  }

  getNotificationIcon(notification) {
    // Customize icons based on notification type and content
    if (notification.type === "private") {
      const title = notification.title?.toLowerCase() || "";
      const body = notification.body?.toLowerCase() || "";

      if (title.includes("application") || body.includes("application")) {
        return "📄";
      } else if (title.includes("approved") || body.includes("approved")) {
        return "✅";
      } else if (title.includes("rejected") || body.includes("rejected")) {
        return "❌";
      } else if (title.includes("interview") || body.includes("interview")) {
        return "🎯";
      }
      return "🔔";
    } else {
      // General notifications
      const title = notification.title?.toLowerCase() || "";
      if (title.includes("workshop") || title.includes("training")) {
        return "🎓";
      } else if (title.includes("opportunity") || title.includes("hiring")) {
        return "💼";
      } else if (title.includes("deadline") || title.includes("closing")) {
        return "⏰";
      } else if (title.includes("career") || title.includes("fair")) {
        return "📅";
      }
      return "📢";
    }
  }

  formatNotificationText(notification) {
    const title = notification.title || "Notification";
    const body = notification.body || "";

    // For private notifications, you might want to show different text
    if (notification.type === "private") {
      return `${title}: ${body}`;
    } else {
      // For general notifications, show title and truncate body if needed
      const displayBody =
        body.length > 50 ? body.substring(0, 50) + "..." : body;
      return `${title} - ${displayBody}`;
    }
  }

  handleNotificationClick(notification) {

    // You can implement different actions based on notification type
    switch (notification.type) {
      case "private":
        // Redirect to applications page or show application details
        window.location.href = "applications.html";
        break;
      case "general":
        // Redirect to notifications page or show full notification
        window.location.href = "notifications.html";
        break;
      default:
        window.location.href = "notifications.html";
    }
  }

  // Cleanup method to be called when component is destroyed
  cleanup() {
    if (this.notificationCleanup) {
      this.notificationCleanup();
    }
  }
}

// Unified notifications stream function
function unifiedNotificationsStream(studentUid, callback) {
  if (!studentUid) {
    console.error("No student UID provided for notifications stream");
    return () => {}; // Return empty cleanup function
  }

  //console.log('Setting up notifications stream for:', studentUid);

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
      (snapshot) => {
        //console.log('Private notifications updated:', snapshot.docs.length);
        privateNotifications = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            title: data.status || "No Title",
            body: data.message || "No Message",
            timestamp: safeConvertToTimestamp(data.timestamp),
            type: "private",
            id: doc.id,
            docRef: doc.ref,
          };
        });
        updateAndNotify();
      },
      (error) => {
        console.error("Error listening to private notifications:", error);
      }
    );

    generalUnsubscribe = onSnapshot(
      generalQuery,
      (snapshot) => {
        //console.log('General notifications updated:', snapshot.docs.length);
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
    //console.log('Cleaning up notifications stream');
    if (privateUnsubscribe) privateUnsubscribe();
    if (generalUnsubscribe) generalUnsubscribe();
  };
}

// Helper function to safely convert timestamps
function safeConvertToTimestamp(timestamp) {
  if (!timestamp) return Date.now();
  if (timestamp.toDate) return timestamp.toDate().getTime();
  if (timestamp.getTime) return timestamp.getTime();
  return typeof timestamp === "number" ? timestamp : Date.now();
}

async function loadApplications() {
  try {
    await auth.authStateReady();
    if (!auth.currentUser) {
      console.error("No user is currently logged in");
      return;
    }
    //console.log("auth " + !auth.currentUser);
    const applications = await companyCloud.getStudentInternships(
      auth.currentUser.uid
    );

    const tbody = document.getElementById("applicationsTableBody");

    if (!tbody) {
      console.error("Applications table body not found");
      return;
    }

    tbody.innerHTML = ""; // clear old rows

    if (applications.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-4 text-center text-subtle-light dark:text-subtle-dark">
            No pending applications found.
          </td>
        </tr>
      `;
      return;
    }

    applications.forEach((app) => {
      const row = document.createElement("tr");

      // Access the properties correctly - they're now objects, not arrays
      const student = app.student;
      const internship = app.internship;

      // Compute dynamic status style
      const statusStyles = {
        accepted: "bg-primary/10 text-primary dark:bg-primary/20",
        pending:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
        rejected:
          "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
      };

      // Use application status, not internship status

      const statusClass =
        statusStyles[app.applicationStatus] || "bg-gray-100 text-gray-700";
      //console.log("application status is " + app.applicationStatus);

      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap font-medium">
          ${internship.company?.name || "Unknown Company"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-subtle-light dark:text-subtle-dark">
          ${internship.role || internship.title || "No role specified"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClass}">
            ${app.applicationStatus}
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading applications:", error);
    const tbody = document.getElementById("applicationsTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-4 text-center text-red-600">
            Error loading applications: ${error.message}
          </td>
        </tr>
      `;
    }
  }
}

document
  .getElementById("logoutBtn")
  .addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      //console.log("user is about to signout");
      await signOut(auth);
      localStorage.removeItem("student");
      //console.log("User signed out successfully.");
      window.location.href = "../index.html";
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Logout failed. Please try again.");
    }
  });

async function loadRecommendedCompanies() {
  const container = document.getElementById("recommendedcompany");

  try {
    studentCloudDB.getAllCompanies((companies) => {
      // Clear container and remove loading indicator ONCE, before adding companies
      container.innerHTML = "";

      if (!companies || companies.length === 0) {
        container.innerHTML = `
          <div class="flex justify-center items-center py-8">
            <span class="text-gray-500 dark:text-gray-300">No companies found</span>
          </div>
        `;
        return;
      }

      companies.forEach((company) => {
        const html = `
          <a href="${decideAndReturnURL(
            company
          )}" class="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center space-x-4 hover:shadow-lg transition">
            <img src="${company.logoURL || "/default-logo.png"}" alt="${
          company.name
        }"
                 class="w-12 h-12 rounded-full object-cover border border-gray-300">
            <div>
              <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${
                company.name
              }</h3>
              <p class="text-gray-500 dark:text-gray-400 text-sm">${getNigerianIndustryDescription(
                company.industry
              )}</p>
            </div>
          </a>
        `;
        container.insertAdjacentHTML("beforeend", html);
      });
    });
  } catch (error) {
    console.error("Error loading companies:", error);
    container.innerHTML = `
      <div class="text-center text-red-500 text-sm">
        Failed to load companies. Please try again later.
      </div>
    `;
  }
}

function decideAndReturnURL(company) {
  //console.log("Company ID:", company.id);
  return `../dashboard/company_profile.html?id=${company.id}`;
}

// Global reference to dashboard instance
let dashboardInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  dashboardInstance = new ITCDashBoard();
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (dashboardInstance) {
    dashboardInstance.cleanup();
  }
});
