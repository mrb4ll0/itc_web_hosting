import { Student } from "./Student.js";
import { IndustrialTraining } from "./internship_model.js";

export class StudentApplication {
  constructor({ 
    id = null, // Add ID parameter
    student, 
    internship, 
    applicationStatus, 
    applicationDate, 
    applicationFiles,
    coverLetter = "", // Add coverLetter parameter
    resumeURL = "", // Add resumeURL parameter
    duration = null // Add duration parameter
  }) {
    this.id = id; // Store the ID
    this.student = student; // instance of Student
    this.internship = internship; // instance of IndustrialTraining
    this.applicationStatus = applicationStatus; // string
    this.applicationDate = applicationDate instanceof Date ? applicationDate : new Date(applicationDate);
    this.applicationFiles = this._initializeApplicationFiles(applicationFiles);
    this.coverLetter = coverLetter; // Store cover letter
    this.resumeURL = resumeURL; // Store resume URL
    this.duration = this._initializeDuration(duration); // Initialize duration
  }

  /**
   * Initialize application files with proper structure
   * @param {Object} applicationFiles - Raw application files data
   * @returns {Object} Structured application files
   */
  _initializeApplicationFiles(applicationFiles) {
    // Default structure
    const defaultFiles = {
      idCard: null,
      trainingLetter: null,
      applicationForms: [],
      resume: null,
      coverLetter: null,
      otherDocuments: []
    };

    if (!applicationFiles) {
      return defaultFiles;
    }

    // Merge provided files with default structure
    return {
      ...defaultFiles,
      ...applicationFiles,
      // Ensure arrays are properly initialized
      applicationForms: Array.isArray(applicationFiles.applicationForms) 
        ? applicationFiles.applicationForms 
        : [],
      otherDocuments: Array.isArray(applicationFiles.otherDocuments) 
        ? applicationFiles.otherDocuments 
        : []
    };
  }

  /**
   * Initialize duration with proper structure
   * @param {Object} duration - Raw duration data
   * @returns {Object} Structured duration data
   */
  _initializeDuration(duration) {
    // Default structure
    const defaultDuration = {
      months: 0,
      displayText: "",
      startDate: null,
      endDate: null,
      totalDays: 0,
      totalWeeks: 0
    };

    if (!duration) {
      return defaultDuration;
    }

    // Merge provided duration with default structure
    const mergedDuration = {
      ...defaultDuration,
      ...duration
    };

    // Convert string dates to Date objects if needed
    if (mergedDuration.startDate && typeof mergedDuration.startDate === 'string') {
      mergedDuration.startDate = new Date(mergedDuration.startDate);
    }
    if (mergedDuration.endDate && typeof mergedDuration.endDate === 'string') {
      mergedDuration.endDate = new Date(mergedDuration.endDate);
    }

    return mergedDuration;
  }

