/**
 * @module js.components.offcanvas
 * @description Slide-in drawer panel built on the native <dialog> element.
 *				Handles open/close lifecycle with CSS-driven animations,
 *				focus trapping, scroll locking, ARIA management, push mode,
 *				and Deck event integration.
 *
 * Supported data-offcanvas config (via Component's #getConfigAttribute):
 *	data-offcanvas="placement:right; size:lg; mode:push; bgClose:false; keyboard:true"
 *
 * Placement:	left (default) | right | top | bottom
 * Size:		sm | md (default) | lg | full
 * Mode:		overlay (default) | push | reveal
 * bgClose:		true (default) | false
 * keyboard:	true (default) | false
 */
import Component from './component.js';

// ─── Focusable elements selector (shared convention with Modal) ───────────────
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

// ─── Module-level open offcanvas stack ───────────────────────────────────────
// Tracks all open offcanvas instances so scroll lock and Escape handling
// only affect the topmost one. Same pattern as Modal._stack.
const _stack = [];

/**
 * @class Offcanvas
 * @extends Component
 *
 * Stateful offcanvas drawer component. Requires a <dialog> element.
 * Registered and managed by Deck via autoload([data-offcanvas]).
 *
 * Lifecycle events dispatched on the element (bubbles, cancelable):
 *	offcanvas:beforeshow	- fired before open, cancelable
 *	offcanvas:show			- fired after open animation completes
 *	offcanvas:beforehide	- fired before close, cancelable
 *	offcanvas:hide			- fired after close animation completes
 *
 * Push mode:
 *	Set data-offcanvas-push on the element that should shift when the
 *	offcanvas opens (typically <main> or a layout wrapper). The component
 *	applies a CSS custom property --offcanvas-push-offset to that element
 *	which your CSS can consume via transform.
 */
class Offcanvas extends Component {

	// ─── Private fields ───────────────────────────────────────────────────────

	/** Element that had focus before the offcanvas opened. */
	#previouslyFocused = null;

	/** Bound keydown handler — attached to document only while open. */
	#onKeyDown = null;

	/** The push target element (if mode is 'push'). */
	#pushTarget = null;

	/** rAF ID for close animation sequencing. */
	#closeRafId = null;

