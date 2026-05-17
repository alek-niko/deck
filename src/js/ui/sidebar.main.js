/**
 * =============================================================================
 * SIDEBAR MAIN
 * @module js.ui.sidebar.main
 * -----------------------------------------------------------------------------
 * Manages the primary application sidebar — Twitter/X style fixed navigation
 * with icon+label items, collapsed icon-only state on tablet, and a slide-in
 * drawer on mobile.
 *
 * State machine:
 *	desktop		- expanded (default) | collapsed (icon-only)
 *	tablet		- always collapsed (CSS handles this via breakpoint, no JS state)
 *	mobile		- always drawer (hidden by default, .is-visible opens it)
 *
 * Persistence:
 *	Desktop collapsed/expanded state is saved to localStorage so it survives
 *	page navigation. Mobile drawer state is never persisted — always starts closed.
 *
 * Active item:
 *	On init, scans all nav links and marks the best URL match. Prefers the
 *	longest matching path segment so /settings/security beats /settings.
 *
 * Profile popover:
 *	Managed by Toggle — SidebarMain does not touch it. The profile footer
 *	element uses CSS anchor positioning and data-toggle to open the popover.
 *
 * Usage in ui.js:
 *	import SidebarMain from './sidebar.main.js';
 *	if (document.querySelector('.sidebar-main')) {
 *		this.sidebarMain = new SidebarMain('.sidebar-main', '#sidebar-main-toggle');
 *	}
 *
 * Programmatic API:
 *	sidebar.expand()			- expand to full width (desktop)
 *	sidebar.collapse()			- collapse to icon-only (desktop)
 *	sidebar.toggle()			- toggle expanded/collapsed (desktop)
 *	sidebar.openDrawer()		- show drawer (mobile)
 *	sidebar.closeDrawer()		- hide drawer (mobile)
 *	sidebar.toggleDrawer()		- toggle drawer (mobile)
 *	sidebar.isCollapsed()		- boolean
 *	sidebar.isDrawerOpen()		- boolean
 *	sidebar.destroy()			- clean up all listeners
 * =============================================================================
 */

class SidebarMain {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** Bound handler references for clean removeEventListener. */
	#handlers = {};

	/** ResizeObserver to react to viewport changes. */
	#resizeObserver = null;

	/** Mobile breakpoint in px — below this, sidebar is a drawer. */
	#mobileBreakpoint = 768;

	// =========================================================================
	// CONSTRUCTOR
	// =========================================================================

	/**
	 * @param {string} elementSelector		- CSS selector for the .sidebar-main element.
	 * @param {string} toggleSelector		- CSS selector for the toggle button.
	 * @param {Object} [options={}]
	 * @param {string} [options.storageKey='sidebar-main.collapsed']	- localStorage key.
	 * @param {number} [options.mobileBreakpoint=768]					- px below which drawer mode activates.
	 * @param {string} [options.collapsedClass='is-collapsed']			- Class for collapsed desktop state.
	 * @param {string} [options.visibleClass='is-visible']				- Class for open mobile drawer.
	 * @param {string} [options.toggleActiveClass='open']				- Class on toggle button when open.
	 */
	constructor(elementSelector, toggleSelector, options = {}) {

		this.element = document.querySelector(elementSelector);
		this.toggleEl = document.querySelector(toggleSelector);

		if (!this.element) {
			console.warn(`[SidebarMain] Element not found: "${elementSelector}"`);
			return;
		}

		this.options = {
			storageKey:			'sidebar-main.collapsed',
			mobileBreakpoint:	768,
			collapsedClass:		'is-collapsed',
			visibleClass:		'is-visible',
			toggleActiveClass:	'open',
			...options,
		};

		this.#mobileBreakpoint = this.options.mobileBreakpoint;

		this.#setup();
	}

	// =========================================================================
	// PRIVATE — SETUP
	// =========================================================================

