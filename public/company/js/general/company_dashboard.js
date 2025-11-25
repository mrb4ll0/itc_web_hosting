import { auth, signOut, onAuthStateChanged } from "../../../js/config/firebaseInit.js"
import { CompanyCloud } from "../../../js/fireabase/CompanyCloud.js";
import { Company } from "../../../js/model/Company.js";
import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";

class CompanyDashboard {
    constructor() {
        this.companyCloud = new CompanyCloud();
        this.currentCompany = null;
        this.itc_firebaselogic = new ITCFirebaseLogic();
        this.init();
    }

    init() {
        //console.log("CompanyDashboard initialized");
        this.setupMobileMenu();
        this.attachEventListeners();
        this.checkAuthState();
        this.loadCompanyData();
    }

    setupMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const closeSidebar = document.getElementById('close-sidebar');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-dashboard');

        function toggleSidebar() {
            sidebar.classList.toggle('open');
        }

        function closeSidebarMenu() {
            sidebar.classList.remove('open');
        }

        if (mobileMenuButton) {
            mobileMenuButton.addEventListener('click', toggleSidebar);
        }

        if (closeSidebar) {
            closeSidebar.addEventListener('click', closeSidebarMenu);
        }

        // Close sidebar when clicking on main content on mobile
        if (mainContent) {
            mainContent.addEventListener('click', function() {
                if (window.innerWidth < 1024) {
                    closeSidebarMenu();
                }
            });
        }

        // Close sidebar on window resize if it becomes desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 1024) {
                closeSidebarMenu();
            }
        });
    }

    attachEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Navigation links
        this.setupNavigationLinks();

        // Quick action buttons
        this.setupQuickActions();

        // Search functionality
        this.setupSearch();

        // Notification and profile buttons
        this.setupHeaderButtons();
    }

    setupNavigationLinks() {
        const navLinks = {
            'dashboard': document.getElementById('nav-dashboard'),
            'postings': document.getElementById('nav-postings'),
            'applications': document.getElementById('nav-applications'),
            'profile': document.getElementById('nav-profile')
        };

        // Add click listeners to navigation links
        Object.values(navLinks).forEach(link => {
            if (link) {
                link.addEventListener('click', (e) => {
                    // Close mobile menu when a link is clicked
                    if (window.innerWidth < 1024) {
                        document.getElementById('sidebar').classList.remove('open');
                    }
                });
            }
        });
    }

    setupQuickActions() {
        const editProfileBtn = document.getElementById('edit-profile-button');

        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                window.location.href = 'maincompany_profile_edit.html';
            });
        }

        // View applicants and edit posting buttons - will be attached dynamically
        this.attachPostingButtonListeners();
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }
    }

    setupHeaderButtons() {
        const profileBtn = document.getElementById('profile-button');

        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.showProfileMenu();
            });
        }
    }

    async checkAuthState() {
        try {
            await auth.authStateReady();
            const user = auth.currentUser;
            
            if (!user) {
                //console.log("No user logged in, redirecting to login");
                window.location.href = 'auth/company_login.html';
                return;
            }

            //console.log("User authenticated:", user.uid);
            
        } catch (error) {
            console.error("Auth state check error:", error);
            window.location.href = 'auth/company_login.html';
        }
    }

    async loadCompanyData() {
        try {
            await auth.authStateReady();
            const user = auth.currentUser;
            if (!user) {
                throw new Error("No user logged in");
            }

            //console.log("Loading company data for user:", user.uid);
            
            // Get company data from Firestore
            this.currentCompany = await this.itc_firebaselogic.getCompany(user.uid);
            
            if (!this.currentCompany) {
                throw new Error("Company profile not found");
            }

            this.updateUI();
            await this.loadDashboardStats();
            await this.loadApplications();
            await this.loadActivePostings();

        } catch (error) {
            console.error("Error loading company data:", error);
            this.showNotification('Error loading company data. Please try again.', error);

            
            if (error.message.includes("Company profile not found")) {
                setTimeout(() => {
                    window.location.href = 'auth/company_login.html';
                }, 2000);
            }
        }
    }

    updateUI() {
        if (!this.currentCompany) return;

        // Update welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${this.currentCompany.name}`;
        }

        // Update sidebar welcome text
        const sidebarWelcome = document.getElementById('sidebar-welcome-text');
        if (sidebarWelcome) {
            sidebarWelcome.textContent = `Welcome, ${this.currentCompany.name}`;
        }

        // Update company logo if available
        const companyLogo = document.getElementById('company-logo');
        if (companyLogo && this.currentCompany.logoURL) {
            companyLogo.style.backgroundImage = `url('${this.currentCompany.logoURL}')`;
        }

        // Update user avatar if available
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar && this.currentCompany.logoURL) {
            userAvatar.style.backgroundImage = `url('${this.currentCompany.logoURL}')`;
        }
    }

    async loadDashboardStats() {
        try {
            if (!this.currentCompany) return;

            const companyId = this.currentCompany.id;
            
            // Load real stats from Firestore
            const stats = await this.companyCloud.getCompanyStats(companyId);
            
            this.updateStatsCards(stats);

        } catch (error) {
            console.error("Error loading dashboard stats:", error);
            this.showStatsError();
        }
    }

