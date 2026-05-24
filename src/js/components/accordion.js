/**
 * @module js.components.accordion
 * @description Accessible accordion component with smooth animations, keyboard
 *				navigation, lifecycle events, and optional <details>/<summary> support.
 *
 * Config via data-accordion attribute (Component's #getConfigAttribute):
 *		data-accordion="allowMultiple:true; noCollapse:true"
 *
 * Options:
 *		allowMultiple	{boolean} - Allow multiple items open simultaneously (default: false)
 *		noCollapse		{boolean} - Prevent all items from being closed (default: false)
 *
 * Lifecycle events (dispatched on this.element, bubbling):
 *		accordion:open		- { index, item }  fired after an item opens
 *		accordion:close		- { index, item }  fired after an item closes
 * 
 * @example
 * Primary structure (recommended):
 *	<ul class="accordion" data-accordion>
 *		<li>
 *			<button class="accordion-title">Title</button>
 *			<div class="accordion-content">Content</div>
 *		</li>
 *	</ul>
 *
 * @example
 * Alternative: native <details>/<summary> (auto-detected):
 *	<div class="accordion" data-accordion>
 *		<details>
 *			<summary class="accordion-title">Title</summary>
 *			<div class="accordion-content">Content</div>
 *		</details>
 *	</div>
 *
 */

import Component from './component.js';

class Accordion extends Component {

	// ─────────────────────────────────────────────────────────────────────────
	// CONSTRUCTOR
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @param {HTMLElement} element		- The accordion container element.
	 * @param {Object}		options		- Config overrides.
	 * @param {Deck}		deck		- Framework instance.
	 */
	constructor(element, options = {}, deck = null) {

		super({
			name: 'accordion',
			element,
			deck,
			allowMultiple: false,
			noCollapse:    false,
			...options,
		});

		this.#setup();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — SETUP
	// ─────────────────────────────────────────────────────────────────────────

	#setup() {

		// ── Detect mode ───────────────────────────────────────────────────────
		// 'details' mode: container holds <details>/<summary> elements
		// 'list' mode:    container holds <li> elements (default)
		this.#mode = this.element.querySelector(':scope > details')
			? 'details'
			: 'list';

		// ── Cache items ───────────────────────────────────────────────────────
		// Cached once — live NodeList would re-query on every access.
		// Items are always direct children to avoid matching nested accordions.
		this.items = this.#getItems();

		// ── ARIA setup ────────────────────────────────────────────────────────
		this.#initAria();

		// ── Initial open state from markup ────────────────────────────────────
		this.items.forEach((item, i) => {
			if (this.#isOpen(item)) {
				this.#applyOpen(item, i, false); // false = no animation on init
			} else {
				this.#applyClose(item, false);
			}
		});

		// ── Events ───────────────────────────────────────────────────────────
		// Component's tracked on() — auto-cleaned on destroy()
		this.on('click',   this.#onClick.bind(this));
		this.on('keydown', this.#onKeydown.bind(this));
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — MODE
	// ─────────────────────────────────────────────────────────────────────────

	/** 'list' | 'details' */
	#mode = 'list';

	/**
	 * Returns the direct-child item elements for the current mode.
	 * Scoped to :scope > to avoid matching nested accordion items.
	 * @returns {HTMLElement[]}
	 */
	#getItems() {
		const selector = this.#mode === 'details'
			? ':scope > details'
			: ':scope > li';
		return [...this.element.querySelectorAll(selector)];
	}

	/**
	 * Returns the title/trigger element for an item.
	 * @param {HTMLElement} item
	 * @returns {HTMLElement|null}
	 */
	#getTitle(item) {
		return item.querySelector('.accordion-title');
	}

	/**
	 * Returns the content panel element for an item.
	 * @param {HTMLElement} item
	 * @returns {HTMLElement|null}
	 */
	#getContent(item) {
		return item.querySelector('.accordion-content');
	}