	#setup() {
		// ── Restore persisted desktop state ───────────────────────────────────
		// Only apply on desktop — never force collapsed/expanded on mobile
		if (!this.#isMobile()) {
			const wasCollapsed = localStorage.getItem(this.options.storageKey) === 'true';
			if (wasCollapsed) {
				this.element.classList.add(this.options.collapsedClass);
			}
		}

		// ── Highlight active nav item ─────────────────────────────────────────
		this.#highlightActive();

		// ── Events ────────────────────────────────────────────────────────────
		this.#handlers.toggleClick	= this.#onToggleClick.bind(this);
		this.#handlers.outsideClick	= this.#onOutsideClick.bind(this);
		this.#handlers.keydown		= this.#onKeydown.bind(this);

		if (this.toggleEl) {
			this.toggleEl.addEventListener('click', this.#handlers.toggleClick);
		}

		document.addEventListener('click', this.#handlers.outsideClick);
		document.addEventListener('keydown', this.#handlers.keydown);

		// ── ResizeObserver — react to viewport changes ────────────────────────
		// When crossing the mobile breakpoint, ensure drawer state is reset
		// so we don't end up with a stuck-open or stuck-closed sidebar.
		this.#resizeObserver = new ResizeObserver(() => this.#onResize());
		this.#resizeObserver.observe(document.body);
	}

	// =========================================================================
	// PRIVATE — HELPERS
	// =========================================================================

	/**
	 * Returns true when in mobile (drawer) mode.
	 */
	#isMobile() {
		return window.innerWidth <= this.#mobileBreakpoint;
	}

	/**
	 * Highlights the best-matching nav link for the current URL.
	 * Prefers the longest href that is a prefix of the current pathname —
	 * so /settings/security correctly highlights the security link, not
	 * the top-level /settings link.
	 */
	#highlightActive() {
		const path	= window.location.pathname;
		const links	= [...this.element.querySelectorAll('a[href]')];

		let best		= null;
		let bestScore	= -1;

		links.forEach(link => {
			const href = link.getAttribute('href');
			if (!href || href === '#') return;

			// Exact match wins immediately
			if (href === path) {
				best		= link;
				bestScore	= Infinity;
				return;
			}

			// Prefix match — longer prefix = better score
			if (path.startsWith(href) && href.length > bestScore) {
				best		= link;
				bestScore	= href.length;
			}
		});

		if (!best) return;

		const item = best.closest('.nav-item') ?? best.parentElement;
		item?.classList.add('active');
	}

	// =========================================================================
	// PRIVATE — EVENT HANDLERS
	// =========================================================================

	/**
	 * Toggle button click — behavior differs by viewport:
	 * - Mobile: toggle the drawer
	 * - Desktop: toggle collapsed/expanded
	 */
	#onToggleClick(event) {
		event.stopPropagation();

