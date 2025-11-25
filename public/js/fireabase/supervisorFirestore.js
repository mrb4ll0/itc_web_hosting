import { Supervisor } from '../model/supervisorModel.js';
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
    writeBatch 
} from '../config/firebaseInit.js';

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
            const companyDocRef = doc(this.db, 'users', 'companies', 'companies', this.currentUser.uid);
            const companyDoc = await getDoc(companyDocRef);
            
            return companyDoc.exists() ? companyDoc.data().compCode : null;
        } catch (error) {
            console.error('Error getting company code:', error);
            throw error;
        }
    }

    async generateCompanyCode() {
        if (!this.currentUser) throw new Error('User not authenticated');

        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            try {
                const code = this.generateUniqueCode(8);
                
                // Check if code already exists
                const companiesQuery = query(
                    collection(this.db, 'users', 'companies', 'companies'),
                    where('compCode', '==', code)
                );
                const querySnapshot = await getDocs(companiesQuery);
                
                if (querySnapshot.empty) {
                    // Code is unique, proceed with storage
                    const companyDocRef = doc(this.db, 'users', 'companies', 'companies', this.currentUser.uid);
                    await setDoc(companyDocRef, {
                        compCode: code,
                        createdAt: new Date(),
                        createdBy: this.currentUser.uid,
                        companyEmail: this.currentUser.email
                    }, { merge: true });

                    // Create the supervisors collection reference document
                    const supervisorsDocRef = doc(this.db, 'supervisors', `${this.currentUser.uid}_${code}`);
                    await setDoc(supervisorsDocRef, {
                        companyId: this.currentUser.uid,
                        companyCode: code,
                        createdAt: new Date(),
                        supervisorCount: 0
                    });

                    return code;
                }
                // If code exists, try again
                attempts++;
            } catch (error) {
                console.error('Error generating company code:', error);
                throw error;
            }
        }
        
        throw new Error('Failed to generate unique code after multiple attempts');
    }

    async getSupervisors() {
        if (!this.currentUser) return [];

        try {
            const companyCode = await this.getCompanyCode();
            if (!companyCode) return [];

            const supervisorsCollectionRef = collection(this.db, 'supervisors', `${this.currentUser.uid}_${companyCode}`, 'supervisors');
            const querySnapshot = await getDocs(supervisorsCollectionRef);
            
            const supervisors = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                supervisors.push(new Supervisor(
                    doc.id,
                    data.displayName,
                    data.email,
                    data.students || [],
                    data.applications || [],
                    data.createdAt,
                    data.lastLogin,
                    data.allowed || false // Include the allowed status
                ));
            });

            return supervisors;
        } catch (error) {
            console.error('Error getting supervisors:', error);
            throw error;
        }
    }

    async activateSupervisorAccount(supervisorId) {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            const companyCode = await this.getCompanyCode();
            if (!companyCode) throw new Error('Company code not found');

            // Update supervisor document to set allowed: true
            const supervisorDocRef = doc(
                this.db, 
                'supervisors', 
                `${this.currentUser.uid}_${companyCode}`, 
                'supervisors', 
                supervisorId
            );

            await updateDoc(supervisorDocRef, {
                allowed: true,
                activatedAt: new Date(),
                activatedBy: this.currentUser.uid,
                status: 'active',
                isActive: true, // Also update isActive to match Supervisor model
                updatedAt: new Date()
            });

            return true;

        } catch (error) {
            console.error('Error activating supervisor account:', error);
            throw error;
        }
    }

    async rejectSupervisorAccount(supervisorId, reason = '') {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            const companyCode = await this.getCompanyCode();
            if (!companyCode) throw new Error('Company code not found');

            // Update supervisor document to mark as rejected
            const supervisorDocRef = doc(
                this.db, 
                'supervisors', 
                `${this.currentUser.uid}_${companyCode}`, 
                'supervisors', 
                supervisorId
            );

            await updateDoc(supervisorDocRef, {
                allowed: false,
                isActive: false, // Set isActive to false when rejected
                rejected: true,
                rejectedAt: new Date(),
                rejectedBy: this.currentUser.uid,
                rejectionReason: reason,
                status: 'rejected',
                updatedAt: new Date()
            });

            return true;

        } catch (error) {
            console.error('Error rejecting supervisor account:', error);
            throw error;
        }
    }

    async assignStudentsRandomly() {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            const companyCode = await this.getCompanyCode();
            if (!companyCode) throw new Error('Company code not found');

            // Get all students for this company
            const students = await this.getCompanyStudents();
            
            // Get all supervisors
            const supervisors = await this.getSupervisors();
            if (supervisors.length === 0) throw new Error('No supervisors available');

            const batch = writeBatch(this.db);
            const supervisorsCollectionRef = collection(this.db, 'supervisors', `${this.currentUser.uid}_${companyCode}`, 'supervisors');

            // Clear existing student assignments
            supervisors.forEach(supervisor => {
                const supervisorDocRef = doc(supervisorsCollectionRef, supervisor.id);
                batch.update(supervisorDocRef, { students: [] });
            });

            // Randomly assign students to supervisors
            students.forEach((student, index) => {
                const supervisorIndex = index % supervisors.length;
                const supervisor = supervisors[supervisorIndex];
                const supervisorDocRef = doc(supervisorsCollectionRef, supervisor.id);
                
                batch.update(supervisorDocRef, {
                    students: arrayUnion(student.id)
                });
            });

            await batch.commit();
            return true;
        } catch (error) {
            console.error('Error assigning students randomly:', error);
            throw error;
        }
    }

    async getCompanyStudents() {
        if (!this.currentUser) return [];

        try {
            // This would need to be implemented based on your student data structure
            // For now, returning empty array as placeholder
            return [];
        } catch (error) {
            console.error('Error getting company students:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    // Utility Methods
    generateUniqueCode(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

export { SupervisorFirestore };