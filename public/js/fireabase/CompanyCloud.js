import {
  getFirestore,
  collection,
  limit,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  deleteField,
  deleteDoc,
  collectionGroup,
  getAuth,
  db,
  auth,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  arrayUnion 
} from "../config/firebaseInit.js";

// Import your project-specific logic & models (adjust paths as needed)
import { ITCFirebaseLogic } from "./ITCFirebaseLogic.js"; // must export the class used in Dart
import { IndustrialTraining } from "../model/internship_model.js";
import { Student } from "../model/Student.js";
import { StudentApplication } from "../model/studentApplication.js";
import { Company } from "../model/Company.js";
import { CompanyReview } from "../model/review.js";
import CloudStorage from "./Cloud_Storage.js";
import { ITBaseCompanyCloud } from "./ITBaseCompanyCloud.js";
const it_base_company_cloud = new ITBaseCompanyCloud();

export class CompanyCloud {
  constructor() {
    this._firebaseFirestore = db;
    this._firebaseAuth = auth;
    this.usersCollection = "users";
    this._itcFirebaseLogic = new ITCFirebaseLogic();
    this.cloudStorage = new CloudStorage();
  }

  async getCurrentStudent() {
    try {
      const currentUser = this._firebaseAuth.currentUser;
      if (!currentUser) {
        console.warn("No user authenticated");
        return null;
      }

      return await this.getStudentById(currentUser.uid);
    } catch (error) {
      console.error("Error getting current student:", error);
      throw error;
    }
  }

  async getStudentById(studentId) {
    ////console.log("get Student by id ");
    if (!studentId) {
      throw new Error("Student ID is required");
    }
    ////console.log("before try ");
    try {
      const studentDoc = await getDoc(
        doc(
          this._firebaseFirestore,
          this.usersCollection,
          "students",
          "students",
          studentId
        )
      );

      if (studentDoc.exists()) {
        const data = studentDoc.data();
        ////console.log("data before mapping " + JSON.stringify(data));
        return Student.fromMap(data);
      } else {
        console.warn(`Student with ID ${studentId} not found`);
        return null;
      }
    } catch (error) {
      console.error("Error getting student by ID:", error);
      throw error;
    }
  }

  /**
   * Post an internship under company -> IT
   * @param {IndustrialTraining} internship
   */
  async postInternship(internship) {
    // Verify the user is a company
    const company = await this._itcFirebaseLogic.getCompany(
      internship.company.id
    );
    if (!company) throw new Error("Current user is not a company");

    // Reference to nested internship collection, auto-generated ID:
    const internshipsCol = collection(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies",
      company.id,
      "IT"
    );
    const internshipRef = doc(internshipsCol); // auto-id
    ////console.log("internshipRef is", internshipRef.path);

    const internshipData = {
      ...internship.toMap(),
      postedAt: serverTimestamp(),
    };

    try {
      await setDoc(internshipRef, internshipData);
    } catch (e) {
      // Match Dart behavior: print stack (here, console) and rethrow if you want
      console.error(e);
      throw e;
    }
  }

  getAllCompanyInternships(callback) {
    const q = query(
      collectionGroup(this._firebaseFirestore, "IT"),
      orderBy("postedAt", "desc")
    );

    return onSnapshot(q, async (snapshot) => {
      const promises = snapshot.docs.map(async (docSnap) => {
        var it = IndustrialTraining.fromMap(docSnap.data(), docSnap.id);
        it.company = await this.getCompany(it.company.id);
        return it;
      });
      const internships = await Promise.all(promises);
      callback(internships);
    });
  }

