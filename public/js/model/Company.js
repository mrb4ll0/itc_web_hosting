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
    forms = []
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
    this.role = role;
    this.website = website;
    this.companySize = companySize;
    this.description = description;
    this.galleryImages = galleryImages;
    this.opportunities = opportunities;
    this.reviews = reviews;
    this.forms = forms;
  }

  // Convert Firestore document data → Company object
  static fromMap(data = {}) {
     ////console.log("com gallery "+ JSON.stringify(data));
    return new Company({
      id: data.id || "",
      name: data.name || "",
      industry: data.industry || "",
      address: data.location || data.address || "", // Support both location and address
      email: data.email || "",
      logoURL: data.logoURL || "",
      phoneNumber: data.phoneNumber || "",
      role: data.role || "",
      localGovernment: data.localGovernment || "",
      state: data.state || "",
      website: data.website || "",
      companySize: data.companySize || "",
      description: data.description || "",
      galleryImages: data.galleryImages || data.image || [], // Support both galleryImages and image
      opportunities: data.opportunities || [],
      reviews: data.reviews || data.review || [] ,// Support both reviews and review
      forms: data.form
    });
  }

  // Convert Company → plain JS object (for Firestore save)
  toMap() {
    return {
      id: this.id,
      name: this.name,
      industry: this.industry,
      location: this.address, // Using location for Firestore consistency
      email: this.email,
      logoURL: this.logoURL,
      phoneNumber: this.phoneNumber,
      role: this.role,
      localGovernment: this.localGovernment,
      state: this.state,
      website: this.website,
      companySize: this.companySize,
      description: this.description,
      gallerygalleryImages: this.galleryImages,
      opportunities: this.opportunities,
      reviews: this.reviews,
      forms: this.forms
    };
  }

  // Create Company from Firebase UserCredential (after sign-up/login)
  static fromUserCredential(credential, role = "") {
    const user = credential.user;
    return new Company({
      id: user?.uid || "",
      name: user?.displayName || "",
      industry: "",
      address: "",
      email: user?.email || "",
      logoURL: user?.photoURL || "",
      phoneNumber: user?.phoneNumber || "Please set Phone Number",
      role: role,
      localGovernment: "",
      state: "",
      website: "",
      companySize: "",
      description: "",
      galleryImages: [],
      opportunities: [],
      reviews: []
    });
  }

  // Create a new Company with some fields updated - COMPLETE VERSION
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
    forms
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
      forms: forms ?? this.reviews,
    });
  }

  // Helper method to check if company has basic required info
  isValid() {
    return this.name && this.email && this.industry;
  }

  // Helper method to get display location
  getDisplayLocation() {
    const locationParts = [this.address,this.localGovernment, this.state].filter(part => part);
    return locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';
  }

  // Helper method to get first image or placeholder
  getPrimaryImage() {
    return this.galleryImages.length > 0 ? this.galleryImages[0] : this.logoURL;
  }
}