		if (this.#isMobile()) {
			this.toggleDrawer();

		} else {
			this.toggle();
		}
	}

	/**
	 * Outside click — closes the mobile drawer when clicking outside.
	 * Never fires on desktop.
	 * @param {MouseEvent} event
	 */
	#onOutsideClick(event) {
		if (!this.#isMobile()) return;
		if (!this.isDrawerOpen()) return;

		const inside = this.element.contains(event.target);
		const onToggle = this.toggleEl?.contains(event.target);

		if (!inside && !onToggle) {
			this.closeDrawer();
		}
	}

	/**
	 * Escape key — closes mobile drawer.
	 * @param {KeyboardEvent} event
	 */
	#onKeydown(event) {
		if (event.key === 'Escape' && this.#isMobile() && this.isDrawerOpen()) {
			this.closeDrawer();
			this.toggleEl?.focus(); // Restore focus to toggle button
		}
	}

	/**
	 * ResizeObserver callback — cleans up state on breakpoint crossing.
	 */
	#onResize() {
		if (!this.#isMobile()) {
			// Crossed from mobile → desktop: ensure drawer state is clean
			this.element.classList.remove(this.options.visibleClass);
			if (this.toggleEl) {
				this.toggleEl.classList.remove(this.options.toggleActiveClass);
				this.toggleEl.setAttribute('aria-expanded', 'false');
			}

		} else {
			// Crossed from desktop → mobile: ensure collapsed class is clean
			// (tablet breakpoint CSS handles collapsed icon-only state)
			this.element.classList.remove(this.options.collapsedClass);
		}
	}

	/**
	 * Persists the collapsed state to localStorage.
	 * @param {boolean} collapsed
	 */
	#persist(collapsed) {
		if (collapsed) {
			localStorage.setItem(this.options.storageKey, 'true');

		} else {
			localStorage.removeItem(this.options.storageKey);
		}
	}

	// =========================================================================
	// PUBLIC API
	// =========================================================================

	/**
	 * @method expand
	 * @description Expands the sidebar to full width on desktop.
	 * @returns {SidebarMain} this — chainable
	 */
	expand() {
		this.element.classList.remove(this.options.collapsedClass);
		this.toggleEl?.setAttribute('aria-expanded', 'true');
		this.#persist(false);
		return this;
	}

	/**
	 * @method collapse
	 * @description Collapses the sidebar to icon-only on desktop.
	 * @returns {SidebarMain} this — chainable
	 */
	collapse() {
		this.element.classList.add(this.options.collapsedClass);
		this.toggleEl?.setAttribute('aria-expanded', 'false');
		this.#persist(true);
		return this;
	}

	/**
	 * @method toggle
	 * @description Toggles between expanded and collapsed on desktop.
	 * @returns {SidebarMain} this — chainable
	 */
	toggle() {
		return this.isCollapsed() ? this.expand() : this.collapse();
	}

	/**
	 * @method openDrawer
	 * @description Opens the sidebar drawer on mobile.
	 * @returns {SidebarMain} this — chainable
	 */
	openDrawer() {
		this.element.classList.add(this.options.visibleClass);
		this.toggleEl?.classList.add(this.options.toggleActiveClass);
		this.toggleEl?.setAttribute('aria-expanded', 'true');
		// Move focus into the sidebar for keyboard users
		requestAnimationFrame(() => {
			const first = this.element.querySelector('a, button');
			first?.focus();
		});
		return this;
	}

	/**
	 * @method closeDrawer
	 * @description Closes the sidebar drawer on mobile.
	 * @returns {SidebarMain} this — chainable
	 */
	closeDrawer() {
		this.element.classList.remove(this.options.visibleClass);
		this.toggleEl?.classList.remove(this.options.toggleActiveClass);
		this.toggleEl?.setAttribute('aria-expanded', 'false');
		return this;
	}

	/**
	 * @method toggleDrawer
	 * @description Toggles the mobile drawer open/closed.
	 * @returns {SidebarMain} this — chainable
	 */
	toggleDrawer() {
		return this.isDrawerOpen() ? this.closeDrawer() : this.openDrawer();
	}

	/**
	 * @method isCollapsed
	 * @description Returns true if the sidebar is in collapsed (icon-only) state.
	 * @returns {boolean}
	 */
	isCollapsed() {
		return this.element.classList.contains(this.options.collapsedClass);
	}

	/**
	 * @method isDrawerOpen
	 * @description Returns true if the mobile drawer is open.
	 * @returns {boolean}
	 */
	isDrawerOpen() {
		return this.element.classList.contains(this.options.visibleClass);
	}

	/**
	 * @method destroy
	 * @description Removes all event listeners and the resize observer.
	 */
	destroy() {
		if (this.toggleEl) {
			this.toggleEl.removeEventListener('click', this.#handlers.toggleClick);
		}
		document.removeEventListener('click',   this.#handlers.outsideClick);
		document.removeEventListener('keydown',  this.#handlers.keydown);
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = null;
	}
}

export default SidebarMain;