
import {  auth, db, collection, doc, getDoc, getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp } from "../../js/config/firebaseInit.js";
import { Company } from "../../js/model/Company.js";
import { IndustrialTraining } from "../../js/model/internship_model.js";
import { StudentApplication } from "../../js/model/studentApplication.js";
import { StudentCloudDB } from "./StudentCloud.js";
const studentCloudDB = new StudentCloudDB();

class ITBaseCompanyCloud {
    constructor() {
        this.db = db;
        this.auth = auth;
        this.usersCollection = "users";
        this.companiesSubcollection = "companies";
        this.itSubcollection = "IT";
        this.applicationsSubcollection = "applications";
    }

    /**
     * Get company data by user ID
     * @param {string} userId - The user ID (same as company ID in structure)
     * @returns {Promise<Company|null>} Company object or null if not found
     */
    async getCompany(userId) {
        if (!userId) {
            throw new Error("User ID is required");
        }

        try {
            const companyDoc = await getDoc(
                doc(this.db, this.usersCollection, this.companiesSubcollection, this.companiesSubcollection, userId)
            );
            
            if (companyDoc.exists()) {
                const data = companyDoc.data();
                return Company.fromMap(data);
            } else {
                console.warn(`Company with ID ${userId} not found`);
                return null;
            }
        } catch (error) {
            console.error("Error getting company:", error);
            throw error;
        }
    }

/**
 * Update company industry in Firestore
 * @param {string} companyId - The company ID
 * @param {string} industry - The industry to set
 * @returns {Promise<void>}
 */
async updateCompanyIndustry(companyId, industry) {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    if (!industry || typeof industry !== 'string' || industry.trim() === '') {
        //console.log("industry is "+industry);
        throw new Error("Industry is required and must be a non-empty string");
    }

    try {
        // Reference to the company document
        const companyRef = doc(
            this.db, 
            this.usersCollection, 
            this.companiesSubcollection, 
            this.companiesSubcollection, 
            companyId
        );

        // Update data with industry and timestamp
        const updateData = {
            industry: industry.trim(),
            updatedAt: serverTimestamp()
        };

        // Perform the update
        await updateDoc(companyRef, updateData);
        //console.log("Company industry updated successfully");

    } catch (error) {
        console.error("Error updating company industry:", error);
        throw error;
    }
}

    /**
     * Update company profile information
     * @param {string} companyId - The company ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<void>}
     */
    async updateCompanyProfile(companyId, updates) {
        if (!companyId) {
            throw new Error("Company ID is required");
        }

        try {
            const companyRef = doc(
                this.db, 
                this.usersCollection, 
                this.companiesSubcollection, 
                this.companiesSubcollection, 
                companyId
            );

            const updateData = {
                ...updates,
                updatedAt: serverTimestamp()
            };

            await updateDoc(companyRef, updateData);
            //console.log("Company profile updated successfully");

        } catch (error) {
            console.error("Error updating company profile:", error);
            throw error;
        }
    }

    /**
     * Post a new industrial training opportunity
     * @param {IndustrialTraining} industrialTraining - The industrial training object to post
     * @returns {Promise<string>} The ID of the created industrial training
     */
    async postIndustrialTraining(industrialTraining) {
        if (!industrialTraining.company || !industrialTraining.company.id) {
            throw new Error("Company information is required");
        }

        try {
            const companyId = industrialTraining.company.id;
            
            // Reference to the company's IT collection
            const itCollectionRef = collection(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection
            );

            const itData = {
                ...industrialTraining.toMap(),
                postedAt: serverTimestamp(),
                status: industrialTraining.status || 'Open',
                company: {
                    id: companyId,
                    name: industrialTraining.company.name,
                    logoURL: industrialTraining.company.logoURL
                }
            };

            const docRef = await addDoc(itCollectionRef, itData);
            //console.log("Industrial Training posted with ID:", docRef.id);
            
            return docRef.id;

        } catch (error) {
            console.error("Error posting industrial training:", error);
            throw error;
        }
    }

    /**
     * Get all industrial trainings for a company
     * @param {string} companyId - The company ID
     * @returns {Promise<IndustrialTraining[]>} Array of industrial trainings
     */
    async getCompanyIndustrialTrainings(companyId) {
        if (!companyId) {
            throw new Error("Company ID is required");
        }

        try {
            const itCollectionRef = collection(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection
            );

            const q = query(itCollectionRef, orderBy("postedAt", "desc"));
            const snapshot = await getDocs(q);
            
            const industrialTrainings = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return IndustrialTraining.fromMap(data, docSnap.id);
            });

