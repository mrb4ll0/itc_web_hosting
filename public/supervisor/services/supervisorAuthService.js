import {
     auth, 
     db, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    doc, 
    getDoc, 
    setDoc,
    collection,
    query,
    where,
    getDocs
} from '../../js/config/firebaseInit.js';

class SupervisorAuthService {
    constructor() {
        this.auth = auth;
        this.db = db;
        this.companyCode = null;
    }

    setCompanyCode(code) {
        this.companyCode = code;
    }

    async verifyCompanyCode(code) {
        try {
            // Query companies collection to find matching code
            const companiesQuery = query(
                collection(this.db, 'users', 'companies', 'companies'),
                where('compCode', '==', code)
            );
            
            const querySnapshot = await getDocs(companiesQuery);
            
            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error verifying company code:', error);
            throw error;
        }
    }

    async createSupervisorAccount(email, password, displayName) {
        try {
            // Create Firebase auth account
            const userCredential = await createUserWithEmailAndPassword(
                this.auth, 
                email, 
                password
            );
            
            const user = userCredential.user;

            // Get company info
            const companiesQuery = query(
                collection(this.db, 'users', 'companies', 'companies'),
                where('compCode', '==', this.companyCode)
            );
            
            const querySnapshot = await getDocs(companiesQuery);
            
            if (querySnapshot.empty) {
                throw new Error('Company not found');
            }

            const companyDoc = querySnapshot.docs[0];
            const companyData = companyDoc.data();
            const companyId = companyDoc.id;

            // Create supervisor document
            const supervisorData = {
                uid: user.uid,
                displayName: displayName,
                email: email,
                companyId: companyId,
                companyCode: this.companyCode,
                companyName: companyData.companyEmail, // You might want to store company name separately
                students: [],
                applications: [],
                createdAt: new Date(),
                lastLogin: new Date(),
                isActive: true,
                role: 'supervisor'
            };

            // Store in supervisors collection
            const supervisorDocRef = doc(
                this.db, 
                'supervisors', 
                `${companyId}_${this.companyCode}`, 
                'supervisors', 
                user.uid
            );

            await setDoc(supervisorDocRef, supervisorData);

            // Update user profile
            await this.updateUserProfile(displayName);

            return user;

        } catch (error) {
            console.error('Error creating supervisor account:', error);
            
            // If Firebase auth succeeded but Firestore failed, delete the auth account
            if (error.code !== 'auth/email-already-in-use') {
                try {
                    await userCredential.user.delete();
                } catch (deleteError) {
                    console.error('Error cleaning up auth account:', deleteError);
                }
            }
            
            throw error;
        }
    }

    async signInSupervisor(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(
                this.auth, 
                email, 
                password
            );
            
            const user = userCredential.user;

            // Update last login time
            await this.updateLastLogin(user.uid);

            return user;

        } catch (error) {
            console.error('Error signing in supervisor:', error);
            throw error;
        }
    }

    async updateLastLogin(uid) {
        try {
            // Find supervisor document and update last login
            const supervisorsQuery = query(
                collection(this.db, 'supervisors'),
                where('uid', '==', uid)
            );
            
            const querySnapshot = await getDocs(supervisorsQuery);
            
            if (!querySnapshot.empty) {
                const supervisorDoc = querySnapshot.docs[0];
                const supervisorRef = doc(this.db, 'supervisors', supervisorDoc.id);
                
                await setDoc(supervisorRef, {
                    lastLogin: new Date()
                }, { merge: true });
            }
        } catch (error) {
            console.error('Error updating last login:', error);
        }
    }

    async updateUserProfile(displayName) {
        // This would typically update the auth profile
        // For now, we're storing everything in Firestore
    }

    async signOut() {
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }
}

export { SupervisorAuthService };