import { Admin } from "../../js/model/Admin";
import { Company } from "../../js/model/Company";
import { Student } from "../../js/model/Student";


class UserProfile {
  get displayName() {
    throw new Error('displayName getter must be implemented');
  }
  
  get email() {
    throw new Error('email getter must be implemented');
  }
  
  get role() {
    throw new Error('role getter must be implemented');
  }
  
  get imageUrl() {
    throw new Error('imageUrl getter must be implemented');
  }
  
  get uid() {
    throw new Error('uid getter must be implemented');
  }
  
  get phoneNumber() {
    throw new Error('phoneNumber getter must be implemented');
  }
}

class UserConverter {
  constructor(user) {
    this._user = user;
    
    // Determine type
    if (user instanceof Student) {
      this.type = 'student';
    } else if (user instanceof Company) {
      this.type = 'company';
    } else if (user instanceof Admin) {
      this.type = 'admin';
    } else {
      throw new Error(`Unknown user type: ${user?.constructor?.name || typeof user}`);
    }
  }

  // Get the original object if needed
  getAs(type) {
    if (type === Student && this._user instanceof Student) {
      return this._user;
    } else if (type === Company && this._user instanceof Company) {
      return this._user;
    } else if (type === Admin && this._user instanceof Admin) {
      return this._user;
    }
    return null;
  }

  // Check type
  get isStudent() {
    return this._user instanceof Student;
  }
  
  get isCompany() {
    return this._user instanceof Company;
  }
  
  get isAdmin() {
    return this._user instanceof Admin;
  }

  // Common properties with safe access
  get displayName() {
    if (this._user instanceof Student) {
      return this._user.fullName || '';
    } else if (this._user instanceof Company) {
      return this._user.name || '';
    } else if (this._user instanceof Admin) {
      return this._user.fullName || '';
    }
    return '';
  }

  get email() {
    if (this._user instanceof Student) {
      return this._user.email || '';
    } else if (this._user instanceof Company) {
      return this._user.email || '';
    } else if (this._user instanceof Admin) {
      return this._user.email || '';
    }
    return '';
  }

  get imageUrl() {
    if (this._user instanceof Student) {
      return this._user.imageUrl || '';
    } else if (this._user instanceof Company) {
      return this._user.logoURL || '';
    } else if (this._user instanceof Admin) {
      return this._user.photoUrl || '';
    }
    return '';
  }

  get uid() {
    if (this._user instanceof Student) {
      return this._user.uid || '';
    } else if (this._user instanceof Company) {
      return this._user.id || '';
    } else if (this._user instanceof Admin) {
      return this._user.uid || '';
    }
    return '';
  }

  get phoneNumber() {
    if (this._user instanceof Student) {
      return this._user.phoneNumber || '';
    } else if (this._user instanceof Company) {
      return this._user.phoneNumber || '';
    } else if (this._user instanceof Admin) {
      return 'N/A'; // Admin doesn't have phone number
    }
    return '';
  }

  get role() {
    if (this._user instanceof Student) {
      return this._user.role || '';
    } else if (this._user instanceof Company) {
      return this._user.role || '';
    } else if (this._user instanceof Admin) {
      return this._user.role || '';
    }
    return '';
  }

  // Additional common methods
  toMap() {
    if (this._user instanceof Student) {
      return this._user.toMap();
    } else if (this._user instanceof Company) {
      return this._user.toMap();
    } else if (this._user instanceof Admin) {
      return this._user.toMap();
    }
    return {};
  }

  // Dynamic property access
  get(key) {
    if (this._user instanceof Student) {
      const map = this._user.toMap();
      return map[key];
    } else if (this._user instanceof Company) {
      const map = this._user.toMap();
      return map[key];
    } else if (this._user instanceof Admin) {
      const map = this._user.toMap();
      return map[key];
    }
    return null;
  }

  // Convenience methods
  get createdAt() {
    if (this._user instanceof Admin) {
      return this._user.createdAt;
    }
    return null;
  }

  get bio() {
    if (this._user instanceof Student) {
      return this._user.bio || '';
    } else if (this._user instanceof Company) {
      return this._user.description || '';
    }
    return '';
  }