            return industrialTrainings;

        } catch (error) {
            console.error("Error getting company industrial trainings:", error);
            throw error;
        }
    }

    /**
     * Get a specific industrial training by ID
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @returns {Promise<IndustrialTraining|null>} Industrial training object or null if not found
     */
    async getIndustrialTrainingById(companyId, itId) {
        console.log("companyId is "+companyId+" itId "+itId);
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        try {
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            const itDoc = await getDoc(itDocRef);
            
            if (itDoc.exists()) {
                const data = itDoc.data();
                return IndustrialTraining.fromMap(data, itDoc.id);
            } else {
                console.warn(`Industrial Training with ID ${itId} not found`);
                return null;
            }

        } catch (error) {
            console.error("Error getting industrial training by ID:", error);
            throw error;
        }
    }

    /**
     * Update an existing industrial training
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<void>}
     */
    async updateIndustrialTraining(companyId, itId, updates) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        try {
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            const updateData = {
                ...updates,
                updatedAt: serverTimestamp()
            };

            await updateDoc(itDocRef, updateData);
            //console.log("Industrial Training updated successfully");

        } catch (error) {
            console.error("Error updating industrial training:", error);
            throw error;
        }
    }

    /**
     * Delete an industrial training and its applications
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @returns {Promise<void>}
     */
    async deleteIndustrialTraining(companyId, itId) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        try {
            // First, delete all applications for this industrial training
            const applicationsRef = collection(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId,
                this.applicationsSubcollection
            );

            const applicationsSnapshot = await getDocs(applicationsRef);
            const deletePromises = applicationsSnapshot.docs.map(appDoc => 
                deleteDoc(appDoc.ref)
            );

            // Wait for all applications to be deleted
            await Promise.all(deletePromises);

            // Then delete the industrial training itself
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            await deleteDoc(itDocRef);
            //console.log("Industrial Training and its applications deleted successfully");

        } catch (error) {
            console.error("Error deleting industrial training:", error);
            throw error;
        }
    }

    /**
     * Get company statistics for dashboard
     * @param {string} companyId - The company ID
     * @returns {Promise<Object>} Stats object with totalPostings, activePostings, newApplications, hiredStudents
     */
    async getCompanyStats(companyId) {
        if (!companyId) {
            throw new Error("Company ID is required");
        }

        try {
            // Get all industrial trainings for this company
            const industrialTrainings = await this.getCompanyIndustrialTrainings(companyId);
            
            let totalPostings = industrialTrainings.length;
            let activePostings = 0;
            let newApplications = 0;
            let hiredStudents = 0;

            // Count active postings and gather application data
            for (const it of industrialTrainings) {
                // Check if industrial training is active
                if (it.status === 'active' || it.status === 'open') {
                    activePostings++;
                }

                // Get applications for this industrial training
                const applications = await this.getApplicationsForIndustrialTraining(companyId, it.id);
                
                applications.forEach(app => {
                    // Count new applications (status = 'new' or 'pending')
                    if (app.applicationStatus === 'new' || app.applicationStatus === 'pending') {
                        newApplications++;
                    }
                    
                    // Count hired students (status = 'accepted' or 'hired')
                    if (app.applicationStatus === 'accepted' || app.applicationStatus === 'hired') {
                        hiredStudents++;
                    }
                });
            }

            return {
                totalPostings,
                activePostings,
                newApplications,
                hiredStudents
            };

        } catch (error) {
            console.error("Error getting company stats:", error);
            throw error;
        }
    }

    /**
     * Get recent applications for a company
     * @param {string} companyId - The company ID
     * @param {number} limit - Maximum number of applications to return
     * @returns {Promise<Array>} Array of application objects
     */
    async getRecentApplications(companyId, limit = 20) {
        if (!companyId) {
            throw new Error("Company ID is required");
        }

        try {
            const allApplications = [];
            const industrialTrainings = await this.getCompanyIndustrialTrainings(companyId);

            // Collect applications from all industrial trainings
            for (const it of industrialTrainings) {
                const applications = await this.getApplicationsForIndustrialTraining(companyId, it.id);
                allApplications.push(...applications);
            }

            // Sort by application date (newest first) and limit results
            return allApplications
                .sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate))
                .slice(0, limit);

        } catch (error) {
            console.error("Error getting recent applications:", error);
            throw error;
        }
    }

    
    /**
 * Get applications for a specific industrial training
 * @param {string} companyId - The company ID
 * @param {string} itId - The industrial training ID
 * @returns {Promise<StudentApplication[]>} Array of student applications
 */
async getApplicationsForIndustrialTraining(companyId, itId) {
    if (!companyId || !itId) {
        throw new Error("Company ID and Industrial Training ID are required");
    }

    try {
        const applicationsRef = collection(
            this.db,
            this.usersCollection,
            this.companiesSubcollection,
            this.companiesSubcollection,
            companyId,
            this.itSubcollection,
            itId,
            this.applicationsSubcollection
        );

        const q = query(applicationsRef, orderBy("applicationDate", "desc"));
        const snapshot = await getDocs(q);
        
        const applications = await Promise.all(
            
            snapshot.docs.map(async (docSnap) => {
                console.log("snap total is "+snapshot.docs.length);
                const data = docSnap.data();
                //console.log("applicationDate is " + JSON.stringify(data.applicationDate));
                
                // Get industrial training data
                const industrialTraining = await this.getIndustrialTrainingById(companyId, itId);
                
                  var app = StudentApplication.fromMap(data,itId,docSnap.id);
                  if(app.student.uid)
                  {
                     app.student = await studentCloudDB.getStudentById(app.student.uid);
                  }
                  
                app.industrialTraining = industrialTraining;
                
                //console.log("applicationDate before returning "+JSON.stringify(app.applicationDate));
                // Create proper StudentApplication object using fromMap
                return app;
            })
        );

        return applications;

    } catch (error) {
        console.error("Error getting applications for industrial training:", error);
        throw error;
    }
}


