import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "../../../js/config/firebaseInit.js";
import { Supervisor } from "../../../js/model/supervisorModel.js";
import { StudentCloudDB } from "../../../js/fireabase/StudentCloud.js";
import { StudentApplication } from "../../../js/model/studentApplication.js";

const studentCloudDB = new StudentCloudDB();

class SupervisorManagementService {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.currentUser = null;
  }

  async getCurrentUser() {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe();
        this.currentUser = user;
        if (user) {
          resolve(user);
        } else {
          reject(new Error("No user authenticated"));
        }
      });
    });
  }

  async getCompanyCode() {
    if (!this.currentUser) return null;

    try {
      const companyDocRef = doc(
        this.db,
        "users",
        "companies",
        "companies",
        this.currentUser.uid
      );
      const companyDoc = await getDoc(companyDocRef);

      return companyDoc.exists() ? companyDoc.data().compCode : null;
    } catch (error) {
      console.error("Error getting company code:", error);
      throw error;
    }
  }

  async getSupervisorById(supervisorId) {
    if (!this.currentUser) {
      throw new Error("No user authenticated");
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      const supervisorDoc = await getDoc(supervisorDocRef);

      if (!supervisorDoc.exists()) {
        throw new Error("Supervisor not found");
      }

      const data = supervisorDoc.data();
      return Supervisor.fromFirestore(supervisorDoc.id, data);
    } catch (error) {
      console.error("Error getting supervisor by ID:", error);
      throw error;
    }
  }

  async getAssignedStudents(supervisorId) {
    if (!this.currentUser) {
      return [];
    }

    try {
      const supervisor = await this.getSupervisorById(supervisorId);

      if (
        !supervisor ||
        !supervisor.students ||
        supervisor.students.length === 0
      ) {
        return [];
      }

      const studentDetails = await this.getStudentDetails(supervisor.students);
      return studentDetails;
    } catch (error) {
      console.error("Error getting assigned students:", error);
    }
  }

  async getAvailableStudents() {
    if (!this.currentUser) {
      return [];
    }

    try {
      // Get all students from the company that are not assigned to any supervisor
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      // First, get all supervisors to find assigned students
      const supervisorsCollectionRef = collection(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors"
      );

      const supervisorsSnapshot = await getDocs(supervisorsCollectionRef);
      const allAssignedStudents = new Set();

      supervisorsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.students) {
          data.students.forEach((studentId) =>
            allAssignedStudents.add(studentId)
          );
        }
      });

      // Get all company students and filter out assigned ones
      const allStudents = await this.getAllCompanyStudents();
      const availableStudents = allStudents.filter(
        (student) => !allAssignedStudents.has(student.id)
      );

      return availableStudents;
    } catch (error) {
      console.error("Error getting available students:", error);
    }
  }

  async getAllCompanyStudents() {
    if (!this.currentUser) {
      return [];
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      // Get the current trainees collection for the company
      const currentTraineesRef = collection(
        this.db,
        "users",
        "companies",
        "companies",
        this.currentUser.uid,
        "currenttrainee"
      );

      const traineesSnapshot = await getDocs(currentTraineesRef);
      const students = [];

      // Process each trainee document
      for (const traineeDoc of traineesSnapshot.docs) {
        try {
          const traineeData = traineeDoc.data();

          // Get the student UID from either 'uid' or 'studentUid' field
          const studentUid = traineeData.uid || traineeData.studentUid;

          if (studentUid) {
            // Get the student details using studentCloudDB.getStudent equivalent
            const student = await studentCloudDB.getStudentById(studentUid);
            if (
              student &&
              student.selectedApplication &&
              student.selectedApplication === traineeDoc.id
            ) {
              students.push(student);
            } else {
              //console.log(
              //   `Skipping student ${studentUid}: selectedApplication condition not met`,
              //   {
              //     hasSelectedApplication: !!student?.selectedApplication,
              //     selectedApplication: student?.selectedApplication,
              //     traineeDocId: traineeDoc.id,
              //     matches: student?.selectedApplication === traineeDoc.id,
              //   }
              // );
            }
          }
        } catch (error) {
          console.error(`Error processing trainee ${traineeDoc.id}:`, error);
        }
      }

      return students;
    } catch (error) {
      console.error("Error getting all company students:", error);
      return [];
    }
  }

  // Method to get all applications for current trainees
  async getAllCompanyApplications() {
    if (!this.currentUser) {
      return [];
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      // Get the current trainees collection for the company
      const currentTraineesRef = collection(
        this.db,
        "users",
        "companies",
        "companies",
        this.currentUser.uid,
        "currenttrainee"
      );

      const traineesSnapshot = await getDocs(currentTraineesRef);
      const applications = [];

      // Process each trainee document to get their applications
      for (const traineeDoc of traineesSnapshot.docs) {
        try {
          const traineeData = traineeDoc.data();

          // Convert the trainee document to application format
          const application = StudentApplication.fromMap(traineeData);
          if (application) {
            applications.push(application);
          }
        } catch (error) {
          console.error(
            `Error processing trainee application ${traineeDoc.id}:`,
            error
          );
        }
      }

      return applications;
    } catch (error) {
      console.error("Error getting all company applications:", error);
      return [];
    }
  }

  // Alternative method if you have a separate applications collection
  async getAllApplicationsFromCollection() {
    if (!this.currentUser) {
      return [];
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      // If you have a separate applications collection
      const applicationsRef = collection(this.db, "applications");

      // Query applications for current company
      const applicationsQuery = query(
        applicationsRef,
        where("companyId", "==", this.currentUser.uid)
      );

      const applicationsSnapshot = await getDocs(applicationsQuery);
      const applications = [];

      applicationsSnapshot.forEach((doc) => {
        try {
          const applicationData = doc.data();
          const application = this.applicationFromMap({
            id: doc.id,
            ...applicationData,
          });
          if (application) {
            applications.push(application);
          }
        } catch (error) {
          console.error(`Error processing application ${doc.id}:`, error);
        }
      });

      return applications;
    } catch (error) {
      console.error("Error getting applications from collection:", error);
      return [];
    }
  }
  async getStudentDetails(studentIds) {
    if (!studentIds || studentIds.length === 0) {
      return [];
    }

    try {
      const students = [];

      for (const studentId of studentIds) {
        try {
          const student = await studentCloudDB.getStudentById(studentId);
          students.push(student);
        } catch (error) {
          console.error(`Error fetching student ${studentId}:`, error);
        }
      }

      return students;
    } catch (error) {
      console.error("Error getting student details:", error);
    }
  }

  async assignStudentToSupervisor(supervisorId, studentId) {
    if (!this.currentUser) {
      throw new Error("No user authenticated");
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        students: arrayUnion(studentId),
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error assigning student to supervisor:", error);
      throw error;
    }
  }

  async assignMultipleStudentsToSupervisor(supervisorId, studentIds) {
    if (!this.currentUser) {
      throw new Error("No user authenticated");
    }

     

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      const supervisorDoc = await getDoc(supervisorDocRef);
      if (!supervisorDoc.exists()) {
        throw new Error("Supervisor not found");
      }

      const currentStudents = supervisorDoc.data().students || [];
      const updatedStudents = [...new Set([...currentStudents, ...studentIds])];
      await updateDoc(supervisorDocRef, {
        students: updatedStudents,
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error assigning multiple students to supervisor:", error);
      throw error;
    }
  }

  async removeStudentFromSupervisor(supervisorId, studentId) {
    if (!this.currentUser) {
      throw new Error("No user authenticated");
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        students: arrayRemove(studentId),
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error removing student from supervisor:", error);
      throw error;
    }
  }

  async activateSupervisor(supervisorId) {
    if (!this.currentUser) {
      throw new Error("No user authenticated");
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        allowed: true,
        isActive: true,
        status: "active",
        activatedAt: new Date(),
        activatedBy: this.currentUser.uid,
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error activating supervisor:", error);
      throw error;
    }
  }

  async deactivateSupervisor(supervisorId) {
    if (!this.currentUser) {
      throw new Error("No user authenticated");
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) {
        throw new Error("Company code not found");
      }

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        allowed: false,
        isActive: false,
        status: "inactive",
        deactivatedAt: new Date(),
        deactivatedBy: this.currentUser.uid,
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error deactivating supervisor:", error);
      throw error;
    }
  }

  async getSupervisorStats(supervisorId) {
    if (!this.currentUser) {
      throw new Error("No user authenticated");
    }

    try {
      const supervisor = await this.getSupervisorById(supervisorId);
      const assignedStudents = await this.getAssignedStudents(supervisorId);

      return {
        totalStudents: supervisor.studentCount,
        activeApplications: supervisor.applicationCount,
        availableSlots: supervisor.availableStudentSlots,
        assignedStudentsCount: assignedStudents.length,
        supervisorStatus: supervisor.allowed ? "Active" : "Inactive",
        lastActivity: supervisor.lastLogin || "Never",
      };
    } catch (error) {
      console.error("Error getting supervisor stats:", error);
      throw error;
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      this.currentUser = null;
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }
}

export { SupervisorManagementService };
