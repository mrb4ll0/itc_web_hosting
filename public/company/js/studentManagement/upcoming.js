export default class UpcomingTraining {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.name = "UpcomingTraining";
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.filteredUpcoming = [];
  }

  async init() {
    console.log("Initializing Upcoming Training Tab");
    this.initializeElements();
    this.initializeEventListeners();
    await this.buildUpcomingContent();
  }

  refresh(tabManager) {
    this.tabManager = tabManager;
    this.buildUpcomingContent();
  }

  initializeElements() {
    // Table and pagination elements
    this.upcomingTableBody = document.getElementById("upcoming-table-body");
    this.exportBtn = document.getElementById("export-upcoming-btn");
    this.scheduleTrainingBtn = document.getElementById("schedule-training-btn");
    
    // Stats elements
    this.totalUpcomingCount = document.getElementById("total-upcoming-count");
    this.startingThisMonthCount = document.getElementById("starting-this-month-count");
    this.startingNextWeekCount = document.getElementById("starting-next-week-count");
    this.needPreparationCount = document.getElementById("need-preparation-count");
    
    // Pagination elements
    this.prevPageBtn = document.getElementById("upcoming-prev-page");
    this.nextPageBtn = document.getElementById("upcoming-next-page");
    this.paginationNumbers = document.getElementById("upcoming-pagination-numbers");
    this.paginationStart = document.getElementById("upcoming-pagination-start");
    this.paginationEnd = document.getElementById("upcoming-pagination-end");
    this.paginationTotal = document.getElementById("upcoming-pagination-total");

    // Preparation sections
    this.startingSoonList = document.getElementById("starting-soon-list");
    this.startingSoonCount = document.getElementById("starting-soon-count");
    this.preparationNeededList = document.getElementById("preparation-needed-list");
    this.preparationNeededCount = document.getElementById("preparation-needed-count");
    this.monthlySchedule = document.getElementById("monthly-schedule");

    console.log("Upcoming Training elements initialized");
  }

  initializeEventListeners() {
    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        this.exportUpcoming();
      });
    }

    // Schedule training button
    if (this.scheduleTrainingBtn) {
      this.scheduleTrainingBtn.addEventListener("click", () => {
        this.scheduleTraining();
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

  async buildUpcomingContent() {
    console.log("Building upcoming training content...");
    
    const upcomingTrainees = this.tabManager.getTrainingStudentsByDate("upcoming");
    this.filteredUpcoming = this.applyFilters(upcomingTrainees);
    
    this.updateStats();
    this.renderUpcomingTable();
    this.updatePagination();
    this.renderStartingSoon();
    this.renderPreparationNeeded();
    this.renderMonthlySchedule();
  }

  applyFilters(upcoming) {
    const filters = this.tabManager.currentFilters || {};
    let filtered = [...upcoming];

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
    const now = new Date();
    const totalUpcoming = this.filteredUpcoming.length;
    
    // Calculate various stats
    const startingThisMonth = this.filteredUpcoming.filter(trainee => {
      const startDate = trainee.application.duration?.startDate ? new Date(trainee.application.duration.startDate) : null;
      if (!startDate) return false;
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return startDate >= startOfMonth && startDate <= endOfMonth;
    }).length;

    const startingNextWeek = this.filteredUpcoming.filter(trainee => {
      const startDate = trainee.application.duration?.startDate ? new Date(trainee.application.duration.startDate) : null;
      if (!startDate) return false;
      
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      const endOfNextWeek = new Date(nextWeek);
      endOfNextWeek.setDate(nextWeek.getDate() + 7);
      
      return startDate >= nextWeek && startDate <= endOfNextWeek;
    }).length;

    const needPreparation = this.filteredUpcoming.filter(trainee => {
      const startDate = trainee.application.duration?.startDate ? new Date(trainee.application.duration.startDate) : null;
      if (!startDate) return false;
      
      const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilStart <= 14; // Need preparation if starting within 2 weeks
    }).length;

    // Update DOM
    if (this.totalUpcomingCount) {
      this.totalUpcomingCount.textContent = totalUpcoming;
    }
    if (this.startingThisMonthCount) {
      this.startingThisMonthCount.textContent = startingThisMonth;
    }
    if (this.startingNextWeekCount) {
      this.startingNextWeekCount.textContent = startingNextWeek;
    }
    if (this.needPreparationCount) {
      this.needPreparationCount.textContent = needPreparation;
    }
  }

  renderUpcomingTable() {
    if (!this.upcomingTableBody) return;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const currentUpcoming = this.filteredUpcoming.slice(startIndex, endIndex);

    this.upcomingTableBody.innerHTML = '';

    if (currentUpcoming.length === 0) {
      this.upcomingTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <div class="flex flex-col items-center">
              <span class="material-symbols-outlined text-4xl mb-2 text-gray-300">event_upcoming</span>
              <p class="text-lg font-medium mb-1">No upcoming training sessions</p>
              <p class="text-sm">All scheduled upcoming training will appear here</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    currentUpcoming.forEach((traineeData, index) => {
      const row = this.createUpcomingRow(traineeData, startIndex + index);
      this.upcomingTableBody.appendChild(row);
    });
  }

  createUpcomingRow(traineeData, index) {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
    
    const application = traineeData.application;
    const student = application.student || {};
    const opportunity = traineeData.opportunity || {};
    const duration = application.duration || {};
    
    const startDate = duration.startDate ? new Date(duration.startDate) : null;
    const endDate = duration.endDate ? new Date(duration.endDate) : null;
    
    const formattedStartDate = startDate ? startDate.toLocaleDateString() : 'Not scheduled';
    const formattedEndDate = endDate ? endDate.toLocaleDateString() : 'Not specified';
    
    // Calculate days until start and duration
    const now = new Date();
    const daysUntilStart = startDate ? Math.ceil((startDate - now) / (1000 * 60 * 60 * 24)) : null;
    const durationDays = startDate && endDate ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : null;

    const statusConfig = this.getStatusConfig(daysUntilStart);

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
        ${formattedStartDate}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium ${
          daysUntilStart !== null 
            ? daysUntilStart <= 7 
              ? 'text-orange-600 dark:text-orange-400'
              : daysUntilStart <= 30
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400'
            : 'text-gray-400 dark:text-gray-500'
        }">
          ${daysUntilStart !== null ? `${daysUntilStart} days` : 'Not scheduled'}
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        ${durationDays ? `${durationDays} days` : 'Not specified'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.class}">
          ${statusConfig.icon ? `<span class="material-symbols-outlined text-xs mr-1">${statusConfig.icon}</span>` : ''}
          ${statusConfig.text}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex gap-2">
          <button class="view-upcoming text-primary hover:text-blue-700 transition-colors" data-trainee-id="${application.id}">
            <span class="material-symbols-outlined text-base">visibility</span>
          </button>
          <button class="reschedule-training text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors" data-trainee-id="${application.id}">
            <span class="material-symbols-outlined text-base">edit_calendar</span>
          </button>
          <button class="send-reminder text-green-600 hover:text-green-800 transition-colors" data-trainee-id="${application.id}">
            <span class="material-symbols-outlined text-base">notification</span>
          </button>
          <button class="cancel-training text-red-600 hover:text-red-800 transition-colors" data-trainee-id="${application.id}">
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </td>
    `;

    this.attachUpcomingEventListeners(row, application.id);
    return row;
  }

  getStatusConfig(daysUntilStart) {
    if (daysUntilStart === null) {
      return { class: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', text: 'Not Scheduled', icon: 'schedule' };
    } else if (daysUntilStart <= 3) {
      return { class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', text: 'Starting Soon', icon: 'warning' };
    } else if (daysUntilStart <= 7) {
      return { class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', text: 'Next Week', icon: 'event_upcoming' };
    } else if (daysUntilStart <= 30) {
      return { class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', text: 'This Month', icon: 'calendar_month' };
    } else {
      return { class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', text: 'Future', icon: 'event' };
    }
  }

  attachUpcomingEventListeners(row, traineeId) {
    const viewBtn = row.querySelector('.view-upcoming');
    const rescheduleBtn = row.querySelector('.reschedule-training');
    const reminderBtn = row.querySelector('.send-reminder');
    const cancelBtn = row.querySelector('.cancel-training');

    if (viewBtn) {
      viewBtn.addEventListener('click', () => this.viewUpcoming(traineeId));
    }
    if (rescheduleBtn) {
      rescheduleBtn.addEventListener('click', () => this.rescheduleTraining(traineeId));
    }
    if (reminderBtn) {
      reminderBtn.addEventListener('click', () => this.sendReminder(traineeId));
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelTraining(traineeId));
    }
  }

  // Pagination methods
  updatePagination() {
    const totalUpcoming = this.filteredUpcoming.length;
    const totalPages = Math.ceil(totalUpcoming / this.itemsPerPage);
    
    if (this.paginationStart && this.paginationEnd && this.paginationTotal) {
      const start = ((this.currentPage - 1) * this.itemsPerPage) + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, totalUpcoming);
      
      this.paginationStart.textContent = start;
      this.paginationEnd.textContent = end;
      this.paginationTotal.textContent = totalUpcoming;
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
      this.renderUpcomingTable();
      this.updatePagination();
    }
  }

  nextPage() {
    const totalPages = Math.ceil(this.filteredUpcoming.length / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderUpcomingTable();
      this.updatePagination();
    }
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderUpcomingTable();
    this.updatePagination();
  }

  // Preparation sections
  renderStartingSoon() {
    if (!this.startingSoonList) return;

    const now = new Date();
    const startingSoon = this.filteredUpcoming
      .filter(trainee => {
        const startDate = trainee.application.duration?.startDate ? new Date(trainee.application.duration.startDate) : null;
        if (!startDate) return false;
        const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilStart <= 7 && daysUntilStart > 0;
      })
      .sort((a, b) => new Date(a.application.duration.startDate) - new Date(b.application.duration.startDate));

    // Update count
    if (this.startingSoonCount) {
      this.startingSoonCount.textContent = startingSoon.length;
    }

    if (startingSoon.length === 0) {
      this.startingSoonList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">event_upcoming</span>
          <p>No trainees starting in the next 7 days</p>
        </div>
      `;
      return;
    }

    this.startingSoonList.innerHTML = startingSoon.map(trainee => {
      const student = trainee.application.student || {};
      const startDate = new Date(trainee.application.duration.startDate);
      const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
      
      return `
        <div class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-orange-100 dark:bg-orange-800 rounded-lg">
              <span class="material-symbols-outlined text-orange-600 dark:text-orange-400 text-sm">event_upcoming</span>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">${student.fullName || 'Unknown Trainee'}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${trainee.opportunity?.course || 'N/A'}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-orange-600 dark:text-orange-400">
              ${startDate.toLocaleDateString()}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${daysUntilStart} days</p>
          </div>
        </div>
      `;
    }).join('');
  }

  renderPreparationNeeded() {
    if (!this.preparationNeededList) return;

    const now = new Date();
    const preparationNeeded = this.filteredUpcoming
      .filter(trainee => {
        const startDate = trainee.application.duration?.startDate ? new Date(trainee.application.duration.startDate) : null;
        if (!startDate) return false;
        const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilStart <= 14 && daysUntilStart > 0;
      })
      .sort((a, b) => new Date(a.application.duration.startDate) - new Date(b.application.duration.startDate));

    // Update count
    if (this.preparationNeededCount) {
      this.preparationNeededCount.textContent = preparationNeeded.length;
    }

    if (preparationNeeded.length === 0) {
      this.preparationNeededList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">checklist</span>
          <p>All upcoming trainings are prepared</p>
        </div>
      `;
      return;
    }

    this.preparationNeededList.innerHTML = preparationNeeded.map(trainee => {
      const student = trainee.application.student || {};
      const startDate = new Date(trainee.application.duration.startDate);
      const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
      
      return `
        <div class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
              <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-sm">checklist</span>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">${student.fullName || 'Unknown Trainee'}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${trainee.opportunity?.course || 'N/A'}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-red-600 dark:text-red-400">
              ${startDate.toLocaleDateString()}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Prepare in ${daysUntilStart} days</p>
          </div>
        </div>
      `;
    }).join('');
  }

  renderMonthlySchedule() {
    if (!this.monthlySchedule) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Group by month
    const monthlyStats = {};
    this.filteredUpcoming.forEach(trainee => {
      const startDate = trainee.application.duration?.startDate ? new Date(trainee.application.duration.startDate) : null;
      if (!startDate) return;

      const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: startDate.getMonth(),
          year: startDate.getFullYear(),
          count: 0
        };
      }
      monthlyStats[monthKey].count++;
    });

    const sortedMonths = Object.values(monthlyStats)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .slice(0, 4); // Show next 4 months

    if (sortedMonths.length === 0) {
      this.monthlySchedule.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400 col-span-full">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">calendar_month</span>
          <p>No upcoming training schedule</p>
        </div>
      `;
      return;
    }

    this.monthlySchedule.innerHTML = sortedMonths.map(monthStat => {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const isCurrentMonth = monthStat.month === currentMonth && monthStat.year === currentYear;
      
      return `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center border ${
          isCurrentMonth ? 'border-primary' : 'border-gray-200 dark:border-gray-600'
        }">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-300">${monthNames[monthStat.month]} ${monthStat.year}</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">${monthStat.count}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">training${monthStat.count !== 1 ? 's' : ''}</p>
        </div>
      `;
    }).join('');
  }

  // Action methods
  viewUpcoming(traineeId) {
    console.log('View upcoming trainee:', traineeId);
    // Implement view upcoming trainee details
  }

  rescheduleTraining(traineeId) {
    console.log('Reschedule training for:', traineeId);
    // Implement rescheduling functionality
  }

  sendReminder(traineeId) {
    console.log('Send reminder to:', traineeId);
    // Implement reminder system
  }

  cancelTraining(traineeId) {
    if (confirm('Are you sure you want to cancel this upcoming training? This action cannot be undone.')) {
      console.log('Cancel training:', traineeId);
      // Implement cancellation logic
      this.buildUpcomingContent();
    }
  }

  exportUpcoming() {
    console.log('Export upcoming training');
    const upcomingToExport = this.filteredUpcoming;
    console.log('Exporting upcoming training:', upcomingToExport);
    // Add actual export implementation
  }

  scheduleTraining() {
    console.log('Schedule new training');
    // Implement schedule training functionality
  }
}