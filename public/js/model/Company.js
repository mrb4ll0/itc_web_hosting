export class Company {
  constructor({
    id = "",
    name = "",
    industry = "",
    address = "",
    localGovernment = "",
    state = "",
    email = "",
    logoURL = "",
    phoneNumber = "",
    role = "",
    website = "",
    companySize = "",
    description = "",
    galleryImages = [],
    opportunities = [],
    reviews = [],
    forms = [],
    // New fields from mobile app
    fcmToken = "",
    registrationNumber = "",
    isfeatured = false,
    isActive = true,
    isVerified = false,
    isDeleted = false,
    isApproved = false,
    isRejected = false,
    isPending = true,
    isBlocked = false,
    isSuspended = false,
    isBanned = false,
    isMuted = false,
    isMutedUntil = null,
    isMutedBy = null,
    isMutedFor = null,
    isMutedOn = null,
    formUrl = [],
    updatedAt = null,
    potentialtrainee = [],
    pendingApplications = [],
    acceptedTrainees = [],
    currentTrainees = [],
    completedTrainees = [],
    rejectedApplications = [],
    supervisors = [],
  } = {}) {
    this.id = id;
    this.name = name;
    this.industry = industry;
    this.address = address;
    this.localGovernment = localGovernment;
    this.state = state;
    this.email = email;
    this.logoURL = logoURL;
    this.phoneNumber = phoneNumber;
    this.role = role || "company";
    this.website = website;
    this.companySize = companySize;
    this.description = description;
    this.galleryImages = galleryImages;
    this.opportunities = opportunities;
    this.reviews = reviews;
    this.forms = forms;

    // New fields
    this.fcmToken = fcmToken;
    this.registrationNumber = registrationNumber;
    this.isfeatured = isfeatured;
    this.isActive = isActive;
    this.isVerified = isVerified;
    this.isDeleted = isDeleted;
    this.isApproved = isApproved;
    this.isRejected = isRejected;
    this.isPending = isPending;
    this.isBlocked = isBlocked;
    this.isSuspended = isSuspended;
    this.isBanned = isBanned;
    this.isMuted = isMuted;
    this.isMutedUntil = isMutedUntil;
    this.isMutedBy = isMutedBy;
    this.isMutedFor = isMutedFor;
    this.isMutedOn = isMutedOn;
    this.formUrl = formUrl;
    this.updatedAt = updatedAt;
    this.potentialtrainee = potentialtrainee;
    this.pendingApplications = pendingApplications;
    this.acceptedTrainees = acceptedTrainees;
    this.currentTrainees = currentTrainees;
    this.completedTrainees = completedTrainees;
    this.rejectedApplications = rejectedApplications;
    this.supervisors = supervisors;
  }

  // Convert Firestore document data → Company object
  // Convert Firestore document data → Company object
  static fromMap(data = {}) {
    // Helper function to safely parse dates
    const safeParseDate = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return dateValue;
      try {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
      } catch (e) {
        console.warn("Failed to parse date:", dateValue, e);
        return null;
      }
    };

    return new Company({
      id: data.id || "",
      name: data.name || "",
      industry: data.industry || "",
      address: data.location || data.address || "",
      email: data.email || "",
      logoURL: data.logoURL || "",
      phoneNumber: data.phoneNumber || "",
      role: data.role || "company",
      localGovernment: data.localGovernment || "",
      state: data.state || "",
      website: data.website || "",
      companySize: data.companySize || "",
      description: data.description || "",
      galleryImages: data.galleryImages || data.image || [],
      opportunities: data.opportunities || [],
      reviews: data.reviews || data.review || [],
      forms: data.forms || data.form || [],

      // New fields with safe date parsing
      fcmToken: data.fcmToken || "",
      registrationNumber: data.registrationNumber || "",
      isfeatured: data.isfeatured || false,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isVerified: data.isVerified || false,
      isDeleted: data.isDeleted || false,
      isApproved: data.isApproved || false,
      isRejected: data.isRejected || false,
      isPending: data.isPending !== undefined ? data.isPending : true,
      isBlocked: data.isBlocked || false,
      isSuspended: data.isSuspended || false,
      isBanned: data.isBanned || false,
      isMuted: data.isMuted || false,
      isMutedUntil: safeParseDate(data.isMutedUntil),
      isMutedBy: data.isMutedBy || null,
      isMutedFor: data.isMutedFor || null,
      isMutedOn: safeParseDate(data.isMutedOn),
      formUrl: data.formUrl || [],
      updatedAt: safeParseDate(data.updatedAt) || new Date(),
      potentialtrainee: data.potentialtrainee || [],
      pendingApplications: data.pendingApplications || [],
      acceptedTrainees: data.acceptedTrainees || [],
      currentTrainees: data.currentTrainees || [],
      completedTrainees: data.completedTrainees || [],
      rejectedApplications: data.rejectedApplications || [],
      supervisors: data.supervisors || [],
    });
  }
  // Convert Company → plain JS object (for Firestore save)
  // Convert Company → plain JS object (for Firestore save)
  toMap() {
    // Helper function to safely convert dates
    const safeDateToISO = (date) => {
      if (!date) return null;
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
      // If it's already a string or number, try to convert
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }
      } catch (e) {
        console.warn("Invalid date value:", date, e);
      }
      return null;
    };

    return {
      id: this.id,
      name: this.name,
      industry: this.industry,
      location: this.address,
      email: this.email,
      logoURL: this.logoURL,
      phoneNumber: this.phoneNumber,
      role: this.role,
      localGovernment: this.localGovernment,
      state: this.state,
      website: this.website,
      companySize: this.companySize,
      description: this.description,
      galleryImages: this.galleryImages,
      opportunities: this.opportunities,
      reviews: this.reviews,
      forms: this.forms,

      // New fields with safe date handling
      fcmToken: this.fcmToken,
      registrationNumber: this.registrationNumber,
      isfeatured: this.isfeatured,
      isActive: this.isActive,
      isVerified: this.isVerified,
      isDeleted: this.isDeleted,
      isApproved: this.isApproved,
      isRejected: this.isRejected,
      isPending: this.isPending,
      isBlocked: this.isBlocked,
      isSuspended: this.isSuspended,
      isBanned: this.isBanned,
      isMuted: this.isMuted,
      isMutedUntil: safeDateToISO(this.isMutedUntil),
      isMutedBy: this.isMutedBy,
      isMutedFor: this.isMutedFor,
      isMutedOn: safeDateToISO(this.isMutedOn),
      formUrl: this.formUrl,
      updatedAt: safeDateToISO(this.updatedAt) || new Date().toISOString(), // Default to now if null
      potentialtrainee: this.potentialtrainee,
      pendingApplications: this.pendingApplications,
      acceptedTrainees: this.acceptedTrainees,
      currentTrainees: this.currentTrainees,
      completedTrainees: this.completedTrainees,
      rejectedApplications: this.rejectedApplications,
      supervisors: this.supervisors,
    };
  }
  // Create Company from Firebase UserCredential (after sign-up/login)
  static fromUserCredential(credential, role = "company") {
    const user = credential.user;
    return new Company({
      id: user?.uid || "",
      name: user?.displayName || "",
      email: user?.email || "",
      logoURL: user?.photoURL || "",
      phoneNumber: user?.phoneNumber || "",
      role: role,

      // Set default status flags
      isActive: true,
      isPending: true,

      // Other fields remain with default values
    });
  }

  // Create a new Company with some fields updated
  copyWith({
    id,
    name,
    industry,
    address,
    localGovernment,
    state,
    email,
    logoURL,
    phoneNumber,
    role,
    website,
    companySize,
    description,
    galleryImages,
    opportunities,
    reviews,
    forms,

    // New fields
    fcmToken,
    registrationNumber,
    isfeatured,
    isActive,
    isVerified,
    isDeleted,
    isApproved,
    isRejected,
    isPending,
    isBlocked,
    isSuspended,
    isBanned,
    isMuted,
    isMutedUntil,
    isMutedBy,
    isMutedFor,
    isMutedOn,
    formUrl,
    updatedAt,
    potentialtrainee,
    pendingApplications,
    acceptedTrainees,
    currentTrainees,
    completedTrainees,
    rejectedApplications,
    supervisors,
  } = {}) {
    return new Company({
      id: id ?? this.id,
      name: name ?? this.name,
      industry: industry ?? this.industry,
      address: address ?? this.address,
      localGovernment: localGovernment ?? this.localGovernment,
      state: state ?? this.state,
      email: email ?? this.email,
      logoURL: logoURL ?? this.logoURL,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      role: role ?? this.role,
      website: website ?? this.website,
      companySize: companySize ?? this.companySize,
      description: description ?? this.description,
      galleryImages: galleryImages ?? this.galleryImages,
      opportunities: opportunities ?? this.opportunities,
      reviews: reviews ?? this.reviews,
      forms: forms ?? this.forms,

      // New fields
      fcmToken: fcmToken ?? this.fcmToken,
      registrationNumber: registrationNumber ?? this.registrationNumber,
      isfeatured: isfeatured ?? this.isfeatured,
      isActive: isActive ?? this.isActive,
      isVerified: isVerified ?? this.isVerified,
      isDeleted: isDeleted ?? this.isDeleted,
      isApproved: isApproved ?? this.isApproved,
      isRejected: isRejected ?? this.isRejected,
      isPending: isPending ?? this.isPending,
      isBlocked: isBlocked ?? this.isBlocked,
      isSuspended: isSuspended ?? this.isSuspended,
      isBanned: isBanned ?? this.isBanned,
      isMuted: isMuted ?? this.isMuted,
      isMutedUntil: isMutedUntil ?? this.isMutedUntil,
      isMutedBy: isMutedBy ?? this.isMutedBy,
      isMutedFor: isMutedFor ?? this.isMutedFor,
      isMutedOn: isMutedOn ?? this.isMutedOn,
      formUrl: formUrl ?? this.formUrl,
      updatedAt: updatedAt ?? this.updatedAt,
      potentialtrainee: potentialtrainee ?? this.potentialtrainee,
      pendingApplications: pendingApplications ?? this.pendingApplications,
      acceptedTrainees: acceptedTrainees ?? this.acceptedTrainees,
      currentTrainees: currentTrainees ?? this.currentTrainees,
      completedTrainees: completedTrainees ?? this.completedTrainees,
      rejectedApplications: rejectedApplications ?? this.rejectedApplications,
      supervisors: supervisors ?? this.supervisors,
    });
  }

  // Helper method to check if company has basic required info
  isValid() {
    return this.name && this.email && this.industry;
  }

  // Helper method to get display location
  getDisplayLocation() {
    const locationParts = [
      this.address,
      this.localGovernment,
      this.state,
    ].filter((part) => part);
    return locationParts.length > 0
      ? locationParts.join(", ")
      : "Location not specified";
  }

  // Helper method to get first image or placeholder
  getPrimaryImage() {
    return this.galleryImages.length > 0 ? this.galleryImages[0] : this.logoURL;
  }

  // Check if company is approved and active
  isAvailable() {
    return this.isApproved && this.isActive && !this.isDeleted;
  }

  // Get total trainee count across all categories
  getTotalTrainees() {
    return (
      this.acceptedTrainees.length +
      this.currentTrainees.length +
      this.completedTrainees.length
    );
  }

  // Get pending application count
  getPendingCount() {
    return this.pendingApplications.length;
  }

  // Convert to JSON string
  toJson() {
    return JSON.stringify(this.toMap());
  }

  // Create Company from JSON string
  static fromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      return Company.fromMap(data);
    } catch (error) {
      console.error("Error parsing Company JSON:", error);
      return new Company();
    }
  }

  // Get status as string
  getStatus() {
    if (this.isDeleted) return "Deleted";
    if (this.isBlocked) return "Blocked";
    if (this.isSuspended) return "Suspended";
    if (this.isBanned) return "Banned";
    if (this.isRejected) return "Rejected";
    if (this.isApproved) return "Approved";
    if (this.isPending) return "Pending";
    return "Unknown";
  }

  // Check if company has any trainees
  hasTrainees() {
    return this.getTotalTrainees() > 0;
  }

  // Add a supervisor
  addSupervisor(supervisorId) {
    if (!this.supervisors.includes(supervisorId)) {
      this.supervisors = [...this.supervisors, supervisorId];
    }
    return this;
  }

  // Remove a supervisor
  removeSupervisor(supervisorId) {
    this.supervisors = this.supervisors.filter((id) => id !== supervisorId);
    return this;
  }

  // Add to potential trainees
  addPotentialTrainee(traineeId) {
    if (!this.potentialtrainee.includes(traineeId)) {
      this.potentialtrainee = [...this.potentialtrainee, traineeId];
    }
    return this;
  }

  // Move trainee from pending to accepted
  acceptTrainee(traineeId) {
    this.pendingApplications = this.pendingApplications.filter(
      (id) => id !== traineeId
    );
    if (!this.acceptedTrainees.includes(traineeId)) {
      this.acceptedTrainees = [...this.acceptedTrainees, traineeId];
    }
    return this;
  }

  // Reject trainee application
  rejectTrainee(traineeId) {
    this.pendingApplications = this.pendingApplications.filter(
      (id) => id !== traineeId
    );
    if (!this.rejectedApplications.includes(traineeId)) {
      this.rejectedApplications = [...this.rejectedApplications, traineeId];
    }
    return this;
  }
}
