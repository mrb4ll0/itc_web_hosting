// components/MigrationNotification.js
export class MigrationNotification {
  constructor(currentStudentService) {
    this.currentStudentService = currentStudentService;
    this.notificationElement = null;
     this.pendingMigrationCheck = null;
  }

  // Check and show migration notification
  async checkAndShowMigrationNotification(applications) {
    //console.log("checkAndShowMigrationNotification....");
    const pendingMigrations = await this.currentStudentService.getPendingMigrations(applications);
    //console.log("pending migration is "+JSON.stringify(pendingMigrations));
    
    if (pendingMigrations.count > 0 && !this.currentStudentService.isMigrationInProgress()) {
      this.showMigrationPrompt(pendingMigrations);
      return true;
    }
    
    return false;
  }

  showMigrationPrompt(pendingMigrations) {
    // Remove existing notification if any
    this.removeNotification();

    this.notificationElement = document.createElement('div');
    this.notificationElement.id = 'migration-notification';
    this.notificationElement.className = 'fixed top-4 right-4 bg-orange-500 text-white rounded-lg shadow-lg z-50 max-w-md';
    this.notificationElement.innerHTML = `
      <div class="p-4">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-white">system_update</span>
            <h3 class="font-semibold">Student Migration Required</h3>
          </div>
          <button id="close-migration-notification" class="text-white hover:text-orange-200 transition-colors">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        
        <p class="text-sm mb-4">
          You have <span class="font-bold">${pendingMigrations.count}</span> students whose training has started and need to be migrated to the current training system.
        </p>
        
        <div class="bg-orange-400 rounded p-3 mb-4 max-h-32 overflow-y-auto">
          <p class="text-xs font-semibold mb-2">Students to migrate:</p>
          <div class="space-y-1">
            ${pendingMigrations.details.slice(0, 5).map(student => `
              <div class="flex justify-between text-xs">
                <span>${student.studentName}</span>
                <span class="text-orange-200">${new Date(student.startDate).toLocaleDateString()}</span>
              </div>
            `).join('')}
            ${pendingMigrations.count > 5 ? `
              <div class="text-xs text-orange-200 text-center">
                ... and ${pendingMigrations.count - 5} more students
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="flex gap-2">
          <button id="start-migration-btn" class="flex-1 bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
            <span class="material-symbols-outlined text-base">play_arrow</span>
            Start Migration
          </button>
          <button id="remind-later-btn" class="px-4 py-2 text-orange-200 hover:text-white transition-colors">
            Later
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.notificationElement);

