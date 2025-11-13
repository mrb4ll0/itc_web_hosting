export default class CurrentTraining {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.name = "CurrentTraining";
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filteredTrainees = [];
  }

  async init() {
    console.log("Initializing Current Training Tab");
    this.initializeElements();
    this.initializeEventListeners();
    await this.buildTrainingContent();
  }

  refresh(tabManager) {
    this.tabManager = tabManager;
    this.buildTrainingContent();
  }

  initializeElements() {
    // Table and pagination elements
    this.traineesTableBody = document.getElementById("trainees-table-body");
    this.exportBtn = document.getElementById("export-trainees-btn");
    this.addTraineeBtn = document.getElementById("add-trainee-btn");
    
    // Stats elements
    this.activeTraineesCount = document.getElementById("active-trainees-count");
    this.completionRate = document.getElementById("completion-rate");
    this.averageProgress = document.getElementById("average-progress");
    this.endingSoonCount = document.getElementById("ending-soon-count");
    
    // Pagination elements
    this.prevPageBtn = document.getElementById("trainees-prev-page");
    this.nextPageBtn = document.getElementById("trainees-next-page");
    this.paginationNumbers = document.getElementById("trainees-pagination-numbers");
    this.paginationStart = document.getElementById("trainees-pagination-start");
    this.paginationEnd = document.getElementById("trainees-pagination-end");
    this.paginationTotal = document.getElementById("trainees-pagination-total");

    // Activity sections
    this.recentActivitiesList = document.getElementById("recent-activities-list");
    this.upcomingDeadlinesList = document.getElementById("upcoming-deadlines-list");

    console.log("Current Training elements initialized");
  }

  initializeEventListeners() {
    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        this.exportTrainees();
      });
    }

    // Add trainee button
    if (this.addTraineeBtn) {
      this.addTraineeBtn.addEventListener("click", () => {
        this.addTrainee();
      });
    }

    // Pagination
    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener("click", () => {
        this.previousPage();
      });
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () => {
        this.nextPage();
      });
    }
  }

  async buildTrainingContent() {
    console.log("Building training content...");
    
    const currentTrainees = this.tabManager.getTrainingStudentsByDate("current");
    this.filteredTrainees = this.applyFilters(currentTrainees);
    
    this.updateStats();
    this.renderTraineesTable();
    this.updatePagination();
    this.renderRecentActivities();
    this.renderUpcomingDeadlines();
  }

  applyFilters(trainees) {
    const filters = this.tabManager.currentFilters || {};
    let filtered = [...trainees];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(trainee => {
        const student = trainee.application.student || {};
        const opportunity = trainee.opportunity || {};
        
        return (
          (student.name || '').toLowerCase().includes(searchTerm) ||
          (student.email || '').toLowerCase().includes(searchTerm) ||
          (opportunity.course || '').toLowerCase().includes(searchTerm) ||
          (opportunity.institution || '').toLowerCase().includes(searchTerm)
        );
      });
    }

    return filtered;
  }

  updateStats() {
    const totalTrainees = this.filteredTrainees.length;
    
    // Calculate stats
    const now = new Date();
    const endingThisMonth = this.filteredTrainees.filter(trainee => {
      const endDate = trainee.application.duration?.endDate ? new Date(trainee.application.duration.endDate) : null;
      if (!endDate) return false;
      
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return endDate <= endOfMonth && endDate >= now;
    }).length;

    const averageProgress = this.filteredTrainees.length > 0 
      ? Math.round(this.filteredTrainees.reduce((sum, trainee) => sum + (trainee.application.progress || 0), 0) / this.filteredTrainees.length)
      : 0;

    // Update DOM
    if (this.activeTraineesCount) {
      this.activeTraineesCount.textContent = totalTrainees;
    }
    if (this.completionRate) {
      const completed = this.filteredTrainees.filter(t => t.application.progress === 100).length;
      const rate = totalTrainees > 0 ? Math.round((completed / totalTrainees) * 100) : 0;
      this.completionRate.textContent = `${rate}%`;
    }
    if (this.averageProgress) {
      this.averageProgress.textContent = `${averageProgress}%`;
    }
    if (this.endingSoonCount) {
      this.endingSoonCount.textContent = endingThisMonth;
    }
  }

  renderTraineesTable() {
    if (!this.traineesTableBody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentTrainees = this.filteredTrainees.slice(startIndex, endIndex);

    this.traineesTableBody.innerHTML = '';

    if (currentTrainees.length === 0) {
      this.traineesTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <div class="flex flex-col items-center">
              <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">school</span>
              <p class="text-lg font-medium mb-1">No active trainees</p>
              <p class="text-sm">All current training sessions will appear here</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    currentTrainees.forEach((traineeData, index) => {
      const row = this.createTraineeRow(traineeData, startIndex + index);
      this.traineesTableBody.appendChild(row);
    });
  }

  createTraineeRow(traineeData, index) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
    
    const application = traineeData.application;
    const student = application.student || {};
    const opportunity = traineeData.opportunity || {};
    const duration = application.duration || {};
    
    const startDate = duration.startDate ? new Date(duration.startDate).toLocaleDateString() : 'N/A';
    const endDate = duration.endDate ? new Date(duration.endDate).toLocaleDateString() : 'N/A';
    const progress = application.progress || 0;
    
    // Calculate days remaining
    const daysRemaining = duration.endDate ? 
      Math.ceil((new Date(duration.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

    const statusConfig = this.getStatusConfig(progress, daysRemaining);

    // Get avatar content
    const avatarContent = getAvatarInitials(student.fullName, student.imageUrl);
    const hasImage = avatarContent.startsWith('url(');

    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
            hasImage 
              ? 'bg-cover bg-center' 
              : 'bg-gradient-to-br from-blue-500 to-purple-600'
          }" ${
            hasImage 
              ? `style="background-image: ${avatarContent}"` 
              : ''
          }>
            ${!hasImage ? avatarContent : ''}
          </div>
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900 dark:text-white">
              ${student.fullName || 'Unknown Trainee'}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              ${student.email || 'No email'}
            </div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-white">${opportunity.course || 'N/A'}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900 dark:text-white">${opportunity.institution || 'N/A'}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${startDate}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${endDate}
        ${daysRemaining !== null ? `<div class="text-xs text-gray-400">${daysRemaining} days left</div>` : ''}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
            <div class="bg-green-500 h-2 rounded-full transition-all duration-300" 
                 style="width: ${progress}%"></div>
          </div>
          <span class="text-sm text-gray-700 dark:text-gray-300">${progress}%</span>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.class}">
          ${statusConfig.icon ? `<span class="material-symbols-outlined text-xs mr-1">${statusConfig.icon}</span>` : ''}
          ${statusConfig.text}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex gap-2">
          <button class="view-trainee text-primary hover:text-blue-700 transition-colors" data-trainee-id="${application.id}">
            <span class="material-symbols-outlined text-base">visibility</span>
          </button>
          <button class="edit-progress text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors" data-trainee-id="${application.id}">
            <span class="material-symbols-outlined text-base">edit</span>
          </button>
          <button class="send-message text-green-600 hover:text-green-800 transition-colors" data-trainee-id="${application.id}">
            <span class="material-symbols-outlined text-base">mail</span>
          </button>
        </div>
      </td>
    `;

    this.attachTraineeEventListeners(row, application.id);
    return row;
  }

  getStatusConfig(progress, daysRemaining) {
    if (progress === 100) {
      return { class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Completed', icon: 'check_circle' };
    } else if (daysRemaining !== null && daysRemaining <= 7) {
      return { class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', text: 'Ending Soon', icon: 'warning' };
    } else if (progress >= 75) {
      return { class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', text: 'Almost Done', icon: 'trending_up' };
    } else if (progress >= 50) {
      return { class: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', text: 'In Progress', icon: 'pace' };
    } else {
      return { class: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', text: 'Started', icon: 'play_arrow' };
    }
  }

  attachTraineeEventListeners(row, traineeId) {
    const viewBtn = row.querySelector('.view-trainee');
    const editBtn = row.querySelector('.edit-progress');
    const messageBtn = row.querySelector('.send-message');

    if (viewBtn) {
      viewBtn.addEventListener('click', () => this.viewTrainee(traineeId));
    }
    if (editBtn) {
      editBtn.addEventListener('click', () => this.editProgress(traineeId));
    }
    if (messageBtn) {
      messageBtn.addEventListener('click', () => this.sendMessage(traineeId));
    }
  }

  // Pagination methods (similar to Applications class)
  updatePagination() {
    const totalTrainees = this.filteredTrainees.length;
    const totalPages = Math.ceil(totalTrainees / this.itemsPerPage);
    
    if (this.paginationStart && this.paginationEnd && this.paginationTotal) {
      const start = ((this.currentPage - 1) * this.itemsPerPage) + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, totalTrainees);
      
      this.paginationStart.textContent = start;
      this.paginationEnd.textContent = end;
      this.paginationTotal.textContent = totalTrainees;
    }

    if (this.prevPageBtn) {
      this.prevPageBtn.disabled = this.currentPage === 1;
    }

    if (this.nextPageBtn) {
      this.nextPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    }

    if (this.paginationNumbers) {
      this.paginationNumbers.innerHTML = '';
      
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `px-3 py-1 rounded border ${
          i === this.currentPage 
            ? 'border-primary bg-primary text-white' 
            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => this.goToPage(i));
        this.paginationNumbers.appendChild(pageBtn);
      }
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderTraineesTable();
      this.updatePagination();
    }
  }

  nextPage() {
    const totalPages = Math.ceil(this.filteredTrainees.length / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderTraineesTable();
      this.updatePagination();
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderTraineesTable();
    this.updatePagination();
  }

  // Activity methods
  renderRecentActivities() {
    if (!this.recentActivitiesList) return;

    // Sample activities - replace with real data
    const activities = [
      { type: 'progress', trainee: 'John Doe', course: 'Web Development', progress: 25, time: '2 hours ago' },
      { type: 'completed', trainee: 'Jane Smith', course: 'Data Science', progress: 100, time: '1 day ago' },
      { type: 'message', trainee: 'Mike Johnson', course: 'Mobile Development', progress: 60, time: '2 days ago' }
    ];

    if (activities.length === 0) {
      this.recentActivitiesList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">activity</span>
          <p>No recent activities</p>
        </div>
      `;
      return;
    }

    this.recentActivitiesList.innerHTML = activities.map(activity => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm">
            ${activity.type === 'progress' ? 'trending_up' : activity.type === 'completed' ? 'check_circle' : 'mail'}
          </span>
        </div>
        <div class="flex-1">
          <p class="text-sm text-gray-900 dark:text-white">
            <span class="font-medium">${activity.trainee}</span>
            ${activity.type === 'progress' ? 'made progress in' : activity.type === 'completed' ? 'completed' : 'sent a message about'}
            ${activity.course}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${activity.time}</p>
        </div>
      </div>
    `).join('');
  }

  renderUpcomingDeadlines() {
    if (!this.upcomingDeadlinesList) return;

    const now = new Date();
    const upcomingDeadlines = this.filteredTrainees
      .filter(trainee => {
        const endDate = trainee.application.duration?.endDate ? new Date(trainee.application.duration.endDate) : null;
        if (!endDate) return false;
        const daysUntilEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilEnd <= 30 && daysUntilEnd > 0;
      })
      .sort((a, b) => new Date(a.application.duration.endDate) - new Date(b.application.duration.endDate))
      .slice(0, 5);

    if (upcomingDeadlines.length === 0) {
      this.upcomingDeadlinesList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">event</span>
          <p>No upcoming deadlines</p>
        </div>
      `;
      return;
    }

    this.upcomingDeadlinesList.innerHTML = upcomingDeadlines.map(trainee => {
      const student = trainee.application.student || {};
      const endDate = new Date(trainee.application.duration.endDate);
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">${student.fullName || 'Unknown Trainee'}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${trainee.opportunity?.course || 'N/A'}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium ${daysLeft <= 7 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}">
              ${endDate.toLocaleDateString()}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${daysLeft} days left</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Action methods
  viewTrainee(traineeId) {
    console.log('View trainee:', traineeId);
    // Implement view trainee details
  }

  editProgress(traineeId) {
    console.log('Edit progress for trainee:', traineeId);
    // Implement progress editing
  }

  sendMessage(traineeId) {
    console.log('Send message to trainee:', traineeId);
    // Implement messaging
  }

  exportTrainees() {
    console.log('Export trainees');
    const traineesToExport = this.filteredTrainees;
    console.log('Exporting trainees:', traineesToExport);
    // Add actual export implementation
  }

  addTrainee() {
    console.log('Add new trainee');
    // Implement add trainee functionality
  }
}