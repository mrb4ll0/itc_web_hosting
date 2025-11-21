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
  onSnapshot
} from "../config/firebaseInit.js";
import { StudentCloudDB } from "../fireabase/StudentCloud.js";
import { getNigerianIndustryDescription } from "../general/generalmethods.js";

const itc_firebase_logic = new ITCFirebaseLogic();
/** @type {import('../fireabase/CompanyCloud.js').CompanyCloud} */
const companyCloud = new CompanyCloud();
/** @type {import('../fireabase/StudentCloud.js').StudentCloudDB} */
const studentCloudDB = new StudentCloudDB();

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

  //******************************** Notification section **************************  */
  initializeNotificationTicker(studentUid) {
    const ticker = document.getElementById('notificationTicker');
    if (!ticker) {
      console.error("Notification ticker element not found");
      return;
    }
    
    console.log("Initializing notification ticker for student:", studentUid);

    // Set initial loading message
    ticker.innerHTML = `
      <div class="ticker-item flex items-center text-white text-sm font-medium">
        <span class="mr-2">⏳</span>
        Loading notifications...
      </div>
    `;

    // Set up the unified notifications stream
    this.notificationCleanup = unifiedNotificationsStream(studentUid, (notifications) => {
      console.log('Received notifications:', notifications.length);
      this.updateNotificationTicker(notifications);
    });
  }

  updateNotificationTicker(notifications) {
    const ticker = document.getElementById('notificationTicker');
    if (!ticker) return;

    // Clear existing content
    ticker.innerHTML = '';

    if (notifications.length === 0) {
      // Show default message when no notifications
      const defaultElement = document.createElement('div');
      defaultElement.className = 'ticker-item flex items-center text-white text-sm font-medium';
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
      .filter(notification => {
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return notification.timestamp >= oneDayAgo;
      })
      .slice(0, 10); // Limit to 10 most recent

    if (recentNotifications.length === 0) {
      const noRecentElement = document.createElement('div');
      noRecentElement.className = 'ticker-item flex items-center text-white text-sm font-medium';
      noRecentElement.innerHTML = `
        <span class="mr-2">📅</span>
        No recent notifications
      `;
      ticker.appendChild(noRecentElement);
      ticker.appendChild(noRecentElement.cloneNode(true));
      return;
    }

    // Convert notifications to ticker items
    recentNotifications.forEach(notification => {
      const notificationElement = this.createTickerItem(notification);
      ticker.appendChild(notificationElement);
      
      // Duplicate for seamless looping
      const duplicateElement = notificationElement.cloneNode(true);
      ticker.appendChild(duplicateElement);
    });

    console.log(`Ticker updated with ${recentNotifications.length} notifications`);
  }

  createTickerItem(notification,isDefault=false) {
    const element = document.createElement('div');
    element.className = 'ticker-item flex items-center text-white text-sm font-medium cursor-pointer';
    element.setAttribute('data-notification-id', notification.id);
    element.setAttribute('data-notification-type', notification.type);

    // Choose icon based on notification type and content
    const icon = this.getNotificationIcon(notification);
    const displayText = this.formatNotificationText(notification);

    element.innerHTML = `
      <span class="mr-2">${icon}</span>
      ${displayText}
    `;

    // Add click handler
    element.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering any parent click handlers
    
    if (isDefault) {
      // For default/no notifications message, always go to notifications page
      window.location.href = 'notifications.html';
    } else {
      // For actual notifications, use the smart routing
      this.handleNotificationClick(notification);
    }
    });

    return element;
  }

  getNotificationIcon(notification) {
    // Customize icons based on notification type and content
    if (notification.type === 'private') {
      const title = notification.title?.toLowerCase() || '';
      const body = notification.body?.toLowerCase() || '';
      
      if (title.includes('application') || body.includes('application')) {
        return '📄';
      } else if (title.includes('approved') || body.includes('approved')) {
        return '✅';
      } else if (title.includes('rejected') || body.includes('rejected')) {
        return '❌';
      } else if (title.includes('interview') || body.includes('interview')) {
        return '🎯';
      }
      return '🔔';
    } else {
      // General notifications
      const title = notification.title?.toLowerCase() || '';
      if (title.includes('workshop') || title.includes('training')) {
        return '🎓';
      } else if (title.includes('opportunity') || title.includes('hiring')) {
        return '💼';
      } else if (title.includes('deadline') || title.includes('closing')) {
        return '⏰';
      } else if (title.includes('career') || title.includes('fair')) {
        return '📅';
      }
      return '📢';
    }
  }

  formatNotificationText(notification) {
    const title = notification.title || 'Notification';
    const body = notification.body || '';
    
    // For private notifications, you might want to show different text
    if (notification.type === 'private') {
      return `${title}: ${body}`;
    } else {
      // For general notifications, show title and truncate body if needed
      const displayBody = body.length > 50 ? body.substring(0, 50) + '...' : body;
      return `${title} - ${displayBody}`;
    }
  }

  handleNotificationClick(notification) {
    console.log('Notification clicked:', notification);
    
    // You can implement different actions based on notification type
    switch (notification.type) {
      case 'private':
        // Redirect to applications page or show application details
        window.location.href = 'applications.html';
        break;
      case 'general':
        // Redirect to notifications page or show full notification
        window.location.href = 'notifications.html';
        break;
      default:
        window.location.href = 'notifications.html';
    }
  }

  // Cleanup method to be called when component is destroyed
  cleanup() {
    if (this.notificationCleanup) {
      this.notificationCleanup();
      console.log('Notification ticker cleaned up');
    }
  }
}

// Unified notifications stream function
function unifiedNotificationsStream(studentUid, callback) {
  if (!studentUid) {
    console.error('No student UID provided for notifications stream');
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
    console.error('Error setting up notifications stream:', error);
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
  return typeof timestamp === 'number' ? timestamp : Date.now();
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
window.addEventListener('beforeunload', () => {
  if (dashboardInstance) {
    dashboardInstance.cleanup();
  }
});