    // Add event listeners
    this.attachEventListeners(pendingMigrations.pending);
  }

  attachEventListeners(pendingApplications) {
    const closeBtn = this.notificationElement.querySelector('#close-migration-notification');
    const startBtn = this.notificationElement.querySelector('#start-migration-btn');
    const laterBtn = this.notificationElement.querySelector('#remind-later-btn');

    closeBtn.addEventListener('click', () => this.removeNotification());
    laterBtn.addEventListener('click', () => this.removeNotification());
    
    startBtn.addEventListener('click', () => {
      this.startMigration(pendingApplications);
    });
  }

  async startMigration(pendingApplications) {
    this.removeNotification();
    this.showMigrationProgress(pendingApplications.length);
    
    try {
      const results = await this.currentStudentService.startBackgroundMigration(
        pendingApplications,
        (progress) => this.updateProgressUI(progress)
      );
      
      // Check if migration had failures
      if (results.summary.failed > 0) {
        this.showMigrationFailure(results);
      } else {
        this.showMigrationResults(results);
      }
      
    } catch (error) {
      console.error('Migration error:', error);
      this.showMigrationError(error);
    }
  }

  showMigrationProgress(totalStudents) {
    this.notificationElement = document.createElement('div');
    this.notificationElement.id = 'migration-progress';
    this.notificationElement.className = 'fixed top-4 right-4 bg-blue-500 text-white rounded-lg shadow-lg z-50 max-w-md';
    this.notificationElement.innerHTML = `
      <div class="p-4">
        <div class="flex items-center gap-2 mb-3">
          <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          <h3 class="font-semibold">Migrating Students</h3>
        </div>
        
        <div class="mb-3">
          <div class="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span id="progress-text">0/${totalStudents}</span>
          </div>
          <div class="w-full bg-blue-400 rounded-full h-2">
            <div id="progress-bar" class="bg-white h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>
        
        <div id="current-student" class="text-sm text-blue-200 mb-2"></div>
        <div class="text-xs text-blue-200">This process runs in the background...</div>
        
        <button id="cancel-migration-btn" class="mt-3 px-4 py-1 bg-blue-400 hover:bg-blue-600 rounded text-sm transition-colors">
          Cancel Migration
        </button>
      </div>
    `;

    document.body.appendChild(this.notificationElement);

    // Add cancel event listener
    const cancelBtn = this.notificationElement.querySelector('#cancel-migration-btn');
    cancelBtn.addEventListener('click', () => {
      this.currentStudentService.cancelMigration();
      this.removeNotification();
      this.showTempMessage('Migration cancelled', 'warning');
    });
  }

  updateProgressUI(progress) {
    if (!this.notificationElement) return;

    const progressBar = this.notificationElement.querySelector('#progress-bar');
    const progressText = this.notificationElement.querySelector('#progress-text');
    const currentStudent = this.notificationElement.querySelector('#current-student');

    if (progressBar && progressText) {
      const percentage = (progress.current / progress.total) * 100;
      progressBar.style.width = `${percentage}%`;
      progressText.textContent = `${progress.current}/${progress.total}`;
    }

    if (currentStudent && progress.currentStudent) {
      currentStudent.textContent = `Migrating: ${progress.currentStudent}`;
    }

    // If migration completed
    if (progress.status === 'completed') {
      setTimeout(() => {
        this.removeNotification();
        
        // Check if there were failures in the results
        if (progress.summary && progress.summary.failed > 0) {
          this.showMigrationFailure({
            summary: progress.summary,
            failed: progress.failed || []
          });
        } else {
          this.showMigrationResults(progress.summary);
        }
      }, 1000);
    }
  }

  // NEW METHOD: Show migration failure (partial success)
  showMigrationFailure(results) {
    this.notificationElement = document.createElement('div');
    this.notificationElement.id = 'migration-failure';
    this.notificationElement.className = 'fixed top-4 right-4 bg-orange-500 text-white rounded-lg shadow-lg z-50 max-w-md';
    this.notificationElement.innerHTML = `
      <div class="p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-white">warning</span>
          <h3 class="font-semibold">Migration Partially Completed</h3>
        </div>
        
        <div class="space-y-2 text-sm mb-4">
          <div class="flex justify-between">
            <span>Successfully migrated:</span>
            <span class="font-semibold text-green-300">${results.summary.migrated} students</span>
          </div>
          <div class="flex justify-between">
            <span>Failed to migrate:</span>
            <span class="font-semibold text-red-300">${results.summary.failed} students</span>
          </div>
          ${results.summary.skipped > 0 ? `
            <div class="flex justify-between">
              <span>Skipped:</span>
              <span class="font-semibold text-yellow-300">${results.summary.skipped} students</span>
            </div>
          ` : ''}
        </div>
        
        ${results.failed && results.failed.length > 0 ? `
          <div class="bg-orange-400 rounded p-3 mb-4 max-h-24 overflow-y-auto">
            <p class="text-xs font-semibold mb-2">Failed migrations:</p>
            <div class="space-y-1">
              ${results.failed.slice(0, 3).map(failed => `
                <div class="flex justify-between text-xs">
                  <span>${failed.applicationId}</span>
                  <span class="text-orange-200">${failed.error || 'Unknown error'}</span>
                </div>
              `).join('')}
              ${results.failed.length > 3 ? `
                <div class="text-xs text-orange-200 text-center">
                  ... and ${results.failed.length - 3} more failures
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
        
        <div class="flex gap-2">
          <button id="retry-failed-btn" class="flex-1 bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg font-semibold transition-colors">
            Retry Failed
          </button>
          <button id="close-failure-btn" class="px-4 py-2 text-orange-200 hover:text-white transition-colors">
            Close
          </button>
        </div>
        
        <p class="text-xs text-orange-200 mt-3">
          Note: Successfully migrated students are available. Failed migrations need attention.
        </p>
      </div>
    `;

    document.body.appendChild(this.notificationElement);

    // Add event listeners for failure dialog
    const closeBtn = this.notificationElement.querySelector('#close-failure-btn');
    const retryBtn = this.notificationElement.querySelector('#retry-failed-btn');

    closeBtn.addEventListener('click', () => {
      this.removeNotification();
      // DON'T reload the UI - keep current state
      this.showTempMessage('Migration partially completed', 'warning');
    });

    retryBtn.addEventListener('click', () => {
      this.removeNotification();
      // Optionally implement retry logic for failed migrations
      this.showTempMessage('Retry feature coming soon', 'info');
    });

    // Auto-close after 8 seconds (longer for user to read)
    setTimeout(() => {
      if (this.notificationElement && this.notificationElement.id === 'migration-failure') {
        this.removeNotification();
        this.showTempMessage('Migration partially completed', 'warning');
      }
    }, 8000);
  }

  showMigrationResults(results) {
    this.notificationElement = document.createElement('div');
    this.notificationElement.id = 'migration-results';
    this.notificationElement.className = 'fixed top-4 right-4 bg-green-500 text-white rounded-lg shadow-lg z-50 max-w-md';
    this.notificationElement.innerHTML = `
      <div class="p-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-white">check_circle</span>
          <h3 class="font-semibold">Migration Complete</h3>
        </div>
        
        <div class="space-y-2 text-sm mb-4">
          <div class="flex justify-between">
            <span>Successfully migrated:</span>
            <span class="font-semibold">${results.migrated} students</span>
          </div>
          ${results.skipped > 0 ? `
            <div class="flex justify-between">
              <span>Skipped:</span>
              <span class="font-semibold">${results.skipped} students</span>
            </div>
          ` : ''}
        </div>
        
        <button id="close-results-btn" class="w-full bg-green-400 hover:bg-green-600 px-4 py-2 rounded-lg font-semibold transition-colors">
          Close
        </button>
      </div>
    `;

    document.body.appendChild(this.notificationElement);

    const closeBtn = this.notificationElement.querySelector('#close-results-btn');
    closeBtn.addEventListener('click', () => {
      this.removeNotification();
      // DON'T reload the UI - keep current state
      this.showTempMessage('Migration completed successfully', 'success');
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      if (this.notificationElement && this.notificationElement.id === 'migration-results') {
        this.removeNotification();
        this.showTempMessage('Migration completed successfully', 'success');
      }
    }, 5000);
  }

  showMigrationError(error) {
    this.removeNotification();
    
    this.notificationElement = document.createElement('div');
    this.notificationElement.id = 'migration-error';
    this.notificationElement.className = 'fixed top-4 right-4 bg-red-500 text-white rounded-lg shadow-lg z-50 max-w-md';
    this.notificationElement.innerHTML = `
      <div class="p-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="material-symbols-outlined text-white">error</span>
          <h3 class="font-semibold">Migration Failed</h3>
        </div>
        <p class="text-sm mb-3">The migration process encountered an error and could not complete.</p>
        <div class="bg-red-400 rounded p-2 mb-3">
          <p class="text-xs font-mono">${error.message || 'Unknown error occurred'}</p>
        </div>
        <div class="flex gap-2">
          <button id="retry-error-btn" class="flex-1 bg-white text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-semibold transition-colors">
            Try Again
          </button>
          <button id="close-error-btn" class="px-4 py-2 text-red-200 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.notificationElement);

    const closeBtn = this.notificationElement.querySelector('#close-error-btn');
    const retryBtn = this.notificationElement.querySelector('#retry-error-btn');

    closeBtn.addEventListener('click', () => {
      this.removeNotification();
      this.showTempMessage('Migration failed', 'error');
    });

    retryBtn.addEventListener('click', () => {
      this.removeNotification();
      // Optionally implement retry logic
      this.showTempMessage('Please check your connection and try again', 'info');
    });
  }

  removeNotification() {
    if (this.notificationElement) {
      this.notificationElement.remove();
      this.notificationElement = null;
    }
  }

  showTempMessage(message, type = 'info') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      type === 'warning' ? 'bg-orange-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    msgDiv.textContent = message;
    
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
      if (msgDiv.parentNode) {
        msgDiv.remove();
      }
    }, 3000);
  }
}