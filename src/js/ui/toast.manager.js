/**
 * =============================================================================
 * TOAST MANAGER
 * @module js.ui.toast.manager
 * -----------------------------------------------------------------------------
 * Popover API-based toast notification system. Toasts are promoted to the
 * browser's top layer via showPopover() — no z-index wars, no stacking context
 * issues, works over modals and dialogs automatically.
 *
 * Usage:
 *	deck.ui.toast.show('Saved successfully', 'success');
 *	deck.ui.toast.show('Connection lost', { type: 'danger', timeout: 0 });
 *	deck.ui.toast.show({
 *		message:	'Item deleted',
 *		type:		'warning',
 *		action:		{ label: 'Undo', callback: () => restoreItem() }
 *	});
 *
 * Shorthand aliases (all identical to show()):
 *	deck.ui.toast.success(message, options?)
 *	deck.ui.toast.error(message, options?)
 *	deck.ui.toast.warning(message, options?)
 *	deck.ui.toast.info(message, options?)
 *
 * Also available on deck directly:
 *	deck.notify(message, type?)
 *	deck.toast(message, type?)
 *	deck.say(message, type?)
 *
 * Positions:
 *	top-right (default)	| top-left | top-center
 *	bottom-right		| bottom-left | bottom-center
 *
 * Types:
 *	primary | success | warning | danger
 *	Aliases: info → primary, error → danger
 * =============================================================================
 */

/**
 * @class ToastManager
 * @description System-level toast notification manager. Handles queuing, stacking,
 *				deduplication, max-visible limits, and full lifecycle for every toast.
 */
class ToastManager {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** All currently visible toast elements, keyed by position string. */
	#active = new Map(); // position -> Set<HTMLElement>

