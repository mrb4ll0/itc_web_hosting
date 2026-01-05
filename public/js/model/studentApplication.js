import { Student } from "./Student.js";
import { IndustrialTraining } from "./internship_model.js";

export class StudentApplication {
  constructor({
    id = "",
    student,
    internship,
    applicationStatus,
    applicationDate,
    durationDetails = {}, // Changed from duration to durationDetails
    idCardUrl = "", // Changed from applicationFiles.idCard
    itLetterUrl = "", // Changed from applicationFiles.trainingLetter
    attachedFormUrls = [], // Changed from applicationFiles.applicationForms
    resumeURL = "",
    coverLetter = "",
    notifyTrainee = false,
  }) {
    this.id = id;
    this.student = student; // instance of Student
    this.internship = internship; // instance of IndustrialTraining
    this.applicationStatus = applicationStatus;
    this.applicationDate =
      applicationDate instanceof Date
        ? applicationDate
        : new Date(applicationDate);
    
    // Updated to match mobile app structure
    this.durationDetails = this._initializeDurationDetails(durationDetails);
    this.idCardUrl = idCardUrl;
    this.itLetterUrl = itLetterUrl;
    this.attachedFormUrls = Array.isArray(attachedFormUrls) ? attachedFormUrls : [];
    this.resumeURL = resumeURL;
    this.coverLetter = coverLetter;
    this.notifyTrainee = notifyTrainee;
  }

  /**
   * Initialize duration details with proper structure
   * @param {Object} durationDetails - Raw duration details data
   * @returns {Object} Structured duration details
   */
  _initializeDurationDetails(durationDetails) {
    // Default structure matching mobile app
    const defaultDetails = {
      startDate: null,
      endDate: null,
      description: "",
      selectedDuration: "",
      durationInDays: 0,
      // Additional mobile app fields if needed
    };

    if (!durationDetails) {
      return defaultDetails;
    }

    // Merge provided details with default structure
    const mergedDetails = {
      ...defaultDetails,
      ...durationDetails,
    };

    // Convert string dates to Date objects if needed
    if (mergedDetails.startDate && typeof mergedDetails.startDate === "string") {
      mergedDetails.startDate = new Date(mergedDetails.startDate);
    }
    if (mergedDetails.endDate && typeof mergedDetails.endDate === "string") {
      mergedDetails.endDate = new Date(mergedDetails.endDate);
    }

    return mergedDetails;
  }

  // Get the enum status
  get status() {
    return this.applicationStatus.toLowerCase().toApplicationStatus();
  }

  // Get display name for UI
  get statusDisplayName() {
    return this.status.displayName;
  }

  // Get color for UI (simplified - you'll need to implement color logic)
  get statusColor() {
    return this.status.color;
  }

  // Get icon for UI (simplified - you'll need to implement icon logic)
  get statusIcon() {
    return this.status.icon;
  }

  // Check status helpers
  get isAccepted() {
    return this.applicationStatus.toLowerCase().isAccepted;
  }

  get isPending() {
    return this.applicationStatus.toLowerCase().isPending;
  }

  get isRejected() {
    return this.applicationStatus.toLowerCase().isRejected;
  }

  // Update status (returns a new instance with updated status)
  withStatus(newStatus) {
    return this.copyWith({ applicationStatus: newStatus });
  }

  // Update status using ApplicationStatus enum
  withApplicationStatus(newStatus) {
    return this.copyWith({ applicationStatus: newStatus.name });
  }

  static convertFirestoreTimestamp(timestamp) {
    if (!timestamp) return null;

    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }

