import { ITCFirebaseLogic } from "../fireabase/ITCFirebaseLogic.js";
import { Student } from "../model/Student.js";
import { CompanyCloud } from "../fireabase/CompanyCloud.js";
import { db, auth, onAuthStateChanged } from "../config/firebaseInit.js";
import { StudentCloudDB } from "../fireabase/StudentCloud.js";
import { getNigerianIndustryDescription, safeConvertToTimestamp } from "./generalmethods.js";
import { ITBaseCompanyCloud } from "../fireabase/ITBaseCompanyCloud.js";
const itc_firebase_logic = new ITCFirebaseLogic();
const it_base_company_cloud = new ITBaseCompanyCloud();
/** @type {import('../fireabase/CompanyCloud.js').CompanyCloud} */
const companyCloud = new CompanyCloud();
/** @type {import('../fireabase/StudentCloud.js').StudentCloudDB} */
const studentCloudDB = new StudentCloudDB();
class InternshipDetails {
  constructor() {
    this.internshipId = this.getInternshipIdFromURL();
    this.top_right_image = document.getElementById("top-right-image");

    onAuthStateChanged(auth, (user) => {
      if (user) {
        ////console.log("✅ User is signed in:", user.uid);
        this.loadStudentImage(user.uid);
      } else {
        console.warn("⚠️ No user signed in");
      }
    });
  }

  getInternshipIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
  }

  async loadStudentImage(userId) {
    try {
      const student = await itc_firebase_logic.getStudent(userId);
      if (student) {
        this.top_right_image.src =
          student.imageUrl || "../images/default-profile.png";
      }
    } catch (error) {
      console.error(" Error loading student image:", error);
    }
  }

  async init() {
    if (!this.internshipId) {
      this.showError("No internship ID provided");
      return;
    }

    await this.loadInternshipDetails();
  }

  async loadInternshipDetails() {
    try {
      this.showLoading();
      const internship = await companyCloud.getInternshipById(
        this.internshipId
      );
      const applications =
        await it_base_company_cloud.getApplicationsForIndustrialTraining(
          internship.company.id,
          internship.id
        );
      ////console.log("applications is "+JSON.stringify(applications));
      this.applicationsCount = applications.length;
      if (!internship) {
        this.showError("Internship not found");
        return;
      }

      this.renderInternshipDetails(internship);
    } catch (error) {
      console.error("Error loading industrial training details:", error);
      this.showError("Failed to load industrial training details");
    }
  }

  showLoading() {
    const container = document.getElementById("internship-details-container");
    if (container) {
      container.innerHTML = `
        <div class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-gray-600">Loading industrial training details...</span>
        </div>
      `;
    }
  }

  showError(message) {
    const container = document.getElementById("internship-details-container");
    if (container) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">${message}</h3>
          <button onclick="window.history.back()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Go Back to Opportunities
          </button>
        </div>
      `;
    }
  }

  

  formatCurrency(amount) {
    if (!amount) return "Unpaid";
    return `₦${amount.toLocaleString()}`;
  }

  renderInternshipDetails(internship) {
    ////console.log("main internship "+JSON.stringify(internship));
    const container = document.getElementById("internship-details-container");
    if (!container) return;
    //console.log("internship " + JSON.stringify(internship.eligibilityCriteria));
    //console.log("postedAt is " + internship.postedAt);
    //console.log("global application counts is " + this.applicationsCount);

    let appStatus;
    appStatus = internship.status;

    // Determine the greater number between internship.applicationsCount and this.applicationsCount
    const currentApplicationsCount = Math.max(
      internship.applicationsCount || 0,
      this.applicationsCount || 0
    );

    //console.log("Using application count: " + currentApplicationsCount);

    // Update application count (you might want to save this back to your database)
    this.applicationsCount = currentApplicationsCount;

    // Check if the new applications count equals or exceeds the intake capacity
    if (
      internship.intakeCapacity &&
      currentApplicationsCount >= internship.intakeCapacity
    ) {
      appStatus = "closed";
      internship.status = "closed";
      //console.log(
        `Application count (${currentApplicationsCount}) reached intake capacity (${internship.intakeCapacity}). Status set to: ${appStatus}`
      );
    } else {
      //console.log(
        `Application count (${currentApplicationsCount}) is below intake capacity (${internship.intakeCapacity}). Current status: ${appStatus}`
      );
    }

    container.innerHTML = `
      <div class="max-w-6xl mx-auto">
        <!-- Header Section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
          <div class="p-8">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div class="flex items-start space-x-6 flex-1">
                <img src="${
                  internship.company.logoURL ||
                  "../images/default-company-logo.jpg"
                }" 
                     alt="${internship.company.name}" 
                     class="w-20 h-20 rounded-xl object-cover border border-gray-200">
                <div class="flex-1">
                  <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">${
                    internship.title
                  }</h1>
                  <p class="text-xl text-blue-600 dark:text-blue-400 font-semibold mb-3">${
                    internship.company.name
                  }</p>
                 <div class="flex flex-wrap gap-3">
    <!-- Location Badge -->
    <span class="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
        📍 ${internship.company.address}, ${
      internship.company.localGovernment
    }, ${internship.company.state}
    </span>
    
    <!-- Applications & Slots Badge -->
    <span class="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
        👥 Applications: <strong class="ml-1">${
          internship.applicationsCount || 0
        }</strong>
    </span>
    
    <!-- Slots Left Badge -->
    <span class="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
        🎯 Slot left: <strong class="ml-1">${Math.max(
          0,
          (internship.intakeCapacity || 0) - (internship.applicationsCount || 0)
        )}</strong>
    </span>
    
    <!-- Status Badge -->
    <span class="inline-flex items-center px-3 py-1 ${
      appStatus === "open"
        ? "bg-green-100 text-green-800"
        : appStatus === "closed"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800"
    } rounded-full text-sm font-medium">
        Status: ${appStatus}
    </span>
    
    <!-- Industry Badge -->
    <span class="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
        🏢 ${internship.company.industry}
    </span>
    
    <!-- Stipend Badge (if available) -->
    ${
      internship.stipendAvailable
        ? `
        <span class="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            💰 ${this.formatCurrency(internship.stipend)}
        </span>
        `
        : ""
    }