	/** Type alias map — normalizes user-friendly names to CSS variant names. */
	static #TYPE_MAP = {
		error:		'danger',
		info:		'primary',
		warn:		'warning',
		success:	'success',
		warning:	'warning',
		danger:		'danger',
		primary:	'primary',
	};

	// =========================================================================
	// CONSTRUCTOR
	// =========================================================================

	/**
	 * @param {Object} ui								- Shared UI/system reference.
	 * @param {Object} [options]
	 * @param {string} [options.type='primary']			- Default toast type.
	 * @param {number} [options.timeout=4000]			- Default auto-dismiss ms. 0 = persistent.
	 * @param {string} [options.position='top-right']	- Default screen position.
	 * @param {number} [options.max=5]					- Max visible toasts per position.
	 * @param {boolean}[options.dedupe=true]			- Suppress identical consecutive messages.
	 */
	constructor(ui, options = {}) {
		this.ui = ui;

		this.defaults = {
			type:		options.type		?? 'primary',
			timeout:	options.timeout		?? 4000,
			position:	options.position	?? 'top-right',
			max:		options.max			?? 5,
			dedupe:		options.dedupe		?? true,
		};
	}

	// =========================================================================
	// PUBLIC API
	// =========================================================================

	/**
	 * @method show
	 * @description Display a toast notification.
	 *
	 * Accepts multiple call signatures:
	 *	show('Message')
	 *	show('Message', 'success')
	 *	show('Message', { type: 'danger', timeout: 0 })
	 *	show({ message: 'Message', type: 'success', action: { label: 'Undo', callback: fn } })
	 *
	 * @param {string|Object} messageOrOptions
	 * @param {string|Object} [typeOrOptions]
	 * @returns {HTMLElement|null} The toast element, or null if suppressed.
	 */
	show(messageOrOptions, typeOrOptions = {}) {
		const opts = this.#parseArgs(messageOrOptions, typeOrOptions);
		return this.#create(opts);
	}

	/**
	 * @method dismiss
	 * @description Programmatically dismiss a specific toast element.
	 * @param {HTMLElement} toast
	 */
	dismiss(toast) {
		this.#dismiss(toast);
	}

	/**
	 * @method dismissAll
	 * @description Dismiss all currently visible toasts.
	 * @param {string} [position] - If provided, only dismiss toasts at this position.
	 */
	dismissAll(position) {
		this.#active.forEach((set, pos) => {
			if (!position || pos === position) {
				set.forEach(toast => this.#dismiss(toast));
			}
		});
	}

	// ── Shorthand type methods ────────────────────────────────────────────────

	/** @param {string|Object} msg @param {Object} [opts] @returns {HTMLElement|null} */
	success(msg, opts = {}) { return this.show(msg, { ...this.#asOpts(opts), type: 'success' }); }

	/** @param {string|Object} msg @param {Object} [opts] @returns {HTMLElement|null} */
	error(msg, opts = {})   { return this.show(msg, { ...this.#asOpts(opts), type: 'danger'  }); }

	/** @param {string|Object} msg @param {Object} [opts] @returns {HTMLElement|null} */
	warning(msg, opts = {}) { return this.show(msg, { ...this.#asOpts(opts), type: 'warning' }); }

	/** @param {string|Object} msg @param {Object} [opts] @returns {HTMLElement|null} */
	info(msg, opts = {})    { return this.show(msg, { ...this.#asOpts(opts), type: 'primary' }); }

	// =========================================================================
	// PRIVATE — ARGUMENT PARSING
	// =========================================================================

	/**
	 * Normalizes all call signatures into a single options object.
	 */
	#parseArgs(messageOrOptions, typeOrOptions) {
		let opts = {};

		if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
			opts = { ...messageOrOptions };

		} else {
			opts.message = messageOrOptions;
			if (typeof typeOrOptions === 'string') {
				opts.type = typeOrOptions;

			} else if (typeof typeOrOptions === 'object') {
				Object.assign(opts, typeOrOptions);
			}
		}

		return {
			message:	opts.message	?? '',
			type:		this.#resolveType(opts.type),
			timeout:	opts.timeout	?? this.defaults.timeout,
			position:	opts.position	?? this.defaults.position,
			action:		opts.action		?? null,   // { label, callback }
			html:		opts.html		?? false,  // Allow HTML in message (use with care)
		};
	}

	/** Normalizes a string shorthand option into an object. */
	#asOpts(opts) {
		return typeof opts === 'string' ? { type: opts } : opts;
	}

	/** Maps type aliases to canonical CSS variant names. */
	#resolveType(type) {
		return ToastManager.#TYPE_MAP[type] ?? this.defaults.type;
	}

	// =========================================================================
	// PRIVATE — CREATION
	// =========================================================================

	/**
	 * Creates, configures, and shows a toast element.
	 * @param {Object} opts
	 * @returns {HTMLElement|null}
	 */
	#create(opts) {
		const { message, type, timeout, position, action, html } = opts;

		if (!message) return null;

		// ── Deduplication ─────────────────────────────────────────────────────
		// Suppress if the last toast at this position has the same message and type
		if (this.defaults.dedupe) {
			const existing = this.#getActiveSet(position);
			const last = [...existing].at(-1);
			if (last?.dataset.message === message && last?.dataset.type === type) {
				// Visually bump the duplicate instead of creating a new one
				this.#bump(last);
				return last;
			}
		}

		// ── Max visible limit ─────────────────────────────────────────────────
		// Dismiss the oldest toast at this position before adding a new one
		const activeSet = this.#getActiveSet(position);
		if (activeSet.size >= this.defaults.max) {
			const oldest = activeSet.values().next().value;
			this.#dismiss(oldest, true); // true = immediate, no animation
		}

		// ── Build element ─────────────────────────────────────────────────────
		const toast = document.createElement('div');
		toast.setAttribute('popover', 'manual');
		toast.setAttribute('role',     type === 'danger' ? 'alert'  : 'status');
		toast.setAttribute('aria-live', type === 'danger' ? 'assertive' : 'polite');
		toast.setAttribute('aria-atomic', 'true');
		toast.dataset.message  = message;
		toast.dataset.type     = type;
		toast.dataset.position = position;

		toast.classList.add('toast', `toast-${type}`, `toast-${position}`);

		// ── Inner: accent bar (CSS ::before handles this) ─────────────────────

		// ── Inner: message ────────────────────────────────────────────────────
		const msgEl = document.createElement('div');
		msgEl.className = 'toast-message';
		if (html) {
			msgEl.innerHTML = message; // Caller is responsible for sanitization
		} else {
			msgEl.textContent = message;
		}
		toast.appendChild(msgEl);

		// ── Inner: action button ──────────────────────────────────────────────
		if (action?.label && typeof action.callback === 'function') {
			const actionBtn = document.createElement('button');
			actionBtn.className  = 'toast-action';
			actionBtn.textContent = action.label;
			actionBtn.addEventListener('click', () => {
				action.callback();
				this.#dismiss(toast);
			}, { once: true });
			toast.appendChild(actionBtn);
		}

		// ── Inner: close button ───────────────────────────────────────────────
		const closeBtn = document.createElement('button');
		closeBtn.className = 'toast-close';
		closeBtn.setAttribute('aria-label', 'Dismiss notification');
		closeBtn.innerHTML = `
			<svg viewBox="0 0 24 24" width="16" height="16" fill="none"
				stroke="currentColor" stroke-width="2" aria-hidden="true">
				<path d="M18 6 6 18M6 6l12 12"/>
			</svg>`;
		closeBtn.addEventListener('click', () => this.#dismiss(toast), { once: true });
		toast.appendChild(closeBtn);

		// ── Mount ─────────────────────────────────────────────────────────────
		document.body.appendChild(toast);
		toast.showPopover(); // Promote to top layer

		// ── Register in active set ────────────────────────────────────────────
		activeSet.add(toast);

		// ── Restack ───────────────────────────────────────────────────────────
		this.#stack(position);

		// ── Auto-dismiss timer ────────────────────────────────────────────────
		if (timeout > 0) {
			this.#startTimer(toast, timeout, position);
		}

		return toast;
	}

	// =========================================================================
	// PRIVATE — TIMER
	// =========================================================================

	/**
	 * Starts an auto-dismiss timer. Pauses on mouseenter, resumes on mouseleave.
	 * Uses a proper start/elapsed model so hover-pause doesn't reset the timer.
	 */
	#startTimer(toast, duration, position) {
		let remaining = duration;
		let startTime;
		let timerId;

		const start = () => {
			startTime = Date.now();
			timerId = setTimeout(() => this.#dismiss(toast), remaining);
			toast._timerId = timerId;
		};

		const pause = () => {
			clearTimeout(timerId);
			remaining -= Date.now() - startTime;
		};

		toast.addEventListener('mouseenter', pause);
		toast.addEventListener('mouseleave', start);

		start();
	}

	// =========================================================================
	// PRIVATE — DISMISS
	// =========================================================================

	/**
	 * Dismisses a toast, optionally immediately (no animation).
	 * @param {HTMLElement} toast
	 * @param {boolean} [immediate=false]
	 */
	#dismiss(toast, immediate = false) {
		if (!toast || !toast.isConnected) return;

		const position = toast.dataset.position;

		// Clear any pending auto-dismiss timer
		if (toast._timerId) {
			clearTimeout(toast._timerId);
			delete toast._timerId;
		}

		// Remove from active tracking immediately so stacking is correct
		this.#getActiveSet(position).delete(toast);

		if (immediate) {
			this.#remove(toast, position);
			return;
		}

		// Trigger CSS exit animation via class
		toast.classList.add('toast-hide');

		// Guard: if transition doesn't fire (prefers-reduced-motion, hidden element, etc.)
		// a fallback timeout ensures the toast is always removed.
		const fallback = setTimeout(() => this.#remove(toast, position), 600);

		toast.addEventListener('transitionend', () => {
			clearTimeout(fallback);
			this.#remove(toast, position);
		}, { once: true });
	}

	/**
	 * Removes a toast from the DOM and hides it from the top layer.
	 * @param {HTMLElement} toast
	 * @param {string} position
	 */
	#remove(toast, position) {
		if (!toast.isConnected) return;
		try { toast.hidePopover(); } catch (_) { /* already hidden */ }
		toast.remove();
		this.#stack(position);
	}

	// =========================================================================
	// PRIVATE — STACKING
	// =========================================================================

	/**
	 * Recalculates vertical positions for all visible toasts at a given position.
	 * Uses CSS custom property --toast-offset to avoid layout reflow per toast.
	 *
	 * Setting a CSS property is batched by the browser — far cheaper than
	 * reading offsetHeight inside the loop (which forces synchronous reflow).
	 */
	#stack(position) {
		const toasts = [...this.#getActiveSet(position)].filter(t => t.isConnected);
		const isTop  = position.startsWith('top');

		// Read all heights in one pass (batched read)
		const heights = toasts.map(t => t.getBoundingClientRect().height);

		// Write all offsets in one pass (batched write)
		let offset = 24;
		toasts.forEach((toast, i) => {
			toast.style.setProperty('--toast-offset', `${offset}px`);
			offset += heights[i] + 12;
		});

		// Tell CSS which axis to use
		toasts.forEach(toast => {
			toast.style[isTop ? 'bottom' : 'top'] = '';
			toast.style[isTop ? 'top'    : 'bottom'] = 'var(--toast-offset)';
		});
	}

	// =========================================================================
	// PRIVATE — HELPERS
	// =========================================================================

	/**
	 * Returns (or creates) the active Set for a given position.
	 * @param {string} position
	 * @returns {Set<HTMLElement>}
	 */
	#getActiveSet(position) {
		if (!this.#active.has(position)) {
			this.#active.set(position, new Set());
		}
		return this.#active.get(position);
	}

	/**
	 * Visually "bumps" a toast when a duplicate is suppressed.
	 * Draws the user's attention without creating noise.
	 * @param {HTMLElement} toast
	 */
	#bump(toast) {
		toast.classList.remove('toast-bump');
		// Force reflow so the animation restarts if called rapidly
		void toast.offsetWidth;
		toast.classList.add('toast-bump');
	}
}

export default ToastManager;