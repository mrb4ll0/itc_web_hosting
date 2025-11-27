// itc_firebase_logic.js
import {
  getFirestore,
  collection,
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
} from "../config/firebaseInit.js";

import { Student } from "../model/Student.js";
import {Company } from "../model/Company.js";
import { IndustrialTraining } from "../model/internship_model.js";
import { Institution } from "../model/institution_model.js";
import { auth } from "../config/firebaseInit.js";


export class ITCFirebaseLogic {
  constructor() {
    
    this._auth = auth;
    this._firebaseFirestore = getFirestore();
    this._institutionRef = collection(this._firebaseFirestore, "institutions");
    this.usersCollection = "users";
    this.companiesSubcollection = "companies";
  }

  // ------------------- Institution ------------------------
  async getInstitutions() {
    const snapshot = await getDocs(this._institutionRef);
    return snapshot.docs.map((docSnap) =>
      Institution.fromMap(docSnap.data())
    );
  }

  // ---------------------- STUDENT ----------------------
  static async registerStudent(uid, studentData) {
    try
  {
    const ref = doc(
      getFirestore(),
      "users",
      "students",
      "students",
      uid
    );
     ////console.log("ref is "+ref);
    ////console.log("Student Data:", JSON.stringify(studentData, null, 2));
     await setDoc(ref, {
      ...studentData,
      createdAt: serverTimestamp(),
    });
    return true;
  }catch(error)
  {
    console.error(error.message);

  }
  return false;
  }

  async addStudent(student,user = null) {
    const currentUser = user || this._auth.currentUser;
     if (!currentUser) {
        throw new Error("User not logged in");
    }

      ////console.log("is currnet user null ?"+(!currentUser));
      ////console.log("uid is "+currentUser.uid);
      ////console.log("user map is "+student.toMap());
    const register = await ITCFirebaseLogic.registerStudent(currentUser.uid, {
      ...student.toMap(),
      role: "student",
    });
    if(register)
    {
           ////console.log("student registered");
    }
    else
      {
        ////console.log("student not registered");
          throw new Error("Failed to register student");
      }
     
  }

  async getStudent(uid) {
    ////console.log("about to get user with uid "+uid);
    const ref = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "students",
      "students",
      uid
    );
      if(!ref)
      {
        ////console.log("ref is null");
      }
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return Student.fromFirestore(snap.data());
    }
    return null;
  }

  studentStream(uid, callback) {
    const ref = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "students",
      "students",
      uid
    );
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) callback(Student.fromFirestore(snap.data()));
    });
  }

  // ---------------------- COMPANY ----------------------
  async addCompany(company) {
    const ref = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies",
      company.id
    );
    await setDoc(ref, {
      ...company.toMap(),
      id: company.id,
      role: "company",
    });
  }

  async getCompany(uid) {
    try {
      const ref = doc(
        this._firebaseFirestore,
        this.usersCollection,
        this.companiesSubcollection,
        this.companiesSubcollection,
        uid
      );
      const snap = await getDoc(ref);
      if (snap.exists()) {
        ////console.log("company exists"+JSON.stringify(snap.data(), null, 2));
        return Company.fromMap(snap.data());
      }
    } catch (e) {
      console.error("Error fetching company:", e);
    }
    return null;
  }

  async getUserById(uid) {
    const studentRef = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "students",
      "students",
      uid
    );
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      return Student.fromFirestore(studentSnap.data());
    }

    const companyRef = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies",
      uid
    );
    const companySnap = await getDoc(companyRef);
    if (companySnap.exists()) {
      return Company.fromMap(companySnap.data());
    }

    return null;
  }

  async getAllInternshipsStream(callback) {
    const companiesRef = collection(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies"
    );
    return onSnapshot(companiesRef, async (companySnapshot) => {
      let internships = [];
      for (const companyDoc of companySnapshot.docs) {
        const companyId = companyDoc.id;
        const itRef = collection(
          this._firebaseFirestore,
          this.usersCollection,
          "companies",
          "companies",
          companyId,
          "IT"
        );
        const q = query(itRef, orderBy("postedAt", "desc"));
        const internshipsSnapshot = await getDocs(q);
        internships.push(
          ...internshipsSnapshot.docs.map((docSnap) =>
            IndustrialTraining.fromMap(docSnap.data(), docSnap.id)
          )
        );
      }
      callback(internships);
    });
  }

  async getUserByEmail(email) {
    const roles = ["students", "companies"];

    for (const role of roles) {
      const roleRef = collection(
        this._firebaseFirestore,
        this.usersCollection,
        role,
        role
      );
      const q = query(roleRef, where("email", "==", email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return {
          uid: docSnap.id,
          role: role.slice(0, -1),
          ...docSnap.data(),
        };
      }
    }
    return null;
  }

  async updateStudentSchoolAndMatric({ school, matricNumber, department }) {
    const currentUser = this._auth.currentUser;
    if (!currentUser) throw new Error("No logged in user found");
    const uid = currentUser.uid;

    const ref = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "students",
      "students",
      uid
    );

    await setDoc(
      ref,
      {
        school,
        matricNumber,
        department,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    ////console.log(`✅ Student (${uid}) updated with school & matric number`);
  }

  async hasCompletedInstitutionInfo() {
    const currentUser = this._auth.currentUser;
    if (!currentUser) throw new Error("No logged in user found");
    const uid = currentUser.uid;

    const ref = doc(
      this._firebaseFirestore,
      this.usersCollection,
      "students",
      "students",
      uid
    );
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data();
    const school = data.school;
    const matricNumber = data.matricNumber;

    return (
      school && school.trim() !== "" && matricNumber && matricNumber.trim() !== ""
    );
  }

  // Add this method to your ITCFirebaseLogic class
async getCompanyByEmail(email) {
  try {
    ////console.log(`🔍 Searching for company with email: ${email}`);
    
    const companiesRef = collection(
      this._firebaseFirestore,
      this.usersCollection,
      "companies",
      "companies"
    );
    
    // Query companies collection where email matches
    const q = query(companiesRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const companyDoc = querySnapshot.docs[0];
      ////console.log(" Company found:", companyDoc.id);
      return Company.fromMap(companyDoc.data());
    } else {
      ////console.log(" No company found with email:", email);
      return null;
    }
  } catch (error) {
    console.error(" Error fetching company by email:", error);
    throw new Error(`Failed to fetch company: ${error.message}`);
  }
}
  
}