updateStatsCards(stats) {
    //console.log("Updating stats cards with:", stats);
    
    // Show loading state for all stats first
    this.showStatsLoading();
    
    // Update each stat card using IDs - match the backend keys to frontend IDs
    if (stats.totalPostings !== undefined) {
        this.updateStatCard('total-postings', stats.totalPostings);
    }
    if (stats.activePostings !== undefined) {
        this.updateStatCard('active-postings', stats.activePostings);
    }
    if (stats.newApplications !== undefined) {
        this.updateStatCard('new-applications', stats.newApplications);
    }
    if (stats.hiredStudents !== undefined) {
        this.updateStatCard('hired-students', stats.hiredStudents);
    }
}

updateStatCard(statKey, value) {
    //console.log(`Updating ${statKey} with value: ${value}`);
    
    // Use the exact ID from HTML (with hyphens)
    const spinner = document.getElementById(`${statKey}-spinner`);
    const valueElement = document.getElementById(`${statKey}-value`);
    
    //console.log(`Spinner element:`, spinner);
    //console.log(`Value element:`, valueElement);
    
    if (valueElement && spinner) {
        // Hide spinner and show value
        spinner.classList.add('hidden');
        valueElement.textContent = value;
        valueElement.classList.remove('hidden');
        //console.log(`Successfully updated ${statKey} to ${value}`);
    } else {
        console.error(`Could not find elements for ${statKey}`);
        console.error(`Spinner found: ${!!spinner}, Value element found: ${!!valueElement}`);
    }
}

showStatsLoading() {
    //console.log("Showing stats loading state");
    const statKeys = ['total-postings', 'active-postings', 'new-applications', 'hired-students'];
    
    statKeys.forEach(key => {
        const spinner = document.getElementById(`${key}-spinner`);
        const valueElement = document.getElementById(`${key}-value`);
        
        if (spinner) {
            spinner.classList.remove('hidden');
        }
        if (valueElement) {
            valueElement.classList.add('hidden');
        }
    });
}