</div>
                </div>
              </div>
              <div class="flex flex-col gap-3">
                <button onclick="internshipDetails.applyForInternship('${
                  internship.status
                }','${internship.title}','${internship.company.name}','${
      internship.id
    }','${internship.company.id}')" 
                        class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg shadow-md">
                  Apply Now
                </button>
                <button onclick="internshipDetails.saveInternship('${
                  internship.id
                }')" 
                        class="px-8 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium">
                  💾 Save for Later
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Description Section -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                📋 Training Description
              </h2>
              <div class="prose dark:prose-invert max-w-none">
                <p class="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  ${
                    internship.description ||
                    "No detailed description provided."
                  }
                </p>
              </div>
            </div>

            <!-- Requirements & Eligibility -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                🎯 Requirements & Eligibility
              </h2>
              <div class="space-y-4">
                ${
                  internship.eligibilityCriteria
                    ? `
                  <div>
                    <h3 class="font-semibold text-gray-700 dark:text-gray-300 mb-2">Eligibility Criteria:</h3>
                    <p class="text-gray-600 dark:text-gray-400 whitespace-pre-line">${internship.eligibilityCriteria}</p>
                  </div>
                `
                    : ""
                }
                
                <!-- You can add more specific requirements here if needed -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-center text-gray-600 dark:text-gray-400">
    <span class="mr-3">👥</span>
    <span class="mr-6">Applications: <strong class="text-gray-800 dark:text-gray-200">${
      internship.applicationsCount || 0
    }</strong></span>
    <span class="mr-3">🎯</span>
    <span>Slot left: <strong class="text-gray-800 dark:text-gray-200">${Math.max(
      0,
      (internship.intakeCapacity || 0) - (internship.applicationsCount || 0)
    )}</strong></span>