	/**
	 * Returns whether an item is currently open.
	 * @param {HTMLElement} item
	 * @returns {boolean}
	 */
	#isOpen(item) {
		return this.#mode === 'details'
			? item.hasAttribute('open')
			: item.classList.contains('open');
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — ARIA
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Applies full ARIA accordion pattern.
	 * Each title button gets aria-expanded and aria-controls.
	 * Each content panel gets role="region" and aria-labelledby.
	 */
	#initAria() {

		// In 'details' mode, the browser handles its own ARIA — we skip.
		if (this.#mode === 'details') return;

		this.element.setAttribute('role', 'list');

		this.items.forEach((item, i) => {

			const title   = this.#getTitle(item);
			const content = this.#getContent(item);

			if (!title || !content) return;

			// Generate stable unique IDs
			const titleId	= title.id   || `accordion-title-${this.dci}-${i}`;
			const contentId = content.id || `accordion-panel-${this.dci}-${i}`;

			title.id   = titleId;
			content.id = contentId;

			// Title must be a button for keyboard access.
			// If the author used a div or span, we warn and still wire it up.
			if (title.tagName !== 'BUTTON') {
				this.log(
					`[Accordion] .accordion-title at index ${i} should be a <button> for keyboard accessibility.`,
					'warn'
				);
				title.setAttribute('tabindex', '0');
			}

			title.setAttribute('aria-expanded',	this.#isOpen(item) ? 'true' : 'false');
			title.setAttribute('aria-controls',	contentId);

			content.setAttribute('role',			'region');
			content.setAttribute('aria-labelledby',	titleId);
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — ANIMATION
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Applies the open state to an item.
	 * Uses the CSS grid-row trick for smooth animation without fixed max-height.
	 *
	 * The trick: grid-row: 0fr -> 1fr animates height from 0 to natural height.
	 * This is fully GPU-accelerated, works with dynamic content, and requires
	 * no JavaScript height measurement.
	 *
	 * @param {HTMLElement} item
	 * @param {number}      index
	 * @param {boolean}     [animate=true]
	 */
	#applyOpen(item, index, animate = true) {

		const title   = this.#getTitle(item);
		const content = this.#getContent(item);

		if (this.#mode === 'details') {
			item.setAttribute('open', '');

		} else {
			item.classList.add('open');
		}

		title?.setAttribute('aria-expanded', 'true');

		if (content) {
			if (!animate) {
				// Instant open — no transition class
				content.classList.add('is-open');
				content.classList.remove('is-animating');

			} else {
				content.classList.add('is-open', 'is-animating');
				// Remove animating flag after transition
				content.addEventListener('transitionend', () => {
					content.classList.remove('is-animating');
				}, { once: true });
			}
		}
	}

	/**
	 * Applies the close state to an item.
	 * @param {HTMLElement}	item
	 * @param {boolean}		[animate=true]
	 */
	#applyClose(item, animate = true) {

		const title   = this.#getTitle(item);
		const content = this.#getContent(item);

		if (this.#mode === 'details') {
			item.removeAttribute('open');

		} else {
			item.classList.remove('open');
		}

		title?.setAttribute('aria-expanded', 'false');

		if (content) {
			if (!animate) {
				content.classList.remove('is-open', 'is-animating');
				
			} else {
				content.classList.add('is-animating');
				content.classList.remove('is-open');
				content.addEventListener('transitionend', () => {
					content.classList.remove('is-animating');
				}, { once: true });
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — EVENT HANDLERS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Delegated click handler on the accordion container.
	 * Uses closest() so clicks on child elements (icons, badges) still work.
	 * @param {MouseEvent} event
	 */
	#onClick(event) {
		const title = event.target.closest('.accordion-title');

		// Guard: title must exist and belong to THIS accordion instance
		// (not a nested accordion's title)
		if (!title) return;

		const item = this.items.find(i => i.contains(title));
		if (!item) return;

		// In details mode, browser handles open/close natively — don't interfere
    	if (this.#mode === 'details') return;

		const index = this.items.indexOf(item);
		this.toggle(index);
	}

	/**
	 * Keyboard handler — ARIA Accordion pattern.
	 * Arrow keys move focus between titles.
	 * Home/End jump to first/last.
	 * @param {KeyboardEvent} event
	 */
	#onKeydown(event) {

		const title = event.target.closest('.accordion-title');
		if (!title) return;

		const titles = this.items
			.map(i => this.#getTitle(i))
			.filter(Boolean);

		const current = titles.indexOf(title);
		if (current === -1) return;

		switch (event.key) {
			case 'ArrowDown': {
				event.preventDefault();
				titles[(current + 1) % titles.length].focus();
				break;
			}
			case 'ArrowUp': {
				event.preventDefault();
				titles[(current - 1 + titles.length) % titles.length].focus();
				break;
			}
			case 'Home': {
				event.preventDefault();
				titles[0].focus();
				break;
			}
			case 'End': {
				event.preventDefault();
				titles[titles.length - 1].focus();
				break;
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PUBLIC API
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @method open
	 * @description Opens the accordion item at the specified index.
	 *
	 * @param {number} index
	 * @returns {Accordion} this — chainable
	 */
	open(index) {

		if (!Number.isInteger(index)) return this;

		const item = this.items[index];
		if (!item || this.#isOpen(item)) return this;

		// Close siblings unless multiple open items are allowed
		if (!this.allowMultiple) {
			this.items.forEach((sibling, i) => {
				if (i !== index && this.#isOpen(sibling)) {
					this.#applyClose(sibling);
					this.dispatchEvent('accordion:close', { index: i, item: sibling }, true);
				}
			});
		}

		this.#applyOpen(item, index);

		this.dispatchEvent('accordion:open', { index, item }, true);

		return this;
	}

	/**
	 * @method close
	 * @description Closes the accordion item at the specified index.
	 *
	 * @param {number} index
	 * @returns {Accordion} this — chainable
	 */
	close(index) {

		if (!Number.isInteger(index)) return this;

		const item = this.items[index];
		if (!item || !this.#isOpen(item)) return this;

		this.#applyClose(item);

		this.dispatchEvent('accordion:close', { index, item }, true);

		return this;
	}

	/**
	 * @method toggle
	 * @description Toggles the open/close state of the item at the specified index.
	 *
	 * @param {number} index
	 * @returns {Accordion} this — chainable
	 */
	toggle(index) {

		if (!Number.isInteger(index)) return this;

		const item = this.items[index];
		if (!item) return this;

		if (this.#isOpen(item)) {
			// noCollapse: prevent closing if it's the only open item
			if (this.noCollapse && this.getOpen().length <= 1) return this;
			return this.close(index);
		}

		return this.open(index);
	}

	/**
	 * @method openAll
	 * @description Opens all items. Only meaningful when allowMultiple is true.
	 *
	 * @returns {Accordion} this — chainable
	 */
	openAll() {
		this.items.forEach((_, i) => this.open(i));
		return this;
	}

	/**
	 * @method closeAll
	 * @description Closes all items.
	 *
	 * @returns {Accordion} this — chainable
	 */
	closeAll() {
		this.items.forEach((_, i) => this.close(i));
		return this;
	}

	/**
	 * @method getOpen
	 * @description Returns an array of indices for all currently open items.
	 *
	 * @returns {number[]}
	 */
	getOpen() {
		return this.items
			.map((item, i) => this.#isOpen(item) ? i : -1)
			.filter(i => i !== -1);
	}

	/**
	 * @method update
	 * @description Updates options at runtime. Called by deck.update().
	 *
	 * @param {Object} options
	 * @returns {Accordion} this — chainable
	 */
	update(options = {}) {
		Object.assign(this, options);
		return this;
	}

	/**
	 * @method destroy
	 * @description Removes ARIA attributes and delegates cleanup to Component.
	 */
	destroy() {
		// Strip ARIA we added — restore elements to clean state
		if (this.#mode === 'list') {
			this.element.removeAttribute('role');
			this.items.forEach(item => {
				const title   = this.#getTitle(item);
				const content = this.#getContent(item);
				title?.removeAttribute('aria-expanded');
				title?.removeAttribute('aria-controls');
				content?.removeAttribute('role');
				content?.removeAttribute('aria-labelledby');
			});
		}

		// Component handles: tracked on() listeners, Deck deregistration
		super.destroy();
	}
}

export default Accordion;