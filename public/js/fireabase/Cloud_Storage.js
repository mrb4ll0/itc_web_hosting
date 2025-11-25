// firebaseUploader.js
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  auth,
  firebaseApp 
} from "../../js/config/firebaseInit.js";

export class CloudStorage {
  constructor() {
    this.storage = getStorage();
  }

  /**
   * Upload a local file (image/video/pdf) to Firebase Storage
   * @param {File} file - The file to upload
   * @param {string} userId - User ID for organizing files
   * @param {string} category - Category for file organization
   * @returns {Promise<string|null>} Download URL or null if failed
   */
  async uploadFile(file, userId, category) {
    try {
      const originalName = file.name;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${originalName}`;

      // Human-readable path
      const readablePath = `uploads/${userId}/${category}/${fileName}`;
      const storageRef = ref(this.storage, readablePath);

      //console.log(`Uploading file: ${originalName} to ${readablePath}`);

      const uploadTask = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadTask.ref);

      //console.log("File uploaded successfully:", downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      console.error("Stack trace:", error.stack);
      return null;
    }
  }

  /**
   * Upload from a public file URL by downloading and then uploading
   * @param {string} fileUrl - Public URL of the file to upload
   * @param {string} [userId] - Optional user ID for organization
   * @param {string} [category] - Optional category for organization
   * @returns {Promise<string|null>} Download URL or null if failed
   */
  async uploadFromUrl(fileUrl, userId = "system", category = "from_url") {
    try {
      //console.log(`Uploading from URL: ${fileUrl}`);

      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();

      // Extract filename from URL or use timestamp
      const urlObj = new URL(fileUrl);
      const fileName = urlObj.pathname.split("/").pop() || `file_${Date.now()}`;
      const timestamp = Date.now();
      const finalFileName = `${timestamp}_${fileName}`;

      const readablePath = `uploads/${userId}/${category}/${finalFileName}`;
      const storageRef = ref(this.storage, readablePath);

      const uploadTask = await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(uploadTask.ref);

      //console.log("File uploaded from URL successfully:", downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading from URL:", error);
      return null;
    }
  }

  /**
   * Delete a file from Firebase Storage
   * @param {string} fileUrl - The download URL of the file to delete
   * @returns {Promise<boolean>} True if successful, false if failed
   */
  async deleteFile(fileUrl) {
    try {
      const storageRef = ref(this.storage, fileUrl);
      await deleteObject(storageRef);
      //console.log("File deleted successfully:", fileUrl);
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  /**
   * Upload multiple files at once
   * @param {File[]} files - Array of files to upload
   * @param {string} userId - User ID for organizing files
   * @param {string} category - Category for file organization
   * @returns {Promise<Array<{file: File, url: string|null}>>} Array of upload results
   */
  async uploadMultipleFiles(givnefiles, userId, category) {
    try {
         //console.log("givenFiles is id card "+JSON.stringify(givnefiles.idCard));
         //console.log("givenFiles is training letter "+JSON.stringify(givnefiles.trainingLetter));
         //console.log("givenFiles is form "+JSON.stringify(givnefiles.applicationForms));
      const files = Array.isArray(givnefiles)
        ? givnefiles
        : Object.values(givnefiles).filter((file) => file !== null);
      const uploadPromises = files.map((file) =>
        this.uploadFile(file, userId, category)
          .then((url) => ({ file, url }))
          .catch((error) => {
            console.error(`Error uploading ${file.name}:`, error);
            return { file, url: null };
          })
      );

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error("Error in batch upload:", error);
      return files.map((file) => ({ file, url: null }));
    }
  }

  /**
   * Get file metadata (size, type, etc.)
   * @param {string} fileUrl - The download URL of the file
   * @returns {Promise<Object|null>} File metadata or null if failed
   */
  async getFileMetadata(fileUrl) {
    try {
      const storageRef = ref(this.storage, fileUrl);
      const metadata = await storageRef.getMetadata();
      return metadata;
    } catch (error) {
      console.error("Error getting file metadata:", error);
      return null;
    }
  }

  /**
   * Upload file with progress tracking
   * @param {File} file - The file to upload
   * @param {string} userId - User ID for organizing files
   * @param {string} category - Category for file organization
   * @param {function} onProgress - Callback for progress updates (0-100)
   * @returns {Promise<string|null>} Download URL or null if failed
   */
  async uploadFileWithProgress(file, userId, category, onProgress) {
    try {
      const originalName = file.name;
      const timestamp = Date.now();
      const fileName = `${timestamp}_${originalName}`;
      const readablePath = `uploads/${userId}/${category}/${fileName}`;
      const storageRef = ref(this.storage, readablePath);

      // For progress tracking, we need to use the upload task with event listeners
      const uploadTask = uploadBytes(storageRef, file);

      // Note: The modular SDK doesn't have built-in progress tracking in v9+
      // We'll simulate progress or use a different approach
      if (onProgress) {
        // Simulate progress (this is a limitation of modular SDK)
        // In real implementation, you might want to use the compat version or a different approach
        const interval = setInterval(() => {
          // This is a simulation - actual progress tracking requires different approach
          onProgress(50); // Simulate 50% progress
        }, 500);

        try {
          const snapshot = await uploadTask;
          clearInterval(interval);
          if (onProgress) onProgress(100);

          const downloadUrl = await getDownloadURL(snapshot.ref);
          return downloadUrl;
        } catch (error) {
          clearInterval(interval);
          throw error;
        }
      } else {
        const snapshot = await uploadTask;
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
      }
    } catch (error) {
      console.error("Error uploading file with progress:", error);
      return null;
    }
  }

  /**
   * Check if a file exists in storage
   * @param {string} filePath - The storage path to check
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(filePath) {
    try {
      const storageRef = ref(this.storage, filePath);
      await getDownloadURL(storageRef); // Will throw if file doesn't exist
      return true;
    } catch (error) {
      if (error.code === "storage/object-not-found") {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate a signed URL with expiration (if needed)
   * @param {string} fileUrl - The download URL of the file
   * @param {number} expiresIn - Expiration time in seconds (default 1 hour)
   * @returns {Promise<string|null>} Signed URL or null if failed
   */
  async getSignedUrl(fileUrl, expiresIn = 3600) {
    try {
      // Note: Signed URLs typically require backend implementation
      // This is a placeholder - you'd need to implement this on your server
      console.warn("Signed URLs require backend implementation");
      return fileUrl; // Return original URL as fallback
    } catch (error) {
      console.error("Error generating signed URL:", error);
      return null;
    }
  }

  /**
   * Upload files and update application in one method
   */
  async uploadAndUpdateApplication(
    application,
    filesToUpload,
    userId,
    category
  ) {
    try {
      // Upload files using your existing method
      //console.log("files to upload "+JSON.stringify(filesToUpload));
      
      const uploadResults = await this.uploadMultipleFiles(
        filesToUpload,
        userId,
        category
      );
      //console.log("uploadResults "+JSON.stringify(uploadResults));
       return;
      // Process results and update application
      this.processUploadResults(application, uploadResults);

      return application;
    } catch (error) {
      console.error("Error uploading and updating application:", error);
      throw error;
    }
  }

  
  
  async  uploadFilesToStorage(uploadedFiles = {}, student = {}) {
  try {
    // 🔐 VERIFY AUTHENTICATION FIRST
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('User not authenticated. Please log in again.');
    }

    //console.log(' User authenticated:', currentUser.uid);
    
    // Use the already initialized firebaseApp from your init file
    const storage = getStorage(firebaseApp);

    const timestamp = Date.now();
    const uploadResults = [];

    // Upload single file with metadata
    async function uploadOne(file, fieldName = "unknown") {
      if (!file || !(file instanceof File)) {
        console.warn("Skipping invalid file for field:", fieldName, file);
        return {
          file,
          url: null,
          field: fieldName,
          error: "Invalid file"
        };
      }

      try {
        // Use the exact same path structure as the working uploadFromUrl method
        const safeName = file.name.replace(/\s+/g, "_");
        const finalFileName = `${timestamp}_${safeName}`;
        
        // Match the working pattern: uploads/${userId}/${category}/${fileName}
        const readablePath = `uploads/${currentUser.uid}/it_applications/${finalFileName}`;
        const storageRef = ref(storage, readablePath);

        //console.log(` Uploading file: ${file.name} → ${readablePath}`);
        //console.log(` Authenticated as: ${currentUser.uid}`);
        
        // Upload the file
        const uploadTask = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(uploadTask.ref);
        
        //console.log(` Uploaded: ${file.name} → ${downloadUrl}`);

        return {
          file,
          url: downloadUrl,
          field: fieldName,
          error: null
        };
      } catch (err) {
        console.error(`❌ Error uploading ${file?.name} for field ${fieldName}:`, err);
        
        return {
          file,
          url: null,
          field: fieldName,
          error: err.message || err,
        };
      }
    }

    // Upload each known category
    const uploadPromises = [];
    
    if (uploadedFiles.idCard) {
      uploadPromises.push(uploadOne(uploadedFiles.idCard, "idCard"));
    }
    
    if (uploadedFiles.trainingLetter) {
      uploadPromises.push(uploadOne(uploadedFiles.trainingLetter, "trainingLetter"));
    }
    
    if (uploadedFiles.resume) {
      uploadPromises.push(uploadOne(uploadedFiles.resume, "resume"));
    }
    
    if (uploadedFiles.coverLetter) {
      uploadPromises.push(uploadOne(uploadedFiles.coverLetter, "coverLetter"));
    }

    if (uploadedFiles.applicationForms && Array.isArray(uploadedFiles.applicationForms)) {
      for (const f of uploadedFiles.applicationForms) {
        uploadPromises.push(uploadOne(f, "applicationForms"));
      }
    }

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    uploadResults.push(...results);

    //console.log(" All uploads complete for user:", currentUser.uid);
    //console.log(" Upload results:", uploadResults);
    
    return uploadResults;

  } catch (error) {
    console.error('💥 Upload process failed:', error);
    throw error;
  }
}


 processUploadResults(application, uploadResults = []) {
  let successfulUploads = 0;
  let failedUploads = 0;

  uploadResults.forEach((result) => {
    if (!result) {
      console.warn("Skipping null upload result");
      failedUploads++;
      return;
    }

    // Check if upload was successful
    if (!result.url || result.error) {
      console.warn("Skipping failed upload result:", result);
      failedUploads++;
      return;
    }

    try {
      const field = result.field || "unknown";

      switch (field) {
        case "idCard":
          application.setIdCard(result.url);
          //console.log(" Added ID card:", result.url);
          successfulUploads++;
          break;

        case "trainingLetter":
          application.setTrainingLetter(result.url);
          //console.log(" Added training letter:", result.url);
          successfulUploads++;
          break;

        case "resume":
          application.setResume(result.url);
          //console.log(" Added resume:", result.url);
          successfulUploads++;
          break;

        case "coverLetter":
          application.setCoverLetter(result.url);
          //console.log(" Added cover letter:", result.url);
          successfulUploads++;
          break;

        case "applicationForms":
          application.addApplicationForm(result.url);
          //console.log(" Added application form:", result.url);
          successfulUploads++;
          break;

        default:
          application.addOtherDocument(result.url);
          //console.log("✅ Added other document:", result.url);
          successfulUploads++;
          break;
      }
    } catch (error) {
      console.error("❌ Error processing file result:", error, result);
      failedUploads++;
    }
  });

  console.log(`📊 Processed ${successfulUploads} successful uploads, ${failedUploads} failed uploads`);
  
  if (failedUploads > 0) {
    throw new Error(`${failedUploads} file(s) failed to upload properly`);
  }

  return application;
}

}

// Utility function for file validation
export const FileValidator = {
  /**
   * Validate file type
   * @param {File} file - File to validate
   * @param {string[]} allowedTypes - Array of allowed MIME types
   * @returns {boolean} True if valid
   */
  validateType(file, allowedTypes) {
    return allowedTypes.includes(file.type);
  },

  /**
   * Validate file size
   * @param {File} file - File to validate
   * @param {number} maxSize - Maximum size in bytes
   * @returns {boolean} True if valid
   */
  validateSize(file, maxSize) {
    return file.size <= maxSize;
  },

  /**
   * Validate file dimensions (for images)
   * @param {File} file - Image file to validate
   * @param {number} maxWidth - Maximum width
   * @param {number} maxHeight - Maximum height
   * @returns {Promise<boolean>} True if valid
   */
  async validateDimensions(file, maxWidth, maxHeight) {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve(true); // Not an image, skip dimension check
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve(img.width <= maxWidth && img.height <= maxHeight);
      };
      img.onerror = () => {
        resolve(false);
      };
      img.src = URL.createObjectURL(file);
    });
  },
};

// Default export
export default CloudStorage;
