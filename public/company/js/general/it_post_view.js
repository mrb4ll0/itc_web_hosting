import { auth, db } from "../../../js/config/firebaseInit.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";
import { IndustrialTraining } from "../../../js/model/internship_model.js";

class ITPostView {
    constructor() {
        this.companyCloud = new ITBaseCompanyCloud();
        this.currentTraining = null;
        this.currentCompany = null;
        this.init();

    }

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
 this.trainingId = urlParams.get('id');
        await auth.authStateReady();
        if (!auth.currentUser) {
            alert("Profile not found. You'll be redirected to login.");
            window.location.href = '../auth/companyLogin.js';
            return;
        }

        this.showLoadingDialog("Loading training details...");
        await this.loadTrainingData();
        this.setupEventListeners();
    }

    showLoadingDialog(message = "Loading...") {
        // Remove existing loading dialog if any
        this.hideLoadingDialog();

        const loadingHtml = `
            <div id="loading-dialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 flex items-center gap-4">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">${message}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Please wait...</p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
    }

    hideLoadingDialog() {
        const loadingDialog = document.getElementById('loading-dialog');
        if (loadingDialog) {
            loadingDialog.remove();
        }
    }

    showErrorDialog(message) {
        this.hideLoadingDialog();
        
        const errorHtml = `
            <div id="error-dialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="material-symbols-outlined text-red-500">error</span>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Error</h3>
                    </div>
                    <p class="text-gray-600 dark:text-gray-300 mb-4">${message}</p>
                    <div class="flex justify-end">
                        <button id="error-ok-btn" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', errorHtml);

        // Add event listener for OK button
        document.getElementById('error-ok-btn').addEventListener('click', () => {
            this.hideErrorDialog();
            window.location.href = 'company_dashboard.html';
        });
    }

    hideErrorDialog() {
        const errorDialog = document.getElementById('error-dialog');
        if (errorDialog) {
            errorDialog.remove();
        }
    }

    async loadTrainingData() {
        try {
            // Get training ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const trainingId = urlParams.get('id');

            if (!trainingId) {
                throw new Error("Training ID not found in URL");
            }
                await auth.authStateReady();
            // Load training data
            this.currentTraining = await this.companyCloud.getIndustrialTrainingById(auth.currentUser.uid,this.trainingId);
             //console.log("it is "+JSON.stringify(this.currentTraining));
             //console.log("and title is  "+JSON.stringify(this.currentTraining.title));
            
            if (!this.currentTraining) {
                throw new Error("Training opportunity not found");
            }

            // Load company data
            this.currentCompany = await this.companyCloud.getCompany(auth.currentUser.uid);
            
            if (!this.currentCompany) {
                throw new Error("Company data not found");
            }

            // Populate the UI with data
            this.populateTrainingData();
            this.hideLoadingDialog();

        } catch (error) {
            console.error("Error loading training data:", error);
            this.showErrorDialog(error.message || "Failed to load training details");
        }
    }

    populateTrainingData() {
        if (!this.currentTraining || !this.currentCompany) return;

        // Populate header and basic info
         //console.log("title "+this.currentTraining.title);
             //console.log("title "+this.currentCompany.name);
        this.setElementText('training-title', this.currentTraining.title);
        this.setElementText('company-name', `Posted by ${this.currentCompany.name}`);
        this.setElementText('breadcrumb-current', this.currentTraining.title);
        
        // Update status badge
        this.updateStatusBadge(this.currentTraining.status);

        // Populate "At a Glance" section
        this.setElementText('department-value', this.currentTraining.department || 'Not specified');
        this.setElementText('location-value', this.currentTraining.address || 'Not specified');
        this.setElementText('stipend-value', this.currentTraining.stipend || 'Not specified');
        
        // Aptitude test
        const aptitudeText = this.currentTraining.aptitudeTestRequired ? 'Yes' : 'No';
        this.setElementText('aptitude-value', aptitudeText);
        
        // Dates (if available)
        if (this.currentTraining.startDate && this.currentTraining.endDate) {
            const startDate = this.formatTimestamp(this.currentTraining.startDate, 'short');
            const endDate = this.formatTimestamp(this.currentTraining.endDate, 'short');
            this.setElementText('dates-value', `${startDate} - ${endDate}`);
        } else {
            this.setElementText('dates-value', 'Flexible');
        }

        // Populate applications overview
        this.updateApplicationsOverview();

        // Populate detailed content
        this.populateDetailedContent();

        // Update user avatar if company has logo
        if (this.currentCompany.logoURL) {
            document.getElementById('user-avatar').style.backgroundImage = `url('${this.currentCompany.logoURL}')`;
        }
    }

    updateStatusBadge(status) {
        const statusBadge = document.getElementById('status-badge');
        const closeButton = document.getElementById('close-button');
        
        if (status === 'open') {
            statusBadge.textContent = 'Open';
            statusBadge.className = 'inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300';
            closeButton.textContent = 'Close Posting';
            //closeButton.querySelector('span').textContent = 'Close Posting';
        } else {
            statusBadge.textContent = 'Closed';
            statusBadge.className = 'inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300';
            closeButton.textContent = 'Open Posting';
            //closeButton.querySelector('span').textContent = 'Open Posting';
        }
    }

    updateApplicationsOverview() {
        // Update positions filled
        const filled = this.currentTraining.applications?.filter(app => app.status === 'accepted').length || 0;
        const total = this.currentTraining.intakeCapacity || 0;
        const totalApplications = this.currentTraining.applications?.length || 0;
        
        this.setElementText('positions-value', `${filled} / ${total}`);
        this.setElementText('applications-count', `${totalApplications} total applications received.`);
        
        // Update progress bar
        const percentage = total > 0 ? (filled / total) * 100 : 0;
        document.getElementById('progress-bar').style.width = `${percentage}%`;
        
        // Update applications badge
        this.setElementText('applications-badge', totalApplications.toString());
    }

    populateDetailedContent() {
        // Description
        this.setElementText('description-content', this.currentTraining.description || 'No description provided.');

        // Requirements/Skills
        this.setElementText('requiredskillls-content', this.currentTraining.eligibilityCriteria || 'No specific requirements listed.');

        // Skills tags
        this.populateSkillsTags();

        // Additional sections if data exists
        this.populateAdditionalSections();
    }

    populateSkillsTags() {
        const skillsContainer = document.getElementById('skills-container');
        skillsContainer.innerHTML = '';

        // Extract skills from eligibility criteria or use default
        let skills = [];
        if (this.currentTraining.eligibilityCriteria) {
            // Simple extraction - you might want to improve this logic
            skills = this.extractSkillsFromText(this.currentTraining.eligibilityCriteria);
        }

        // If no skills extracted, show a default message
        if (skills.length === 0) {
            skills = ['No specific skills listed'];
        }

        skills.forEach((skill, index) => {
            const skillElement = document.createElement('span');
            skillElement.className = 'inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200';
            skillElement.textContent = skill;
            skillElement.id = `skill-${index}`;
            skillsContainer.appendChild(skillElement);
        });
    }

    extractSkillsFromText(text) {
        // Simple skill extraction - you can enhance this based on your data structure
        const commonSkills = ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'HTML', 'CSS', 'Git', 'SQL', 'REST APIs', 'Problem Solving'];
        const foundSkills = commonSkills.filter(skill => 
            text.toLowerCase().includes(skill.toLowerCase())
        );
        return foundSkills.length > 0 ? foundSkills : ['Various technical skills'];
    }

    populateAdditionalSections() {
        // Populate responsibilities if available
        if (this.currentTraining.responsibilities) {
            this.populateList('responsibilities-list', this.currentTraining.responsibilities);
        }

        // Populate learning outcomes if available
        if (this.currentTraining.learningOutcomes) {
            this.populateList('outcomes-list', this.currentTraining.learningOutcomes);
        }
    }

    populateList(listId, items) {
        const listElement = document.getElementById(listId);
        if (!listElement) return;

        listElement.innerHTML = '';
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = item;
            li.id = `${listId}-item-${index}`;
            listElement.appendChild(li);
        });
    }

    
