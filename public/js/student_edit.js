import { CompanyCloud } from "../js/fireabase/CompanyCloud.js";
import { auth } from "../js/config/firebaseInit.js";
import { Student } from "./model/Student.js";

const companyCloud = new CompanyCloud();

class StudentEdit {
    constructor() {
        this.currentStudent = null;
        this.skills = [];
        this.certifications = [];
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            
            
            await auth.authStateReady();
            const currentUser = auth.currentUser;
            
            if (!currentUser) {
                this.showError("Please log in to edit your profile");
                return;
            }

            // Load student data
            this.currentStudent = await companyCloud.getCurrentStudent();
            //console.log("currentStudent "+this.currentStudent);
            
            if (!this.currentStudent) {
                this.showError("Student profile not found");
                return;
            }

            // Initialize form with student data
            this.initializeForm();
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error("Error loading student profile:", error);
            this.showError("Failed to load profile. Please try again.");
        }
    }

    initializeForm() {
        // Hide loading, show form
        this.hideLoading();
        this.showForm();

        // Populate header profile image
        this.setProfileImage('header-profile-image', this.currentStudent.imageUrl);
        
        // Populate profile picture preview
        this.setProfileImage('profile-picture-preview', this.currentStudent.imageUrl);

        // Populate personal information
        this.setInputValue('full-name', this.currentStudent.fullName);
        this.setInputValue('email', this.currentStudent.email);
        this.setInputValue('phone-number', this.currentStudent.phoneNumber);
        this.setInputValue('date-of-birth', this.formatDateForInput(this.currentStudent.dateOfBirth));
        this.setTextareaValue('bio', this.currentStudent.bio);

        // Populate academic information
        this.setInputValue('institution', this.currentStudent.institution);
        this.setInputValue('school-faculty', this.currentStudent.school || this.currentStudent.faculty);
        this.setInputValue('department', this.currentStudent.department);
        this.setInputValue('course-of-study', this.currentStudent.courseOfStudy || this.currentStudent.program);
        this.setSelectValue('level', this.currentStudent.level);
        this.setInputValue('matric-number', this.currentStudent.matricNumber || this.currentStudent.studentId);

        // Populate skills
        this.skills = this.currentStudent.skills || [];
        this.populateSkills();

        // Populate portfolio
        this.setTextareaValue('portfolio-description', this.currentStudent.portfolioDescription);

        // Populate certifications
        this.certifications = this.currentStudent.certifications || [];
        this.populateCertifications();
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('profile-form');
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Cancel button
        const cancelBtn = document.getElementById('cancel-btn');
        cancelBtn.addEventListener('click', () => this.handleCancel());

        // Skills management
        const addSkillBtn = document.getElementById('add-skill-btn');
        const skillInput = document.getElementById('skill-input');
        
        addSkillBtn.addEventListener('click', () => this.addSkill());
        skillInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addSkill();
            }
        });

        // Certifications management
        const addCertificationBtn = document.getElementById('add-certification-btn');
        addCertificationBtn.addEventListener('click', () => this.addCertification());

        // Profile picture upload
        const profilePictureInput = document.getElementById('profile-picture');
        profilePictureInput.addEventListener('change', (e) => this.handleProfilePictureChange(e));

        // File upload previews
        this.setupFileUploadPreviews();
        
        //Setup drag and Drop 
        this.setupDragAndDrop();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            // Show loading state on button
            const submitBtn = document.getElementById('update-profile-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Updating...';
            submitBtn.disabled = true;

            // Collect form data
            const updates = this.collectFormData();

             // Handle file uploads if any
        await this.handleFileUploads(updates);

        // Update profile with form data (excluding files)
        const { profilePicture, resumeCv, coverLetter, portfolioFiles, ...profileUpdates } = updates;
        await companyCloud.updateStudentProfile(auth.currentUser.uid, profileUpdates);
            
            // Show success message
            this.showSuccess('Profile updated successfully!');
            
            // Redirect to profile page after a short delay
            setTimeout(() => {
                window.location.href = 'student_profile.html';
            }, 1500);

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showError('Failed to update profile. Please try again.');
            
            // Reset button state
            const submitBtn = document.getElementById('update-profile-btn');
            submitBtn.textContent = 'Update Profile';
            submitBtn.disabled = false;
        }
    }

    async handleFileUploads(updates) {
    // Handle profile picture upload
      auth.authStateReady();
    const profilePictureInput = document.getElementById('profile-picture');
    if (profilePictureInput.files[0]) {
          //console.log(this.currentStudent.toMap());
           if(!auth.currentUser.uid || !profilePictureInput.files[0])
           {
            //console.log("the current user id is "+auth.currentUser.uid+" and the profile pic is "+profilePictureInput.files[0]);
           }
        const imageUrl = await companyCloud.uploadStudentImage(
            auth.currentUser.uid, 
            profilePictureInput.files[0]
        );
        updates.imageUrl = imageUrl;
    }

    // Handle resume upload
    const resumeInput = document.getElementById('resume-cv');
    if (resumeInput.files[0]) {
        const resumeUrl = await companyCloud.uploadStudentResume(
            auth.currentUser.uid, 
            resumeInput.files[0]
        );
        updates.resumeUrl = resumeUrl;
    }

    // Handle cover letter upload
    const coverLetterInput = document.getElementById('cover-letter');
    if (coverLetterInput.files[0]) {
        const coverLetterUrl = await companyCloud.uploadStudentCoverLetter(
            auth.currentUser.uid, 
            coverLetterInput.files[0]
        );
        updates.coverLetterUrl = coverLetterUrl;
    }
}

    collectFormData() {
        const updates = {
            // Personal information
            fullName: this.getInputValue('full-name'),
            email: this.getInputValue('email'),
            phoneNumber: this.getInputValue('phone-number'),
            dateOfBirth: this.getInputValue('date-of-birth'),
            bio: this.getTextareaValue('bio'),

            // Academic information
            institution: this.getInputValue('institution'),
            school: this.getInputValue('school-faculty'),
            department: this.getInputValue('department'),
            courseOfStudy: this.getInputValue('course-of-study'),
            level: this.getSelectValue('level'),
            matricNumber: this.getInputValue('matric-number'),
            major: this.getInputValue('major'),

            // Skills and portfolio
            skills: this.skills,
            portfolioDescription: this.getTextareaValue('portfolio-description'),
            certifications: this.certifications,

            // Timestamp
            updatedAt: new Date().toISOString()
        };

        // Remove empty fields
        Object.keys(updates).forEach(key => {
            if (updates[key] === '' || updates[key] === null || updates[key] === undefined) {
                delete updates[key];
            }
        });

        return updates;
    }

    handleCancel() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            window.location.href = 'student_profile.html';
        }
    }

    // Skills Management
    addSkill() {
        const skillInput = document.getElementById('skill-input');
        const skill = skillInput.value.trim();
        
        if (skill && !this.skills.includes(skill)) {
            this.skills.push(skill);
            this.populateSkills();
            skillInput.value = '';
        }
    }

    removeSkill(skillToRemove) {
        this.skills = this.skills.filter(skill => skill !== skillToRemove);
        this.populateSkills();
    }

    populateSkills() {
        const skillsContainer = document.getElementById('skills-container');
        skillsContainer.innerHTML = '';

        if (this.skills.length === 0) {
            skillsContainer.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-sm">No skills added yet.</p>';
            return;
        }

        this.skills.forEach(skill => {
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-tag';
            skillElement.innerHTML = `
                ${skill}
                <button type="button" onclick="studentEdit.removeSkill('${skill}')" class="ml-2">×</button>
            `;
            skillsContainer.appendChild(skillElement);
        });
    }

    // Certifications Management
    addCertification() {
        this.certifications.push({
            name: '',
            issuer: '',
            date: '',
            url: ''
        });
        this.populateCertifications();
    }

    removeCertification(index) {
        this.certifications.splice(index, 1);
        this.populateCertifications();
    }

    updateCertification(index, field, value) {
        if (this.certifications[index]) {
            this.certifications[index][field] = value;
        }
    }

    populateCertifications() {
        const container = document.getElementById('certifications-container');
        container.innerHTML = '';

        if (this.certifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-slate-500 dark:text-slate-400">
                    <p>No certifications added yet.</p>
                </div>
            `;
            return;
        }

        this.certifications.forEach((cert, index) => {
            const certElement = document.createElement('div');
            certElement.className = 'border border-slate-200 dark:border-slate-700 rounded-lg p-4';
            certElement.innerHTML = `
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Certification Name</label>
                        <input
                            type="text"
                            value="${cert.name || ''}"
                            onchange="studentEdit.updateCertification(${index}, 'name', this.value)"
                            class="mt-1 block w-full rounded border-slate-300 bg-white py-2 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-background-dark dark:text-white dark:placeholder:text-slate-500 sm:text-sm"
                            placeholder="e.g., AWS Certified Developer"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Issuer</label>
                        <input
                            type="text"
                            value="${cert.issuer || ''}"
                            onchange="studentEdit.updateCertification(${index}, 'issuer', this.value)"
                            class="mt-1 block w-full rounded border-slate-300 bg-white py-2 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-background-dark dark:text-white dark:placeholder:text-slate-500 sm:text-sm"
                            placeholder="e.g., Amazon Web Services"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Issue Date</label>
                        <input
                            type="date"
                            value="${cert.date || ''}"
                            onchange="studentEdit.updateCertification(${index}, 'date', this.value)"
                            class="mt-1 block w-full rounded border-slate-300 bg-white py-2 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-background-dark dark:text-white dark:placeholder:text-slate-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Certificate URL (Optional)</label>
                        <input
                            type="url"
                            value="${cert.url || ''}"
                            onchange="studentEdit.updateCertification(${index}, 'url', this.value)"
                            class="mt-1 block w-full rounded border-slate-300 bg-white py-2 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-background-dark dark:text-white dark:placeholder:text-slate-500 sm:text-sm"
                            placeholder="https://..."
                        />
                    </div>
                </div>
                <div class="mt-3 flex justify-end">
                    <button
                        type="button"
                        onclick="studentEdit.removeCertification(${index})"
                        class="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                        Remove Certification
                    </button>
                </div>
            `;
            container.appendChild(certElement);
        });
    }

    // File Upload Handlers
    async handleProfilePictureChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type and size
        if (!this.validateImageFile(file)) return;

        try {
            // Show loading state
            const preview = document.getElementById('profile-picture-preview');
            preview.classList.add('loading-skeleton');

            // Here you would upload the file to Firebase Storage
            // const imageUrl = await companyCloud.uploadStudentImage(auth.currentUser.uid, file);
            
            // For now, we'll create a local URL for preview
            const imageUrl = URL.createObjectURL(file);
            this.setProfileImage('profile-picture-preview', imageUrl);
            this.setProfileImage('header-profile-image', imageUrl);

            // Update current student data
            this.currentStudent.imageUrl = imageUrl;

        } catch (error) {
            console.error('Error uploading profile picture:', error);
            alert('Failed to upload profile picture. Please try again.');
        }
    }

    setupFileUploadPreviews() {
        // Setup file upload change listeners for resume and other documents
        const fileInputs = ['resume-cv', 'cover-letter', 'portfolio-files'];
        
        fileInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', (e) => this.handleFileUpload(e, inputId));
            }
        });
    }

    handleFileUpload(e, inputId) {
        let file;
    
    // Handle both change events and drop events
    if (e.type === 'drop') {
        file = e.dataTransfer.files[0];
    } else {
        file = e.target.files[0];
    }
    
    if (!file) return;

    if (!this.validateFile(file, inputId)) {
        // Reset the input if validation fails
        e.target.value = '';
        return;
    }

    //console.log(`File selected for ${inputId}:`, file.name);
    
    // Update the UI to show the file name
    this.updateFileDisplay(inputId, file);
    
    this.showSuccess(`${this.getFileTypeName(inputId)} uploaded successfully!`);
    }

    updateFileDisplay(inputId, file) {
    const dropZoneId = this.getDropZoneId(inputId);
    const dropZone = document.getElementById(dropZoneId);
    
    if (!dropZone) return;

    // Create or update file info display
    let fileInfo = dropZone.querySelector('.file-info');
    
    if (!fileInfo) {
        fileInfo = document.createElement('div');
        fileInfo.className = 'file-info mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs';
        dropZone.appendChild(fileInfo);
    }

    if (inputId === 'portfolio-files') {
        // Handle multiple files for portfolio
        const files = document.getElementById(inputId).files;
        if (files.length > 1) {
            fileInfo.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="text-slate-700 dark:text-slate-300">${files.length} files selected</span>
                    <button type="button" onclick="studentEdit.clearFiles('${inputId}')" class="text-red-500 hover:text-red-700">×</button>
                </div>
            `;
        } else {
            fileInfo.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="text-slate-700 dark:text-slate-300">${file.name}</span>
                    <button type="button" onclick="studentEdit.clearFiles('${inputId}')" class="text-red-500 hover:text-red-700">×</button>
                </div>
            `;
        }
    } else {
        // Handle single files
        fileInfo.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-slate-700 dark:text-slate-300">${file.name}</span>
                <button type="button" onclick="studentEdit.clearFiles('${inputId}')" class="text-red-500 hover:text-red-700">×</button>
            </div>
        `;
    }
}

