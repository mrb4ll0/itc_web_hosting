import { SupervisorAuthService } from '../../services/supervisorAuthService.js';

class SupervisorAuthController {
    constructor() {
        this.authService = new SupervisorAuthService();
        this.currentStep = 'code'; // 'code' or 'registration'
    }

    initSignup() {
        this.setupSignupEventListeners();
    }

    initLogin() {
        this.setupLoginEventListeners();
    }


    setupSignupEventListeners() {
      //console.log("signup even listeners is set");
        const companyCodeForm = document.getElementById('companyCodeForm');
        const registrationForm = document.getElementById('registrationForm');
        const backToCodeBtn = document.getElementById('backToCodeBtn');

        // Only add event listeners if elements exist (for signup page)
        if (companyCodeForm) {
            companyCodeForm.addEventListener('submit', (e) => this.handleCompanyCodeSubmit(e));
        }
        
        if (registrationForm) {
            registrationForm.addEventListener('submit', (e) => this.handleRegistrationSubmit(e));
        }
        
        if (backToCodeBtn) {
            backToCodeBtn.addEventListener('click', () => this.showCompanyCodeForm());
        }
    }

    setupLoginEventListeners() {
        const loginForm = document.getElementById('loginForm');
        
        // Only add event listener if login form exists (for login page)
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
        }
    }

    async handleCompanyCodeSubmit(e) {
        e.preventDefault();
        
        const companyCode = document.getElementById('companyCode').value.trim();
        
        if (!companyCode) {
            this.showError('Please enter a company code');
            return;
        }

        try {
            this.showLoading(true);
            
            // Verify company code
            const isValid = await this.authService.verifyCompanyCode(companyCode);
            //console.log("isValid "+isValid);
            
            if (isValid) {
                this.authService.setCompanyCode(companyCode);
                this.showRegistrationForm();
            } else {
                this.showError('Invalid company code. Please check with your company.');
            }
        } catch (error) {
            console.error('Error verifying company code:', error);
            this.showError('Failed to verify company code. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegistrationSubmit(e) {
        e.preventDefault();
        
        const displayName = document.getElementById('displayName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        // Validation
        if (!displayName) {
            this.showError('Please enter your full name');
            return;
        }

        if (!email) {
            this.showError('Please enter your email address');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        if (!terms) {
            this.showError('Please agree to the terms and conditions');
            return;
        }

        try {
            this.showLoading(true);
            
            // Create supervisor account
            const user = await this.authService.createSupervisorAccount(
                email, 
                password, 
                displayName
            );
             
            this.showSuccess();
            
        } catch (error) {
            console.error('Error creating account:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.showLoading(false);
        }
    }

    async handleLoginSubmit(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showError('Please enter both email and password');
            return;
        }

        try {
            this.showLoading(true);
            
            // Sign in supervisor
            const user = await this.authService.signInSupervisor(email, password);
            
            // Redirect to dashboard
            window.location.href = 'supervisor_dashboard.html';
            
        } catch (error) {
            console.error('Error signing in:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.showLoading(false);
        }
    }

    showCompanyCodeForm() {
        const companyCodeForm = document.getElementById('companyCodeForm');
        const registrationForm = document.getElementById('registrationForm');
        
        if (companyCodeForm && registrationForm) {
            companyCodeForm.classList.remove('hidden');
            registrationForm.classList.add('hidden');
            this.currentStep = 'code';
        }
    }

    showRegistrationForm() {
        const companyCodeForm = document.getElementById('companyCodeForm');
        const registrationForm = document.getElementById('registrationForm');
        
        if (companyCodeForm && registrationForm) {
            companyCodeForm.classList.add('hidden');
            registrationForm.classList.remove('hidden');
            this.currentStep = 'registration';
        }
    }

    showLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        const companyCodeForm = document.getElementById('companyCodeForm');
        const registrationForm = document.getElementById('registrationForm');
        const loginForm = document.getElementById('loginForm');

        if (!loadingSection) return;

        if (show) {
            if (companyCodeForm) companyCodeForm.classList.add('hidden');
            if (registrationForm) registrationForm.classList.add('hidden');
            if (loginForm) loginForm.classList.add('hidden');
            loadingSection.classList.remove('hidden');
        } else {
            loadingSection.classList.add('hidden');
            
            if (this.currentStep === 'code' && companyCodeForm) {
                companyCodeForm.classList.remove('hidden');
            } else if (this.currentStep === 'registration' && registrationForm) {
                registrationForm.classList.remove('hidden');
            } else if (loginForm) {
                loginForm.classList.remove('hidden');
            }
        }
    }

    showSuccess() {
        const registrationForm = document.getElementById('registrationForm');
        const successSection = document.getElementById('successSection');
        
        if (registrationForm && successSection) {
            registrationForm.classList.add('hidden');
            successSection.classList.remove('hidden');
        }
    }

    showError(message) {
        alert(`Error: ${message}`);
    }

    getErrorMessage(error) {
        if (error.code === 'auth/email-already-in-use') {
            return 'An account with this email already exists.';
        } else if (error.code === 'auth/invalid-email') {
            return 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            return 'Password is too weak.';
        } else if (error.code === 'auth/user-not-found') {
            return 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            return 'Incorrect password.';
        } else {
            return error.message || 'An unexpected error occurred.';
        }
    }
}

export { SupervisorAuthController };
