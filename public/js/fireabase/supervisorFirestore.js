import { Supervisor } from "../model/supervisorModel.js";
import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from "../config/firebaseInit.js";
import { StudentCloudDB } from "./StudentCloud.js";

const studentCloudDB = new StudentCloudDB();

class SupervisorFirestore {
  constructor() {
    this.auth = auth;
    this.db = db;
    this.currentUser = null;
  }

  async getCurrentUser() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe();
        this.currentUser = user;
        resolve(user);
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

  async generateCompanyCode() {
    if (!this.currentUser) throw new Error("User not authenticated");

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const code = this.generateUniqueCode(8);

        // Check if code already exists
        const companiesQuery = query(
          collection(this.db, "users", "companies", "companies"),
          where("compCode", "==", code)
        );
        const querySnapshot = await getDocs(companiesQuery);

        if (querySnapshot.empty) {
          // Code is unique, proceed with storage
          const companyDocRef = doc(
            this.db,
            "users",
            "companies",
            "companies",
            this.currentUser.uid
          );
          await setDoc(
            companyDocRef,
            {
              compCode: code,
              createdAt: new Date(),
              createdBy: this.currentUser.uid,
              companyEmail: this.currentUser.email,
            },
            { merge: true }
          );

          // Create the supervisors collection reference document
          const supervisorsDocRef = doc(
            this.db,
            "supervisors",
            `${this.currentUser.uid}_${code}`
          );
          await setDoc(supervisorsDocRef, {
            companyId: this.currentUser.uid,
            companyCode: code,
            createdAt: new Date(),
            supervisorCount: 0,
          });

          return code;
        }
        // If code exists, try again
        attempts++;
      } catch (error) {
        console.error("Error generating company code:", error);
        throw error;
      }
    }

    throw new Error("Failed to generate unique code after multiple attempts");
  }

  async getSupervisors() {
    if (!this.currentUser) return [];

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) return [];

      const supervisorsCollectionRef = collection(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors"
      );
      const querySnapshot = await getDocs(supervisorsCollectionRef);

      const supervisors = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        supervisors.push(Supervisor.fromFirestore(doc.id, data));
      });

      return supervisors;
    } catch (error) {
      console.error("Error getting supervisors:", error);
      throw error;
    }
  }

  async getSupervisorById(supervisorId) {
    if (!this.currentUser) throw new Error('User not authenticated');
    if (!supervisorId) throw new Error('Supervisor ID is required');

    try {
        const companyCode = await this.getCompanyCode();
        if (!companyCode) throw new Error('Company code not found');

        const supervisorDocRef = doc(
            this.db,
            'supervisors',
            `${this.currentUser.uid}_${companyCode}`,
            'supervisors',
            supervisorId
        );

        const supervisorDoc = await getDoc(supervisorDocRef);
        
        if (!supervisorDoc.exists()) {
            throw new Error('Supervisor not found');
        }

        const data = supervisorDoc.data();
        return Supervisor.fromFirestore(supervisorDoc.id, data);
        
    } catch (error) {
        console.error('Error getting supervisor by ID:', error);
        throw error;
    }
}

  async getActiveSupervisors() {
    if (!this.currentUser) return [];

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) return [];

      const supervisorsCollectionRef = collection(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors"
      );
      const querySnapshot = await getDocs(supervisorsCollectionRef);

      const supervisors = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const supervisor = Supervisor.fromFirestore(doc.id, data);

        // Filter criteria: allowed, not rejected, and active
        if (
          supervisor.allowed === true &&
          supervisor.rejected !== true &&
          supervisor.isActive !== false &&
          supervisor.status !== "rejected" &&
          supervisor.status !== "inactive" &&
          supervisor.removed !== true
        ) {
          supervisors.push(supervisor);
        }
      });

      return supervisors;
    } catch (error) {
      console.error("Error getting active supervisors:", error);
      throw error;
    }
  }

  async activateSupervisorAccount(supervisorId) {
    if (!this.currentUser) throw new Error("User not authenticated");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      // Update supervisor document to set allowed: true
      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        allowed: true,
        activatedAt: new Date(),
        activatedBy: this.currentUser.uid,
        status: "active",
        isActive: true, // Also update isActive to match Supervisor model
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error activating supervisor account:", error);
      throw error;
    }
  }

  async rejectSupervisorAccount(supervisorId, reason = "") {
    if (!this.currentUser) throw new Error("User not authenticated");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      // Update supervisor document to mark as rejected
      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        allowed: false,
        isActive: false, // Set isActive to false when rejected
        rejected: true,
        rejectedAt: new Date(),
        rejectedBy: this.currentUser.uid,
        rejectionReason: reason,
        status: "rejected",
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error rejecting supervisor account:", error);
      throw error;
    }
  }

  async assignStudentsRandomly() {
    if (!this.currentUser) throw new Error("User not authenticated");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      // Get all students for this company
      const students = await this.getAllCurrentTraineesUIDs();
      console.log("students is " + JSON.stringify(students));
      // Get all supervisors
      const supervisors = await this.getActiveSupervisors();
      if (supervisors.length === 0) throw new Error("No supervisors available");

      const batch = writeBatch(this.db);
      const supervisorsCollectionRef = collection(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors"
      );

      // Clear existing student assignments
      supervisors.forEach((supervisor) => {
        const supervisorDocRef = doc(supervisorsCollectionRef, supervisor.id);
        batch.update(supervisorDocRef, { students: [] });
      });

      // Randomly assign students to supervisors
      students.forEach((student, index) => {
        const supervisorIndex = index % supervisors.length;
        const supervisor = supervisors[supervisorIndex];
        const supervisorDocRef = doc(supervisorsCollectionRef, supervisor.id);

        batch.update(supervisorDocRef, {
          students: arrayUnion(student),
        });
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error assigning students randomly:", error);
      throw error;
    }
  }

  async getAllCurrentTraineesUIDs() {
    if (!this.currentUser) throw new Error("User not authenticated");

    try {
      // Get the current trainee UIDs from the specified path
      const currentTraineeCollectionRef = collection(
        this.db,
        "users",
        "companies",
        "companies",
        this.currentUser.uid,
        "currenttrainee"
      );

      const querySnapshot = await getDocs(currentTraineeCollectionRef);

      const traineeUIDs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.studentInfo.uid) {
          traineeUIDs.push(data.studentInfo.uid);
        }
      });

      return traineeUIDs;
    } catch (error) {
      console.error("Error getting current trainees UIDs:", error);
      throw error;
    }
  }
  async logout() {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }

  // Utility Methods
  generateUniqueCode(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async deactivateSupervisorAccount(supervisorId, reason = "") {
    if (!this.currentUser) throw new Error("User not authenticated");
    if (!supervisorId) throw new Error("Supervisor ID is required");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      // Update supervisor document to set isActive: false and allowed: false
      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        isActive: false,
        allowed: false, // Also update allowed status
        deactivatedAt: new Date(),
        deactivatedBy: this.currentUser.uid,
        deactivationReason: reason,
        status: "inactive",
        updatedAt: new Date(),
      });

      console.log(`Supervisor ${supervisorId} deactivated successfully`);
      return true;
    } catch (error) {
      console.error("Error deactivating supervisor account:", error);
      throw error;
    }
  }
  async reactivateSupervisorAccount(supervisorId) {
    if (!this.currentUser) throw new Error("User not authenticated");
    if (!supervisorId) throw new Error("Supervisor ID is required");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        isActive: true,
        allowed: true,
        reactivatedAt: new Date(),
        reactivatedBy: this.currentUser.uid,
        status: "active",
        updatedAt: new Date(),
      });

      console.log(`Supervisor ${supervisorId} reactivated successfully`);
      return true;
    } catch (error) {
      console.error("Error reactivating supervisor account:", error);
      throw error;
    }
  }

  async checkSupervisorHasStudents(supervisorId) {
    if (!this.currentUser) throw new Error("User not authenticated");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

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

      const supervisorData = supervisorDoc.data();
      const hasStudents =
        supervisorData.students && supervisorData.students.length > 0;

      return {
        hasStudents,
        studentCount: supervisorData.students?.length || 0,
        studentIds: supervisorData.students || [],
        supervisorName: supervisorData.displayName || "Supervisor",
      };
    } catch (error) {
      console.error("Error checking supervisor students:", error);
      throw error;
    }
  }

  async getAvailableSupervisors(excludeSupervisorId = null) {
    if (!this.currentUser) throw new Error("User not authenticated");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      const supervisors = await this.getSupervisors();

      // Filter out the excluded supervisor and only include active supervisors
      const availableSupervisors = supervisors.filter(
        (supervisor) =>
          supervisor.id !== excludeSupervisorId &&
          supervisor.allowed === true &&
          supervisor.isActive !== false
      );

      return availableSupervisors.map((supervisor) => ({
        id: supervisor.id,
        displayName: supervisor.displayName,
        email: supervisor.email,
        currentStudentCount: supervisor.students?.length || 0,
        capacity: supervisor.maxStudents || "Unlimited",
      }));
    } catch (error) {
      console.error("Error getting available supervisors:", error);
      throw error;
    }
  }

  async reassignStudentsAndDeactivate(
    sourceSupervisorId,
    targetSupervisorId,
    studentIds
  ) {
    if (!this.currentUser) throw new Error("User not authenticated");
    if (!sourceSupervisorId || !targetSupervisorId) {
      throw new Error("Source and target supervisor IDs are required");
    }

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      const batch = writeBatch(this.db);
      const supervisorsCollectionRef = collection(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors"
      );

      // Remove students from source supervisor
      const sourceSupervisorRef = doc(
        supervisorsCollectionRef,
        sourceSupervisorId
      );
      batch.update(sourceSupervisorRef, {
        students: arrayRemove(...studentIds),
        updatedAt: new Date(),
      });

      // Add students to target supervisor
      const targetSupervisorRef = doc(
        supervisorsCollectionRef,
        targetSupervisorId
      );
      batch.update(targetSupervisorRef, {
        students: arrayUnion(...studentIds),
        updatedAt: new Date(),
      });
      await batch.commit();

      await this.removeSupervisorAccount(sourceSupervisorId);

      console.log(
        `Successfully reassigned ${studentIds.length} students and deactivated supervisor ${sourceSupervisorId}`
      );
      return {
        success: true,
        reassignedStudents: studentIds.length,
        sourceSupervisorDeactivated: true,
      };
    } catch (error) {
      console.error("Error in reassign and deactivate:", error);
      throw error;
    }
  }

  async removeSupervisorAccount(supervisorId, reason = "") {
    if (!this.currentUser) throw new Error("User not authenticated");
    if (!supervisorId) throw new Error("Supervisor ID is required");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      // Update supervisor document to set removed: true and update related fields
      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        removed: true,
        removedAt: new Date(),
        removedBy: this.currentUser.uid,
        removalReason: reason,
        isActive: false,
        allowed: false,
        status: "removed",
        updatedAt: new Date(),
      });

      console.log(`Supervisor ${supervisorId} removed successfully`);
      return true;
    } catch (error) {
      console.error("Error removing supervisor account:", error);
      throw error;
    }
  }

  async restoreSupervisorAccount(supervisorId) {
    if (!this.currentUser) throw new Error("User not authenticated");
    if (!supervisorId) throw new Error("Supervisor ID is required");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      await updateDoc(supervisorDocRef, {
        removed: false,
        removedAt: null,
        removedBy: null,
        removalReason: "",
        isActive: true,
        allowed: true,
        status: "active",
        updatedAt: new Date(),
      });

      console.log(`Supervisor ${supervisorId} restored successfully`);
      return true;
    } catch (error) {
      console.error("Error restoring supervisor account:", error);
      throw error;
    }
  }

  async getAllCurrentTraineesWithData() {
    if (!this.currentUser) throw new Error("User not authenticated");

    try {
      const currentTraineeCollectionRef = collection(
        this.db,
        "users",
        "companies",
        "companies",
        this.currentUser.uid,
        "currenttrainee"
      );

      const querySnapshot = await getDocs(currentTraineeCollectionRef);

      const trainees = [];
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        //console.log("data is " + JSON.stringify(data));
        data.studentInfo = await studentCloudDB.getStudentById(data.studentInfo.uid);
         if(doc.id != data.studentInfo.selectedApplication)continue;
        trainees.push({
          uid: data.studentInfo?.uid || doc.id,
          id: doc.id,
          ...data,
        });
      }

      return trainees;
    } catch (error) {
      console.error("Error getting current trainees with data:", error);
      throw error;
    }
  }

async assignStudentsToSupervisor(supervisorId, studentIds) {
    if (!this.currentUser) throw new Error("User not authenticated");

    try {
      const companyCode = await this.getCompanyCode();
      if (!companyCode) throw new Error("Company code not found");

      const supervisorDocRef = doc(
        this.db,
        "supervisors",
        `${this.currentUser.uid}_${companyCode}`,
        "supervisors",
        supervisorId
      );

      // Use arrayUnion to add students (ensures uniqueness)
      await updateDoc(supervisorDocRef, {
        students: arrayUnion(...studentIds),
        updatedAt: new Date(),
        lastAssignment: new Date(),
      });

      return true;
    } catch (error) {
      console.error("Error assigning students to supervisor:", error);
      throw error;
    }
  }


}

export { SupervisorFirestore };
