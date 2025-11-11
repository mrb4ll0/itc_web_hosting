// lib/model/student.js

import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

export class Student {
  constructor({
  phoneNumber = "",
  uid = "",
  fullName = "",
  email = "",
  bio = "",
  role = "student",
  imageUrl = "",
  skills = [],
  resumeUrl = "",
  certifications = [],
  portfolioDescription = "",
  pastInternships = [],
  matricNumber = "",
  dateOfBirth = "",
  school = "",
  department = "",
  courseOfStudy = "",
  level = "",
  institution = "",
  portfolio = {},
  createdAt = null,
  updatedAt = null,
  studentIDCard = [], 
  studentITLetter = [],
  major = ''
}) {
  this.phoneNumber = phoneNumber;
  this.uid = uid;
  this.fullName = fullName;
  this.email = email;
  this.bio = bio;
  this.role = role;
  this.imageUrl = imageUrl;
  this.skills = skills;
  this.resumeUrl = resumeUrl;
  this.certifications = certifications;
  this.portfolioDescription = portfolioDescription;
  this.pastInternships = pastInternships;
  this.matricNumber = matricNumber; 
  this.dateOfBirth = dateOfBirth;
  this.school = school;
  this.department = department;
  this.courseOfStudy = courseOfStudy;
  this.level = level;
  this.institution = institution;
  this.portfolio = portfolio;
  this.createdAt = createdAt;
  this.updatedAt = updatedAt;
  this.studentIDCard = studentIDCard; 
  this.studentITLetter = studentITLetter; 
  this.major = major; 
}

  static fromFirestore(data) {
    //console("fromFirestore data "+JSON.stringify(data));
    return new Student({
      phoneNumber: data.phoneNumber ?? "",
      uid: data.uid ?? "",
      fullName: data.fullName ?? "",
      email: data.email ?? "",
      bio: data.bio ?? "",
      role: data.role ?? "student",
      imageUrl: data.imageUrl ?? "",
      skills: Array.isArray(data.skills) ? data.skills : [],
      resumeUrl: data.resumeUrl ?? "",
      certifications: Array.isArray(data.certifications)
        ? data.certifications
        : [],
      portfolioDescription: data.portfolioDescription ?? "",
      pastInternships: Array.isArray(data.pastInternships)
        ? data.pastInternships.map((e) => ({ ...e }))
        : [],
      matricNumber: data.matricNumber ?? "",
      dateOfBirth: data.dateOfBirth ?? "",
      school: data.school ?? data.faculty ?? "",
      department: data.department ?? "",
      courseOfStudy: data.courseOfStudy ?? data.program ?? "",
      level: data.level ?? "",
      institution: data.institution ?? "",
      portfolio: data.portfolio ?? {},
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      // ✅ BOTH AS ARRAYS
      studentIDCard: Array.isArray(data.studentIDCard)
        ? data.studentIDCard
        : [],
      studentITLetter: Array.isArray(data.studentITLetter)
        ? data.studentITLetter
        : [],
        major: data.major?? ""
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
      studentIDCard: [], // ✅ EMPTY ARRAY
      studentITLetter: [], // ✅ EMPTY ARRAY
    });
  }

