// student_cloud_db.js
import {
  db,
  auth,
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  updateDoc,
  onSnapshot,
  getAuth,
  initializeApp,
  ref,
  getMetadata,
  storage,
  firebaseConfig,
} from "../config/firebaseInit.js";
import { CloudStorage } from "../fireabase/Cloud_Storage.js";

import { combineLatest, from } from "https://cdn.skypack.dev/rxjs@7.8.1";
import { map, switchMap } from "https://cdn.skypack.dev/rxjs/operators";

import { Company } from "../model/Company.js";
import { IndustrialTraining } from "../model/internship_model.js";
import { AppNotification } from "../model/ApplicationNotification.js";
import { Student } from "../model/Student.js";

export class StudentCloudDB {
  constructor() {
    this._firebaseApp = initializeApp(firebaseConfig);
    this._firebaseFirestore = getFirestore(this._firebaseApp);
    this._firebaseAuth = getAuth(this._firebaseApp);
  }

  getAllCompanies(callback) {
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

  // ✅ Combined stats stream using RxJS combineLatest
  statsStream(userId, callback) {
    const db = this._firebaseFirestore;

    // --- Applications Stream ---
    const apps$ = from(
      new Promise(async (resolve) => {
        const companiesSnap = await getDocs(
          collection(db, "users", "companies", "companies")
        );

        let allAppDocs = [];

        for (const companyDoc of companiesSnap.docs) {
          const internshipsSnap = await getDocs(
            collection(
              db,
              "users",
              "companies",
              "companies",
              companyDoc.data().id,
              "IT"
            )
          );

          for (const internshipDoc of internshipsSnap.docs) {
            const appsSnap = await getDocs(
              query(
                collection(
                  db,
                  "users",
                  "companies",
                  "companies",
                  companyDoc.data().id,
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
        resolve(allAppDocs);
      })
    );

    // --- Bookings Stream ---
    const bookings$ = from(
      new Promise(async (resolve) => {
        const landlordsSnap = await getDocs(
          collection(db, "users", "landlords", "landlords")
        );

        let allBookings = [];

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
            const data = accomDoc.data();
            const requests = data.bookingRequests || {};
            for (const [studentId, bookingData] of Object.entries(requests)) {
              if (studentId === userId && typeof bookingData === "object") {
                allBookings.push(bookingData);
              }
            }
          }
        }
        resolve(allBookings);
      })
    );

    // --- Sent Messages Stream ---
    const sentMessages$ = from(
      new Promise(async (resolve) => {
        const chatRoomsSnap = await getDocs(
          query(
            collection(db, "chat_rooms"),
            where("participants", "array-contains", userId)
          )
        );
        let totalSent = 0;

        for (const docSnap of chatRoomsSnap.docs) {
          const msgSnap = await getDocs(
            query(
              collection(db, "chat_rooms", docSnap.id, "messages"),
              where("sender_id", "==", userId)
            )
          );
          totalSent += msgSnap.size;
        }
        resolve(totalSent);
      })
    );

    // --- Unread Messages Stream ---
    const unreadMessages$ = from(
      new Promise(async (resolve) => {
        const chatRoomsSnap = await getDocs(
          query(
            collection(db, "chat_rooms"),
            where("participants", "array-contains", userId)
          )
        );
        let totalUnread = 0;

        for (const docSnap of chatRoomsSnap.docs) {
          const msgSnap = await getDocs(
            query(
              collection(db, "chat_rooms", docSnap.id, "messages"),
              where("receiver_id", "==", userId),
              where("is_read", "==", false)
            )
          );
          totalUnread += msgSnap.size;
        }
        resolve(totalUnread);
      })
    );

    // --- Saved Internships Stream ---
    const saved$ = from(
      new Promise(async (resolve) => {
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
        resolve(savedSnap.size);
      })
    );

    // --- Combine all streams ---
    combineLatest([apps$, bookings$, sentMessages$, unreadMessages$, saved$])
      .pipe(
        map(([apps, bookings, sentCount, unreadCount, savedCount]) => {
          let accepted = 0,
            rejected = 0,
            pending = 0;

          for (const docSnap of apps) {
            const status = docSnap.data().applicationStatus?.trim();
            if (status === "accepted") accepted++;
            else if (status === "rejected") rejected++;
            else pending++;
          }

          return {
            totalApplications: apps.length,
            accepted,
            rejected,
            pending,
            bookings: bookings.length,
            messages: sentCount,
            unreadMessages: unreadCount,
            saved: savedCount,
          };
        })
      )
      .subscribe(callback);
  }

  // ✅ Update student profile image
  async updateStudentProfileImage({ studentId, imageUrl }) {
    const ref = doc(
      this._firebaseFirestore,
      "users",
      "students",
      "students",
      studentId
    );
    await updateDoc(ref, { imageUrl });
  }

  // ✅ Update student portfolio fields
  async updateStudentPortfolio({ studentId, portfolioFields }) {
    const ref = doc(
      this._firebaseFirestore,
      "users",
      "students",
      "students",
      studentId
    );
    await updateDoc(ref, portfolioFields);
  }

  // ✅ Notification stream
  notificationStream(studentUid, callback) {
    const ref = collection(
      this._firebaseFirestore,
      "users",
      "students",
      "students",
      studentUid,
      "notifications"
    );

    const q = query(ref, orderBy("timestamp", "desc"));

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return new AppNotification({
          title: data.status || "No Title",
          body: data.message || "No Message",
          timestamp: data.timestamp?.toDate?.() || new Date(),
        });
      });
      callback(notifications);
    });
  }

