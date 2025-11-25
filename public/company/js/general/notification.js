import { ITCFirebaseLogic } from "../../../js/fireabase/ITCFirebaseLogic.js";
import { auth,db } from "../../../js/config/firebaseInit.js";
const itc_firebase_logic =  new ITCFirebaseLogic();

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Get DOM elements
        this.markAllReadBtn = document.getElementById('mark-all-read-btn');
        this.filterTypeBtn = document.getElementById('filter-type-btn');
        this.filterAllTab = document.getElementById('filter-all-tab');
        this.filterUnreadTab = document.getElementById('filter-unread-tab');
        this.filterArchivedTab = document.getElementById('filter-archived-tab');
        this.searchInput = document.getElementById('search-input');
        this.notificationsContainer = document.getElementById('notifications-container');
        this.emptyState = document.getElementById('empty-state');
        this.profileImg = document.getElementById('company-logo');
        this.loadCompanyLogo();
    }

   async loadCompanyLogo()
    {
         await auth.authStateReady();
         
        this.company = await itc_firebase_logic.getCompany(auth.currentUser.uid);
        //console.log("logo url "+this.company.logoURL);
        this.profileImg.style.backgroundImage = `url('${this.company.logoURL}')`;
    }

    bindEvents() {
        // Event listeners
        this.markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Filter tab events
        this.filterAllTab.addEventListener('click', () => this.setActiveFilter('all'));
        this.filterUnreadTab.addEventListener('click', () => this.setActiveFilter('unread'));
        this.filterArchivedTab.addEventListener('click', () => this.setActiveFilter('archived'));
    }

    // Method to render notifications
    renderNotifications() {
        if (this.notifications.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        this.clearNotificationsContainer();
        this.renderNotificationElements();
    }

    showEmptyState() {
        this.emptyState.style.display = 'block';
    }

    hideEmptyState() {
        this.emptyState.style.display = 'none';
    }

    clearNotificationsContainer() {
        this.notificationsContainer.innerHTML = '';
    }

    renderNotificationElements() {
        this.notifications.forEach((notification, index) => {
            const notificationElement = this.createNotificationElement(notification, index);
            this.notificationsContainer.appendChild(notificationElement);
        });
    }

    // Method to create a notification element
    createNotificationElement(notification, index) {
        const notificationDiv = document.createElement('div');
        notificationDiv.id = `notification-${index}`;
        notificationDiv.className = 'bg-white dark:bg-background-dark p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer flex items-start gap-4';
        
        // Create notification content
        notificationDiv.innerHTML = this.getNotificationHTML(notification);
        
        // Add event listeners to buttons
        this.bindNotificationEvents(notificationDiv, index);
        
        return notificationDiv;
    }

    getNotificationHTML(notification) {
        return `
            <div class="relative">
                ${notification.unread ? '<span class="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-accent"></span>' : ''}
                <div class="w-10 h-10 rounded-full ${notification.iconColor} flex items-center justify-center">
                    <span class="material-symbols-outlined ${notification.iconTextColor}">${notification.icon}</span>
                </div>
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-text-primary dark:text-white">${notification.title}</h3>
                    <p class="text-xs text-text-secondary dark:text-gray-400 whitespace-nowrap">${notification.time}</p>
                </div>
                <p class="text-sm text-text-secondary dark:text-gray-300 mt-1">${notification.description}</p>
            </div>
            <div class="flex items-center gap-2">
                <button class="mark-as-read-btn p-2 rounded-full hover:bg-secondary dark:hover:bg-gray-800 text-text-secondary dark:text-gray-400">
                    <span class="material-symbols-outlined text-sm">check_circle</span>
                </button>
                <button class="archive-btn p-2 rounded-full hover:bg-secondary dark:hover:bg-gray-800 text-text-secondary dark:text-gray-400">
                    <span class="material-symbols-outlined text-sm">archive</span>
                </button>
            </div>
        `;
    }

    bindNotificationEvents(notificationElement, index) {
        const markAsReadBtn = notificationElement.querySelector('.mark-as-read-btn');
        const archiveBtn = notificationElement.querySelector('.archive-btn');
        
        markAsReadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.markAsRead(index);
        });
        
        archiveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.archiveNotification(index);
        });
    }

    // Method to mark a notification as read
    markAsRead(index) {
        if (this.notifications[index]) {
            this.notifications[index].unread = false;
            this.renderNotifications();
        }
    }

    // Method to archive a notification
    archiveNotification(index) {
        if (this.notifications[index]) {
            this.notifications.splice(index, 1);
            this.renderNotifications();
        }
    }

    // Method to mark all notifications as read
    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.unread = false;
        });
        this.renderNotifications();
    }

    // Method to handle search functionality
    handleSearch(searchTerm) {
        // Implement search logic here
        //console.log('Searching for:', searchTerm);
        // This would filter notifications based on search term
    }

    // Method to set active filter
    setActiveFilter(filterType) {
        // Update active tab styling
        this.updateFilterTabStyles(filterType);
        
        // Implement filter logic here
        //console.log('Filtering by:', filterType);
        // This would filter notifications based on the selected filter
    }

    updateFilterTabStyles(activeFilter) {
        const tabs = [this.filterAllTab, this.filterUnreadTab, this.filterArchivedTab];
        const tabConfig = {
            'all': this.filterAllTab,
            'unread': this.filterUnreadTab,
            'archived': this.filterArchivedTab
        };

        tabs.forEach(tab => {
            tab.className = 'flex-1 h-8 shrink-0 items-center justify-center gap-x-2 rounded-md text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium leading-normal';
        });

        if (tabConfig[activeFilter]) {
            tabConfig[activeFilter].className = 'flex-1 h-8 shrink-0 items-center justify-center gap-x-2 rounded-md bg-primary text-white text-sm font-medium leading-normal';
        }
    }

    // Method to add new notifications
    addNotification(notificationData) {
        const newNotification = {
            id: Date.now(), // Simple ID generation
            unread: true,
            iconColor: 'bg-primary/20',
            iconTextColor: 'text-primary',
            ...notificationData
        };
        
        this.notifications.unshift(newNotification); // Add to beginning
        this.renderNotifications();
    }

    // Method to load notifications from API
    async loadNotificationsFromAPI(apiUrl) {
        try {
            const response = await fetch(apiUrl);
            const notifications = await response.json();
            this.notifications = notifications;
            this.renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    // Method to get notification statistics
    getNotificationStats() {
        const total = this.notifications.length;
        const unread = this.notifications.filter(n => n.unread).length;
        const archived = this.notifications.filter(n => n.archived).length;
        
        return {
            total,
            unread,
            archived
        };
    }

    // Method to initialize the notification manager
    initialize() {
        this.renderNotifications();
        return this;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const notificationManager = new NotificationManager().initialize();
    
    // Make it globally available if needed
    window.notificationManager = notificationManager;
});