  /**
   * Get a specific internship by ID
   * @param {string} internshipId - The ID of the internship to retrieve
   * @returns {Promise<IndustrialTraining|null>} The internship object or null if not found
   */
  async getInternshipById(internshipId) {
    if (!internshipId) {
      throw new Error("Internship ID is required");
    }

    try {
      // Since internships are stored under companies, we need to search across all companies
      const companiesSnapshot = await getDocs(
        collection(this._firebaseFirestore, "users", "companies", "companies")
      );

      // Search through each company's IT collection
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const internshipRef = doc(
          this._firebaseFirestore,
          "users",
          "companies",
          "companies",
          companyId,
          "IT",
          internshipId
        );

        const internshipSnap = await getDoc(internshipRef);

        if (internshipSnap.exists()) {
          const internshipData = internshipSnap.data();
          var internship = IndustrialTraining.fromMap(
            internshipData,
            internshipSnap.id
          );
          internship.company = await this.getCompany(companyId);
          return internship;
        }
      }

      // If we get here, no internship was found with that ID
      console.warn(`Internship with ID ${internshipId} not found`);
      return null;
    } catch (error) {
      console.error("Error getting internship by ID:", error);
      throw error;
    }
  }

  /**
   * @param {string} userId
   * @param {(stats: object) => void} callback
   * @returns {Promise<void>}
   */
  async statsStream(userId, callback) {
    const db = this._firebaseFirestore;

    // Apps: find all applications for userId across companies -> IT -> internship -> applications where uid == userId
    const companiesSnap = await getDocs(
      collection(db, "users", "companies", "companies")
    );
    let allAppDocs = [];
    for (const companyDoc of companiesSnap.docs) {
      const companyId = companyDoc.data().id ?? companyDoc.id;
      const internshipsSnap = await getDocs(
        collection(db, "users", "companies", "companies", companyId, "IT")
      );
      for (const internshipDoc of internshipsSnap.docs) {
        const appsSnap = await getDocs(
          query(
            collection(
              db,
              "users",
              "companies",
              "companies",
              companyId,
              "IT",
              internshipDoc.id,
              "applications"
            ),
            where("uid", "==", userId)
          )
        );
        allAppDocs = allAppDocs.concat(appsSnap.docs);
      }
    }

    // Bookings
    const landlordsSnap = await getDocs(
      collection(db, "users", "landlords", "landlords")
    );
    let allBookingDocs = [];
    for (const landlordDoc of landlordsSnap.docs) {
      const accomSnap = await getDocs(
        collection(
          db,
          "users",
          "landlords",
          "landlords",
          landlordDoc.id,
          "accommodations"
        )
      );
      for (const accomDoc of accomSnap.docs) {
        const accommodationData = accomDoc.data();
        const bookingRequestsMap = accommodationData.bookingRequests ?? null;
        if (bookingRequestsMap && typeof bookingRequestsMap === "object") {
          for (const [studentId, bookingData] of Object.entries(
            bookingRequestsMap
          )) {
            if (
              studentId === userId &&
              bookingData &&
              typeof bookingData === "object"
            ) {
              allBookingDocs.push(bookingData);
            }
          }
        }
      }
    }

    // Sent messages
    const chatRoomsSnap = await getDocs(
      query(
        collection(db, "chat_rooms"),
        where("participants", "array-contains", userId)
      )
    );
    let totalSent = 0;
    for (const docSnap of chatRoomsSnap.docs) {
      const messagesSnap = await getDocs(
        query(
          collection(db, "chat_rooms", docSnap.id, "messages"),
          where("sender_id", "==", userId)
        )
      );
      totalSent += messagesSnap.size;
    }

    // Unread messages
    let totalUnread = 0;
    for (const docSnap of chatRoomsSnap.docs) {
      const unreadSnap = await getDocs(
        query(
          collection(db, "chat_rooms", docSnap.id, "messages"),
          where("receiver_id", "==", userId),
          where("is_read", "==", false)
        )
      );
      totalUnread += unreadSnap.size;
    }

    // Saved internships count
    const savedSnap = await getDocs(
      collection(
        db,
        "users",
        "students",
        "students",
        userId,
        "saved_internships"
      )
    );
    const savedCount = savedSnap.size;

    // Compute stats (mirror Dart logic)
    let accepted = 0,
      rejected = 0,
      pending = 0;
    for (const docSnap of allAppDocs) {
      const status = (docSnap.data().applicationStatus ?? "").toString().trim();
      if (status === "accepted") accepted++;
      else if (status === "rejected") rejected++;
      else pending++;
    }

    const result = {
      totalApplications: allAppDocs.length,
      accepted,
      rejected,
      pending,
      bookings: allBookingDocs.length,
      messages: totalSent,
      unreadMessages: totalUnread,
      saved: savedCount,
    };

    // call the callback with the computed result
    callback(result);
  }

  /**
   * Update student's profile image
   */
  async updateStudentProfileImage({ studentId, imageUrl }) {
    try {
      const ref = doc(
        this._firebaseFirestore,
        this.usersCollection,
        "students",
        "students",
        studentId
      );
      await updateDoc(ref, { imageUrl });
    } catch (e) {
      throw e;
    }
  }

  /**
   * Update portfolio fields
   */
  async updateStudentPortfolio({ studentId, portfolioFields }) {
    try {
      const ref = doc(
        this._firebaseFirestore,
        this.usersCollection,
        "students",
        "students",
        studentId
      );
      await updateDoc(ref, portfolioFields);
    } catch (e) {
      throw e;
    }
  }

  /**
   * Notifications stream (ordered by timestamp desc)
   * Returns unsubscribe function (onSnapshot)
   */
  notificationStream(studentUid, callback) {
    const q = query(
      collection(
        this._firebaseFirestore,
        this.usersCollection,
        "students",
        "students",
        studentUid,
        "notifications"
      ),
      orderBy("timestamp", "desc")
    );

    return onSnapshot(q, (querySnapshot) => {
      const notifs = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          title: data.status ?? "No Title",
          body: data.message ?? "No Message",
          timestamp:
            data.timestamp && data.timestamp.toDate
              ? data.timestamp.toDate()
              : new Date(),
        };
      });
      callback(notifs);
    });
  }

  /**
   * Return saved internships for the current authenticated user
   */
  async savedIT() {
    const user = this._firebaseAuth.currentUser;
    if (!user) return [];

    const snap = await getDocs(
      collection(
        this._firebaseFirestore,
        this.usersCollection,
        "students",
        "students",
        user.uid,
        "saved_internships"
      )
    );

    return snap.docs.map((docSnap) =>
      IndustrialTraining.fromMap(docSnap.data(), docSnap.id)
    );
  }

  /**
   * Add multiple student applications to an internship (batch)
   * internship.id must be set
   */
  async addApplicationsToInternship({ internship, studentIds }) {
    const internshipId = internship.id;
    if (!internshipId) throw new Error("internship.id is required");

    const company = await this._itcFirebaseLogic.getCompany(
      internship.company.id
    );
    if (!company)
      throw new Error(`Company not found for internship ${internship.id}`);

    const applicationsRef = collection(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies",
      company.id,
      "IT",
      internshipId,
      "applications"
    );

    const batch = writeBatch(this._firebaseFirestore);

    for (const uid of studentIds) {
      const student = await new ITCFirebaseLogic().getStudent(uid);
      if (!student) continue;

      const application = new StudentApplication({
        student,
        internship,
        applicationStatus: "pending",
        applicationDate: new Date(),
      });

      const appDocRef = doc(applicationsRef, student.uid);
      batch.set(appDocRef, application.toMap());
    }

    await batch.commit();
  }

  /**
   * Get student internship applications for a company (Dart method translated)
   */
  async getStudentInternshipApplicationsForCompany(companyId) {
    const internshipsSnapshot = await getDocs(
      collection(
        this._firebaseFirestore,
        this.usersCollection,
        "companies",
        "companies",
        companyId,
        "IT"
      )
    );

    const applications = [];

    for (const internshipDoc of internshipsSnapshot.docs) {
      const internshipData = internshipDoc.data();
      const internship = IndustrialTraining.fromMap(
        internshipData,
        internshipDoc.id
      );

      const applicationsSnapshot = await getDocs(
        internshipDoc.ref.collection("applications")
      );

      for (const applicationDoc of applicationsSnapshot.docs) {
        const applicationData = applicationDoc.data();
        const student = Student.fromFirestore(applicationData.student || {});
        const application = new StudentApplication({
          student,
          internship,
          applicationStatus: applicationData.applicationStatus,
          applicationDate: new Date(applicationData.applicationDate),
        });
        applications.push(application);
      }
    }
    return applications;
  }

  /**
   * Update application status
   */
  async updateApplicationStatus({
    companyId,
    internshipId,
    studentId,
    status,
  }) {
    const appRef = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies",
      companyId,
      "IT",
      internshipId,
      "applications",
      studentId
    );
    await updateDoc(appRef, { applicationStatus: status });
  }

  /**
   * Dashboard helper: pending student-internship pairs
   */
  /**
   * Dashboard helper: pending student-internship pairs
   */
  /**
   * Dashboard helper: pending student-internship pairs
   */
  async dashboardGetStudentInternshipApplicationsForCompany() {
    try {
      // Get all companies first
      const companiesSnapshot = await getDocs(
        collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies"
        )
      );

      const applications = [];

      for (const companyDoc of companiesSnapshot.docs) {
        // Get internships from "IT" collection
        const internshipsCol = collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies",
          companyDoc.id,
          "IT"
        );
        const internshipsSnapshot = await getDocs(internshipsCol);

        for (const internshipDoc of internshipsSnapshot.docs) {
          const internship = IndustrialTraining.fromMap(
            internshipDoc.data(),
            internshipDoc.id
          );

          // Get pending applications for this internship
          const applicationsCol = collection(
            this._firebaseFirestore,
            this.usersCollection,
            "companies",
            "companies",
            companyDoc.id,
            "IT",
            internshipDoc.id,
            "applications"
          );
          const applicationsSnapshot = await getDocs(
            query(applicationsCol, where("applicationStatus", "==", "pending"))
          );

          for (const applicationDoc of applicationsSnapshot.docs) {
            const studentData = applicationDoc.data();
            const student = Student.fromFirestore(studentData);
            applications.push({
              student: student,
              internship: internship,
            });
          }
        }
      }

      return applications;
    } catch (error) {
      console.error("Error loading applications:", error);
      throw error;
    }
  }

  async getStudentInternships(studentUid) {
    const applications = [];

    // Get all companies
    const companiesRef = collection(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies"
    );
    const companiesSnapshot = await getDocs(companiesRef);

    for (const companyDoc of companiesSnapshot.docs) {
      // Get internships from "IT" collection for this company
      const internshipsCol = collection(
        this._firebaseFirestore,
        this.usersCollection,
        "companies",
        "companies",
        companyDoc.id,
        "IT"
      );
      const internshipsSnapshot = await getDocs(internshipsCol);

      for (const internshipDoc of internshipsSnapshot.docs) {
        const applicationsCol = collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies",
          companyDoc.id,
          "IT",
          internshipDoc.id,
          "applications"
        );

        ////console.log("Checking applications for student ID:", studentUid);

        // Query 1: top-level uid
        const queryByUid = query(
          applicationsCol,
          where("uid", "==", studentUid)
        );
        const snapshotByUid = await getDocs(queryByUid);

        // Query 2: nested student.id
        const queryByStudentId = query(
          applicationsCol,
          where("student.uid", "==", studentUid)
        );
        const snapshotByStudentId = await getDocs(queryByStudentId);

        // Merge results, avoid duplicates
        const allApplications = new Map();

        snapshotByUid.forEach((doc) => allApplications.set(doc.id, doc.data()));
        snapshotByStudentId.forEach((doc) =>
          allApplications.set(doc.id, doc.data())
        );

        if (allApplications.size > 0) {
          const internship = IndustrialTraining.fromMap(
            internshipDoc.data(),
            internshipDoc.id
          );

          for (const [appId, applicationData] of allApplications) {
            applications.push({
              internship: internship,
              applicationStatus: applicationData.applicationStatus,
              appliedAt:
                applicationData.appliedAt || applicationData.updatedAt || null,
              applicationId: appId,
              companyId: companyDoc.id,
            });
          }
        }
      }
    }

    return applications;
  }

  /**
   * studentInternshipApplicationsForCompany - similar to Dart version
   */
  async studentInternshipApplicationsForCompany(companyId) {
    const internshipsSnapshot = await getDocs(
      collection(
        this._firebaseFirestore,
        this.usersCollection,
        "companies",
        "companies",
        companyId,
        "IT"
      )
    );

    const applications = [];

    for (const internshipDoc of internshipsSnapshot.docs) {
      const internship = IndustrialTraining.fromMap(
        internshipDoc.data(),
        internshipDoc.id
      );
      const applicationsSnapshot = await getDocs(
        internshipDoc.ref.collection("applications")
      );

      for (const applicationDoc of applicationsSnapshot.docs) {
        const appData = applicationDoc.data();
        const student = Student.fromFirestore(appData.student || {});
        const status = appData.applicationStatus ?? "pending";
        const applicationDate = appData.applicationDate
          ? new Date(appData.applicationDate)
          : new Date();

        applications.push(
          new StudentApplication({
            student,
            internship,
            applicationStatus: status,
            applicationDate,
          })
        );
      }
    }
    return applications;
  }

  /**
   * Get applications for single student across all companies/internships
   */
  /**
   * Get a specific student application by company ID, internship ID, and student ID
   * @param {string} companyId - The ID of the company
   * @param {string} internshipId - The ID of the internship
   * @param {string} studentId - The ID of the student
   * @returns {Promise<StudentApplication|null>} The student application object or null if not found
   */
  async getStudentApplication(companyId, internshipId, studentId) {
    if (!companyId || !internshipId || !studentId) {
      throw new Error("Company ID, internship ID, and student ID are required");
    }

    try {
      // Reference to the specific application document
      const applicationRef = doc(
        this._firebaseFirestore,
        this.usersCollection,
        "companies",
        "companies",
        companyId,
        "IT",
        internshipId,
        "applications",
        studentId
      );

      const applicationSnap = await getDoc(applicationRef);

      if (applicationSnap.exists()) {
        const applicationData = applicationSnap.data();

        // Get the student data
        const student = await this._itcFirebaseLogic.getStudent(studentId);
        if (!student) {
          console.warn(`Student with ID ${studentId} not found`);
          return null;
        }

        // Get the internship data
        const internship = await this.getInternshipById(internshipId);
        if (!internship) {
          console.warn(`Internship with ID ${internshipId} not found`);
          return null;
        }

        // Create and return the StudentApplication object
        return new StudentApplication({
          student: student,
          internship: internship,
          applicationStatus: applicationData.applicationStatus || "pending",
          applicationDate: applicationData.applicationDate
            ? new Date(applicationData.applicationDate)
            : new Date(),
        });
      } else {
        // ////console.log(
        //   `Application not found for company: ${companyId}, internship: ${internshipId}, student: ${studentId}`
        // );
        return null;
      }
    } catch (error) {
      console.error("Error getting student application:", error);
      throw error;
    }
  }

  // In CompanyCloud.js - Add these methods to your existing class

  /**
   * Get all companies with basic info for listing
   * @returns {Promise<Company[]>} Array of companies
   */
  async getAllCompanies() {
    try {
      const companiesSnapshot = await getDocs(
        collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies"
        )
      );

      const companies = companiesSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return Company.fromMap(data);
      });

      return companies;
    } catch (error) {
      console.error("Error getting all companies:", error);
      throw error;
    }
  }

  /**
   * Get featured companies (you can add a 'featured' field to companies)
   * @returns {Promise<Company[]>} Array of featured companies
   */
  async getFeaturedCompanies() {
    try {
      const q = query(
        collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies"
        )
      );

      const companiesSnapshot = await getDocs(q);

      const companies = companiesSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return Company.fromMap(data);
      });

      return companies;
    } catch (error) {
      console.error("Error getting featured companies:", error);
      // Fallback to all companies if featured query fails
      return this.getAllCompanies();
    }
  }

  /**
   * Get company by ID
   * @param {string} companyId
   * @returns {Promise<Company|null>} Company object or null if not found
   */
  async getCompanyById(companyId) {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    try {
      const companyDoc = await getDoc(
        doc(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies",
          companyId
        )
      );

      if (companyDoc.exists()) {
        return Company.fromMap(companyDoc.data());
      } else {
        console.warn(`Company with ID ${companyId} not found`);
        return null;
      }
    } catch (error) {
      console.error("Error getting company by ID:", error);
      throw error;
    }
  }

  /**
   * Alternative version that gets all applications for a student and filters by internship
   * @param {string} studentId - The ID of the student
   * @param {string} internshipId - The ID of the internship to filter by (optional)
   * @returns {Promise<StudentApplication[]>} Array of student applications
   */
  async getStudentApplications(studentId, internshipId = null) {
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    try {
      const applications = [];
      const student = await this._itcFirebaseLogic.getStudent(studentId);
      if (!student) {
        console.warn(`Student with ID ${studentId} not found`);
        return [];
      }

      // Get all companies
      const companiesSnapshot = await getDocs(
        collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies"
        )
      );

      // Iterate through all companies and their internships
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;

        // Get all internships for this company
        const internshipsSnapshot = await getDocs(
          collection(
            this._firebaseFirestore,
            this.usersCollection,
            "companies",
            "companies",
            companyId,
            "IT"
          )
        );

        for (const internshipDoc of internshipsSnapshot.docs) {
          const currentInternshipId = internshipDoc.id;

          // If internshipId is specified, only check that specific internship
          if (internshipId && currentInternshipId !== internshipId) {
            continue;
          }

          // Check if application exists for this student
          const applicationRef = doc(
            this._firebaseFirestore,
            this.usersCollection,
            "companies",
            "companies",
            companyId,
            "IT",
            currentInternshipId,
            "applications",
            studentId
          );

          const applicationSnap = await getDoc(applicationRef);

          if (applicationSnap.exists()) {
            const applicationData = applicationSnap.data();
            const internship = IndustrialTraining.fromMap(
              internshipDoc.data(),
              currentInternshipId
            );

            applications.push(
              new StudentApplication({
                student: student,
                internship: internship,
                applicationStatus:
                  applicationData.applicationStatus || "pending",
                applicationDate: applicationData.applicationDate
                  ? new Date(applicationData.applicationDate)
                  : new Date(),
              })
            );
          }
        }
      }

      return applications;
    } catch (error) {
      console.error("Error getting student applications:", error);
      throw error;
    }
  }
  /**
   * Delete internship and its nested application docs (batch)
   */
  async deleteInternship(internship) {
    const internshipRef = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies",
      internship.company.id,
      "IT",
      internship.id
    );

    const applicationsSnapshot = await getDocs(
      internshipRef.collection("applications")
    );
    const batch = writeBatch(this._firebaseFirestore);
    for (const appDoc of applicationsSnapshot.docs) {
      batch.delete(appDoc.ref);
    }
    batch.delete(internshipRef);
    await batch.commit();
  }

  getAllCompaniesStream(callback) {
    const ref = collection(
      this._firebaseFirestore,
      "users",
      "companies",
      "companies"
    );
    return onSnapshot(ref, (snapshot) => {
      const companies = snapshot.docs.map((docSnap) =>
        Company.fromMap(docSnap.data())
      );
      callback(companies);
    });
  }

  /**
   * Search companies by name client-side
   */
  async searchCompaniesByName(nameQuery) {
    const snapshot = await getDocs(
      collection(this._firebaseFirestore, "users", "companies", "companies")
    );
    const lowercaseQuery = (nameQuery || "").toLowerCase();

    return snapshot.docs
      .map((docSnap) => Company.fromMap(docSnap.data()))
      .filter((company) =>
        (company.name || "").toLowerCase().includes(lowercaseQuery)
      );
  }

  
  /**
   * Add company review
   */
  async addCompanyReview(review) {
    ////console.log("Review data:", review);

    try {
      const reviewRef = doc(
        this._firebaseFirestore,
        "users", 
        "companies", 
        "companies", 
        review.companyId, 
        "reviews", 
        review.id
      );


      await setDoc(reviewRef, {
        ...review.toMap(),
        createdAt: serverTimestamp(), // Add server timestamp
      });

    } catch (error) {
      console.error("Error in addCompanyReview:", error);
      throw error;
    }
  }

  /**
   * Stream reviews for a company (onSnapshot)
   */
  getCompanyReviews(companyId, callback) {
    const ref = query(
      collection(
        this._firebaseFirestore,
        this.usersCollection,
        "companies",
        "companies",
        companyId,
        "reviews"
      ),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(ref, (snapshot) => {
      const reviews = snapshot.docs.map((docSnap) =>
        CompanyReview.fromMap(docSnap.data())
      );
      callback(reviews);
    });
  }

  /**
   * Get average rating
   */
  async getAverageCompanyRating(companyId) {
    const snapshot = await getDocs(
      collection(
        this._firebaseFirestore,
        this.usersCollection,
        "companies",
        "companies",
        companyId,
        "reviews"
      )
    );
    if (!snapshot.docs.length) return 0.0;
    const ratings = snapshot.docs.map((docSnap) =>
      Number(docSnap.data().rating)
    );
    const sum = ratings.reduce((a, b) => a + b, 0);
    return sum / ratings.length;
  }

  async getAllITOfCompany(companyId) {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    try {
      // Reference to the company's IT collection
      const itCollectionRef = collection(
        this._firebaseFirestore,
        this.usersCollection,
        "companies",
        "companies",
        companyId,
        "IT"
      );

      // Query to get all ITs, ordered by posted date (newest first)
      const q = query(itCollectionRef, orderBy("postedAt", "desc"));

      const snapshot = await getDocs(q);

      // Convert each document to IndustrialTraining object
      const itList = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
         data.company = this.getCompany(data.company.id);
        return IndustrialTraining.fromMap(data, docSnap.id);
      });

      return itList;
    } catch (error) {
      console.error("Error getting ITs for company:", error);
      throw error;
    }
  }

  async deleteCompanyReview(companyId, reviewId) {
    const reviewRef = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies",
      companyId,
      "reviews",
      reviewId
    );

    await deleteDoc(reviewRef);
  }

  // Add to your CompanyCloud class

  /**
   * Get current authenticated student with all profile fields
   */
  async getCurrentStudent() {
    try {
      const currentUser = this._firebaseAuth.currentUser;
      if (!currentUser) {
        console.warn("No user authenticated");
        return null;
      }

      const studentDoc = await getDoc(
        doc(
          this._firebaseFirestore,
          this.usersCollection,
          "students",
          "students",
          currentUser.uid
        )
      );

      if (studentDoc.exists()) {
        const data = studentDoc.data();
        return Student.fromMap(data);
      } else {
        console.warn(`Student with ID ${currentUser.uid} not found`);
        return null;
      }
    } catch (error) {
      console.error("Error getting current student:", error);
      throw error;
    }
  }

  // In CompanyCloud.js - Updated to use CloudStorage

  /**
   * Update student profile with all fields
   * @param {string} studentId - Student ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateStudentProfile(studentId, updates) {
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    try {
      ////console.log("Updating student profile:", studentId, updates);

      const studentRef = doc(
        this._firebaseFirestore,
        this.usersCollection,
        "students",
        "students",
        studentId
      );

      // Prepare the update data
      const updateData = this.prepareStudentUpdateData(updates);

      // Add timestamp
      updateData.updatedAt = serverTimestamp();

      ////console.log("Final update data:", updateData);

      await updateDoc(studentRef, updateData);

      ////console.log("Student profile updated successfully");
    } catch (error) {
      console.error("Error updating student profile:", error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Prepare student update data by handling different field types
   * @param {Object} updates - Raw update data
   * @returns {Object} Prepared update data for Firestore
   */
  /**
 * Prepare student update data by handling different field types
 * @param {Object} updates - Raw update data
 * @returns {Object} Prepared update data for Firestore
 */
