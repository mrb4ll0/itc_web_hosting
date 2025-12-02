import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  deleteField,
  deleteDoc,
  collectionGroup,
  getAuth,
  createUserWithEmailAndPassword,
  auth
} from "../../../js/config/firebaseInit.js";
import { CompanyCloud } from "../../../js/fireabase/CompanyCloud.js";
import { Company } from "../../../js//model/Company.js";
import { nigeria } from "../../../js/general/generalmethods.js";
import { CloudStorage } from "../../../js/fireabase/Cloud_Storage.js";
import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";

class CompanyRegistration {
  constructor() {
    this.companyCloud = new CompanyCloud();
    this.itc_firebaselogic = new ITCFirebaseLogic();
    this.form = document.querySelector("form");
    this.init();
  }

  init() {
    ////console.log("init got called");
    this.addDropDownData();
    this.loadhtmlAttachment();
    this.attachEventListeners();
    this.setupAutoRegistrationNumber();
  }

  loadhtmlAttachment() {
    // Attach file upload preview functionality
    const fileInput = document.getElementById("file-upload");
    const fileUploadLabel = document.querySelector('label[for="file-upload"]');
    const dropZone = document.querySelector(".border-dashed");

    if (fileInput && fileUploadLabel && dropZone) {
      // Click to upload functionality
      fileInput.addEventListener("change", (event) => {
        this.handleFileSelection(event.target.files[0]);
      });

      // Drag and drop functionality
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("border-primary", "bg-primary/5");
        dropZone.classList.remove("border-gray-300", "dark:border-gray-600");
      });

      dropZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-primary", "bg-primary/5");
        dropZone.classList.add("border-gray-300", "dark:border-gray-600");
      });

      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-primary", "bg-primary/5");
        dropZone.classList.add("border-gray-300", "dark:border-gray-600");

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleFileSelection(files[0]);
        }
      });

      // Also make the entire drop zone clickable
      dropZone.addEventListener("click", () => {
        fileInput.click();
      });
    } else {
      console.error("File upload elements not found");
    }
  }

  // New method to handle file selection (both from click and drag/drop)
  handleFileSelection(file) {
    if (file) {
      // Validate file type and size
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid image file (PNG, JPG, GIF)");
        return;
      }

      if (file.size > maxSize) {
        alert("File size must be less than 10MB");
        return;
      }

      // Update the file input
      const fileInput = document.getElementById("file-upload");
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      // Update label text
      const fileUploadLabel = document.querySelector(
        'label[for="file-upload"]'
      );
      if (fileUploadLabel) {
        fileUploadLabel.querySelector("span").textContent = file.name;
      }

      // Preview image
      this.previewImage(file);
    }
  }

  // Enhanced previewImage method
  previewImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      // Remove the default SVG icon and show preview
      const dropZone = document.querySelector(".border-dashed");
      const svgIcon = dropZone.querySelector("svg");
      const textElements = dropZone.querySelectorAll(
        "div.text-center > *:not(script)"
      );

      if (svgIcon) svgIcon.style.display = "none";
      textElements.forEach((el) => (el.style.display = "none"));

      // Create or update preview image
      let previewImg = dropZone.querySelector(".image-preview");
      if (!previewImg) {
        previewImg = document.createElement("img");
        previewImg.className = "image-preview max-h-32 mx-auto rounded";
        dropZone.appendChild(previewImg);
      }

      previewImg.src = e.target.result;
      previewImg.alt = "Company logo preview";

      ////console.log("File preview loaded:", file.name);
    };
    reader.readAsDataURL(file);
  }
  addDropDownData() {
    // Nigeria states and LGAs data

    ////console.log("nigeria is " + nigeria);
    // Populate states dropdown
    const stateSelect = document.getElementById("state");
    stateSelect.innerHTML = '<option value="">Select State</option>';

    Object.keys(nigeria)
      .sort()
      .forEach((state) => {
        const option = document.createElement("option");
        option.value = state;
        option.textContent = this.formatStateName(state);
        stateSelect.appendChild(option);
      });

    // Add state change event listener for LGA dropdown
    stateSelect.addEventListener("change", (e) => {
      const selectedState = e.target.value;
      const lgaSelect = document.getElementById("local-government");
      this.populateLGAs(selectedState, lgaSelect, nigeria);
    });
  }

  populateLGAs(state, lgaSelect, nigeria) {
    lgaSelect.innerHTML =
      '<option value="" disabled selected>Select local government</option>';

    if (state && nigeria[state]) {
      nigeria[state].lgas.sort().forEach((lga) => {
        const option = document.createElement("option");
        option.value = lga;
        option.textContent = lga;
        lgaSelect.appendChild(option);
      });
      lgaSelect.disabled = false;
    } else {
      lgaSelect.disabled = true;
    }
  }

  formatStateName(stateKey) {
    const formatted = stateKey
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
    return formatted === "Abuja"
      ? "Federal Capital Territory (Abuja)"
      : formatted;
  }

  attachEventListeners() {
    if (this.form) {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleFormSubmit(e);
      });
    }

    // Add real-time validation
    const inputs = this.form.querySelectorAll("input, select");
    inputs.forEach((input) => {
      input.addEventListener("blur", () => {
        this.validateField(input);
      });

      input.addEventListener("input", () => {
        this.clearFieldError(input);
      });
    });

    this.attachPasswordToggleListeners();
  }

  attachPasswordToggleListeners() {
    const toggleButtons = this.form.querySelectorAll(".password-toggle");
    toggleButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const targetId = button.getAttribute("data-target");
        this.togglePasswordVisibility(targetId, button);
      });
    });
  }

  togglePasswordVisibility(inputId, button) {
    const passwordInput = document.getElementById(inputId);

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      button.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
            `;
      button.setAttribute("aria-label", "Hide password");
    } else {
      passwordInput.type = "password";
      button.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            `;
      button.setAttribute("aria-label", "Show password");
    }
  }


  updateRegistrationPlaceholder(companyName, industry) {
    const registrationInput = document.getElementById("registration-number");
    if (!registrationInput) return;

    const hasCompanyName = companyName && companyName.trim().length > 0;
    const hasIndustry = industry && industry.trim().length > 0;

    if (!hasCompanyName && !hasIndustry) {
        registrationInput.placeholder = "Enter company name and industry to auto-generate";
        registrationInput.title = "Fill in both company name and industry fields first";
        this.updateInputState(registrationInput, 'waiting');
    } else if (!hasCompanyName) {
        registrationInput.placeholder = "Enter company name to auto-generate";
        registrationInput.title = "Company name is required for auto-generation";
        this.updateInputState(registrationInput, 'waiting');
    } else if (!hasIndustry) {
        registrationInput.placeholder = "Enter industry to auto-generate";
        registrationInput.title = "Industry is required for auto-generation";
        this.updateInputState(registrationInput, 'waiting');
    } else {
        registrationInput.placeholder = "Auto-generating registration number...";
        registrationInput.title = "Registration number updates as you type company name or industry";
        this.updateInputState(registrationInput, 'generating');
    }
}