  static fromMap(data) {
  //console.log("data given to fromMap " + JSON.stringify(data));
  
  // Helper function to convert Firestore timestamps
  const convertTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (timestamp.seconds) {
      // Firestore Timestamp object
      return new Date(timestamp.seconds * 1000);
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    return new Date();
  };

  // Handle studentIDCard - ensure it's always an array
  let studentIDCard = [];
  if (Array.isArray(data.studentIDCard)) {
    studentIDCard = data.studentIDCard;
  } else if (data.studentIDCard && typeof data.studentIDCard === 'string') {
    // Convert single string to array
    studentIDCard = [data.studentIDCard];
  }

  let studentITLetter = [];
  if (Array.isArray(data.studentITLetter)) {
    studentITLetter = data.studentITLetter;
  } else if (data.studentITLetter && typeof data.studentITLetter === 'string') {
    // Convert single string to array
    studentITLetter = [data.studentITLetter];
  }

  return new Student({
    phoneNumber: data.phoneNumber ?? "",
    uid: data.uid ?? "",
    fullName: data.fullName ?? "",
    email: data.email ?? "",
    bio: data.bio ?? "",
    role: data.role ?? "student",
    imageUrl: data.imageUrl ?? "",
    skills: Array.isArray(data.skills) ? data.skills : [],
    resumeUrl: data.resumeUrl ?? "",
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
    portfolioDescription: data.portfolioDescription ?? "",
    pastInternships: Array.isArray(data.pastInternships) ? data.pastInternships.map((e) => ({ ...e })) : [],
    matricNumber: data.matricNumber ?? "", // FIXED: This was being overwritten by major
    dateOfBirth: data.dateOfBirth ?? "",
    school: data.school ?? data.faculty ?? "",
    department: data.department ?? "",
    courseOfStudy: data.courseOfStudy ?? "",
    level: data.level ?? "",
    institution: data.institution ?? "",
    portfolio: data.portfolio ?? {},
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt), // FIXED: This was becoming null
    studentIDCard: studentIDCard, // FIXED: Now properly handled as array
    studentITLetter: studentITLetter, // FIXED: Now properly handled as array
    major: data.major ?? "" // FIXED: Now properly assigned to major field
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
      phoneNumber: this.phoneNumber,
      uid: this.uid,
      fullName: this.fullName,
      email: this.email,
      bio: this.bio,
      role: this.role,
      imageUrl: this.imageUrl,
      skills: this.skills,
      resumeUrl: this.resumeUrl,
      certifications: this.certifications,
      portfolioDescription: this.portfolioDescription,
      pastInternships: this.pastInternships,
      matricNumber: this.matricNumber,
      dateOfBirth: this.dateOfBirth,
      school: this.school,
      department: this.department,
      courseOfStudy: this.courseOfStudy,
      level: this.level,
      institution: this.institution,
      portfolio: this.portfolio,
      createdAt: safeToISOString(this.createdAt),
      updatedAt: safeToISOString(this.updatedAt),
      studentIDCard: this.studentIDCard, 
      studentITLetter: this.studentITLetter, 
      major: this.major
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
    phoneNumber,
    uid,
    fullName,
    email,
    bio,
    role,
    imageUrl,
    skills,
    resumeUrl,
    certifications,
    portfolioDescription,
    pastInternships,
    matricNumber,
    dateOfBirth,
    school,
    department,
    courseOfStudy,
    level,
    institution,
    portfolio,
    createdAt,
    updatedAt,
    studentIDCard,
    studentITLetter,
    major
  } = {}) {
    return new Student({
      phoneNumber: phoneNumber ?? this.phoneNumber,
      uid: uid ?? this.uid,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      bio: bio ?? this.bio,
      role: role ?? this.role,
      imageUrl: imageUrl ?? this.imageUrl,
      skills: skills ?? this.skills,
      resumeUrl: resumeUrl ?? this.resumeUrl,
      certifications: certifications ?? this.certifications,
      portfolioDescription: portfolioDescription ?? this.portfolioDescription,
      pastInternships: pastInternships ?? this.pastInternships,
      matricNumber: matricNumber ?? this.matricNumber,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      school: school ?? this.school,
      department: department ?? this.department,
      courseOfStudy: courseOfStudy ?? this.courseOfStudy,
      level: level ?? this.level,
      institution: institution ?? this.institution,
      portfolio: portfolio ?? this.portfolio,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      studentIDCard: studentIDCard ?? this.studentIDCard,
      studentITLetter: studentITLetter ?? this.studentITLetter,
      major: major??this.major
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
      this.level
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

  //  Format date of birth for display
  get formattedDateOfBirth() {
    if (!this.dateOfBirth) return "Not Set";

    try {
      if (this.dateOfBirth instanceof Date) {
        return this.dateOfBirth.toLocaleDateString();
      }

      if (
        typeof this.dateOfBirth === "string" ||
        typeof this.dateOfBirth === "number"
      ) {
        return new Date(this.dateOfBirth).toLocaleDateString();
      }

      return "Invalid Date";
    } catch (error) {
      return "Invalid Date";
    }
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
      this.skills.push(skill);
      this.updatedAt = new Date();
    }
    return this;
  }

  //  Remove skill
  removeSkill(skill) {
    this.skills = this.skills.filter(
      (s) => s.toLowerCase() !== skill.toLowerCase()
    );
    this.updatedAt = new Date();
    return this;
  }

  // Add this method to your StudentCloudDB class

  /**
   * Update a student document in Firestore
   * @param {Student} student - The Student object with updated data
   * @returns {Promise<void>}
   */
  async updateStudent(student) {
    try {
      if (!student || !student.uid) {
        throw new Error("Student object and UID are required");
      }

      const ref = doc(
        this._firebaseFirestore,
        "users",
        "students",
        "students",
        student.uid
      );

      // Update the updatedAt timestamp
      const updatedStudent = student.copyWith({
        updatedAt: new Date(),
      });

      // Convert to map for Firestore
      const studentData = updatedStudent.toMap();

      await updateDoc(ref, studentData);
      //console.log(`Student ${student.uid} updated successfully`);
    } catch (error) {
      console.error("Error updating student:", error);
      throw error;
    }
  }
}