  get isActive() {
    if (this._user instanceof Company) {
      return this._user.isActive !== false; // Default to true if undefined
    }
    return true; // Students and Admins are always considered active
  }

  // JSON serialization
  toJSON() {
    return {
      type: this.type,
      displayName: this.displayName,
      email: this.email,
      imageUrl: this.imageUrl,
      uid: this.uid,
      phoneNumber: this.phoneNumber,
      role: this.role,
      isActive: this.isActive,
      bio: this.bio,
      createdAt: this.createdAt,
      ...this.toMap()
    };
  }

  toString() {
    return `UserConverter(type: ${this.type}, name: ${this.displayName}, email: ${this.email})`;
  }
}

class UserConverterFactory {
  static fromDynamic(data, role = null) {
    // If data is already a typed object
    if (data instanceof Student || data instanceof Company || data instanceof Admin) {
      return new UserConverter(data);
    }
    
    // If data is a plain object
    if (data && typeof data === 'object') {
      const userRole = role || data.role?.toLowerCase?.();
      
      switch (userRole) {
        case 'student':
          return new UserConverter(Student.fromFirestore(data, data.uid || ''));
        case 'company':
          return new UserConverter(Company.fromMap(data));
        case 'admin':
          return new UserConverter(Admin.fromMap(data, data.uid || ''));
        default:
          // Try to infer from structure
          if (data.fullName && data.bio !== undefined) {
            return new UserConverter(Student.fromFirestore(data, data.uid || ''));
          } else if (data.name && data.industry !== undefined) {
            return new UserConverter(Company.fromMap(data));
          } else if (data.fullName && data.createdAt !== undefined) {
            return new UserConverter(Admin.fromMap(data, data.uid || ''));
          }
          
          // Check for type property
          if (data.type === 'student') {
            return new UserConverter(Student.fromFirestore(data, data.uid || ''));
          } else if (data.type === 'company') {
            return new UserConverter(Company.fromMap(data));
          } else if (data.type === 'admin') {
            return new UserConverter(Admin.fromMap(data, data.uid || ''));
          }
          
          throw new Error('Cannot determine user type from data');
      }
    }
    
    throw new Error(`Unsupported data type: ${typeof data}`);
  }

  static async fromFirestoreDocument(doc, role = null) {
    const data = doc.data();
    if (!data) {
      throw new Error('Document has no data');
    }
    
    const combinedData = {
      ...data,
      uid: doc.id
    };
    
    return UserConverterFactory.fromDynamic(combinedData, role);
  }
}

// Extension-like functionality for JavaScript
// We can't directly extend Object.prototype in JavaScript, so we create a utility function
const UserConversionUtils = {
  // Convert any object to UserConverter
  toUserConverter(obj) {
    if (obj instanceof UserConverter) {
      return obj;
    }
    
    // Check if object has a known type
    if (obj instanceof Student || obj instanceof Company || obj instanceof Admin) {
      return new UserConverter(obj);
    }
    
    // Try to convert from plain object
    return UserConverterFactory.fromDynamic(obj);
  },
  
  // Check if object can be converted
  canConvertToUser(obj) {
    if (obj instanceof Student || obj instanceof Company || obj instanceof Admin) {
      return true;
    }
    
    if (obj && typeof obj === 'object') {
      const hasStudentFields = obj.fullName !== undefined && obj.email !== undefined;
      const hasCompanyFields = obj.name !== undefined && obj.email !== undefined;
      const hasAdminFields = obj.fullName !== undefined && obj.role !== undefined;
      
      return hasStudentFields || hasCompanyFields || hasAdminFields;
    }
    
    return false;
  }
};


// Export everything
export {
  UserProfile,
  UserConverter,
  UserConverterFactory,
  UserConversionUtils,
};

// Optional: Add to global prototype for convenience (use with caution)
if (typeof window !== 'undefined') {
  // Add a helper method to Object prototype (optional)
  Object.prototype.asUser = function() {
    if (this instanceof UserConverter) {
      return this;
    }
    return UserConversionUtils.toUserConverter(this);
  };
  
  // Add a helper method to check if can be converted
  Object.prototype.canConvertToUser = function() {
    return UserConversionUtils.canConvertToUser(this);
  };
}