async updateInternshipStatus(companyId, itId) {
    if (!companyId || !itId) {
        throw new Error("Company ID and Industrial Training ID are required");
    }

    try {
        // Get current applications count
        const applications = await this.getApplicationsForIndustrialTraining(companyId, itId);
        const currentApplicationsCount = applications.length;

        // Get internship data
        const internship = await this.getIndustrialTrainingById(companyId, itId);
        
        console.log(`Current applications: ${currentApplicationsCount}, Intake capacity: ${internship.intakeCapacity}`);

        let newStatus = internship.status;
        
        // Update status based on application count and intake capacity
        if (internship.intakeCapacity && currentApplicationsCount >= internship.intakeCapacity) {
            newStatus = 'closed';
            console.log(`Application count (${currentApplicationsCount}) reached intake capacity (${internship.intakeCapacity}). Status set to: ${newStatus}`);
        } else if (internship.status === 'closed' && currentApplicationsCount < internship.intakeCapacity) {
            // Reopen if it was closed but now has capacity
            newStatus = 'open';
            console.log(`Application count (${currentApplicationsCount}) is below intake capacity (${internship.intakeCapacity}). Reopening status to: ${newStatus}`);
        }

        // Only update if status has changed
        if (newStatus !== internship.status) {
            await this.updateInternshipStatusInDatabase(companyId, itId, newStatus, currentApplicationsCount);
            console.log(`Internship status updated from '${internship.status}' to '${newStatus}'`);
        } else {
            console.log(`Internship status unchanged: '${internship.status}'`);
        }

        return {
            previousStatus: internship.status,
            newStatus: newStatus,
            applicationsCount: currentApplicationsCount,
            intakeCapacity: internship.intakeCapacity
        };

    } catch (error) {
        console.error("Error updating internship status:", error);
        throw error;
    }
}

async updateInternshipStatusInDatabase(companyId, itId, status, applicationsCount = null) {
    const itRef = doc(
        this.db,
        this.usersCollection,
        this.companiesSubcollection,
        this.companiesSubcollection,
        companyId,
        this.itSubcollection,
        itId
    );

    const updateData = {
        status: status,
        updatedAt: serverTimestamp()
    };

    // Only update applicationsCount if provided
    if (applicationsCount !== null) {
        updateData.applicationsCount = applicationsCount;
    }

    await updateDoc(itRef, updateData);
}



    /**
     * Update application status
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @param {string} applicationId - The application ID
     * @param {string} status - New status (pending, under review, accepted, rejected, etc.)
     * @returns {Promise<void>}
     */
    async updateApplicationStatus(companyId, itId, applicationId, status) {
        if (!companyId || !itId || !applicationId) {
            throw new Error("Company ID, Industrial Training ID, and Application ID are required");
        }

        try {
            const applicationRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId,
                this.applicationsSubcollection,
                applicationId
            );

            await updateDoc(applicationRef, {
                applicationStatus: status,
                updatedAt: serverTimestamp()
            });

            //console.log(`Application status updated to: ${status}`);

        } catch (error) {
            console.error("Error updating application status:", error);
            throw error;
        }
    }

    /**
     * Get active industrial training postings
     * @param {string} companyId - The company ID
     * @returns {Promise<IndustrialTraining[]>} Array of active industrial trainings
     */
    async getActivePostings(companyId) {
        if (!companyId) {
            throw new Error("Company ID is required");
        }

        try {
            const allIndustrialTrainings = await this.getCompanyIndustrialTrainings(companyId);
            
            // Filter active postings
            const activePostings = allIndustrialTrainings.filter(it => 
                it.status === 'active' || it.status === 'open'
            );

            // Get application counts for each active posting
            const postingsWithCounts = await Promise.all(
                activePostings.map(async (it) => {
                    const applications = await this.getApplicationsForIndustrialTraining(companyId, it.id);
                    return {
                        ...it,
                        applicantCount: applications.length
                    };
                })
            );

            return postingsWithCounts;

        } catch (error) {
            console.error("Error getting active postings:", error);
            throw error;
        }
    }

    /**
     * Search industrial trainings by title or department
     * @param {string} companyId - The company ID
     * @param {string} searchTerm - Search term
     * @returns {Promise<IndustrialTraining[]>} Array of matching industrial trainings
     */
    async searchIndustrialTrainings(companyId, searchTerm) {
        if (!companyId) {
            throw new Error("Company ID is required");
        }

        try {
            const allIndustrialTrainings = await this.getCompanyIndustrialTrainings(companyId);
            
            if (!searchTerm) {
                return allIndustrialTrainings;
            }

            const lowercaseSearch = searchTerm.toLowerCase();
            
            return allIndustrialTrainings.filter(it => 
                (it.title && it.title.toLowerCase().includes(lowercaseSearch)) ||
                (it.department && it.department.toLowerCase().includes(lowercaseSearch)) ||
                (it.description && it.description.toLowerCase().includes(lowercaseSearch))
            );

        } catch (error) {
            console.error("Error searching industrial trainings:", error);
            throw error;
        }
    }

    /**
     * Get application statistics for a specific industrial training
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @returns {Promise<Object>} Application statistics
     */
    async getApplicationStats(companyId, itId) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        try {
            const applications = await this.getApplicationsForIndustrialTraining(companyId, itId);
            
            const stats = {
                total: applications.length,
                pending: 0,
                underReview: 0,
                accepted: 0,
                rejected: 0,
                hired: 0
            };

            applications.forEach(app => {
                const status = app.applicationStatus?.toLowerCase();
                if (status === 'pending') stats.pending++;
                else if (status === 'under review') stats.underReview++;
                else if (status === 'accepted') stats.accepted++;
                else if (status === 'rejected') stats.rejected++;
                else if (status === 'hired') stats.hired++;
            });

            return stats;

        } catch (error) {
            console.error("Error getting application stats:", error);
            throw error;
        }
    }

    /**
 * Remove an image from the company's galleryImages array in Firestore
 * @param {string} companyId - The company ID
 * @param {string} imageUrl - The image URL to remove
 * @returns {Promise<void>}
 */
