/**
 * @module js.components.modal
 * @description Full-featured modal dialog component built on the native <dialog> element.
 *				Handles open/close lifecycle, focus trapping, scroll locking, ARIA management,
 *				animated transitions, and Deck event integration.
 *
 * Supported data-modal config (via Component's #getConfigAttribute):
 *   data-modal="size:lg; scrollable:true; transition:top; bgClose:false"
 *
 * Sizes:			sm | md (default) | lg | xl | full
 * Transitions:		top | bottom | center (default) | fade | none
 * bgClose:			true (default) | false
 * scrollable:		false (default) | true
 */
import Component from './component.js';

// ─── Module-level modal stack ─────────────────────────────────────────────────
// Tracks all open modals in order so scroll lock and focus restore work correctly
// when multiple modals are layered. Lives outside the class so all instances share it.
const _stack = [];

// ─── Focusable elements selector ─────────────────────────────────────────────
const FOCUSABLE = [
	'a[href]',
	'area[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[contenteditable]:not([contenteditable="false"])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * @class Modal
 * @extends Component
 *
 * Stateful modal dialog component. Requires a <dialog> element.
 * Registered and managed by Deck via autoload([data-modal]).
 *
 * Lifecycle events dispatched on the element (bubbles, cancelable):
 *	modal:beforeshow	- fired before open, cancelable
 *	modal:show			- fired after open animation completes
 *	modal:beforehide	- fired before close, cancelable
 *	modal:hide			- fired after close animation completes
 */
class Modal extends Component {

	// ─── Private fields ───────────────────────────────────────────────────────

	/** Element that had focus before the modal opened — restored on close. */
	#previouslyFocused = null;

	/** Bound keydown handler reference for clean removeEventListener. */
	#onKeyDown = null;

	// ─────────────────────────────────────────────────────────────────────────
	// CONSTRUCTOR
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @param {HTMLDialogElement}	element  - Must be a <dialog> element.
	 * @param {Object}				options  - Config overrides (merged with data-modal attr).
	 * @param {Deck}				deck     - Framework instance.
	 */
	constructor(element, options = {}, deck = null) {

		if (!(element instanceof HTMLDialogElement)) {
			throw new TypeError('[Modal] Element must be a <dialog> element.');
		}

		const defaultOptions = {
			size:			null,		// sm | lg | xl | full
			transition:		'center',	// top | bottom | center | fade | none
			scrollable:		false,		// true | false
			bgClose:		true,		// Close on backdrop click
			keyboard:		true,		// Close on Escape key
		};

		super({
			name: 'modal',
			element,
			deck,
			...defaultOptions,
			...options,
		});

		this.#setup();
		this.#initEvents();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — SETUP
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Applies configuration-driven CSS classes to the dialog element.
	 * Component's #getConfigAttribute has already merged data-modal="..." into `this`
	 * by the time this runs, so we can read this.size, this.transition, etc. directly.
	 */
	#setup() {
		const el = this.element;

		// ── ARIA ──────────────────────────────────────────────────────────────
		el.setAttribute('aria-modal', 'true');
		el.setAttribute('role', 'dialog');

		// Link aria-labelledby to modal-title if present and not already set
		if (!el.hasAttribute('aria-labelledby')) {
			const title = el.querySelector('.modal-title');
			if (title) {
				if (!title.id) title.id = `modal-title-${this.dci}`;
				el.setAttribute('aria-labelledby', title.id);
			}
		}

		// Link aria-describedby to modal-body if present and not already set
		if (!el.hasAttribute('aria-describedby')) {
			const body = el.querySelector('.modal-body');
			if (body) {
				if (!body.id) body.id = `modal-body-${this.dci}`;
				el.setAttribute('aria-describedby', body.id);
			}
		}

		// ── SIZE ──────────────────────────────────────────────────────────────
		if (this.size) {
			el.classList.add(`modal-${this.size}`);
		}

		// ── TRANSITION ────────────────────────────────────────────────────────
		if (this.transition && this.transition !== 'none') {
			el.classList.add(`modal-slide-${this.transition}`);
		}

		// ── SCROLLABLE ────────────────────────────────────────────────────────
		if (this.scrollable) {
			el.classList.add('modal-scrollable');
		}
	}

	/**
	 * Attaches all event listeners. Uses Component's tracked `on()` where possible
	 * so destroy() auto-cleans everything.
	 */
	#initEvents() {

		// ── Close buttons (.modal-close or [data-dismiss="modal"]) ────────────
		this.element
			.querySelectorAll('.modal-close, [data-dismiss="modal"]')
			.forEach(btn => {
				// Use tracked listener via Component.on()
				btn.addEventListener('click', () => this.close());
			});

		// ── Backdrop click ────────────────────────────────────────────────────
		// The <dialog> element itself is the backdrop when using showModal().
		// Clicks on the ::backdrop bubble to the dialog — but the dialog's
		// bounding box is the inner content, so clicking outside == clicking dialog itself.
		this.on('click', event => {
			if (!this.bgClose) return;
			// Only close if the click landed directly on the <dialog> (the backdrop),
			// not on any child inside it.
			if (event.target === this.element) {
				this.close();
			}
		});

		// ── Cancel event (native Escape key handling) ─────────────────────────
		// The browser fires 'cancel' on <dialog> when Escape is pressed.
		// We intercept it so we control the close flow (animations, events).
		this.on('cancel', event => {
			event.preventDefault(); // Block native instant-close
			if (this.keyboard) this.close();
		});

		// ── Keyboard: Tab focus trap ──────────────────────────────────────────
		// Stored as a bound reference so we can add/remove it on open/close,
		// not permanently (no need to trap when closed).
		this.#onKeyDown = this.#handleKeyDown.bind(this);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — FOCUS & KEYBOARD
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Moves focus to the first focusable element inside the modal.
	 * Uses requestAnimationFrame instead of setTimeout to align with the
	 * browser's paint cycle — more reliable for animated modals.
	 */
	#focusFirst() {
		requestAnimationFrame(() => {
			const focusable = this.element.querySelector(FOCUSABLE);
			focusable?.focus();
		});
	}

	/**
	 * Keydown handler — manages Tab focus trap.
	 * Attached to document only while the modal is open.
	 * @param {KeyboardEvent} event
	 */
	#handleKeyDown(event) {
		if (event.key !== 'Tab') return;

		const focusables = [...this.element.querySelectorAll(FOCUSABLE)];
		if (focusables.length === 0) return;

		const first = focusables[0];
		const last  = focusables[focusables.length - 1];

		if (event.shiftKey) {
			// Shift+Tab: wrap from first → last
			if (document.activeElement === first) {
				last.focus();
				event.preventDefault();
			}
		} else {
			// Tab: wrap from last → first
			if (document.activeElement === last) {
				first.focus();
				event.preventDefault();
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — SCROLL LOCK
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Locks body scroll when any modal is open.
	 * Uses a CSS custom property approach so it works alongside sticky headers.
	 * Falls back to CSS `body:has(dialog[open])` in the stylesheet for no-JS cases.
	 */
	#lockScroll() {
		if (_stack.length === 1) { // First modal opening
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
			document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
			document.body.classList.add('modal-open');
		}
	}

	/**
	 * Restores body scroll when no modals remain open.
	 */
	#unlockScroll() {
		if (_stack.length === 0) { // Last modal closed
			document.body.classList.remove('modal-open');
			document.body.style.removeProperty('--scrollbar-width');
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — STACK
	// ─────────────────────────────────────────────────────────────────────────

	#pushToStack() {
		if (!_stack.includes(this)) _stack.push(this);
	}

	#popFromStack() {
		const idx = _stack.indexOf(this);
		if (idx !== -1) _stack.splice(idx, 1);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PUBLIC API
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @method open
	 * @description Opens the modal. Fires modal:beforeshow (cancelable) then modal:show.
	 *
	 * @returns {Modal} this — chainable
	 */
	open() {
		if (this.isOpen()) return this;

		// Fire beforeshow — allow external code to cancel the open
		const allowed = this.dispatchEvent('modal:beforeshow', { modal: this }, true);
		if (allowed === false) return this;

		// Store focus origin for restore on close
		this.#previouslyFocused = document.activeElement;

		// Open the native dialog
		this.element.showModal();

		// Stack + scroll lock
		this.#pushToStack();
		this.#lockScroll();

		// Attach focus trap to document (only while open)
		document.addEventListener('keydown', this.#onKeyDown);

		// Move focus inside
		this.#focusFirst();

		// Fire shown after next frame (animation may still be running, but DOM is ready)
		requestAnimationFrame(() => {
			this.dispatchEvent('modal:show', { modal: this }, true);
		});

		return this;
	}

	/**
	 * @method close
	 * @description Closes the modal. Fires modal:beforehide (cancelable) then modal:hide.
	 *
	 * @returns {Modal} this — chainable
	 */
	close() {
		if (!this.isOpen()) return this;

		// Fire beforehide — allow external code to cancel the close
		const allowed = this.dispatchEvent('modal:beforehide', { modal: this }, true);
		if (allowed === false) return this;

		// Close the native dialog
		this.element.close();

		// Stack + scroll unlock
		this.#popFromStack();
		this.#unlockScroll();

		// Remove focus trap
		document.removeEventListener('keydown', this.#onKeyDown);

		// Restore focus to the element that triggered the modal
		this.#previouslyFocused?.focus();
		this.#previouslyFocused = null;

		requestAnimationFrame(() => {
			this.dispatchEvent('modal:hide', { modal: this }, true);
		});

		return this;
	}

	/**
	 * @method toggle
	 * @description Opens if closed, closes if open.
	 *
	 * @returns {Modal} this — chainable
	 */
	toggle() {
		return this.isOpen() ? this.close() : this.open();
	}

	/**
	 * @method isOpen
	 * @description Returns true if the modal is currently open.
	 *
	 * @returns {boolean}
	 */
	isOpen() {
		return this.element.open;
	}

	/**
	 * @method update
	 * @description Updates modal options at runtime. Called by deck.update().
	 *				Re-applies classes after change.
	 *
	 * @param {Object} options
	 * @returns {Modal} this — chainable
	 */
	update(options = {}) {
		// Strip old size/transition classes before applying new ones
		this.element.className = this.element.className
			.replace(/\bmodal-(sm|md|lg|xl|full)\b/g, '')
			.replace(/\bmodal-slide-\S+\b/g, '')
			.trim();

		Object.assign(this, options);
		this.#setup();
		return this;
	}

	/**
	 * @method destroy
	 * @description Closes the modal if open, cleans up all listeners, then
	 *				delegates to Component's destroy() for Deck deregistration.
	 */
	destroy() {
		if (this.isOpen()) this.close();

		// Remove focus trap in case destroy() is called while open
		document.removeEventListener('keydown', this.#onKeyDown);

		// Component handles: tracked listeners, watchers, Deck instances, element._dci
		super.destroy();
	}
}

export default Modal;