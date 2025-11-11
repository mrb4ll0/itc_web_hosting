import { ITCFirebaseLogic } from "../fireabase/ITCFirebaseLogic.js";
import { Student } from "../model/Student.js";
import { CompanyCloud } from "../fireabase/CompanyCloud.js";
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
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

document.addEventListener("DOMContentLoaded", () => {
  new ITCDashBoard();
});