async removeImageFromGallery(companyId, imageUrl) {
  if (!companyId || !imageUrl) {
    throw new Error("Company ID and image URL are required");
  }

  try {
    // Reference to the company document
    const companyRef = doc(
      this.db,
      this.usersCollection,
      this.companiesSubcollection,
      this.companiesSubcollection,
      companyId
    );

    // Get current galleryImages
    const companySnap = await getDoc(companyRef);
    if (!companySnap.exists()) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    const data = companySnap.data();
    const currentGallery = Array.isArray(data.galleryImages) ? data.galleryImages : [];

    // Filter out the image to remove
    const updatedGallery = currentGallery.filter(url => url !== imageUrl);

    // Update Firestore document
    await updateDoc(companyRef, {
      galleryImages: updatedGallery,
      updatedAt: serverTimestamp()
    });

    //console.log(`Image removed successfully from gallery of company ${companyId}`);
  } catch (error) {
    console.error("Error removing image from gallery:", error);
    throw error;
  }
}

/**
 * Toggle IT status between open and closed in Firestore
 * @param {string} companyId - The company ID
 * @param {string} itId - The industrial training ID
 * @returns {Promise<string>} The new status after toggling
 */
async toggleITStatus(companyId, itId) {

    if (!companyId || !itId) {
        throw new Error("Company ID and Industrial Training ID are required");
    }

    try {
        // Reference to the specific IT document in Firestore
        const itDocRef = doc(
            this.db,
            this.usersCollection,
            this.companiesSubcollection,
            this.companiesSubcollection,
            companyId,
            this.itSubcollection,
            itId
        );

        // First, get the current document to check the current status
        const itDoc = await getDoc(itDocRef);
        
        if (!itDoc.exists()) {
            throw new Error(`Industrial Training with ID ${itId} not found`);
        }

        const currentData = itDoc.data();
        const currentStatus = currentData.status?.toLowerCase() || 'open';

        // Determine the new status
        let newStatus;
        if (currentStatus === 'open') {
            newStatus = 'closed';
        } else if (currentStatus === 'closed') {
            newStatus = 'open';
        } else {
            // Handle other statuses - if it's not open or closed, default to open
            newStatus = 'open';
        }

        // Update the document in Firestore
        await updateDoc(itDocRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });

        //console.log(`IT ${itId} status updated from ${currentStatus} to ${newStatus} in Firestore`);
        return newStatus;

    } catch (error) {
        console.error("Error toggling IT status in Firestore:", error);
        throw error;
    }
}

/**
 * Set specific IT status in Firestore
 * @param {string} companyId - The company ID
 * @param {string} itId - The industrial training ID
 * @param {string} status - The status to set
 * @returns {Promise<void>}
 */
async setITStatus(companyId, itId, status) {
    if (!companyId || !itId || !status) {
        throw new Error("Company ID, Industrial Training ID, and Status are required");
    }

    try {
        const itDocRef = doc(
            this.db,
            this.usersCollection,
            this.companiesSubcollection,
            this.companiesSubcollection,
            companyId,
            this.itSubcollection,
            itId
        );

        // Direct Firestore update
        await updateDoc(itDocRef, {
            status: status,
            updatedAt: serverTimestamp()
        });

        //console.log(`IT ${itId} status set to: ${status} in Firestore`);

    } catch (error) {
        console.error("Error setting IT status in Firestore:", error);
        throw error;
    }
}