  // ✅ Get saved internships
  async savedIT() {
    const user = this._firebaseAuth.currentUser;
    if (!user) return [];

    const snap = await getDocs(
      collection(
        this._firebaseFirestore,
        "users",
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
   * Check if a user is a student by their ID
   * @param {string} userId - The user ID to check
   * @returns {Promise<boolean>} - True if the user is a student, false otherwise
   */
  async isStudent(userId) {
    try {
      const studentRef = doc(
        this._firebaseFirestore,
        "users",
        "students",
        "students",
        userId
      );

      const studentDoc = await getDoc(studentRef);
      return studentDoc.exists();
    } catch (error) {
      console.error("Error checking if user is student:", error);
      return false;
    }
  }

  // Add this method to your StudentCloudDB class

  /**
   * Upload student ID file and update student profile
   * @param {string} studentId - The student UID
   * @param {File} file - The student ID file to upload
   * @returns {Promise<void>}
   */
  async uploadStudentID(studentId, file) {
    try {
      if (!studentId || !file) {
        throw new Error("Student ID and file are required");
      }

      // Upload file to Firebase Storage
      const cloudStorage = new CloudStorage();
      const downloadUrl = await cloudStorage.uploadFile(
        file,
        studentId,
        "student_documents"
      );

      if (!downloadUrl) {
        throw new Error("Failed to upload file to storage");
      }

      // Get current student data
      const studentRef = doc(
        this._firebaseFirestore,
        "users",
        "students",
        "students",
        studentId
      );

      const studentDoc = await getDoc(studentRef);

      if (!studentDoc.exists()) {
        throw new Error("Student not found");
      }

      // Create Student object from current data
      const currentStudent = Student.fromFirestore(studentDoc.data());

      // Update student with new ID card URL
      const updatedStudent = currentStudent.copyWith({
        studentIDCard: downloadUrl,
        updatedAt: new Date(),
      });

      // Update student in Firestore
      await this.updateStudent(updatedStudent);

      //console.log(`Student ID uploaded and profile updated for ${studentId}`);
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading student ID:", error);
      throw error;
    }
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

  async uploadStudentITLetter(studentId, file) {
    try {
      if (!studentId || !file) {
        throw new Error("Student ID and file are required");
      }

      // Upload file to Firebase Storage
      const cloudStorage = new CloudStorage();
      const downloadUrl = await cloudStorage.uploadFile(
        file,
        studentId,
        "student_documents"
      );

      if (!downloadUrl) {
        throw new Error("Failed to upload file to storage");
      }

      // Get current student data
      const studentRef = doc(
        this._firebaseFirestore,
        "users",
        "students",
        "students",
        studentId
      );

      const studentDoc = await getDoc(studentRef);

      if (!studentDoc.exists()) {
        throw new Error("Student not found");
      }

      // Create Student object from current data
      const currentStudent = Student.fromFirestore(studentDoc.data());

      // Add new IT letter to the array
      const updatedITLetters = [
        ...(currentStudent.studentITLetter || []),
        downloadUrl,
      ];

      // Update student with new IT letter
      const updatedStudent = currentStudent.copyWith({
        studentITLetter: updatedITLetters,
        updatedAt: new Date(),
      });

      // Update student in Firestore
      await this.updateStudent(updatedStudent);

      // console.log(
      //   `Student IT letter uploaded and profile updated for ${studentId}`
      // );
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading student IT letter:", error);
      throw error;
    }
  }

  /**
   * Get student by ID
   * @param {string} studentId - The student UID to retrieve
   * @returns {Promise<Student|null>} - Student object if found, null if not found
   */
  async getStudentById(studentId) {
    //console.log("getStudentById");
    try {
      if (!studentId) {
        throw new Error("Student ID is required");
      }

      const studentRef = doc(
        this._firebaseFirestore,
        "users",
        "students",
        "students",
        studentId
      );
      //console.log("studentId after studentRef " + studentId);
      const studentDoc = await getDoc(studentRef);

      if (!studentDoc.exists()) {
        //console.log(`Student with ID ${studentId} not found`);
        return null;
      }

      // Get the document data and include the document ID as uid
      const studentData = studentDoc.data();

      // Ensure the uid is set (in case it's not in the document data)
      if (!studentData.uid) {
        studentData.uid = studentId;
      }
      //console.log("studentData "+JSON.stringify(studentData) );
      // Convert to Student object using your existing fromMap method
      //console.log("before return Student.fromMap ", studentData);
      return Student.fromMap(studentData);
    } catch (error) {
      console.error("Error getting student by ID:", error);
      throw error;
    }
  }

  /**
   * Get student's existing files with detailed metadata
   * @param {string} userId - The user ID to look up
   * @returns {Promise<Object>} Object containing file URLs and metadata
   */
  async getStudentExistingFile(userId) {
    try {
      const studentDocRef = doc(db, "users", "students", "students", userId);
      const studentDoc = await getDoc(studentDocRef);

      if (!studentDoc.exists()) {
        return this.getEmptyFileResponse();
      }

      const studentData = studentDoc.data();
      const studentIdCardUrl = studentData.studentIDCard;
      const itLetterUrl = studentData.studentITLetter;
      //console.log("studentIdCardUrl:", studentIdCardUrl);
      //console.log("itLetterUrl:", itLetterUrl);

      // Get file metadata from storage if needed
      let studentIdCardMetadata = null;
      let itLetterMetadata = null;

      if (studentIdCardUrl) {
        studentIdCardMetadata = await this.getFileMetadata(studentIdCardUrl);
      }

      if (itLetterUrl) {
        itLetterMetadata = await this.getFileMetadata(itLetterUrl);
      }

      return {
        studentIdCard: studentIdCardUrl,
        itLetter: itLetterUrl,
        studentIdCardFileName:
          studentIdCardMetadata?.name ||
          this.extractFileNameFromUrl(studentIdCardUrl) ||
          "student_id_card.pdf",
        itLetterFileName:
          itLetterMetadata?.name ||
          this.extractFileNameFromUrl(itLetterUrl) ||
          "training_letter.pdf",
        studentIdCardUploadDate:
          studentIdCardMetadata?.timeCreated || studentData.updatedAt,
        itLetterUploadDate:
          itLetterMetadata?.timeCreated || studentData.updatedAt,
        studentIdCardSize: studentIdCardMetadata?.size,
        itLetterSize: itLetterMetadata?.size,
      };
    } catch (error) {
      console.error("Error getting student existing files:", error);
      return this.getEmptyFileResponse();
    }
  }

  /**
   * Get file metadata from Firebase Storage
   * @param {string} fileUrl - Firebase Storage URL
   * @returns {Promise<Object|null>} File metadata
   */
  async getFileMetadata(fileUrl) {
    try {
      // Extract the file path from the URL
      const matches = fileUrl.match(/o\/(.+?)\?alt=media/);
      if (!matches) return null;

      const filePath = decodeURIComponent(matches[1]);
      const storageRef = ref(storage, filePath);
      const metadata = await getMetadata(storageRef);

      return {
        name: metadata.name,
        size: metadata.size,
        timeCreated: metadata.timeCreated,
        contentType: metadata.contentType,
      };
    } catch (error) {
      console.error("Error getting file metadata:", error);
      return null;
    }
  }

  /**
   * Returns empty file response structure
   * @returns {Object} Empty file response
   */
  getEmptyFileResponse() {
    return {
      studentIdCard: null,
      itLetter: null,
      studentIdCardFileName: null,
      itLetterFileName: null,
      studentIdCardUploadDate: null,
      itLetterUploadDate: null,
      studentIdCardSize: null,
      itLetterSize: null,
    };
  }
}