	// ─────────────────────────────────────────────────────────────────────────
	// CONSTRUCTOR
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @param {HTMLDialogElement}	element  - Must be a <dialog> element.
	 * @param {Object}				options  - Config overrides.
	 * @param {Deck}				deck     - Framework instance.
	 */
	constructor(element, options = {}, deck = null) {

		if (!(element instanceof HTMLDialogElement)) {
			throw new TypeError('[Offcanvas] Element must be a <dialog> element.');
		}

		const defaultOptions = {
			placement:	'left',			// left | right | top | bottom
			size:		null,			// sm | lg | full
			mode:		'overlay',		// overlay | push | reveal
			bgClose:	true,			// Close on backdrop click
			keyboard:	true,			// Close on Escape key
		};

		super({
			name: 'offcanvas',
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
	 * Applies configuration-driven CSS classes and ARIA attributes.
	 * Component's #getConfigAttribute has already merged data-offcanvas="..."
	 * into `this` before this runs.
	 */
	#setup() {
		const el = this.element;

		// ── ARIA ──────────────────────────────────────────────────────────────
		el.setAttribute('aria-modal', 'true');
		el.setAttribute('role', 'dialog');

		// Link aria-labelledby to offcanvas-title if present
		if (!el.hasAttribute('aria-labelledby')) {
			const title = el.querySelector('.offcanvas-title');
			if (title) {
				if (!title.id) title.id = `offcanvas-title-${this.dci}`;
				el.setAttribute('aria-labelledby', title.id);
			}
		}

		// ── PLACEMENT ─────────────────────────────────────────────────────────
		// Only add if not 'left' (left is the default — no extra class needed)
		if (this.placement && this.placement !== 'left') {
			el.classList.add(`offcanvas-${this.placement}`);
		}

		// ── SIZE ──────────────────────────────────────────────────────────────
		if (this.size) {
			el.classList.add(`offcanvas-${this.size}`);
		}

		// ── MODE ──────────────────────────────────────────────────────────────
		if (this.mode && this.mode !== 'overlay') {
			el.classList.add(`offcanvas-${this.mode}`);
		}

		// ── PUSH TARGET ───────────────────────────────────────────────────────
		// Look for data-offcanvas-push on a sibling/parent to know what to shift
		if (this.mode === 'push') {
			const pushSelector = el.dataset.offcanvasPush || null;
			this.#pushTarget = pushSelector
				? document.querySelector(pushSelector)
				: el.parentElement?.querySelector(':scope > :not(dialog)') ?? null;
		}
	}

	/**
	 * Attaches all event listeners via Component's tracked on() where possible.
	 */
	#initEvents() {

		// ── Internal close buttons ────────────────────────────────────────────
		this.element
			.querySelectorAll('.offcanvas-close, [data-dismiss="offcanvas"]')
			.forEach(btn => btn.addEventListener('click', () => this.close()));

		// ── Backdrop click ────────────────────────────────────────────────────
		// The <dialog> element is the backdrop surface with showModal().
		// A click that lands on the dialog itself (not any child) = backdrop click.
		this.on('click', event => {
			if (!this.bgClose) return;
			if (event.target === this.element) this.close();
		});

		// ── Cancel event (native Escape) ──────────────────────────────────────
		// Browser fires 'cancel' on <dialog> for Escape. We intercept it to
		// control the close flow (animation, events, stack awareness).
		this.on('cancel', event => {
			event.preventDefault(); // Block native instant-close
			if (this.keyboard) this.close();
		});

		// ── Keyboard: Tab focus trap ──────────────────────────────────────────
		// Stored as a bound reference — added/removed on open/close only.
		this.#onKeyDown = this.#handleKeyDown.bind(this);

		// ── External toggle triggers ──────────────────────────────────────────────
		const triggers = document.querySelectorAll(`[data-toggle="#${this.element.id}"]`);
		triggers.forEach(btn => btn.addEventListener('click', () => this.toggle()));
		//console.log('Offcanvas triggers found:', triggers.length, 'for id:', this.element.id);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — FOCUS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Moves focus to the first focusable element inside the offcanvas.
	 */
	#focusFirst() {
		requestAnimationFrame(() => {
			const focusable = this.element.querySelector(FOCUSABLE);
			focusable?.focus();
		});
	}

	/**
	 * Tab focus trap — only active while offcanvas is open.
	 * @param {KeyboardEvent} event
	 */
	#handleKeyDown(event) {
		if (event.key !== 'Tab') return;

		const focusables = [...this.element.querySelectorAll(FOCUSABLE)];
		if (focusables.length === 0) return;

		const first = focusables[0];
		const last  = focusables[focusables.length - 1];

		if (event.shiftKey) {
			if (document.activeElement === first) {
				last.focus();
				event.preventDefault();
			}
		} else {
			if (document.activeElement === last) {
				first.focus();
				event.preventDefault();
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — SCROLL LOCK
	// ─────────────────────────────────────────────────────────────────────────

	#lockScroll() {
		if (_stack.length === 1) {
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
			document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
			document.body.classList.add('offcanvas-open');
		}
	}

	#unlockScroll() {
		if (_stack.length === 0) {
			document.body.classList.remove('offcanvas-open');
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
	// PRIVATE — PUSH MODE
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Applies push offset to the push target element.
	 * CSS consumes --offcanvas-offset via transform: translateX(var(--offcanvas-offset)).
	 */
	#applyPush() {
		if (!this.#pushTarget || this.mode !== 'push') return;

		const width   = this.element.offsetWidth;
		const isRight = this.placement === 'right';
		const offset  = isRight ? `-${width}px` : `${width}px`;

		this.#pushTarget.style.setProperty('--offcanvas-offset', offset);
		this.#pushTarget.classList.add('offcanvas-pushed');
	}

	/**
	 * Removes push offset from the push target element.
	 */
	#removePush() {
		if (!this.#pushTarget || this.mode !== 'push') return;
		this.#pushTarget.style.removeProperty('--offcanvas-offset');
		this.#pushTarget.classList.remove('offcanvas-pushed');
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRIVATE — ANIMATION DURATION
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Reads the actual CSS transition duration from the element.
	 * Used to time the close sequence precisely — no hardcoded magic numbers.
	 *
	 * @returns {number} Duration in milliseconds.
	 */
	#getTransitionDuration() {
		const style    = window.getComputedStyle(this.element);
		const duration = parseFloat(style.transitionDuration) || 0;
		const delay    = parseFloat(style.transitionDelay)    || 0;
		return (duration + delay) * 1000;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PUBLIC API
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * @method open
	 * @description Opens the offcanvas. Fires offcanvas:beforeshow (cancelable),
	 *              then offcanvas:show after the opening frame.
	 *
	 * @returns {Offcanvas} this — chainable
	 */
	open() {
		if (this.isOpen()) return this;

		// Fire beforeshow — allow external code to cancel
		const allowed = this.dispatchEvent('offcanvas:beforeshow', { offcanvas: this }, true);
		if (allowed === false) return this;

		// Store focus origin
		this.#previouslyFocused = document.activeElement;

		// Open native dialog (enables ::backdrop, traps pointer events)
		this.element.showModal();

		// Stack + scroll lock
		this.#pushToStack();
		this.#lockScroll();

		// Push mode: shift page content
		this.#applyPush();

		// Trigger CSS enter animation on next frame.
		// The 'is-open' class drives the transform in CSS.
		// We wait one frame so the browser registers the initial transform state
		// before transitioning to the open position.
		requestAnimationFrame(() => {
			this.element.classList.add('is-open');
		});

		// Attach focus trap
		document.addEventListener('keydown', this.#onKeyDown);

		// Focus first focusable element
		this.#focusFirst();

		// Dispatch shown after animation
		const duration = this.#getTransitionDuration();
		setTimeout(() => {
			this.dispatchEvent('offcanvas:show', { offcanvas: this }, true);
		}, duration);

		return this;
	}

	/**
	 * @method close
	 * @description Closes the offcanvas. Fires offcanvas:beforehide (cancelable),
	 *              waits for CSS animation to complete, then fires offcanvas:hide.
	 *
	 * @returns {Offcanvas} this — chainable
	 */
	close() {
		if (!this.isOpen()) return this;

		// Fire beforehide — allow external code to cancel
		const allowed = this.dispatchEvent('offcanvas:beforehide', { offcanvas: this }, true);
		if (allowed === false) return this;

		// Cancel any pending close rAF
		if (this.#closeRafId) cancelAnimationFrame(this.#closeRafId);

		// Remove the open class — triggers the CSS leave animation
		this.element.classList.remove('is-open');

		// Remove push offset (animates back via CSS transition on the push target)
		this.#removePush();

		// Wait for the CSS transition to finish before closing the native dialog.
		// Using the actual computed duration — no hardcoded numbers.
		const duration = this.#getTransitionDuration();

		this.#closeRafId = setTimeout(() => {
			this.element.close();

			// Stack + scroll unlock
			this.#popFromStack();
			this.#unlockScroll();

			// Remove focus trap
			document.removeEventListener('keydown', this.#onKeyDown);

			// Restore focus
			this.#previouslyFocused?.focus();
			this.#previouslyFocused = null;

			this.dispatchEvent('offcanvas:hide', { offcanvas: this }, true);
			this.#closeRafId = null;
		}, duration);

		return this;
	}

	/**
	 * @method toggle
	 * @description Opens if closed, closes if open.
	 *
	 * @returns {Offcanvas} this — chainable
	 */
	toggle() {
		return this.isOpen() ? this.close() : this.open();
	}

	/**
	 * @method isOpen
	 * @description Returns true if the offcanvas is currently open.
	 *
	 * @returns {boolean}
	 */
	isOpen() {
		return this.element.open;
	}

	/**
	 * @method update
	 * @description Updates offcanvas options at runtime. Called by deck.update().
	 *
	 * @param {Object} options
	 * @returns {Offcanvas} this — chainable
	 */
	update(options = {}) {
		// Strip placement, size, and mode classes before re-applying
		['left', 'right', 'top', 'bottom'].forEach(p => {
			this.element.classList.remove(`offcanvas-${p}`);
		});
		['sm', 'lg', 'full'].forEach(s => {
			this.element.classList.remove(`offcanvas-${s}`);
		});
		['push', 'reveal'].forEach(m => {
			this.element.classList.remove(`offcanvas-${m}`);
		});

		Object.assign(this, options);
		this.#setup();
		return this;
	}

	/**
	 * @method destroy
	 * @description Closes if open, removes all listeners, delegates to Component.destroy().
	 */
	destroy() {
		if (this.isOpen()) this.close();

		if (this.#closeRafId) {
			clearTimeout(this.#closeRafId);
			this.#closeRafId = null;
		}

		document.removeEventListener('keydown', this.#onKeyDown);
		this.#removePush();

		super.destroy();
	}
}

export default Offcanvas;