/**
 * Delete a specific field from company profile
 * @param {string} companyId - The company ID
 * @param {string} fieldName - The field name to delete
 * @returns {Promise<void>}
 */
async deleteCompanyField(companyId, fieldName) {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    if (!fieldName || typeof fieldName !== 'string') {
        throw new Error("Field name is required and must be a string");
    }

    try {
        const companyRef = doc(
            this.db, 
            this.usersCollection, 
            this.companiesSubcollection, 
            this.companiesSubcollection, 
            companyId
        );

        // Use FieldValue.delete() to remove the field
        await updateDoc(companyRef, {
            [fieldName]: deleteField(), // This removes the field entirely
            updatedAt: serverTimestamp()
        });

        //console.log(`Field "${fieldName}" deleted successfully from company ${companyId}`);

    } catch (error) {
        console.error(`Error deleting field "${fieldName}":`, error);
        throw error;
    }
}


/**
 * Remove a specific value from an array field in company profile
 * @param {string} companyId - The company ID
 * @param {string} arrayFieldName - The array field name (e.g., 'galleryImages', 'forms')
 * @param {*} valueToRemove - The value to remove from the array
 * @returns {Promise<void>}
 */
async removeValueFromCompanyArray(companyId, arrayFieldName, valueToRemove) {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    if (!arrayFieldName || typeof arrayFieldName !== 'string') {
        throw new Error("Array field name is required and must be a string");
    }

    try {
        const companyRef = doc(
            this.db, 
            this.usersCollection, 
            this.companiesSubcollection, 
            this.companiesSubcollection, 
            companyId
        );

        // Get current company data
        const companySnap = await getDoc(companyRef);
        if (!companySnap.exists()) {
            throw new Error(`Company with ID ${companyId} not found`);
        }

        const data = companySnap.data();
        const currentArray = Array.isArray(data[arrayFieldName]) ? data[arrayFieldName] : [];

        // Filter out the value to remove
        const updatedArray = currentArray.filter(item => item !== valueToRemove);

        // Update the array field
        await updateDoc(companyRef, {
            [arrayFieldName]: updatedArray,
            updatedAt: serverTimestamp()
        });

        //console.log(`Value removed from ${arrayFieldName} for company ${companyId}`);

    } catch (error) {
        console.error(`Error removing value from ${arrayFieldName}:`, error);
        throw error;
    }
}

/**
 * Update a specific value in an array field in company profile
 * @param {string} companyId - The company ID
 * @param {string} arrayFieldName - The array field name
 * @param {*} oldValue - The value to replace
 * @param {*} newValue - The new value
 * @returns {Promise<void>}
 */
async updateValueInCompanyArray(companyId, arrayFieldName, oldValue, newValue) {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    if (!arrayFieldName || typeof arrayFieldName !== 'string') {
        throw new Error("Array field name is required and must be a string");
    }

    try {
        const companyRef = doc(
            this.db, 
            this.usersCollection, 
            this.companiesSubcollection, 
            this.companiesSubcollection, 
            companyId
        );

        // Get current company data
        const companySnap = await getDoc(companyRef);
        if (!companySnap.exists()) {
            throw new Error(`Company with ID ${companyId} not found`);
        }

        const data = companySnap.data();
        const currentArray = Array.isArray(data[arrayFieldName]) ? data[arrayFieldName] : [];

        // Replace the old value with new value
        const updatedArray = currentArray.map(item => 
            item === oldValue ? newValue : item
        );

        // Update the array field
        await updateDoc(companyRef, {
            [arrayFieldName]: updatedArray,
            updatedAt: serverTimestamp()
        });

        //console.log(`Value updated in ${arrayFieldName} for company ${companyId}`);

    } catch (error) {
        console.error(`Error updating value in ${arrayFieldName}:`, error);
        throw error;
    }
}

/**
 * Delete multiple fields from company profile
 * @param {string} companyId - The company ID
 * @param {string[]} fieldNames - Array of field names to delete
 * @returns {Promise<void>}
 */
async deleteMultipleCompanyFields(companyId, fieldNames) {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    if (!Array.isArray(fieldNames) || fieldNames.length === 0) {
        throw new Error("Field names array is required and must not be empty");
    }

    try {
        const companyRef = doc(
            this.db, 
            this.usersCollection, 
            this.companiesSubcollection, 
            this.companiesSubcollection, 
            companyId
        );

        // Create update object with deleteField() for each field
        const updateData = {
            updatedAt: serverTimestamp()
        };

        fieldNames.forEach(fieldName => {
            if (typeof fieldName === 'string') {
                updateData[fieldName] = deleteField();
            }
        });

        await updateDoc(companyRef, updateData);

        //console.log(`Fields [${fieldNames.join(', ')}] deleted successfully from company ${companyId}`);

    } catch (error) {
        console.error(`Error deleting fields [${fieldNames.join(', ')}]:`, error);
        throw error;
    }
}