getDropZoneId(inputId) {
    const map = {
        'profile-picture': 'profile-picture-preview',
        'resume-cv': 'resume-drop-zone',
        'cover-letter': 'cover-letter-drop-zone',
        'portfolio-files': 'portfolio-drop-zone'
    };
    return map[inputId];
}

clearFiles(inputId) {
    const fileInput = document.getElementById(inputId);
    const dropZoneId = this.getDropZoneId(inputId);
    const dropZone = document.getElementById(dropZoneId);
    
    // Clear the file input
    fileInput.value = '';
    
    // Remove file info display
    const fileInfo = dropZone.querySelector('.file-info');
    if (fileInfo) {
        fileInfo.remove();
    }
    
    // If it's the profile picture, reset to default avatar
    if (inputId === 'profile-picture') {
        this.setProfileImage('profile-picture-preview', this.currentStudent.imageUrl);
        this.setProfileImage('header-profile-image', this.currentStudent.imageUrl);
    }
    
    this.showSuccess('File removed');
}

    // Validation Methods
    validateImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, or WebP).');
            return false;
        }

        if (file.size > maxSize) {
            alert('Image size must be less than 5MB.');
            return false;
        }

        return true;
    }

    validateFile(file, inputId) {
        const maxSizes = {
            'resume-cv': 5 * 1024 * 1024, // 5MB
            'cover-letter': 5 * 1024 * 1024, // 5MB
            'portfolio-files': 10 * 1024 * 1024 // 10MB
        };

        const validTypes = {
            'resume-cv': ['.pdf', '.doc', '.docx'],
            'cover-letter': ['.pdf', '.doc', '.docx'],
            'portfolio-files': ['.pdf', '.jpg', '.jpeg', '.png', '.zip']
        };

        if (file.size > maxSizes[inputId]) {
            alert(`File size must be less than ${maxSizes[inputId] / 1024 / 1024}MB.`);
            return false;
        }

        // Basic file extension check
        const fileName = file.name.toLowerCase();
        const validExtensions = validTypes[inputId];
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!hasValidExtension) {
            alert(`Please select a valid file type: ${validExtensions.join(', ')}`);
            return false;
        }

        return true;
    }

    getFileTypeName(inputId) {
        const names = {
            'resume-cv': 'Resume',
            'cover-letter': 'Cover letter',
            'portfolio-files': 'Portfolio files'
        };
        return names[inputId] || 'File';
    }

    // Utility Methods
    setInputValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value) {
            element.value = value;
        }
    }

    getInputValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    }

    setTextareaValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value) {
            element.value = value;
        }
    }

    getTextareaValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    }

    setSelectValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element && value) {
            element.value = value;
        }
    }

    getSelectValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    }

    setProfileImage(elementId, imageUrl) {
        const element = document.getElementById(elementId);
        if (element && imageUrl) {
            element.style.backgroundImage = `url('${imageUrl}')`;
            element.classList.remove('loading-skeleton');
        } else if (element) {
            element.style.backgroundImage = `url('${this.generateDefaultAvatar()}')`;
            element.classList.remove('loading-skeleton');
        }
    }

    formatDateForInput(date) {
        if (!date) return '';
        
        try {
            if (date instanceof Date) {
                return date.toISOString().split('T')[0];
            }
            
            if (typeof date === 'string' || typeof date === 'number') {
                return new Date(date).toISOString().split('T')[0];
            }
            
            return '';
        } catch (error) {
            return '';
        }
    }



    generateDefaultAvatar() {
        const colors = ['607afb', '10b981', 'f59e0b', 'ef4444', '8b5cf6'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const name = this.currentStudent?.fullName || 'U';
        const initial = name.charAt(0).toUpperCase();
        
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${color}&color=fff&size=150&bold=true`;
    }

    // UI State Management
    showLoading() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('profile-form').classList.add('hidden');
        document.getElementById('error-state').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading-state').classList.add('hidden');
    }

    showForm() {
        document.getElementById('profile-form').classList.remove('hidden');
    }

    showError(message) {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('profile-form').classList.add('hidden');
        
        const errorState = document.getElementById('error-state');
        const errorMessage = document.getElementById('error-message');
        const retryBtn = document.getElementById('retry-btn');
        
        errorMessage.textContent = message;
        errorState.classList.remove('hidden');
        
        retryBtn.onclick = () => {
            this.init();
        };
    }

    showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 3000);
    }

    // Drag and drop section 

     setupDragAndDrop() {
    // Profile picture drag and drop
    const profileDropZone = document.getElementById('profile-picture-preview');
    if (profileDropZone) {
        this.setupSingleFileDragDrop(profileDropZone, 'profile-picture');
    }

    // Resume/CV drag and drop
    const resumeDropZone = document.getElementById('resume-drop-zone');
    if (resumeDropZone) {
        this.setupSingleFileDragDrop(resumeDropZone, 'resume-cv');
    }

    // Cover letter drag and drop
    const coverLetterDropZone = document.getElementById('cover-letter-drop-zone');
    if (coverLetterDropZone) {
        this.setupSingleFileDragDrop(coverLetterDropZone, 'cover-letter');
    }

    // Portfolio files drag and drop (multiple files)
    const portfolioDropZone = document.getElementById('portfolio-drop-zone');
    if (portfolioDropZone) {
        this.setupMultiFileDragDrop(portfolioDropZone, 'portfolio-files');
    }
     this.setupDropZoneClick('profile-picture-preview', 'profile-picture');
    this.setupDropZoneClick('resume-drop-zone', 'resume-cv');
    this.setupDropZoneClick('cover-letter-drop-zone', 'cover-letter');
    this.setupDropZoneClick('portfolio-drop-zone', 'portfolio-files');
}

setupDropZoneClick(dropZoneId, inputId) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(inputId);
    
    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });
    }
}

 setupSingleFileDragDrop(dropZone, inputId) {
    const fileInput = document.getElementById(inputId);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('drag-over');
    }

    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            
            // Trigger the change event
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    }
}

 setupMultiFileDragDrop(dropZone, inputId) {
    const fileInput = document.getElementById(inputId);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('drag-over');
    }

    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            // For multiple files, we need to create a new FileList
            const dataTransfer = new DataTransfer();
            for (let file of files) {
                dataTransfer.items.add(file);
            }
            fileInput.files = dataTransfer.files;
            
            // Trigger the change event
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    }
}

}
// End of Student Edit



let studentEdit;
document.addEventListener("DOMContentLoaded", () => {
    studentEdit = new StudentEdit();
});


window.studentEdit = studentEdit;