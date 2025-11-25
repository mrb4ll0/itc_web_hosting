import { SupervisorDashboardService } from '../services/supervisorDashboardService.js';

class SupervisorDashboardController {
    constructor() {
        this.dashboardService = new SupervisorDashboardService();
        this.currentUser = null;
    }

    async init() {
        try {
            this.showLoading(true);
            
            // Check authentication
            this.currentUser = await this.dashboardService.getCurrentUser();
            if (!this.currentUser) {
                window.location.href = 'supervisor_login.html';
                return;
            }

            this.setupEventListeners();
            await this.loadDashboardData();

        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to load dashboard');
        } finally {
            this.showLoading(false);
        }
    }

    setupEventListeners() {
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('refreshStudentsBtn').addEventListener('click', () => this.refreshStudents());
        document.getElementById('refreshApplicationsBtn').addEventListener('click', () => this.refreshApplications());
    }

    async loadDashboardData() {
        try {
            // Load supervisor profile
            const supervisor = await this.dashboardService.getSupervisorProfile();
            
            // Update UI
            document.getElementById('userEmail').textContent = this.currentUser.email;
            document.getElementById('companyName').textContent = `Company: ${supervisor.companyCode}`;
            
            // Load stats
            await this.loadStats();
            
            // Load students and applications
            await this.loadStudents();
            await this.loadApplications();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    async loadStats() {
        const stats = await this.dashboardService.getSupervisorStats();
        
        document.getElementById('studentCount').textContent = stats.studentCount;
        document.getElementById('applicationCount').textContent = stats.applicationCount;
        document.getElementById('completedTasks').textContent = stats.completedTasks;
    }

    async loadStudents() {
        const students = await this.dashboardService.getAssignedStudents();
        const studentsList = document.getElementById('studentsList');
        const emptyStudents = document.getElementById('emptyStudents');

        studentsList.innerHTML = '';

        if (students.length === 0) {
            emptyStudents.classList.remove('hidden');
            return;
        }

        emptyStudents.classList.add('hidden');

        students.forEach(student => {
            const studentElement = this.createStudentElement(student);
            studentsList.appendChild(studentElement);
        });
    }

    async loadApplications() {
        const applications = await this.dashboardService.getAssignedApplications();
        const applicationsList = document.getElementById('applicationsList');
        const emptyApplications = document.getElementById('emptyApplications');

        applicationsList.innerHTML = '';

        if (applications.length === 0) {
            emptyApplications.classList.remove('hidden');
            return;
        }

        emptyApplications.classList.add('hidden');

        applications.forEach(application => {
            const applicationElement = this.createApplicationElement(application);
            applicationsList.appendChild(applicationElement);
        });
    }

    createStudentElement(student) {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg';
        
        div.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-sm">person</span>
                </div>
                <div>
                    <h4 class="font-medium text-slate-800 dark:text-slate-100">${student.name}</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400">${student.email}</p>
                </div>
            </div>
            <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                ${student.status || 'Active'}
            </span>
        `;

        return div;
    }

    createApplicationElement(application) {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg';
        
        div.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-white text-sm">description</span>
                </div>
                <div>
                    <h4 class="font-medium text-slate-800 dark:text-slate-100">${application.title}</h4>
                    <p class="text-sm text-slate-600 dark:text-slate-400">From: ${application.studentName}</p>
                </div>
            </div>
            <span class="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm rounded-full">
                ${application.status || 'Pending'}
            </span>
        `;

        return div;
    }

    async refreshStudents() {
        try {
            await this.loadStudents();
            await this.loadStats();
        } catch (error) {
            console.error('Error refreshing students:', error);
            this.showError('Failed to refresh students');
        }
    }

    async refreshApplications() {
        try {
            await this.loadApplications();
            await this.loadStats();
        } catch (error) {
            console.error('Error refreshing applications:', error);
            this.showError('Failed to refresh applications');
        }
    }

    async logout() {
        try {
            await this.dashboardService.signOut();
            window.location.href = 'supervisor_login.html';
        } catch (error) {
            console.error('Error logging out:', error);
            this.showError('Failed to logout');
        }
    }

    showLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        const mainContent = document.querySelector('main');
        
        if (show) {
            mainContent.classList.add('hidden');
            loadingSection.classList.remove('hidden');
        } else {
            loadingSection.classList.add('hidden');
            mainContent.classList.remove('hidden');
        }
    }

    showError(message) {
        alert(`Error: ${message}`);
    }
}

export { SupervisorDashboardController };