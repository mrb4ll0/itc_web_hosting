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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ITCFirebaseLogic } from "../../fireabase/ITCFirebaseLogic.js";
import { CompanyCloud } from "../../fireabase/CompanyCloud.js";
import { db, auth } from "../../config/firebaseInit.js";
import { StudentCloudDB } from "../../fireabase/StudentCloud.js";
import { getNigerianIndustryDescription } from "../../general/generalmethods.js";
import { CompanyReview } from "../../model/review.js";

/** @type {import('../../fireabase/ITCFirebaseLogic.js').ITCFirebaseLogic} */
const itc_firebase_logic = new ITCFirebaseLogic();
/** @type {import('../../fireabase/CompanyCloud.js').CompanyCloud} */
const companyCloud = new CompanyCloud();
/** @type {import('../fireabase/StudentCloud.js').StudentCloudDB} */
const studentCloudDB = new StudentCloudDB();

class CompanyProfile {
  constructor() {
    this.db = db;
    this.auth = auth;
    const params = new URLSearchParams(window.location.search);
    this.companyId = params.get("id");
    this.init();
  }

  init() {
    onAuthStateChanged(auth, async (user) => {
      ////console.log("Auth state changed. User:", user);
      if (user) {
        await this.loadCompanyProfile(user.uid);
      }
    });
  }

  async loadCompanyProfile(userId) {
    try {
      showLoadingOverlay("Loading company profile...");
      const company = await itc_firebase_logic.getCompany(this.companyId);
      this.company = company;

      if (company) {
        const companyData = company;
        this.renderCompanyProfile(companyData);
        // Load analytics after company profile is rendered
        await this.loadCompanyAnalytics(company);
      } else {
        ////console.log("No company profile found.");
        this.renderError("Company not found");
      }
    } catch (error) {
      console.error("Error loading company profile:", error);
      this.renderError("Error loading company profile");
    }
  }

  async loadCompanyAnalytics(company) {
    try {
      showLoadingOverlay("Loading company analytics...");
      
      // Get company analytics data
      const analytics = await companyCloud.getCompanyAnalytics(this.companyId);
      
      if (analytics) {
        this.renderCompanyAnalytics(analytics, company);
      } else {
        // If no analytics data, use default values
        this.renderCompanyAnalytics(this.getDefaultAnalytics(), company);
      }
      hideLoadingOverlay();
    } catch (error) {
      console.error("Error loading company analytics:", error);
      // Use default analytics if there's an error
      this.renderCompanyAnalytics(this.getDefaultAnalytics(), company);
      hideLoadingOverlay();
    }
  }

  getDefaultAnalytics() {
    return {
      studentsPerYear: 0,
      currentOpportunities: 0,
      totalApplications: 0,
      applicationsByRole: [],
      acceptanceRate: 0,
      isAcceptingApplications: false
    };
  }

  renderCompanyAnalytics(analytics, company) {
    // Update company status
    this.renderCompanyStatus(analytics.isAcceptingApplications);
    
    // Update key metrics
    this.renderKeyMetrics(analytics);
    
    // Update applications by role
    this.renderApplicationsByRole(analytics.applicationsByRole);
    
    // Update acceptance rate
    this.renderAcceptanceRate(analytics.acceptanceRate);
  }

  renderCompanyStatus(isAcceptingApplications) {
    const statusElement = document.getElementById("company-status");
    if (!statusElement) return;

    if (isAcceptingApplications) {
      statusElement.innerHTML = `
        <span class="material-symbols-outlined text-sm mr-2">check_circle</span>
        Currently Accepting Applications
      `;
      statusElement.className = "inline-flex items-center px-4 py-2 rounded-full text-white font-semibold text-sm status-open";
    } else {
      statusElement.innerHTML = `
        <span class="material-symbols-outlined text-sm mr-2">cancel</span>
        Currently Not Accepting Applications
      `;
      statusElement.className = "inline-flex items-center px-4 py-2 rounded-full text-white font-semibold text-sm status-closed";
    }
  }

