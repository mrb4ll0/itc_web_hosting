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
import { getNigerianIndustryDescription } from "./generalmethods.js";
const itc_firebase_logic = new ITCFirebaseLogic();
/** @type {import('../fireabase/CompanyCloud.js').CompanyCloud} */
const companyCloud = new CompanyCloud();
/** @type {import('../fireabase/StudentCloud.js').StudentCloudDB} */
const studentCloudDB = new StudentCloudDB();
class Opportunities {
  constructor() {
    //console.log("🚀 Opportunities constructor called");
    this.companyCloud = companyCloud;
    //console.log("CompanyCloud instance:", this.companyCloud);
    this.allInternships = [];
    this.filteredInternships = [];
    
    // Search and filter elements
    this.searchInput = document.getElementById('search-input');
    this.industryFilter = document.getElementById('industry-filter');
    this.locationFilter = document.getElementById('location-filter');
    this.durationFilter = document.getElementById('duration-filter');
    this.top_right_image = document.getElementById('top-right-image');

     onAuthStateChanged(auth, (user) => {
      if (user) {
        //console.log(" User is signed in:", user.uid);
        this.loadStudentImage(user.uid);
      } else {
        console.warn(" No user signed in");
        // Optional: redirect to login page or show default image
      }
    });
    
    //console.log("Search elements found:", {
    //   searchInput: !!this.searchInput,
    //   industryFilter: !!this.industryFilter,
    //   locationFilter: !!this.locationFilter,
    //   durationFilter: !!this.durationFilter
    // });
    
    this.setupEventListeners();
  }

  

  setupEventListeners() {
    //console.log("🔗 Setting up event listeners");
    
    // Search input with debouncing
    if (this.searchInput) {
      this.searchInput.addEventListener('input', this.debounce(() => {
        this.filterInternships();
      }, 300));
    }

    // Filter dropdowns
    if (this.industryFilter) {
      this.industryFilter.addEventListener('change', () => this.filterInternships());
    }
    if (this.locationFilter) {
      this.locationFilter.addEventListener('change', () => this.filterInternships());
    }
    if (this.durationFilter) {
      this.durationFilter.addEventListener('change', () => this.filterInternships());
    }
  }

  // Debounce function to limit search frequency
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async init() {
     await auth.authStateReady();
      if(!auth.currentUser)
      {
        alert("Account not found, kinldy login again");
        window.location.href = '../auth/login.html';
      }
    await this.loadOpportunities();
  }

  populateFilterOptions(internships) {
    //console.log("📊 Populating filter options with", internships.length, "internships");
    
    // Clear existing options (keep the first "All" option)
    [this.industryFilter, this.locationFilter, this.durationFilter].forEach(select => {
      if (select) {
        while (select.children.length > 1) {
          select.removeChild(select.lastChild);
        }
      }
    });

    // Populate industries
    const industries = [...new Set(internships.map(it => it.industry).filter(Boolean))];
    industries.forEach(industry => {
      const option = document.createElement('option');
      option.value = industry;
      option.textContent = industry;
      if (this.industryFilter) this.industryFilter.appendChild(option);
    });

    // Populate locations (states)
    const locations = [...new Set(internships.map(it => it.company.state).filter(Boolean))];
    locations.forEach(location => {
      const option = document.createElement('option');
      option.value = location;
      option.textContent = location;
      if (this.locationFilter) this.locationFilter.appendChild(option);
    });

    // Populate durations
    const durations = [...new Set(internships.map(it => it.duration).filter(Boolean))];
    durations.forEach(duration => {
      const option = document.createElement('option');
      option.value = duration;
      option.textContent = duration;
      if (this.durationFilter) this.durationFilter.appendChild(option);
    });
  }

  filterInternships() {
    //console.log("🔍 Filtering internships");
    const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
    const industry = this.industryFilter ? this.industryFilter.value : '';
    const location = this.locationFilter ? this.locationFilter.value : '';
    const duration = this.durationFilter ? this.durationFilter.value : '';

    this.filteredInternships = this.allInternships.filter(internship => {
      // Search term matching
      const matchesSearch = !searchTerm || 
        internship.title.toLowerCase().includes(searchTerm) ||
        internship.company.name.toLowerCase().includes(searchTerm) ||
        (internship.description && internship.description.toLowerCase().includes(searchTerm)) ||
        (internship.industry && internship.industry.toLowerCase().includes(searchTerm));

      // Industry filter
      const matchesIndustry = !industry || internship.industry === industry;

      // Location filter
      const matchesLocation = !location || internship.company.state === location;

      // Duration filter
      const matchesDuration = !duration || internship.duration === duration;

      return matchesSearch && matchesIndustry && matchesLocation && matchesDuration;
    });

    //console.log(`📈 Filtered to ${this.filteredInternships.length} internships`);
    this.renderOpportunities(this.filteredInternships);
  }