  static convertFirestoreTimestamp(timestamp) {
    //console.log("Converting timestamp:", timestamp);
    if (!timestamp) return null;
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
        return timestamp;
    }
    
    
    if (timestamp.seconds !== undefined) {
        //console.log("Converting Firestore timestamp:", timestamp.seconds, timestamp.nanoseconds);
        return new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000));
    }
    
    
    try {
        return new Date(timestamp);
    } catch (error) {
        console.warn('Invalid date format:', timestamp);
        return null;
    }
}

  // CopyWith pattern - updated with duration field
  copyWith({ 
    id,
    student, 
    internship, 
    applicationStatus, 
    applicationDate, 
    applicationFiles,
    coverLetter,
    resumeURL,
    duration
  } = {}) {
    return new StudentApplication({
      id: id || this.id,
      student: student || this.student,
      internship: internship || this.internship,
      applicationStatus: applicationStatus || this.applicationStatus,
      applicationDate: applicationDate || this.applicationDate,
      applicationFiles: applicationFiles || { ...this.applicationFiles },
      coverLetter: coverLetter || this.coverLetter,
      resumeURL: resumeURL || this.resumeURL,
      duration: duration || { ...this.duration }
    });
  }

  // Convert to plain object (map) for Firestore - updated with duration field
  toMap() {
    return {
      id: this.id, // Include ID in the map
      student: this._safeToMap(this.student),
      internship: this._safeToMap(this.internship),
      applicationStatus: this.applicationStatus,
      applicationDate: this.applicationDate.toISOString(),
      applicationFiles: {
        idCard: this.applicationFiles.idCard,
        trainingLetter: this.applicationFiles.trainingLetter,
        applicationForms: this.applicationFiles.applicationForms,
        resume: this.applicationFiles.resume,
        coverLetter: this.applicationFiles.coverLetter,
        otherDocuments: this.applicationFiles.otherDocuments
      },
      coverLetter: this.coverLetter,
      resumeURL: this.resumeURL,
      duration: {
        months: this.duration.months,
        displayText: this.duration.displayText,
        startDate: this.duration.startDate ? this.duration.startDate.toISOString().split('T')[0] : null,
        endDate: this.duration.endDate ? this.duration.endDate.toISOString().split('T')[0] : null,
        totalDays: this.duration.totalDays,
        totalWeeks: this.duration.totalWeeks
      }
    };
  }

  // Create instance from map/object - updated with duration field
  static fromMap(map, itId = null,appId=null) {
    return new StudentApplication({
      id: appId || null,
      student: Student.fromMap(map.student),
      internship: IndustrialTraining.fromMap(map.internship, itId),
      applicationStatus: map.applicationStatus,
      applicationDate: this.convertFirestoreTimestamp(map.applicationDate),
      applicationFiles: map.applicationFiles || {},
      coverLetter: map.coverLetter || "",
      resumeURL: map.resumeURL || "",
      duration: map.duration || null
    });
  }

  // Convert to JSON string
  toJson() {
    return JSON.stringify(this.toMap());
  }

  // Create from JSON string
  static fromJson(jsonString, itId = null) {
    const map = JSON.parse(jsonString);
    return StudentApplication.fromMap(map, itId);
  }

  // Duration Management Methods

  /**
   * Set duration information
   * @param {Object} durationData - Duration data object
   * @param {number} durationData.months - Number of months
   * @param {string} durationData.displayText - Display text (e.g., "3 Months")
   * @param {Date|string} durationData.startDate - Start date
   * @param {Date|string} durationData.endDate - End date
   */
  setDuration(durationData) {
    this.duration = this._initializeDuration(durationData);
    
    // Calculate total days and weeks if dates are provided
    if (this.duration.startDate && this.duration.endDate) {
      this._calculateDurationMetrics();
    }
  }

  /**
   * Update duration months and recalculate end date
   * @param {number} months - Number of months
   */
  setDurationMonths(months) {
    this.duration.months = months;
    this.duration.displayText = this._getDurationText(months);
    
    // Recalculate end date if start date exists
    if (this.duration.startDate) {
      this._calculateEndDateFromMonths();
    }
  }

  /**
   * Update start date and recalculate end date
   * @param {Date|string} startDate - Start date
   */
  setStartDate(startDate) {
    this.duration.startDate = startDate instanceof Date ? startDate : new Date(startDate);
    
    // Recalculate end date if months are set
    if (this.duration.months > 0) {
      this._calculateEndDateFromMonths();
    }
    
    this._calculateDurationMetrics();
  }

  /**
   * Update end date and recalculate duration
   * @param {Date|string} endDate - End date
   */
  setEndDate(endDate) {
    this.duration.endDate = endDate instanceof Date ? endDate : new Date(endDate);
    
    // Recalculate months if start date exists
    if (this.duration.startDate) {
      this._calculateMonthsFromDates();
    }
    
    this._calculateDurationMetrics();
  }

  /**
   * Calculate end date based on start date and months
   */
  _calculateEndDateFromMonths() {
    if (!this.duration.startDate || !this.duration.months) return;
    
    const endDate = new Date(this.duration.startDate);
    endDate.setMonth(endDate.getMonth() + this.duration.months);
    this.duration.endDate = endDate;
  }

  /**
   * Calculate months based on start and end dates
   */
  _calculateMonthsFromDates() {
    if (!this.duration.startDate || !this.duration.endDate) return;
    
    const diffTime = Math.abs(this.duration.endDate - this.duration.startDate);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average month length
    
    this.duration.months = diffMonths;
    this.duration.displayText = this._getDurationText(diffMonths);
  }

  /**
   * Calculate total days and weeks
   */
  _calculateDurationMetrics() {
    if (!this.duration.startDate || !this.duration.endDate) return;
    
    const diffTime = Math.abs(this.duration.endDate - this.duration.startDate);
    this.duration.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.duration.totalWeeks = Math.ceil(this.duration.totalDays / 7);
  }

  /**
   * Get duration display text
   * @param {number} months - Number of months
   * @returns {string} Formatted duration text
   */
  _getDurationText(months) {
    const durationMap = {
      1: '1 Month',
      3: '3 Months',
      6: '6 Months',
      12: '1 Year'
    };
    
    return durationMap[months] || `${months} Months`;
  }

  /**
   * Check if duration is valid and complete
   * @returns {boolean} True if duration is valid
   */
  hasValidDuration() {
    return (
      this.duration.months > 0 &&
      this.duration.startDate instanceof Date &&
      this.duration.endDate instanceof Date &&
      this.duration.endDate > this.duration.startDate
    );
  }

  /**
   * Get duration summary for display
   * @returns {Object} Duration summary
   */
  getDurationSummary() {
    return {
      months: this.duration.months,
      displayText: this.duration.displayText,
      startDate: this.duration.startDate,
      endDate: this.duration.endDate,
      totalDays: this.duration.totalDays,
      totalWeeks: this.duration.totalWeeks,
      isValid: this.hasValidDuration()
    };
  }

  /**
   * Get formatted date range string
   * @returns {string} Formatted date range
   */
  getFormattedDateRange() {
    if (!this.duration.startDate || !this.duration.endDate) {
      return "Dates not set";
    }
    
    const startFormatted = this.duration.startDate.toLocaleDateString();
    const endFormatted = this.duration.endDate.toLocaleDateString();
    return `${startFormatted} - ${endFormatted}`;
  }

  // File management methods (existing - unchanged)
  /**
   * Add ID card file
   * @param {string} fileUrl - URL of the uploaded ID card
   */
  setIdCard(fileUrl) {
    this.applicationFiles.idCard = fileUrl;
  }

  /**
   * Add training letter file
   * @param {string} fileUrl - URL of the uploaded training letter
   */
  setTrainingLetter(fileUrl) {
    this.applicationFiles.trainingLetter = fileUrl;
  }

  /**
   * Add resume file
   * @param {string} fileUrl - URL of the uploaded resume
   */
  setResume(fileUrl) {
    this.applicationFiles.resume = fileUrl;
  }

  /**
   * Add cover letter file
   * @param {string} fileUrl - URL of the uploaded cover letter
   */
  setCoverLetter(fileUrl) {
    this.applicationFiles.coverLetter = fileUrl;
  }

  /**
   * Add application form file
   * @param {string} fileUrl - URL of the uploaded application form
   */
  addApplicationForm(fileUrl) {
    if (!this.applicationFiles.applicationForms.includes(fileUrl)) {
      this.applicationFiles.applicationForms.push(fileUrl);
    }
  }

  /**
   * Add multiple application form files
   * @param {string[]} fileUrls - Array of file URLs
   */
  addApplicationForms(fileUrls) {
    fileUrls.forEach(url => this.addApplicationForm(url));
  }

  /**
   * Remove application form file
   * @param {string} fileUrl - URL of the file to remove
   */
  removeApplicationForm(fileUrl) {
    this.applicationFiles.applicationForms = this.applicationFiles.applicationForms.filter(
      url => url !== fileUrl
    );
  }

  /**
   * Add other document
   * @param {string} fileUrl - URL of the uploaded document
   */
  addOtherDocument(fileUrl) {
    if (!this.applicationFiles.otherDocuments.includes(fileUrl)) {
      this.applicationFiles.otherDocuments.push(fileUrl);
    }
  }

  /**
   * Remove other document
   * @param {string} fileUrl - URL of the document to remove
   */
  removeOtherDocument(fileUrl) {
    this.applicationFiles.otherDocuments = this.applicationFiles.otherDocuments.filter(
      url => url !== fileUrl
    );
  }

  /**
   * Clear all application forms
   */
  clearApplicationForms() {
    this.applicationFiles.applicationForms = [];
  }

  /**
   * Clear all other documents
   */
  clearOtherDocuments() {
    this.applicationFiles.otherDocuments = [];
  }

  /**
   * Get all file URLs as a flat array
   * @returns {string[]} Array of all file URLs
   */
  getAllFileUrls() {
    const files = [];
    
    if (this.applicationFiles.idCard) files.push(this.applicationFiles.idCard);
    if (this.applicationFiles.trainingLetter) files.push(this.applicationFiles.trainingLetter);
    if (this.applicationFiles.resume) files.push(this.applicationFiles.resume);
    if (this.applicationFiles.coverLetter) files.push(this.applicationFiles.coverLetter);
    
    files.push(...this.applicationFiles.applicationForms);
    files.push(...this.applicationFiles.otherDocuments);
    
    return files.filter(url => url !== null && url !== undefined);
  }

  /**
   * Check if required documents are uploaded
   * @param {boolean} requiresForms - Whether application forms are required
   * @returns {Object} Validation result
   */
  validateRequiredDocuments(requiresForms = true) {
    const missing = [];
    
    if (!this.applicationFiles.idCard) missing.push("ID Card");
    if (!this.applicationFiles.trainingLetter) missing.push("Training Letter");
    if (!this.applicationFiles.resume) missing.push("Resume");
    
    if (requiresForms && this.applicationFiles.applicationForms.length === 0) {
      missing.push("Application Forms");
    }
    
    return {
      isValid: missing.length === 0,
      missingDocuments: missing
    };
  }

  /**
   * Check if application is complete (documents + duration)
   * @param {boolean} requiresForms - Whether application forms are required
   * @returns {Object} Complete validation result
   */
  validateApplicationComplete(requiresForms = true) {
    const documentsValidation = this.validateRequiredDocuments(requiresForms);
    const durationValidation = this.hasValidDuration();
    
    return {
      isValid: documentsValidation.isValid && durationValidation,
      documentsValid: documentsValidation.isValid,
      durationValid: durationValidation,
      missingDocuments: documentsValidation.missingDocuments,
      missingDuration: !durationValidation ? "Duration information" : null
    };
  }

  /**
   * Get file counts for different categories
   * @returns {Object} File count statistics
   */
  getFileStats() {
    return {
      totalFiles: this.getAllFileUrls().length,
      requiredFiles: {
        idCard: this.applicationFiles.idCard ? 1 : 0,
        trainingLetter: this.applicationFiles.trainingLetter ? 1 : 0,
        resume: this.applicationFiles.resume ? 1 : 0,
        applicationForms: this.applicationFiles.applicationForms.length
      },
      optionalFiles: {
        coverLetter: this.applicationFiles.coverLetter ? 1 : 0,
        otherDocuments: this.applicationFiles.otherDocuments.length
      }
    };
  }

  /**
   * Check if application has any files uploaded
   * @returns {boolean} True if at least one file exists
   */
  hasFiles() {
    return this.getAllFileUrls().length > 0;
  }

  /**
   * Update application status
   * @param {string} status - New application status
   */
  setStatus(status) {
    this.applicationStatus = status;
  }

  // For debugging
  toString() {
    const fileStats = this.getFileStats();
    const durationSummary = this.getDurationSummary();
    
    return `StudentApplication(
      id: ${this.id},
      student: ${this.student}, 
      internship: ${this.internship}, 
      applicationStatus: ${this.applicationStatus}, 
      applicationDate: ${this.applicationDate},
      coverLetter: ${this.coverLetter ? this.coverLetter.substring(0, 50) + '...' : 'none'},
      resumeURL: ${this.resumeURL || 'none'},
      duration: ${durationSummary.displayText || 'not set'},
      files: ${fileStats.totalFiles} total
    )`;
  }

  // Optional equality check (deep) - updated with duration field
  equals(other) {
    if (!(other instanceof StudentApplication)) return false;
    
    // Compare basic properties
    const basicPropsEqual = (
      this.id === other.id &&
      this.student.equals(other.student) &&
      this.internship.equals(other.internship) &&
      this.applicationStatus === other.applicationStatus &&
      this.applicationDate.getTime() === other.applicationDate.getTime() &&
      this.coverLetter === other.coverLetter &&
      this.resumeURL === other.resumeURL
    );
    
    if (!basicPropsEqual) return false;
    
    // Compare duration
    const durationEqual = (
      this.duration.months === other.duration.months &&
      this.duration.displayText === other.duration.displayText &&
      this.duration.startDate?.getTime() === other.duration.startDate?.getTime() &&
      this.duration.endDate?.getTime() === other.duration.endDate?.getTime() &&
      this.duration.totalDays === other.duration.totalDays &&
      this.duration.totalWeeks === other.duration.totalWeeks
    );
    
    if (!durationEqual) return false;
    
    // Compare application files
    const filesEqual = (
      this.applicationFiles.idCard === other.applicationFiles.idCard &&
      this.applicationFiles.trainingLetter === other.applicationFiles.trainingLetter &&
      this.applicationFiles.resume === other.applicationFiles.resume &&
      this.applicationFiles.coverLetter === other.applicationFiles.coverLetter &&
      JSON.stringify(this.applicationFiles.applicationForms) === JSON.stringify(other.applicationFiles.applicationForms) &&
      JSON.stringify(this.applicationFiles.otherDocuments) === JSON.stringify(other.applicationFiles.otherDocuments)
    );
    
    return basicPropsEqual && durationEqual && filesEqual;
  }

  /**
   * Create a new application with minimal required data
   * @param {Student} student - Student instance
   * @param {IndustrialTraining} internship - Internship instance
   * @returns {StudentApplication} New application instance
   */
  static createNewApplication(student, internship) {
    return new StudentApplication({
      id: null,
      student: student,
      internship: internship,
      applicationStatus: 'pending',
      applicationDate: new Date(),
      applicationFiles: {
        idCard: null,
        trainingLetter: null,
        applicationForms: [],
        resume: null,
        coverLetter: null,
        otherDocuments: []
      },
      coverLetter: "",
      resumeURL: "",
      duration: {
        months: 0,
        displayText: "",
        startDate: null,
        endDate: null,
        totalDays: 0,
        totalWeeks: 0
      }
    });
  }

  // Safe conversion helper method
  _safeToMap(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    // Check if it's already a plain object
    if (this._isPlainObject(obj)) {
      return obj;
    }
    
    // Check if it has a toMap method
    if (typeof obj.toMap === 'function') {
      return obj.toMap();
    }
    
    // For other cases, return as-is (primitives, arrays, etc.)
    return obj;
  }

  _isPlainObject(obj) {
    return (
      obj !== null &&
      typeof obj === 'object' &&
      obj.constructor === Object
    );
  }

  // Getters for easy access to nested properties
  get studentName() {
    return this.student?.fullName || 'Unknown Student';
  }

  get studentEmail() {
    return this.student?.email || 'No email';
  }

  get position() {
    return this.internship?.title || 'Unknown Position';
  }

  get companyName() {
    return this.internship?.company?.name || 'Unknown Company';
  }

  get appliedAt() {
    return this.applicationDate;
  }

  get status() {
    return this.applicationStatus;
  }

  // Duration-specific getters
  get durationMonths() {
    return this.duration.months;
  }

  get durationDisplayText() {
    return this.duration.displayText;
  }

  get durationStartDate() {
    return this.duration.startDate;
  }

  get durationEndDate() {
    return this.duration.endDate;
  }

  get durationTotalDays() {
    return this.duration.totalDays;
  }

  get hasDuration() {
    return this.hasValidDuration();
  }

  // Setters for nested properties
