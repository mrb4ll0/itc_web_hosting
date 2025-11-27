import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";
import { auth, db } from "../../../js/config/firebaseInit.js";
import { CloudStorage } from "../../../js/fireabase/Cloud_Storage.js";
import { ITBaseCompanyCloud } from "../../../js/fireabase/ITBaseCompanyCloud.js";

const firebaseLogic = new ITCFirebaseLogic();
const cloudStorage = new CloudStorage();
const it_based_company_cloud = new ITBaseCompanyCloud();

// All input components
const companyNameInput = document.getElementById("companyName");
const companyIndustryInput = document.getElementById("companyIndustry");
const companyPhoneInput = document.getElementById("companyPhone");
const companyEmailInput = document.getElementById("companyEmail");
const companyWebsiteInput = document.getElementById("companyWebsite");
const companyStateInput = document.getElementById("companyState");
const companyLocalGovernmentInput = document.getElementById("companyLocalGovernment");
const companyAddressInput = document.getElementById("companyAddress");
const companyDescriptionInput = document.getElementById("companyDescription");
const companyLogoInput = document.getElementById("companyLogo");
const companyLogoPreview = document.getElementById("companyLogoPreview");
const saveProfileBtn = document.getElementById("saveProfileBtn");

// Gallery inputs and preview containers
const galleryInputs = [
  { input: document.getElementById("galleryImage1"), preview: document.getElementById("galleryPreview1") },
  { input: document.getElementById("galleryImage2"), preview: document.getElementById("galleryPreview2") },
  { input: document.getElementById("galleryImage3"), preview: document.getElementById("galleryPreview3") }
];

let currentUser = null;
let currentCompany = null;

// Load company profile data
window.addEventListener("DOMContentLoaded", async () => {
  try {
    await auth.authStateReady();
    ////console.log("user id is " + auth.currentUser.uid);
    
    currentUser = auth.currentUser;
    if (!currentUser) {
      alert("Please sign in to edit your profile.");
      window.location.href = "company/auth/company_login.html";
      return;
    }

    const companyData = await firebaseLogic.getCompany(currentUser.uid);
    if (companyData) {
      currentCompany = companyData;
      populateForm(companyData);
    }
  } catch (error) {
    console.error("Error loading company data:", error);
  }
});


// Populate form fields
function populateForm(data) {
  
  companyNameInput.value = data.name || "";
  companyIndustryInput.value = data.industry || "";
  companyPhoneInput.value = data.phoneNumber || "";
  companyEmailInput.value = data.email || "";
  companyWebsiteInput.value = data.website || "";
  companyStateInput.value = data.state || "";
  companyLocalGovernmentInput.value = data.localGovernment || "";
  companyAddressInput.value = data.address || "";
  companyDescriptionInput.value = data.description || "";

  if (data.logoURL) {
    companyLogoPreview.style.backgroundImage = `url('${data.logoURL}')`;
  }

  // Populate gallery images if they exist
  if (data.galleryImages && Array.isArray(data.galleryImages)) {
    data.galleryImages.forEach((imageUrl, index) => {
      if (index < galleryInputs.length) {
        createPreview(imageUrl, galleryInputs[index].preview, true);
      }
    });
  }
}

// Logo preview on upload
companyLogoInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      companyLogoPreview.style.backgroundImage = `url('${e.target.result}')`;
    };
    reader.readAsDataURL(file);
  }
});

// Setup gallery previews
galleryInputs.forEach(({ input, preview }) => {
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      createPreview(URL.createObjectURL(file), preview, false);
    }
  });
});

function createPreview(imageSrc, previewContainer, isExisting = false) {
  // Clear existing preview
  previewContainer.innerHTML = '';

  const previewImg = document.createElement("img");
  previewImg.src = imageSrc;
  previewImg.className = "gallery-preview";
  previewImg.alt = "Gallery preview";

  // Add remove button for new uploads
  if (!isExisting) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600";
    removeBtn.innerHTML = "×";
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      previewContainer.innerHTML = '';
      // Clear the file input
      const fileInput = previewContainer.previousElementSibling?.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.value = '';
      }
    };

    const previewWrapper = document.createElement("div");
    previewWrapper.className = "relative";
    previewWrapper.appendChild(previewImg);
    previewWrapper.appendChild(removeBtn);
    previewContainer.appendChild(previewWrapper);
  } else {
    previewContainer.appendChild(previewImg);
  }
}

// Save changes handler
saveProfileBtn.addEventListener("click", async () => {
  if (!currentUser) return alert("You must be signed in to save changes.");

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Saving...";

  try {
    const updatedData = {
      name: companyNameInput.value.trim(),
      industry: companyIndustryInput.value.trim(),
      phoneNumber: companyPhoneInput.value.trim(),
      email: companyEmailInput.value.trim(),
      website: companyWebsiteInput.value.trim(),
      state: companyStateInput.value.trim(),
      localGovernment: companyLocalGovernmentInput.value.trim(),
      address: companyAddressInput.value.trim(),
      description: companyDescriptionInput.value.trim(),
      updatedAt: new Date().toISOString(),
    };

    // Upload logo if changed
    const logoFile = companyLogoInput.files[0];
    if (logoFile) {
      await auth.authStateReady();
      const mainLogoURL = await cloudStorage.uploadFile(logoFile, auth.currentUser.uid, "company-logos");
      updatedData.logoURL = mainLogoURL;
    }

    // Upload gallery images
    const galleryFiles = galleryInputs
      .map(({ input }) => input.files[0])
      .filter(file => file);

    if (galleryFiles.length > 0) {
      const galleryURLs = [];
      for (const file of galleryFiles) {
        const url = await cloudStorage.uploadFile(file, auth.currentUser.uid, "company-gallery");
        galleryURLs.push(url);
      }
      updatedData.galleryImages = galleryURLs;
    }

    // Update Firestore record
    await it_based_company_cloud.updateCompanyProfile(currentUser.uid, updatedData);

    alert("Company profile updated successfully!");
    window.location.href = "maincompany_profile.html";
  } catch (error) {
    console.error("Error updating company profile:", error);
    alert("Failed to save changes. Please try again.");
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = "Save Changes";
  }
});