setupEventListeners() {
    //console.log("setupevent listener");
    
    // Edit button
    document.getElementById('edit-button').addEventListener('click', () => {
        this.editTraining();
    });

    // Close/Open button
    document.getElementById('close-button').addEventListener('click', () => {
        this.toggleTrainingStatus();
    });

    // Tab navigation
    document.getElementById('details-tab').addEventListener('click', (e) => {
        e.preventDefault();
        //console.log("details-tab clicked");
        this.showDetailsTab();
    });

    document.getElementById('applications-tab').addEventListener('click', (e) => {
        e.preventDefault();
        //console.log("applications-tab clicked");
        this.showApplicationsTab();
    });

    document.getElementById('analytics-tab').addEventListener('click', (e) => {
        e.preventDefault();
        //console.log("analytics-tab clicked");
        this.showAnalyticsTab();
    });

    // Breadcrumb navigation
    document.getElementById('breadcrumb-dashboard').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'company_dashboard.html';
    });

    document.getElementById('breadcrumb-industrial-training').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'company_training_list.html';
    });
}

// Tab switching methods - KEEP ONLY ONE VERSION OF EACH
showDetailsTab() {
    //console.log('Switching to Details tab');
    this.switchToTab('details-tab', 'tab-content');
}

async showApplicationsTab() {
    //console.log('Switching to Applications tab');
    try {
        this.showLoadingDialog("Loading applications...");
        
        await auth.authStateReady();
        if (!auth.currentUser) {
            throw new Error("User not found");
        }

        // Get applications for this specific industrial training
        const applications = await this.companyCloud.getApplicationsForIndustrialTraining(
            auth.currentUser.uid, 
            this.trainingId
        );

        // Populate applications table
        this.populateApplicationsTable(applications);
        
        // Update applications overview
        this.updateApplicationsOverviewWithData(applications);
        
        // Switch to applications tab
        this.switchToTab('applications-tab', 'applications-tab-content');
        
        this.hideLoadingDialog();

    } catch (error) {
        console.error("Error loading applications:", error);
        this.hideLoadingDialog();
        this.showNotification('Failed to load applications', 'error');
        // Still switch to applications tab even if there's an error
        this.switchToTab('applications-tab', 'applications-content');
    }
}