</div>
                  <div class="flex items-center text-gray-600 dark:text-gray-400">
                    <span class="mr-3">📊</span>
                    <span>Status: <strong class="text-gray-800 dark:text-gray-200 capitalize">${
                      internship.status
                    }</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Timeline Section -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                📅 Training Timeline
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-3">
                  <div class="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Start Date:</span>
                    <span class="text-blue-600 dark:text-blue-400 font-semibold">${this.formatTimestamp(
                      internship.startDate
                    )}</span>
                  </div>
                  <div class="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Duration:</span>
                    <span class="text-green-600 dark:text-green-400 font-semibold">${
                      internship.duration
                    }</span>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">End Date:</span>
                    <span class="text-purple-600 dark:text-purple-400 font-semibold">${this.formatTimestamp(
                      internship.endDate
                    )}</span>
                  </div>
                  <div class="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Stipend:</span>
                    <span class="text-orange-600 dark:text-orange-400 font-semibold">${
                      internship.stipendAvailable
                        ? this.formatCurrency(internship.stipend)
                        : "Unpaid"
                    }</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Company Info -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                🏢 About the Company
              </h2>
              <div class="space-y-4">
                <div class="flex items-center space-x-3">
                  <img src="${
                    internship.company.logoURL ||
                    "../images/default-company-logo.jpg"
                  }" 
                       alt="${internship.company.name}" 
                       class="w-12 h-12 rounded-lg object-cover">
                  <div>
                    <h3 class="font-semibold text-gray-800 dark:text-gray-100">${
                      internship.company.name
                    }</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${
                      internship.company.industry
                    }</p>
                  </div>
                </div>
                
                <div class="space-y-2 text-sm">
                  <div class="flex items-center text-gray-600 dark:text-gray-400">
                    <span class="mr-2">📍</span>
                    <span>${internship.company.address}, ${
      internship.company.localGovernment
    }</span>
                  </div>
                  <div class="flex items-center text-gray-600 dark:text-gray-400">
                    <span class="mr-2">🏙️</span>
                    <span>${internship.company.state} State</span>
                  </div>
                  ${
                    internship.company.email
                      ? `
                    <div class="flex items-center text-gray-600 dark:text-gray-400">
                      <span class="mr-2">📧</span>
                      <span>${internship.company.email}</span>
                    </div>
                  `
                      : ""
                  }
                  ${
                    internship.company.phoneNumber
                      ? `
                    <div class="flex items-center text-gray-600 dark:text-gray-400">
                      <span class="mr-2">📞</span>
                      <span>${internship.company.phoneNumber}</span>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Quick Actions</h2>
              <div class="space-y-3">
                <button onclick="internshipDetails.applyForInternship('${
                  internship.status
                }','${internship.title}','${internship.company.name}','${
      internship.id
    }','${internship.company.id}')" 
                        class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-center">
                  📄 Apply for this Position
                </button>
                <button onclick="internshipDetails.saveInternship('${
                  internship.id
                }')" 
                        class="w-full px-4 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-center">
                  💾 Save Training
                </button>
                <button onclick="window.print()" 
                        class="w-full px-4 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-center">
                  🖨️ Print Details
                </button>
                <button onclick="window.history.back()" 
                        class="w-full px-4 py-3 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium text-center">
                  ← Back to List
                </button>
              </div>
            </div>

            <!-- Posted Info -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">📋 Posting Information</h2>
              <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div class="flex justify-between">
                  <span>Posted:</span>
                  <span class="font-medium">${this.formatTimestamp(
                    internship.postedAt
                  )}</span>
                </div>
                <div class="flex justify-between">
                  <span>Last Updated:</span>
                  <span class="font-medium">${this.formatTimestamp(
                    internship.updatedAt
                  )}</span>
                </div>
                <div class="flex justify-between">
                  <span>Position:</span>
                  <span class="font-medium capitalize">${
                    internship.status
                  }</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

   formatTimestamp(timestamp) {
    if (!timestamp) {
        return 'Not specified';
    }
    
    const timestampMs = safeConvertToTimestamp(timestamp);
    const date = new Date(timestampMs);
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

  async applyForInternship(status, title, company, id, compid) {
    // Implement application logic
    ////console.log("Applying for status:"+JSON.stringify(status));
    ////console.log("Applying for title:"+JSON.stringify(title));
    ////console.log("Applying for company:"+JSON.stringify(company));

    // alert('Application feature coming soon!');
    try {
      const user = auth.currentUser;
      if (user) {
        // Check if the user is a student
        const isStudent = await studentCloudDB.isStudent(user.uid);
        const isITClosed = status.toLocaleLowerCase() == "closed";
        if (isITClosed) {
          alert(title + " from " + company + " is closed");
          await it_base_company_cloud.updateInternshipStatus(compid, id);
          return;
        }
        if (isStudent) {
          window.location.href = `it_form_submission.html?id=${id}`;
        } else {
          alert("Only students can apply for internships.");
        }
      } else {
        alert("You need to be logged in to apply for internships.");
      }
    } catch (error) {
      console.error("Error applying for internship:", error);
      alert("Failed to apply for internship. Please try again later.");
    }
  }

  async saveInternship(internshipId) {
    // Implement save logic
    ////console.log("Saving internship:", internshipId);
    //alert('Save feature coming soon!');
    try {
      const user = auth.currentUser;
      if (user) {
        // Save the internship ID to the user's saved internships
        await studentCloudDB.saveInternship(user.uid, internshipId);
        alert("Internship saved successfully!");
      } else {
        alert("You need to be logged in to save internships.");
      }
    } catch (error) {
      console.error("Error saving internship:", error);
      alert("Failed to save internship. Please try again later.");
    }
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", async () => {
  window.internshipDetails = new InternshipDetails();
  await window.internshipDetails.init();
});
