import { Timestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export class Institution {
  constructor({
    institutionCode = "",
    id = "",
    name = "",
    shortName = "",
    type = "",
    address = "",
    city = "",
    state = "",
    country = "",
    localGovernment = "",
    contactEmail = "",
    contactPhone = "",
    website = "",
    logoUrl = "",
    accreditationStatus = "",
    establishedYear = 0,
    faculties = [],
    departments = [],
    programsOffered = [],
    admissionRequirements = "",
    isActive = true,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.institutionCode = institutionCode;
    this.id = id;
    this.name = name;
    this.shortName = shortName;
    this.type = type;
    this.address = address;
    this.city = city;
    this.state = state;
    this.country = country;
    this.localGovernment = localGovernment;
    this.contactEmail = contactEmail;
    this.contactPhone = contactPhone;
    this.website = website;
    this.logoUrl = logoUrl;
    this.accreditationStatus = accreditationStatus;
    this.establishedYear = establishedYear;
    this.faculties = faculties;
    this.departments = departments;
    this.programsOffered = programsOffered;
    this.admissionRequirements = admissionRequirements;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Convert Firestore or JSON data to Institution instance
   */
  static fromMap(map) {
    if (!map) return null;

    const toDate = (value) => {
      if (!value) return new Date();
      if (value instanceof Timestamp) return value.toDate();
      if (typeof value === "string") return new Date(value);
      return value;
    };

    return new Institution({
      institutionCode: map.institutionCode || "",
      id: map.id || "",
      name: map.name || "",
      shortName: map.shortName || "",
      type: map.type || "",
      address: map.address || "",
      city: map.city || "",
      state: map.state || "",
      country: map.country || "",
      localGovernment: map.localGovernment || "",
      contactEmail: map.contactEmail || "",
      contactPhone: map.contactPhone || "",
      website: map.website || "",
      logoUrl: map.logoUrl || "",
      accreditationStatus: map.accreditationStatus || "",
      establishedYear: map.establishedYear || 0,
      faculties: map.faculties || [],
      departments: map.departments || [],
      programsOffered: map.programsOffered || [],
      admissionRequirements: map.admissionRequirements || "",
      isActive: map.isActive ?? true,
      createdAt: toDate(map.createdAt),
      updatedAt: toDate(map.updatedAt),
    });
  }

  /**
   * Convert Institution instance to plain Firestore/JSON map
   */
  toMap() {
    const toTimestamp = (value) => {
      if (value instanceof Date) return Timestamp.fromDate(value);
      return value;
    };

    return {
      institutionCode: this.institutionCode,
      id: this.id,
      name: this.name,
      shortName: this.shortName,
      type: this.type,
      address: this.address,
      city: this.city,
      state: this.state,
      country: this.country,
      localGovernment: this.localGovernment,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      website: this.website,
      logoUrl: this.logoUrl,
      accreditationStatus: this.accreditationStatus,
      establishedYear: this.establishedYear,
      faculties: this.faculties,
      departments: this.departments,
      programsOffered: this.programsOffered,
      admissionRequirements: this.admissionRequirements,
      isActive: this.isActive,
      createdAt: toTimestamp(this.createdAt),
      updatedAt: toTimestamp(this.updatedAt),
    };
  }
}