showAnalyticsTab() {
    //console.log('Switching to Analytics tab');
    this.switchToTab('analytics-tab', 'analytics-content');
}


switchToTab(tabId, contentId) {
    //console.log(`Switching to tab: ${tabId}, content: ${contentId}`);
    
    // Debug: Check if elements exist
    //console.log('Active tab element:', document.getElementById(tabId));
    //console.log('Active content element:', document.getElementById(contentId));
    
    // Remove active classes from all tabs
    document.querySelectorAll('[id$="-tab"]').forEach(tab => {
        tab.classList.remove('border-primary', 'text-primary');
        tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    });

    // Hide all tab content
    document.querySelectorAll('[data-tab-content]').forEach(content => {
        content.classList.add('hidden');
    });

    // Activate current tab
    const activeTab = document.getElementById(tabId);
    const activeContent = document.getElementById(contentId);
    //console.log("activeTab is "+activeTab+" active content "+activeContent);
    if (activeTab && activeContent) {
        activeTab.classList.add('border-primary', 'text-primary');
        activeTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        activeContent.classList.remove('hidden');
        //console.log(`Successfully switched to ${tabId}`);
    } else {
        console.error(`Tab or content not found: ${tabId}, ${contentId}`);
        
        // Debug: List all available tabs and content
        //console.log('All tabs:', document.querySelectorAll('[id$="-tab"]'));
        //console.log('All content:', document.querySelectorAll('[data-tab-content]'));
    }
}
// Update the populateApplicationsTable method to ensure empty state works:
populateApplicationsTable(applications) {
     //console.log("populate application table is and applications is null ? "+(applications == null));
    const tbody = document.getElementById('applications-table-body');
    if (!tbody) {
        console.error('Applications table body not found');
        return;
    }

    if (!applications || applications.length === 0) {
         //console.log("error body");
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                        <span class="material-symbols-outlined text-4xl">person_search</span>
                        <h3 class="text-lg font-medium">No Applications Yet</h3>
                        <p class="text-sm">Applications will appear here when students apply to this opportunity.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Your existing table population code here...
    //console.log("Your existing table population code here");
    tbody.innerHTML = applications.map((application, index) => `
        <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        ${application.student?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <div class="font-medium text-gray-900 dark:text-white">
                            ${application.student?.name || 'Unknown Student'}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            ${application.student?.email || 'No email'}
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                ${application.student?.course || 'Not specified'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                ${application.student?.institution || 'Not specified'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${this.getApplicationStatusBadge(application.applicationStatus)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                ${this.formatTimestamp(application.applicationDate, 'short')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                    <button class="view-application-btn p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            data-application-id="${application.id}"
                            title="View Application">
                        <span class="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    <button class="download-resume-btn p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                            data-resume-url="${application.student?.resumeURL || ''}"
                            title="Download Resume">
                        <span class="material-symbols-outlined text-lg">download</span>
                    </button>
                    ${application.applicationStatus === 'pending' ? `
                        <div class="relative">
                            <button class="status-action-btn p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                    data-application-id="${application.id}"
                                    title="Update Status">
                                <span class="material-symbols-outlined text-lg">more_vert</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');

    // Attach event listeners to application rows
    this.attachApplicationEventListeners(applications);
}
    async editTraining() {
        // Redirect to edit page with training ID
        const trainingId = new URLSearchParams(window.location.search).get('id');
        window.location.href = `edit_industrial_training.html?id=${trainingId}`;
    }

    async toggleTrainingStatus() {
        if (!this.currentTraining) return;

        const newStatus = this.currentTraining.status === 'open' ? 'closed' : 'open';
        const confirmMessage = newStatus === 'closed' 
            ? 'Are you sure you want to close this training opportunity? This will stop accepting new applications.'
            : 'Are you sure you want to reopen this training opportunity?';

        if (!confirm(confirmMessage)) return;

        this.showLoadingDialog(`${newStatus === 'closed' ? 'Closing' : 'Opening'} training...`);

        try {
             await auth.authStateReady();
            await this.companyCloud.setITStatus(auth.currentUser.uid,this.currentTraining.id, newStatus);
            
            // Update local state
            this.currentTraining.status = newStatus;
            
            // Update UI
            this.updateStatusBadge(newStatus);
            this.hideLoadingDialog();
            
            this.showNotification(
                `Training opportunity ${newStatus === 'closed' ? 'closed' : 'opened'} successfully!`,
                'success'
            );

        } catch (error) {
            console.error("Error updating training status:", error);
            this.hideLoadingDialog();
            this.showNotification('Failed to update training status', 'error');
        }
    }

   

getApplicationStatusBadge(status) {
    const statusConfig = {
        pending: {
            class: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
            text: 'Pending'
        },
        under_review: {
            class: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
            text: 'Under Review'
        },
        accepted: {
            class: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
            text: 'Accepted'
        },
        rejected: {
            class: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
            text: 'Rejected'
        },
        hired: {
            class: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
            text: 'Hired'
        }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return `
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}">
            <span class="w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'pending' ? 'bg-yellow-500' : status === 'accepted' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : status === 'under_review' ? 'bg-blue-500' : 'bg-purple-500'}"></span>
            ${config.text}
        </span>
    `;
}

attachApplicationEventListeners(applications) {
    // View application buttons
    document.querySelectorAll('.view-application-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const applicationId = e.currentTarget.getAttribute('data-application-id');
            this.viewApplicationDetails(applicationId, applications);
        });
    });

    // Download resume buttons
    document.querySelectorAll('.download-resume-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const resumeUrl = e.currentTarget.getAttribute('data-resume-url');
            this.downloadResume(resumeUrl);
        });
    });

    // Status action buttons
    document.querySelectorAll('.status-action-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const applicationId = e.currentTarget.getAttribute('data-application-id');
            this.showStatusDropdown(e.currentTarget, applicationId);
        });
    });
}

