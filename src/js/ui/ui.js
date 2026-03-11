/**
 * @module js.ui
 * @description Provides a centralized interface for managing UI components such as sidebars,
 * 				headers, and theme settings. Facilitates initialization, interaction, and coordination
 * 				of UI elements across the application.
 */

import Sidebar from './sidebar.js';
import Header from './header.js';
import ThemeManager from './theme.manager.js';
import FormManager from './form.manager.js';
import ComponentManager from './component.manager.js';
import Spinner from './spinner.js';
import Progress from './progress.js';
import { DomUtils } from './helpers.js';

/**
 * @class UI
 * @classdesc Acts as a container and manager for core UI elements. Handles initialization
 * 			  and coordination of components like Sidebar, Header, and ThemeManager,
 * 			  ensuring consistent behavior and integration within the application.
 */

class UI {

	constructor() {

		// Cached Element References
        this.$el = {
            html:		document.documentElement,
            body:		document.body,
            main:		document.querySelector("main"),
            header:		document.querySelector("header"),
            aside:		document.querySelector("aside"),
            loading:	document.querySelector('.loading')
        };

		// Core Managers
		this.theme		= new ThemeManager();
		this.forms		= new FormManager(this);
		this.components = new ComponentManager(this);

		// Global Plugins
        this.spinner	= new Spinner(this);
        this.progress	= new Progress(this);

		this.#init();
	}

	/**
	 * Initializes all UI systems.
	 * @private
	 */
	#init() {

		// Setup layout components
		this.#initLayout();

		// Initialize managers
		this.forms.init();
		this.components.init();
		
		// Fix <pre><code> formatting issues
		DomUtils.fixPreCode();

		// Global event listeners
		this.#initGlobalEvents();

		// Clipboard utility for framework preview
		this.#initClipboardUtility();
	}

	/**
	 * Initializes layout-related components.
	 * Detects header / sidebar automatically.
	 * @private
	 */
	#initLayout() {

		// Initialize header if present
		if (document.getElementById("header")) this.header = new Header();
		
		const sidebarEl = document.querySelector("aside");

		// Initialize sidebar if present
		if (sidebarEl) {

			// Detect secondary sidebar
			const isSec = sidebarEl.classList.contains("sidebar-secondary");
			this.sidebar = new Sidebar(
				isSec ? '.sidebar-secondary' : '.sidebar-main',
				'#sidebar-toggle',
				{ responsiveBreakpoint: isSec ? 1280 : 992 }
			);
		}
	}

	/**
	 * Initializes global UI event listeners.
	 * @private
	 */
	#initGlobalEvents() {

		// Detect first touch to enable touch-specific styles
		window.addEventListener('touchstart', function onFirstTouch() {

			document.body.classList.add('touch-device');
			window.TOUCH_DETECTED = true;

			window.removeEventListener(
				'touchstart',
				onFirstTouch,
				false
			);

		}, false);

		// Global click delegation
		this.$el.body.addEventListener('click', event => {

			// Close dropdown when clicking .dropdown-close
			if (event.target.classList.contains('dropdown-close')) {

				const dropdown = event.target.closest('.dropdown');
				
			}

			// Prevent anchor jump for href="#"
			if (event.target.matches('a[href="#"]')) {
				event.preventDefault();
			}
		});
	}

	/**
	 * Clipboard utility for framework preview.
	 * Copies code from `.code-tab` components to clipboard.
	 * @private
	 */
	#initClipboardUtility() {

		// Skip if no code tabs present
		if (!document.querySelector('.code-tab')) return;

		this.$el.body.addEventListener('click', (event) => {

			// Detect click on copy icon
			const link = event.target.closest('.code-tab > .iconnav > li > a');
			if (!link) return;

			const codeTab = link.closest('.code-tab');
			const firstTabContent = codeTab?.querySelector('.tab-content > div:first-child');

			if (firstTabContent) {
				const contentToCopy = firstTabContent.innerHTML.trim();
				navigator.clipboard.writeText(contentToCopy)
					.then(() => {
						//
						if (window.deck) window.deck.say('HTML content copied to clipboard.', 'primary');
					})
					.catch(err => console.error('Clipboard error:', err));
			}
		});
	}

	// Public API Proxies (Allows calling deck.ui.dim() directly)
    dim(parent, animate) { return this.components.dim(parent, animate); }
    undim(parent, animate) { return this.components.undim(parent, animate); }

}

export default UI;