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
import FabManager from './fab.manager.js';
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
		this.fabs       = new FabManager(this);

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
		this.fabs.init();
		
		// Fix <pre><code> formatting issues
		DomUtils.fixPreCode();

		// Enhanced Input Detection
        this.#initInputDetection();

		// Global event listeners
		this.#initGlobalEvents();

		// Clipboard utility for framework preview
		this.#initClipboardUtility();
	}

	/**
	 * @private
	 * @method #initInputDetection
	 * @description Distinguishes between touch and mouse for hybrid hardware.
	 */
	#initInputDetection() {
		// Initial detection via modern Media Query
		const canHover = window.matchMedia('(hover: hover)').matches;
		if (!canHover) {
			this.$el.body.classList.add('is-touch-primary');
		}

		// Dynamic switch: If they actually touch the screen, lock in touch mode
		const setTouchMode = () => {
			this.$el.body.classList.add('touch-device');
			window.TOUCH_DETECTED = true;
			// Use passive: true for scroll performance
			window.removeEventListener('touchstart', setTouchMode, { passive: true });
		};

		window.addEventListener('touchstart', setTouchMode, { passive: true });
	}

	/**
	 * Initializes global UI event listeners.
	 * @private
	 */
	#initGlobalEvents() {

		this.$el.body.addEventListener('click', event => {
			const { target } = event;

			// Dropdown close delegation
			const closeBtn = target.closest('.dropdown-close');
			if (closeBtn) {
				const dropdown = closeBtn.closest('.dropdown');
				// You can call your component manager here to close it properly
				if (dropdown && this.components.dropdown) {
					const instance = this.deck.getInstance(dropdown);
					instance?.close();
				}
			}

			// Prevent anchor jump for empty hashes
			if (target.matches('a[href="#"]')) {
				event.preventDefault();
			}

			// Generic "Dismiss" pattern (Common for Modals/Alerts)
			const dismissTrigger = target.closest('[data-dismiss]');
			if (dismissTrigger) {
				const targetSelector = dismissTrigger.getAttribute('data-dismiss');
				const targetEl = targetSelector ? document.querySelector(targetSelector) : dismissTrigger.parentElement;
				targetEl?.remove();
			}
		});
	}

	/**
	 * Clipboard utility for framework preview.
	 * Copies code from `.code-tab` components to clipboard.
	 * @private
	 */
	#initClipboardUtility() {
		// Optimized: Only attach one listener to the body if the container exists
		if (!document.querySelector('.code-tab')) return;

		this.$el.body.addEventListener('click', (event) => {
			const copyBtn = event.target.closest('.code-tab .iconnav a');
			if (!copyBtn) return;

			event.preventDefault();

			const codeTab = copyBtn.closest('.code-tab');
			// Support both <code> blocks and standard divs
			const contentSource = codeTab?.querySelector('.tab-content .active, .tab-content div:first-child');

			if (contentSource) {
				// Get innerText to avoid copying HTML tags if it's a code block
				const textToCopy = contentSource.innerText || contentSource.textContent;
				
				navigator.clipboard.writeText(textToCopy.trim())
					.then(() => {
						if (window.deck) {
							window.deck.say('Code copied to clipboard.', 'success');
						}
					})
					.catch(err => console.error('UI Clipboard Error:', err));
			}
		});
	}

	/**
	 * Initializes layout-related components.
	 * Detects header / sidebar automatically.
	 * @private
	 */
	#initLayout() {

		// Initialize header if present
        if (document.getElementById("header")) this.header = new Header();
        
        const sidebarEl = this.$el.aside;

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

	// Public API Proxies (Allows calling deck.ui.dim() directly)
    dim(parent, animate) { return this.components.dim(parent, animate); }
    undim(parent, animate) { return this.components.undim(parent, animate); }

}

export default UI;