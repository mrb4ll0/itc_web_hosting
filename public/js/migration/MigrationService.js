// services/CurrentStudentService.js
import { CurrentStudent } from "../model/CurrentStudent.js";
import {
  auth,
  db,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "../config/firebaseInit.js";

export class CurrentStudentService {
  constructor() {
    this.currentStudents = new Map();
    this.migrationLog = [];
    this.isMigrating = false;
    this.migrationQueue = [];
    this.migrationProgress = {
      total: 0,
      processed: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
    };
  }

  // Get current company ID
  getCurrentCompanyId() {
    return auth.currentUser?.uid;
  }

  // Get Firebase path for current trainee
  getCurrentTraineePath(studentId) {
    const companyId = this.getCurrentCompanyId();
    if (!companyId) {
      throw new Error("No authenticated company user found");
    }
    if (!studentId || studentId === "undefined") {
      throw new Error(`Invalid student ID: ${studentId}`);
    }
    return `users/companies/companies/${companyId}/currenttrainee/${studentId}`;
  }

  // Save current student to Firebase
  async saveCurrentStudentToFirebase(currentStudent) {
    try {
      const companyId = this.getCurrentCompanyId();
      if (!companyId) {
        throw new Error("No authenticated company user found");
      }

      // Validate student ID
      if (!currentStudent.id || currentStudent.id === "undefined") {
        throw new Error(`Invalid student ID: ${currentStudent.id}`);
      }

      const studentData = this.serializeCurrentStudent(currentStudent);
      console.log("studentData is " + JSON.stringify(studentData));
      const studentPath = this.getCurrentTraineePath(currentStudent.id);

      console.log(` Saving student to Firebase: ${studentPath}`);

      // Convert path to Firestore reference
      const docRef = doc(db, studentPath);
      await setDoc(docRef, studentData);

      console.log(
        ` Successfully saved ${currentStudent.studentInfo.fullName} to Firebase`
      );
      return true;
    } catch (error) {
      console.error(" Error saving student to Firebase:", error);
      throw error;
    }
  }

  // Add this method to debug application statuses
  async validateApplicationStatuses(applications) {
    console.log("🔍 Validating application statuses...");

    const statusCount = {};
    applications.forEach((app) => {
      const status = app.application.status;
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    console.log("📊 Application Status Breakdown:");
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count} applications`);
    });

    return statusCount;
  }

  // Load current students from Firebase
  async loadCurrentStudentsFromFirebase() {
    try {
      const companyId = this.getCurrentCompanyId();
      if (!companyId) {
        throw new Error("No authenticated company user found");
      }

      console.log(
        `📥 Loading current students from Firebase for company: ${companyId}`
      );

      const currentStudentsPath = `users/companies/companies/${companyId}/currenttrainee`;
      const collectionRef = collection(db, currentStudentsPath);

      const querySnapshot = await getDocs(collectionRef);
      const loadedStudents = [];

      querySnapshot.forEach((docSnapshot) => {
        try {
          const studentData = docSnapshot.data();
          // Reconstruct CurrentStudent object from Firebase data
          const currentStudent = this.deserializeCurrentStudent(studentData);
          this.currentStudents.set(currentStudent.id, currentStudent);
          console.log(
            "current students after setting " +
              JSON.stringify(this.currentStudents.size)
          );
          console.log(
            "current students after setting id " +
              JSON.stringify(currentStudent.id)
          );
          loadedStudents.push(currentStudent);

          console.log(
            `✅ Loaded student: ${currentStudent.studentInfo.fullName}`
          );
        } catch (error) {
          console.error(
            ` Error loading student from doc ${docSnapshot.id}:`,
            error
          );
        }
      });

      console.log(
        `📋 Loaded ${loadedStudents.length} current students from Firebase`
      );
      return loadedStudents;
    } catch (error) {
      console.error("❌ Error loading current students from Firebase:", error);
      return [];
    }
  }
  serializeCurrentStudent(currentStudent) {
    // Create a completely clean object with NO undefined values
    const cleanData = {
      // Basic info - with fallbacks
      id: this.ensureString(currentStudent.id),
      studentUid: this.ensureString(currentStudent.studentUid),
      studentInfo: this.createCleanStudentInfo(currentStudent.studentInfo),

      // Training info
      trainingInfo: this.createCleanTrainingInfo(currentStudent.trainingInfo),

      // Duration
      duration: this.createCleanDuration(currentStudent.duration),

      // Progress tracking
      progress: this.createCleanProgress(currentStudent.progress),

      // Attendance
      attendance: this.createCleanAttendance(currentStudent.attendance),

      // Bench system
      benchInfo: this.createCleanBenchInfo(currentStudent.benchInfo),

      // Performance
      performance: this.createCleanPerformance(currentStudent.performance),

      // Migration metadata - explicitly define all fields
      migration: this.createCleanMigration(
        currentStudent.migration,
        currentStudent.id
      ),

      // General metadata
      metadata: this.createCleanMetadata(
        currentStudent.metadata,
        currentStudent.id
      ),

      // Timestamps
      updatedAt: new Date().toISOString(),
      createdAt:
        this.ensureString(currentStudent.metadata?.createdAt) ||
        new Date().toISOString(),
    };

    // Final validation - throw error if any undefined remains
    this.validateNoUndefined(cleanData, "serialized student data");

    return cleanData;
  }

  ensureString(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "object" && value !== null) {
      // Handle Firestore Timestamp objects
      if (value.seconds && value.nanoseconds) {
        return new Date(value.seconds * 1000).toISOString();
      }
      // Don't convert regular objects to strings
      return value;
    }
    return String(value);
  }

  ensureNumber(value) {
    if (value === undefined || value === null) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  ensureArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => this.cleanValue(item));
  }

  // FIXED: Better object detection
  ensureObject(value) {
    if (typeof value !== "object" || value === null) return {};
    // Don't convert Date objects or valid objects with data
    if (value instanceof Date) return value;
    if (Object.keys(value).length === 0) return {};
    return this.cleanObject(value);
  }

  // FIXED: Better value cleaning
  cleanValue(value) {
    if (value === undefined || value === null) return "";
    if (Array.isArray(value)) return this.ensureArray(value);
    if (typeof value === "object") {
      // Check if it's a Firestore Timestamp
      if (value.seconds !== undefined && value.nanoseconds !== undefined) {
        return new Date(value.seconds * 1000).toISOString();
      }
      // Check if it's a valid object with data
      if (Object.keys(value).length > 0) {
        return this.ensureObject(value);
      }
      return {};
    }
    if (typeof value === "number") return this.ensureNumber(value);
    if (typeof value === "boolean") return value;
    return this.ensureString(value);
  }

  cleanObject(obj) {
    if (obj === null || obj === undefined) return {};

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip cleaning for known date fields
      if (this.isDateField(key)) {
        cleaned[key] = this.ensureString(value);
      } else {
        cleaned[key] = this.cleanValue(value);
      }
    }
    return cleaned;
  }

  // FIXED: Identify date fields to preserve them
  isDateField(key) {
    const dateFields = [
      "startDate",
      "endDate",
      "originalStartDate",
      "applicationDate",
      "createdAt",
      "updatedAt",
      "lastUpdated",
      "completedDate",
      "migratedAt",
      "dateOfBirth",
    ];
    return dateFields.includes(key);
  }

  createCleanStudentInfo(studentInfo) {
    const base = this.ensureObject(studentInfo);
    return {
      fullName: this.ensureString(base.fullName),
      email: this.ensureString(base.email),
      phone: this.ensureString(base.phone),
      institution: this.ensureString(base.institution),
      courseOfStudy: this.ensureString(base.courseOfStudy),
      department: this.ensureString(base.department),
      applicationDate: this.ensureString(base.applicationDate), // FIXED: Keep as string
      ...base,
    };
  }
  createCleanTrainingInfo(trainingInfo) {
    const base = this.ensureObject(trainingInfo);
    return {
      opportunityId: this.ensureString(base.opportunityId),
      trainingId: this.ensureString(base.trainingId),
      title: this.ensureString(base.title),
      department: this.ensureString(base.department),
      companyId: this.ensureString(base.companyId),
      companyName: this.ensureString(base.companyName),
      supervisor: this.ensureString(base.supervisor),
      ...base,
    };
  }

  createCleanDuration(duration) {
    const base = this.ensureObject(duration);
    return {
      startDate: this.ensureString(base.startDate), // FIXED: Keep as string
      endDate: this.ensureString(base.endDate), // FIXED: Keep as string
      originalStartDate: this.ensureString(base.originalStartDate), // FIXED: Keep as string
      extended: Boolean(base.extended),
      ...base,
    };
  }

  createCleanProgress(progress) {
    const base = this.ensureObject(progress);
    return {
      overall: this.ensureNumber(base.overall),
      lastUpdated: this.ensureString(base.lastUpdated), // FIXED: Keep as string
      milestones: this.ensureArray(base.milestones),
      notes: this.ensureArray(base.notes),
      history: this.ensureArray(base.history),
      ...base,
    };
  }

  createCleanAttendance(attendance) {
    const base = this.ensureObject(attendance);
    return {
      totalDays: this.ensureNumber(base.totalDays),
      presentDays: this.ensureNumber(base.presentDays),
      absentDays: this.ensureNumber(base.absentDays),
      attendanceRate: this.ensureNumber(base.attendanceRate),
      records: this.ensureArray(base.records),
      ...base,
    };
  }

  createCleanBenchInfo(benchInfo) {
    const base = this.ensureObject(benchInfo);
    return {
      currentBench: this.ensureString(base.currentBench),
      nextBench: this.ensureString(base.nextBench),
      benchHistory: this.ensureArray(base.benchHistory),
      skills: this.ensureArray(base.skills),
      ...base,
    };
  }

  createCleanPerformance(performance) {
    const base = this.ensureObject(performance);
    return {
      rating: this.ensureNumber(base.rating),
      tasksCompleted: this.ensureNumber(base.tasksCompleted),
      totalTasks: this.ensureNumber(base.totalTasks),
      supervisorFeedback: this.ensureArray(base.supervisorFeedback),
      achievements: this.ensureArray(base.achievements),
      ...base,
    };
  }

  createCleanMigration(migration, studentId) {
    const base = this.ensureObject(migration);
    return {
      originalApplicationId: this.ensureString(
        base.originalApplicationId || studentId
      ),
      migratedAt: this.ensureString(
        base.migratedAt || new Date().toISOString() // FIXED: Keep as string
      ),
      source: this.ensureString(base.source || "StudentApplication"),
      version: this.ensureString(base.version || "1.0"),
      ...base,
    };
  }

  createCleanMetadata(metadata, studentId) {
    const base = this.ensureObject(metadata);
    return {
      createdAt: this.ensureString(base.createdAt || new Date().toISOString()), // FIXED: Keep as string
      updatedAt: this.ensureString(base.updatedAt || new Date().toISOString()), // FIXED: Keep as string
      status: this.ensureString(base.status || "active"),
      migratedFrom: this.ensureString(base.migratedFrom || studentId),
      version: this.ensureString(base.version || "1.0"),
      ...base,
    };
  }
  // Final validation to ensure no undefined values
  validateNoUndefined(obj, context = "object") {
    const checkForUndefined = (value, path = "") => {
      if (value === undefined) {
        throw new Error(`Found undefined value at ${path} in ${context}`);
      }

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          checkForUndefined(item, `${path}[${index}]`);
        });
      } else if (typeof value === "object" && value !== null) {
        for (const [key, val] of Object.entries(value)) {
          checkForUndefined(val, path ? `${path}.${key}` : key);
        }
      }
    };

    checkForUndefined(obj);
  }

  // Deserialize data back to CurrentStudent object
  deserializeCurrentStudent(studentData) {
    // Create a plain object with the data
    const currentStudentData = {
      application: {
        id: studentData.id || "",
        student: studentData.studentInfo || {},
        duration: studentData.duration || {},
        status: "in_training",
      },
      opportunityId: studentData.trainingInfo?.opportunityId || "",
      training: {
        id: studentData.trainingInfo?.trainingId || "",
        title: studentData.trainingInfo?.title || "",
        department: studentData.trainingInfo?.department || "",
        company: {
          id: studentData.trainingInfo?.companyId || "",
          name: studentData.trainingInfo?.companyName || "",
        },
        supervisor: studentData.trainingInfo?.supervisor || "",
      },
    };

    // Create new CurrentStudent instance
    const currentStudent = new CurrentStudent(currentStudentData);

    // Restore additional data that's not in the constructor with defaults
    currentStudent.progress = studentData.progress || {
      overall: 0,
      milestones: [],
      notes: [],
    };
    currentStudent.attendance = studentData.attendance || {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      attendanceRate: 0,
      records: [],
    };
    currentStudent.benchInfo = studentData.benchInfo || {
      currentBench: "beginner",
      nextBench: "intermediate",
      benchHistory: [],
      skills: [],
    };
    currentStudent.performance = studentData.performance || {
      rating: 0,
      tasksCompleted: 0,
      totalTasks: 0,
      supervisorFeedback: [],
    };
    currentStudent.migration = studentData.migration || {
      originalApplicationId: studentData.id,
      migratedAt: new Date().toISOString(),
    };
    currentStudent.metadata = studentData.metadata || {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
    };

    return currentStudent;
  }
  // Update application status in Firebase
  async updateApplicationStatusInFirebase(applicationId, newStatus) {
    try {
      const companyId = this.getCurrentCompanyId();
      if (!companyId) {
        throw new Error("No authenticated company user found");
      }

      // Find the application in the applications collection and update its status
      const applicationsPath = `users/companies/companies/${companyId}/currenttrainee`;
      const applicationsRef = collection(db, applicationsPath);

      // Query to find the application by ID
      const q = query(applicationsRef, where("id", "==", applicationId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnapshot = querySnapshot.docs[0];
        await updateDoc(docSnapshot.ref, {
          status: newStatus,
          migratedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        console.log(
          `✅ Updated application ${applicationId} status to ${newStatus} in Firebase`
        );
        return true;
      } else {
        console.warn(`⚠️ Application ${applicationId} not found in Firebase`);
        return false;
      }
    } catch (error) {
      console.error("❌ Error updating application status in Firebase:", error);
      throw error;
    }
  }

  async getAllCurrentStudents() {
    // If we haven't loaded from Firebase yet, do it now
    if (this.currentStudents.size === 0) {
      await this.loadCurrentStudentsFromFirebase();
    }

    const students = Array.from(this.currentStudents.values());

    console.log(
      `📋 Retrieved ${students.length} current students from service:`
    );
    students.forEach((student) => {
      console.log(
        `   - ${student.studentInfo.fullName} (${student.benchInfo.currentBench}) - ${student.progress.overall}%`
      );
    });

    return students;
  }

  // Get current student by ID
  getCurrentStudent(applicationId) {
    var student = this.currentStudents.get(applicationId);
    return student;
  }

  // Get current students by company
  getCurrentStudentsByCompany(companyId) {
    const allStudents = this.getAllCurrentStudents();
    return allStudents.filter(
      (student) => student.trainingInfo.companyId === companyId
    );
  }

  async getPendingMigrations(applications) {
    console.log("🔍 Checking for pending migrations...");

    // FIXED: Use Promise.all with map for async filtering
    const eligibilityChecks = await Promise.all(
      applications.map(async (application) => ({
        application,
        isEligible: await this.isEligibleForMigration(application),
      }))
    );

    const pendingMigrations = eligibilityChecks
      .filter((check) => check.isEligible)
      .map((check) => check.application);

    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

    // Log detailed status of all applications for debugging
    console.log("📊 Application Status Summary:");
    applications.forEach((app, index) => {
      const eligibility = eligibilityChecks[index].isEligible;
      const status = app.application.status;
      console.log(
        `   ${index + 1}. ${
          app.application.student.fullName
        } - Status: "${status}" - Eligible: ${eligibility}`
      );
    });

    return {
      pending: pendingMigrations,
      count: pendingMigrations.length,
      details: pendingMigrations.map((app) => ({
        id: app.application.id,
        studentName: app.application.student.fullName,
        startDate: app.application.duration.startDate,
        training: app.training.title,
        status: app.application.status,
        duration: app.application.duration,
      })),
    };
  }
  async isEligibleForMigration(applicationData) {
    const startDate = new Date(applicationData.application.duration.startDate);
    const now = new Date();

    // Check and log each condition individually
    const isStartDateValid = startDate <= now;
    console.log(
      `Start Date Check: ${startDate.toISOString()} <= ${now.toISOString()} = ${isStartDateValid}`
    );

    const isStatusAccepted = applicationData.application.status === "accepted";
    console.log(
      `Status Check: "${applicationData.application.status}" === "accepted" = ${isStatusAccepted}`
    );

    const isAlreadyCurrentStudentCheck = await this.isAlreadyCurrentStudent(
      applicationData.application.id
    );
    const isNotCurrentStudent = !isAlreadyCurrentStudentCheck;
    console.log(
      `Not Current Student Check: !isAlreadyCurrentStudent(${applicationData.application.id}) = ${isNotCurrentStudent}`
    );

    // Combine all conditions
    const isEligible =
      isStartDateValid && isStatusAccepted && isNotCurrentStudent;
    console.log(
      `Final Eligibility Result for ${applicationData.application.student.fullName}: ${isEligible}`
    );

    return isEligible;
  }

  async isAlreadyCurrentStudent(applicationId) {
    // First check memory cache
    const inMemory = this.currentStudents.has(applicationId);

    if (inMemory) {
      console.log(`📝 Application ${applicationId} found in memory cache`);
      return true;
    }

    // If not in memory, check Firebase
    const inFirebase = await this.isApplicationInFirebase(applicationId);

    if (inFirebase) {
      console.log(`🔥 Application ${applicationId} found in Firebase`);
      // Optionally load it into memory for future checks
      await this.loadCurrentStudentsFromFirebase();
    }

    return inMemory || inFirebase;
  }
  async isApplicationInFirebase(applicationId) {
    try {
      const companyId = this.getCurrentCompanyId();
      if (!companyId) {
        throw new Error("No authenticated company user found");
      }

      if (!applicationId || applicationId === "undefined") {
        console.warn(`⚠️ Invalid application ID: ${applicationId}`);
        return false;
      }

      const currentStudentsPath = `users/companies/companies/${companyId}/currenttrainee`;
      const collectionRef = collection(db, currentStudentsPath);

      // Query to find if a student with this application ID already exists
      const q = query(collectionRef, where("id", "==", applicationId));
      const querySnapshot = await getDocs(q);

      const exists = !querySnapshot.empty;

      console.log(
        `🔍 Firebase Check - Application ${applicationId} exists: ${exists}`
      );

      if (exists) {
        console.log(
          `⚠️ Application ${applicationId} already exists in Firebase as current trainee`
        );
      }

      return exists;
    } catch (error) {
      console.error(
        `❌ Error checking application ${applicationId} in Firebase:`,
        error
      );
      return false;
    }
  }

  // Background migration process (UPDATED with Firebase saving)
  async startBackgroundMigration(applications, progressCallback = null) {
    if (this.isMigrating) {
      console.log("⏳ Migration already in progress");
      return { error: "Migration already in progress" };
    }

    this.isMigrating = true;

    // FIXED: await the async call
    const pendingMigrationsResult = await this.getPendingMigrations(
      applications
    );
    const pendingMigrations = pendingMigrationsResult.pending;

    // Initialize progress
    this.migrationProgress = {
      total: pendingMigrations.length,
      processed: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
    };

    console.log(
      `🚀 Starting background migration for ${pendingMigrations.length} students`
    );

    // Use setTimeout to make it non-blocking
    return new Promise((resolve) => {
      setTimeout(() => {
        this.processMigrationBatch(pendingMigrations, progressCallback).then(
          (result) => {
            this.isMigrating = false;
            resolve(result);
          }
        );
      }, 100);
    });
  }

  async processMigrationBatch(applications, progressCallback = null) {
    const results = {
      migrated: [],
      skipped: [],
      failed: [],
      summary: {
        total: applications.length,
        migrated: 0,
        skipped: 0,
        failed: 0,
      },
    };

    for (let i = 0; i < applications.length; i++) {
      const application = applications[i];

      try {
        // Update progress
        this.migrationProgress.processed = i + 1;

        // Call progress callback if provided
        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: applications.length,
            currentStudent: application.application.student.fullName,
            status: "processing",
          });
        }

        console.log(
          `🔄 Migrating ${i + 1}/${applications.length}: ${
            application.application.student.fullName
          }`
        );

        const currentStudent = await this.migrateToCurrentStudent(application);

        if (currentStudent) {
          results.migrated.push(currentStudent);
          this.migrationProgress.migrated++;
          results.summary.migrated++;
        } else {
          results.skipped.push(application.application.id);
          this.migrationProgress.skipped++;
          results.summary.skipped++;
        }
      } catch (error) {
        console.error(
          `❌ Failed to migrate ${application.application.id}:`,
          error
        );
        results.failed.push({
          applicationId: application.application.id,
          error: error.message,
        });
        this.migrationProgress.failed++;
        results.summary.failed++;
      }

      // Small delay to keep UI responsive
      await this.delay(50);
    }

    console.log("✅ Background migration completed:", results.summary);

    // Final progress callback
    if (progressCallback) {
      progressCallback({
        current: applications.length,
        total: applications.length,
        status: "completed",
        summary: results.summary,
      });
    }

    return results;
  }

  async migrateToCurrentStudent(applicationData) {
    // FIXED: Remove the ! operator that was inverting the logic
    const isEligible = await this.isEligibleForMigration(applicationData);
    if (!isEligible) {
      console.log(
        ` Application ${applicationData.application.id} is not eligible for migration`
      );
      return null;
    }

    try {
      const currentStudent = new CurrentStudent(applicationData);
      console.log("currentStudent " + JSON.stringify(currentStudent));

      // Save to Firebase first
      await this.saveCurrentStudentToFirebase(currentStudent);

      // Update application status in Firebase
      await this.updateApplicationStatusInFirebase(
        applicationData.application.id,
        "in_training"
      );

      // Then store in memory
      this.currentStudents.set(applicationData.application.id, currentStudent);

      // Log migration
      this.migrationLog.push({
        applicationId: applicationData.application.id,
        studentName: applicationData.application.student.fullName,
        migratedAt: new Date().toISOString(),
        trainingTitle: applicationData.training.title,
        savedToFirebase: true,
      });

      console.log(
        `Successfully migrated ${applicationData.application.student.fullName}`
      );
      return currentStudent;
    } catch (error) {
      console.error("Migration error:", error);
      return null;
    }
  }
  // Update student progress in Firebase
  async updateStudentProgressInFirebase(applicationId, progress, notes = "") {
    try {
      const student = this.getCurrentStudent(applicationId);
      if (student) {
        student.updateProgress(progress, notes);
        await this.saveCurrentStudentToFirebase(student);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating student progress in Firebase:", error);
      return false;
    }
  }

  // Utility function for delays
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get current migration progress
  getMigrationProgress() {
    return { ...this.migrationProgress };
  }

  // Check if migration is in progress
  isMigrationInProgress() {
    return this.isMigrating;
  }

  // Cancel ongoing migration
  cancelMigration() {
    if (this.isMigrating) {
      this.isMigrating = false;
      console.log("🛑 Migration cancelled by user");
      return true;
    }
    return false;
  }

  // Get migration statistics
  getMigrationStats() {
    return {
      totalCurrentStudents: this.currentStudents.size,
      totalMigrations: this.migrationLog.length,
      recentMigrations: this.migrationLog.slice(-5),
      lastMigration: this.migrationLog[this.migrationLog.length - 1],
    };
  }

  // Clear all data (for testing/reset)
  clearAllData() {
    console.log(`🧹 Clearing all current student data`);
    this.currentStudents.clear();
    this.migrationLog = [];
  }
}
