// js/ThemeManager.js

export default class ThemeManager {
	/**
	 * The key used to store the theme preference in localStorage.
	 */
	storageKey = 'theme-preference';

	/**
	 * The root element (<html>) to apply theme classes to.
	 * @type {HTMLElement}
	 */
	rootElement = document.documentElement;

	/**
	 * Initializes the ThemeManager.
	 * Sets up DOM element references, loads the initial theme, and adds event listeners.
	 */
	constructor() {
		// Find all theme toggle buttons using a data-attribute
		this.themeToggleButtons = document.querySelectorAll('[data-theme-toggle]');

		if (this.themeToggleButtons.length === 0) {
			console.warn('ThemeManager: No theme toggle buttons found with "data-theme-toggle" attribute.');
			return;
		}

		this.init();
	}

	/**
	 * Orchestrates the initial setup.
	 */
	init() {
		this.applyInitialTheme();
		this.addEventListeners();
	}

	/**
	 * Adds all necessary event listeners.
	 */
	addEventListeners() {
		// Listen for clicks on each theme toggle button
		this.themeToggleButtons.forEach(button => {
			button.addEventListener('click', (e) => {
				const theme = e.currentTarget.dataset.themeToggle;
				this.setTheme(theme);
			});
		});

		// Listen for changes in the system's color scheme
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', () => {
			// If the user's preference is 'system', re-apply the theme
			if (this.getSavedPreference() === 'system') {
				this.applySystemTheme();
			}
		});
	}

	/**
	 * Applies the initial theme based on saved preference or system settings.
	 */
	applyInitialTheme() {
		const savedTheme = this.getSavedPreference();
		// If a theme is saved, use it. Otherwise, default to 'system'.
		this.setTheme(savedTheme || 'system');
	}

	/**
	 * Sets the theme, updates the DOM, and saves the preference.
	 * @param {'light' | 'dark' | 'system'} theme The theme to apply.
	 */
	setTheme(theme) {
		if (theme === 'system') {
			this.applySystemTheme();
			this.savePreference('system');
		} else {
			this.applyThemeClass(theme);
			this.savePreference(theme);
		}
		this.updateButtonState(theme);
	}

	/**
	 * Applies the appropriate theme class based on the system's color scheme.
	 */
	applySystemTheme() {
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			this.applyThemeClass('dark');
		} else {
			this.applyThemeClass('light');
		}
	}

	/**
	 * Adds or removes .light and .dark classes from the root element.
	 * @param {'light' | 'dark'} theme The theme class to apply.
	 */
	applyThemeClass(theme) {
		this.rootElement.classList.remove('light', 'dark');
		if (theme) {
			this.rootElement.classList.add(theme);
		}
	}

	/**
	 * Updates the UI of the toggle buttons to show the active state.
	 * @param {'light' | 'dark' | 'system'} activeTheme The currently active theme.
	 */
	updateButtonState(activeTheme) {
		this.themeToggleButtons.forEach(button => {
			if (button.dataset.themeToggle === activeTheme) {
				button.classList.add('active');
				button.setAttribute('aria-pressed', 'true');
			} else {
				button.classList.remove('active');
				button.setAttribute('aria-pressed', 'false');
			}
		});
	}

	/**
	 * Retrieves the saved theme preference from localStorage.
	 * @returns {string | null} The saved theme or null if none is set.
	 */
	getSavedPreference() {
		return localStorage.getItem(this.storageKey);
	}

	/**
	 * Saves the user's theme preference to localStorage.
	 * @param {'light' | 'dark' | 'system'} theme The theme to save.
	 */
	savePreference(theme) {
		localStorage.setItem(this.storageKey, theme);
	}
}

/*
HTML Code:

<div class="theme-controls" role="group" aria-label="Theme Controls">
    <button data-theme-toggle="light" type="button" aria-pressed="false">
        Light
    </button>
    <button data-theme-toggle="dark" type="button" aria-pressed="false">
        Dark
    </button>
    <button data-theme-toggle="system" type="button" aria-pressed="false">
        System
    </button>
</div>
*/