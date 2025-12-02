import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ITCFirebaseLogic } from "../fireabase/ITCFirebaseLogic.js";
import { Student } from "../model/Student.js";
import { CompanyCloud } from "../fireabase/CompanyCloud.js";
import { db, auth } from "../config/firebaseInit.js";
import { StudentCloudDB } from "../fireabase/StudentCloud.js";
import { getNigerianIndustryDescription } from "../general/generalmethods.js";
import { ITBaseCompanyCloud } from "../fireabase/ITBaseCompanyCloud.js";

const itc_firebase_logic = new ITCFirebaseLogic();
/** @type {import('../fireabase/CompanyCloud.js').CompanyCloud} */
const companyCloud = new CompanyCloud();
/** @type {import('../fireabase/StudentCloud.js').StudentCloudDB} */
const studentCloudDB = new StudentCloudDB();
const itBaseCompanyCloud = new ITBaseCompanyCloud();

class StudentApplicationView {
  constructor() {
    this.init();
  }

  async init() {
    try {
      // Wait for auth to be ready
      await auth.authStateReady();

      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please log in to view applications");
        return;
      }

      // Get applications
      const applications = await companyCloud.getStudentInternships(
        currentUser.uid
      );

      var student = await itc_firebase_logic.getStudent(currentUser.uid);

      if (student) {
        const top_right_image = document.getElementById("right-image");
        top_right_image.style.backgroundImage = `url('${student.imageUrl}')`;
      }

      // Render applications in both table and mobile views
      ////console.log("Rendering applications:", applications);
      this.renderApplications(applications);
    } catch (error) {
      console.error("Error:", error);
      this.showError("Failed to load applications. Please try again.");
    }
  }

  renderApplications(applications) {
    const tableBody = document.getElementById("tablebody");
    const mobileListBody = document.getElementById("mobile-list-body");

    if (!tableBody || !mobileListBody) {
      console.error("Table body or mobile list body element not found");
      return;
    }

    // Clear existing content from both views
    tableBody.innerHTML = "";
    mobileListBody.innerHTML = "";

    if (applications.length === 0) {
      this.showNoApplications(tableBody, mobileListBody);
      return;
    }

    // Create table rows for desktop view
    applications.forEach((application) => {
      const row = this.createTableRow(application);
      tableBody.appendChild(row);
    });

    // Create mobile cards for mobile view
    applications.forEach((application) => {
      const card = this.createMobileCard(application);
      mobileListBody.appendChild(card);
    });
  }

  createTableRow(application) {
    const row = document.createElement("tr");

    // Format date
    let appDate;
    ////console.log("Application date raw:", application.appliedAt);

    if (application.appliedAt?.toDate) {
      // It's a Firebase Timestamp - convert to Date
      appDate = application.appliedAt.toDate();
    } else if (application.appliedAt instanceof Date) {
      // It's already a Date object
      appDate = application.appliedAt;
    } else {
      // Try to parse as string or use current date as fallback
      appDate = new Date(application.appliedAt);
    }

    const formattedDate = appDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

    // Get status badge HTML
    const statusBadge = this.getStatusBadge(application.applicationStatus);

    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
        ${this.escapeHtml(application.internship.company.name)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
        ${this.escapeHtml(application.internship.title)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${formattedDate}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        ${statusBadge}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button class="text-primary hover:text-primary/80 view-details-btn" 
                data-application='${this.escapeHtml(
                  JSON.stringify(application)
                )}'>
          View Details
        </button>
      </td>
    `;

    // Add event listener to the view details button
    const viewDetailsBtn = row.querySelector(".view-details-btn");
    viewDetailsBtn.addEventListener("click", () => {
      this.showApplicationDetails(application);
    });

    return row;
  }

  createMobileCard(application) {
    const card = document.createElement("div");
    card.className = "application-card";

    // Format date
    let appDate;
    if (application.appliedAt?.toDate) {
      appDate = application.appliedAt.toDate();
    } else if (application.appliedAt instanceof Date) {
      appDate = application.appliedAt;
    } else {
      appDate = new Date(application.appliedAt);
    }

    const formattedDate = appDate.toLocaleDateString("en-CA");
    const statusBadge = this.getStatusBadge(application.applicationStatus);

    card.innerHTML = `
      <div class="flex justify-between items-start mb-3">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            ${this.escapeHtml(application.internship.title)}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            ${this.escapeHtml(application.internship.company.name)}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Applied: ${formattedDate}
          </p>
        </div>
        <div class="ml-4 flex-shrink-0">
          ${statusBadge}
        </div>
      </div>
      <div class="flex justify-end">
        <button class="text-primary hover:text-primary/80 font-medium text-sm view-details-btn"
                data-application='${this.escapeHtml(
                  JSON.stringify(application)
                )}'>
          View Details →
        </button>
      </div>
    `;

    // Add event listener to the view details button
    const viewDetailsBtn = card.querySelector(".view-details-btn");
    viewDetailsBtn.addEventListener("click", () => {
      this.showApplicationDetails(application);
    });

    return card;
  }

  getStatusBadge(status) {
    const statusLower = status.toLowerCase();
    let badgeClass = "";
    let badgeText = status;

    switch (statusLower) {
      case "pending":
        badgeClass =
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
        break;
      case "accepted":
      case "approved":
        badgeClass =
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
        break;
      case "rejected":
      case "declined":
        badgeClass =
          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
        break;
      case "reviewed":
      case "under review":
        badgeClass =
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
        break;
      default:
        badgeClass =
          "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }

    return `<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badgeClass}">${badgeText}</span>`;
  }

  showNoApplications(tableBody, mobileListBody) {
    // Table view
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
          <div class="flex flex-col items-center justify-center">
            <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p class="text-lg font-medium">No applications found</p>
            <p class="text-sm mt-1">You haven't applied to any internships yet.</p>
          </div>
        </td>
      </tr>
    `;

    // Mobile view
    mobileListBody.innerHTML = `
      <div class="text-center py-12 text-gray-500 dark:text-gray-400">
        <svg class="w-12 h-12 text-gray-400 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-lg font-medium">No applications found</p>
        <p class="text-sm mt-1">You haven't applied to any internships yet.</p>
      </div>
    `;
  }

  showApplicationDetails(application) {
    // Format date for display
    const appDate = application.appliedAt?.toDate
      ? application.appliedAt.toDate()
      : new Date(application.appliedAt);
    const formattedDate = appDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const details = `
Company: ${application.internship.company.name}
Position: ${application.internship.title}
Application Date: ${formattedDate}
Status: ${application.applicationStatus.toUpperCase()}
Location: ${application.internship.address}, ${
      application.internship.company.localGovernment
    }, ${application.internship.company.state}
Start Date: ${application.duration.startDate}
End Date: ${application.duration.endDate}
Duration : ${application.duration.totalDays} days
Time: ${application.duration.time}
    `.trim();

    alert(details); // You can replace this with a proper modal
  }

  escapeHtml(unsafe) {
    if (typeof unsafe !== "string") return unsafe;
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  showError(message) {
    const tableBody = document.getElementById("tablebody");
    const mobileListBody = document.getElementById("mobile-list-body");

    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-8 text-center text-red-500 dark:text-red-400">
            <div class="flex flex-col items-center justify-center">
              <svg class="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-lg font-medium">Error Loading Applications</p>
              <p class="text-sm mt-1">${message}</p>
            </div>
          </td>
        </tr>
      `;
    }

    if (mobileListBody) {
      mobileListBody.innerHTML = `
        <div class="text-center py-12 text-red-500 dark:text-red-400">
          <svg class="w-12 h-12 text-red-400 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-lg font-medium">Error Loading Applications</p>
          <p class="text-sm mt-1">${message}</p>
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new StudentApplicationView();
});
