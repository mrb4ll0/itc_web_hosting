import { SupervisorDashboardService } from './services/supervisorDashboardService.js';
import {ITBaseCompanyCloud} from '../../js/fireabase/ITBaseCompanyCloud.js';
const it_base_company_cloud = new ITBaseCompanyCloud();

class SupervisorDashboard {
    constructor() {
        this.dashboardService = new SupervisorDashboardService();
        this.currentUser = null;
        this.students = [];
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
            this.showError('Failed to load dashboard: ' + error.message);
        }
    }

    setupEventListeners() {
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Refresh students
        document.getElementById('refreshStudentsBtn').addEventListener('click', () => this.refreshStudents());
        
        // New report
        document.getElementById('newReportBtn').addEventListener('click', () => this.createNewReport());
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => this.init());
    }

    async loadDashboardData() {
        try {
            // Load supervisor profile
            const supervisor = await this.dashboardService.getSupervisorProfile();
            this.supCompany = await it_base_company_cloud.getCompany(supervisor.companyId);
            //console.log("company id is "+supervisor.companyId);
            
            // Update user info in UI
            this.updateUserInfo(supervisor);
            
            // Load dashboard stats
            await this.loadStats();
            
            // Load assigned students
            await this.loadStudents();

            // Show main content
            this.showMainContent();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    updateUserInfo(supervisor) {
        // Update user name
        document.getElementById('userName').textContent = supervisor.displayName || 'Supervisor';
        
        // Update profile pictures (you can add actual profile picture URLs here)
        const profilePicture = supervisor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(supervisor.displayName || 'Supervisor')}&background=3858fa&color=fff`;
        document.getElementById('profilePicture').style.backgroundImage = `url('${profilePicture}')`;
        document.getElementById('headerProfile').style.backgroundImage = `url('${this.supCompany.logoURL}')`;
    }

    async loadStats() {
        try {
            const stats = await this.dashboardService.getSupervisorStats();
            
            document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
            document.getElementById('pendingSubmissions').textContent = stats.pendingSubmissions || 0;
            document.getElementById('flaggedIssues').textContent = stats.flaggedIssues || 0;
            
            // Show notification badge if there are pending submissions or flagged issues
            const totalNotifications = (stats.pendingSubmissions || 0) + (stats.flaggedIssues || 0);
            const notificationBadge = document.getElementById('notificationBadge');
            if (totalNotifications > 0) {
                notificationBadge.classList.remove('hidden');
            } else {
                notificationBadge.classList.add('hidden');
            }

        } catch (error) {
            console.error('Error loading stats:', error);
            // Set default values on error
            document.getElementById('totalStudents').textContent = '0';
            document.getElementById('pendingSubmissions').textContent = '0';
            document.getElementById('flaggedIssues').textContent = '0';
        }
    }

    async loadStudents() {
        try {
            this.students = await this.dashboardService.getAssignedStudents();
            this.renderStudentsTable(this.students);

        } catch (error) {
            console.error('Error loading students:', error);
            this.showEmptyStudentsState('Failed to load students');
        }
    }

    renderStudentsTable(students) {
        const tableBody = document.getElementById('studentsTableBody');
        const emptyState = document.getElementById('emptyStudentsState');

        tableBody.innerHTML = '';

        if (students.length === 0) {
            tableBody.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        tableBody.classList.remove('hidden');
        emptyState.classList.add('hidden');

        students.forEach(student => {
            const row = this.createStudentRow(student);
            tableBody.appendChild(row);
        });
    }

    createStudentRow(student) {
        const row = document.createElement('tr');
        row.className = 'bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
        
        // Status badge styling
        const statusConfig = {
            'In Progress': { class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
            'Awaiting Review': { class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
            'Issue Flagged': { class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
            'Completed': { class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
        };

        const statusInfo = statusConfig[student.status] || statusConfig['In Progress'];

        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                <div class="flex items-center gap-3">
                    <img class="w-8 h-8 rounded-full" alt="avatar of ${student.name}" src="${student.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random`}"/>
                    <span>${student.name}</span>
                </div>
            </td>
            <td class="px-6 py-4">${student.company}</td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center ${statusInfo.class} text-xs font-medium px-2.5 py-0.5 rounded-full">${student.status}</span>
            </td>
            <td class="px-6 py-4">${student.lastActivity}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                    <button class="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 view-student" data-student-id="${student.id}">
                        <span class="material-symbols-outlined text-lg">visibility</span>
                    </button>
                    <button class="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 email-student" data-student-email="${student.email}">
                        <span class="material-symbols-outlined text-lg">mail</span>
                    </button>
                    <button class="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 review-student" data-student-id="${student.id}">
                        <span class="material-symbols-outlined text-lg">rate_review</span>
                    </button>
                </div>
            </td>
        `;

        // Add event listeners to action buttons
        this.attachStudentActionListeners(row, student);

        return row;
    }

    attachStudentActionListeners(row, student) {
        // View student
        row.querySelector('.view-student').addEventListener('click', () => this.viewStudent(student));
        
        // Email student
        row.querySelector('.email-student').addEventListener('click', () => this.emailStudent(student));
        
        // Review student
        row.querySelector('.review-student').addEventListener('click', () => this.reviewStudent(student));
    }

    viewStudent(student) {
        //console.log('Viewing student:', student);
        // Implement view student functionality
        alert(`Viewing ${student.name}'s profile`);
    }

    emailStudent(student) {
        //console.log('Emailing student:', student);
        // Implement email functionality
        window.location.href = `mailto:${student.email}?subject=IT Connect - Regarding Your Internship`;
    }

    reviewStudent(student) {
        //console.log('Reviewing student:', student);
        // Implement review functionality
        alert(`Opening review for ${student.name}`);
    }

    handleSearch(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderStudentsTable(this.students);
            return;
        }

        const filteredStudents = this.students.filter(student => 
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderStudentsTable(filteredStudents);
    }

    async refreshStudents() {
        try {
            const refreshBtn = document.getElementById('refreshStudentsBtn');
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">refresh</span> Refreshing...';

            await this.loadStudents();
            await this.loadStats();

        } catch (error) {
            console.error('Error refreshing students:', error);
            this.showError('Failed to refresh data');
        } finally {
            const refreshBtn = document.getElementById('refreshStudentsBtn');
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<span class="material-symbols-outlined text-base">refresh</span> Refresh';
        }
    }

    createNewReport() {
        //console.log('Creating new report');
        // Implement new report functionality
        alert('Opening new report creation form');
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

    // UI Helper Methods
    showLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        const mainContent = document.getElementById('mainContent');
        const errorSection = document.getElementById('errorSection');
        
        if (show) {
            loadingSection.classList.remove('hidden');
            mainContent.classList.add('hidden');
            errorSection.classList.add('hidden');
        } else {
            loadingSection.classList.add('hidden');
        }
    }

    showMainContent() {
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        document.getElementById('errorSection').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('errorSection').classList.remove('hidden');
        document.getElementById('errorMessage').textContent = message;
    }

    showEmptyStudentsState(message) {
        const emptyState = document.getElementById('emptyStudentsState');
        const tableBody = document.getElementById('studentsTableBody');
        
        if (message) {
            emptyState.querySelector('p').textContent = message;
        }
        
        tableBody.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }
}

export { SupervisorDashboard };