async viewApplicationDetails(applicationId, applications) {
    const application = applications.find(app => app.id === applicationId);
    if (!application) return;

    // Create and show application details modal
    this.showApplicationModal(application);
}

showApplicationModal(application) {
    const modalHtml = `
        <div id="application-modal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Application Details</h3>
                    <button id="close-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div class="p-6 space-y-6">
                    <!-- Student Information -->
                    <div>
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Student Information</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label class="text-gray-500 dark:text-gray-400">Name</label>
                                <p class="text-gray-900 dark:text-white">${application.student?.name || 'N/A'}</p>
                            </div>
                            <div>
                                <label class="text-gray-500 dark:text-gray-400">Email</label>
                                <p class="text-gray-900 dark:text-white">${application.student?.email || 'N/A'}</p>
                            </div>
                            <div>
                                <label class="text-gray-500 dark:text-gray-400">Course</label>
                                <p class="text-gray-900 dark:text-white">${application.student?.course || 'N/A'}</p>
                            </div>
                            <div>
                                <label class="text-gray-500 dark:text-gray-400">Institution</label>
                                <p class="text-gray-900 dark:text-white">${application.student?.institution || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Application Details -->
                    <div>
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Application Details</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label class="text-gray-500 dark:text-gray-400">Applied On</label>
                                <p class="text-gray-900 dark:text-white">${this.formatTimestamp(application.applicationDate, 'long')}</p>
                            </div>
                            <div>
                                <label class="text-gray-500 dark:text-gray-400">Status</label>
                                <div class="mt-1">${this.getApplicationStatusBadge(application.applicationStatus)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        ${application.student?.resumeURL ? `
                            <button class="download-resume-modal-btn px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    data-resume-url="${application.student.resumeURL}">
                                Download Resume
                            </button>
                        ` : ''}
                        
                        ${application.applicationStatus === 'pending' ? `
                            <div class="flex gap-2">
                                <button class="reject-application-btn px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                        data-application-id="${application.id}">
                                    Reject
                                </button>
                                <button class="accept-application-btn px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                        data-application-id="${application.id}">
                                    Accept
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listeners for modal
    document.getElementById('close-modal').addEventListener('click', () => {
        this.closeApplicationModal();
    });

    // Download resume from modal
    const downloadBtn = document.querySelector('.download-resume-modal-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            const resumeUrl = e.currentTarget.getAttribute('data-resume-url');
            this.downloadResume(resumeUrl);
        });
    }

    // Accept/Reject buttons in modal
    const acceptBtn = document.querySelector('.accept-application-btn');
    const rejectBtn = document.querySelector('.reject-application-btn');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', (e) => {
            const applicationId = e.currentTarget.getAttribute('data-application-id');
            this.updateApplicationStatus(applicationId, 'accepted');
        });
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', (e) => {
            const applicationId = e.currentTarget.getAttribute('data-application-id');
            this.updateApplicationStatus(applicationId, 'rejected');
        });
    }

    // Close modal when clicking outside
    document.getElementById('application-modal').addEventListener('click', (e) => {
        if (e.target.id === 'application-modal') {
            this.closeApplicationModal();
        }
    });
}