prepareStudentUpdateData(updates) {
  const updateData = {};

  Object.keys(updates).forEach((key) => {
    if (
      updates[key] !== undefined &&
      updates[key] !== null &&
      updates[key] !== ""
    ) {
      switch (key) {
        case "skills":
        case "certifications":
        case "pastInternships":
          // Use arrayUnion to add to existing array instead of replacing
          if (Array.isArray(updates[key])) {
            updateData[key] = arrayUnion(...updates[key]);
          } else {
            updateData[key] = arrayUnion(updates[key]);
          }
          break;

        case "dateOfBirth":
          if (updates[key] instanceof Date) {
            updateData[key] = updates[key];
          } else if (typeof updates[key] === "string") {
            updateData[key] = new Date(updates[key]);
          } else {
            updateData[key] = updates[key];
          }
          break;

        case "portfolio":
          if (typeof updates[key] === "object") {
            updateData[key] = updates[key];
          }
          break;

        default:
          updateData[key] = updates[key];
          break;
      }
    }
  });

  return updateData;
}
  /**
   * Upload student profile image using CloudStorage
   * @param {string} studentId - Student ID
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<string>} Download URL of the uploaded image
   */
  async uploadStudentImage(studentId, imageFile) {
    if (!studentId || !imageFile) {
      throw new Error("Student ID and image file are required");
    }

    try {
      // Use CloudStorage to upload the image
      const downloadURL = await this.cloudStorage.uploadFile(
        imageFile,
        studentId,
        "profile-images"
      );

      if (!downloadURL) {
        throw new Error("Failed to upload image");
      }

      ////console.log("Image uploaded successfully:", downloadURL);

      // Update student profile with new image URL
      await this.updateStudentProfile(studentId, { imageUrl: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error("Error uploading student image:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload student resume using CloudStorage
   * @param {string} studentId - Student ID
   * @param {File} resumeFile - Resume file to upload
   * @returns {Promise<string>} Download URL of the uploaded resume
   */
  async uploadStudentResume(studentId, resumeFile) {
    if (!studentId || !resumeFile) {
      throw new Error("Student ID and resume file are required");
    }

    try {
      const downloadURL = await this.cloudStorage.uploadFile(
        resumeFile,
        studentId,
        "resumes"
      );

      if (!downloadURL) {
        throw new Error("Failed to upload resume");
      }

      ////console.log("Resume uploaded successfully:", downloadURL);

      // Update student profile with new resume URL
      await this.updateStudentProfile(studentId, { resumeUrl: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error("Error uploading student resume:", error);
      throw new Error(`Failed to upload resume: ${error.message}`);
    }
  }

  /**
   * Upload student cover letter using CloudStorage
   * @param {string} studentId - Student ID
   * @param {File} coverLetterFile - Cover letter file to upload
   * @returns {Promise<string>} Download URL of the uploaded cover letter
   */
  async uploadStudentCoverLetter(studentId, coverLetterFile) {
    if (!studentId || !coverLetterFile) {
      throw new Error("Student ID and cover letter file are required");
    }

    try {
      const downloadURL = await this.cloudStorage.uploadFile(
        coverLetterFile,
        studentId,
        "cover-letters"
      );

      if (!downloadURL) {
        throw new Error("Failed to upload cover letter");
      }

      ////console.log("Cover letter uploaded successfully:", downloadURL);

      // Update student profile with new cover letter URL
      await this.updateStudentProfile(studentId, {
        coverLetterUrl: downloadURL,
      });

      return downloadURL;
    } catch (error) {
      console.error("Error uploading student cover letter:", error);
      throw new Error(`Failed to upload cover letter: ${error.message}`);
    }
  }

  /**
   * Upload student certification document using CloudStorage
   * @param {string} studentId - Student ID
   * @param {File} certFile - Certification file to upload
   * @param {string} certName - Name of the certification
   * @returns {Promise<string>} Download URL of the uploaded certification
   */
  async uploadStudentCertification(studentId, certFile, certName) {
    if (!studentId || !certFile || !certName) {
      throw new Error("Student ID, certification file, and name are required");
    }

    try {
      const downloadURL = await this.cloudStorage.uploadFile(
        certFile,
        studentId,
        "certifications"
      );

      if (!downloadURL) {
        throw new Error("Failed to upload certification");
      }

      ////console.log("Certification uploaded successfully:", downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("Error uploading student certification:", error);
      throw new Error(`Failed to upload certification: ${error.message}`);
    }
  }

  /**
   * Upload multiple student files at once
   * @param {string} studentId - Student ID
   * @param {File[]} files - Array of files to upload
   * @param {string} category - Category for file organization
   * @returns {Promise<Array<{file: File, url: string|null}>>} Array of upload results
   */
  async uploadMultipleStudentFiles(studentId, files, category) {
    if (!studentId || !files || !category) {
      throw new Error("Student ID, files, and category are required");
    }

    try {
      const results = await this.cloudStorage.uploadMultipleFiles(
        files,
        studentId,
        category
      );

      ////console.log(`Uploaded ${files.length} files to ${category}`);
      return results;
    } catch (error) {
      console.error("Error uploading multiple files:", error);
      throw new Error(`Failed to upload files: ${error.message}`);
    }
  }

  /**
   * Delete student file from storage
   * @param {string} fileUrl - The download URL of the file to delete
   * @returns {Promise<boolean>} True if successful
   */
  async deleteStudentFile(fileUrl) {
    if (!fileUrl) {
      throw new Error("File URL is required");
    }

    try {
      const success = await this.cloudStorage.deleteFile(fileUrl);

      if (success) {
        ////console.log("File deleted successfully:", fileUrl);
      } else {
        console.warn("File deletion may have failed:", fileUrl);
      }

      return success;
    } catch (error) {
      console.error("Error deleting student file:", error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async addStudentCertification(studentId, certification) {
    if (!studentId || !certification) {
      throw new Error("Student ID and certification data are required");
    }

    try {
      // Get current student to update certifications array
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      const currentCertifications = student.certifications || [];
      const updatedCertifications = [...currentCertifications, certification];

      await this.updateStudentProfile(studentId, {
        certifications: updatedCertifications,
      });
    } catch (error) {
      console.error("Error adding student certification:", error);
      throw error;
    }
  }

  /**
   * Delete student certification
   * @param {string} studentId - Student ID
   * @param {number} certIndex - Index of certification to remove
   * @returns {Promise<void>}
   */
  async deleteStudentCertification(studentId, certIndex) {
    if (!studentId || certIndex === undefined) {
      throw new Error("Student ID and certification index are required");
    }

    try {
      // Get current student
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      const currentCertifications = student.certifications || [];

      if (certIndex < 0 || certIndex >= currentCertifications.length) {
        throw new Error("Invalid certification index");
      }

      const updatedCertifications = currentCertifications.filter(
        (_, index) => index !== certIndex
      );

      await this.updateStudentProfile(studentId, {
        certifications: updatedCertifications,
      });
    } catch (error) {
      console.error("Error deleting student certification:", error);
      throw error;
    }
  }

  /**
   * Update student skills
   * @param {string} studentId - Student ID
   * @param {string[]} skills - Array of skills
   * @returns {Promise<void>}
   */
  async updateStudentSkills(studentId, skills) {
    if (!studentId) {
      throw new Error("Student ID is required");
    }

    try {
      await this.updateStudentProfile(studentId, { skills: skills || [] });
    } catch (error) {
      console.error("Error updating student skills:", error);
      throw error;
    }
  }

  /**
   * Add a single skill to student profile
   * @param {string} studentId - Student ID
   * @param {string} skill - Skill to add
   * @returns {Promise<void>}
   */
  async addStudentSkill(studentId, skill) {
    if (!studentId || !skill) {
      throw new Error("Student ID and skill are required");
    }

    try {
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      const currentSkills = student.skills || [];

      // Check if skill already exists (case insensitive)
      const skillExists = currentSkills.some(
        (existingSkill) => existingSkill.toLowerCase() === skill.toLowerCase()
      );

      if (!skillExists) {
        const updatedSkills = [...currentSkills, skill];
        await this.updateStudentProfile(studentId, { skills: updatedSkills });
      }
    } catch (error) {
      console.error("Error adding student skill:", error);
      throw error;
    }
  }

  /**
   * Remove a skill from student profile
   * @param {string} studentId - Student ID
   * @param {string} skill - Skill to remove
   * @returns {Promise<void>}
   */
  async removeStudentSkill(studentId, skill) {
    if (!studentId || !skill) {
      throw new Error("Student ID and skill are required");
    }

    try {
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      const currentSkills = student.skills || [];
      const updatedSkills = currentSkills.filter(
        (existingSkill) => existingSkill.toLowerCase() !== skill.toLowerCase()
      );

      await this.updateStudentProfile(studentId, { skills: updatedSkills });
    } catch (error) {
      console.error("Error removing student skill:", error);
      throw error;
    }
  }

  /**
   * Add certification to student profile (updated to handle file upload)
   * @param {string} studentId - Student ID
   * @param {Object} certification - Certification data with optional file
   * @returns {Promise<void>}
   */
  async addStudentCertification(studentId, certification) {
    if (!studentId || !certification) {
      throw new Error("Student ID and certification data are required");
    }

    try {
      let downloadURL = null;

      // If there's a file in the certification data, upload it first
      if (certification.file) {
        downloadURL = await this.uploadStudentCertification(
          studentId,
          certification.file,
          certification.name
        );

        // Remove the file object from certification data
        delete certification.file;
      }

      // Add the download URL to certification data if available
      if (downloadURL) {
        certification.documentUrl = downloadURL;
      }

      // Get current student to update certifications array
      const student = await this.getStudentById(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      const currentCertifications = student.certifications || [];
      const updatedCertifications = [...currentCertifications, certification];

      await this.updateStudentProfile(studentId, {
        certifications: updatedCertifications,
      });
    } catch (error) {
      console.error("Error adding student certification:", error);
      throw error;
    }
  }

  // Add these methods to your CompanyCloud class

  /**
   * Get company by user ID (for authenticated company user)
   * @param {string} userId - The user ID (same as company ID in your structure)
   * @returns {Promise<Company|null>} Company object or null if not found
   */
  async getCompany(userId) {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      const companyDoc = await getDoc(
        doc(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies",
          userId
        )
      );

      if (companyDoc.exists()) {
        const data = companyDoc.data();
        return Company.fromMap(data);
      } else {
        console.warn(`Company with ID ${userId} not found`);
        return null;
      }
    } catch (error) {
      console.error("Error getting company:", error);
      throw error;
    }
  }

  /**
   * @param {string} companyId - The company ID
   * @returns {Promise<Object>} Stats object with totalPostings, activePostings, newApplications, hiredStudents
   */
  async getCompanyStats(companyId) {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    try {
      // Get all internships for this company
      const internshipsSnapshot = await getDocs(
        collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies",
          companyId,
          "IT"
        )
      );

      let totalPostings = 0;
      let activePostings = 0;
      let newApplications = 0;
      let hiredStudents = 0;

      // Count internships and check their status
      for (const internshipDoc of internshipsSnapshot.docs) {
        const internshipData = internshipDoc.data();
        totalPostings++;

        // Check if internship is active (you might need to adjust this logic based on your data structure)
        const isActive =
          internshipData.status === "open" ||
          internshipData.isActive === true ||
          !internshipData.deadline ||
          new Date(internshipData.deadline) > new Date();

        if (isActive) {
          activePostings++;
        }

        // Get applications for this internship
        const applicationsSnapshot = await getDocs(
          collection(
            this._firebaseFirestore,
            this.usersCollection,
            "companies",
            "companies",
            companyId,
            "IT",
            internshipDoc.id,
            "applications"
          )
        );

        applicationsSnapshot.docs.forEach((appDoc) => {
          const appData = appDoc.data();

          // Count new applications (status = 'new' or 'pending')
          if (
            appData.applicationStatus === "new" ||
            appData.applicationStatus === "pending"
          ) {
            newApplications++;
          }

          // Count hired students (status = 'accepted' or 'hired')
          if (
            appData.applicationStatus === "accepted" ||
            appData.applicationStatus === "hired"
          ) {
            hiredStudents++;
          }
        });
      }

      return {
        totalPostings,
        activePostings,
        newApplications,
        hiredStudents,
      };
    } catch (error) {
      console.error("Error getting company stats:", error);
      throw error;
    }
  }

  /**
   * Get recent applications for a company
   * @param {string} companyId - The company ID
   * @param {number} limitCount - Maximum number of applications to return (default: 10)
   * @returns {Promise<Array>} Array of application objects
   */
  async getRecentApplications(companyId, limitCount = 10) {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    try {
      const applications = [];

      // Get all internships for this company
      const internshipsSnapshot = await getDocs(
        collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies",
          companyId,
          "IT"
        )
      );

      // Collect applications from all internships
      for (const internshipDoc of internshipsSnapshot.docs) {
        const internshipData = internshipDoc.data();

        // Get applications for this internship, ordered by application date
        const applicationsQuery = query(
          collection(
            this._firebaseFirestore,
            this.usersCollection,
            "companies",
            "companies",
            companyId,
            "IT",
            internshipDoc.id,
            "applications"
          ),
          orderBy("applicationDate", "desc"),
          limit(limitCount)
        );

        const applicationsSnapshot = await getDocs(applicationsQuery);

        for (const appDoc of applicationsSnapshot.docs) {
          const appData = appDoc.data();

          // Get student data
          ////console.log("set to Unknown Student");
          let studentName = "Unknown Student";
          let studentEmail = "";
          ////console.log("app student " + JSON.stringify(appData.student));
          ////console.log(
          //   "app student " + JSON.stringify(appData.student.fullName)
          // );
          if (appData.student && appData.student.fullName) {
            ////console.log("app student " + JSON.stringify(appData.student));
            studentName = appData.student.fullName;
            studentEmail = appData.student.email || "";
          } else if (appData.uid) {
            // If student data is not embedded, fetch it
            try {
              const student = await this.getStudentById(appData.uid);
              if (student) {
                ////console.log("app student else " + JSON.stringify(student));
                studentName = student.fullName;
                studentEmail = student.email;
              }
            } catch (error) {
              console.warn(
                `Could not fetch student data for ${appData.uid}:`,
                error
              );
            }
          }

          applications.push({
            id: appDoc.id,
            studentName: studentName,
            studentEmail: studentEmail,
            position: internshipData.title || "Unknown Position",
            appliedAt:
              appData.applicationDate || appData.appliedAt || new Date(),
            status: appData.applicationStatus || "pending",
            internshipId: internshipDoc.id,
            studentId: appData.uid || appData.studentId,
          });
        }
      }

      // Sort all applications by date (newest first) and limit results
      return applications
        .sort((a, b) => {
          const dateA = a.appliedAt?.toDate
            ? a.appliedAt.toDate()
            : new Date(a.appliedAt);
          const dateB = b.appliedAt?.toDate
            ? b.appliedAt.toDate()
            : new Date(b.appliedAt);
          return dateB - dateA;
        })
        .slice(0, limitCount);
    } catch (error) {
      console.error("Error getting recent applications:", error);
      throw error;
    }
  }

  /**
   * Get active postings for a company
   * @param {string} companyId - The company ID
   * @returns {Promise<Array>} Array of active posting objects
   */
  async getActivePostings(companyId) {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    try {
      const activePostings = [];

      // Get all internships for this company
      const internshipsSnapshot = await getDocs(
        collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies",
          companyId,
          "IT"
        )
      );

      for (const internshipDoc of internshipsSnapshot.docs) {
        const internshipData = internshipDoc.data();

        // Determine if posting is active (adjust logic based on your data structure)
        const isActive = this.isPostingActive(internshipData);

        if (isActive) {
          // Count applications for this posting
          const applicationsSnapshot = await getDocs(
            collection(
              this._firebaseFirestore,
              this.usersCollection,
              "companies",
              "companies",
              companyId,
              "IT",
              internshipDoc.id,
              "applications"
            )
          );

          const applicantCount = applicationsSnapshot.size;

          activePostings.push({
            id: internshipDoc.id,
            title: internshipData.title || "Untitled Posting",
            description: internshipData.description || "",
            location: internshipData.location || "",
            type: internshipData.type || "internship",
            deadline: internshipData.deadline || null,
            applicantCount: applicantCount,
            createdAt:
              internshipData.postedAt || internshipData.createdAt || new Date(),
            // Add other relevant fields
          });
        }
      }

      // Sort by creation date (newest first)
      return activePostings.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } catch (error) {
      console.error("Error getting active postings:", error);
      throw error;
    }
  }

  /**
   * Helper method to determine if a posting is active
   * @param {Object} postingData - The posting data
   * @returns {boolean} True if the posting is active
   */
  isPostingActive(postingData) {
    // Check if posting has explicit status
    if (
      postingData.status === "active" ||
      postingData.status.toLowerCase() === "open"
    )
      return true;
    if (postingData.status === "inactive") return false;

    // Check if posting has isActive flag
    if (postingData.isActive === true) return true;
    if (postingData.isActive === false) return false;

    // Check deadline (if posting has passed deadline, it's inactive)
    if (postingData.deadline) {
      const deadline = postingData.deadline.toDate
        ? postingData.deadline.toDate()
        : new Date(postingData.deadline);
      return deadline > new Date();
    }

    // Default to active if no specific indicators
    return true;
  }

  /**
   * Update company profile
   * @param {string} companyId - The company ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateCompanyProfile(companyId, updates) {
    if (!companyId) {
      throw new Error("Company ID is required");
    }

    try {
      const companyRef = doc(
        this._firebaseFirestore,
        this.usersCollection,
        "companies",
        "companies",
        companyId
      );

      // Prepare update data
      const updateData = { ...updates };
      updateData.updatedAt = serverTimestamp();

      await updateDoc(companyRef, updateData);

      ////console.log("Company profile updated successfully");
    } catch (error) {
      console.error("Error updating company profile:", error);
      throw error;
    }
  }

  /**
   * Upload company logo
   * @param {string} companyId - The company ID
   * @param {File} imageFile - Logo image file
   * @returns {Promise<string>} Download URL of the uploaded logo
   */
  async uploadCompanyLogo(companyId, imageFile) {
    if (!companyId || !imageFile) {
      throw new Error("Company ID and image file are required");
    }

    try {
      const downloadURL = await this.cloudStorage.uploadFile(
        imageFile,
        companyId,
        "company-logos"
      );

      if (!downloadURL) {
        throw new Error("Failed to upload logo");
      }

      // Update company profile with new logo URL
      await this.updateCompanyProfile(companyId, { logoURL: downloadURL });

      return downloadURL;
    } catch (error) {
      console.error("Error uploading company logo:", error);
      throw error;
    }
  }

  async getCompanyAnalytics(companyId) {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    try {
        // Get all company applications
        const allApplications = await it_base_company_cloud.getAllCompanyApplications(companyId);
        
        // Get current year for filtering
        const currentYear = new Date().getFullYear();
        
        // Calculate basic metrics
        const totalApplications = allApplications.length;
        
        // Count applications by status
        const acceptedApplications = allApplications.filter(app => 
            app.application.applicationStatus === 'accepted' || 
            app.application.status === 'accepted'
        );
        
        const rejectedApplications = allApplications.filter(app => 
            app.application.applicationStatus === 'rejected' || 
            app.application.status === 'rejected'
        );
        
        const pendingApplications = allApplications.filter(app => 
            app.application.applicationStatus === 'pending' || 
            app.application.status === 'pending'
        );
        
        // Calculate acceptance rate
        const processedApplications = acceptedApplications.length + rejectedApplications.length;
        const acceptanceRate = processedApplications > 0 
            ? Math.round((acceptedApplications.length / processedApplications) * 100 * 10) / 10 
            : 0;
        
        // Calculate applications by role (using opportunity titles)
        const applicationsByRole = this.calculateApplicationsByRole(allApplications);
        
        // Calculate students per year (average based on historical data)
        const studentsPerYear = this.calculateStudentsPerYear(allApplications);
        
        // Get current opportunities (distinct opportunity titles)
        const currentOpportunities = this.getCurrentOpportunities(allApplications);
        
        // Check if company is currently accepting applications (has pending or recent applications)
        const isAcceptingApplications = this.isCompanyAcceptingApplications(allApplications);
        
        return {
            studentsPerYear,
            currentOpportunities: currentOpportunities.length,
            totalApplications,
            applicationsByRole,
            acceptanceRate,
            isAcceptingApplications,
            
            // Additional detailed metrics
            applicationStatus: {
                accepted: acceptedApplications.length,
                rejected: rejectedApplications.length,
                pending: pendingApplications.length
            },
            
            // Current year statistics
            currentYearStats: this.getCurrentYearStats(allApplications, currentYear),
            
            // Popular roles (top 3)
            popularRoles: applicationsByRole.slice(0, 3).map(role => role.roleName),
            
            // Processing time (if available in your data)
            averageProcessingTime: this.calculateAverageProcessingTime(allApplications)
        };
        
    } catch (error) {
        console.error("Error getting company analytics:", error);
        
        // Return default structure with zeros if there's an error
        return this.getDefaultAnalytics();
    }
}

// Helper methods
calculateApplicationsByRole(allApplications) {
    const roleMap = new Map();
    
    allApplications.forEach(({ opportunity, application }) => {
        const roleName = opportunity || 'Unknown Role';
        roleMap.set(roleName, (roleMap.get(roleName) || 0) + 1);
    });
    
    return Array.from(roleMap.entries())
        .map(([roleName, count]) => ({
            roleName,
            count
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending
}

calculateStudentsPerYear(allApplications) {
    if (allApplications.length === 0) return 0;
    
    // Group applications by year based on creation date
    const applicationsByYear = new Map();
    
    allApplications.forEach(({ application }) => {
        let applicationDate;
        
        // Try different possible date fields
        if (application.createdAt) {
            applicationDate = application.createdAt.toDate ? application.createdAt.toDate() : application.createdAt;
        } else if (application.submittedAt) {
            applicationDate = application.submittedAt.toDate ? application.submittedAt.toDate() : application.submittedAt;
        } else if (application.timestamp) {
            applicationDate = application.timestamp.toDate ? application.timestamp.toDate() : application.timestamp;
        } else {
            // Fallback to current date if no date found
            applicationDate = new Date();
        }
        
        const year = applicationDate.getFullYear();
        applicationsByYear.set(year, (applicationsByYear.get(year) || 0) + 1);
    });
    
    // Calculate average per year
    const years = Array.from(applicationsByYear.keys());
    if (years.length === 0) return 0;
    
    const totalApplications = Array.from(applicationsByYear.values())
        .reduce((sum, count) => sum + count, 0);
    
    return Math.round(totalApplications / years.length);
}

getCurrentOpportunities(allApplications) {
    // Get unique opportunity titles from applications
    const opportunities = new Set();
    
    allApplications.forEach(({ opportunity }) => {
        if (opportunity && opportunity !== 'Unknown Role') {
            opportunities.add(opportunity);
        }
    });
    
    return Array.from(opportunities);
}

isCompanyAcceptingApplications(allApplications) {
    if (allApplications.length === 0) return false;
    
    // Check if there are pending applications (indicates company is still accepting)
    const hasPendingApplications = allApplications.some(app => 
        app.application.applicationStatus === 'pending' || 
        app.application.status === 'pending'
    );
    
    // Check if there are recent applications (within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const hasRecentApplications = allApplications.some(({ application }) => {
        let applicationDate;
        
        if (application.createdAt) {
            applicationDate = application.createdAt.toDate ? application.createdAt.toDate() : application.createdAt;
        } else if (application.submittedAt) {
            applicationDate = application.submittedAt.toDate ? application.submittedAt.toDate() : application.submittedAt;
        } else {
            return false;
        }
        
        return applicationDate >= thirtyDaysAgo;
    });
    
    return hasPendingApplications || hasRecentApplications;
}

getCurrentYearStats(allApplications, currentYear) {
    const currentYearApplications = allApplications.filter(({ application }) => {
        let applicationDate;
        
        if (application.createdAt) {
            applicationDate = application.createdAt.toDate ? application.createdAt.toDate() : application.createdAt;
        } else if (application.submittedAt) {
            applicationDate = application.submittedAt.toDate ? application.submittedAt.toDate() : application.submittedAt;
        } else {
            return false;
        }
        
        return applicationDate.getFullYear() === currentYear;
    });
    
    const accepted = currentYearApplications.filter(({ application }) => 
        application.applicationStatus === 'accepted' || 
        application.status === 'accepted'
    ).length;
    
    const rejected = currentYearApplications.filter(({ application }) => 
        application.applicationStatus === 'rejected' || 
        application.status === 'rejected'
    ).length;
    
    const pending = currentYearApplications.filter(({ application }) => 
        application.applicationStatus === 'pending' || 
        application.status === 'pending'
    ).length;
    
    return {
        applications: currentYearApplications.length,
        accepted,
        rejected,
        pending
    };
}

calculateAverageProcessingTime(allApplications) {
    const processedApplications = allApplications.filter(({ application }) => {
        const isProcessed = (application.applicationStatus === 'accepted' || 
                           application.applicationStatus === 'rejected' ||
                           application.status === 'accepted' || 
                           application.status === 'rejected');
        
        return isProcessed && application.submittedAt && application.processedAt;
    });
    
    if (processedApplications.length === 0) return 0;
    
    const totalProcessingTime = processedApplications.reduce((sum, { application }) => {
        const submitted = application.submittedAt.toDate ? 
                         application.submittedAt.toDate() : application.submittedAt;
        const processed = application.processedAt.toDate ? 
                         application.processedAt.toDate() : application.processedAt;
        
        if (submitted && processed) {
            const processingTime = (processed - submitted) / (1000 * 60 * 60 * 24); // Convert to days
            return sum + processingTime;
        }
        return sum;
    }, 0);
    
    return Math.round(totalProcessingTime / processedApplications.length);
}

getDefaultAnalytics() {
    return {
        studentsPerYear: 0,
        currentOpportunities: 0,
        totalApplications: 0,
        applicationsByRole: [],
        acceptanceRate: 0,
        isAcceptingApplications: false,
        applicationStatus: {
            accepted: 0,
            rejected: 0,
            pending: 0
        },
        currentYearStats: {
            applications: 0,
            accepted: 0,
            rejected: 0,
            pending: 0
        },
        popularRoles: [],
        averageProcessingTime: 0
    };
}


}
