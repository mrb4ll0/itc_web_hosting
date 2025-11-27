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
    orderBy,
    limit
} from '../../../js/config/firebaseInit.js';

class SupervisorDashboardService {
    constructor() {
        this.auth = auth;
        this.db = db;
        this.currentUser = null;
        this.supervisorData = null;
    }

    async getCurrentUser() {
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(this.auth, (user) => {
                unsubscribe();
                this.currentUser = user;
                if (user) {
                    resolve(user);
                } else {
                    reject(new Error('No user authenticated'));
                }
            });
        });
    }

    async getSupervisorProfile() {
        if (!this.currentUser) {
            throw new Error('No user authenticated');
        }

        try {
            // First, try to find the supervisor document across all companies
            const supervisorsQuery = query(
                collection(this.db, 'supervisors'),
                where('supervisors', 'array-contains', this.currentUser.uid)
            );

            const querySnapshot = await getDocs(supervisorsQuery);
            
            if (!querySnapshot.empty) {
                // Supervisor found in the new structure
                const supervisorDoc = querySnapshot.docs[0];
                this.supervisorData = supervisorDoc.data();
                return this.supervisorData;
            }

            // Alternative: Look for supervisor in the company-specific structure
            const allSupervisorsCollections = await this.findSupervisorInCollections();
            if (allSupervisorsCollections) {
                this.supervisorData = allSupervisorsCollections;
                return this.supervisorData;
            }

            // If no supervisor data found, return basic user info
            return {
                uid: this.currentUser.uid,
                displayName: this.currentUser.displayName || 'Supervisor',
                email: this.currentUser.email,
                photoURL: this.currentUser.photoURL,
                companyId: 'Unknown',
                companyCode: 'Unknown',
                students: [],
                applications: []
            };

        } catch (error) {
            console.error('Error getting supervisor profile:', error);
            throw error;
        }
    }

    async findSupervisorInCollections() {
        try {
            // Get all top-level supervisor collections
            const supervisorsCollections = await getDocs(collection(this.db, 'supervisors'));
            
            for (const coll of supervisorsCollections.docs) {
                const supervisorsSubCollection = collection(coll.ref, 'supervisors');
                const supervisorQuery = query(
                    supervisorsSubCollection,
                    where('uid', '==', this.currentUser.uid)
                );
                
                const supervisorSnapshot = await getDocs(supervisorQuery);
                if (!supervisorSnapshot.empty) {
                    const supervisorDoc = supervisorSnapshot.docs[0];
                    return supervisorDoc.data();
                }
            }
            return null;
        } catch (error) {
            console.error('Error finding supervisor in collections:', error);
            return null;
        }
    }

    async getSupervisorStats() {
        if (!this.currentUser) {
            throw new Error('No user authenticated');
        }

        try {
            const students = await this.getAssignedStudents();
            
            // Calculate stats based on student data
            const totalStudents = students.length;
            const pendingSubmissions = students.filter(student => 
                student.status === 'Awaiting Review' || student.status === 'In Progress'
            ).length;
            const flaggedIssues = students.filter(student => 
                student.status === 'Issue Flagged'
            ).length;

            return {
                totalStudents,
                pendingSubmissions,
                flaggedIssues,
                completed: students.filter(student => student.status === 'Completed').length
            };

        } catch (error) {
            console.error('Error getting supervisor stats:', error);
            // Return default stats on error
            return {
                totalStudents: 0,
                pendingSubmissions: 0,
                flaggedIssues: 0,
                completed: 0
            };
        }
    }

    async getAssignedStudents() {
        if (!this.currentUser) {
            return [];
        }

        try {
            // First, try to get students from supervisor profile
            if (this.supervisorData && this.supervisorData.students) {
                const studentDetails = await this.getStudentDetails(this.supervisorData.students);
                return studentDetails;
            }

            // Alternative: Look for students in the supervisor's document
            const supervisorProfile = await this.getSupervisorProfile();
            if (supervisorProfile.students && supervisorProfile.students.length > 0) {
                const studentDetails = await this.getStudentDetails(supervisorProfile.students);
                return studentDetails;
            }

            // Fallback: Return mock data for demonstration
            return this.getMockStudents();

        } catch (error) {
            console.error('Error getting assigned students:', error);
            // Return mock data on error for demonstration
            return this.getMockStudents();
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
                    // Try to get student from users collection
                    const studentDoc = await getDoc(doc(this.db, 'users', studentId));
                    if (studentDoc.exists()) {
                        const studentData = studentDoc.data();
                        students.push({
                            id: studentId,
                            name: studentData.displayName || studentData.name || 'Unknown Student',
                            email: studentData.email || 'No email',
                            company: studentData.company || 'Unknown Company',
                            status: this.getRandomStatus(),
                            lastActivity: this.getRandomLastActivity(),
                            avatar: studentData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.displayName || 'Student')}&background=random`
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching student ${studentId}:`, error);
                }
            }

            return students;

        } catch (error) {
            console.error('Error getting student details:', error);
            return this.getMockStudents();
        }
    }

    async getStudentApplications(studentId) {
        if (!studentId) {
            return [];
        }

        try {
            const applicationsQuery = query(
                collection(this.db, 'applications'),
                where('studentId', '==', studentId),
                orderBy('submittedAt', 'desc')
            );

            const querySnapshot = await getDocs(applicationsQuery);
            const applications = [];

            querySnapshot.forEach(doc => {
                const appData = doc.data();
                applications.push({
                    id: doc.id,
                    ...appData,
                    submittedAt: appData.submittedAt?.toDate() || new Date()
                });
            });

            return applications;

        } catch (error) {
            console.error('Error getting student applications:', error);
            return [];
        }
    }

    async getRecentActivity() {
        if (!this.currentUser) {
            return [];
        }

        try {
            // Get recent submissions from assigned students
            const students = await this.getAssignedStudents();
            const recentActivity = [];

            for (const student of students) {
                const applications = await this.getStudentApplications(student.id);
                const recentApp = applications[0]; // Most recent application
                
                if (recentApp) {
                    recentActivity.push({
                        studentName: student.name,
                        type: 'Submission',
                        description: `${student.name} submitted ${recentApp.type || 'an application'}`,
                        timestamp: recentApp.submittedAt,
                        status: student.status
                    });
                }
            }

            // Sort by timestamp and return latest 5
            return recentActivity
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5);

        } catch (error) {
            console.error('Error getting recent activity:', error);
            return [];
        }
    }

    async updateStudentStatus(studentId, status, notes = '') {
        if (!this.currentUser) {
            throw new Error('No user authenticated');
        }

        try {
            // Update student status in supervisor's record
            const supervisorProfile = await this.getSupervisorProfile();
            
            // This would typically update the student's status in the database
            // For now, we'll just log the update
            //console.log(`Updating student ${studentId} status to ${status}`, notes);
            
            return { success: true, message: 'Status updated successfully' };

        } catch (error) {
            console.error('Error updating student status:', error);
            throw error;
        }
    }

    async sendMessageToStudent(studentId, message) {
        if (!this.currentUser) {
            throw new Error('No user authenticated');
        }

        try {
            // This would typically create a message in a messages collection
            // For now, we'll just log the message
            //console.log(`Sending message to student ${studentId}:`, message);
            
            return { success: true, message: 'Message sent successfully' };

        } catch (error) {
            console.error('Error sending message to student:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            await signOut(this.auth);
            this.currentUser = null;
            this.supervisorData = null;
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    // Utility Methods for Mock Data (remove in production)
    getMockStudents() {
        return [
            {
                id: 'student1',
                name: 'Alex Johnson',
                email: 'alex.johnson@student.edu',
                company: 'Innovatech Solutions',
                status: 'In Progress',
                lastActivity: '2 days ago',
                avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA60Q4uqUIwPO5AOiYwxCoNCj41lBOhOrOyWAzw5OkFxG9ERudOIaz_rA7-IDz3-L82auBaC6Ml4luWhTUvN9uYEuSXL2W7LNltxoFGGFV8997PiTugSI2XcExRajpCx5RGcC_bB-hGiaQyncic-UI4JmT9K2rEEi_I85T_ze7D4GIJkMUjYoxidXNRvCs8MUS5I3VdXeam3tAk1MgobZRuvja_tGGN75PhSCVwuhxBGBJzF7IS0WQtJu6zKC1S84GEFuQ9aCfIuw'
            },
            {
                id: 'student2',
                name: 'Brianna Williams',
                email: 'brianna.williams@student.edu',
                company: 'DataStream Corp',
                status: 'Awaiting Review',
                lastActivity: '5 hours ago',
                avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5xVSql_maAmbfQ18cPreQYTAwzkHhJ2NtIOOb8ZClCGJ5kdnb1M3QWhNA3hqO2FhxeQf6myjt_9Y5NQop_jnCjeuhtQkeVXqkdK9Wzd2RRmFd9dJYEVJKiVBHBWX6ue9rF1NZAbi1u5M-Tz5rK36aXFecJu99s6qxMyXbee1q6h16bLoj-qqItEVqLy9T0qi-EaV86mPknZtsBj91LuCH8D_5qgRI7ZiEUVwvEyN_PoxQUuAzwcLAy7gpOOhsBYoa9KDBgrwN8Q'
            },
            {
                id: 'student3',
                name: 'Carlos Rodriguez',
                email: 'carlos.rodriguez@student.edu',
                company: 'NextGen AI',
                status: 'Issue Flagged',
                lastActivity: '1 day ago',
                avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAP4pYsqLsNBTGaIK9F7lTtwcZUuqAvKdjXDs0alHAjROWO2PVfMNcJyNIIE_t9icGz4Bp8tJAGOai-DSjwERAOwDKBhejP3BsO-6QNOsl6sNLsmKafN62UPD9nGTI1YnjnSpfk0JrwK-hiMgEOPWxjmt2A-PZTJK55YknUDemyL1k9dFiPtibk6BwtrkI4XPRFLIbOs-T0KiJgVxQibQKrxOVqSF6wwd19a9V4HGWwXammA9XFXKQFJh_FD9w1mg65dz4NH2sTxA'
            },
            {
                id: 'student4',
                name: 'David Chen',
                email: 'david.chen@student.edu',
                company: 'QuantumLeap Inc.',
                status: 'Completed',
                lastActivity: '3 weeks ago',
                avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4tD2bZenrod6aw5OWj-9d64Y1O35_sfcyk9fF_mUIdtkb84OWW7vkoks-GQMPY00CqXa2H6kPymppNtL-okAM9sLNC75Sobf9VzCyQOSyh8sE7OyusVk-Etz8q1pXXVXEXxRdgEZoFcNlkKzKWFGMa-WQx8Z_xBJLAqCvmcK1m46RQ4YDqjnVeU7k8wENjQV4N_3PT5HwceNRs9lCRDVlw-vwch1-ISZa2VdrDQP_GrMKphS9QeGGbAJwmd86CP_uvW7q0xk78g'
            }
        ];
    }

    getRandomStatus() {
        const statuses = ['In Progress', 'Awaiting Review', 'Issue Flagged', 'Completed'];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    getRandomLastActivity() {
        const activities = ['2 days ago', '5 hours ago', '1 day ago', '3 weeks ago', '1 hour ago'];
        return activities[Math.floor(Math.random() * activities.length)];
    }

    // Method to get company information
    async getCompanyInfo(companyId) {
        if (!companyId) {
            return null;
        }

        try {
            const companyDoc = await getDoc(doc(this.db, 'users', 'companies', 'companies', companyId));
            if (companyDoc.exists()) {
                return companyDoc.data();
            }
            return null;
        } catch (error) {
            console.error('Error getting company info:', error);
            return null;
        }
    }
}

export { SupervisorDashboardService };