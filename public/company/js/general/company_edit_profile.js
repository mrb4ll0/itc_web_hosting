import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";
import { Company } from "../../../js/model/Company.js";
import { auth } from "../../../js/config/firebaseInit.js";
import { CloudStorage } from "../../../js/fireabase/Cloud_Storage.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";

const firebaseLogic = new ITCFirebaseLogic();
const cloudStorage = new CloudStorage();
const it_based_company_cloud = new ITBaseCompanyCloud();

// Input elements
const elements = {
  companyName: document.getElementById("companyName"),
  companyIndustry: document.getElementById("companyIndustry"),
  companySize: document.getElementById("companySize"),
  registrationNumber: document.getElementById("registrationNumber"),
  companyEmail: document.getElementById("companyEmail"),
  companyPhone: document.getElementById("companyPhone"),
  companyWebsite: document.getElementById("companyWebsite"),
  companyState: document.getElementById("companyState"),
  companyLocalGovernment: document.getElementById("companyLocalGovernment"),
  companyAddress: document.getElementById("companyAddress"),
  companyDescription: document.getElementById("companyDescription"),
  companyLogo: document.getElementById("companyLogo"),
  companyLogoImage: document.getElementById("companyLogoImage"),
  companyBanner: document.getElementById("companyBanner"),
  companyBannerImage: document.getElementById("companyBannerImage"),
  companyVisibility: document.getElementById("companyVisibility"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  saveProfileBtn2: document.getElementById("saveProfileBtn2"),
  galleryUpload: document.getElementById("galleryUpload"),
  galleryContainer: document.getElementById("galleryContainer"),
  galleryAddButton: document.getElementById("galleryAddButton"),
  galleryCount: document.getElementById("galleryCount"),
  profileCompletion: document.getElementById("profileCompletion"),
  profileCompletionBar: document.getElementById("profileCompletionBar"),
  completionTips: document.getElementById("completionTips"),
  accountStatus: document.getElementById("accountStatus"),
  verificationStatus: document.getElementById("verificationStatus"),
  approvalStatus: document.getElementById("approvalStatus"),
};

let currentUser = null;
let currentCompany = null;
let galleryImages = [];
let MAX_GALLERY_IMAGES = 10;

// Load company profile data
window.addEventListener("DOMContentLoaded", async () => {
  try {
    await auth.authStateReady();
    currentUser = auth.currentUser;

    if (!currentUser) {
      showToast("Please sign in to edit your profile", "error");
      setTimeout(
        () => (window.location.href = "company/auth/company_login.html"),
        2000
      );
      return;
    }

    const companyData = await firebaseLogic.getCompany(currentUser.uid);
    if (companyData) {
      currentCompany = Company.fromMap(companyData);
      populateForm(currentCompany);
      updateProfileCompletion();
    } else {
      showToast("Company profile not found", "warning");
    }
  } catch (error) {
    console.error("Error loading company data:", error);
    showToast("Failed to load company data", "error");
  }
});

// Populate form fields
// Populate form fields
function populateForm(company) {
  // Basic info
  elements.companyName.value = company.name || "";
  elements.companyIndustry.value = company.industry || "";
  elements.companySize.value = company.companySize || "";
  elements.registrationNumber.value = company.registrationNumber || "";
  elements.companyEmail.value = company.email || "";
  elements.companyPhone.value = company.phoneNumber || "";
  elements.companyWebsite.value = company.website || "";
  elements.companyState.value = company.state || "";
  elements.companyLocalGovernment.value = company.localGovernment || "";
  elements.companyAddress.value = company.address || "";
  elements.companyDescription.value = company.description || "";
  elements.companyVisibility.checked = company.isActive !== false;

  // Images
  if (company.logoURL) {
    elements.companyLogoImage.src = company.logoURL;
    elements.companyLogoImage.onload = () => {
      elements.companyLogoImage.classList.remove("opacity-0");
      document.getElementById("companyLogoPreview").classList.remove("shimmer");
    };
  }

  if (company.bannerURL) {
    elements.companyBannerImage.src = company.bannerURL;
    elements.companyBannerImage.onload = () => {
      elements.companyBannerImage.classList.remove("opacity-0");
      document
        .getElementById("companyBannerPreview")
        .classList.remove("shimmer");
    };
  }

  // Gallery images - Convert array of URLs to array of objects
  galleryImages = (company.galleryImages || []).map((url) => ({
    url: url,
    name: `Gallery Image`,
    isNew: false,
  }));

  console.log("galleryImages ", galleryImages);
  renderGallery();

  // Status badges
  updateStatusBadges(company);

  // Add input listeners for real-time completion updates
  Object.keys(elements).forEach((key) => {
    if (elements[key] && elements[key].addEventListener) {
      elements[key].addEventListener("input", updateProfileCompletion);
      elements[key].addEventListener("change", updateProfileCompletion);
    }
  });
}
// Update status badges
function updateStatusBadges(company) {
  if (elements.accountStatus) {
    elements.accountStatus.textContent = company.isActive
      ? "Active"
      : "Inactive";
    elements.accountStatus.className = company.isActive
      ? "px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full"
      : "px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium rounded-full";
  }

  if (elements.verificationStatus) {
    elements.verificationStatus.textContent = company.isVerified
      ? "Verified"
      : "Pending";
    elements.verificationStatus.className = company.isVerified
      ? "px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full"
      : "px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full";
  }

  if (elements.approvalStatus) {
    let status = "Pending";
    let className =
      "px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full";

    if (company.isApproved) {
      status = "Approved";
      className =
        "px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full";
    } else if (company.isRejected) {
      status = "Rejected";
      className =
        "px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium rounded-full";
    }

    elements.approvalStatus.textContent = status;
    elements.approvalStatus.className = className;
  }
}

// Update profile completion
function updateProfileCompletion() {
  const requiredFields = [
    elements.companyName.value.trim(),
    elements.companyIndustry.value.trim(),
    elements.companyEmail.value.trim(),
    elements.companyPhone.value.trim(),
    elements.companyDescription.value.trim(),
  ];

  const optionalFields = [
    elements.companySize.value.trim(),
    elements.registrationNumber.value.trim(),
    elements.companyWebsite.value.trim(),
    elements.companyState.value.trim(),
    elements.companyLocalGovernment.value.trim(),
    elements.companyAddress.value.trim(),
    elements.companyLogoImage.src &&
      !elements.companyLogoImage.src.includes("data:"),
    galleryImages.length > 0,
  ];

  const filledRequired = requiredFields.filter(
    (field) => field.length > 0
  ).length;
  const filledOptional = optionalFields.filter((field) => field).length;

  const totalFields = requiredFields.length + optionalFields.length;
  const filledFields = filledRequired + filledOptional;

  const completion = Math.round((filledFields / totalFields) * 100);

  elements.profileCompletion.textContent = `${completion}%`;
  elements.profileCompletionBar.style.width = `${completion}%`;

  // Update tips
  const tips = [];
  if (!elements.companyName.value.trim()) tips.push("Add company name");
  if (!elements.companyIndustry.value.trim()) tips.push("Select industry");
  if (!elements.companyEmail.value.trim()) tips.push("Add email address");
  if (!elements.companyPhone.value.trim()) tips.push("Add phone number");
  if (!elements.companyDescription.value.trim())
    tips.push("Write company description");
  if (!elements.companySize.value.trim()) tips.push("Select company size");
  if (!elements.companyLogoImage.src) tips.push("Upload company logo");
  if (galleryImages.length === 0) tips.push("Add gallery images");

  if (tips.length > 0) {
    elements.completionTips.innerHTML = tips
      .map(
        (tip) =>
          `<div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                ${tip}
            </div>`
      )
      .join("");
    elements.completionTips.classList.remove("hidden");
  } else {
    elements.completionTips.classList.add("hidden");
  }
}

// Image preview handlers
elements.companyLogo?.addEventListener("change", handleLogoUpload);
elements.companyBanner?.addEventListener("change", handleBannerUpload);
elements.galleryUpload?.addEventListener("change", handleGalleryUpload);
elements.galleryAddButton?.addEventListener("click", () =>
  elements.galleryUpload.click()
);

async function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const validation = validateImageFile(file);
  if (!validation.isValid) {
    showToast(validation.error, "error");
    event.target.value = "";
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  elements.companyLogoImage.src = previewUrl;
  elements.companyLogoImage.onload = () => {
    elements.companyLogoImage.classList.remove("opacity-0");
    document.getElementById("companyLogoPreview").classList.remove("shimmer");
    URL.revokeObjectURL(previewUrl);
  };
}

async function handleBannerUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const validation = validateImageFile(file);
  if (!validation.isValid) {
    showToast(validation.error, "error");
    event.target.value = "";
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  elements.companyBannerImage.src = previewUrl;
  elements.companyBannerImage.onload = () => {
    elements.companyBannerImage.classList.remove("opacity-0");
    document.getElementById("companyBannerPreview").classList.remove("shimmer");
    URL.revokeObjectURL(previewUrl);
  };
}

async function handleGalleryUpload(event) {
  const files = Array.from(event.target.files);
  const remainingSlots = MAX_GALLERY_IMAGES - galleryImages.length;

  if (files.length > remainingSlots) {
    showToast(
      `You can only upload ${remainingSlots} more image${
        remainingSlots !== 1 ? "s" : ""
      }`,
      "warning"
    );
    files.splice(remainingSlots);
  }

  const { validFiles, errors } = validateImageFiles(files);

  if (errors.length > 0) {
    errors.forEach((error) => showToast(error, "warning"));
  }

  if (validFiles.length === 0) {
    event.target.value = "";
    return;
  }

  // Show loading state
  const originalContent = elements.galleryAddButton.innerHTML;
  elements.galleryAddButton.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent mb-3"></div>
            <p class="text-sm text-gray-600 dark:text-gray-400">Processing images...</p>
        </div>
    `;

  try {
    // Create previews immediately
    validFiles.forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      galleryImages.push({
        url: previewUrl,
        file: file,
        name: file.name,
        isNew: true,
      });
    });

    renderGallery();
    updateProfileCompletion();
    showToast(
      `Added ${validFiles.length} image${
        validFiles.length !== 1 ? "s" : ""
      } to gallery`,
      "success"
    );
  } catch (error) {
    console.error("Error handling gallery upload:", error);
    showToast("Failed to add images", "error");
  } finally {
    elements.galleryAddButton.innerHTML = originalContent;
    event.target.value = "";
  }
}

// Render gallery
// Render gallery
function renderGallery() {
  elements.galleryContainer.innerHTML = "";

  galleryImages.forEach((image, index) => {
    // Check if image exists and has a url
    if (!image) {
      console.warn(
        `Skipping gallery image at index ${index}: image is undefined`
      );
      return;
    }

    // Handle both object format (with url property) and string format
    const imageUrl = typeof image === "string" ? image : image.url;

    if (!imageUrl) {
      console.warn(`Skipping gallery image at index ${index}: no URL found`);
      return;
    }

    const galleryItem = document.createElement("div");
    galleryItem.className = "relative group";

    galleryItem.innerHTML = `
            <div class="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img src="${imageUrl}" alt="Gallery image" class="w-full h-full object-cover image-preview" />
            </div>
            <button type="button" class="remove-btn absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-index="${index}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;

    elements.galleryContainer.appendChild(galleryItem);
  });

  // Update count
  elements.galleryCount.textContent = `${galleryImages.length}/${MAX_GALLERY_IMAGES} images`;

  // Add remove event listeners
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.closest("button").dataset.index);
      removeGalleryImage(index);
    });
  });
}
// Remove gallery image
function removeGalleryImage(index) {
  if (confirm("Are you sure you want to remove this image?")) {
    // Revoke object URL if it's a new upload
    if (galleryImages[index].url.startsWith("blob:")) {
      URL.revokeObjectURL(galleryImages[index].url);
    }

    galleryImages.splice(index, 1);
    renderGallery();
    updateProfileCompletion();
    showToast("Image removed", "info");
  }
}

