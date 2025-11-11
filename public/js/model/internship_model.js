import { Timestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { Company } from "./Company.js";

export class IndustrialTraining {
  constructor({
    id = null,
    files = [],
    company,
    title = "",
    industry = "",
    duration = "",
    startDate = null,
    endDate = null,
    description = "",
    applicationsCount = 0,
    status = "open",
    stipend = null,
    stipendAvailable = false,
    eligibilityCriteria = "",
    postedBy = null,
    postedAt = null,
    createdAt = null,
    updatedAt = null,
    qualification = null,
    // New fields
    department = "",
    address = "",
    aptitudeTestRequired = false,
    intakeCapacity = 1,
    contactPerson = "",
    applications =[]
  }) {
    this.id = id;
    this.files = files;
    this.company = company; // instance of Company
    this.title = title;
    this.industry = industry;
    this.duration = duration;
    this.startDate = startDate;
    this.endDate = endDate;
    this.description = description;
    this.applicationsCount = applicationsCount;
    this.status = status;
    this.stipend = stipend;
    this.stipendAvailable = stipendAvailable;
    this.eligibilityCriteria = eligibilityCriteria;
    this.postedBy = postedBy;
    this.postedAt = postedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.qualification = qualification;
    
    // New fields
    this.department = department;
    this.address = address;
    this.aptitudeTestRequired = aptitudeTestRequired;
    this.intakeCapacity = intakeCapacity;
    this.contactPerson = contactPerson;
    this.applications = applications
  }

  /**
   * Converts a Firestore document snapshot or plain object to IndustrialTraining instance
   */
  static fromMap(data, docId) {
    if (!data) return null;

    return new IndustrialTraining({
      id: docId || null,
      files: data.files || [],
      company: Company.fromMap(data.company || {}),
      title: data.title || "",
      industry: data.industry || "",
      duration: data.duration || "",
      startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : data.startDate || null,
      endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : data.endDate || null,
      description: data.description || "",
      applicationsCount: data.applicationsCount || 0,
      status: data.status || "open",
      stipend: data.stipend || null,
      stipendAvailable: data.stipendAvailable || false,
      eligibilityCriteria: data.eligibilityCriteria || "",
      postedBy: data.postedBy || null,
      postedAt: data.postedAt instanceof Timestamp ? data.postedAt.toDate() : data.postedAt || null,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt || null,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt || null,
      qualification: data.qualification || "Qualification Not specified",
      
      // New fields
      department: data.department || "",
      address: data.address || data.location || "", // Support both address and location for backward compatibility
      aptitudeTestRequired: data.aptitudeTestRequired || data.aptitudeTest || false,
      intakeCapacity: data.intakeCapacity || data.intake || 1,
      contactPerson: data.contactPerson || "",
      applications: data.applications || []
    });
  }

  /**
   * Converts the instance to a Firestore-compatible plain object
   */
  // Alternative toMap() method that returns ISO strings
toMap() {
    // Helper function to safely convert dates to ISO strings
    const safeConvertDate = (date) => {
        if (!date) return null;
        
        try {
            // If it's already a Date object
            if (date instanceof Date) {
                return date.toISOString();
            }
            
            // If it's a Firestore Timestamp, convert to Date then ISO string
            if (date instanceof Timestamp) {
                return date.toDate().toISOString();
            }
            
            // If it's a string or number, try to convert
            if (typeof date === 'string' || typeof date === 'number') {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString();
                }
            }
            
            console.warn('Invalid date encountered:', date);
            return null;
            
        } catch (error) {
            console.error('Error converting date:', error, date);
            return null;
        }
    };

    return {
        files: this.files,
        company: this.company?.toMap() || {},
        title: this.title,
        industry: this.industry,
        duration: this.duration,
        startDate: safeConvertDate(this.startDate),
        endDate: safeConvertDate(this.endDate),
        description: this.description,
        applicationsCount: this.applicationsCount,
        status: this.status,
        stipend: this.stipend,
        stipendAvailable: this.stipendAvailable,
        eligibilityCriteria: this.eligibilityCriteria,
        postedBy: this.postedBy,
        postedAt: safeConvertDate(this.postedAt),
        createdAt: safeConvertDate(this.createdAt),
        updatedAt: safeConvertDate(this.updatedAt),
        qualification: this.qualification || "Qualification Not specified",
        
        department: this.department,
        address: this.address,
        aptitudeTestRequired: this.aptitudeTestRequired,
        intakeCapacity: this.intakeCapacity,
        contactPerson: this.contactPerson,
        applications: this.applications
    };
}

  /**
   * Validates the industrial training data
   */
  validate() {
    const errors = [];

    if (!this.title || this.title.trim() === '') {
      errors.push('Title is required');
    }

    if (!this.department || this.department.trim() === '') {
      errors.push('Department is required');
    }

    if (!this.address || this.address.trim() === '') {
      errors.push('Address is required');
    }

    if (!this.contactPerson || this.contactPerson.trim() === '') {
      errors.push('Contact person is required');
    }

    if (this.intakeCapacity < 1) {
      errors.push('Intake capacity must be at least 1');
    }

    if (!this.description || this.description.trim() === '') {
      errors.push('Description is required');
    }

    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      errors.push('Start date cannot be after end date');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Gets a summary of the industrial training for display
   */
  getSummary() {
    return {
      title: this.title,
      department: this.department,
      company: this.company?.name || 'Unknown Company',
      location: this.address,
      intake: this.intakeCapacity,
      aptitudeTest: this.aptitudeTestRequired ? 'Yes' : 'No',
      contactPerson: this.contactPerson,
      status: this.status,
      applicationsCount: this.applicationsCount
    };
  }

  /**
   * Updates the industrial training with new data
   */
  update(updates) {
    const allowedFields = [
      'title', 'department', 'address', 'aptitudeTestRequired', 'intakeCapacity',
      'contactPerson', 'description', 'industry', 'duration', 'startDate', 'endDate',
      'status', 'stipend', 'stipendAvailable', 'eligibilityCriteria', 'qualification', 'applications'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        this[key] = updates[key];
      }
    });

    this.updatedAt = new Date();
  }

  
  //  Checks if the industrial training is currently active
   
  isActive() {
    const now = new Date();
    const isOpen = this.status === 'open' || this.status === 'active';
    const hasValidDates = !this.startDate || (this.startDate <= now && (!this.endDate || this.endDate >= now));
    
    return isOpen && hasValidDates;
  }

  
  //  Checks if the industrial training can accept more applications
   
  hasCapacity() {
    return this.applicationsCount < this.intakeCapacity;
  }
}