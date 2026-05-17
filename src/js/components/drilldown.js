/**
 * @module js.components.drilldown
 * @description Hierarchical slide-in menu with infinite nesting depth, full ARIA
 *				support, keyboard navigation, focus management, and lifecycle events.
 *
 * Lifecycle events (dispatched on this.element, bubbling):
 *		drilldown:open	- { panel, depth, title }	fired after drilling into a panel
 *		drilldown:back	- { panel, depth, title }	fired after going back
 * 		drilldown:reset	-{}							fired after resetting to root
 *
 * Programmatic API (via deck.getInstance(el)):
 *		instance.drillTo(panel)	— drill into a specific panel element
 *		instance.back()			— go back one level
 *		instance.reset()		— return to root panel
 *		instance.getDepth()		— current depth (0 = root)
 * 
 * @example
 * HTML structure:
 *	<div class="drill" data-drilldown>
 *		<div class="drill-header">
 *			<button class="drill-back" hidden>...</button>
 *			<div class="drill-header-info">
 *				<span class="drill-title">Menu</span>
 *				<span class="drill-desc"></span>
 *			</div>
 *		</div>
 *		<ul class="drill-panel is-active" data-drill-title="Menu">
 *			<li class="drill-item">
 *				<a href="/page">Leaf item</a>
 *			</li>
 *			<li class="drill-item">
 *				<a href="#" data-drill-trigger>
 *					<span class="drill-item-body">
 *						<span class="drill-item-title">Section</span>
 *						<span class="drill-item-desc">Optional description</span>
 *					</span>
 *					<svg class="drill-chevron">...</svg>
 *				</a>
 *				<ul class="drill-panel" data-drill-title="Section">
 *					...
 *				</ul>
 *			</li>
 *		</ul>
 *	</div>
 *
 */
import Component from './component.js';

/**
 * @class Drilldown
 * @extends Component
 */
class Drilldown extends Component {

	// ─── Private fields ───────────────────────────────────────────────────────

	/**
	 * Navigation stack. Each entry: { panel, title, desc, triggerEl }
	 * triggerEl is the <a> that opened this panel — focus is restored to it on back.
	 */
	#stack = [];

	/** Cached references to header elements. */
	#header = {};

	// ─────────────────────────────────────────────────────────────────────────
	// CONSTRUCTOR
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @param {HTMLElement}	element		- The .drill container element.
	 * @param {Object}		options		- Config overrides.
	 * @param {Deck}		deck		- Framework instance.
	 */
	constructor(element, options = {}, deck = null) {

		super({
			name: 'drilldown',
			element,
			deck,
			...options,
		});

		this.#setup();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — SETUP
	// ─────────────────────────────────────────────────────────────────────────

	#setup() {

		// ── Cache header elements ─────────────────────────────────────────────
		this.#header = {
			back:  this.element.querySelector('.drill-back'),
			title: this.element.querySelector('.drill-title'),
			desc:  this.element.querySelector('.drill-desc'),
		};

		if (!this.#header.back) {
			this.log('[Drilldown] .drill-back element not found.', 'warn');
			return;
		}

		// ── Root panel ────────────────────────────────────────────────────────
		const root = this.element.querySelector('.drill-panel');
		if (!root) {
			this.log('[Drilldown] No root .drill-panel found.', 'warn');
			return;
		}

