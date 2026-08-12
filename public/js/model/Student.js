// lib/model/student.js

import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

export class Student {
  constructor({
    // Basic Information
    phoneNumber = "",
    uid = "",
    fullName = "",
    email = "",
    bio = "",
    role = "student",
    imageUrl = "",
    
    // Educational Information
    institution = "",
    courseOfStudy = "",
    department = "",
    level = "",
    registrationNumber = "",
    matricNumber = "",
    admissionDate = null,
    expectedGraduationDate = null,
    cgpa = 0.0,
    courses = [],
    academicStatus = "active",
    
    // Educational Documents
    transcriptUrl = "",
    academicCertificates = [],
    recommendationLetters = [],
    testimonials = [],
    studentIdCardUrl = "",
    
    // Portfolio fields
    skills = [],
    resumeUrl = "",
    certifications = [],
    portfolioDescription = "",
    pastInternships = [],
    
    // ID Cards and IT Letters
    idCards = [],
    itLetters = [],
    
    // Social/Contact Information
    linkedinUrl = "",
    githubUrl = "",
    portfolioUrl = "",
    twitterUrl = "",
    
    // Address Information
    permanentAddress = "",
    currentAddress = "",
    stateOfOrigin = "",
    localGovernmentArea = "",
    nationality = "",
    
    // Emergency Contact
    emergencyContactName = "",
    emergencyContactPhone = "",
    emergencyContactRelationship = "",
    emergencyContactEmail = "",
    
    // Application and Slot Management
    applications = {},
    slotBalance = 0.0,
    transactionIds = [],
    selectedApplication = null,
    
    // Firebase Cloud Messaging
    fmcToken = "",
    
    // Timestamps
    createdAt = null,
    updatedAt = null
  }) {
    // Basic Information
    this.phoneNumber = phoneNumber;
    this.uid = uid;
    this.fullName = fullName;
    this.email = email;
    this.bio = bio;
    this.role = role;
    this.imageUrl = imageUrl;
    
    // Educational Information
    this.institution = institution;
    this.courseOfStudy = courseOfStudy;
    this.department = department;
    this.level = level;
    this.registrationNumber = registrationNumber;
    this.matricNumber = matricNumber;
    this.admissionDate = admissionDate;
    this.expectedGraduationDate = expectedGraduationDate;
    this.cgpa = cgpa;
    this.courses = courses;
    this.academicStatus = academicStatus;
    
    // Educational Documents
    this.transcriptUrl = transcriptUrl;
    this.academicCertificates = academicCertificates;
    this.recommendationLetters = recommendationLetters;
    this.testimonials = testimonials;
    this.studentIdCardUrl = studentIdCardUrl;
    
    // Portfolio fields
    this.skills = skills;
    this.resumeUrl = resumeUrl;
    this.certifications = certifications;
    this.portfolioDescription = portfolioDescription;
    this.pastInternships = pastInternships;
    
    // ID Cards and IT Letters
    this.idCards = idCards;
    this.itLetters = itLetters;
    
    // Social/Contact Information
    this.linkedinUrl = linkedinUrl;
    this.githubUrl = githubUrl;
    this.portfolioUrl = portfolioUrl;
    this.twitterUrl = twitterUrl;
    
    // Address Information
    this.permanentAddress = permanentAddress;
    this.currentAddress = currentAddress;
    this.stateOfOrigin = stateOfOrigin;
    this.localGovernmentArea = localGovernmentArea;
    this.nationality = nationality;
    
    // Emergency Contact
    this.emergencyContactName = emergencyContactName;
    this.emergencyContactPhone = emergencyContactPhone;
    this.emergencyContactRelationship = emergencyContactRelationship;
    this.emergencyContactEmail = emergencyContactEmail;
    
    // Application and Slot Management
    this.applications = applications;
    this.slotBalance = slotBalance;
    this.transactionIds = transactionIds;
    this.selectedApplication = selectedApplication;
    
    // Firebase Cloud Messaging
    this.fmcToken = fmcToken;
    
    // Timestamps
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Helper methods for safe data conversion
  static _safeConvertToStringList(data) {
    if (!data) return [];
    
    try {
      if (Array.isArray(data)) {
        return data.map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            return item.name || item.title || item.id || JSON.stringify(item);
          }
          return String(item);
        });
      } else if (typeof data === 'string') {
        return [data];
      }
      return [String(data)];
    } catch (error) {
      console.error('Error converting to string list:', error, data);
      return [];
    }
  }

  static _safeConvertToMapList(data) {
    if (!data) return [];
    
    try {
      if (Array.isArray(data)) {
        return data.map(item => {
          if (item && typeof item === 'object') {
            // Convert Map to plain object
            const result = {};
            for (const [key, value] of Object.entries(item)) {
              result[key] = value;
            }
            return result;
          }
          return { value: String(item) };
        });
      }
      return [];
    } catch (error) {
      console.error('Error converting to map list:', error);
      return [];
    }
  }

  static _safeConvertToDateTime(data) {
    if (!data) return null;
    
    try {
      if (data instanceof Date) {
        return data;
      }
      
      // Firestore Timestamp object (from Firebase)
      if (data.seconds) {
        return new Date(data.seconds * 1000);
      }
      
      if (typeof data === 'string') {
        return new Date(data);
      }
      
      if (typeof data === 'number') {
        return new Date(data);
      }
      
      return null;
    } catch (error) {
      console.error('Error converting to DateTime:', error, data);
      return null;
    }
  }

  static _safeConvertToDouble(data, defaultValue = 0.0) {
    if (data === null || data === undefined) return defaultValue;
    
    try {
      if (typeof data === 'number') {
        return data;
      }
      
      if (typeof data === 'string') {
        const parsed = parseFloat(data);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      
      return defaultValue;
    } catch (error) {
      console.error('Error converting to double:', error, data);
      return defaultValue;
    }
  }

  static _safeConvertToStringMap(data) {
    if (!data) return {};
    
    try {
      if (data && typeof data === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
          result[key] = String(value);
        }
        return result;
      }
      return {};
    } catch (error) {
      console.error('Error converting to string map:', error);
      return {};
    }
  }

  static fromFirestore(data, uid) {
    //console("fromFirestore data "+JSON.stringify(data));
    return new Student({
      // Basic Information
      phoneNumber: data.phoneNumber ?? "",
      uid: uid ?? data.uid ?? "",
      fullName: data.fullName ?? "",
      email: data.email ?? "",
      bio: data.bio ?? "",
      role: data.role ?? "student",
      imageUrl: data.imageUrl ?? "",
      
      // Educational Information
      institution: data.institution ?? data.school ?? "",
      courseOfStudy: data.courseOfStudy ?? data.program ?? data.major ?? "",
      department: data.department ?? "",
      level: data.level ?? "",
      registrationNumber: data.registrationNumber ?? "",
      matricNumber: data.matricNumber ?? "",
      admissionDate: this._safeConvertToDateTime(data.admissionDate),
      expectedGraduationDate: this._safeConvertToDateTime(data.expectedGraduationDate),
      cgpa: this._safeConvertToDouble(data.cgpa, 0.0),
      courses: this._safeConvertToStringList(data.courses),
      academicStatus: data.academicStatus ?? "active",
      
      // Educational Documents
      transcriptUrl: data.transcriptUrl ?? "",
      academicCertificates: this._safeConvertToStringList(data.academicCertificates),
      recommendationLetters: this._safeConvertToStringList(data.recommendationLetters),
      testimonials: this._safeConvertToStringList(data.testimonials),
      studentIdCardUrl: data.studentIdCardUrl ?? "",
      
      // Portfolio fields
      skills: this._safeConvertToStringList(data.skills),
      resumeUrl: data.resumeUrl ?? "",
      certifications: this._safeConvertToStringList(data.certifications),
      portfolioDescription: data.portfolioDescription ?? "",
      pastInternships: this._safeConvertToMapList(data.pastInternships),
      
      // ID Cards and IT Letters
      idCards: this._safeConvertToStringList(data.idCards ?? data.studentIDCard),
      itLetters: this._safeConvertToStringList(data.itLetters ?? data.studentITLetter),
      
      // Social/Contact Information
      linkedinUrl: data.linkedinUrl ?? "",
      githubUrl: data.githubUrl ?? "",
      portfolioUrl: data.portfolioUrl ?? "",
      twitterUrl: data.twitterUrl ?? "",
      
      // Address Information
      permanentAddress: data.permanentAddress ?? "",
      currentAddress: data.currentAddress ?? "",
      stateOfOrigin: data.stateOfOrigin ?? "",
      localGovernmentArea: data.localGovernmentArea ?? "",
      nationality: data.nationality ?? "",
      
      // Emergency Contact
      emergencyContactName: data.emergencyContactName ?? "",
      emergencyContactPhone: data.emergencyContactPhone ?? "",
      emergencyContactRelationship: data.emergencyContactRelationship ?? "",
      emergencyContactEmail: data.emergencyContactEmail ?? "",
      
      // Application and Slot Management
      applications: this._safeConvertToStringMap(data.applications),
      slotBalance: this._safeConvertToDouble(data.slotBalance, 0.0),
      transactionIds: this._safeConvertToStringList(data.transactionIds),
      selectedApplication: data.selectedApplication ?? null,
      
      // Firebase Cloud Messaging
      fmcToken: data.fmcToken ?? data.fcmToken ?? "",
      
      // Timestamps
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    });
  }

  static fromUserCredential(credential) {
    const user = credential.user;
    return new Student({
      phoneNumber: user.phoneNumber || "",
      uid: user.uid,
      fullName: user.displayName || "",
      email: user.email || "",
      bio: "",
      role: "student",
      imageUrl: user.photoURL || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromMap(data) {
    ////console.log("data given to fromMap " + JSON.stringify(data));
    
    return new Student({
      // Basic Information
      phoneNumber: data.phoneNumber ?? "",
      uid: data.uid ?? "",
      fullName: data.fullName ?? "",
      email: data.email ?? "",
      bio: data.bio ?? "",
      role: data.role ?? "student",
      imageUrl: data.imageUrl ?? "",
      
      // Educational Information
      institution: data.institution ?? data.school ?? "",
      courseOfStudy: data.courseOfStudy ?? data.program ?? data.major ?? "",
      department: data.department ?? "",
      level: data.level ?? "",
      registrationNumber: data.registrationNumber ?? "",
      matricNumber: data.matricNumber ?? "",
      admissionDate: this._safeConvertToDateTime(data.admissionDate),
      expectedGraduationDate: this._safeConvertToDateTime(data.expectedGraduationDate),
      cgpa: this._safeConvertToDouble(data.cgpa, 0.0),
      courses: this._safeConvertToStringList(data.courses),
      academicStatus: data.academicStatus ?? "active",
      
      // Educational Documents
      transcriptUrl: data.transcriptUrl ?? "",
      academicCertificates: this._safeConvertToStringList(data.academicCertificates),
      recommendationLetters: this._safeConvertToStringList(data.recommendationLetters),
      testimonials: this._safeConvertToStringList(data.testimonials),
      studentIdCardUrl: data.studentIdCardUrl ?? "",
      
      // Portfolio fields
      skills: this._safeConvertToStringList(data.skills),
      resumeUrl: data.resumeUrl ?? "",
      certifications: this._safeConvertToStringList(data.certifications),
      portfolioDescription: data.portfolioDescription ?? "",
      pastInternships: this._safeConvertToMapList(data.pastInternships),
      
      // ID Cards and IT Letters
      idCards: this._safeConvertToStringList(data.idCards ?? data.studentIDCard),
      itLetters: this._safeConvertToStringList(data.itLetters ?? data.studentITLetter),
      
      // Social/Contact Information
      linkedinUrl: data.linkedinUrl ?? "",
      githubUrl: data.githubUrl ?? "",
      portfolioUrl: data.portfolioUrl ?? "",
      twitterUrl: data.twitterUrl ?? "",
      
      // Address Information
      permanentAddress: data.permanentAddress ?? "",
      currentAddress: data.currentAddress ?? "",
      stateOfOrigin: data.stateOfOrigin ?? "",
      localGovernmentArea: data.localGovernmentArea ?? "",
      nationality: data.nationality ?? "",
      
      // Emergency Contact
      emergencyContactName: data.emergencyContactName ?? "",
      emergencyContactPhone: data.emergencyContactPhone ?? "",
      emergencyContactRelationship: data.emergencyContactRelationship ?? "",
      emergencyContactEmail: data.emergencyContactEmail ?? "",
      
      // Application and Slot Management
      applications: this._safeConvertToStringMap(data.applications),
      slotBalance: this._safeConvertToDouble(data.slotBalance, 0.0),
      transactionIds: this._safeConvertToStringList(data.transactionIds),
      selectedApplication: data.selectedApplication ?? null,
      
      // Firebase Cloud Messaging
      fmcToken: data.fmcToken ?? data.fcmToken ?? "",
      
      // Timestamps
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
    });
  }

  toMap() {
    const safeToISOString = (date) => {
      try {
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) throw new Error("Invalid date");
        return d.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };
    
    return {
      // Basic Information
      phoneNumber: this.phoneNumber,
      uid: this.uid,
      fullName: this.fullName,
      email: this.email,
      bio: this.bio,
      role: this.role,
      imageUrl: this.imageUrl,
      
      // Educational Information
      institution: this.institution,
      courseOfStudy: this.courseOfStudy,
      department: this.department,
      level: this.level,
      registrationNumber: this.registrationNumber,
      matricNumber: this.matricNumber,
      admissionDate: this.admissionDate ? this.admissionDate.toISOString() : null,
      expectedGraduationDate: this.expectedGraduationDate ? this.expectedGraduationDate.toISOString() : null,
      cgpa: this.cgpa,
      courses: this.courses,
      academicStatus: this.academicStatus,
      
      // Educational Documents
      transcriptUrl: this.transcriptUrl,
      academicCertificates: this.academicCertificates,
      recommendationLetters: this.recommendationLetters,
      testimonials: this.testimonials,
      studentIdCardUrl: this.studentIdCardUrl,
      
      // Portfolio fields
      skills: this.skills,
      resumeUrl: this.resumeUrl,
      certifications: this.certifications,
      portfolioDescription: this.portfolioDescription,
      pastInternships: this.pastInternships,
      
      // ID Cards and IT Letters
      idCards: this.idCards,
      itLetters: this.itLetters,
      
      // Social/Contact Information
      linkedinUrl: this.linkedinUrl,
      githubUrl: this.githubUrl,
      portfolioUrl: this.portfolioUrl,
      twitterUrl: this.twitterUrl,
      
      // Address Information
      permanentAddress: this.permanentAddress,
      currentAddress: this.currentAddress,
      stateOfOrigin: this.stateOfOrigin,
      localGovernmentArea: this.localGovernmentArea,
      nationality: this.nationality,
      
      // Emergency Contact
      emergencyContactName: this.emergencyContactName,
      emergencyContactPhone: this.emergencyContactPhone,
      emergencyContactRelationship: this.emergencyContactRelationship,
      emergencyContactEmail: this.emergencyContactEmail,
      
      // Application and Slot Management
      applications: this.applications,
      slotBalance: this.slotBalance,
      transactionIds: this.transactionIds,
      selectedApplication: this.selectedApplication,
      
      // Firebase Cloud Messaging
      fmcToken: this.fmcToken,
      
      // Timestamps
      createdAt: safeToISOString(this.createdAt),
      updatedAt: safeToISOString(this.updatedAt)
    };
  }

  toDisplayMap() {
    return {
      uid: this.uid,
      fullName: this.fullName,
      email: this.email,
      imageUrl: this.imageUrl,
      matricNumber: this.matricNumber,
      department: this.department,
      courseOfStudy: this.courseOfStudy,
      level: this.level,
      institution: this.institution,
      skills: this.skills,
      bio: this.bio,
    };
  }

  //  Copy object with updated fields (like Dart's copyWith)
  copyWith({
    // Basic Information
    phoneNumber,
    uid,
    fullName,
    email,
    bio,
    role,
    imageUrl,
    
    // Educational Information
    institution,
    courseOfStudy,
    department,
    level,
    registrationNumber,
    matricNumber,
    admissionDate,
    expectedGraduationDate,
    cgpa,
    courses,
    academicStatus,
    
    // Educational Documents
    transcriptUrl,
    academicCertificates,
    recommendationLetters,
    testimonials,
    studentIdCardUrl,
    
    // Portfolio fields
    skills,
    resumeUrl,
    certifications,
    portfolioDescription,
    pastInternships,
    
    // ID Cards and IT Letters
    idCards,
    itLetters,
    
    // Social/Contact Information
    linkedinUrl,
    githubUrl,
    portfolioUrl,
    twitterUrl,
    
    // Address Information
    permanentAddress,
    currentAddress,
    stateOfOrigin,
    localGovernmentArea,
    nationality,
    
    // Emergency Contact
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelationship,
    emergencyContactEmail,
    
    // Application and Slot Management
    applications,
    slotBalance,
    transactionIds,
    selectedApplication,
    
    // Firebase Cloud Messaging
    fmcToken,
    
    // Timestamps
    createdAt,
    updatedAt
  } = {}) {
    return new Student({
      // Basic Information
      phoneNumber: phoneNumber ?? this.phoneNumber,
      uid: uid ?? this.uid,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      bio: bio ?? this.bio,
      role: role ?? this.role,
      imageUrl: imageUrl ?? this.imageUrl,
      
      // Educational Information
      institution: institution ?? this.institution,
      courseOfStudy: courseOfStudy ?? this.courseOfStudy,
      department: department ?? this.department,
      level: level ?? this.level,
      registrationNumber: registrationNumber ?? this.registrationNumber,
      matricNumber: matricNumber ?? this.matricNumber,
      admissionDate: admissionDate ?? this.admissionDate,
      expectedGraduationDate: expectedGraduationDate ?? this.expectedGraduationDate,
      cgpa: cgpa ?? this.cgpa,
      courses: courses ?? this.courses,
      academicStatus: academicStatus ?? this.academicStatus,
      
      // Educational Documents
      transcriptUrl: transcriptUrl ?? this.transcriptUrl,
      academicCertificates: academicCertificates ?? this.academicCertificates,
      recommendationLetters: recommendationLetters ?? this.recommendationLetters,
      testimonials: testimonials ?? this.testimonials,
      studentIdCardUrl: studentIdCardUrl ?? this.studentIdCardUrl,
      
      // Portfolio fields
      skills: skills ?? this.skills,
      resumeUrl: resumeUrl ?? this.resumeUrl,
      certifications: certifications ?? this.certifications,
      portfolioDescription: portfolioDescription ?? this.portfolioDescription,
      pastInternships: pastInternships ?? this.pastInternships,
      
      // ID Cards and IT Letters
      idCards: idCards ?? this.idCards,
      itLetters: itLetters ?? this.itLetters,
      
      // Social/Contact Information
      linkedinUrl: linkedinUrl ?? this.linkedinUrl,
      githubUrl: githubUrl ?? this.githubUrl,
      portfolioUrl: portfolioUrl ?? this.portfolioUrl,
      twitterUrl: twitterUrl ?? this.twitterUrl,
      
      // Address Information
      permanentAddress: permanentAddress ?? this.permanentAddress,
      currentAddress: currentAddress ?? this.currentAddress,
      stateOfOrigin: stateOfOrigin ?? this.stateOfOrigin,
      localGovernmentArea: localGovernmentArea ?? this.localGovernmentArea,
      nationality: nationality ?? this.nationality,
      
      // Emergency Contact
      emergencyContactName: emergencyContactName ?? this.emergencyContactName,
      emergencyContactPhone: emergencyContactPhone ?? this.emergencyContactPhone,
      emergencyContactRelationship: emergencyContactRelationship ?? this.emergencyContactRelationship,
      emergencyContactEmail: emergencyContactEmail ?? this.emergencyContactEmail,
      
      // Application and Slot Management
      applications: applications ?? this.applications,
      slotBalance: slotBalance ?? this.slotBalance,
      transactionIds: transactionIds ?? this.transactionIds,
      selectedApplication: selectedApplication ?? this.selectedApplication,
      
      // Firebase Cloud Messaging
      fmcToken: fmcToken ?? this.fmcToken,
      
      // Timestamps
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt
    });
  }

  //  Convert to JSON string
  toJson() {
    return JSON.stringify(this.toMap());
  }

  //  Create from JSON string
  static fromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return Student.fromMap(data);
    } catch (error) {
      console.error("Error parsing student JSON:", error);
      return new Student();
    }
  }

  //  Get display name (fallback to email if no name)
  get displayName() {
    return this.fullName || this.email || "Anonymous Student";
  }

  //  Check if student has complete profile
  get hasCompleteProfile() {
    return !!(
      this.fullName &&
      this.email &&
      this.department &&
      this.courseOfStudy &&
      this.level &&
      this.matricNumber
    );
  }

  //  Get profile completion percentage
  get profileCompletion() {
    const requiredFields = [
      "fullName",
      "email",
      "department",
      "courseOfStudy",
      "level",
      "matricNumber",
      "institution",
      "phoneNumber"
    ];
    const completedFields = requiredFields.filter((field) => !!this[field]);
    return Math.round((completedFields.length / requiredFields.length) * 100);
  }

  //  Format level for display
  get formattedLevel() {
    if (!this.level) return "Not Set";

    const levelStr = this.level.toString().toLowerCase();
    if (levelStr.includes("100") || levelStr === "1") return "100 Level";
    if (levelStr.includes("200") || levelStr === "2") return "200 Level";
    if (levelStr.includes("300") || levelStr === "3") return "300 Level";
    if (levelStr.includes("400") || levelStr === "4") return "400 Level";
    if (levelStr.includes("500") || levelStr === "5") return "500 Level";

    return this.level;
  }

  // New methods from Flutter version
  addApplication(companyId, applicationId) {
    return this.copyWith({
      applications: { ...this.applications, [companyId]: applicationId }
    });
  }

  removeApplication(companyId) {
    const newApplications = { ...this.applications };
    delete newApplications[companyId];
    return this.copyWith({ applications: newApplications });
  }

  hasAppliedToCompany(companyId) {
    return this.applications.hasOwnProperty(companyId);
  }

  getApplicationIdForCompany(companyId) {
    return this.applications[companyId];
  }

  get applicationCount() {
    return Object.keys(this.applications).length;
  }

  addSlotBalance(amount) {
    return this.copyWith({
      slotBalance: this.slotBalance + amount
    });
  }

  deductSlotForApplication() {
    if (this.slotBalance >= 500.0) {
      return this.copyWith({
        slotBalance: this.slotBalance - 500.0
      });
    }
    return this;
  }

  get hasEnoughSlotsForApplication() {
    return this.slotBalance >= 500.0;
  }

  get availableApplicationSlots() {
    return Math.floor(this.slotBalance / 500.0);
  }

  addTransactionId(transactionId) {
    return this.copyWith({
      transactionIds: [...this.transactionIds, transactionId]
    });
  }

  get latestTransactionId() {
    return this.transactionIds.length > 0 ? this.transactionIds[this.transactionIds.length - 1] : null;
  }

  canApplyToCompany(companyId) {
    return this.hasEnoughSlotsForApplication && !this.hasAppliedToCompany(companyId);
  }

  processApplication(companyId, applicationId) {
    if (!this.hasEnoughSlotsForApplication) {
      throw new Error('Insufficient slot balance for application');
    }

    if (this.hasAppliedToCompany(companyId)) {
      throw new Error('Already applied to this company');
    }

    return this.copyWith({
      slotBalance: this.slotBalance - 500.0,
      applications: { ...this.applications, [companyId]: applicationId }
    });
  }

  get slotSummary() {
    const usedSlots = this.applicationCount;
    const totalPurchasedSlots = (this.slotBalance / 500.0) + usedSlots;
    const availableSlots = this.availableApplicationSlots;

    return {
      slotBalance: this.slotBalance,
      usedSlots: usedSlots,
      availableSlots: availableSlots,
      totalPurchasedSlots: totalPurchasedSlots,
      slotValue: 500.0,
      canApply: availableSlots > 0
    };
  }

  get appliedCompanyIds() {
    return Object.keys(this.applications);
  }

  addIdCard(idCardUrl) {
    return this.copyWith({
      idCards: [...this.idCards, idCardUrl]
    });
  }

  removeIdCard(idCardUrl) {
    return this.copyWith({
      idCards: this.idCards.filter(card => card !== idCardUrl)
    });
  }

  updateIdCards(newIdCards) {
    return this.copyWith({
      idCards: newIdCards
    });
  }

  addItLetter(itLetterUrl) {
    return this.copyWith({
      itLetters: [...this.itLetters, itLetterUrl]
    });
  }

  removeItLetter(itLetterUrl) {
    return this.copyWith({
      itLetters: this.itLetters.filter(letter => letter !== itLetterUrl)
    });
  }

  updateItLetters(newItLetters) {
    return this.copyWith({
      itLetters: newItLetters
    });
  }

  get latestIdCard() {
    return this.idCards.length > 0 ? this.idCards[this.idCards.length - 1] : null;
  }

  get latestItLetter() {
    return this.itLetters.length > 0 ? this.itLetters[this.itLetters.length - 1] : null;
  }

  get hasIdCards() {
    return this.idCards.length > 0;
  }

  get hasItLetters() {
    return this.itLetters.length > 0;
  }

  get idCardCount() {
    return this.idCards.length;
  }

  get itLetterCount() {
    return this.itLetters.length;
  }

  get isCurrentlyEnrolled() {
    return this.academicStatus === 'active';
  }

  get yearsOfStudy() {
    if (!this.admissionDate) return null;
    const now = new Date();
    const difference = now - this.admissionDate;
    const years = Math.floor(difference / (1000 * 60 * 60 * 24 * 365)) + 1;
    return years;
  }

  get yearsRemaining() {
    if (!this.expectedGraduationDate) return null;
    const now = new Date();
    if (now > this.expectedGraduationDate) return 0;
    const difference = this.expectedGraduationDate - now;
    const years = Math.ceil(difference / (1000 * 60 * 60 * 24 * 365));
    return years;
  }

  get academicYear() {
    if (!this.admissionDate) return null;
    const startYear = this.admissionDate.getFullYear();
    const yearsOfStudy = this.yearsOfStudy || 1;
    const endYear = startYear + yearsOfStudy - 1;
    return `${startYear}/${endYear}`;
  }

  get educationalInfo() {
    return `${this.courseOfStudy}, ${this.level} Level, ${this.institution}`;
  }

  get hasRequiredDocumentsForIT() {
    return this.studentIdCardUrl && 
           this.transcriptUrl && 
           this.itLetters.length > 0;
  }

  addCourse(course) {
    return this.copyWith({
      courses: [...this.courses, course]
    });
  }

  removeCourse(course) {
    return this.copyWith({
      courses: this.courses.filter(c => c !== course)
    });
  }

  addAcademicCertificate(certificateUrl) {
    return this.copyWith({
      academicCertificates: [...this.academicCertificates, certificateUrl]
    });
  }

  addRecommendationLetter(letterUrl) {
    return this.copyWith({
      recommendationLetters: [...this.recommendationLetters, letterUrl]
    });
  }

  addTestimonial(testimonialUrl) {
    return this.copyWith({
      testimonials: [...this.testimonials, testimonialUrl]
    });
  }

  get gpaClassification() {
    if (this.cgpa >= 4.5) return 'First Class';
    if (this.cgpa >= 3.5) return 'Second Class Upper';
    if (this.cgpa >= 2.5) return 'Second Class Lower';
    if (this.cgpa >= 2.0) return 'Third Class';
    return 'Pass';
  }

  get isEligibleForIndustrialTraining() {
    const levelNum = parseInt(this.level);
    return !isNaN(levelNum) &&
           levelNum >= 300 &&
           this.cgpa >= 2.0 &&
           this.isCurrentlyEnrolled;
  }

  get graduationProgress() {
    if (!this.admissionDate || !this.expectedGraduationDate) return 0.0;

    const totalDuration = this.expectedGraduationDate - this.admissionDate;
    const elapsedDuration = new Date() - this.admissionDate;

    if (totalDuration <= 0) return 100.0;

    const progress = (elapsedDuration / totalDuration) * 100;
    return Math.max(0, Math.min(100, progress));
  }

  //  For debugging
  toString() {
    return `Student(uid: ${this.uid}, name: ${this.fullName}, email: ${this.email}, department: ${this.department})`;
  }

  //  Equality check
  equals(other) {
    if (!(other instanceof Student)) return false;
    return this.uid === other.uid;
  }

  //  Check if student has specific skill
  hasSkill(skill) {
    return this.skills.some((s) =>
      s.toLowerCase().includes(skill.toLowerCase())
    );
  }

  //  Add skill if not already present
  addSkill(skill) {
    if (!this.hasSkill(skill)) {
      return this.copyWith({
        skills: [...this.skills, skill],
        updatedAt: new Date()
      });
    }
    return this;
  }

  //  Remove skill
  removeSkill(skill) {
    return this.copyWith({
      skills: this.skills.filter(
        (s) => s.toLowerCase() !== skill.toLowerCase()
      ),
      updatedAt: new Date()
    });
  }
}

