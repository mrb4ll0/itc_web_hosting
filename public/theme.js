class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Check for saved theme preference or use system preference
        const savedTheme = localStorage.getItem('app-theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Apply theme
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            this.enableDarkMode();
        } else {
            this.enableLightMode();
        }

        // Listen for system theme changes
        this.watchSystemTheme();
        
        // Setup theme toggle if needed
        this.setupThemeToggle();
    }

    enableDarkMode() {
        document.documentElement.classList.add('dark');
        localStorage.setItem('app-theme', 'dark');
    }

    enableLightMode() {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('app-theme', 'light');
    }

    watchSystemTheme() {
        // Update theme when system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only update if user hasn't set a manual preference
            if (!localStorage.getItem('app-theme')) {
                if (e.matches) {
                    this.enableDarkMode();
                } else {
                    this.enableLightMode();
                }
            }
        });
    }

    setupThemeToggle() {
        // Optional: Add manual theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        if (document.documentElement.classList.contains('dark')) {
            this.enableLightMode();
        } else {
            this.enableDarkMode();
        }
    }

    // Get current theme
    getCurrentTheme() {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
}

// Initialize theme manager
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Also apply immediately to prevent flash of wrong theme
new ThemeManager();