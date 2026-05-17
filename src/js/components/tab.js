/**
 * @module js.components.tab
 * @description Tabbed interface component with full ARIA support, keyboard navigation,
 *				optional URL hash sync, and optional active-tab persistence via storage.
 *
 * Supported data-tab config (via Component's #getConfigAttribute):
 *   data-tab="activeClass:active; hash:true; storage:local"
 *
 * Options:
 *	target		{string}	- CSS selector for the content container (auto-detected if omitted)
 *	activeClass	{string}	- Class applied to the active tab and pane (default: 'active')
 *	hash		{boolean}	- Sync active tab to URL hash (default: false)
 *	storage		{string}	- Persist active tab: 'local' | 'session' | false (default: false)
 *
 * ARIA pattern implemented: ARIA Tabs (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
 *	role="tablist"		- on the <ul> element (this.element)
 *	role="tab"			- on each <li>
 *	role="tabpanel"		- on each content pane
 *	aria-selected		- true on the active tab, false on others
 *	aria-controls		- links each tab to its panel id
 *	aria-labelledby		- links each panel back to its tab id
 *	tabindex			- 0 on active tab, -1 on others (roving tabindex)
 */
import Component from './component.js';

class Tab extends Component {

	// ─────────────────────────────────────────────────────────────────────────
	// CONSTRUCTOR
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @param {HTMLElement}	element  - The <ul> tab navigation element.
	 * @param {Object}		options  - Config overrides.
	 * @param {Deck}		deck     - Framework instance.
	 */
	constructor(element, options = {}, deck = null) {

		const defaultOptions = {
			target:			null,		// CSS selector for .tab-content container
			activeClass:	'active',	// Class for active tab + pane
			hash:			false,		// Sync active tab with URL hash
			storage:		false,		// 'local' | 'session' | false
		};

		super({
			name: 'tab',
			element,
			deck,
			...defaultOptions,
			...options,
		});

		this.#setup();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — SETUP
	// ─────────────────────────────────────────────────────────────────────────

	#setup() {

		// ── Resolve content container ─────────────────────────────────────────
		this.contentContainer = this.#resolveContainer();

		if (!this.contentContainer) {
			this.log(`[Tab] Content container not found for element`, 'warn');
			return;
		}

		// ── Cache tab and pane collections ────────────────────────────────────
		// Use Array.from once and cache — querySelectorAll on every interaction
		// is wasteful for large tab sets.
		this.tabs  = Array.from(this.element.children);
		this.panes = Array.from(this.contentContainer.children);

		// ── ARIA setup ────────────────────────────────────────────────────────
		this.#initAria();

		// ── Fix flex-start alignment ──────────────────────────────────────────
		// Prevents parent flex container from stretching height when
		// switching from tall to short content.
		const parent = this.element.parentElement;
		if (parent?.classList.contains('tab-container') || parent?.classList.contains('flex')) {
			parent.style.setProperty('--items', 'flex-start');
		}

		// ── State: determine initial active index ─────────────────────────────
		// Priority: URL hash → stored state → markup → 0
		const initial = this.#resolveInitialIndex();

		// ── Initialize Component state + storage ──────────────────────────────
		// Sets up this.state, hydrates from storage if enabled, attaches watcher
		this.state = { index: initial };
		this.initState();

		// ── Events ───────────────────────────────────────────────────────────
		this.on('click',   this.#onClick.bind(this));
		this.on('keydown', this.#onKeydown.bind(this));

		// Hash change (external navigation, e.g. browser back/forward)
		if (this.hash) {
			window.addEventListener('hashchange', this.#onHashChange.bind(this));
		}

		// ── Open initial tab ──────────────────────────────────────────────────
		// Use state.index which was hydrated from storage or hash above
		this.open(this.state.index ?? initial);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — ARIA
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Applies full ARIA Tabs pattern to the tablist, tabs, and panels.
	 * IDs are generated from existing element IDs or from the component DCI
	 * to guarantee uniqueness even with multiple tab instances on one page.
	 */
	#initAria() {
		// Tablist
		this.element.setAttribute('role', 'tablist');

		this.tabs.forEach((tab, i) => {
			const pane = this.panes[i];

			// Generate stable, unique IDs
			const tabId  = tab.id  || `tab-${this.dci}-${i}`;
			const paneId = pane?.id || `tab-panel-${this.dci}-${i}`;

			tab.id  = tabId;
			if (pane) pane.id = paneId;

			// Tab
			tab.setAttribute('role', 'tab');
			tab.setAttribute('aria-controls', paneId);
			tab.setAttribute('aria-selected', 'false');
			tab.setAttribute('tabindex', '-1');

			// Panel
			if (pane) {
				pane.setAttribute('role', 'tabpanel');
				pane.setAttribute('aria-labelledby', tabId);
				pane.setAttribute('tabindex', '0');
			}
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — RESOLUTION HELPERS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Finds the content container.
	 * Priority: explicit target option → next sibling with .tab-content.
	 */
	#resolveContainer() {
		if (this.target) return document.querySelector(this.target);

		let sibling = this.element.nextElementSibling;
		while (sibling) {
			if (sibling.classList.contains('tab-content')) return sibling;
			sibling = sibling.nextElementSibling;
		}
		return null;
	}

	/**
	 * Determines the initial active tab index.
	 * Priority: URL hash → stored state (from Component storage) → markup active class → 0
	 */
	#resolveInitialIndex() {

		// 1. URL hash — e.g. #security matches a tab with data-hash="security"
		if (this.hash) {
			const fromHash = this.#indexFromHash(window.location.hash);
			if (fromHash !== -1) return fromHash;
		}

		// 2. Stored state (Component's initState() hasn't run yet so we read directly)
		// initState() will hydrate this.state from storage — we read it after
		// This is handled by passing the state.index after initState() in #setup()

		// 3. Active class in markup
		const fromMarkup = this.tabs.findIndex(t => t.classList.contains(this.activeClass));
		if (fromMarkup !== -1) return fromMarkup;

		// 4. Default to first tab
		return 0;
	}

	/**
	 * Resolves a URL hash string to a tab index.
	 * Matches against: tab's data-hash attribute → tab's id → panel's id.
	 * @param {string} hash  - e.g. '#security'
	 * @returns {number}
	 */
	#indexFromHash(hash) {
		if (!hash) return -1;
		const key = hash.slice(1); // Strip leading '#'

		return this.tabs.findIndex((tab, i) => {
			return (
				tab.dataset.hash === key ||
				tab.id           === key ||
				this.panes[i]?.id === key
			);
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — EVENT HANDLERS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Delegated click handler on the tablist element.
	 * @param {MouseEvent} event
	 */
	#onClick(event) {
		const tab = event.target.closest('[role="tab"]');

		// Guard: clicked element must be a tab belonging to this instance
		if (!tab || tab.parentElement !== this.element) return;
		if (tab.classList.contains('disabled'))           return;

		const index = this.tabs.indexOf(tab);
		this.open(index);
	}

	/**
	 * Keyboard navigation — ARIA Tabs pattern.
	 * Horizontal tabs: ArrowLeft / ArrowRight
	 * Vertical tabs:   ArrowUp / ArrowDown
	 * Home / End:      first / last tab
	 * Enter / Space:   activate focused tab
	 *
	 * @param {KeyboardEvent} event
	 */
	#onKeydown(event) {
		const isVertical = this.element.classList.contains('tab-left') ||
						   this.element.classList.contains('tab-right');

		const prev = isVertical ? 'ArrowUp'   : 'ArrowLeft';
		const next = isVertical ? 'ArrowDown'  : 'ArrowRight';

		const current = this.tabs.indexOf(document.activeElement);
		if (current === -1) return;

		let target = -1;

		switch (event.key) {
			case prev:
				target = this.#prevEnabled(current);
				break;
			case next:
				target = this.#nextEnabled(current);
				break;
			case 'Home':
				target = this.#nextEnabled(-1);
				break;
			case 'End':
				target = this.#prevEnabled(this.tabs.length);
				break;
			case 'Enter':
			case ' ':
				this.open(current);
				return;
			default:
				return;
		}

		if (target !== -1) {
			// Move focus only — activation follows on Enter/Space
			// (following the ARIA "manual activation" pattern)
			this.tabs[target].focus();
			event.preventDefault();
		}
	}

	/**
	 * Browser hash change — e.g. user hits back/forward.
	 */
	#onHashChange() {
		const index = this.#indexFromHash(window.location.hash);
		if (index !== -1) this.open(index, { updateHash: false });
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — NAVIGATION HELPERS
	// ─────────────────────────────────────────────────────────────────────────

	/** Returns the index of the previous non-disabled tab, wrapping around. */
	#prevEnabled(from) {
		let i = (from - 1 + this.tabs.length) % this.tabs.length;
		let attempts = this.tabs.length;
		while (this.tabs[i].classList.contains('disabled') && --attempts > 0) {
			i = (i - 1 + this.tabs.length) % this.tabs.length;
		}
		return attempts > 0 ? i : -1;
	}

	/** Returns the index of the next non-disabled tab, wrapping around. */
	#nextEnabled(from) {
		let i = (from + 1) % this.tabs.length;
		let attempts = this.tabs.length;
		while (this.tabs[i].classList.contains('disabled') && --attempts > 0) {
			i = (i + 1) % this.tabs.length;
		}
		return attempts > 0 ? i : -1;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PUBLIC API
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @method open
	 * @description Activates a tab by index.
	 *
	 * @param {number}  index
	 * @param {Object}  [opts]
	 * @param {boolean} [opts.updateHash=true]  - Whether to update the URL hash.
	 * @returns {Tab} this — chainable
	 */
	open(index, { updateHash = true } = {}) {

		if (index < 0 || index >= this.tabs.length) return this;
		if (this.tabs[index]?.classList.contains('disabled'))  return this;

		// Fire beforechange — cancelable
		const allowed = this.dispatchEvent('tab:beforechange', {
			index,
			tab:  this.tabs[index],
			pane: this.panes[index] ?? null,
		}, true);
		if (allowed === false) return this;

		const prev = this.getActiveIndex();

		// ── Tab items — roving tabindex + ARIA ────────────────────────────────
		this.tabs.forEach((tab, i) => {
			const isActive = i === index;
			tab.classList.toggle(this.activeClass, isActive);
			tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
			tab.setAttribute('tabindex', isActive ? '0' : '-1');
		});

		// ── Content panes — active class only, CSS drives visibility ──────────
		this.panes.forEach((pane, i) => {
			pane.classList.toggle(this.activeClass, i === index);
			// aria-hidden for screen readers on inactive panels
			pane.setAttribute('aria-hidden', i === index ? 'false' : 'true');
		});

		// ── URL hash ──────────────────────────────────────────────────────────
		if (this.hash && updateHash) {
			const tab     = this.tabs[index];
			const hashKey = tab.dataset.hash || tab.id;
			if (hashKey) {
				// replaceState: no browser history entry, just updates the URL
				history.replaceState(null, '', `#${hashKey}`);
			}
		}

		// ── Persist state via Component storage ───────────────────────────────
		this.updateState({ index });

		// ── Event ─────────────────────────────────────────────────────────────
		this.dispatchEvent('tab:change', {
			index,
			prev,
			tab:  this.tabs[index],
			pane: this.panes[index] ?? null,
		}, true);

		return this;
	}

	/**
	 * @method next
	 * @description Activates the next non-disabled tab, wrapping around.
	 * @returns {Tab} this — chainable
	 */
	next() {
		return this.open(this.#nextEnabled(this.getActiveIndex()));
	}

	/**
	 * @method previous
	 * @description Activates the previous non-disabled tab, wrapping around.
	 * @returns {Tab} this — chainable
	 */
	previous() {
		return this.open(this.#prevEnabled(this.getActiveIndex()));
	}

	/**
	 * @method getActiveIndex
	 * @description Returns the index of the currently active tab.
	 * @returns {number} -1 if none active.
	 */
	getActiveIndex() {
		return this.tabs.findIndex(t => t.classList.contains(this.activeClass));
	}

	/**
	 * @method getActiveTab
	 * @description Returns the active tab element.
	 * @returns {HTMLElement|null}
	 */
	getActiveTab() {
		return this.tabs[this.getActiveIndex()] ?? null;
	}

	/**
	 * @method update
	 * @description Updates tab options at runtime. Called by deck.update().
	 * @param {Object} options
	 * @returns {Tab} this — chainable
	 */
	update(options = {}) {
		Object.assign(this, options);
		return this;
	}

	/**
	 * @method destroy
	 * @description Removes ARIA attributes, cleans up listeners, deregisters from Deck.
	 */
	destroy() {
		// Remove hash listener if it was attached
		if (this.hash) {
			window.removeEventListener('hashchange', this.#onHashChange);
		}

		// Strip ARIA attributes we added — restore element to clean state
		this.element.removeAttribute('role');
		this.tabs.forEach(tab => {
			tab.removeAttribute('role');
			tab.removeAttribute('aria-selected');
			tab.removeAttribute('aria-controls');
			tab.removeAttribute('tabindex');
		});
		this.panes.forEach(pane => {
			pane.removeAttribute('role');
			pane.removeAttribute('aria-labelledby');
			pane.removeAttribute('aria-hidden');
			pane.removeAttribute('tabindex');
		});

		// Component handles: tracked listeners, watchers, Deck deregistration
		super.destroy();
	}
}

export default Tab;