// Validate image file
function validateImageFile(file) {
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

// Validate multiple image files
function validateImageFiles(files) {
  const validFiles = [];
  const errors = [];

  files.forEach((file) => {
    const validation = validateImageFile(file);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${validation.error}`);
    }
  });

  return { validFiles, errors };
}

// Save profile
elements.saveProfileBtn?.addEventListener("click", saveProfile);
elements.saveProfileBtn2.addEventListener("click",saveProfile);

async function saveProfile() {
  if (!currentUser) {
    showToast("You must be signed in to save changes", "error");
    return;
  }

  // Validate required fields
  const requiredFields = {
    "Company Name": elements.companyName.value.trim(),
    Industry: elements.companyIndustry.value.trim(),
    Email: elements.companyEmail.value.trim(),
    Phone: elements.companyPhone.value.trim(),
    Description: elements.companyDescription.value.trim(),
  };

  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => !value)
    .map(([field]) => field);

  if (missingFields.length > 0) {
    showToast(`Please fill in: ${missingFields.join(", ")}`, "warning");
    return;
  }

  // Update button state
  const originalText = elements.saveProfileBtn.textContent;
  elements.saveProfileBtn.disabled = true;
  elements.saveProfileBtn.innerHTML = `
        <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
        Saving...
    `;

  try {
    const updatedData = {
      name: elements.companyName.value.trim(),
      industry: elements.companyIndustry.value.trim(),
      companySize: elements.companySize.value.trim(),
      registrationNumber: elements.registrationNumber.value.trim(),
      email: elements.companyEmail.value.trim(),
      phoneNumber: elements.companyPhone.value.trim(),
      website: elements.companyWebsite.value.trim(),
      state: elements.companyState.value.trim(),
      localGovernment: elements.companyLocalGovernment.value.trim(),
      address: elements.companyAddress.value.trim(),
      description: elements.companyDescription.value.trim(),
      isActive: elements.companyVisibility.checked,
      updatedAt: new Date().toISOString(),
    };

    // Upload logo if changed
    const logoFile = elements.companyLogo.files[0];
    if (logoFile) {
      const logoURL = await cloudStorage.uploadFile(
        logoFile,
        currentUser.uid,
        "company-logos"
      );
      updatedData.logoURL = logoURL;
    }

    // Upload banner if changed
    const bannerFile = elements.companyBanner.files[0];
    if (bannerFile) {
      const bannerURL = await cloudStorage.uploadFile(
        bannerFile,
        currentUser.uid,
        "company-banners"
      );
      updatedData.bannerURL = bannerURL;
    }

    // Upload new gallery images
    const newGalleryImages = galleryImages.filter((img) => img.isNew);
    if (newGalleryImages.length > 0) {
      const uploadedUrls = [];
      for (const image of newGalleryImages) {
        const url = await cloudStorage.uploadFile(
          image.file,
          currentUser.uid,
          "company-gallery"
        );
        uploadedUrls.push(url);
        // Revoke object URL
        URL.revokeObjectURL(image.url);
      }

      // Combine with existing gallery images
      const existingUrls = galleryImages
        .filter((img) => !img.isNew)
        .map((img) => img.url);
      updatedData.galleryImages = [...existingUrls, ...uploadedUrls];
    } else if (galleryImages.length > 0) {
      // Keep existing gallery images
      updatedData.galleryImages = galleryImages.map((img) => img.url);
    }

    // Update company profile
    await it_based_company_cloud.updateCompanyProfile(
      currentUser.uid,
      updatedData
    );

    showToast("Profile updated successfully!", "success");

    // Redirect after delay
    setTimeout(() => {
      window.location.href = "maincompany_profile.html";
    }, 1500);
  } catch (error) {
    console.error("Error updating company profile:", error);
    showToast("Failed to save changes. Please try again.", "error");
  } finally {
    elements.saveProfileBtn.disabled = false;
    elements.saveProfileBtn.innerHTML = originalText;
  }
}

// Toast notification
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer") || document.body;

  const toast = document.createElement("div");
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white animate-slide-up min-w-[300px] ${
    type === "success"
      ? "bg-green-500"
      : type === "error"
      ? "bg-red-500"
      : type === "warning"
      ? "bg-yellow-500"
      : "bg-blue-500"
  }`;

  // Icon based on type
  const icon =
    type === "success"
      ? "✓"
      : type === "error"
      ? "✕"
      : type === "warning"
      ? "!"
      : "i";

  toast.innerHTML = `
        <span class="font-bold text-lg">${icon}</span>
        <span class="flex-1 text-sm">${message}</span>
        <button class="text-white/80 hover:text-white transition-colors" onclick="this.parentElement.remove()">
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