/**
 * Remove a specific URL from the forms array in company profile
 * @param {string} companyId - The company ID
 * @param {string} urlToRemove - The URL to remove from forms array
 * @returns {Promise<void>}
 */
async removeFormUrl(companyId, urlToRemove) {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    if (!urlToRemove) {
        throw new Error("URL to remove is required");
    }

    try {
        const companyRef = doc(
            this.db, 
            this.usersCollection, 
            this.companiesSubcollection, 
            this.companiesSubcollection, 
            companyId
        );

        // Get current company data
        const companySnap = await getDoc(companyRef);
        if (!companySnap.exists()) {
            throw new Error(`Company with ID ${companyId} not found`);
        }

        const data = companySnap.data();
        const currentForms = Array.isArray(data.form) ? data.form : [];
          //console.log("forms is "+JSON.stringify(currentForms));
        // Filter out the URL to remove
        const updatedForms = currentForms.filter(url => url !== urlToRemove);

        // Update the forms array
        await updateDoc(companyRef, {
            form: updatedForms,
            updatedAt: serverTimestamp()
        });

        //console.log(`URL removed from forms array for company ${companyId}`);

    } catch (error) {
        console.error("Error removing URL from forms array:", error);
        throw error;
    }
}

async removeFileFromIT(companyId, itId, urlToRemove) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        if (!urlToRemove) {
            throw new Error("URL to remove is required");
        }

        try {
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            // Get current IT data
            const itDoc = await getDoc(itDocRef);
            if (!itDoc.exists()) {
                throw new Error(`Industrial Training with ID ${itId} not found`);
            }

            const data = itDoc.data();
            const currentFiles = Array.isArray(data.attachedFiles) ? data.attachedFiles : [];

            // Filter out the URL to remove
            const updatedFiles = currentFiles.filter(url => url !== urlToRemove);

            // Update the attachedFiles array
            await updateDoc(itDocRef, {
                attachedFiles: updatedFiles,
                updatedAt: serverTimestamp()
            });

            //console.log(`URL removed from attachedFiles for IT ${itId}`);

        } catch (error) {
            console.error("Error removing URL from IT attachedFiles:", error);
            throw error;
        }
    }

    /**
     * Remove a specific URL from any array field in an IT document
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @param {string} arrayFieldName - The array field name (e.g., 'attachedFiles', 'documents')
     * @param {string} urlToRemove - The URL to remove from the array
     * @returns {Promise<void>}
     */
    async removeUrlFromITArray(companyId, itId, arrayFieldName, urlToRemove) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        if (!arrayFieldName || !urlToRemove) {
            throw new Error("Array field name and URL to remove are required");
        }

        try {
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            // Get current IT data
            const itDoc = await getDoc(itDocRef);
            if (!itDoc.exists()) {
                throw new Error(`Industrial Training with ID ${itId} not found`);
            }

            const data = itDoc.data();
            const currentArray = Array.isArray(data[arrayFieldName]) ? data[arrayFieldName] : [];

            // Filter out the URL to remove
            const updatedArray = currentArray.filter(url => url !== urlToRemove);

            // Update the array field
            await updateDoc(itDocRef, {
                [arrayFieldName]: updatedArray,
                updatedAt: serverTimestamp()
            });

            //console.log(`URL removed from ${arrayFieldName} for IT ${itId}`);

        } catch (error) {
            console.error(`Error removing URL from IT ${arrayFieldName}:`, error);
            throw error;
        }
    }

    /**
     * Clear all files from attachedFiles array in an IT document
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @returns {Promise<void>}
     */
    async clearITFiles(companyId, itId) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        try {
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            // Set attachedFiles to empty array
            await updateDoc(itDocRef, {
                attachedFiles: [],
                updatedAt: serverTimestamp()
            });

            //console.log(`All files cleared from IT ${itId}`);

        } catch (error) {
            console.error("Error clearing IT files:", error);
            throw error;
        }
    }

    /**
     * Delete a specific field from an IT document
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @param {string} fieldName - The field name to delete
     * @returns {Promise<void>}
     */
    async deleteITField(companyId, itId, fieldName) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        if (!fieldName || typeof fieldName !== 'string') {
            throw new Error("Field name is required and must be a string");
        }

        try {
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            // Use deleteField() to remove the field
            await updateDoc(itDocRef, {
                [fieldName]: deleteField(),
                updatedAt: serverTimestamp()
            });

            //console.log(`Field "${fieldName}" deleted from IT ${itId}`);

        } catch (error) {
            console.error(`Error deleting field "${fieldName}" from IT:`, error);
            throw error;
        }
    }

    /**
     * Update a specific URL in an IT document array field
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @param {string} arrayFieldName - The array field name
     * @param {string} oldUrl - The URL to replace
     * @param {string} newUrl - The new URL
     * @returns {Promise<void>}
     */
    async updateUrlInITArray(companyId, itId, arrayFieldName, oldUrl, newUrl) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        if (!arrayFieldName || !oldUrl || !newUrl) {
            throw new Error("Array field name, old URL, and new URL are required");
        }

        try {
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            // Get current IT data
            const itDoc = await getDoc(itDocRef);
            if (!itDoc.exists()) {
                throw new Error(`Industrial Training with ID ${itId} not found`);
            }

            const data = itDoc.data();
            const currentArray = Array.isArray(data[arrayFieldName]) ? data[arrayFieldName] : [];

            // Replace the old URL with new URL
            const updatedArray = currentArray.map(url => url === oldUrl ? newUrl : url);

            // Update the array field
            await updateDoc(itDocRef, {
                [arrayFieldName]: updatedArray,
                updatedAt: serverTimestamp()
            });

            //console.log(`URL updated in ${arrayFieldName} for IT ${itId}`);

        } catch (error) {
            console.error(`Error updating URL in IT ${arrayFieldName}:`, error);
            throw error;
        }
    }

    /**
     * Add a URL to the attachedFiles array in an IT document
     * @param {string} companyId - The company ID
     * @param {string} itId - The industrial training ID
     * @param {string} newUrl - The URL to add
     * @returns {Promise<void>}
     */
    async addFileToIT(companyId, itId, newUrl) {
        if (!companyId || !itId) {
            throw new Error("Company ID and Industrial Training ID are required");
        }

        if (!newUrl) {
            throw new Error("URL to add is required");
        }

        try {
            const itDocRef = doc(
                this.db,
                this.usersCollection,
                this.companiesSubcollection,
                this.companiesSubcollection,
                companyId,
                this.itSubcollection,
                itId
            );

            // Get current IT data
            const itDoc = await getDoc(itDocRef);
            if (!itDoc.exists()) {
                throw new Error(`Industrial Training with ID ${itId} not found`);
            }

            const data = itDoc.data();
            const currentFiles = Array.isArray(data.attachedFiles) ? data.attachedFiles : [];

            // Add the new URL (avoid duplicates)
            const updatedFiles = currentFiles.includes(newUrl) 
                ? currentFiles 
                : [...currentFiles, newUrl];

            // Update the attachedFiles array
            await updateDoc(itDocRef, {
                attachedFiles: updatedFiles,
                updatedAt: serverTimestamp()
            });

            //console.log(`URL added to attachedFiles for IT ${itId}`);

        } catch (error) {
            console.error("Error adding URL to IT attachedFiles:", error);
            throw error;
        }
    }

    /**
 * Submit a new industrial training application
 * @param {string} companyId - The company ID
 * @param {string} itId - The industrial training ID
 * @param {Object} applicationData - The application data
 * @returns {Promise<string>} The ID of the created application
 */
