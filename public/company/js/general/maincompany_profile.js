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
        this.showToast("Please login to view company profile", "error");
        return;
      }

      // Show loading state
      this.showLoading(true);

      // Fetch company data
      const companyData = await itc_firebase_logic.getCompany(user.uid);
      if (!companyData) {
        console.warn("No company found for this user.");
        this.showToast("Company profile not found", "warning");
        this.showLoading(false);
        return;
      }

      // Map Firestore data → Company model
      this.company = Company.fromMap(companyData);

      // Render the data into the DOM
      await this.renderCompanyProfile();
      this.setupEventListeners();
      
      this.showLoading(false);
    } catch (error) {
      console.error("Error loading company profile:", error);
      this.showToast("Failed to load company profile", "error");
      this.showLoading(false);
    }
  }

  async renderCompanyProfile() {
    const c = this.company;
    if (!c) return;

    // Company name, tagline, and contact info
    this.setText("companyName", c.name || "No Name Provided");
    this.setText("companyIndustry", c.industry || "Not specified");
    this.setText("companyLocation", c.getDisplayLocation() || "Not specified");
    this.setText("companyPhone", c.phoneNumber || "Not provided");
    this.setText("companyDescription", c.description || "No description available");
    this.setText("companySize", c.companySize || "Not specified");
    this.setText("registrationNumber", c.registrationNumber || "Not registered");
    
    // Set website and email links
    this.setHref("companyWebsite", c.website, "Website");
    this.setHref("companyEmail", `mailto:${c.email}`, "Email");

    // Set images with fallback
    const defaultLogo = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=400&q=80";
    const defaultBanner = "https://images.unsplash.com/photo-1605902711622-cfb43c4437d4?auto=format&fit=crop&w=1400&q=80";
    
    this.setImage("companyLogo", c.logoURL || defaultLogo);
    this.setImage("companyBanner", c.bannerURL || defaultBanner);

    // Gallery images
    this.setGalleryImages(c.galleryImages || []);

    // Stats and progress
    this.updateStats(c);
    this.updateStatusBadges(c);

    // Format dates
    if (c.updatedAt) {
      this.setText("lastUpdated", new Date(c.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    }

    // Calculate and display registration date (using creation timestamp or current date)
    const registrationDate = c.updatedAt || new Date();
    this.setText("companySince", new Date(registrationDate).getFullYear());

    // Check and update expandable text
    setTimeout(() => this.updateReadMoreButton(), 100);
  }

  updateStats(c) {
    // Calculate profile completion
    const completion = this.calculateProfileCompletion(c);
    this.setText("profileCompletion", `${completion}%`);
    this.setProgressBar("profileCompletionBar", completion);
    
    // Update trainee stats
    const totalTrainees = c.getTotalTrainees();
    const activeTrainees = c.currentTrainees.length;
    const activePercentage = totalTrainees > 0 ? Math.round((activeTrainees / totalTrainees) * 100) : 0;
    
    this.setText("totalTrainees", totalTrainees.toString());
    this.setText("activeTrainees", activeTrainees.toString());
    this.setProgressBar("activeTraineesBar", activePercentage);
    
    // Update other stats
    this.setText("pendingApplications", c.pendingApplications.length.toString());
    this.setText("totalSupervisors", c.supervisors.length.toString());
  }

  updateStatusBadges(c) {
    // Update header status badge
    const statusBadge = document.getElementById("companyStatusBadge");
    if (statusBadge) {
      statusBadge.textContent = c.getStatus();
      statusBadge.className = "status-badge ";
      
      if (c.isApproved) {
        statusBadge.classList.add("status-active");
      } else if (c.isPending) {
        statusBadge.classList.add("status-pending");
      } else if (c.isRejected) {
        statusBadge.classList.add("bg-red-100", "text-red-800", "dark:bg-red-900", "dark:text-red-300");
      }
    }

    // Update verification status
    const verificationStatus = document.getElementById("verificationStatus");
    if (verificationStatus) {
      verificationStatus.textContent = c.isVerified ? "Verified" : "Not Verified";
      verificationStatus.className = "status-badge " + (c.isVerified ? "status-verified" : "status-pending");
    }

    // Update active status
    const activeStatus = document.getElementById("activeStatus");
    if (activeStatus) {
      activeStatus.textContent = c.isActive ? "Active" : "Inactive";
      activeStatus.className = "status-badge " + (c.isActive ? "status-active" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300");
    }

    // Update approval status
    const approvalStatus = document.getElementById("approvalStatus");
    if (approvalStatus) {
      approvalStatus.textContent = c.isApproved ? "Approved" : 
                                  c.isRejected ? "Rejected" : "Pending";
      approvalStatus.className = "status-badge ";
      if (c.isApproved) {
        approvalStatus.classList.add("status-active");
      } else if (c.isRejected) {
        approvalStatus.classList.add("bg-red-100", "text-red-800", "dark:bg-red-900", "dark:text-red-300");
      } else {
        approvalStatus.classList.add("status-pending");
      }
    }

    // Update featured status
    const featuredStatus = document.getElementById("featuredStatus");
    if (featuredStatus) {
      featuredStatus.textContent = c.isfeatured ? "Yes" : "No";
      featuredStatus.className = "status-badge " + (c.isfeatured ? 
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" : 
        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300");
    }

    // Show verified badge if company is verified
    const verifiedBadge = document.getElementById("verifiedBadge");
    if (verifiedBadge) {
      verifiedBadge.classList.toggle("hidden", !c.isVerified);
      if (c.isVerified) {
        verifiedBadge.classList.add("badge-pulse");
      }
    }
  }

  setupEventListeners() {
    // Edit profile button
    document.getElementById("editProfileButton")?.addEventListener("click", () => {
      window.location.href = "maincompany_profile_edit.html";
    });

    // Gallery upload
    const galleryUpload = document.getElementById("galleryUpload");
    const galleryAddButton = document.getElementById("galleryAddButton");

    if (galleryUpload) {
      galleryUpload.addEventListener("change", (e) => this.handleGalleryUpload(e));
    }

    if (galleryAddButton) {
      galleryAddButton.addEventListener("click", () => {
        if (this.galleryImages.length < this.MAX_IMAGES) {
          galleryUpload.click();
        } else {
          this.showToast(`Maximum ${this.MAX_IMAGES} images allowed`, "warning");
        }
      });
    }

    // Manage gallery button
    document.getElementById("manageGalleryBtn")?.addEventListener("click", () => {
      // Show gallery management modal or page
      this.showToast("Gallery management coming soon", "info");
    });

    // Quick action buttons
    const actionButtons = {
      viewApplicationsBtn: () => this.navigateTo("applications.html"),
      manageSupervisorsBtn: () => this.navigateTo("supervisors.html"),
      viewOpportunitiesBtn: () => this.navigateTo("opportunities.html"),
      createOpportunityBtn: () => this.navigateTo("create_opportunity.html"),
      viewAnalyticsBtn: () => this.showToast("Analytics dashboard coming soon", "info"),
      manageFormsBtn: () => this.navigateTo("forms.html"),
      settingsBtn: () => this.navigateTo("settings.html"),
      contactSupportBtn: () => window.open("mailto:support@itconnect.com", "_blank")
    };

    Object.entries(actionButtons).forEach(([id, action]) => {
      document.getElementById(id)?.addEventListener("click", action);
    });

    // Read more button
    const readMoreButton = document.getElementById("readMoreButton");
    if (readMoreButton) {
      readMoreButton.addEventListener("click", () => {
        const textElement = document.getElementById("companyDescription");
        const isExpanded = textElement.classList.toggle("expanded");
        readMoreButton.textContent = isExpanded ? "Read Less" : "Read More";
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
      if (text) el.textContent = text;
    }
  }

  setImage(id, src) {
    const el = document.getElementById(id);
    if (el) {
      el.src = src;
      el.onload = () => {
        el.classList.remove("opacity-0");
        el.parentElement?.classList?.remove("shimmer");
      };
    }
  }

  setProgressBar(id, percentage) {
    const bar = document.getElementById(id);
    if (bar) {
      bar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
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
      galleryItem.className = "gallery-item rounded-lg overflow-hidden";
      galleryItem.style.backgroundImage = `url('${image.url}')`;
      galleryItem.style.backgroundSize = "cover";
      galleryItem.style.backgroundPosition = "center";
      galleryItem.style.aspectRatio = "1";

      // Add remove button
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "×";
      removeBtn.title = "Remove image";
      removeBtn.onclick = async (e) => {
        e.stopPropagation();
        await this.removeGalleryImage(index);
      };

      galleryItem.appendChild(removeBtn);
      container.insertBefore(galleryItem, addButton);
    });

    // Update count
    if (countElement) {
      countElement.textContent = `${this.galleryImages.length}/${this.MAX_IMAGES} images`;
    }

    // Disable add button if max reached
    if (addButton) {
      if (this.galleryImages.length >= this.MAX_IMAGES) {
        addButton.classList.add("opacity-50", "cursor-not-allowed");
        addButton.onclick = null;
      } else {
        addButton.classList.remove("opacity-50", "cursor-not-allowed");
        addButton.onclick = () => document.getElementById("galleryUpload").click();
      }
    }
  }

  async removeGalleryImage(index) {
    const imageToRemove = this.galleryImages[index];
    
    if (!confirm("Are you sure you want to remove this image?")) return;

    try {
      // Delete the image from Firebase Storage
      await this.cloudStorage.deleteFile(imageToRemove.url);
      
      // Remove from Firestore
      await it_based_company_cloud.removeImageFromGallery(this.company.id, imageToRemove.url);
      
      // Remove from local array
      this.galleryImages.splice(index, 1);
      this.renderGallery();
      
      this.showToast("Image removed successfully", "success");
    } catch (error) {
      console.error("Error removing image:", error);
      this.showToast("Failed to remove image", "error");
    }
  }

  async handleGalleryUpload(event) {
    const files = Array.from(event.target.files);
    const remainingSlots = this.MAX_IMAGES - this.galleryImages.length;

    if (files.length > remainingSlots) {
      this.showToast(`You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""}`, "warning");
      files.splice(remainingSlots);
    }

    // Validate files
    const { validFiles, errors } = this.validateImageFiles(files);
    
    if (errors.length > 0) {
      errors.forEach(error => this.showToast(error, "warning"));
    }

    if (validFiles.length === 0) return;

    // Show loading state
    const addButton = document.getElementById("galleryAddButton");
    if (addButton) {
      const originalContent = addButton.innerHTML;
      addButton.innerHTML = `
        <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
        <span class="text-sm mt-2">Uploading...</span>
      `;
      addButton.classList.add("opacity-50", "cursor-not-allowed");
    }

    try {
      // Upload images
      const uploadedImages = await this.uploadMultipleImagesToStorage(validFiles);
      
      if (uploadedImages.length > 0) {
        // Add to gallery
        this.galleryImages.push(...uploadedImages);
        
        // Update Firestore
        const imageUrls = uploadedImages.map(img => img.url);
        await this.addImagesToGallery(imageUrls);
        
        this.renderGallery();
        this.showToast(`Successfully uploaded ${uploadedImages.length} image${uploadedImages.length !== 1 ? "s" : ""}`, "success");
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      this.showToast("Failed to upload images", "error");
    } finally {
      // Reset UI state
      if (addButton) {
        addButton.innerHTML = `
          <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span class="text-sm font-medium">Add Images</span>
          <span class="text-xs mt-1">Max 20 images</span>
        `;
        addButton.classList.remove("opacity-50", "cursor-not-allowed");
      }
      
      // Reset file input
      event.target.value = "";
    }
  }

  calculateProfileCompletion(c) {
    const fields = [
      c.name,
      c.email,
      c.industry,
      c.address || c.localGovernment || c.state,
      c.phoneNumber,
      c.website,
      c.logoURL,
      c.description,
      c.companySize,
      c.registrationNumber
    ];
    
    const filled = fields.filter(field => field && field.trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }

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
        error: "Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.",
      };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: "File too large. Maximum size is 5MB." };
    }

    return { isValid: true, error: null };
  }

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

  async uploadMultipleImagesToStorage(files) {
    try {
      const results = await this.cloudStorage.uploadMultipleFiles(
        files,
        this.company.id,
        "company-gallery"
      );

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

  async addImagesToGallery(imageUrls) {
    if (!this.company || !imageUrls || !imageUrls.length) {
      console.error("Cannot add images: missing company or image URLs");
      return;
    }

    try {
      const companyRef = doc(
        it_based_company_cloud.db,
        "companies",
        this.company.id
      );

      await updateDoc(companyRef, {
        galleryImages: arrayUnion(...imageUrls),
        updatedAt: serverTimestamp(),
      });

      ////console.log("Images added to gallery successfully:", imageUrls);
    } catch (error) {
      console.error("Error adding images to gallery:", error);
      throw error;
    }
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer") || document.body;
    
    const toast = document.createElement("div");
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white animate-slide-up ${
      type === "success" ? "bg-green-500" :
      type === "error" ? "bg-red-500" :
      type === "warning" ? "bg-yellow-500" :
      "bg-blue-500"
    }`;
    
    // Icon based on type
    const icon = type === "success" ? "✓" :
                 type === "error" ? "✕" :
                 type === "warning" ? "!" : "i";
    
    toast.innerHTML = `
      <span class="font-bold">${icon}</span>
      <span class="flex-1 text-sm">${message}</span>
      <button class="text-white/80 hover:text-white" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  showLoading(show) {
    const skeletonElements = document.querySelectorAll(".shimmer");
    skeletonElements.forEach(el => {
      if (show) {
        el.classList.add("shimmer");
      } else {
        el.classList.remove("shimmer");
      }
    });
    
    if (show) {
      document.body.style.pointerEvents = "none";
      document.body.style.opacity = "0.8";
    } else {
      document.body.style.pointerEvents = "auto";
      document.body.style.opacity = "1";
    }
  }

  updateReadMoreButton() {
    const textElement = document.getElementById("companyDescription");
    const readMoreButton = document.getElementById("readMoreButton");
    
    if (!textElement || !readMoreButton) return;
    
    const isTruncated = textElement.scrollHeight > textElement.clientHeight + 5;
    readMoreButton.classList.toggle("hidden", !isTruncated);
  }

  navigateTo(url) {
    window.location.href = url;
  }
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  new MainCompanyProfile();
});