// company_profile.js
import { CompanyCloud } from "../fireabase/CompanyCloud.js";
import { db, auth } from "../config/firebaseInit.js";
import { StudentCloudDB } from "../fireabase/StudentCloud.js";
import { ITCFirebaseLogic } from "../fireabase/ITCFirebaseLogic.js";
const companyCloud = new CompanyCloud();
const itc_firebase_logic = new ITCFirebaseLogic();

class FeaturedCompany {
    constructor() {
        this.init();
    }

    async init() {
        try {
            // Load featured companies
            await this.loadFeaturedCompanies();
            
            // Set up search functionality
            this.setupSearch();
            
        } catch (error) {
            console.error("Error initializing company profile view:", error);
            this.showError("Failed to load companies. Please try again.");
        }
    }

    async loadFeaturedCompanies() {
        try {
            this.showLoading();
             await auth.authStateReady();
            const companies = await companyCloud.getFeaturedCompanies();
            const student = await companyCloud.getCurrentStudent();
             
        const right_image = document.getElementById("left-image");
        if (right_image && student && student.imageUrl) {
            
            right_image.style.backgroundImage = `url('${student.imageUrl}')`;
            right_image.onerror = () => {
                console.warn("Failed to load student image, using placeholder");
                right_image.style.backgroundImage = `url('${this.generateDefaultAvatar(student)}')`;
            };
        } else if (right_image && student) {
            right_image.style.backgroundImage = `url('${this.generateDefaultAvatar(student)}')`;
        } else if (right_image) {
            right_image.style.backgroundImage = `url('${this.generateDefaultAvatar()}')`;
        }
        
             right_image.style.backgroundImage = `src('${student.imageURL}')`
            ////console.log("Loaded companies:", companies);
            
            this.renderCompanies(companies);
            
        } catch (error) {
            console.error("Error loading featured companies:", error);
            this.showError("Failed to load companies. Please try again.");
        }
    }

    renderCompanies(companies) {
        const container = document.getElementById('featured_company');
        
        if (!container) {
            console.error('Featured company container not found');
            return;
        }

        if (companies.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="flex flex-col items-center justify-center">
                        <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        <p class="text-lg font-medium text-gray-900 dark:text-white">No Companies Found</p>
                        <p class="text-gray-500 dark:text-gray-400 mt-1">Check back later for new opportunities.</p>
                    </div>
                </div>
            `;
            return;
        }

        const companiesHTML = companies.map(company => this.createCompanyCard(company)).join('');
        container.innerHTML = companiesHTML;

        // Add click event listeners to all company cards
        this.setupCompanyCardEvents();
    }
createCompanyCard(company) {
    const logoUrl = company.logoURL || this.generateRoundPlaceholder(company.name);
    const description = company.tagline || company.description || "Leading company offering great opportunities.";
    const companyId = company.id || this.generateCompanyId(company.name);

    return `
        <div class="group relative flex flex-col rounded-xl bg-white/60 dark:bg-gray-900/50 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-800 w-full min-h-[340px] overflow-hidden">
            <a aria-label="View ${this.escapeHtml(company.name)}"
               class="absolute inset-0 z-10 view-company-btn"
               href="../dashboard/company_profile.html?id=${companyId}"
               data-company-id="${companyId}">
            </a>

            <!-- Full-width large image taking most of the card space -->
            <div class="relative w-full h-[220px] flex-shrink-0 overflow-hidden rounded-t-xl">
                <img alt="${this.escapeHtml(company.name)} logo"
                     class="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                     src="${logoUrl}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='${this.generateCurvedPlaceholder(company.name)}'">
            </div>

            <!-- Minimal content area -->
            <div class="flex flex-col flex-grow text-center px-4 py-3 space-y-2">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary line-clamp-1">
                    ${this.escapeHtml(company.name)}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    ${this.escapeHtml(description)}
                </p>
                <div class="flex-shrink-0 pt-1">
                    ${this.renderCompanyBadges(company)}
                </div>
            </div>
        </div>
    `;
}

// Placeholder generator with larger rectangular size
generateCurvedPlaceholder(companyName) {
    const colors = [
        '607afb', // Blue
        '10b981', // Green
        'f59e0b', // Amber
        'ef4444', // Red
        '8b5cf6', // Purple
        '06b6d4', // Cyan
        'f97316'  // Orange
    ];
    const color = colors[companyName.charCodeAt(0) % colors.length];
    const initial = companyName.charAt(0).toUpperCase();

    // Larger placeholder that fills the card width
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${color}&color=ffffff&size=512&bold=true&format=svg`;
}


    renderCompanyBadges(company) {
        const badges = [];
        
        // Add industry badge if available
        if (company.industry) {
            badges.push(`<span class="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded-full mt-2">${this.escapeHtml(company.industry)}</span>`);
        }
        
        // Add size badge if available
        if (company.size) {
            badges.push(`<span class="inline-block bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full mt-2">${this.escapeHtml(company.size)}</span>`);
        }

        return badges.length > 0 ? `<div class="mt-2 flex flex-wrap justify-center gap-1">${badges.join('')}</div>` : '';
    }

    generatePlaceholderLogo(companyName) {
        // Generate a consistent placeholder logo based on company name
        const colors = ['#607afb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const color = colors[companyName.length % colors.length];
        
        return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${color}' opacity='0.1'/><text x='50' y='50' font-family='Arial' font-size='24' text-anchor='middle' dy='.3em' fill='${color}'>${companyName.charAt(0).toUpperCase()}</text></svg>`;
    }

    generateCompanyId(companyName) {
        // Generate a URL-friendly ID from company name
        return companyName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    setupCompanyCardEvents() {
        // Add any additional interactivity to company cards
        const companyCards = document.querySelectorAll('.view-company-btn');
        companyCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // You can add tracking or analytics here
                ////console.log('Viewing company:', e.currentTarget.dataset.companyId);
            });
        });
    }

    setupSearch() {
        const searchInput = document.querySelector('input[placeholder="Search"]');
        if (searchInput) {
            let searchTimeout;
            
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                searchTimeout = setTimeout(async () => {
                    if (query.length > 2) {
                        await this.searchCompanies(query);
                    } else if (query.length === 0) {
                        await this.loadFeaturedCompanies();
                    }
                }, 300);
            });
        }
    }

    async searchCompanies(query) {
        try {
            this.showLoading();
            
            // Use the search method from CompanyCloud
            const companies = await companyCloud.searchCompaniesByName(query);
            this.renderCompanies(companies);
            
        } catch (error) {
            console.error("Error searching companies:", error);
            this.showError("Search failed. Please try again.");
        }
    }

    showLoading() {
        const container = document.getElementById('featured_company');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full">
                    <div class="flex items-center justify-center py-12">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <span class="ml-3 text-gray-500 dark:text-gray-400">Loading companies...</span>
                    </div>
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.getElementById('featured_company');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="flex flex-col items-center justify-center">
                        <svg class="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-lg font-medium text-gray-900 dark:text-white">Error Loading Companies</p>
                        <p class="text-gray-500 dark:text-gray-400 mt-1">${this.escapeHtml(message)}</p>
                        <button class="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors retry-btn">
                            Try Again
                        </button>
                    </div>
                </div>
            `;

            // Add retry functionality
            const retryBtn = container.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    this.loadFeaturedCompanies();
                });
            }
        }
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new FeaturedCompany();
});