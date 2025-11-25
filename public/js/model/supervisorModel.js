class Supervisor {
    constructor(id, displayName, email, students = [], applications = [], createdAt = null, lastLogin = null, allowed = false) {
        this.id = id;
        this.displayName = displayName;
        this.email = email;
        this.students = students; // Array of student UIDs
        this.applications = applications; // Array of application UIDs
        this.createdAt = createdAt || new Date();
        this.lastLogin = lastLogin;
        this.isActive = true;
        this.maxStudents = 10; // Default maximum students per supervisor
        this.maxApplications = 20; // Default maximum applications per supervisor
        this._allowed = allowed; // Use underscore to avoid naming conflict
        
        // New variables from Firestore activation/rejection methods
        this.activatedAt = null;
        this.activatedBy = null;
        this.rejected = false;
        this.rejectedAt = null;
        this.rejectedBy = null;
        this.rejectionReason = '';
        this.status = 'pending'; // 'pending', 'active', 'rejected'
        this.updatedAt = new Date();
    }

    // Getters
    get studentCount() {
        return this.students.length;
    }

    get allowed() {
        return this._allowed;
    }

    set allowed(value) {
        this._allowed = value;
    }

    get applicationCount() {
        return this.applications.length;
    }

    get isAtCapacity() {
        return this.studentCount >= this.maxStudents || this.applicationCount >= this.maxApplications;
    }

    get availableStudentSlots() {
        return Math.max(0, this.maxStudents - this.studentCount);
    }

    get availableApplicationSlots() {
        return Math.max(0, this.maxApplications - this.applicationCount);
    }

    // Methods
    addStudent(studentId) {
        if (this.isAtCapacity) {
            throw new Error('Supervisor has reached maximum student capacity');
        }
        
        if (!this.students.includes(studentId)) {
            this.students.push(studentId);
            return true;
        }
        return false;
    }

    removeStudent(studentId) {
        const index = this.students.indexOf(studentId);
        if (index > -1) {
            this.students.splice(index, 1);
            return true;
        }
        return false;
    }

    addApplication(applicationId) {
        if (this.applications.length >= this.maxApplications) {
            throw new Error('Supervisor has reached maximum application capacity');
        }
        
        if (!this.applications.includes(applicationId)) {
            this.applications.push(applicationId);
            return true;
        }
        return false;
    }

    removeApplication(applicationId) {
        const index = this.applications.indexOf(applicationId);
        if (index > -1) {
            this.applications.splice(index, 1);
            return true;
        }
        return false;
    }

    canAcceptStudent() {
        return this.studentCount < this.maxStudents;
    }

    canAcceptApplication() {
        return this.applicationCount < this.maxApplications;
    }

    updateLastLogin() {
        this.lastLogin = new Date();
        this.updatedAt = new Date();
    }

    // Activation methods
    activate(activatedBy) {
        this.allowed = true;
        this.isActive = true;
        this.status = 'active';
        this.activatedAt = new Date();
        this.activatedBy = activatedBy;
        this.rejected = false;
        this.rejectedAt = null;
        this.rejectedBy = null;
        this.rejectionReason = '';
        this.updatedAt = new Date();
    }

    // Rejection methods
    reject(rejectedBy, reason = '') {
        this.allowed = false;
        this.isActive = false;
        this.status = 'rejected';
        this.rejected = true;
        this.rejectedAt = new Date();
        this.rejectedBy = rejectedBy;
        this.rejectionReason = reason;
        this.updatedAt = new Date();
    }

    // Check if supervisor is pending activation
    get isPending() {
        return !this.allowed && !this.rejected;
    }

    // Check if supervisor is active
    get isActiveStatus() {
        return this.allowed && this.status === 'active';
    }

    // Check if supervisor is rejected
    get isRejected() {
        return this.rejected && this.status === 'rejected';
    }

    // Serialization methods for Firestore
    toFirestore() {
        return {
            displayName: this.displayName,
            email: this.email,
            students: this.students,
            applications: this.applications,
            createdAt: this.createdAt,
            lastLogin: this.lastLogin,
            isActive: this.isActive,
            maxStudents: this.maxStudents,
            maxApplications: this.maxApplications,
            allowed: this.allowed,
            // New fields
            activatedAt: this.activatedAt,
            activatedBy: this.activatedBy,
            rejected: this.rejected,
            rejectedAt: this.rejectedAt,
            rejectedBy: this.rejectedBy,
            rejectionReason: this.rejectionReason,
            status: this.status,
            updatedAt: this.updatedAt
        };
    }

    static fromFirestore(id, data) {
        const supervisor = new Supervisor(
            id,
            data.displayName,
            data.email,
            data.students || [],
            data.applications || [],
            data.createdAt?.toDate(),
            data.lastLogin?.toDate(),
            data.allowed || false
        );

        // Set the new variables from Firestore data
        supervisor.activatedAt = data.activatedAt?.toDate() || null;
        supervisor.activatedBy = data.activatedBy || null;
        supervisor.rejected = data.rejected || false;
        supervisor.rejectedAt = data.rejectedAt?.toDate() || null;
        supervisor.rejectedBy = data.rejectedBy || null;
        supervisor.rejectionReason = data.rejectionReason || '';
        supervisor.status = data.status || 'pending';
        supervisor.updatedAt = data.updatedAt?.toDate() || new Date();
        
        // Ensure isActive is synchronized with status
        supervisor.isActive = supervisor.status === 'active';

        return supervisor;
    }
}

export { Supervisor };