set studentName(name) {
  if (!this.student) this.student = {};
  this.student.fullName = name;
}

set studentEmail(email) {
  if (!this.student) this.student = {};
  this.student.email = email;
}

set position(title) {
  if (!this.internship) this.internship = {};
  this.internship.title = title;
}

set companyName(companyName) {
  if (!this.internship) this.internship = {};
  if (!this.internship.company) this.internship.company = {};
  this.internship.company.name = companyName;
}

set appliedAt(date) {
  this.applicationDate = date;
}

set status(newStatus) {
  this.applicationStatus = newStatus;
}

// Duration-specific setters
set durationMonths(months) {
  if (!this.duration) this.duration = {};
  this.duration.months = months;
  // Optionally recalculate other duration properties
  this.updateDurationDisplay();
}

set durationDisplayText(displayText) {
  if (!this.duration) this.duration = {};
  this.duration.displayText = displayText;
}

set durationStartDate(startDate) {
  if (!this.duration) this.duration = {};
  this.duration.startDate = startDate;
  // Optionally recalculate end date and total days
  this.updateDurationCalculations();
}

set durationEndDate(endDate) {
  if (!this.duration) this.duration = {};
  this.duration.endDate = endDate;
  // Optionally recalculate total days
  this.updateDurationCalculations();
}