updateInputState(inputElement, state) {
    // Remove all state classes first
    inputElement.classList.remove(
        'border-blue-300', 'bg-blue-50', 'dark:bg-blue-900/20',
        'border-green-300', 'bg-green-50', 'dark:bg-green-900/20',
        'border-yellow-300', 'bg-yellow-50', 'dark:bg-yellow-900/20'
    );

    // Add appropriate state classes
    switch (state) {
        case 'waiting':
            inputElement.classList.add('border-blue-300', 'bg-blue-50', 'dark:bg-blue-900/20');
            break;
        case 'generating':
            inputElement.classList.add('border-green-300', 'bg-green-50', 'dark:bg-green-900/20');
            break;
        case 'ready':
            inputElement.classList.add('border-green-300');
            break;
    }
}

  setupAutoRegistrationNumber() {
    const companyNameInput = document.getElementById("company-name");
    const industryInput = document.getElementById("industry");
    const registrationNumberInput = document.getElementById("registration-number");

    if (companyNameInput && industryInput && registrationNumberInput) {
        let isUserEdited = false;
        let updateTimeout;

        const generateWithFeedback = () => {
            const companyName = companyNameInput.value.trim();
            const industry = industryInput.value.trim();

            this.updateRegistrationPlaceholder(companyName, industry);

            if (companyName && industry && !isUserEdited) {
                // Clear previous timeout
                clearTimeout(updateTimeout);
                
                // Add visual feedback (optional)
                registrationNumberInput.classList.add('bg-yellow-50', 'dark:bg-yellow-900/20');
                
                // Generate after a very short delay for better UX
                updateTimeout = setTimeout(() => {
                    this.generateRegistrationNumber(companyName, registrationNumberInput, industry);
                    
                    // Remove visual feedback
                    setTimeout(() => {
                        registrationNumberInput.classList.remove('bg-yellow-50', 'dark:bg-yellow-900/20');
                    }, 500);
                }, 100);
            } else if (!companyName || !industry) {
                if (!isUserEdited && registrationNumberInput.value.startsWith('ITC-')) {
                    registrationNumberInput.value = "";
                }
            }
        };

        // Real-time event listeners
        companyNameInput.addEventListener("input", generateWithFeedback);
        industryInput.addEventListener("input", generateWithFeedback);

        // Manual edit tracking
        registrationNumberInput.addEventListener("input", () => {
            isUserEdited = true;
            registrationNumberInput.removeAttribute('title');
            registrationNumberInput.classList.remove('bg-yellow-50', 'dark:bg-yellow-900/20');
        });

        // Allow re-enabling auto-generation by clearing the field
        registrationNumberInput.addEventListener("dblclick", () => {
            if (isUserEdited) {
                isUserEdited = false;
                generateWithFeedback();
                this.showNotification('Auto-generation re-enabled. Double-click to disable.', 'info');
            }
        });

        // Reset on field clear
        const resetOnClear = () => {
            if (!companyNameInput.value.trim() || !industryInput.value.trim()) {
                isUserEdited = false;
            }
        };

        companyNameInput.addEventListener("input", resetOnClear);
        industryInput.addEventListener("input", resetOnClear);
    }
}
  generateRegistrationNumber(companyName, registrationInput, industry = "") {
    if (!companyName || !companyName.trim()) {
      return;
    }

    const cleanName = companyName.trim().toUpperCase();
    const cleanIndustry = industry.trim().toUpperCase();

    // Generate a unique registration number based on company name and industry
    const registrationNumber = this.createRegistrationNumber(
      cleanName,
      cleanIndustry
    );

      registrationInput.value = registrationNumber;
  }

  createRegistrationNumber(companyName, industry = "") {
    const nameCode = this.generateNameCode(companyName);
    const industryCode = this.getIndustryCode(industry);
    const numericCode = this.generateNumericCode(companyName);
    const year = new Date().getFullYear().toString().slice(-2);
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 5)
      .toUpperCase();

    return `ITC-${industryCode}${nameCode}-${year}${numericCode}-${randomSuffix}`;
  }

  generateNameCode(companyName) {
    // Extract first 3-4 characters from company name
    const cleanName = companyName.replace(/[^A-Z]/g, "");

    if (cleanName.length >= 3) {
      return cleanName.substring(0, 3);
    } else {
      return cleanName.padEnd(3, "X");
    }
  }

  getIndustryCode(industry) {
    if (!industry) return "GEN";

    const industryCodes = {
      // Technology & IT
      TECHNOLOGY: "TEC",
      SOFTWARE: "SW",
      IT: "IT",
      "INFORMATION TECHNOLOGY": "IT",
      PROGRAMMING: "DEV",
      "WEB DEVELOPMENT": "WEB",
      "MOBILE DEVELOPMENT": "MOB",
      "DATA SCIENCE": "DS",
      "ARTIFICIAL INTELLIGENCE": "AI",
      "MACHINE LEARNING": "ML",
      "CLOUD COMPUTING": "CLD",
      CYBERSECURITY: "SEC",
      DEVOPS: "OPS",

      // Finance & Banking
      FINANCE: "FIN",
      BANKING: "BNK",
      "FINANCIAL SERVICES": "FS",
      INVESTMENT: "INV",
      INSURANCE: "INS",
      MICROFINANCE: "MFI",
      "ASSET MANAGEMENT": "AM",
      "WEALTH MANAGEMENT": "WM",
      FINTECH: "FT",

      // Oil & Gas
      OIL: "OIL",
      GAS: "GAS",
      PETROLEUM: "PET",
      ENERGY: "ENG",
      "RENEWABLE ENERGY": "REN",
      POWER: "PWR",

      // Manufacturing & Industry
      MANUFACTURING: "MFG",
      FMCG: "FMCG",
      "CONSUMER GOODS": "CG",
      PRODUCTION: "PRO",
      AUTOMOTIVE: "AUTO",
      TEXTILE: "TEX",

      // Healthcare
      HEALTHCARE: "HLT",
      HEALTH: "HLT",
      MEDICAL: "MED",
      PHARMACEUTICAL: "PHA",
      HOSPITAL: "HOS",

      // Education
      EDUCATION: "EDU",
      EDTECH: "EDT",
      TRAINING: "TRN",
      "E-LEARNING": "ELN",

      // Agriculture
      AGRICULTURE: "AGR",
      AGRO: "AGR",
      FARMING: "FARM",
      AGRITECH: "AGT",

      // Real Estate & Construction
      "REAL ESTATE": "RE",
      CONSTRUCTION: "CON",
      PROPERTY: "PROP",
      ARCHITECTURE: "ARC",

      // Logistics & Transportation
      LOGISTICS: "LOG",
      TRANSPORTATION: "TRN",
      SHIPPING: "SHP",
      "SUPPLY CHAIN": "SC",

      // Media & Entertainment
      MEDIA: "MED",
      ENTERTAINMENT: "ENT",
      BROADCASTING: "BRD",
      FILM: "FIL",
      MUSIC: "MUS",

      // Professional Services
      CONSULTING: "CON",
      LEGAL: "LEG",
      ACCOUNTING: "ACC",
      AUDIT: "AUD",
      "HUMAN RESOURCES": "HR",

      // Hospitality & Tourism
      HOSPITALITY: "HSP",
      TOURISM: "TRM",
      HOTEL: "HTL",
      TRAVEL: "TRV",

      // Retail & Commerce
      RETAIL: "RET",
      COMMERCE: "COM",
      WHOLESALE: "WHS",

      // NGO & Government
      NGO: "NGO",
      "NON-PROFIT": "NPO",
      GOVERNMENT: "GOV",
      "PUBLIC SECTOR": "PS",
    };

    // Direct match
    if (industryCodes[industry]) {
      return industryCodes[industry];
    }

    // Partial match
    for (const [key, code] of Object.entries(industryCodes)) {
      if (industry.includes(key) || key.includes(industry)) {
        return code;
      }
    }

    return "GEN"; // General
  }

  generateNumericCode(companyName) {
    // Create a numeric hash from the company name
    let hash = 0;
    for (let i = 0; i < companyName.length; i++) {
      hash = (hash << 5) - hash + companyName.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }

    // Take last 4 digits and ensure positive
    const numericCode = Math.abs(hash).toString().slice(-4);
    return numericCode.padStart(4, "0");
  }
  createRegistrationNumber(companyName) {
    const cleanName = companyName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const namePart = cleanName.substring(0, 4).padEnd(4, "0");

    return `COMP-${namePart}-${timestamp}`;
  }

  validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name || field.id;

    this.clearFieldError(field);

    let isValid = true;
    let errorMessage = "";

    switch (fieldName) {
      case "company-name":
      case "address":
      case "industry":
        if (!value) {
          errorMessage = "This field is required";
          isValid = false;
        } else if (value.length < 2) {
          errorMessage = "Must be at least 2 characters long";
          isValid = false;
        }
        break;

      case "email":
        if (!value) {
          errorMessage = "Email is required";
          isValid = false;
        } else if (!this.isValidEmail(value)) {
          errorMessage = "Please enter a valid email address";
          isValid = false;
        }
        break;

      case "contact-number":
        if (!value) {
          errorMessage = "Contact number is required";
          isValid = false;
        } else if (!this.isValidPhoneNumber(value)) {
          errorMessage = "Please enter a valid phone number";
          isValid = false;
        }
        break;

      case "state":
      case "local-government":
        if (!value) {
          errorMessage = "Please select an option";
          isValid = false;
        }
        break;
      case "password":
        if (!value) {
          errorMessage = "Password is required";
          isValid = false;
        } else {
          const passwordValidation = this.isValidPassword(value);
          if (!passwordValidation.isValid) {
            errorMessage = passwordValidation.message;
            isValid = false;
          }
        }
        break;
    }

    if (!isValid) {
      this.showFieldError(field, errorMessage);
    }

    return isValid;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPassword(password) {
    if (!password) {
        return {
            isValid: false,
            message: "Password is required",
            failedRequirements: ["Password is required"],
            strength: "empty"
        };
    }

    const requirements = {
        length: {
            test: password.length >= 8,
            message: "At least 8 characters",
        },
        maxLength: {
            test: password.length <= 128,
            message: "No more than 128 characters",
        },
        lowercase: {
            test: /[a-z]/.test(password),
            message: "One lowercase letter (a-z)",
        },
        uppercase: {
            test: /[A-Z]/.test(password),
            message: "One uppercase letter (A-Z)",
        },
        number: {
            test: /[0-9]/.test(password),
            message: "One number (0-9)",
        },
        special: {
            test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            message: "One special character (!@#$%^&* etc.)",
        },
        noSpaces: {
            test: !/\s/.test(password),
            message: "No spaces",
        },
        noSequential: {
            test: !/(.)\1\1/.test(password), // No 3 identical characters in a row
            message: "No 3 identical characters in a row",
        },
        noCommonPatterns: {
            test: !/(12345|abcde|qwerty|password|admin|12345678|111111)/i.test(password),
            message: "No common patterns (12345, abcde, qwerty, etc.)",
        },
        noEmailPattern: {
            test: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(password), // Not a valid email format
            message: "Cannot use email address as password",
        },
        noCompanyName: {
            test: (pwd) => {
                // This will be dynamically checked when used with company name
                return true; // Default to true, can be overridden
            },
            message: "Should not contain company name",
        }
    };

    const failedRequirements = Object.entries(requirements)
        .filter(([key, req]) => {
            if (key === 'noCompanyName') {
                // Skip this check by default unless company name is provided
                return false;
            }
            return !req.test;
        })
        .map(([_, req]) => req.message);

    const isValid = failedRequirements.length === 0;

    return {
        isValid,
        message: isValid
            ? " Password meets all requirements"
            : ` Password requirements: ${failedRequirements.join(", ")}`,
        failedRequirements,
        strength: this.calculatePasswordStrength(password),
        suggestions: this.getPasswordSuggestions(password, failedRequirements)
    };
}

