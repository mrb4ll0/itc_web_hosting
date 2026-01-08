import { Company } from "../../js/model/Company";
import { auth, db } from "../js/config/firebaseInit";

class UserService {
  constructor() {
    this._firestore = db;
  }

  /// Fetches a user by ID, checking both company and student collections
  /// Returns a UserConverter if found, null otherwise
  async getUser(userId) {
    try {
      // First, check in companies collection
      const companyDoc = await db
        .collection('users')
        .doc('companies')
        .collection('companies')
        .doc(userId)
        .get();

      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        // Assuming Company class exists or create a simple object
        const company = Company.fromMap(companyData);
        return this._createUserConverter(company, 'company');
      }

      // If not found in companies, check in students collection
      const studentDoc = await db
        .collection('users')
        .doc('students')
        .collection('students')
        .doc(userId)
        .get();

      if (studentDoc.exists) {
        const studentData = studentDoc.data();
        const student = this._createStudentObject(studentData, studentDoc.id);
        return this._createUserConverter(student, 'student');
      }

      // If not found in either collection, check admin collection
      const adminId = userId.replace("admin_", '');
      const adminDoc = await db.collection('admins').doc(adminId).get();

      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        const admin = this._createAdminObject(adminData, adminDoc.id);
        admin.uid = `admin_${adminId}`;
        console.log(`admin uid is ${admin.uid}`);
        return this._createUserConverter(admin, 'admin');
      }