    if (timestamp.seconds !== undefined) {
      return new Date(
        timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000)
      );
    }

    try {
      return new Date(timestamp);
    } catch (error) {
      console.warn("Invalid date format:", timestamp);
      return null;
    }
  }

  // CopyWith pattern - updated to match mobile app
  copyWith({
    id,
    student,
    internship,
    applicationStatus,
    applicationDate,
    durationDetails,
    idCardUrl,
    itLetterUrl,
    attachedFormUrls,
    resumeURL,
    coverLetter,
    notifyTrainee,
  } = {}) {
    return new StudentApplication({
      id: id || this.id,
      student: student || this.student,
      internship: internship || this.internship,
      applicationStatus: applicationStatus || this.applicationStatus,
      applicationDate: applicationDate || this.applicationDate,
      durationDetails: durationDetails || { ...this.durationDetails },
      idCardUrl: idCardUrl || this.idCardUrl,
      itLetterUrl: itLetterUrl || this.itLetterUrl,
      attachedFormUrls: attachedFormUrls || [...this.attachedFormUrls],
      resumeURL: resumeURL || this.resumeURL,
      coverLetter: coverLetter || this.coverLetter,
      notifyTrainee: notifyTrainee !== undefined ? notifyTrainee : this.notifyTrainee,
    });
  }

  // Convert to plain object (map) for Firestore - updated to match mobile app
  toMap() {
    return {
      id: this.id,
      student: this._safeToMap(this.student),
      internship: this._safeToMap(this.internship),
      applicationStatus: this.applicationStatus,
      applicationDate: this.applicationDate
        ? new Date(this.applicationDate).toISOString()
        : null,
      durationDetails: {
        startDate: this._safeDateToISO(this.durationDetails.startDate),
        endDate: this._safeDateToISO(this.durationDetails.endDate),
        description: this.durationDetails.description,
        selectedDuration: this.durationDetails.selectedDuration,
        durationInDays: this.durationDetails.durationInDays,
      },
      idCardUrl: this.idCardUrl,
      itLetterUrl: this.itLetterUrl,
      attachedFormUrls: this.attachedFormUrls,
      resumeURL: this.resumeURL,
      coverLetter: this.coverLetter,
      notifyTrainee: this.notifyTrainee,
    };
  }

  // Helper method for date conversion
  _safeDateToISO(date) {
    if (!date) return null;
    if (date instanceof Date) {
      return date.toISOString();
    }
    if (typeof date === "string") {
      try {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      } catch (e) {
        console.warn("Invalid date string:", date);
      }
      return date;
    }
    console.warn("Unexpected date type:", typeof date, date);
    return null;
  }

  // Create instance from map/object - updated to match mobile app
  static fromMap(map, itId = null, appId = null) {
    return new StudentApplication({
      id: appId || map.id || "",
      student: Student.fromMap(map.student),
      internship: IndustrialTraining.fromMap(map.internship, itId),
      applicationStatus: map.applicationStatus,
      applicationDate: this.convertFirestoreTimestamp(map.applicationDate),
      durationDetails: map.durationDetails || {},
      idCardUrl: map.idCardUrl || "",
      itLetterUrl: map.itLetterUrl || "",
      attachedFormUrls: Array.isArray(map.attachedFormUrls) 
        ? map.attachedFormUrls 
        : [],
      resumeURL: map.resumeURL || "",
      coverLetter: map.coverLetter || "",
      notifyTrainee: map.notifyTrainee || false,
    });
  }

  // Convert to JSON string
  toJson() {
    return JSON.stringify(this.toMap());
  }

  // Create from JSON string
  static fromJson(jsonString, itId = null, appId = null) {
    const map = JSON.parse(jsonString);
    return StudentApplication.fromMap(map, itId, appId);
  }

  // Duration Management Methods - updated to use durationDetails

  /**
   * Set duration information
   * @param {Object} details - Duration details object
   */
  setDurationDetails(details) {
    this.durationDetails = this._initializeDurationDetails(details);
  }

  /**
   * Update start date
   * @param {Date|string} startDate - Start date
   */
  setStartDate(startDate) {
    this.durationDetails.startDate = 
      startDate instanceof Date ? startDate : new Date(startDate);
  }

  /**
   * Update end date
   * @param {Date|string} endDate - End date
   */
  setEndDate(endDate) {
    this.durationDetails.endDate = 
      endDate instanceof Date ? endDate : new Date(endDate);
  }

  /**
   * Set selected duration text
   * @param {string} duration - Duration text (e.g., "3 Months")
   */
  setSelectedDuration(duration) {
    this.durationDetails.selectedDuration = duration;
  }

  /**
   * Set duration in days
   * @param {number} days - Number of days
   */
  setDurationInDays(days) {
    this.durationDetails.durationInDays = days;
  }

  /**
   * Set duration description
   * @param {string} description - Description of duration
   */
  setDurationDescription(description) {
    this.durationDetails.description = description;
  }

  /**
   * Check if duration is valid and complete
   * @returns {boolean} True if duration is valid
   */
  hasValidDuration() {
    return (
      this.durationDetails.startDate instanceof Date &&
      this.durationDetails.endDate instanceof Date &&
      this.durationDetails.endDate > this.durationDetails.startDate &&
      this.durationDetails.selectedDuration &&
      this.durationDetails.durationInDays > 0
    );
  }

  /**
   * Get duration summary for display
   * @returns {Object} Duration summary
   */
  getDurationSummary() {
    return {
      startDate: this.durationDetails.startDate,
      endDate: this.durationDetails.endDate,
      description: this.durationDetails.description,
      selectedDuration: this.durationDetails.selectedDuration,
      durationInDays: this.durationDetails.durationInDays,
      isValid: this.hasValidDuration(),
    };
  }

  // File management methods - updated to match mobile app structure

  /**
   * Set ID card URL
   * @param {string} url - URL of the uploaded ID card
   */
  setIdCardUrl(url) {
    this.idCardUrl = url;
  }

  /**
   * Set training letter URL
   * @param {string} url - URL of the uploaded training letter
   */
  setItLetterUrl(url) {
    this.itLetterUrl = url;
  }

  /**
   * Add attached form URL
   * @param {string} url - URL of the uploaded application form
   */
  addAttachedFormUrl(url) {
    if (!this.attachedFormUrls.includes(url)) {
      this.attachedFormUrls.push(url);
    }
  }

  /**
   * Add multiple attached form URLs
   * @param {string[]} urls - Array of file URLs
   */
  addAttachedFormUrls(urls) {
    urls.forEach((url) => this.addAttachedFormUrl(url));
  }

  /**
   * Remove attached form URL
   * @param {string} url - URL of the file to remove
   */
  removeAttachedFormUrl(url) {
    this.attachedFormUrls = this.attachedFormUrls.filter((u) => u !== url);
  }

  /**
   * Clear all attached form URLs
   */
  clearAttachedFormUrls() {
    this.attachedFormUrls = [];
  }

  /**
   * Get all file URLs as a flat array
   * @returns {string[]} Array of all file URLs
   */
  getAllFileUrls() {
    const files = [];

    if (this.idCardUrl) files.push(this.idCardUrl);
    if (this.itLetterUrl) files.push(this.itLetterUrl);
    if (this.resumeURL) files.push(this.resumeURL);
    if (this.coverLetter) files.push(this.coverLetter);

    files.push(...this.attachedFormUrls);

    return files.filter((url) => url !== null && url !== undefined && url !== "");
  }

  /**
   * Check if required documents are uploaded
   * @returns {Object} Validation result
   */
  validateRequiredDocuments() {
    const missing = [];

    if (!this.idCardUrl) missing.push("ID Card");
    if (!this.itLetterUrl) missing.push("IT Letter");
    if (!this.resumeURL) missing.push("Resume");

    return {
      isValid: missing.length === 0,
      missingDocuments: missing,
    };
  }

  /**
   * Check if application is complete (documents + duration)
   * @returns {Object} Complete validation result
   */
  validateApplicationComplete() {
    const documentsValidation = this.validateRequiredDocuments();
    const durationValidation = this.hasValidDuration();

    return {
      isValid: documentsValidation.isValid && durationValidation,
      documentsValid: documentsValidation.isValid,
      durationValid: durationValidation,
      missingDocuments: documentsValidation.missingDocuments,
      missingDuration: !durationValidation ? "Duration information" : null,
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
        idCard: this.idCardUrl ? 1 : 0,
        itLetter: this.itLetterUrl ? 1 : 0,
        resume: this.resumeURL ? 1 : 0,
      },
      optionalFiles: {
        attachedForms: this.attachedFormUrls.length,
        coverLetter: this.coverLetter ? 1 : 0,
      },
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
      durationDetails: ${durationSummary.selectedDuration || "not set"},
      files: ${fileStats.totalFiles} total
    )`;
  }

  // Equality check
  equals(other) {
    if (!(other instanceof StudentApplication)) return false;

    return (
      this.id === other.id &&
      this.student.equals(other.student) &&
      this.internship.equals(other.internship) &&
      this.applicationStatus === other.applicationStatus &&
      this.applicationDate.getTime() === other.applicationDate.getTime() &&
      this.idCardUrl === other.idCardUrl &&
      this.itLetterUrl === other.itLetterUrl &&
      this.resumeURL === other.resumeURL &&
      this.coverLetter === other.coverLetter &&
      this.notifyTrainee === other.notifyTrainee &&
      JSON.stringify(this.durationDetails) === JSON.stringify(other.durationDetails) &&
      JSON.stringify(this.attachedFormUrls) === JSON.stringify(other.attachedFormUrls)
    );
  }

  /**
   * Create a new application with minimal required data
   * @param {Student} student - Student instance
   * @param {IndustrialTraining} internship - Internship instance
   * @returns {StudentApplication} New application instance
   */
  static createNewApplication(student, internship) {
    return new StudentApplication({
      id: "",
      student: student,
      internship: internship,
      applicationStatus: "pending",
      applicationDate: new Date(),
      durationDetails: {
        startDate: null,
        endDate: null,
        description: "",
        selectedDuration: "",
        durationInDays: 0,
      },
      idCardUrl: "",
      itLetterUrl: "",
      attachedFormUrls: [],
      resumeURL: "",
      coverLetter: "",
      notifyTrainee: false,
    });
  }

  // Safe conversion helper method
  _safeToMap(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (this._isPlainObject(obj)) {
      return obj;
    }

    if (typeof obj.toMap === "function") {
      return obj.toMap();
    }

    return obj;
  }

  _isPlainObject(obj) {
    return (
      obj !== null && typeof obj === "object" && obj.constructor === Object
    );
  }

  // Getters for easy access
  get studentName() {
    return this.student?.fullName || "Unknown Student";
  }

  get studentEmail() {
    return this.student?.email || "No email";
  }

  get position() {
    return this.internship?.title || "Unknown Position";
  }

  get companyName() {
    return this.internship?.company?.name || "Unknown Company";
  }

  get appliedAt() {
    return this.applicationDate;
  }

  get statusString() {
    return this.applicationStatus;
  }

  // Duration-specific getters
  get startDate() {
    return this.durationDetails.startDate;
  }

  get endDate() {
    return this.durationDetails.endDate;
  }

  get durationDescription() {
    return this.durationDetails.description;
  }

  get selectedDuration() {
    return this.durationDetails.selectedDuration;
  }

  get durationInDays() {
    return this.durationDetails.durationInDays;
  }

  /**
   * Set notify trainee preference
   * @param {boolean} notify - Whether to notify trainee
   */
  setNotifyTrainee(notify) {
    this.notifyTrainee = notify;
  }

  get shouldNotifyTrainee() {
    return this.notifyTrainee;
  }

  // Setters
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

  // Bulk update method
  updateApplication(updates) {
    Object.keys(updates).forEach((key) => {
      if (this[key] !== undefined) {
        this[key] = updates[key];
      }
    });
  }
}

// ApplicationStatus enum and extensions for JavaScript
export const ApplicationStatus = {
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected'
};

// Extension for ApplicationStatus enum
Object.defineProperty(ApplicationStatus, 'displayName', {
  get: function() {
    switch (this) {
      case ApplicationStatus.ACCEPTED:
        return 'Accepted';
      case ApplicationStatus.PENDING:
        return 'Pending';
      case ApplicationStatus.REJECTED:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }
});

// String extension for ApplicationStatus conversion
String.prototype.toApplicationStatus = function() {
  const normalized = this.toLowerCase().trim();
  
  switch (normalized) {
    case 'accepted':
    case 'accept':
    case 'approved':
      return ApplicationStatus.ACCEPTED;

    case 'pending':
    case 'pend':
    case 'waiting':
    case 'in_progress':
      return ApplicationStatus.PENDING;

    case 'rejected':
    case 'reject':
    case 'declined':
    case 'denied':
      return ApplicationStatus.REJECTED;

    default:
      return ApplicationStatus.PENDING;
  }
};

// Helper methods for checking status
String.prototype.isAccepted = function() {
  return this.toLowerCase().toApplicationStatus() === ApplicationStatus.ACCEPTED;
};

String.prototype.isPending = function() {
  return this.toLowerCase().toApplicationStatus() === ApplicationStatus.PENDING;
};

String.prototype.isRejected = function() {
  return this.toLowerCase().toApplicationStatus() === ApplicationStatus.REJECTED;
};