calculatePasswordStrength(password) {
    if (!password) return "empty";
    
    let score = 0;
    const length = password.length;

    // Length scoring (more points for longer passwords)
    if (length >= 8) score += 1;
    if (length >= 12) score += 2;
    if (length >= 16) score += 3;
    if (length >= 20) score += 4;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 2; // Extra points for special chars

    // Complexity bonuses
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1; // Mixed case
    if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1; // Numbers + special
    if (length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) {
        score += 2; // All character types in long password
    }

    // Penalties for weak patterns
    if (/(.)\1\1/.test(password)) score -= 2; // Repeated characters
    if (/(123|abc|qwe|pass|admin)/i.test(password)) score -= 2; // Common sequences
    if (/^[a-zA-Z]+$/.test(password)) score -= 1; // Letters only
    if (/^\d+$/.test(password)) score -= 2; // Numbers only

    // Ensure score is within bounds
    score = Math.max(0, Math.min(10, score));

    // Determine strength level
    if (score >= 9) return "very-strong";
    if (score >= 7) return "strong";
    if (score >= 5) return "good";
    if (score >= 3) return "fair";
    return "weak";
}

getPasswordSuggestions(password, failedRequirements) {
    const suggestions = [];
    
    if (!password) return suggestions;

    // Length suggestions
    if (password.length < 8) {
        suggestions.push("Make password at least 8 characters long");
    } else if (password.length < 12) {
        suggestions.push("Consider making password 12+ characters for better security");
    }

    // Character type suggestions
    if (!/[a-z]/.test(password)) {
        suggestions.push("Add some lowercase letters");
    }
    if (!/[A-Z]/.test(password)) {
        suggestions.push("Add some uppercase letters");
    }
    if (!/[0-9]/.test(password)) {
        suggestions.push("Include numbers");
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
        suggestions.push("Add special characters like !@#$%");
    }

    // Pattern suggestions
    if (/(.)\1\1/.test(password)) {
        suggestions.push("Avoid repeating the same character multiple times");
    }
    if (/(123|abc|qwe)/i.test(password)) {
        suggestions.push("Avoid simple sequences like '123' or 'abc'");
    }

    // Security suggestions
    if (password.length <= 12) {
        suggestions.push("Longer passwords are more secure");
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
        suggestions.push("Special characters significantly increase security");
    }

    return suggestions;
}