async submitITApplication(companyId, itId, applicationData) {
    if (!companyId || !itId) {
        throw new Error("Company ID and Industrial Training ID are required");
    }

    try {
        const applicationsRef = collection(
            this.db,
            this.usersCollection,
            this.companiesSubcollection,
            this.companiesSubcollection,
            companyId,
            this.itSubcollection,
            itId,
            this.applicationsSubcollection
        );

        // Nuclear option: Convert everything to plain objects using JSON
        // This will remove any custom class instances
        const safeData = JSON.parse(JSON.stringify(applicationData));
        
        const applicationDoc = {
            ...safeData,
            applicationDate: serverTimestamp(),
            applicationStatus: 'pending',
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(applicationsRef, applicationDoc);
        
        // Get IT document and update application count
        const itDoc = await this.getIndustrialTrainingById(companyId, itId);
        
        // Update application count
        await this.updateApplicationCount(companyId, itId, itDoc.applicationsCount || 0);
        
        console.log("IT Application submitted with ID:", docRef.id);
        
        return docRef.id;

    } catch (error) {
        console.error("Error submitting IT application:", error);
        throw error;
    }
}

async updateApplicationCount(companyId, itId, currentCount) {
    const itRef = doc(
        this.db,
        this.usersCollection,
        this.companiesSubcollection,
        this.companiesSubcollection,
        companyId,
        this.itSubcollection,
        itId
    );
    
    await updateDoc(itRef, {
        applicationsCount: currentCount + 1,
        updatedAt: serverTimestamp()
    });
}
/**
 * Get a specific application by ID
 * @param {string} companyId - The company ID
 * @param {string} itId - The industrial training ID
 * @param {string} applicationId - The application ID
 * @returns {Promise<StudentApplication|null>} Application object or null if not found
 */
async getApplicationById(companyId, itId, applicationId) {
    if (!companyId || !itId || !applicationId) {
        throw new Error("Company ID, Industrial Training ID, and Application ID are required");
    }

    try {
        const applicationRef = doc(
            this.db,
            this.usersCollection,
            this.companiesSubcollection,
            this.companiesSubcollection,
            companyId,
            this.itSubcollection,
            itId,
            this.applicationsSubcollection,
            applicationId
        );
        
        //console.log(" Application reference path:", applicationRef.path);
        
        const applicationDoc = await getDoc(applicationRef);
        //console.log(" Document exists:", applicationDoc.exists());
        //console.log(" Document ID:", applicationDoc.id);
        
        if (applicationDoc.exists()) {

            const data = applicationDoc.data();
              data.student = await new StudentCloudDB().getStudentById(data.student.uid);

            //console.log(" Fetching industrial training data...");
            const industrialTraining = await this.getIndustrialTrainingById(companyId, itId);
            
            
            const studentApp = new StudentApplication({
                id: applicationDoc.id,
                student: data.student,
                internship: industrialTraining, // ← FIX THIS LINE
                applicationStatus: data.applicationStatus || 'pending',
                applicationDate: data.applicationDate?.toDate?.() || data.applicationDate,
                applicationFiles: data.applicationFiles || {},
                coverLetter: data.coverLetter || "",
                resumeURL: data.resumeURL || "",
                duration: data.duration
            });

           
            
            return studentApp;
        } else {
            console.warn(" Application document does NOT exist!");
            return null;
        }

    } catch (error) {
        console.error(" Error getting application by ID:", error);
        throw error;
    }
}

/**
 * Send notification to a student
 * @param {string} studentUid - The student UID
 * @param {Object} notificationData - The notification data
 * @returns {Promise<Object>} Result object with success status and ID
 */
async sendNotificationToStudent(studentUid, notificationData) {
    if (!studentUid) {
        throw new Error("Student UID is required");
    }

    if (!notificationData || !notificationData.message) {
        throw new Error("Notification data with message is required");
    }

    try {
        const notificationsRef = collection(
            this.db,
            this.usersCollection,
            "students",
            "students", 
            studentUid,
            "notifications"
        );

        await auth.authStateReady();
        const notification = {
            status: notificationData.title || "New Message",
            message: notificationData.message,
            timestamp: serverTimestamp(), // Use server timestamp for consistency with your other methods
            type: notificationData.type || "general",
            read: false,
            senderId : auth.currentUser.uid,
            ...notificationData
        };

        const docRef = await addDoc(notificationsRef, notification);
        
        //console.log(`Notification sent to student ${studentUid}`);
        return { 
            success: true, 
            id: docRef.id 
        };

    } catch (error) {
        console.error("Error sending notification:", error);
        throw error;
    }
}

/**
 * Get all applications for the current company across all industrial trainings
 * @param {string} companyId - The company ID
 * @returns {Promise<Array>} Array of application objects with training info
 */
async getAllCompanyApplications(companyId) {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    try {
        const allApplications = [];
        const industrialTrainings = await this.getCompanyIndustrialTrainings(companyId);

        // Get applications from all industrial trainings
        for (const it of industrialTrainings) {
            try {
                const applications = await this.getApplicationsForIndustrialTraining(companyId, it.id);
                
                // Add each application with its training info
                applications.forEach(application => {
                    allApplications.push({
                        application: application, // The StudentApplication instance
                        opportunity: it.title,
                        opportunityId: it.id,
                        training: it
                    });
                });
            } catch (error) {
                console.error(`Error getting applications for IT ${it.id}:`, error);
                // Continue with other industrial trainings even if one fails
            }
        }

        return allApplications;

    } catch (error) {
        console.error("Error getting all company applications:", error);
        throw error;
    }
}


/**
 * Delete an application from Firestore
 * @param {string} companyId - The company ID
 * @param {string} itId - The industrial training ID
 * @param {string} applicationId - The application ID to delete
 * @returns {Promise<void>}
 */
async deleteCompanyApplication(companyId, itId, applicationId) {
    if (!companyId || !itId || !applicationId) {
        throw new Error("Company ID, Industrial Training ID, and Application ID are required");
    }

    try {
        const applicationRef = doc(
            this.db,
            this.usersCollection,
            this.companiesSubcollection,
            this.companiesSubcollection,
            companyId,
            this.itSubcollection,
            itId,
            this.applicationsSubcollection,
            applicationId
        );

        await deleteDoc(applicationRef);
        console.log(`Successfully deleted application ${applicationId} from IT ${itId}`);
        
    } catch (error) {
        console.error("Error deleting application:", error);
        throw error;
    }
}

async updateCompanyApplicationDuration(durationObject, applicationId,itId,sid) {
    await auth.authStateReady();
    const companyId = auth.currentUser.uid;

    if (!companyId || !applicationId || !durationObject) {
        throw new Error("Company ID, Application ID, and duration object are required");
    }

    try {
        const applicationRef = doc(
            this.db,
            this.usersCollection,
            this.companiesSubcollection,
            this.companiesSubcollection,
            companyId,
            'IT',
            itId,
            'applications',
            applicationId

        );

        // First check if document exists
        const docSnap = await getDoc(applicationRef);
        
        if (!docSnap.exists()) {
            throw new Error(`Application ${applicationId} not found`);
        }

        // Update the duration field
        await updateDoc(applicationRef, {
            duration: durationObject
        });

        console.log(`Successfully updated duration for application ${applicationId}`);
        
    } catch (error) {
        console.error("Error updating application duration:", error);
        throw error;
    }
}

}

export { ITBaseCompanyCloud };