  renderKeyMetrics(analytics) {
    // Students per year
    const studentsPerYearElement = document.getElementById("students-per-year");
    if (studentsPerYearElement) {
      studentsPerYearElement.textContent = analytics.studentsPerYear.toLocaleString();
    }

    // Current opportunities
    const currentOpportunitiesElement = document.getElementById("current-opportunities");
    if (currentOpportunitiesElement) {
      currentOpportunitiesElement.textContent = analytics.currentOpportunities.toLocaleString();
    }

    // Total applications
    const totalApplicationsElement = document.getElementById("total-applications");
    if (totalApplicationsElement) {
      totalApplicationsElement.textContent = analytics.totalApplications.toLocaleString();
    }
  }

  renderApplicationsByRole(applicationsByRole) {
    const container = document.getElementById("applications-by-role");
    if (!container) return;

    if (!applicationsByRole || applicationsByRole.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-500 dark:text-slate-400">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">bar_chart</span>
          <p>No application data available</p>
        </div>
      `;
      return;
    }

    // Find the maximum application count for scaling
    const maxApplications = Math.max(...applicationsByRole.map(item => item.count));

    container.innerHTML = applicationsByRole.map(role => `
      <div class="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              ${role.roleName}
            </span>
            <span class="text-sm text-slate-500 dark:text-slate-400 ml-2">
              ${role.count} applications
            </span>
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              class="bg-primary h-2 rounded-full progress-bar" 
              style="width: ${(role.count / maxApplications) * 100}%"
            ></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderAcceptanceRate(acceptanceRate) {
    const rateElement = document.getElementById("acceptance-rate");
    const barElement = document.getElementById("acceptance-bar");
    
    if (rateElement) {
      rateElement.textContent = `${acceptanceRate}%`;
    }
    
    if (barElement) {
      barElement.style.width = `${acceptanceRate}%`;
      
      // Color code based on acceptance rate
      if (acceptanceRate >= 50) {
        barElement.className = "bg-green-500 h-3 rounded-full progress-bar";
      } else if (acceptanceRate >= 25) {
        barElement.className = "bg-yellow-500 h-3 rounded-full progress-bar";
      } else {
        barElement.className = "bg-red-500 h-3 rounded-full progress-bar";
      }
    }
  }

  renderCompanyProfile(company) {
    // Update page title
    document.title = `IT Connect - ${company.name}`;

    showLoadingOverlay("Loading company details...");

    var company_image = document.getElementById("company-image");
    company_image.style.backgroundImage = `url('${company.logoURL}')`;

    // Update header company name
    const companyNameHeader = document.getElementById("header-name");
    if (companyNameHeader) {
      companyNameHeader.textContent = "IT Connect";
    }

    // Update main company name
    const mainCompanyName = document.getElementById("company-name");
    if (mainCompanyName) {
      mainCompanyName.textContent = company.name;
    }

    // Update overview section
    this.setupReviewsStream(company);

    // Update sidebar information
    this.renderSidebar(company);

    // Update opportunities (if any)
    this.renderOpportunities(company);
    this.renderOverview(company);

    // Render opportunities tab
    this.renderOpportunities(company);

    // Render review form
    this.initializeReviewForm(company);
    hideLoadingOverlay();
  }

  renderOverview(company) {
    const aboutSection = document.getElementById("about");
    const bigAbout = document.getElementById("about-header");
    if (aboutSection && company.industry) {
      const industryDescription =
        `${company.name} is a leading company in the ${company.industry} industry. We are dedicated to fostering innovation and providing cutting-edge solutions to businesses. Our mission is to empower organizations with the tools and expertise they need to thrive in the digital age.`;
        const aboutheader = company.name;

        aboutSection.textContent = industryDescription;
        bigAbout.textContent = "About "+aboutheader;
    }

    // Remove image rendering since we're using analytics now
    // this.renderCompanyImages(company);
  }

  renderSidebar(company) {
    // Update industry
    const industryElement = document.getElementById("industry");
    if (industryElement && company.industry) {
      industryElement.textContent = company.industry;
    }

    // Update locations
    const locationsElement = document.getElementById("locations");
    if (locationsElement) {
      const locations = [];
      if (company.state) locations.push(company.state);
      if (company.localGovernment) locations.push(company.localGovernment);
      if (company.address) locations.push(company.address);
      locationsElement.textContent =
        locations.length > 0 ? locations.join("; ") : "Location not specified";
    }

    // Update company size (you might want to add this field to your Company model)
    const sizeElement = document.getElementById("size");
    if (sizeElement) {
      // This is placeholder - you might want to add companySize to your Company model
      sizeElement.textContent = "Information not available";
    }

    // Update contact buttons
    this.updateContactButtons(company);
  }

  updateContactButtons(company) {
    const websiteButton = document.getElementById("website-button");
    const contactButton = document.getElementById("contact-button");

    if (websiteButton && company.email) {
      websiteButton.onclick = () => {
        // You might want to add website URL to your Company model
        window.open(`https://${company.email.split("@")[1]}`, "_blank");
      };
    }

    if (contactButton && company.email) {
      contactButton.onclick = () => {
        window.location.href = `mailto:${company.email}`;
      };
    }
  }

  async renderOpportunities(company) {
    var opportunitiesTab = document.getElementById("view-opportunities");
    if (!opportunitiesTab) {
      alert("an error occurred while switching");
      return;
    }

    try {
      // Get IT opportunities from the company
      const it_opportunities = await companyCloud.getAllITOfCompany(company.id);

      // Get the opportunities list container
      const opportunitiesList = document.getElementById("opportunitieslist");
      if (!opportunitiesList) {
        console.error("Opportunities list container not found");
        return;
      }

      // Clear existing content
      opportunitiesList.innerHTML = "";

      // Check if there are any opportunities
      if (!it_opportunities || it_opportunities.length === 0) {
        opportunitiesList.innerHTML = `
                <li class="p-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">work_outline</span>
                        <p class="text-slate-600 dark:text-slate-400 font-medium">No opportunities posted yet</p>
                        <p class="text-sm text-slate-500 dark:text-slate-500 mt-1">Check back later for new openings</p>
                    </div>
                </li>
            `;
        return;
      }

      // Render each opportunity
      it_opportunities.forEach((opportunity, index) => {
        const li = document.createElement("li");
        li.className =
          "p-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer";

        // Format the opportunity data
        const title = opportunity.title || "Untitled Position";
        const description =
          opportunity.description || "No description available.";
        const location =
          this.company.address +
            ", " +
            this.company.localGovernment +
            ", " +
            this.company.state || "Location not specified";
        const duration = opportunity.duration || "Duration not specified";

        const stipend = opportunity.stipend
          ? `₦${opportunity.stipend.toLocaleString()}`
          : "Not specified";
        const requirements =
          opportunity.eligibilityCriteria || "No specific requirements listed.";

        // Get status with appropriate styling
        const status = opportunity.status || "active";
        const statusColors = {
          active:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          closed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          draft:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        };
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        const statusClass =
          statusColors[status] ||
          "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
          const date = this.formatDate(
                      opportunity.postedAt
                    );


        li.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <span class="font-semibold text-primary text-lg">${title}</span>
                    <span class="text-xs px-2 py-1 rounded-full ${statusClass}">${statusText}</span>
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">${description}</p>
                
                <div class="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-500 mb-3">
                    <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">location_on</span>
                        <span>${location}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">schedule</span>
                        <span>${duration}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">payments</span>
                        <span>${stipend}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">school</span>
                        <span>${
                          opportunity.qualification ||
                          "Qualification Not specified"
                        }</span>
                    </div>
                </div>
                
                <div class="text-xs text-slate-600 dark:text-slate-400">
                    <strong>Requirements:</strong> ${requirements}
                </div>
                
                <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <span class="text-xs text-slate-500">Posted: ${date}</span>
                    <button class="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 view-details-btn">
                        View Details
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            `;

        // Add click event to the entire card
        li.addEventListener("click", (e) => {
          // Don't trigger if clicking the "View Details" button
          if (!e.target.closest(".view-details-btn")) {
            this.viewOpportunityDetails(opportunity, company);
          }
        });

        // Add click event to the "View Details" button
        const viewDetailsBtn = li.querySelector(".view-details-btn");
        viewDetailsBtn.addEventListener("click", (e) => {
          e.stopPropagation(); // Prevent the card click event
          this.viewOpportunityDetails(opportunity, company);
        });

        opportunitiesList.appendChild(li);
      });

      // Update the opportunities count in the tab if needed
      this.updateOpportunitiesTabCount(it_opportunities.length);
    } catch (error) {
      console.error("Error rendering opportunities:", error);
      const opportunitiesList = document.getElementById("opportunitieslist");
      if (opportunitiesList) {
        opportunitiesList.innerHTML = `
                <li class="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <span class="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
                        <p class="text-red-600 dark:text-red-400 font-medium">Error loading opportunities</p>
                        <p class="text-sm text-red-500 dark:text-red-500 mt-1">Please try again later</p>
                        <button onclick="window.location.reload()" class="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
                            Retry
                        </button>
                    </div>
                </li>
            `;
      }
    }
  }

  // Method to handle viewing opportunity details
  viewOpportunityDetails(opportunity, company) {
    this.showOpportunityModal(opportunity, company);
  }

  showOpportunityModal(opportunity, company) {
    //show a modal with detailed information
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
    modal.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white">${
                      opportunity.title || "Opportunity Details"
                    }</h3>
                    <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 close-modal">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-2">Description</h4>
                        <p class="text-slate-600 dark:text-slate-400">${
                          opportunity.description || "No description available."
                        }</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</h4>
                            <p class="text-slate-600 dark:text-slate-400">${
                              opportunity.location || "Not specified"
                            }</p>
                        </div>
                        <div>
                            <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration</h4>
                            <p class="text-slate-600 dark:text-slate-400">${
                              opportunity.duration || "Not specified"
                            }</p>
                        </div>
                        <div>
                            <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Stipend</h4>
                            <p class="text-slate-600 dark:text-slate-400">${
                              opportunity.stipend
                                ? `₦${opportunity.stipend.toLocaleString()}`
                                : "Not specified"
                            }</p>
                        </div>
                        <div>
                            <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-1">Qualification</h4>
                            <p class="text-slate-600 dark:text-slate-400">${
                              opportunity.qualification || "Any qualification"
                            }</p>
                        </div>
                    </div>
                    
                    ${
                      opportunity.requirements
                        ? `
                    <div>
                        <h4 class="font-semibold text-slate-700 dark:text-slate-300 mb-2">Requirements</h4>
                        <p class="text-slate-600 dark:text-slate-400">${opportunity.requirements}</p>
                    </div>
                    `
                        : ""
                    }
                    
                    <div class="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div>
                            <p class="text-sm text-slate-500">Posted by: ${
                              company.name
                            }</p>
                            <p class="text-xs text-slate-400">${this.formatDate(
                              opportunity.postedAt
                            )}</p>
                        </div>
                        <button id="apply" class="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                            Apply Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector(".close-modal").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    document.getElementById("apply").addEventListener("click", () => {
      window.location.href = "../dashboard/details/it_form_submission.html?id="+opportunity.id; 
    });
  }

  // Optional: Method to update the opportunities tab count
  updateOpportunitiesTabCount(count) {
    const opportunitiesTab = document.querySelector(
      '[data-tab="opportunities"]'
    );
    if (opportunitiesTab) {
      // Remove existing count badge if any
      const existingBadge =
        opportunitiesTab.querySelector(".opportunity-count");
      if (existingBadge) {
        existingBadge.remove();
      }

      if (count > 0) {
        const badge = document.createElement("span");
        badge.className =
          "opportunity-count ml-2 bg-primary text-white text-xs rounded-full px-2 py-1";
        badge.textContent = count;
        opportunitiesTab.appendChild(badge);
      }
    }
  }

  renderError(message) {
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-red-600 dark:text-red-400">${message}</h2>
            <p class="mt-4 text-slate-600 dark:text-slate-400">Please try again later.</p>
          </div>
        </div>
      `;
    }
  }

  async renderReview(company) {
    ////console.log("render reviews");
    const companyReviewElement = document.getElementById("view-reviews");
    if (!companyReviewElement) {
      alert("An error occurred while switching");
      return;
    }

    try {
      // Get the reviews list container
      const reviewsList = document.getElementById("review-list");
      if (!reviewsList) {
        console.error("Reviews list container not found");
        return;
      }

      // Show loading state
      reviewsList.innerHTML = `
            <li class="p-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                <div class="flex flex-col items-center justify-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                    <p class="text-slate-600 dark:text-slate-400">Loading reviews...</p>
                </div>
            </li>
        `;

      // Get reviews from the company
      const reviews = await this.getCompanyReviewsPromise(company.id);
      //console.log("company review is "+JSON.stringify(reviews));

      // Clear existing content
      reviewsList.innerHTML = "";

      // Check if there are any reviews
      if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = `
                <li class="p-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">reviews</span>
                        <p class="text-slate-600 dark:text-slate-400 font-medium">No reviews yet</p>
                        <p class="text-sm text-slate-500 dark:text-slate-500 mt-1">Be the first to review this company</p>
                    </div>
                </li>
            `;
        return;
      }

      // Calculate average rating
      const averageRating = this.calculateAverageRating(reviews);

      // Update the reviews header with average rating
      this.updateReviewsHeader(averageRating, reviews.length);

      // Render each review
      reviews.forEach((review, index) => {
        ////console.log("review is "+JSON.stringify(review));
        const li = document.createElement("li");
        li.className =
          "p-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200";

        li.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm">
                            ${
                              review.studentName
                                ? review.studentName.charAt(0).toUpperCase()
                                : "U"
                            }
                        </div>
                        <div>
                            <h4 class="font-semibold text-slate-900 dark:text-white">${
                              review.studentName || "Anonymous Student"
                            }</h4>
                            <div class="flex items-center gap-1 mt-1">
                                ${this.renderStarRating(review.rating)}
                                <span class="text-xs text-slate-500">${
                                  review.rating
                                }.0</span>
                            </div>
                        </div>
                    </div>
                    <span class="text-xs text-slate-500">${this.formatDate(
                      review.createdAt
                    )}</span>
                </div>
                
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed">${
                  review.comment || "No comment provided."
                }</p>
                
                ${
                  review.rating >= 4
                    ? `
                    <div class="flex items-center gap-1 mt-3 text-green-600 dark:text-green-400 text-sm">
                        <span class="material-symbols-outlined text-sm">thumb_up</span>
                        <span>Positive review</span>
                    </div>
                `
                    : review.rating <= 2
                    ? `
                    <div class="flex items-center gap-1 mt-3 text-red-600 dark:text-red-400 text-sm">
                        <span class="material-symbols-outlined text-sm">thumb_down</span>
                        <span>Critical review</span>
                    </div>
                `
                    : ""
                }
            `;

        reviewsList.appendChild(li);
      });
    } catch (error) {
      console.error("Error rendering reviews:", error);
      const reviewsList = document.getElementById("review-list");
      if (reviewsList) {
        reviewsList.innerHTML = `
                <li class="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
                    <div class="flex flex-col items-center justify-center">
                        <span class="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
                        <p class="text-red-600 dark:text-red-400 font-medium">Error loading reviews</p>
                        <p class="text-sm text-red-500 dark:text-red-500 mt-1">Please try again later</p>
                        <button onclick="companyProfile.renderReview(${JSON.stringify(
                          company
                        ).replace(
                          /"/g,
                          "&quot;"
                        )})" class="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
                            Retry
                        </button>
                    </div>
                </li>
            `;
      }
    }
  }

  // Helper method to convert stream-based getCompanyReviews to Promise
  getCompanyReviewsPromise(companyId) {
    return new Promise((resolve, reject) => {
      try {
        const unsubscribe = companyCloud.getCompanyReviews(
          companyId,
          (reviews) => {
            // Unsubscribe immediately after getting the first result
            unsubscribe();
            resolve(reviews);
          }
        );

        // Set timeout in case no reviews come back
        setTimeout(() => {
          unsubscribe();
          resolve([]);
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Calculate average rating from reviews
  calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10; // Round to 1 decimal place
  }

  // Render star rating display
  renderStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    let starsHtml = "";

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      starsHtml +=
        '<span class="material-symbols-outlined text-yellow-400 text-sm">star</span>';
    }

    // Half star
    if (hasHalfStar) {
      starsHtml +=
        '<span class="material-symbols-outlined text-yellow-400 text-sm">star_half</span>';
    }

    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      starsHtml +=
        '<span class="material-symbols-outlined text-yellow-400 text-sm">star</span>';
    }

    return starsHtml;
  }

  // Update reviews header with average rating and count
  updateReviewsHeader(averageRating, reviewCount) {
    const reviewsHeader = document.querySelector("#view-reviews h3");
    if (reviewsHeader) {
      if (reviewCount > 0) {
        reviewsHeader.innerHTML = `
                Reviews 
                <span class="inline-flex items-center gap-1 ml-2 text-sm font-normal">
                    ${this.renderStarRating(averageRating)}
                    <span class="text-slate-600 dark:text-slate-400">${averageRating} • ${reviewCount} review${
          reviewCount !== 1 ? "s" : ""
        }</span>
                </span>
            `;
      } else {
        reviewsHeader.textContent = "Reviews";
      }
    }
  }

  // Format date (reuse from previous method or define here)
  formatDate(date) {
    if (!date) return "Unknown date";
    ////console.log("createdDate is ", date);

    try {
      let d = null;

      if (date instanceof Date) {
        d = date;
      }
      else if (date && typeof date.toDate === "function") {
        try {
          d = date.toDate();
          if (!(d instanceof Date) || isNaN(d.getTime())) {
            throw new Error("Invalid date from toDate()");
          }
        } catch (error) {
          console.warn("toDate() failed, trying seconds/nanoseconds:", error);
          if (date.seconds !== undefined) {
            const ms = date.seconds * 1000 + (date.nanoseconds ? Math.round(date.nanoseconds / 1e6) : 0);
            d = new Date(ms);
          }
        }
      }
      else if (date && typeof date.seconds === "number") {
        const ms = date.seconds * 1000 + (date.nanoseconds ? Math.round(date.nanoseconds / 1e6) : 0);
        d = new Date(ms);
      }
      else if (typeof date === "number") {
        d = date < 1e12 ? new Date(date * 1000) : new Date(date);
      }
      else if (typeof date === "string") {
        d = new Date(date);
        if (isNaN(d.getTime())) {
          const cleaned = date.replace(/\s*\([^)]*\)$/, "");
          d = new Date(cleaned);
        }
      } else {
        console.warn("Unsupported date format:", date);
        return "Invalid date";
      }

      if (!d || isNaN(d.getTime())) {
        console.warn("formatDate: could not parse date:", date);
        return "Invalid date";
      }

      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return "Unknown date";
    }
  }

  setupReviewsStream(company) {
    if (this.reviewsUnsubscribe) {
      this.reviewsUnsubscribe(); // Clean up previous subscription
    }

    this.reviewsUnsubscribe = companyCloud.getCompanyReviews(
      company.id,
      (reviews) => {
        this.renderReviewList(reviews);
      }
    );
  }

  // Separate method to just render the list (for real-time updates)
  renderReviewList(reviews) {
    const reviewsList = document.getElementById("review-list");
    if (!reviewsList) return;

    // Clear existing content
    reviewsList.innerHTML = "";

    if (!reviews || reviews.length === 0) {
      reviewsList.innerHTML = `
            <li class="p-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                <div class="flex flex-col items-center justify-center">
                    <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">reviews</span>
                    <p class="text-slate-600 dark:text-slate-400 font-medium">No reviews yet</p>
                    <p class="text-sm text-slate-500 dark:text-slate-500 mt-1">Be the first to review this company</p>
                </div>
            </li>
        `;
      return;
    }

    // Calculate average rating
    const averageRating = this.calculateAverageRating(reviews);

    // Update the reviews header with average rating
    this.updateReviewsHeader(averageRating, reviews.length);

    // Render each review
    reviews.forEach((review) => {
      ////console.log("review timestamp ",review.createdAt);
      const li = document.createElement("li");
      li.className =
        "p-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200";
        const date = this.formatDate(
                  review.createdAt
                );

      li.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm">
                        ${
                          review.studentName
                            ? review.studentName.charAt(0).toUpperCase()
                            : "U"
                        }
                    </div>
                    <div>
                        <h4 class="font-semibold text-slate-900 dark:text-white">${
                          review.studentName || "Anonymous Student"
                        }</h4>
                        <div class="flex items-center gap-1 mt-1">
                            ${this.renderStarRating(review.rating)}
                            <span class="text-xs text-slate-500">${
                              review.rating
                            }.0</span>
                        </div>
                    </div>
                </div>
                <div class="class="flex flex-col items-end gap-1">
                <span class="text-xs text-slate-500">${date}</span>
                <button id=".delete-review-btn"
        class="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 delete-review-btn"
        data-review-id="${review.id}"
        title="Delete review"
      >
        <span class="material-symbols-outlined text-sm">delete</span> Delete
      </button>
      </div>
            </div>
            
            <p class="text-slate-700 dark:text-slate-300 leading-relaxed">${
              review.comment || "No comment provided."
            }</p>
            
            ${
              review.rating >= 4
                ? `
                <div class="flex items-center gap-1 mt-3 text-green-600 dark:text-green-400 text-sm">
                    <span class="material-symbols-outlined text-sm">thumb_up</span>
                    <span>Positive review</span>
                </div>
            `
                : review.rating <= 2
                ? `
                <div class="flex items-center gap-1 mt-3 text-red-600 dark:text-red-400 text-sm">
                    <span class="material-symbols-outlined text-sm">thumb_down</span>
                    <span>Critical review</span>
                </div>
            `
                : ""
            }
        `;

      reviewsList.appendChild(li);

      const deleteBtn = li.querySelector(".delete-review-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
          const reviewId = e.currentTarget.dataset.reviewId;

          if (confirm("Are you sure you want to delete this review?")) {
            try {
              await companyCloud.deleteCompanyReview(
                review.companyId,
                reviewId
              );
              ////console.log("Review deleted:", reviewId);
            } catch (error) {
              console.error("Failed to delete review:", error);
              alert("Failed to delete review. Please try again.");
            }
          }
        });
      }
    });
  }

  // Clean up method for real-time subscriptions
  cleanup() {
    if (this.reviewsUnsubscribe) {
      this.reviewsUnsubscribe();
    }
  }

  initializeReviewForm(company) {
    this.selectedRating = 0;
    const form = document.getElementById("review-form");
    const ratingStars = document.querySelectorAll(".rating-star");
    const ratingText = document.getElementById("rating-text");
    const selectedRatingSpan = document.getElementById("selected-rating");
    const commentTextarea = document.getElementById("review-comment");
    const charCount = document.getElementById("char-count");
    const submitButton = document.getElementById("submit-review");
    const cancelButton = document.getElementById("cancel-review");
    const formError = document.getElementById("form-error");
    const errorMessage = document.getElementById("error-message");

    // Rating star selection
    ratingStars.forEach((star, index) => {
      star.addEventListener("click", () => {
        this.selectedRating = index + 1;
        this.updateStarRating(this.selectedRating);
        this.updateSubmitButton();
      });

      star.addEventListener("mouseenter", () => {
        this.previewStarRating(index + 1);
      });
    });

    // Reset star preview when mouse leaves the rating container
    document
      .getElementById("rating-stars")
      .addEventListener("mouseleave", () => {
        this.updateStarRating(this.selectedRating);
      });

    // Character count for comment
    commentTextarea.addEventListener("input", (e) => {
      const length = e.target.value.length;
      charCount.textContent = length;

      // Update character count color
      if (length < 10) {
        charCount.className = "text-xs text-red-500";
      } else if (length > 450) {
        charCount.className = "text-xs text-yellow-500";
      } else {
        charCount.className = "text-xs text-slate-500";
      }

      this.updateSubmitButton();
    });

    // Form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.submitReview(
        company,
        this.selectedRating,
        commentTextarea.value
      );
    });

    // Cancel button
    cancelButton.addEventListener("click", () => {
      this.resetReviewForm();
    });

    // Initialize button state
    this.updateSubmitButton();
  }

  updateSubmitButton() {
    const commentTextarea = document.getElementById("review-comment");
    const submitButton = document.getElementById("submit-review");
    const selectedRating = this.selectedRating || 0;

    if (!commentTextarea || !submitButton) return;

    const isCommentValid = commentTextarea.value.length >= 10;
    const isRatingValid = selectedRating > 0;
    submitButton.disabled = !(isCommentValid && isRatingValid);
  }

  // Update star rating display
  updateStarRating(rating) {
    const stars = document.querySelectorAll(".rating-star");
    this.stars = stars;
    const ratingText = document.getElementById("rating-text");
    const selectedRatingSpan = document.getElementById("selected-rating");

    stars.forEach((star, index) => {
      const starIcon = star.querySelector(".material-symbols-outlined");
      if (index < rating) {
        starIcon.textContent = "star";
        starIcon.className =
          "material-symbols-outlined text-2xl text-yellow-400";
      } else {
        starIcon.textContent = "star";
        starIcon.className =
          "material-symbols-outlined text-2xl text-slate-300";
      }
    });

    // Update rating text
    if (rating > 0) {
      const ratingLabels = {
        1: "Poor",
        2: "Fair",
        3: "Good",
        4: "Very Good",
        5: "Excellent",
      };
      ratingText.textContent = "Your rating:";
      selectedRatingSpan.textContent = `${rating} - ${ratingLabels[rating]}`;
      selectedRatingSpan.className = "text-sm font-medium text-yellow-600";
      selectedRatingSpan.classList.remove("hidden");
    } else {
      ratingText.textContent = "Select a rating";
      selectedRatingSpan.classList.add("hidden");
    }
  }

  // Preview star rating on hover
  previewStarRating(rating) {
    const stars = document.querySelectorAll(".rating-star");
    stars.forEach((star, index) => {
      const starIcon = star.querySelector(".material-symbols-outlined");
      if (index < rating) {
        starIcon.className =
          "material-symbols-outlined text-2xl text-yellow-300";
      } else {
        starIcon.className =
          "material-symbols-outlined text-2xl text-slate-300";
      }
    });
  }

  // Reset the review form
  resetReviewForm() {
    this.selectedRating = 0;
    const commentTextarea = document.getElementById("review-comment");
    const charCount = document.getElementById("char-count");
    const formError = document.getElementById("form-error");

    this.updateStarRating(this.selectedRating);
    commentTextarea.value = "";
    charCount.textContent = "0";
    charCount.className = "text-xs text-slate-500";
    formError.classList.add("hidden");
    this.updateSubmitButton();
  }

  // Submit review to Firebase
  async submitReview(company, rating, comment) {
    const submitButton = document.getElementById("submit-review");
    const formError = document.getElementById("form-error");
    const errorMessage = document.getElementById("error-message");

    try {
      // Show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
            </div>
        `;

      // Get current user (you'll need to implement this based on your auth system)
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error("Please log in to submit a review");
      }

      // Create review object
      const review = new CompanyReview({
        id: this.generateReviewId(currentUser),
        companyId: company.id,
        studentId: currentUser.uid,
        studentName: currentUser.fullName || "Anonymous Student",
        comment: comment.trim(),
        rating: rating,
        createdAt: new Date(),
      });

      //console.log("review timestamp "+review.createdAt);

      // Submit to Firebase
      ////console.log("review before addCompanyReview ", review);
      await companyCloud.addCompanyReview(review);

      // Show success message
      this.showSuccessMessage("Review submitted successfully!");

      // Reset form
      this.resetReviewForm();

      // Reload reviews to show the new one
      setTimeout(() => {
        this.renderReview(company);
      }, 1000);

      // Reset button
      submitButton.disabled = false;
      submitButton.textContent = "Submit Review";
    } catch (error) {
      console.error("Error submitting review:", error);

      // Show error message
      formError.classList.remove("hidden");
      errorMessage.textContent =
        error.message || "Failed to submit review. Please try again.";

      // Reset button
      submitButton.disabled = false;
      submitButton.textContent = "Submit Review";
    }
  }

  // Show success message
  showSuccessMessage(message) {
    const form = document.getElementById("review-form");
    const successDiv = document.createElement("div");
    successDiv.className =
      "p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4";
    successDiv.innerHTML = `
        <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
            <span class="material-symbols-outlined text-sm">check_circle</span>
            <span class="text-sm">${message}</span>
        </div>
    `;

    form.insertBefore(successDiv, form.firstChild);

    // Remove success message after 3 seconds
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  generateReviewId(user) {
    return user.uid + Date.now();
  }

  async getCurrentUser() {
    return itc_firebase_logic.getStudent(auth.currentUser.uid);
  }
}

function showLoadingOverlay(message = "Loading company profile...") {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.querySelector("p").textContent = message;
    overlay.classList.remove("hidden");
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  showLoadingOverlay("Loading company profile...");
  new CompanyProfile();
});