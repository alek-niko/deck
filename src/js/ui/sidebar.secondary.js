/**
 * =============================================================================
 * SIDEBAR SECONDARY
 * @module js.ui.sidebar.secondary
 * -----------------------------------------------------------------------------
 * Manages the secondary application sidebar — flexible navigation panel with
 * submenus, section headings, user info, and optional accordion behavior.
 * Suitable for docs navigation, settings panels, and user profiles.
 *
 * State machine:
 *	desktop		- always visible (no collapse, CSS controls width)
 *	mobile		- drawer (hidden by default, .is-visible to open)
 *
 * Submenu behavior:
 *	multiOpen:true		- multiple submenus can be open simultaneously (default)
 *	multiOpen:false		- accordion mode, opening one closes the rest
 *
 * Persistence:
 *	Sidebar open/closed state saved to localStorage. Submenu state is not
 *	persisted — open submenus are determined by the active item on each load.
 *
 * Active item:
 *	Best URL match highlighted on init. Parent submenu of the active item
 *	is automatically expanded. Active item is scrolled into view instantly
 *	(no animation — prevents jarring scroll on page load).
 *
 * Usage in ui.js:
 *	import SidebarSecondary from './sidebar.secondary.js';
 *	if (document.querySelector('.sidebar-secondary')) {
 *		this.sidebarSecondary = new SidebarSecondary(
 *			'.sidebar-secondary',
 *			'#sidebar-secondary-toggle',
 *			{ responsiveBreakpoint: 1280 }
 *		);
 *	}
 *
 * Programmatic API:
 *	sidebar.show()				- make sidebar visible
 *	sidebar.hide()				- hide sidebar
 *	sidebar.toggleSidebar()		- toggle sidebar visibility
 *	sidebar.openSubmenu(index)	- open submenu at index
 *	sidebar.closeSubmenu(index)	- close submenu at index
 *	sidebar.closeAllSubmenus()	- close all submenus
 *	sidebar.isVisible()			- boolean
 *	sidebar.destroy()			- clean up all listeners
 * =============================================================================
 */

class SidebarSecondary {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** Bound handler references for clean removeEventListener. */
	#handlers = {};

	/** ResizeObserver to react to viewport changes. */
	#resizeObserver = null;

	/** Cached submenu parent items — direct children of the menu with a .submenu. */
	#submenuItems = [];

	// =========================================================================
	// CONSTRUCTOR
	// =========================================================================

	/**
	 * @param {string} elementSelector	- CSS selector for .sidebar-secondary.
	 * @param {string} toggleSelector	- CSS selector for the toggle button.
	 * @param {Object} [options={}]
	 * @param {string} [options.storageKey='sidebar-secondary.open']	- localStorage key.
	 * @param {number} [options.responsiveBreakpoint=1280]				- px below which drawer mode activates.
	 * @param {string} [options.visibleClass='is-visible']				- Class for visible drawer state.
	 * @param {string} [options.toggleActiveClass='open']				- Class on toggle when open.
	 * @param {boolean}[options.multiOpen=true]							- Allow multiple submenus open.
	 */
	constructor(elementSelector, toggleSelector, options = {}) {

		this.element  = document.querySelector(elementSelector);
		this.toggleEl = document.querySelector(toggleSelector);

		if (!this.element) {
			console.warn(`[SidebarSecondary] Element not found: "${elementSelector}"`);
			return;
		}

		this.options = {
			storageKey:				'sidebar-secondary.open',
			responsiveBreakpoint:	1280,
			visibleClass:			'is-visible',
			toggleActiveClass:		'open',
			multiOpen:				true,
			...options,
		};

		this.#setup();
	}

	// =========================================================================
	// PRIVATE — SETUP
	// =========================================================================

	#setup() {
		// ── Cache submenu parent items ────────────────────────────────────────
		// Only direct children of .menu that contain a .submenu are parent items.
		const menu = this.element.querySelector('.menu');
		if (menu) {
			this.#submenuItems = [...menu.querySelectorAll(':scope > li')]
				.filter(li => li.querySelector('.submenu'));
		}

		// ── Restore persisted sidebar visibility ──────────────────────────────
		if (this.#isMobile()) {
			// Mobile: always start hidden, never restore persisted open state
			this.element.classList.remove(this.options.visibleClass);
		} else {
			const wasOpen = localStorage.getItem(this.options.storageKey) !== 'false';
			this.#applyVisibility(wasOpen);
		}