		// Push root onto the stack as the base state
		this.#stack = [{
			panel:     root,
			title:     root.dataset.drillTitle || '',
			desc:      root.dataset.drillDesc  || '',
			triggerEl: null, // Root has no trigger
		}];

		// ── ARIA ──────────────────────────────────────────────────────────────
		this.#initAria();

		// ── Events (Component's tracked on() for auto-cleanup) ────────────────
		this.on('click',   this.#onClick.bind(this));
		this.on('keydown', this.#onKeydown.bind(this));

		this.#header.back.addEventListener('click', () => this.back());

		// ── Initial header ────────────────────────────────────────────────────
		this.#updateHeader(
			this.#stack[0].title,
			this.#stack[0].desc,
			false
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — ARIA
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Applies ARIA roles to all panels and items in the tree.
	 * Called once on setup. Newly-rendered dynamic items would need reinit.
	 */
	#initAria() {
		const panels = this.element.querySelectorAll('.drill-panel');

		panels.forEach(panel => {
			panel.setAttribute('role', 'menu');

			panel.querySelectorAll(':scope > .drill-item > a').forEach(link => {
				link.setAttribute('role', 'menuitem');

				const hasSub = !!link.parentElement.querySelector('.drill-panel');
				if (hasSub) {
					link.setAttribute('aria-haspopup', 'true');
					link.setAttribute('aria-expanded', 'false');
				}
			});
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — HEADER
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Updates the header title, description, and back button visibility.
	 * @param {string}  title
	 * @param {string}  desc
	 * @param {boolean} showBack
	 */
	#updateHeader(title, desc, showBack) {
		if (this.#header.title) this.#header.title.textContent = title;
		if (this.#header.desc)  this.#header.desc.textContent  = desc ?? '';
		if (this.#header.back)  this.#header.back.hidden = !showBack;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — PANEL TRANSITIONS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Activates a panel with a directional CSS class.
	 * @param {HTMLElement} incoming	- Panel sliding in
	 * @param {HTMLElement} outgoing	- Panel sliding out
	 * @param {'forward'|'backward'}	  direction
	 */
	#transition(incoming, outgoing, direction) {
		// Set direction on the container — CSS reads this to pick the right transforms
		this.element.dataset.drillDirection = direction;

		outgoing.classList.remove('is-active');
		outgoing.classList.add('is-exiting');

		incoming.classList.add('is-active');

		// Clean up exiting class after transition
		const duration = this.#getTransitionDuration(outgoing);
		setTimeout(() => {
			outgoing.classList.remove('is-exiting');
			delete this.element.dataset.drillDirection;
		}, duration);
	}

	/**
	 * Reads the computed transition duration from an element.
	 * @param {HTMLElement} el
	 * @returns {number} ms
	 */
	#getTransitionDuration(el) {
		const style    = window.getComputedStyle(el);
		const duration = parseFloat(style.transitionDuration) || 0.3;
		const delay    = parseFloat(style.transitionDelay)    || 0;
		return (duration + delay) * 1000;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — FOCUS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Moves focus to the first interactive item in a panel.
	 * @param {HTMLElement} panel
	 */
	#focusFirst(panel) {
		requestAnimationFrame(() => {
			const first = panel.querySelector('.drill-item:not(.disabled) > a');
			first?.focus();
		});
	}

	/**
	 * Returns all focusable menu items within the currently active panel only.
	 * We scope to direct children to avoid accidentally including nested panel items.
	 * @returns {HTMLElement[]}
	 */
	#getActiveItems() {
		const active = this.#stack[this.#stack.length - 1]?.panel;
		if (!active) return [];
		return [...active.querySelectorAll(':scope > .drill-item:not(.disabled) > a')];
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — EVENT HANDLERS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Delegated click handler on the root element.
	 * Finds the nearest [data-drill-trigger] and drills in.
	 * @param {MouseEvent} event
	 */
	#onClick(event) {
		const trigger = event.target.closest('[data-drill-trigger]');

		// Must be a trigger and must belong to the currently active panel
		if (!trigger) return;

		const activePanel = this.#stack[this.#stack.length - 1]?.panel;
		if (!activePanel?.contains(trigger)) return;

		const item			= trigger.closest('.drill-item');
		const childPanel	= item?.querySelector(':scope > .drill-panel');

		if (!childPanel) return;

		event.preventDefault();
		event.stopPropagation();

		this.drillTo(childPanel, trigger);
	}

	/**
	 * Keyboard handler — arrow key navigation + Escape.
	 * @param {KeyboardEvent} event
	 */
	#onKeydown(event) {
		const items = this.#getActiveItems();
		if (!items.length) return;

		const current = items.indexOf(document.activeElement);

		switch (event.key) {

			case 'ArrowDown': {
				event.preventDefault();
				const next = current < items.length - 1 ? current + 1 : 0;
				items[next].focus();
				break;
			}

			case 'ArrowUp': {
				event.preventDefault();
				const prev = current > 0 ? current - 1 : items.length - 1;
				items[prev].focus();
				break;
			}

			case 'ArrowRight':
			case 'Enter': {
				if (current === -1) break;
				const trigger = items[current];
				if (trigger.hasAttribute('data-drill-trigger')) {
					event.preventDefault();
					const item = trigger.closest('.drill-item');
					const childPanel = item?.querySelector(':scope > .drill-panel');
					if (childPanel) this.drillTo(childPanel, trigger);
				}
				break;
			}

			case 'ArrowLeft':
			case 'Escape': {
				if (this.#stack.length > 1) {
					event.preventDefault();
					this.back();
				}
				break;
			}

			case 'Home': {
				event.preventDefault();
				items[0]?.focus();
				break;
			}

			case 'End': {
				event.preventDefault();
				items[items.length - 1]?.focus();
				break;
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PUBLIC API
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @method drillTo
	 * @description Drills into a child panel.
	 *
	 * @param {HTMLElement} panel		- The .drill-panel element to navigate into.
	 * @param {HTMLElement} [triggerEl]	- The trigger link that was activated (for focus restore).
	 * @returns {Drilldown} this — chainable
	 */
	drillTo(panel, triggerEl = null) {

		const current = this.#stack[this.#stack.length - 1];

		// Fire beforeopen — cancelable
		const allowed = this.dispatchEvent('drilldown:beforeopen', {
			panel,
			depth: this.#stack.length,
			title: panel.dataset.drillTitle,
		}, true);

		if (allowed === false) return this;

		// Update ARIA on the trigger
		if (triggerEl) {
			triggerEl.setAttribute('aria-expanded', 'true');
		}

		// Push new state onto stack
		this.#stack.push({
			panel,
			title:		panel.dataset.drillTitle || '',
			desc:		panel.dataset.drillDesc  || '',
			triggerEl,
		});

		// Transition panels
		this.#transition(panel, current.panel, 'forward');

		// Update header
		const top = this.#stack[this.#stack.length - 1];
		this.#updateHeader(top.title, top.desc, true);

		// Focus first item in new panel
		this.#focusFirst(panel);

		// Dispatch event
		this.dispatchEvent('drilldown:open', {
			panel,
			depth: this.#stack.length - 1,
			title: top.title,
		}, true);

		return this;
	}

	/**
	 * @method back
	 * @description Goes back one level in the navigation stack.
	 *
	 * @returns {Drilldown} this — chainable
	 */
	back() {
		if (this.#stack.length <= 1) return this; // Already at root

		// Fire beforeback — cancelable
		const allowed = this.dispatchEvent('drilldown:beforeback', {
			depth: this.#stack.length - 1,
		}, true);

		if (allowed === false) return this;

		// Pop current panel
		const exiting = this.#stack.pop();

		// Restore aria-expanded on the trigger that opened this panel
		if (exiting.triggerEl) {
			exiting.triggerEl.setAttribute('aria-expanded', 'false');
		}

		// Transition back
		const returning = this.#stack[this.#stack.length - 1];
		this.#transition(returning.panel, exiting.panel, 'backward');

		// Update header — back button hidden when we reach root
		this.#updateHeader(
			returning.title,
			returning.desc,
			this.#stack.length > 1
		);

		// Restore focus to the trigger that opened the exited panel
		requestAnimationFrame(() => {
			exiting.triggerEl?.focus();
		});

		// Dispatch event
		this.dispatchEvent('drilldown:back', {
			panel:	returning.panel,
			depth:	this.#stack.length - 1,
			title:	returning.title,
		}, true);

		return this;
	}

	/**
	 * @method reset
	 * @description Returns to the root panel, clearing the entire navigation stack.
	 *
	 * @returns {Drilldown} this — chainable
	 */
	reset() {
		if (this.#stack.length <= 1) return this;

		// Reset all aria-expanded triggers
		this.element.querySelectorAll('[data-drill-trigger][aria-expanded="true"]')
			.forEach(t => t.setAttribute('aria-expanded', 'false'));

		// Get root from bottom of stack
		const root = this.#stack[0];

		// Deactivate all non-root panels immediately (no transition for reset)
		this.element.querySelectorAll('.drill-panel.is-active').forEach(p => {
			if (p !== root.panel) p.classList.remove('is-active', 'is-exiting');
		});

		// Restore root
		root.panel.classList.add('is-active');
		this.#stack = [root];

		// Update header
		this.#updateHeader(root.title, root.desc, false);

		// Focus first item in root
		this.#focusFirst(root.panel);

		this.dispatchEvent('drilldown:reset', {}, true);

		return this;
	}

	/**
	 * @method getDepth
	 * @description Returns the current navigation depth. 0 = root.
	 *
	 * @returns {number}
	 */
	getDepth() {
		return this.#stack.length - 1;
	}

	/**
	 * @method getActivePanel
	 * @description Returns the currently visible panel element.
	 *
	 * @returns {HTMLElement|null}
	 */
	getActivePanel() {
		return this.#stack[this.#stack.length - 1]?.panel ?? null;
	}

	/**
	 * @method destroy
	 * @description Resets state and delegates cleanup to Component.
	 */
	destroy() {
		this.reset();
		// Component handles: tracked on() listeners, Deck deregistration
		super.destroy();
	}
}

export default Drilldown;