 renderOpportunities(internships) {
  //console.log("🎨 renderOpportunities called with:", internships);
  const container = document.getElementById("opportunities-container");
  
  if (!container) {
    console.error(" Container #opportunities-container not found!");
    return;
  }

  // Update count if exists
  const countElement = document.getElementById("it-count");
  if (countElement) {
    countElement.textContent = `Available Opportunities (${internships.length})`;
  }

  if (!internships || internships.length === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; text-align: center;">
        <img src="../../images/no-data.jpg" alt="No internships found" style="width: 8rem; height: 8rem; opacity: 0.7; margin-bottom: 1rem;">
        <h3 style="font-size: 1.125rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">
          No Internship Opportunities Found
        </h3>
        <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 1rem;">
          Try adjusting your search criteria or check back later for new IT placement postings.
        </p>
        <button onclick="window.opportunities.clearFilters()" style="margin-top: 1rem; padding: 0.5rem 1rem; background-color: #2563eb; color: white; border-radius: 0.5rem; border: none; cursor: pointer;">
          Clear Filters
        </button>
      </div>
    `;
    return;
  }
            //  internships.map(it=>
            //   //console.log("it "+it.company.logoURL+" company name "+it.company.name)
            //  );
  
   container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${internships.map(internship => `
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-shadow cursor-pointer p-6 opportunity-card"
               data-id="${internship.id}">
            <div class="flex items-start space-x-4 mb-4">
              <img src="${internship.company.logoURL || '../images/default-company-logo.jpg'}" 
                   alt="${internship.company.name}" 
                   class="w-12 h-12 rounded-lg object-cover border border-gray-200">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-800 dark:text-gray-100 text-lg mb-1">${internship.title}</h3>
                <p class="text-blue-600 dark:text-blue-400 font-medium">${internship.company.name}</p>
              </div>
            </div>
            
            <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <div class="flex items-center">
                <span class="mr-2">📍</span>
                <span>${internship.company.address}, ${internship.company.state}</span>
              </div>
              <div class="flex items-center">
                <span class="mr-2">⏱️</span>
                <span>${internship.duration || 'N/A'}</span>
              </div>
              <div class="flex items-center">
                <span class="mr-2">💰</span>
                <span>${internship.stipendAvailable ? '₦' + (internship.stipend?.toLocaleString() || '0') : 'Unpaid'}</span>
              </div>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                ${internship.status || 'Open'}
              </span>
              <button class="text-blue-600 hover:text-blue-800 font-medium text-sm">
                View Details →
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  this.addCardClickListeners();
}
  clearFilters() {
    //console.log("🧹 Clearing all filters");
    if (this.searchInput) this.searchInput.value = '';
    if (this.industryFilter) this.industryFilter.value = '';
    if (this.locationFilter) this.locationFilter.value = '';
    if (this.durationFilter) this.durationFilter.value = '';
    this.filterInternships();
  }

  addCardClickListeners() {
    const cards = document.querySelectorAll('.opportunity-card');
    //console.log(`🔗 Adding click listeners to ${cards.length} cards`);
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        const internshipId = e.currentTarget.dataset.id;
        //console.log("🖱️ Card clicked, internship ID:", internshipId);
        window.location.href = `details/it_details.html?id=${internshipId}`;
      });
    });
  }

  showError(message) {
    const container = document.getElementById("opportunities-container");
    if (container) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">${message}</h3>
          <button onclick="location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Try Again
          </button>
        </div>
      `;
    }
  }

   async loadStudentImage(studentId) {
    try {
      const studentDoc = await itc_firebase_logic.getStudent(studentId);
      if(studentDoc)
      {
         this.top_right_image.style.backgroundImage = `url(${studentDoc.imageUrl || '../images/default-profile.png'})`;
      }
    } catch (error) {
      console.error("❌ Error loading student image:", error);
    } 
  }

  async loadOpportunities() {
    
    try {
      
      
      this.companyCloud.getAllCompanyInternships((internships) => {
       
       this.top_right_image.style.display = 'block';
        
        if (!internships) {
          console.error("❌ Internships is null or undefined");
          this.showError("No data received from server");
          return;
        }
        
        if (!Array.isArray(internships)) {
          console.error("❌ Internships is not an array:", internships);
          this.showError("Invalid data format received");
          return;
        }
        
        this.allInternships = internships;
        this.filteredInternships = [...internships];
        this.renderOpportunities(this.filteredInternships);
        this.populateFilterOptions(internships);
      });
      
    } catch (error) {
      console.error("❌ Error loading opportunities:", error);
      this.showError("Failed to load opportunities: " + error.message);
    }
  }
}



document.addEventListener('DOMContentLoaded', async () => {
  //console.log("📄 DOM fully loaded");
  window.opportunities = new Opportunities();
  await window.opportunities.init();
});