		// ── Active item + auto-expand parent submenu ───────────────────────────
		this.#highlightActive();

		// ── Events ────────────────────────────────────────────────────────────
		this.#handlers.toggleClick	= this.#onToggleClick.bind(this);
		this.#handlers.menuClick	= this.#onMenuClick.bind(this);
		this.#handlers.outsideClick	= this.#onOutsideClick.bind(this);
		this.#handlers.keydown		= this.#onKeydown.bind(this);

		if (this.toggleEl) {
			this.toggleEl.addEventListener('click', this.#handlers.toggleClick);
		}

		if (menu) {
			menu.addEventListener('click', this.#handlers.menuClick);
		}

		document.addEventListener('click', this.#handlers.outsideClick);
		document.addEventListener('keydown', this.#handlers.keydown);

		// ── ResizeObserver ────────────────────────────────────────────────────
		this.#resizeObserver = new ResizeObserver(() => this.#onResize());
		this.#resizeObserver.observe(document.body);
	}

	// =========================================================================
	// PRIVATE — HELPERS
	// =========================================================================

	/**
	 * Returns true when in mobile/drawer mode.
	 */
	#isMobile() {
		return window.innerWidth < this.options.responsiveBreakpoint;
	}

	/**
	 * Applies sidebar visibility state — class on element + toggle button ARIA.
	 * @param {boolean} visible
	 */
	#applyVisibility(visible) {
		this.element.classList.toggle(this.options.visibleClass, visible);

		if (this.toggleEl) {
			this.toggleEl.classList.toggle(this.options.toggleActiveClass, visible);
			this.toggleEl.setAttribute('aria-expanded', visible ? 'true' : 'false');
		}
	}

	/**
	 * Persists sidebar visibility to localStorage.
	 * @param {boolean} visible
	 */
	#persist(visible) {
		localStorage.setItem(this.options.storageKey, String(visible));
	}

	/**
	 * Highlights the best URL match in the sidebar menu.
	 * Automatically expands the parent submenu of the active item.
	 * Scrolls the active item into view instantly (no animation).
	 */
	#highlightActive() {
		const path		= window.location.pathname;
		const links		= [...this.element.querySelectorAll('a[href]')];

		let best		= null;
		let bestScore	= -1;

		links.forEach(link => {
			const href = link.getAttribute('href');
			if (!href || href === '#') return;

			if (href === path) {
				best		= link;
				bestScore	= Infinity;
				return;
			}

			// Prefix match — longer = more specific = better
			if (path.startsWith(href) && href.length > bestScore) {
				best      = link;
				bestScore = href.length;
			}
		});

		if (!best) return;

		const activeLi = best.closest('li');
		activeLi?.classList.add('active');

		// Auto-expand the parent submenu — but only if not marked data-no-auto-expand
		const parentSubmenu = activeLi?.closest('.submenu');
		if (parentSubmenu) {
			const parentLi = parentSubmenu.closest('li');
			if (parentLi && !parentLi.hasAttribute('data-no-auto-expand')) {
				parentLi.classList.add('open');
			}
		}

