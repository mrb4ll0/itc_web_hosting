class StudentActivitiesDashboard {
    constructor() {
        this.studentData = {
            attendance: [],
            notes: [],
            todos: [],
            activities: []
        };
        
        this.init();
    }

    init() {
        
            this.loadData();
            this.renderDashboard();
            this.generateCalendar();
    }

    // Data management methods
    loadData() {
        const saved = localStorage.getItem('studentActivities');
        if (saved) {
            this.studentData = JSON.parse(saved);
        }
    }

    saveData() {
        localStorage.setItem('studentActivities', JSON.stringify(this.studentData));
        this.renderDashboard();
    }

    // Modal methods
    markAttendance() {
        document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceModal').classList.remove('hidden');
    }

    hideAttendanceModal() {
        document.getElementById('attendanceModal').classList.add('hidden');
    }

    showNoteModal() {
        document.getElementById('noteModal').classList.remove('hidden');
    }

    hideNoteModal() {
        document.getElementById('noteModal').classList.add('hidden');
    }

    showTodoModal() {
        document.getElementById('todoModal').classList.remove('hidden');
    }

    hideTodoModal() {
        document.getElementById('todoModal').classList.add('hidden');
    }

    // Core functionality methods
    saveAttendance() {
        const date = document.getElementById('attendanceDate').value;
        const status = document.getElementById('attendanceStatusSelect').value;
        const notes = document.getElementById('attendanceNotes').value;

        const attendance = {
            id: Date.now(),
            date: date,
            status: status,
            notes: notes,
            timestamp: new Date().toISOString()
        };

        // Remove existing attendance for this date
        this.studentData.attendance = this.studentData.attendance.filter(a => a.date !== date);
        this.studentData.attendance.push(attendance);

        // Log activity
        this.logActivityInternal(`Marked attendance as ${status} for ${date}`);

        this.hideAttendanceModal();
        this.saveData();
        this.generateCalendar();
    }

    saveNote() {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;

        if (!title.trim()) {
            alert('Please enter a note title');
            return;
        }

        const note = {
            id: Date.now(),
            title: title,
            content: content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.studentData.notes.unshift(note);
        this.logActivityInternal('Added a new note: ' + title);

        this.hideNoteModal();
        this.saveData();
    }

    saveTodo() {
        const task = document.getElementById('todoTask').value;
        const dueDate = document.getElementById('todoDueDate').value;
        const priority = document.getElementById('todoPriority').value;

        if (!task.trim()) {
            alert('Please enter a task');
            return;
        }

        const todo = {
            id: Date.now(),
            task: task,
            dueDate: dueDate,
            priority: priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.studentData.todos.unshift(todo);
        this.logActivityInternal('Added new task: ' + task);

        this.hideTodoModal();
        this.saveData();
    }

    logActivity() {
        const activity = prompt('Enter your activity:');
        if (activity && activity.trim()) {
            this.logActivityInternal(activity.trim());
            this.saveData();
        }
    }

    logActivityInternal(activity) {
        this.studentData.activities.unshift({
            id: Date.now(),
            activity: activity,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 activities
        if (this.studentData.activities.length > 50) {
            this.studentData.activities = this.studentData.activities.slice(0, 50);
        }
    }

    // Render methods
    renderDashboard() {
        this.renderNotes();
        this.renderTodos();
        this.renderActivities();
        this.updateStats();
        this.updateTodayOverview();
    }

    renderNotes() {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '';

        if (this.studentData.notes.length === 0) {
            notesList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No notes yet</p>';
            return;
        }

        this.studentData.notes.slice(0, 5).forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer';
            noteElement.innerHTML = `
                <h3 class="font-semibold text-gray-800 dark:text-white mb-1">${note.title}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">${note.content}</p>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatDate(note.createdAt)}</span>
                    <button onclick="dashboard.deleteNote(${note.id})" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            noteElement.onclick = () => this.showNoteDetail(note);
            notesList.appendChild(noteElement);
        });
    }

    renderTodos() {
        const todoList = document.getElementById('todoList');
        todoList.innerHTML = '';

        if (this.studentData.todos.length === 0) {
            todoList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No tasks yet</p>';
            return;
        }

        this.studentData.todos.slice(0, 10).forEach(todo => {
            const todoElement = document.createElement('div');
            todoElement.className = `flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg ${
                todo.completed ? 'opacity-60' : ''
            }`;
            todoElement.innerHTML = `
                <input 
                    type="checkbox" 
                    ${todo.completed ? 'checked' : ''} 
                    onchange="dashboard.toggleTodo(${todo.id})"
                    class="mr-3 h-5 w-5 text-blue-600 rounded"
                >
                <div class="flex-1">
                    <span class="${todo.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-white'}">${todo.task}</span>
                    <div class="flex items-center space-x-2 mt-1">
                        <span class="text-xs px-2 py-1 rounded-full ${
                            todo.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                            todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        }">${todo.priority}</span>
                        ${todo.dueDate ? `<span class="text-xs text-gray-500">Due: ${this.formatDate(todo.dueDate)}</span>` : ''}
                    </div>
                </div>
                <button onclick="dashboard.deleteTodo(${todo.id})" class="text-red-500 hover:text-red-700 ml-2">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            todoList.appendChild(todoElement);
        });
    }

    renderActivities() {
        const activityLog = document.getElementById('activityLog');
        activityLog.innerHTML = '';

        if (this.studentData.activities.length === 0) {
            activityLog.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No activities yet</p>';
            return;
        }

        this.studentData.activities.slice(0, 10).forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
            activityElement.innerHTML = `
                <div class="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div class="flex-1">
                    <p class="text-gray-800 dark:text-white text-sm">${activity.activity}</p>
                    <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">${this.formatTime(activity.timestamp)}</p>
                </div>
            `;
            activityLog.appendChild(activityElement);
        });
    }

    generateCalendar() {
        const calendar = document.getElementById('attendanceCalendar');
        calendar.innerHTML = '';

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Get first day of month and number of days
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Add day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-1';
            dayHeader.textContent = day;
            calendar.appendChild(dayHeader);
        });

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            const emptyCell = document.createElement('div');
            calendar.appendChild(emptyCell);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const attendance = this.studentData.attendance.find(a => a.date === dateStr);
            
            const dayElement = document.createElement('div');
            dayElement.className = `text-center p-2 rounded-lg text-sm font-medium ${
                attendance ? 
                    attendance.status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                    attendance.status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                : day === today.getDate() && currentMonth === today.getMonth() ? 
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`;
            dayElement.textContent = day;
            
            if (attendance) {
                dayElement.title = `Attendance: ${attendance.status}`;
            }
            
            calendar.appendChild(dayElement);
        }
    }

    updateStats() {
        // Attendance rate
        const totalDays = this.studentData.attendance.length;
        const presentDays = this.studentData.attendance.filter(a => a.status === 'present').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        
        document.getElementById('attendanceRate').textContent = attendanceRate + '%';
        document.getElementById('attendanceProgress').style.width = attendanceRate + '%';

        // Task completion
        const totalTasks = this.studentData.todos.length;
        const completedTasks = this.studentData.todos.filter(t => t.completed).length;
        const taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        document.getElementById('taskCompletion').textContent = taskCompletion + '%';
        document.getElementById('taskProgress').style.width = taskCompletion + '%';
    }

    updateTodayOverview() {
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = this.studentData.attendance.find(a => a.date === today);
        
        document.getElementById('attendanceStatus').textContent = todayAttendance ? 
            todayAttendance.status.charAt(0).toUpperCase() + todayAttendance.status.slice(1) : 'Not Marked';
        
        document.getElementById('pendingTasks').textContent = this.studentData.todos.filter(t => !t.completed).length;
        document.getElementById('totalNotes').textContent = this.studentData.notes.length;
    }

    // Utility methods
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    toggleTodo(todoId) {
        const todo = this.studentData.todos.find(t => t.id === todoId);
        if (todo) {
            todo.completed = !todo.completed;
            this.logActivityInternal(`${todo.completed ? 'Completed' : 'Reopened'} task: ${todo.task}`);
            this.saveData();
        }
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.studentData.notes = this.studentData.notes.filter(n => n.id !== noteId);
            this.logActivityInternal('Deleted a note');
            this.saveData();
        }
    }

    deleteTodo(todoId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.studentData.todos = this.studentData.todos.filter(t => t.id !== todoId);
            this.logActivityInternal('Deleted a task');
            this.saveData();
        }
    }

    showNoteDetail(note) {
        alert(`Title: ${note.title}\n\nContent: ${note.content}\n\nCreated: ${this.formatDate(note.createdAt)}`);
    }
}

document.addEventListener('DOMContentLoaded',()=>{
    new StudentActivitiesDashboard();
});
    