closeApplicationModal() {
    const modal = document.getElementById('application-modal');
    if (modal) {
        modal.remove();
    }
}

downloadResume(resumeUrl) {
    if (!resumeUrl) {
        this.showNotification('No resume available for download', 'warning');
        return;
    }

    // Open resume in new tab or trigger download
    window.open(resumeUrl, '_blank');
}

showStatusDropdown(button, applicationId) {
    // Remove existing dropdowns
    this.closeAllDropdowns();

    const dropdown = document.createElement('div');
    dropdown.className = 'absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1';
    dropdown.innerHTML = `
        <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                data-status="under_review" data-application-id="${applicationId}">
            <span class="material-symbols-outlined text-blue-500 text-sm">visibility</span>
            Mark as Under Review
        </button>
        <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                data-status="accepted" data-application-id="${applicationId}">
            <span class="material-symbols-outlined text-green-500 text-sm">check_circle</span>
            Accept Application
        </button>
        <button class="status-option w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                data-status="rejected" data-application-id="${applicationId}">
            <span class="material-symbols-outlined text-red-500 text-sm">cancel</span>
            Reject Application
        </button>
    `;

    button.parentElement.style.position = 'relative';
    button.parentElement.appendChild(dropdown);

    // Add event listeners to dropdown options
    dropdown.querySelectorAll('.status-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const status = e.currentTarget.getAttribute('data-status');
            const appId = e.currentTarget.getAttribute('data-application-id');
            this.updateApplicationStatus(appId, status);
            dropdown.remove();
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown.remove();
    });
}

closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.absolute.border.rounded-lg.shadow-lg');
    dropdowns.forEach(dropdown => dropdown.remove());
}

async updateApplicationStatus(applicationId, newStatus) {
    try {
        this.showLoadingDialog("Updating application status...");

        await auth.authStateReady();
        await this.companyCloud.updateApplicationStatus(
            auth.currentUser.uid,
            this.trainingId,
            applicationId,
            newStatus
        );

        // Reload applications to reflect the change
        await this.showApplicationsTab();
        
        this.hideLoadingDialog();
        this.showNotification(`Application ${newStatus} successfully`, 'success');

    } catch (error) {
        console.error("Error updating application status:", error);
        this.hideLoadingDialog();
        this.showNotification('Failed to update application status', 'error');
    }
}

updateApplicationsOverviewWithData(applications) {
    if (!applications) return;

    const totalApplications = applications.length;
    const pendingCount = applications.filter(app => app.applicationStatus === 'pending').length;
    const acceptedCount = applications.filter(app => app.applicationStatus === 'accepted').length;
    const rejectedCount = applications.filter(app => app.applicationStatus === 'rejected').length;

    // Update overview cards if they exist
    this.setElementText('total-applications', totalApplications.toString());
    this.setElementText('pending-applications', pendingCount.toString());
    this.setElementText('accepted-applications', acceptedCount.toString());
    this.setElementText('rejected-applications', rejectedCount.toString());
}


    // Utility methods
    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    formatTimestamp(timestamp, format = 'medium') {
        if (!timestamp) return 'Not specified';
        
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            
            const formats = {
                'short': () => date.toLocaleDateString('en-US'),
                'medium': () => date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                'long': () => date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            };

            return formats[format] ? formats[format]() : date.toLocaleDateString();
        } catch (error) {
            console.error('Error formatting timestamp:', error);
            return 'Invalid date';
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.form-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const typeClasses = {
            success: "bg-green-500 text-white",
            error: "bg-red-500 text-white",
            warning: "bg-yellow-500 text-white",
            info: "bg-blue-500 text-white",
        };

        const notification = document.createElement("div");
        notification.className = `form-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${typeClasses[type]}`;

        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-lg">
                    ${type === "success" ? "check_circle" : 
                      type === "error" ? "error" : 
                      type === "warning" ? "warning" : "info"}
                </span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new ITPostView();
});