		// Scroll into view after layout is stable
		// Uses 'instant' not 'smooth' — prevents jarring animated scroll on page load
		requestAnimationFrame(() => {
			activeLi?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
		});
	}

	// =========================================================================
	// PRIVATE — EVENT HANDLERS
	// =========================================================================

	/**
	 * Toggle button click — show/hide the sidebar.
	 * @param {MouseEvent} event
	 */
	#onToggleClick(event) {
		event.stopPropagation();
		this.toggleSidebar();
	}

	/**
	 * Delegated click handler on the menu element.
	 * Handles submenu expansion — ignores clicks on leaf items and separators.
	 * @param {MouseEvent} event
	 */
	#onMenuClick(event) {
		// Find the closest <li> that directly contains a .submenu
		const clickedLi = event.target.closest('li');
		if (!clickedLi) return;

		const submenu = clickedLi.querySelector(':scope > .submenu');
		if (!submenu) return; // Leaf item — let the link navigate normally

		// Only intercept if the click was on the link/trigger, not the submenu itself
		const clickedInsideSubmenu = submenu.contains(event.target);
		if (clickedInsideSubmenu) return;

		event.preventDefault();

		const index = this.#submenuItems.indexOf(clickedLi);
		if (index === -1) return;

		if (clickedLi.classList.contains('open')) {
			this.closeSubmenu(index);
		} else {
			this.openSubmenu(index);
		}
	}

	/**
	 * Outside click — closes mobile drawer when clicking outside.
	 * @param {MouseEvent} event
	 */
	#onOutsideClick(event) {
		if (!this.#isMobile()) return;
		if (!this.isVisible()) return;

		const inside   = this.element.contains(event.target);
		const onToggle = this.toggleEl?.contains(event.target);

		if (!inside && !onToggle) {
			this.hide();
		}
	}

	/**
	 * Escape key — closes mobile drawer.
	 * @param {KeyboardEvent} event
	 */
	#onKeydown(event) {
		if (event.key === 'Escape' && this.#isMobile() && this.isVisible()) {
			this.hide();
			this.toggleEl?.focus();
		}
	}

	/**
	 * ResizeObserver callback — clean up state on breakpoint crossing.
	 */
	#onResize() {
		if (!this.#isMobile()) {
			// Crossed to desktop: remove mobile-specific drawer state
			// Desktop visibility is handled by CSS, not the is-visible class
			this.element.classList.remove(this.options.visibleClass);
		}
	}

	// =========================================================================
	// PUBLIC API — SIDEBAR VISIBILITY
	// =========================================================================

	/**
	 * @method show
	 * @description Makes the sidebar visible.
	 * @returns {SidebarSecondary} this — chainable
	 */
	show() {
		this.#applyVisibility(true);
		this.#persist(true);
		return this;
	}

	/**
	 * @method hide
	 * @description Hides the sidebar.
	 * @returns {SidebarSecondary} this — chainable
	 */
	hide() {
		this.#applyVisibility(false);
		this.#persist(false);
		return this;
	}

	/**
	 * @method toggleSidebar
	 * @description Toggles sidebar visibility.
	 * @returns {SidebarSecondary} this — chainable
	 */
	toggleSidebar() {
		return this.isVisible() ? this.hide() : this.show();
	}

	/**
	 * @method isVisible
	 * @description Returns true if the sidebar is currently visible.
	 * @returns {boolean}
	 */
	isVisible() {
		return this.element.classList.contains(this.options.visibleClass);
	}

	// =========================================================================
	// PUBLIC API — SUBMENUS
	// =========================================================================

	/**
	 * @method openSubmenu
	 * @description Opens the submenu at the given index.
	 *
	 * @param {number} index
	 * @returns {SidebarSecondary} this — chainable
	 */
	openSubmenu(index) {
		const item = this.#submenuItems[index];
		if (!item) {
			console.warn(`[SidebarSecondary] Submenu index ${index} out of bounds.`);
			return this;
		}

		// Accordion mode: close all other open submenus first
		if (!this.options.multiOpen) {
			this.#submenuItems.forEach((sibling, i) => {
				if (i !== index) sibling.classList.remove('open');
			});
		}

		item.classList.add('open');
		return this;
	}

	/**
	 * @method closeSubmenu
	 * @description Closes the submenu at the given index.
	 *
	 * @param {number} index
	 * @returns {SidebarSecondary} this — chainable
	 */
	closeSubmenu(index) {
		const item = this.#submenuItems[index];
		if (!item) {
			console.warn(`[SidebarSecondary] Submenu index ${index} out of bounds.`);
			return this;
		}
		item.classList.remove('open');
		return this;
	}

	/**
	 * @method closeAllSubmenus
	 * @description Closes all open submenus.
	 * @returns {SidebarSecondary} this — chainable
	 */
	closeAllSubmenus() {
		this.#submenuItems.forEach(item => item.classList.remove('open'));
		return this;
	}

	/**
	 * @method destroy
	 * @description Removes all event listeners and the resize observer.
	 */
	destroy() {
		if (this.toggleEl) {
			this.toggleEl.removeEventListener('click', this.#handlers.toggleClick);
		}

		const menu = this.element?.querySelector('.menu');
		if (menu) {
			menu.removeEventListener('click', this.#handlers.menuClick);
		}

		document.removeEventListener('click',  this.#handlers.outsideClick);
		document.removeEventListener('keydown', this.#handlers.keydown);

		this.#resizeObserver?.disconnect();
		this.#resizeObserver = null;
	}
}

export default SidebarSecondary;