      // User not found
      console.log(`User with ID ${userId} not found in any collection`);
      return null;
    } catch (e) {
      console.error('Error fetching user:', e);
      return null;
    }
  }

  /// Alternative: Check all collections in parallel for better performance
  async getUserParallel(userId) {
    try {
      // Query all collections in parallel
      const promises = [
        db.collection('companies').doc(userId).get(),
        db
          .collection('users')
          .doc('students')
          .collection('students')
          .doc(userId)
          .get(),
        db.collection('admins').doc(userId).get(),
      ];

      const results = await Promise.all(promises);
      const companyDoc = results[0];
      const studentDoc = results[1];
      const adminDoc = results[2];

      // Check in priority order
      if (companyDoc.exists) {
        const companyData = companyDoc.data();
        const company = this._createCompanyObject(companyData, companyDoc.id);
        return this._createUserConverter(company, 'company');
      }

      if (studentDoc.exists) {
        const studentData = studentDoc.data();
        const student = this._createStudentObject(studentData, studentDoc.id);
        return this._createUserConverter(student, 'student');
      }

      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        const admin = this._createAdminObject(adminData, adminDoc.id);
        return this._createUserConverter(admin, 'admin');
      }

      return null;
    } catch (e) {
      console.error('Error fetching user in parallel:', e);
      return null;
    }
  }

  /// Enhanced version with role hint for better performance
  async getUserWithRole(userId, role = null) {
    try {
      // If role is known, query specific collection
      if (role) {
        const roleLower = role.toLowerCase();
        
        switch (roleLower) {
          case 'company':
            const companyDoc = await db.collection('companies').doc(userId).get();
            if (companyDoc.exists) {
              const companyData = companyDoc.data();
              const company = this._createCompanyObject(companyData, companyDoc.id);
              return this._createUserConverter(company, 'company');
            }
            break;

          case 'student':
            const studentDoc = await db
              .collection('users')
              .doc('students')
              .collection('students')
              .doc(userId)
              .get();
            if (studentDoc.exists) {
              const studentData = studentDoc.data();
              const student = this._createStudentObject(studentData, studentDoc.id);
              return this._createUserConverter(student, 'student');
            }
            break;

          case 'admin':
            const adminDoc = await db.collection('admins').doc(userId).get();
            if (adminDoc.exists) {
              const adminData = adminDoc.data();
              const admin = this._createAdminObject(adminData, adminDoc.id);
              return this._createUserConverter(admin, 'admin');
            }
            break;
        }
      }

      // If role not provided or not found with role hint, fall back to generic search
      return this.getUser(userId);
    } catch (e) {
      console.error('Error fetching user with role hint:', e);
      return null;
    }
  }

  /// Get current logged-in user as UserConverter
  async getCurrentUser() {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    return this.getUser(currentUser.uid);
  }

  /// Stream version for real-time updates
  getUserStream(userId) {
    // Create streams for all possible collections
    const companyStream = db.collection('companies').doc(userId).onSnapshot(
      (snapshot) => {
        if (snapshot.exists) {
          const companyData = snapshot.data();
          const company = this._createCompanyObject(companyData, snapshot.id);
          return this._createUserConverter(company, 'company');
        }
        return null;
      }
    );

    const studentStream = db
      .collection('users')
      .doc('students')
      .collection('students')
      .doc(userId)
      .onSnapshot(
        (snapshot) => {
          if (snapshot.exists) {
            const studentData = snapshot.data();
            const student = this._createStudentObject(studentData, snapshot.id);
            return this._createUserConverter(student, 'student');
          }
          return null;
        }
      );

    const adminStream = db.collection('admins').doc(userId).onSnapshot(
      (snapshot) => {
        if (snapshot.exists) {
          const adminData = snapshot.data();
          const admin = this._createAdminObject(adminData, snapshot.id);
          return this._createUserConverter(admin, 'admin');
        }
        return null;
      }
    );

    // For now, return just the company stream as main stream
    // You can implement RxJS or another streaming library for proper combining
    return companyStream;
  }

  // Get user by ID without conversion (returns raw data)
  async getUserById(userId) {
    try {
      // Try students collection first (most common)
      const studentDoc = await db
        .collection('users')
        .doc('students')
        .collection('students')
        .doc(userId)
        .get();

      if (studentDoc.exists) {
        return {
          id: studentDoc.id,
          ...studentDoc.data(),
          type: 'student'
        };
      }

      // Try companies collection
      const companyDoc = await db
        .collection('users')
        .doc('companies')
        .collection('companies')
        .doc(userId)
        .get();

      if (companyDoc.exists) {
        return {
          id: companyDoc.id,
          ...companyDoc.data(),
          type: 'company'
        };
      }

      // Try admins collection (without admin_ prefix)
      const cleanId = userId.replace("admin_", '');
      const adminDoc = await db.collection('admins').doc(cleanId).get();

      if (adminDoc.exists) {
        return {
          id: adminDoc.id,
          ...adminDoc.data(),
          type: 'admin',
          uid: `admin_${adminDoc.id}`
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  // Get user profile for display
  async getUserProfile(userId) {
    const userData = await this.getUserById(userId);
    
    if (!userData) {
      return null;
    }

    // Create a simplified user profile object
    return {
      id: userData.id,
      uid: userData.uid || userData.id,
      displayName: userData.fullName || userData.name || userData.email || 'Unknown User',
      email: userData.email || '',
      photoURL: userData.avatarUrl || userData.profileImage || '',
      role: userData.type || 'user',
      companyName: userData.companyName || '',
      studentId: userData.studentId || '',
      // Add other common fields as needed
      ...userData
    };
  }

  // Search users by name or email
  async searchUsers(searchTerm, role = null) {
    try {
      const results = [];
      
      // Search in students if role is not specified or is 'student'
      if (!role || role === 'student') {
        const studentsSnapshot = await db
          .collection('users')
          .doc('students')
          .collection('students')
          .get();

        studentsSnapshot.forEach((doc) => {
          const data = doc.data();
          const fullName = data.fullName || '';
          const email = data.email || '';
          
          if (fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              email.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push({
              id: doc.id,
              ...data,
              type: 'student'
            });
          }
        });
      }

      // Search in companies if role is not specified or is 'company'
      if (!role || role === 'company') {
        const companiesSnapshot = await db
          .collection('users')
          .doc('companies')
          .collection('companies')
          .get();

        companiesSnapshot.forEach((doc) => {
          const data = doc.data();
          const companyName = data.companyName || '';
          const email = data.email || '';
          
          if (companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              email.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push({
              id: doc.id,
              ...data,
              type: 'company'
            });
          }
        });
      }

      // Search in admins if role is not specified or is 'admin'
      if (!role || role === 'admin') {
        const adminsSnapshot = await db.collection('admins').get();

        adminsSnapshot.forEach((doc) => {
          const data = doc.data();
          const name = data.name || '';
          const email = data.email || '';
          
          if (name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              email.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push({
              id: doc.id,
              ...data,
              type: 'admin',
              uid: `admin_${doc.id}`
            });
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Update user data
  async updateUser(userId, data, role = null) {
    try {
      let collectionRef;
      
      if (role) {
        switch (role.toLowerCase()) {
          case 'student':
            collectionRef = db
              .collection('users')
              .doc('students')
              .collection('students')
              .doc(userId);
            break;
          case 'company':
            collectionRef = db
              .collection('users')
              .doc('companies')
              .collection('companies')
              .doc(userId);
            break;
          case 'admin':
            // Remove admin_ prefix if present
            const cleanId = userId.replace("admin_", '');
            collectionRef = db.collection('admins').doc(cleanId);
            break;
          default:
            throw new Error(`Unknown role: ${role}`);
        }
      } else {
        // Try to determine role by checking collections
        const user = await this.getUserById(userId);
        if (!user) {
          throw new Error('User not found');
        }
        return this.updateUser(userId, data, user.type);
      }

      await collectionRef.update(data);
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Get all users of a specific role
  async getUsersByRole(role) {
    try {
      let collectionRef;
      
      switch (role.toLowerCase()) {
        case 'student':
          collectionRef = db
            .collection('users')
            .doc('students')
            .collection('students');
          break;
        case 'company':
          collectionRef = db
            .collection('users')
            .doc('companies')
            .collection('companies');
          break;
        case 'admin':
          collectionRef = db.collection('admins');
          break;
        default:
          throw new Error(`Unknown role: ${role}`);
      }

      const snapshot = await collectionRef.get();
      const users = [];
      
      snapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data(),
          type: role
        });
      });

      return users;
    } catch (error) {
      console.error(`Error getting ${role} users:`, error);
      return [];
    }
  }

  // Helper methods to create user objects
  _createCompanyObject(data, id) {
    return {
      id: id,
      uid: id,
      type: 'company',
      companyName: data.companyName || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      avatarUrl: data.avatarUrl || data.profileImage || '',
      ...data
    };
  }

  _createStudentObject(data, id) {
    return {
      id: id,
      uid: id,
      type: 'student',
      fullName: data.fullName || '',
      email: data.email || '',
      phone: data.phone || '',
      studentId: data.studentId || '',
      avatarUrl: data.avatarUrl || data.profileImage || '',
      ...data
    };
  }

  _createAdminObject(data, id) {
    return {
      id: id,
      uid: `admin_${id}`,
      type: 'admin',
      name: data.name || '',
      email: data.email || '',
      role: data.role || 'admin',
      avatarUrl: data.avatarUrl || data.profileImage || '',
      ...data
    };
  }

  _createUserConverter(userObject, type) {
    return {
      user: userObject,
      type: type,
      id: userObject.id,
      uid: userObject.uid || userObject.id,
      
      // Common properties
      get displayName() {
        switch (type) {
          case 'company':
            return userObject.companyName || userObject.email || 'Company';
          case 'student':
            return userObject.fullName || userObject.email || 'Student';
          case 'admin':
            return userObject.name || userObject.email || 'Admin';
          default:
            return 'Unknown User';
        }
      },
      
      get email() {
        return userObject.email || '';
      },
      
      get photoURL() {
        return userObject.imageUrl || userObject.logoUrl || '';
      },
      
      get role() {
        return type;
      },
      
      // Type checking methods
      isCompany() {
        return type === 'company';
      },
      
      isStudent() {
        return type === 'student';
      },
      
      isAdmin() {
        return type === 'admin';
      },
      
      // Convert to simple object
      toJSON() {
        return {
          ...userObject,
          type: type,
          displayName: this.displayName,
          role: this.role
        };
      }
    };
  }
}

// Export the class
export { UserService };