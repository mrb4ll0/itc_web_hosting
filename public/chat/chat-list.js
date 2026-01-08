document.addEventListener('DOMContentLoaded', async function() {
    const chatList = document.getElementById('chatList');
    const searchInput = document.getElementById('searchInput');
    const newChatBtn = document.getElementById('newChatBtn');
    const newGroupBtn = document.getElementById('newGroupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const newChatModal = document.getElementById('newChatModal');
    const newGroupModal = document.getElementById('newGroupModal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const userSearchInput = document.getElementById('userSearch');
    const userList = document.getElementById('userList');
    const groupForm = document.getElementById('groupForm');
    const memberSearchInput = document.getElementById('memberSearch');
    const memberList = document.getElementById('memberList');
    const selectedMembers = document.getElementById('selectedMembers');

    const chatService = new ChatService();
    let allChats = [];
    let selectedUserIds = new Set();

    // Load chats
    async function loadChats() {
        try {
            const userId = await AuthService.getCurrentUserId();
            if (!userId) return;

            const chats = await chatService.getAllChats();
            allChats = chats;
            renderChats(chats);
        } catch (error) {
            console.error('Error loading chats:', error);
            chatList.innerHTML = '<div class="error">Failed to load chats</div>';
        }
    }

    // Render chats
    function renderChats(chats) {
        if (chats.length === 0) {
            chatList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet</p>
                    <p class="subtext">Start a conversation!</p>
                </div>
            `;
            return;
        }

        chatList.innerHTML = chats.map(chat => `
            <div class="chat-item" data-chat-id="${chat.id}" data-user-id="${chat.participantId}">
                <div class="chat-avatar">
                    ${chat.participantAvatar ? 
                        `<img src="${chat.participantAvatar}" alt="${chat.participantName}">` : 
                        `<i class="fas fa-user"></i>`
                    }
                    ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                </div>
                <div class="chat-info">
                    <div class="chat-header">
                        <span class="chat-name">${escapeHtml(chat.participantName)}</span>
                        <span class="chat-time">${formatTime(chat.timestamp)}</span>
                    </div>
                    <div class="chat-preview">
                        <span class="chat-message">${escapeHtml(chat.lastMessage)}</span>
                        ${!chat.isRead ? '<i class="fas fa-circle unread-dot"></i>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Add click event listeners
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', function() {
                const userId = this.dataset.userId;
                window.location.href = `chat.html?user=${userId}`;
            });
        });
    }

    // Search functionality
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        if (!searchTerm) {
            renderChats(allChats);
            return;
        }

        const filteredChats = allChats.filter(chat => 
            chat.participantName.toLowerCase().includes(searchTerm) ||
            chat.lastMessage.toLowerCase().includes(searchTerm)
        );
        renderChats(filteredChats);
    });

    // Modal controls
    newChatBtn.addEventListener('click', () => {
        newChatModal.style.display = 'block';
        loadAllUsers();
    });

    newGroupBtn.addEventListener('click', () => {
        newGroupModal.style.display = 'block';
        loadAllUsersForGroup();
    });

    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            newChatModal.style.display = 'none';
            newGroupModal.style.display = 'none';
            selectedUserIds.clear();
            updateSelectedMembers();
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === newChatModal) newChatModal.style.display = 'none';
        if (e.target === newGroupModal) newGroupModal.style.display = 'none';
    });

    // Load all users for new chat
    async function loadAllUsers() {
        try {
            const currentUserId = await AuthService.getCurrentUserId();
            const snapshot = await db.collection('users')
                .doc('students')
                .collection('students')
                .get();

            userList.innerHTML = snapshot.docs
                .filter(doc => doc.id !== currentUserId)
                .map(doc => {
                    const data = doc.data();
                    return `
                        <div class="user-item" data-user-id="${doc.id}">
                            <div class="user-avatar">
                                ${data.avatarUrl ? 
                                    `<img src="${data.avatarUrl}" alt="${data.fullName}">` : 
                                    `<i class="fas fa-user"></i>`
                                }
                            </div>
                            <div class="user-info">
                                <span class="user-name">${escapeHtml(data.fullName || 'Unknown User')}</span>
                                <span class="user-email">${escapeHtml(data.email || '')}</span>
                            </div>
                            <button class="select-user-btn">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    `;
                }).join('');

            // Add event listeners to user items
            document.querySelectorAll('.user-item').forEach(item => {
                const selectBtn = item.querySelector('.select-user-btn');
                selectBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const userId = item.dataset.userId;
                    window.location.href = `chat.html?user=${userId}`;
                });
            });
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    // Load users for group creation
    async function loadAllUsersForGroup() {
        try {
            const currentUserId = await AuthService.getCurrentUserId();
            const snapshot = await db.collection('users')
                .doc('students')
                .collection('students')
                .get();

            memberList.innerHTML = snapshot.docs
                .filter(doc => doc.id !== currentUserId)
                .map(doc => {
                    const data = doc.data();
                    const isSelected = selectedUserIds.has(doc.id);
                    return `
                        <div class="user-item" data-user-id="${doc.id}">
                            <div class="user-avatar">
                                ${data.avatarUrl ? 
                                    `<img src="${data.avatarUrl}" alt="${data.fullName}">` : 
                                    `<i class="fas fa-user"></i>`
                                }
                            </div>
                            <div class="user-info">
                                <span class="user-name">${escapeHtml(data.fullName || 'Unknown User')}</span>
                            </div>
                            <button class="toggle-user-btn ${isSelected ? 'selected' : ''}">
                                <i class="fas ${isSelected ? 'fa-check' : 'fa-plus'}"></i>
                            </button>
                        </div>
                    `;
                }).join('');

            // Add event listeners
            document.querySelectorAll('.toggle-user-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const userId = this.closest('.user-item').dataset.userId;
                    if (selectedUserIds.has(userId)) {
                        selectedUserIds.delete(userId);
                        this.classList.remove('selected');
                        this.innerHTML = '<i class="fas fa-plus"></i>';
                    } else {
                        selectedUserIds.add(userId);
                        this.classList.add('selected');
                        this.innerHTML = '<i class="fas fa-check"></i>';
                    }
                    updateSelectedMembers();
                });
            });
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    // Update selected members display
    function updateSelectedMembers() {
        selectedMembers.innerHTML = Array.from(selectedUserIds).map(userId => `
            <span class="selected-member">
                ${userId}
                <button class="remove-member" data-user-id="${userId}">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');

        // Add remove event listeners
        document.querySelectorAll('.remove-member').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.dataset.userId;
                selectedUserIds.delete(userId);
                updateSelectedMembers();
                // Update the toggle button state
                const userItem = document.querySelector(`.user-item[data-user-id="${userId}"]`);
                if (userItem) {
                    const toggleBtn = userItem.querySelector('.toggle-user-btn');
                    toggleBtn.classList.remove('selected');
                    toggleBtn.innerHTML = '<i class="fas fa-plus"></i>';
                }
            });
        });
    }

    // Create group
    groupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const groupName = document.getElementById('groupName').value;
        const description = document.getElementById('groupDescription').value;
        
        if (selectedUserIds.size === 0) {
            alert('Please select at least one member');
            return;
        }

        try {
            const groupId = await chatService.createGroup(
                groupName,
                Array.from(selectedUserIds),
                description
            );
            
            alert('Group created successfully!');
            newGroupModal.style.display = 'none';
            groupForm.reset();
            selectedUserIds.clear();
            updateSelectedMembers();
            
            // Redirect to group chat (you'll need to implement this)
            // window.location.href = `group-chat.html?group=${groupId}`;
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Failed to create group');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    });

    // Filter users in modal search
    userSearchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const userItems = userList.querySelectorAll('.user-item');
        
        userItems.forEach(item => {
            const userName = item.querySelector('.user-name').textContent.toLowerCase();
            const userEmail = item.querySelector('.user-email').textContent.toLowerCase();
            const isVisible = userName.includes(searchTerm) || userEmail.includes(searchTerm);
            item.style.display = isVisible ? 'flex' : 'none';
        });
    });

    // Real-time chat updates
    async function setupRealTimeUpdates() {
        const currentUserId = await AuthService.getCurrentUserId();
        
        // Listen for new messages
        const unsubscribe = db.collection('chat_rooms')
            .where('participants', 'array-contains', currentUserId)
            .onSnapshot(async (snapshot) => {
                // Reload chats when there are changes
                loadChats();
            });

        // Cleanup on page unload
        window.addEventListener('unload', unsubscribe);
    }

    // Helper functions
    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize
    await loadChats();
    await setupRealTimeUpdates();
});