// Transaction class
export class StudentTransaction {
  constructor({
    transactionId = "",
    studentId = "",
    amount = 0.0,
    type = "slot_usage",
    reference = null,
    description = null,
    timestamp = null,
    metadata = null
  }) {
    this.transactionId = transactionId;
    this.studentId = studentId;
    this.amount = amount;
    this.type = type;
    this.reference = reference;
    this.description = description;
    this.timestamp = timestamp || new Date();
    this.metadata = metadata || {};
  }

  static fromMap(data) {
    return new StudentTransaction({
      transactionId: data.transactionId || "",
      studentId: data.studentId || "",
      amount: data.amount ? Number(data.amount) : 0.0,
      type: data.type || "slot_usage",
      reference: data.reference || null,
      description: data.description || null,
      timestamp: data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date(),
      metadata: data.metadata || {}
    });
  }

  toMap() {
    return {
      transactionId: this.transactionId,
      studentId: this.studentId,
      amount: this.amount,
      type: this.type,
      reference: this.reference,
      description: this.description,
      timestamp: this.timestamp,
      metadata: this.metadata,
      createdAt: new Date().toISOString()
    };
  }

  toJson() {
    return JSON.stringify(this.toMap());
  }

  static fromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return StudentTransaction.fromMap(data);
    } catch (error) {
      console.error("Error parsing transaction JSON:", error);
      return new StudentTransaction();
    }
  }
}