set durationTotalDays(totalDays) {
  if (!this.duration) this.duration = {};
  this.duration.totalDays = totalDays;
}

// Helper methods for duration calculations
updateDurationCalculations() {
  if (!this.duration) return;
  
  const { startDate, endDate } = this.duration;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    this.duration.totalDays = diffDays;
    this.duration.months = Math.round(diffDays / 30);
    this.updateDurationDisplay();
  }
}

updateDurationDisplay() {
  if (!this.duration) return;
  
  const { months, totalDays, startDate, endDate } = this.duration;
  
  if (months !== undefined) {
    this.duration.displayText = `${months} month${months !== 1 ? 's' : ''}`;
  } else if (totalDays !== undefined) {
    this.duration.displayText = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
  } else if (startDate && endDate) {
    const start = new Date(startDate).toLocaleDateString();
    const end = new Date(endDate).toLocaleDateString();
    this.duration.displayText = `${start} - ${end}`;
  } else {
    this.duration.displayText = 'Duration not specified';
  }
}

// Convenience method to set entire duration object
setDuration({ startDate, endDate, months, totalDays, displayText }) {
  if (!this.duration) this.duration = {};
  
  if (startDate !== undefined) this.duration.startDate = startDate;
  if (endDate !== undefined) this.duration.endDate = endDate;
  if (months !== undefined) this.duration.months = months;
  if (totalDays !== undefined) this.duration.totalDays = totalDays;
  if (displayText !== undefined) this.duration.displayText = displayText;
  
  // If startDate and endDate are provided, calculate other values
  if (startDate && endDate && !totalDays) {
    this.updateDurationCalculations();
  }
}

// Bulk update method
updateApplication(updates) {
  const allowedProperties = [
    'studentName', 'studentEmail', 'position', 'companyName', 
    'appliedAt', 'status', 'durationMonths', 'durationDisplayText',
    'durationStartDate', 'durationEndDate', 'durationTotalDays'
  ];
  
  Object.keys(updates).forEach(key => {
    if (allowedProperties.includes(key) && this[key] !== undefined) {
      this[key] = updates[key];
    }
  });
}
}