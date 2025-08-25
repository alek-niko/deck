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

		// if (this.themeToggleButtons.length === 0) {
		// 	console.warn('ThemeManager: No theme toggle buttons found with "data-theme-toggle" attribute.');
		// 	return;
		// }

		// Note: <button class="theme-toggle-icon" type="button" aria-label="Toggle theme"></button>
		this.iconToggleButton = document.querySelector('.theme-toggle-icon');

		console.log(this.iconToggleButton)
		console.log('start')

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

		// Listen for clicks on each theme toggle icon
		if (this.iconToggleButton) {
			this.iconToggleButton.addEventListener('click', () => {
				const current = this.getSavedPreference() || 'system';
				const next = this.getNextTheme(current);
				this.setTheme(next);
			});
		}

		// Listen for changes in the system's color scheme
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		mediaQuery.addEventListener('change', () => {
			// If the user's preference is 'system', re-apply the theme
			if (this.getSavedPreference() === 'system') {
				this.applySystemTheme();
			}
		});
	}

	getNextTheme(current) {
		return {
			light: 'dark',
			dark: 'system',
			system: 'light'
		}[current];
	}

	updateIconButton(theme) {
		if (!this.iconToggleButton) return;

		// const icons = {
		// 	light: '☀️',
		// 	dark: '🌙',
		// 	system: '🖥️',
		// };

		const icons = {
			light: '🔆',
			dark: '🌙',
			system: '🖥️',
		};

		const labels = {
			light: 'Light theme',
			dark: 'Dark theme',
			system: 'System theme',
		};

		this.iconToggleButton.innerText = icons[theme] || '🖥️';
		this.iconToggleButton.setAttribute('aria-label', labels[theme] || 'System theme');
		this.iconToggleButton.setAttribute('title', labels[theme] || 'System theme');
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
		this.updateIconButton(theme)
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

	/* 
		Buttons HTML Code:

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

	// updateButtonState(activeTheme) {
	// 	this.themeToggleButtons.forEach(button => {
	// 		if (button.dataset.themeToggle === activeTheme) {
	// 			button.classList.add('active');
	// 			button.setAttribute('aria-pressed', 'true');
	// 		} else {
	// 			button.classList.remove('active');
	// 			button.setAttribute('aria-pressed', 'false');
	// 		}
	// 	});
	// }


	updateButtonState(activeTheme) {

		/* 
			Settings Page — Slider Style Toggle 

			<div class="theme-slider" role="radiogroup" aria-label="Theme selection">
				<button data-theme-toggle="light" type="button" aria-pressed="false">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M457.31-758.85v-140.38h45.38v140.38h-45.38Zm235.61 97.93-31.61-31.62L760-793.38l32.38 33-99.46 99.46Zm65.93 203.61v-45.38h140.38v45.38H758.85ZM457.31-60.77v-140h45.38v140h-45.38ZM267.23-661.92l-100-98.08L200-792l99.46 99.08-32.23 31ZM761-167.23l-99.69-100.23 31-30.62 100.3 97.46L761-167.23ZM60.77-457.31v-45.38h140.38v45.38H60.77Zm139.46 290.08L168-200l98.08-98.08 16.61 15.35 17 16.04-99.46 99.46ZM480.09-260q-91.63 0-155.86-64.14Q260-388.28 260-479.91q0-91.63 64.14-155.86Q388.28-700 479.91-700q91.63 0 155.86 64.14Q700-571.72 700-480.09q0 91.63-64.14 155.86Q571.72-260 480.09-260Zm-.15-45.39q72.75 0 123.71-50.9 50.96-50.9 50.96-123.65t-50.9-123.71q-50.9-50.96-123.65-50.96t-123.71 50.9q-50.96 50.9-50.96 123.65t50.9 123.71q50.9 50.96 123.65 50.96ZM480-480Z"/></svg>
				</button>
				<button data-theme-toggle="dark" type="button" aria-pressed="false">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M481.15-140q-141.66 0-240.83-99.17-99.16-99.16-99.16-240.83 0-135.77 92.11-232.88 92.11-97.12 225.57-105.2 4.16 0 9.12.31 4.96.31 13.96.49-27.15 30.9-41.96 71.74-14.81 40.85-14.81 85.54 0 98.33 68.84 167.17Q562.82-424 661.15-424q44.31 0 85.35-13.69 41.04-13.69 71.5-38.61.23 7.38.54 11.23.3 3.84.3 7.38-7.69 133.46-104.8 225.57Q616.92-140 481.15-140Zm0-45.39q103.23 0 181.35-62.49 78.11-62.5 101.19-149.66-23.46 9.46-49.82 14.19-26.36 4.74-52.72 4.74-116.92 0-199.15-82.23T379.77-660q0-23.23 4.42-48.62 4.42-25.38 15.5-56.15-92.61 28.16-152.88 107.47-60.27 79.31-60.27 177.3 0 122.77 85.92 208.69t208.69 85.92Zm-5.53-289.69Z"/></svg>
				</button>
				<button data-theme-toggle="system" type="button" aria-pressed="false">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M278.46-140v-65.69l40.46-40.46H157.69q-23.53 0-40.61-17.09Q100-280.32 100-303.85v-458.46q0-23.53 17.08-40.61T157.69-820h644.62q23.53 0 40.61 17.08T860-762.31v458.46q0 23.53-17.08 40.61-17.08 17.09-40.61 17.09H640.46l41.08 40.46V-140H278.46ZM157.69-291.54h644.62q4.61 0 8.46-3.84 3.84-3.85 3.84-8.47v-458.46q0-4.61-3.84-8.46-3.85-3.84-8.46-3.84H157.69q-4.61 0-8.46 3.84-3.84 3.85-3.84 8.46v458.46q0 4.62 3.84 8.47 3.85 3.84 8.46 3.84Zm-12.3 0v-483.07 483.07Z"/></svg>
				</button>
				<span class="theme-slider-indicator"></span>
			</div>

		*/

		this.themeToggleButtons.forEach(button => {
			if (button.dataset.themeToggle === activeTheme) {
				button.classList.add('active');
				button.setAttribute('aria-pressed', 'true');
			} else {
				button.classList.remove('active');
				button.setAttribute('aria-pressed', 'false');
			}
		});

		// Optional: update slider indicator if exists
		const indicator = document.querySelector('.theme-slider-indicator');
		if (indicator) {
			const activeButton = [...this.themeToggleButtons].find(
				btn => btn.dataset.themeToggle === activeTheme
			);
			if (activeButton) {
				const rect = activeButton.getBoundingClientRect();
				const parentRect = activeButton.parentElement.getBoundingClientRect();
				indicator.style.transform = `translateX(${rect.left - parentRect.left}px)`;
			}
		}
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