showStatsError() {
    //console.log("Showing stats error state");
    const statKeys = ['total-postings', 'active-postings', 'new-applications', 'hired-students'];
    
    statKeys.forEach(key => {
        const spinner = document.getElementById(`${key}-spinner`);
        const valueElement = document.getElementById(`${key}-value`);
        
        if (spinner) {
            spinner.classList.add('hidden');
        }
        if (valueElement) {
            valueElement.classList.remove('hidden');
            valueElement.textContent = '0';
            valueElement.classList.add('text-red-500');
        }
    });
}
    showStatsLoading() {
        // Show all loading spinners and hide value elements
        const statKeys = ['totalPostings', 'activePostings', 'newApplications', 'hiredStudents'];
        
        statKeys.forEach(key => {
            const spinner = document.getElementById(`${key}-spinner`);
            const valueElement = document.getElementById(`${key}-value`);
            
            if (spinner) {
                spinner.classList.remove('hidden');
            }
            if (valueElement) {
                valueElement.classList.add('hidden');
            }
        });
    }

    showStatsError() {
        // Show error state for stats
        const statKeys = ['totalPostings', 'activePostings', 'newApplications', 'hiredStudents'];
        
        statKeys.forEach(key => {
            const spinner = document.getElementById(`${key}-spinner`);
            const valueElement = document.getElementById(`${key}-value`);
            
            if (spinner) {
                spinner.classList.add('hidden');
            }
            if (valueElement) {
                valueElement.classList.remove('hidden');
                valueElement.textContent = '0';
                valueElement.classList.add('text-red-500');
            }
        });
    }

    async loadApplications() {
        try {
            if (!this.currentCompany) return;

            // Show loading state
            this.showApplicationsLoading();

            const applications = await this.companyCloud.getRecentApplications(this.currentCompany.id);
            this.populateApplicationsTable(applications);

        } catch (error) {
            console.error("Error loading applications:", error);
            this.showNotification('Error loading applications', 'error');
            this.showApplicationsError();
        }
    }

    showApplicationsLoading() {
        const tbody = document.getElementById('applications-table-body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr id="loaderRow">
                <td colspan="4" class="px-4 sm:px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    <div class="flex items-center justify-center gap-2">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span>Loading applications...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    showApplicationsError() {
        const tbody = document.getElementById('applications-table-body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 sm:px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-red-500">error</span>
                        <span>Failed to load applications</span>
                        <button class="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm" onclick="window.companyDashboard.loadApplications()">
                            Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

 populateApplicationsTable(applications) {
    this.populateDesktopTable(applications);
    this.populateMobileList(applications);
}

populateDesktopTable(applications) {
    const tbody = document.getElementById('applications-table-body');
    if (!tbody) return;

    if (!applications || applications.length === 0) {
        tbody.innerHTML = this.getEmptyStateHTML('table');
        return;
    }

    tbody.innerHTML = applications.map(app => {
        const itId = app.internshipId;
        
        return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors" 
                data-application-id="${app.id}"
                data-it-id="${itId}">
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-white">
                    <div class="flex items-center gap-3">
                        <div class="bg-slate-200 dark:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center">
                            <span class="material-symbols-outlined text-slate-500 dark:text-slate-400 text-sm">person</span>
                        </div>
                        <div>
                            <div class="font-medium">${app.studentName || 'Unknown Student'}</div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${app.studentEmail || ''}</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    ${app.position || 'Unknown Position'}
                </td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    ${this.formatDate(app.appliedAt)}
                </td>
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusClass(app.status)}">
                        ${app.status || 'Pending'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    this.attachApplicationRowListeners();
}

populateMobileList(applications) {
    const listBody = document.getElementById('applications-list-body');
    if (!listBody) return;

    if (!applications || applications.length === 0) {
        listBody.innerHTML = this.getEmptyStateHTML('list');
        return;
    }

    listBody.innerHTML = applications.map(app => {
        const itId = app.internshipId;
        
        return `
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-md transition-all duration-200 application-card"
                 data-application-id="${app.id}"
                 data-it-id="${itId}">
                <!-- Header with student info and status -->
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="bg-slate-200 dark:bg-slate-700 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-slate-500 dark:text-slate-400">person</span>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h3 class="font-semibold text-slate-800 dark:text-white truncate">
                                ${app.studentName || 'Unknown Student'}
                            </h3>
                            <p class="text-sm text-slate-500 dark:text-slate-400 truncate">
                                ${app.studentEmail || ''}
                            </p>
                        </div>
                    </div>
                    <span class="px-2 py-1 text-xs leading-5 font-semibold rounded-full ${this.getStatusClass(app.status)} flex-shrink-0 ml-2">
                        ${app.status || 'Pending'}
                    </span>
                </div>

                <!-- Application details -->
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500 dark:text-slate-400 font-medium">Position:</span>
                        <span class="text-slate-800 dark:text-white text-right">${app.position || 'Unknown Position'}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-slate-500 dark:text-slate-400 font-medium">Applied:</span>
                        <span class="text-slate-800 dark:text-white">${this.formatDate(app.appliedAt)}</span>
                    </div>
                </div>

                <!-- Action indicator -->
                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Tap to view details</span>
                        <span class="material-symbols-outlined text-sm">chevron_right</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    this.attachMobileListListeners();
}

getEmptyStateHTML(type) {
    const isTable = type === 'table';
    
    if (isTable) {
        return `
            <tr>
                <td colspan="4" class="px-4 sm:px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined">inbox</span>
                        <span>No applications found</span>
                        <p class="text-sm text-slate-400">Applications will appear here when students apply to your postings.</p>
                    </div>
                </td>
            </tr>
        `;
    } else {
        return `
            <div class="bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                <div class="flex flex-col items-center gap-3">
                    <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-3xl text-slate-400 dark:text-slate-500">inbox</span>
                    </div>
                    <div>
                        <h3 class="font-semibold text-slate-600 dark:text-slate-300 text-lg mb-1">No applications found</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Applications will appear here when students apply to your postings.</p>
                    </div>
                </div>
            </div>
        `;
    }
}
    attachApplicationRowListeners() {
        const applicationRows = document.querySelectorAll('tr[data-application-id]');
        applicationRows.forEach(row => {
            row.addEventListener('click', () => {
                const applicationId = row.getAttribute('data-application-id');//data-it-id
                const itId = row.getAttribute('data-it-id');
                 //console.log(" appplicationId "+applicationId+" itId "+itId);
                 //return;
                this.viewApplicationDetails(applicationId,itId);
            });
        });
    }

    attachMobileListListeners() {
    const applicationCards = document.querySelectorAll('.application-card');
    applicationCards.forEach(card => {
        card.addEventListener('click', () => {
            const applicationId = card.getAttribute('data-application-id');
            const itId = card.getAttribute('data-it-id');
            this.viewApplicationDetails(applicationId, itId);
        });
    });
}

showApplicationsLoading() {
    const tableBody = document.getElementById('applications-table-body');
    const listBody = document.getElementById('applications-list-body');
    
    const loadingHTML = `
        <div class="col-span-full py-8 text-center text-slate-500 dark:text-slate-400">
            <div class="flex items-center justify-center gap-2">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span>Loading applications...</span>
            </div>
        </div>
    `;

    if (tableBody) tableBody.innerHTML = `<tr><td colspan="4">${loadingHTML}</td></tr>`;
    if (listBody) listBody.innerHTML = loadingHTML;
}

showApplicationsError() {
    const tableBody = document.getElementById('applications-table-body');
    const listBody = document.getElementById('applications-list-body');
    
    const errorHTML = `
        <div class="col-span-full py-8 text-center text-slate-500 dark:text-slate-400">
            <div class="flex flex-col items-center gap-2">
                <span class="material-symbols-outlined text-red-500">error</span>
                <span>Failed to load applications</span>
                <button class="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm" onclick="window.companyDashboard.loadApplications()">
                    Retry
                </button>
            </div>
        </div>
    `;

    if (tableBody) tableBody.innerHTML = `<tr><td colspan="4">${errorHTML}</td></tr>`;
    if (listBody) listBody.innerHTML = errorHTML;
}

    async loadActivePostings() {
        try {
            if (!this.currentCompany) return;

            const postings = await this.companyCloud.getActivePostings(this.currentCompany.id);
            this.populateActivePostings(postings);

        } catch (error) {
            console.error("Error loading active postings:", error);
            this.showActivePostingsError();
        }
    }

    showActivePostingsError() {
        const container = document.getElementById('active-postings-list');
        if (!container) return;

        container.innerHTML = `
            <div class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400">
                <div class="flex flex-col items-center gap-2">
                    <span class="material-symbols-outlined text-red-500">error</span>
                    <span>Failed to load postings</span>
                    <button class="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm" onclick="window.companyDashboard.loadActivePostings()">
                        Retry
                    </button>
                </div>
            </div>
        `;
    }

    populateActivePostings(postings) {
    const container = document.getElementById('active-postings-list');
    if (!container) return;

    if (!postings || postings.length === 0) {
        container.innerHTML = `
            <div class="p-8 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center h-64 flex items-center justify-center">
                <div class="flex flex-col items-center gap-4">
                    <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-3xl text-slate-400 dark:text-slate-500">work_outline</span>
                    </div>
                    <div>
                        <h3 class="font-semibold text-slate-600 dark:text-slate-300 text-lg mb-2">No active postings found</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md">Create your first Industrial Training posting to start receiving applications from students.</p>
                    </div>
                    <button class="mt-2 px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">add</span>
                        Create New Posting
                    </button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = postings.map(posting => `
        <div class="group relative p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-600 h-64 flex flex-col">
            <!-- Delete Button -->
            <button class="delete-posting-btn absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400" 
                    data-posting-id="${posting.id}"
                    title="Delete Posting">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>

            <!-- Header with status -->
            <div class="flex items-start justify-between mb-3 flex-shrink-0">
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-slate-800 dark:text-white text-lg leading-tight pr-8 truncate" title="${posting.title}">
                        ${posting.title}
                    </h3>
                    <div class="flex items-center gap-3 mt-2 flex-wrap">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex-shrink-0">
                            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Active
                        </span>
                        ${posting.deadline ? `
                            <span class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-shrink-0">
                                <span class="material-symbols-outlined text-sm">schedule</span>
                                ${new Date(posting.deadline).toLocaleDateString()}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Applicant Count -->
            <div class="flex items-center gap-2 mb-4 flex-shrink-0">
                <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">people</span>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                        ${posting.applicantCount || 0} Applicant${posting.applicantCount !== 1 ? 's' : ''}
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
                        ${posting.newApplicants ? `${posting.newApplicants} new applications` : 'No new applications'}
                    </p>
                </div>
            </div>

            <!-- Additional Info -->
            <div class="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4 flex-shrink-0">
                ${posting.location ? `
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="material-symbols-outlined text-slate-400 text-sm flex-shrink-0">location_on</span>
                        <span class="truncate" title="${posting.location}">${posting.location}</span>
                    </div>
                ` : ''}
                ${posting.type ? `
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="material-symbols-outlined text-slate-400 text-sm flex-shrink-0">business_center</span>
                        <span class="truncate" title="${posting.type}">${posting.type}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Spacer to push buttons to bottom -->
            <div class="flex-1"></div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                <button class="flex-1 py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 view-applicants-btn min-w-0" 
                        data-posting-id="${posting.id}">
                    <span class="material-symbols-outlined text-lg flex-shrink-0">groups</span>
                    <span class="truncate">View Applicants</span>
                </button>
                <button class="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 edit-posting-btn min-w-0" 
                        data-posting-id="${posting.id}">
                    <span class="material-symbols-outlined text-lg flex-shrink-0">edit</span>
                    <span class="truncate">Edit</span>
                </button>
            </div>
        </div>
    `).join('');

    // Re-attach event listeners to the new buttons
    this.attachPostingButtonListeners();
}
// Add this method to handle delete functionality
attachDeleteButtonListeners() {
    document.querySelectorAll('.delete-posting-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const postingId = button.getAttribute('data-posting-id');
            this.showDeleteConfirmation(postingId);
        });
    });
}

// Add this method for delete confirmation
showDeleteConfirmation(postingId) {
    // You can implement a modal or use browser confirmation
    if (confirm('Are you sure you want to delete this posting? This action cannot be undone.')) {
        this.deletePosting(postingId);
    }
}

// Add this method to handle the actual deletion
deletePosting(postingId) {
    // Implement your deletion logic here
    //console.log('Deleting posting:', postingId);
    
    // Example: Remove from DOM and show success message
    const postingElement = document.querySelector(`[data-posting-id="${postingId}"]`).closest('.group');
    postingElement.style.opacity = '0';
    postingElement.style.transform = 'translateX(100px)';
    
    setTimeout(() => {
        postingElement.remove();
        // Show success notification
        this.showNotification('Posting deleted successfully', 'success');
    }, 300);
}

// Add this method for notifications
showNotification(message, type = 'info') {
    // Implement your notification system
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update your attachPostingButtonListeners to include delete buttons
attachPostingButtonListeners() {
    // Your existing listeners for view and edit buttons
    document.querySelectorAll('.view-applicants-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const postingId = e.target.getAttribute('data-posting-id');
            const itId = row.getAttribute('data-it-id');
            this.viewApplicants(postingId,itId);
        });
    });

    document.querySelectorAll('.edit-posting-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const postingId = e.target.getAttribute('data-posting-id');
            const itId = row.getAttribute('data-it-id');
            this.editPosting(postingId,itId);
        });
    });

    // Add delete button listeners
    this.attachDeleteButtonListeners();
}

    attachPostingButtonListeners() {
        const viewApplicantsBtns = document.querySelectorAll('.view-applicants-btn');
        const editPostingBtns = document.querySelectorAll('.edit-posting-btn');

        viewApplicantsBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postingId = e.target.getAttribute('data-posting-id');
                const itId = row.getAttribute('data-it-id');
                this.viewApplicantsForPosting(postingId,itId);
            });
        });

        editPostingBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postingId = e.target.getAttribute('data-posting-id');
                const itId = row.getAttribute('data-it-id');
                this.editPostingById(postingId,itId);
            });
        });
    }

    async handleLogout() {
        try {
            // Show confirmation dialog
            const confirmLogout = confirm("Are you sure you want to logout?");
            if (!confirmLogout) return;

            // Show loading state
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.innerHTML = '<span>Logging out...</span>';
                logoutBtn.disabled = true;
            }

            await signOut(auth);
            
            // Clear local storage
            localStorage.removeItem('currentCompany');
            localStorage.removeItem('userRole');
            
            //console.log("User signed out successfully");
            
            // Redirect to login page
            window.location.href = 'auth/company_login.html';

        } catch (error) {
            console.error("Logout error:", error);
            this.showNotification('Logout failed. Please try again.', 'error');
            
            // Reset logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.innerHTML = '<span>Logout</span>';
                logoutBtn.disabled = false;
            }
        }
    }

    handleSearch(query) {
        // Implement real-time search if needed
        //console.log("Search query:", query);
        
        // Filter applications in real-time
        this.filterApplications(query);
    }

    filterApplications(query) {
        const rows = document.querySelectorAll('tbody tr[data-application-id]');
        const searchTerm = query.toLowerCase().trim();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    performSearch(query) {
        // Implement search functionality
        //console.log("Performing search for:", query);
        this.showNotification(`Searching for: ${query}`, 'info');
    }

    viewApplicationDetails(applicationId,itid) {
        //console.log("Viewing application details:", applicationId);
        // Navigate to application details page
        window.location.href = `student_profile.html?itid=${itid}&id=${applicationId}`;
    }

    viewApplicantsForPosting(postingId,itid) {
        //console.log("Viewing applicants for posting ID:", postingId);
        window.location.href = `student_profile.html?itid=${itid}&id=${applicationId}`;
    }

    editPostingById(postingId,itid) {
        //console.log("Editing posting ID:", postingId);
        window.location.href = `edit_posting.html?itid=${itid}&id=${applicationId}`;
    }

    showNotifications() {
        this.showNotification('Notifications feature coming soon!', 'info');
    }

    showProfileMenu() {
        this.showNotification('Profile menu feature coming soon!', 'info');
    }

    getStatusClass(status) {
        const statusClasses = {
            'new': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            'under review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            'shortlisted': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
            'accepted': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            'interview': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
        };
        
        return statusClasses[status.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    }

    formatDate(date) {
        if (!date) return 'Unknown date';
        
        if (date.toDate) {
            // Firebase Timestamp
            return date.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } else if (date instanceof Date) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } else {
            return new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.dashboard-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `dashboard-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">
                    ${type === 'success' ? 'check_circle' :
                      type === 'error' ? 'error' :
                      type === 'warning' ? 'warning' : 'info'}
                </span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Method to refresh dashboard data
    async refreshDashboard() {
        await this.loadDashboardStats();
        await this.loadApplications();
        await this.loadActivePostings();
    }
}

// Initialize dashboard when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.companyDashboard = new CompanyDashboard();
});

document.getElementById('logout-button').addEventListener('click',()=>
{
 if (confirmLogout()) {
      performLogout();
    }
});

function confirmLogout() {
    return confirm('Are you sure you want to logout?');
  }

 function performLogout() {
    signOut(auth)
    setTimeout(() => {
        history.replaceState(null, null, location.href);
      window.location.href ='auth/company_login.html';
    }, 1000);
  }
