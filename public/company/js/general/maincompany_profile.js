import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";
import { Company } from "../../../js/model/Company.js";
import {
  auth,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "../../../js/config/firebaseInit.js";
import { CloudStorage } from "../../../js/fireabase/Cloud_Storage.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";

const itc_firebase_logic = new ITCFirebaseLogic();
const it_based_company_cloud = new ITBaseCompanyCloud();

class MainCompanyProfile {
  constructor() {
    this.company = null;
    this.galleryImages = [];
    this.MAX_IMAGES = 20;
    this.cloudStorage = new CloudStorage();
    this.init();
  }

  async init() {
    try {
      // Wait for Firebase Auth to be ready
      await auth.authStateReady();

      const user = auth.currentUser;
      if (!user) {
        console.warn("No authenticated user found.");
        return;
      }

      // Fetch company data
      const companyData = await itc_firebase_logic.getCompany(user.uid);
      if (!companyData) {
        console.warn("No company found for this user.");
        return;
      }

      // Map Firestore data → Company model
      this.company = Company.fromMap(companyData);

      // Render the data into the DOM
      this.renderCompanyProfile();
      this.setupGalleryEventListeners();
    } catch (error) {
      console.error("Error loading company profile:", error);
    }
  }

  renderCompanyProfile() {
    const c = this.company;
    if (!c) return;

    // Company name, tagline, and contact info
    this.setText("companyName", c.name || "No Name Provided");
    this.setText("companyIndustry", c.industry || "Not specified");
    this.setText("companyLocation", c.getDisplayLocation());
    this.setText("companyPhone", c.phoneNumber || "N/A");
    this.setText("companyTagline", c.description || "No description available");
    this.setHref(
      "companyWebsite",
      c.website,
      "🌐 " + (c.website || "No Website")
    );
    this.setHref(
      "companyEmail",
      `mailto:${c.email}`,
      "✉ " + (c.email || "No Email")
    );

    // Company Logo
    this.setImage(
      "companyLogo",
      c.logoURL || "https://via.placeholder.com/150"
    );

    // Gallery images
    ////console.log("images " + c.galleryImages);
    this.setGalleryImages(c.galleryImages || []);

    // Simulate profile completion based on filled fields
    const completion = this.calculateProfileCompletion(c);
    this.setProfileProgress(completion);

    const editProfilebtn = document.getElementById("editProfileButton");
    editProfilebtn.addEventListener("click", () => {
      window.location.href = "maincompany_profile_edit.html";
    });
  }

  setupGalleryEventListeners() {
    const galleryUpload = document.getElementById("galleryUpload");
    const galleryAddButton = document.getElementById("galleryAddButton");

    if (galleryUpload) {
      galleryUpload.addEventListener("change", (e) =>
        this.handleGalleryUpload(e)
      );
    }

    if (galleryAddButton) {
      galleryAddButton.addEventListener("click", () => {
        if (this.galleryImages.length < this.MAX_IMAGES) {
          document.getElementById("galleryUpload").click();
        }
      });
    }
  }

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  setHref(id, href, text) {
    const el = document.getElementById(id);
    if (el) {
      el.href = href || "#";
      el.textContent = text;
    }
  }

  setImage(id, src) {
    const el = document.getElementById(id);
    if (el) {
      el.src = src;
      el.onload = () => el.classList.remove("opacity-0");
    }
  }

  setGalleryImages(images) {
    this.galleryImages = images.map((url, index) => ({
      url,
      name: `Gallery Image ${index + 1}`,
      timestamp: new Date().toISOString(),
    }));

    this.renderGallery();
  }

  renderGallery() {
    const container = document.getElementById("galleryContainer");
    const countElement = document.getElementById("galleryCount");

    if (!container) return;

    // Clear existing images (except the add button)
    const addButton = document.getElementById("galleryAddButton");
    container.innerHTML = "";
    if (addButton) container.appendChild(addButton);

    // Add gallery images
    this.galleryImages.forEach((image, index) => {
      const galleryItem = document.createElement("div");
      galleryItem.className =
        "gallery-item aspect-square rounded-lg bg-center bg-cover overflow-hidden relative";
      galleryItem.style.backgroundImage = `url('${image.url}')`;

      // Add remove button
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "×";
      removeBtn.onclick = async (e) => {
        e.stopPropagation();

        // Optional: show visual feedback while deleting
        removeBtn.disabled = true;
        removeBtn.textContent = "…";

        try {
          await it_based_company_cloud.removeImageFromGallery(
            this.company.id,
            image.url
          );

          // Remove locally
          this.galleryImages.splice(index, 1);
          this.renderGallery();

          // Show success feedback
          this.showToast("Image deleted successfully ", "success");
        } catch (error) {
          console.error("Error removing image:", error);
          this.showToast("Failed to delete image ", "error");
        } finally {
          removeBtn.disabled = false;
          removeBtn.textContent = "×";
        }
      };

      galleryItem.appendChild(removeBtn);
      container.insertBefore(galleryItem, addButton);
    });

    // Update count
    if (countElement) {
      countElement.textContent = `${this.galleryImages.length} image${
        this.galleryImages.length !== 1 ? "s" : ""
      }`;
    }

    // Disable add button if max reached
    if (addButton) {
      if (this.galleryImages.length >= this.MAX_IMAGES) {
        addButton.classList.add("opacity-50", "cursor-not-allowed");
      } else {
        addButton.classList.remove("opacity-50", "cursor-not-allowed");
      }
    }
  }

  async removeGalleryImage(index) {
    const imageToRemove = this.galleryImages[index];

    try {
      // Delete the image from Firebase Storage
      await this.cloudStorage.deleteFile(imageToRemove.url);
      ////console.log("Image deleted from storage:", imageToRemove.name);
    } catch (error) {
      console.error("Error deleting image from storage:", error);
      // Continue with removal from gallery even if storage deletion fails
    }

    // Remove from local array
    this.galleryImages.splice(index, 1);

    this.renderGallery();
  }

  showToast(message, type = "info") {
    const existingToast = document.querySelector(".custom-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = `custom-toast fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg text-white text-sm transition-all duration-300 opacity-0 ${
      type === "success"
        ? "bg-green-600"
        : type === "error"
        ? "bg-red-600"
        : "bg-gray-800"
    }`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => (toast.style.opacity = "1"), 100);

    // Fade out and remove after 3s
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async handleGalleryUpload(event) {
    const files = Array.from(event.target.files);
    const remainingSlots = this.MAX_IMAGES - this.galleryImages.length;

    if (files.length > remainingSlots) {
      alert(
        `You can only upload ${remainingSlots} more image${
          remainingSlots !== 1 ? "s" : ""
        }.`
      );
      files.splice(remainingSlots);
    }

    // Show loading state
    const addButton = document.getElementById("galleryAddButton");
    if (addButton) {
      addButton.classList.add("opacity-50", "cursor-not-allowed");
      addButton.innerHTML = '<span class="animate-pulse">Uploading...</span>';
    }

    const uploadedImages = [];

    try {
      // Process each file
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          try {
            ////console.log(`Uploading image: ${file.name}`);

            // Upload to Firebase Storage using CloudStorage class
            const imageUrl = await this.uploadImageToStorage(file);

            if (imageUrl) {
              uploadedImages.push({
                url: imageUrl,
                name: file.name,
                timestamp: new Date().toISOString(),
              });
              ////console.log(`Successfully uploaded: ${file.name}`);
            } else {
              console.error(`Failed to upload: ${file.name}`);
              alert(`Failed to upload ${file.name}. Please try again.`);
            }
          } catch (error) {
            console.error(`Error uploading image ${file.name}:`, error);
            alert(`Failed to upload ${file.name}. Please try again.`);
          }
        } else {
          alert(`Skipped ${file.name}: Only image files are allowed.`);
        }
      }

      // Add uploaded images to gallery
      this.galleryImages.push(...uploadedImages);

      // Update gallery in Firebase Firestore
      if (this.company && uploadedImages.length > 0) {
        try {
          const newImageUrls = uploadedImages.map((img) => img.url);
          await this.addImagesToGallery(newImageUrls);

          ////console.log("Gallery updated in Firestore with new images");
        } catch (error) {
          console.error("Error updating gallery in Firebase:", error);
          alert(
            "Images uploaded but failed to save to profile. Please try again."
          );
        }
      }

      this.renderGallery();

      if (uploadedImages.length > 0) {
        ////console.log(`Successfully uploaded ${uploadedImages.length} image(s)`);
      }
    } catch (error) {
      console.error("Error in gallery upload process:", error);
      alert("An error occurred during upload. Please try again.");
    } finally {
      // Reset UI state
      if (addButton) {
        addButton.classList.remove("opacity-50", "cursor-not-allowed");
        addButton.innerHTML = `
          <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span class="text-sm text-center px-2">Add Images</span>
          <span class="text-xs text-gray-400 mt-1">Multiple allowed</span>
        `;
      }

      // Reset file input
      event.target.value = "";
    }
  }

  async uploadImageToStorage(file) {
    try {
      // Use the CloudStorage class to upload the file
      const downloadUrl = await this.cloudStorage.uploadFile(
        file,
        this.company.uid,
        "company-gallery"
      );

      if (!downloadUrl) {
        throw new Error("Upload failed - no download URL returned");
      }

      return downloadUrl;
    } catch (error) {
      console.error("Error in uploadImageToStorage:", error);
      throw error;
    }
  }

  async uploadMultipleImagesToStorage(files) {
    try {
      // Use the batch upload method from CloudStorage
      const results = await this.cloudStorage.uploadMultipleFiles(
        files,
        this.company.uid,
        "company-gallery"
      );

      // Filter out failed uploads and return successful ones
      return results
        .filter((result) => result.url !== null)
        .map((result) => ({
          url: result.url,
          name: result.file.name,
          timestamp: new Date().toISOString(),
        }));
    } catch (error) {
      console.error("Error in uploadMultipleImagesToStorage:", error);
      return [];
    }
  }

  setProfileProgress(percent) {
    const bar = document.querySelector("#companyProfileProgress div");
    if (bar) bar.style.width = `${percent}%`;
  }

  calculateProfileCompletion(c) {
    const totalFields = 8;
    let filled = 0;

    if (c.name) filled++;
    if (c.email) filled++;
    if (c.industry) filled++;
    if (c.address || c.localGovernment || c.state) filled++;
    if (c.phoneNumber) filled++;
    if (c.website) filled++;
    if (c.logoURL) filled++;
    if (c.description) filled++;

    return Math.round((filled / totalFields) * 100);
  }

  // Utility method to validate image files before upload
  validateImageFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error:
          "Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.",
      };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: "File too large. Maximum size is 5MB." };
    }

    return { isValid: true, error: null };
  }

  // Method to handle bulk image validation
  validateImageFiles(files) {
    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      const validation = this.validateImageFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    return { validFiles, errors };
  }

  /**
   * @param {string} imageUrl - The URL of the uploaded image
   */
  async addImagesToGallery(imageUrls) {
      if(imageUrls.length > 1)
      {
        ////console.log("image length "+imageUrls.length);
        return;
      }
    if (!this.company || !imageUrls || !imageUrls.length) {
      console.error("Cannot add images: missing company or image URLs");
      return;
    }

    try {
      const companyRef = this.company.id
        ? doc(
            it_based_company_cloud.db,
            it_based_company_cloud.usersCollection,
            it_based_company_cloud.companiesSubcollection,
            it_based_company_cloud.companiesSubcollection,
            this.company.id
          )
        : null;

      if (!companyRef) {
        throw new Error("Invalid company reference");
      }

      // Update Firestore with all images at once
      await updateDoc(companyRef, {
        galleryImages: arrayUnion(...imageUrls), // Spread the array
        updatedAt: serverTimestamp(),
      });

      this.renderGallery();
      this.showToast("Images added successfully!", "success");
      ////console.log("Images added to gallery successfully:", imageUrls);
    } catch (error) {
      console.error("Error adding images to gallery:", error);
      this.showToast("Failed to add images to gallery", "error");
    }
  }
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  new MainCompanyProfile();
});
