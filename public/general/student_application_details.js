// Import required modules
import { auth } from "../js/config/firebaseInit.js";
import { ITBaseCompanyCloud } from "../js/fireabase/ITBaseCompanyCloud.js";
import { StudentCloudDB } from "../js/fireabase/StudentCloud.js";
import { createAvatarElement, viewExistingFile } from "../js/general/generalmethods.js";

class StudentApplicationDetails {
  constructor() {
    this.itBaseCompanyCloud = new ITBaseCompanyCloud();
    this.studentCloudDB = new StudentCloudDB();
    this.applicationId = this.getApplicationIdFromURL();
    this.companyId = this.getCompanyIdFromURL();
    this.itId = this.getITIdFromURL();
    this.currentApplication = null;
    this.currentStudent = null;

    this.init();
  }

  /**
   * Get application ID from URL parameters
   */
  getApplicationIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("id");
  }

  /**
   * Get company ID from URL parameters
   */
  getCompanyIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("companyId");
  }

  /**
   * Get IT ID from URL parameters
   */
  getITIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("itId");
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Show loading state
      this.showLoading(true);
      this.updateLoadingProgress(10);

      // Wait for authentication
      await auth.authStateReady();
      this.updateLoadingProgress(30);

      // Check if user is authenticated
      if (!auth.currentUser) {
        this.showError("Please log in to view application details");
        setTimeout(() => {
          window.location.href = "../student/auth/login.html";
        }, 2000);
        return;
      }

      // Get current student
      this.currentStudent = await this.studentCloudDB.getStudentById(auth.currentUser.uid);
      this.updateLoadingProgress(50);

      // Update user avatar
      this.updateUserAvatar();

      // Validate URL parameters
      if (!this.applicationId || !this.companyId || !this.itId) {
        this.showError("Invalid URL parameters");
        setTimeout(() => {
          window.location.href = "../student/my_applications.html";
        }, 2000);
        return;
      }

      // Load application data
      await this.loadApplicationData();
      this.updateLoadingProgress(90);

      // Setup event listeners
      this.setupEventListeners();
      
      this.updateLoadingProgress(100);
      this.showLoading(false);
    } catch (error) {
      console.error("Error initializing application details:", error);
      this.showError("Failed to load application details");
      this.showLoading(false);
    }
  }

  /**
   * Update loading progress indicator
   */
  updateLoadingProgress(percentage) {
    const progressBar = document.getElementById('loading-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      
      // Update loading text based on progress
      const loadingText = document.querySelector('#loading-overlay p:first-of-type');
      if (loadingText) {
        const texts = [
          "Authenticating...",
          "Loading application...",
          "Retrieving details...",
          "Processing information...",
          "Finalizing..."
        ];
        const index = Math.floor((percentage / 100) * (texts.length - 1));
        loadingText.textContent = texts[index] || "Loading...";
      }
    }
  }

  /**
   * Show/hide loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) {
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('opacity-100'), 10);
      } else {
        overlay.classList.remove('opacity-100');
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 300);
      }
    }
  }

  /**
   * Update user avatar in header
   */
  updateUserAvatar() {
    const avatarElement = document.getElementById('user-avatar');
    if (avatarElement && this.currentStudent) {
      const avatar = createAvatarElement(
        this.currentStudent.fullName,
        this.currentStudent.imageUrl,
        36
      );
      avatarElement.innerHTML = avatar;
      avatarElement.classList.remove('skeleton');
    }
  }

  /**
   * Load application data
   */
  async loadApplicationData() {
    try {
      this.currentApplication = await this.itBaseCompanyCloud.getApplicationById(
        this.companyId,
        this.itId,
        this.applicationId
      );

      if (!this.currentApplication) {
        this.showError("Application not found");
        setTimeout(() => {
          window.location.href = "../student/my_applications.html";
        }, 2000);
        return;
      }

      // Populate the page with application data
      await this.populateApplicationData();
    } catch (error) {
      console.error("Error loading application data:", error);
      throw error;
    }
  }

  /**
   * Populate the page with application data
   */
  async populateApplicationData() {
    const app = this.currentApplication;
    
    // Remove skeleton loaders
    this.removeSkeletons();

    // Set page title
    document.title = `My Application - ${app.position} | IT Connect`;

    // Set submission date
    const submissionDate = app.applicationDate instanceof Date 
      ? app.applicationDate 
      : new Date(app.applicationDate);
    
    document.getElementById('submission-date').textContent = 
      `Submitted on ${submissionDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`;

    // Update status badge
    this.updateStatusBadge(app.applicationStatus);

    // Populate application header
    this.populateApplicationHeader(app);

    // Populate student information
    this.populateStudentInfo(app.student);

    // Populate training information
    this.populateTrainingInfo(app);

    // Populate documents section
    await this.populateDocuments(app);

    // Update application timeline
    this.updateApplicationTimeline(app);

    // Add animations
    this.addContentAnimations();
  }

  /**
   * Update status badge
   */
  updateStatusBadge(status) {
    const statusElement = document.getElementById('status-badge');
    if (!statusElement) return;

    const statusConfig = {
      'pending': { 
        text: 'Pending Review', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: 'schedule'
      },
      'under review': { 
        text: 'Under Review', 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: 'visibility'
      },
      'accepted': { 
        text: 'Accepted', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: 'check_circle'
      },
      'rejected': { 
        text: 'Not Selected', 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: 'cancel'
      },
      'approved': { 
        text: 'Approved', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: 'verified'
      }
    };

    const statusKey = status.toLowerCase();
    const config = statusConfig[statusKey] || statusConfig.pending;

    statusElement.innerHTML = `
      <div class="relative status-pulse">
        <div class="flex items-center gap-2 ${config.color} py-2 px-4 rounded-full font-medium">
          <span class="material-symbols-outlined text-sm">${config.icon}</span>
          <span>${config.text}</span>
        </div>
      </div>
    `;
  }

  /**
   * Populate application header
   */
  populateApplicationHeader(app) {
    // Position title
    document.getElementById('position-title').textContent = app.position;
    
    // Company name
    document.getElementById('company-name').textContent = app.companyName;
    
    // Company location
    const location = app.internship?.address || app.internship?.location || 'Not specified';
    document.getElementById('company-location').textContent = location;
    
    // Application duration
    const startDate = app.startDate ? new Date(app.startDate) : null;
    const endDate = app.endDate ? new Date(app.endDate) : null;
    
    if (startDate && endDate) {
      const durationText = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      document.getElementById('application-duration').textContent = durationText;
    } else {
      document.getElementById('application-duration').textContent = 'Duration not specified';
    }
    
    // Company logo
    const companyLogo = document.getElementById('company-logo');
    //console.log("company logo "+JSON.stringify(app.internship?.company));
    if (app.internship?.company?.logoURL) {
        
      companyLogo.style.backgroundImage = `url('${app.internship.company.logoURL}')`;
      companyLogo.style.backgroundSize = 'cover';
      companyLogo.style.backgroundPosition = 'center';
      companyLogo.innerHTML = '';
    } else {
      companyLogo.innerHTML = '<span class="material-symbols-outlined text-3xl text-gray-400">business</span>';
    }
    companyLogo.classList.remove('skeleton');
  }

  /**
   * Populate student information
   */
  populateStudentInfo(student) {
    // Personal Information
    document.getElementById('student-name').textContent = student.fullName || 'Not specified';
    document.getElementById('matric-number').textContent = student.matricNumber || 'Not specified';
    document.getElementById('student-email').textContent = student.email || 'Not specified';
    document.getElementById('student-phone').textContent = student.phoneNumber || 'Not specified';
    
    // Academic Information
    document.getElementById('student-university').textContent = student.institution || 'Not specified';
    document.getElementById('student-faculty').textContent = student.faculty || 'Not specified';
    document.getElementById('student-department').textContent = student.department || student.major || 'Not specified';
    document.getElementById('student-level').textContent = student.level || 'Not specified';
  }

  /**
   * Populate training information
   */
  populateTrainingInfo(app) {
    // Training Details
    document.getElementById('internship-position').textContent = app.position || 'Not specified';
    document.getElementById('internship-department').textContent = app.internship?.department || 'Not specified';
    document.getElementById('internship-supervisor').textContent = app.internship?.supervisor || 'Not specified';
    
    // Dates
    const startDate = app.startDate ? new Date(app.startDate) : null;
    const endDate = app.endDate ? new Date(app.endDate) : null;
    
    document.getElementById('internship-start-date').textContent = 
      startDate ? startDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'Not specified';
    
    document.getElementById('internship-end-date').textContent = 
      endDate ? endDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : 'Not specified';
    
    // Duration
    if (startDate && endDate) {
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = Math.floor(diffDays / 30);
      
      let durationText = '';
      if (diffMonths > 0) {
        durationText = `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
      } else {
        durationText = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      }
      
      if (app.selectedDuration) {
        durationText = `${app.selectedDuration} (${durationText})`;
      }
      
      document.getElementById('internship-duration').textContent = durationText;
    } else {
      document.getElementById('internship-duration').textContent = app.selectedDuration || 'Not specified';
    }
    
    // Description
    document.getElementById('internship-description').textContent = 
      app.internship?.description || app.durationDescription || 'No description provided';
  }

  /**
   * Populate documents section
   */
  async populateDocuments(app) {
    // ID Card
    if (app.idCardUrl) {
      const idCardElement = document.getElementById('id-card-document');
      idCardElement.classList.remove('hidden');
      idCardElement.classList.add('animate-fade-in');
    }

    // Training Letter (IT Letter)
    if (app.itLetterUrl) {
      const trainingLetterElement = document.getElementById('training-letter-document');
      trainingLetterElement.classList.remove('hidden');
      trainingLetterElement.classList.add('animate-fade-in');
    }

    // Application Forms
    if (app.attachedFormUrls && app.attachedFormUrls.length > 0) {
      const formsElement = document.getElementById('application-forms-document');
      formsElement.classList.remove('hidden');
      formsElement.classList.add('animate-fade-in');
      
      const formsCount = document.getElementById('forms-count');
      formsCount.textContent = `${app.attachedFormUrls.length} file${app.attachedFormUrls.length !== 1 ? 's' : ''}`;
    }

    // Resume
    if (app.resumeURL) {
      const resumeElement = document.getElementById('resume-document');
      resumeElement.classList.remove('hidden');
      resumeElement.classList.add('animate-fade-in');
    }

    // Cover Letter
    if (app.coverLetter) {
      const coverLetterElement = document.getElementById('cover-letter-document');
      coverLetterElement.classList.remove('hidden');
      coverLetterElement.classList.add('animate-fade-in');
    }
  }

  /**
   * Update application timeline
   */
  updateApplicationTimeline(app) {
    // Application date
    const appDate = app.applicationDate instanceof Date 
      ? app.applicationDate 
      : new Date(app.applicationDate);
    
    document.getElementById('application-date').textContent = 
      appDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

    // Update timeline based on status
    const reviewIcon = document.getElementById('review-status-icon');
    const decisionIcon = document.getElementById('decision-status-icon');
    const decisionText = document.getElementById('decision-status-text');

    if (app.applicationStatus.toLowerCase() === 'pending') {
      reviewIcon.innerHTML = '<span class="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-sm">schedule</span>';
      decisionText.textContent = 'Awaiting decision';
    } else if (app.applicationStatus.toLowerCase() === 'under review') {
      reviewIcon.innerHTML = '<span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">visibility</span>';
      decisionText.textContent = 'Currently under review';
    } else if (app.applicationStatus.toLowerCase() === 'accepted' || app.applicationStatus.toLowerCase() === 'approved') {
      reviewIcon.innerHTML = '<span class="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">check</span>';
      decisionIcon.innerHTML = '<span class="material-symbols-outlined text-green-600 dark:text-green-400 text-sm">check_circle</span>';
      decisionText.textContent = 'Application accepted!';
      decisionText.className = 'text-sm text-green-600 dark:text-green-400 font-medium';
    } else if (app.applicationStatus.toLowerCase() === 'rejected') {
      reviewIcon.innerHTML = '<span class="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">cancel</span>';
      decisionIcon.innerHTML = '<span class="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">cancel</span>';
      decisionText.textContent = 'Application not selected';
      decisionText.className = 'text-sm text-red-600 dark:text-red-400 font-medium';
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Document view buttons
    document.querySelectorAll('.document-view-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const docType = e.currentTarget.dataset.type;
        this.viewDocument(docType);
      });
    });

    // Download application button
    const downloadBtn = document.getElementById('download-application-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadApplicationPackage());
    }

    // Contact company button
    const contactBtn = document.getElementById('contact-company-btn');
    if (contactBtn) {
      contactBtn.addEventListener('click', () => this.contactCompany());
    }

    // Update application button
    const updateBtn = document.getElementById('update-application-btn');
    if (updateBtn) {
      updateBtn.addEventListener('click', () => this.updateApplication());
    }

    // Document preview modal
    const closePreviewBtn = document.getElementById('close-preview');
    const closePreviewBtn2 = document.getElementById('close-preview-btn');
    const previewModal = document.getElementById('document-preview-modal');
    const appHeader = document.getElementById('app-header');

    if (closePreviewBtn) {
      closePreviewBtn.addEventListener('click', () => this.closeDocumentPreview());
    }
    if (closePreviewBtn2) {
      closePreviewBtn2.addEventListener('click', () => this.closeDocumentPreview());
    }
    if (previewModal) {
      previewModal.addEventListener('click', (e) => {
        if (e.target.id === 'document-preview-modal') {
          this.closeDocumentPreview();
        }
      });
    }

    if(appHeader)
    {
        appHeader.addEventListener('click',
            (e)=>
            {
                this.navigateToCompanyProfile(e);
            }
        );
    }
  }
  
  // navigate to Company profile
  navigateToCompanyProfile(e)
  {
    try{
        window.location.href = "../company_profile.html?id="+this.companyId;
    }
    catch(error)
    {
        console.error("error while navigate to company profile "+error);
    }
  }

  /**
   * View document in preview modal
   */
  viewDocument(docType) {
    let fileUrl = '';
    let title = '';

    switch (docType) {
      case 'id-card':
        fileUrl = this.currentApplication.idCardUrl;
        title = 'ID Card';
        break;
      case 'training-letter':
        fileUrl = this.currentApplication.itLetterUrl;
        title = 'Training Letter';
        break;
      case 'application-forms':
        fileUrl = this.currentApplication.attachedFormUrls?.[0] || '';
        title = 'Application Forms';
        break;
      case 'resume':
        fileUrl = this.currentApplication.resumeURL;
        title = 'Resume/CV';
        break;
      case 'cover-letter':
        fileUrl = this.currentApplication.coverLetter;
        title = 'Cover Letter';
        break;
    }

    if (!fileUrl) {
      this.showError('Document not available');
      return;
    }

    const modal = document.getElementById('document-preview-modal');
    const previewTitle = document.getElementById('preview-title');
    const previewFrame = document.getElementById('preview-frame');
    const downloadLink = document.getElementById('preview-download-link');

    previewTitle.textContent = title;
    previewFrame.src = fileUrl;
    downloadLink.href = fileUrl;
    downloadLink.download = fileUrl.split('/').pop() || 'document';

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close document preview modal
   */
  closeDocumentPreview() {
    const modal = document.getElementById('document-preview-modal');
    const previewFrame = document.getElementById('preview-frame');
    
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Clear the iframe source
    setTimeout(() => {
      previewFrame.src = '';
    }, 300);
  }

  /**
   * Download application package
   */
  async downloadApplicationPackage() {
    try {
      // Collect all document URLs
      const documents = [];
      
      if (this.currentApplication.idCardUrl) {
        documents.push({ url: this.currentApplication.idCardUrl, name: 'ID_Card' });
      }
      if (this.currentApplication.itLetterUrl) {
        documents.push({ url: this.currentApplication.itLetterUrl, name: 'Training_Letter' });
      }
      if (this.currentApplication.resumeURL) {
        documents.push({ url: this.currentApplication.resumeURL, name: 'Resume' });
      }
      if (this.currentApplication.coverLetter) {
        documents.push({ url: this.currentApplication.coverLetter, name: 'Cover_Letter' });
      }
      if (this.currentApplication.attachedFormUrls && this.currentApplication.attachedFormUrls.length > 0) {
        this.currentApplication.attachedFormUrls.forEach((url, index) => {
          documents.push({ url, name: `Application_Form_${index + 1}` });
        });
      }

      if (documents.length === 0) {
        this.showError('No documents available to download');
        return;
      }

      // For now, download the first document
      // In a real implementation, you might want to create a ZIP file
      const firstDoc = documents[0];
      const link = document.createElement('a');
      link.href = firstDoc.url;
      link.download = `${firstDoc.name}_${this.currentApplication.position.replace(/\s+/g, '_')}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showNotification('Document download started', 'success');
    } catch (error) {
      console.error('Error downloading application package:', error);
      this.showError('Failed to download application package');
    }
  }

  /**
   * Contact company
   */
  contactCompany() {
    if (!this.currentApplication.internship?.company) {
      this.showError('Company information not available');
      return;
    }

    const company = this.currentApplication.internship.company;
    const subject = `Regarding my application for ${this.currentApplication.position}`;
    const body = `Dear ${company.name} Team,\n\nI am writing regarding my application for the ${this.currentApplication.position} position. My application ID is ${this.currentApplication.id}.\n\nBest regards,\n${this.currentStudent.fullName}`;
    
    const mailtoLink = `mailto:${company.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }

  /**
   * Update application
   */
  updateApplication() {
    // Redirect to application update page
    window.location.href = `../student/update_application.html?id=${this.applicationId}&companyId=${this.companyId}&itId=${this.itId}`;
  }

  /**
   * Remove skeleton loaders
   */
  removeSkeletons() {
    document.querySelectorAll('.skeleton').forEach(element => {
      element.classList.remove('skeleton');
    });
  }

  /**
   * Add content animations
   */
  addContentAnimations() {
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
      section.style.animationDelay = `${index * 0.1}s`;
      section.classList.add('animate-fade-in');
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 z-50 animate-fade-in';
    errorDiv.innerHTML = `
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-lg max-w-sm">
        <div class="flex items-start gap-3">
          <div class="p-1.5 rounded-lg bg-red-100 dark:bg-red-800/30">
            <span class="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
          </div>
          <div class="flex-1">
            <p class="font-medium text-red-800 dark:text-red-300">Error</p>
            <p class="text-sm text-red-700 dark:text-red-400 mt-1">${message}</p>
          </div>
          <button class="close-error text-red-400 hover:text-red-600 dark:hover:text-red-300">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => errorDiv.remove(), 300);
      }
    }, 5000);
    
    // Close button
    errorDiv.querySelector('.close-error').addEventListener('click', () => {
      errorDiv.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => errorDiv.remove(), 300);
    });
  }

  /**
   * Show notification
   */
  showNotification(message, type = "info") {
    const types = {
      info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-300', icon: 'info' },
      success: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-300', icon: 'check_circle' },
      error: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-300', icon: 'error' },
      warning: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-300', icon: 'warning' }
    };
    
    const config = types[type] || types.info;
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 animate-fade-in`;
    notification.innerHTML = `
      <div class="${config.bg} ${config.border} rounded-xl p-4 shadow-lg max-w-sm transform transition-all duration-300">
        <div class="flex items-start gap-3">
          <div class="p-1.5 rounded-lg ${config.bg.replace('50', '100')} dark:${config.bg.replace('20', '30')}">
            <span class="material-symbols-outlined ${config.text}">${config.icon}</span>
          </div>
          <div class="flex-1">
            <p class="${config.text} font-medium">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
            <p class="text-sm ${config.text.replace('800', '700')} dark:${config.text.replace('300', '400')} mt-1">${message}</p>
          </div>
          <button class="close-notification ${config.text} hover:opacity-70">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
    
    // Close button
    notification.querySelector('.close-notification').addEventListener('click', () => {
      notification.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => notification.remove(), 300);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new StudentApplicationDetails();
});