// Helper method to validate against company name
validatePasswordAgainstCompanyName(password, companyName) {
    if (!companyName || !password) return { isValid: true };
    
    const cleanCompanyName = companyName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanPassword = password.toLowerCase();
    
    if (cleanCompanyName.length >= 3 && cleanPassword.includes(cleanCompanyName)) {
        return {
            isValid: false,
            message: "Password should not contain the company name"
        };
    }
    
    return { isValid: true };
}

// Firebase-specific validation
isValidPasswordForFirebase(password) {
    const basicValidation = this.isValidPassword(password);
    
    if (!basicValidation.isValid) {
        return basicValidation;
    }

    // Additional Firebase-specific checks
    const firebaseChecks = {
        noEmoji: {
            test: !/\p{Emoji}/u.test(password),
            message: "Emoji characters are not supported"
        },
        noNonASCII: {
            test: /^[\x00-\x7F]*$/.test(password),
            message: "Only ASCII characters are supported"
        }
    };

    const firebaseFailures = Object.entries(firebaseChecks)
        .filter(([_, req]) => !req.test)
        .map(([_, req]) => req.message);

    if (firebaseFailures.length > 0) {
        return {
            isValid: false,
            message: `Firebase requirements: ${firebaseFailures.join(", ")}`,
            failedRequirements: [...basicValidation.failedRequirements, ...firebaseFailures],
            strength: basicValidation.strength,
            suggestions: basicValidation.suggestions
        };
    }

    return basicValidation;
}


  isValidPhoneNumber(phone) {
    // Nigerian phone number validation (accepts 080, 081, 070, 090, etc.)
    const phoneRegex = /^(?:\+234|0)[789][01]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  }

  showFieldError(field, message) {
    field.classList.add("border-red-500", "focus:ring-red-500");
    field.classList.remove(
      "border-gray-300",
      "dark:border-gray-600",
      "focus:ring-primary"
    );

    let errorElement = field.parentNode.querySelector(".field-error");
    if (!errorElement) {
      errorElement = document.createElement("p");
      errorElement.className = "field-error text-red-500 text-xs mt-1";
      field.parentNode.appendChild(errorElement);
    }
    errorElement.textContent = message;
  }

  clearFieldError(field) {
    field.classList.remove("border-red-500", "focus:ring-red-500");
    field.classList.add(
      "border-gray-300",
      "dark:border-gray-600",
      "focus:ring-primary"
    );

    const errorElement = field.parentNode.querySelector(".field-error");
    if (errorElement) {
      errorElement.remove();
    }
  }

  validateForm() {
    const fields = this.form.querySelectorAll(
      "input[required], select[required]"
    );
    let isValid = true;

    fields.forEach((field) => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) {
      this.showNotification("Please fix the errors in the form", "error");
      return;
    }

    // Show loading state
    const submitButton = this.form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Registering...";
    submitButton.disabled = true;

    try {
      await this.registerCompany();
    } catch (error) {
      console.error("Registration error:", error);
      this.showNotification(
        error.message || "Registration failed. Please try again.",
        "error"
      );
    } finally {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  }

  async registerCompany() {
    const formData = new FormData(this.form);

    // Get form values
    const companyData = {
      name: formData.get("company-name"),
      registrationNumber: formData.get("registration-number"),
      address: formData.get("address"),
      state: formData.get("state"),
      localGovernment: formData.get("local-government"),
      industry: formData.get("industry"),
      contactNumber: formData.get("contact-number"),
      email: formData.get("email"),
      logoFile: document.getElementById("file-upload").files[0],
    };

      console.log("password is "+formData.get("password"));
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        companyData.email,
        formData.get("password")
      );

      const userId = userCredential.user.uid;

      // Create company object with initial data
      const company = new Company({
        id: userId,
        name: companyData.name,
        email: companyData.email,
        phoneNumber: companyData.contactNumber,
        address: companyData.address,
        state: companyData.state,
        localGovernment: companyData.localGovernment,
        industry: companyData.industry,
        registrationNumber: companyData.registrationNumber,
        logoURL: "", // Will be set after upload
        description: "",
        website: "",
        foundedYear: new Date().getFullYear(),
        employeesCount: 0,
        socialMedia: {},
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Upload logo if provided
      if (companyData.logoFile) {
        try {

          const cloudStorage = new CloudStorage();

          // Upload the logo file
          const logoURL = await cloudStorage.uploadFile(
            companyData.logoFile,
            userId,
            "company-logos" 
          );

          if (logoURL) {
            company.logoURL = logoURL;
            
          } else {
            console.warn("Logo upload failed, continuing without logo");
            company.logoURL = ""; 
          }
        } catch (uploadError) {
          console.error("Error during logo upload:", uploadError);
          company.logoURL = ""; 
          this.showNotification(
            "Company registered but logo upload failed. You can update it later.",
            "warning"
          );
        }
      }

      
      console.log("Registering company in database...");
      await this.itc_firebaselogic.addCompany(company);

      // Show success message
      this.showNotification(
        "Company registered successfully! you'll be redirect to the login page.",
        "success"
      );
      // Reset form
      this.form.reset();
      this.addDropDownData(); // Reset dropdowns

      // Redirect to login after delay
      setTimeout(() => {
        window.location.href = "../../company/auth/company_login.html";
      }, 3000);
    } catch (error) {
      console.error("Registration error:", error);

      // Handle specific Firebase auth errors
      if (error.code === "auth/email-already-in-use") {
        throw new Error(
          "This email is already registered. Please use a different email or try logging in."
        );
      } else if (error.code === "auth/weak-password") {
        throw new Error("Password is too weak. Please contact support.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address format.");
      } else if (error.code === "auth/network-request-failed") {
        throw new Error(
          "Network error. Please check your connection and try again."
        );
      } else {
        throw new Error("Registration failed. Please try again.");
      }
    }
  }
  generateTempPassword() {
    // Generate a secure random password
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotification = document.querySelector(".form-notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `form-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === "success"
        ? "bg-green-500 text-white"
        : type === "error"
        ? "bg-red-500 text-white"
        : "bg-blue-500 text-white"
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  ////console.log("DOMContentLoaded");
  new CompanyRegistration();
});
