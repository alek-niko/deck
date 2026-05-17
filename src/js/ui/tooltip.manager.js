/**
 * =============================================================================
 * TOOLTIP MANAGER
 * @module js.ui.tooltip.manager
 * -----------------------------------------------------------------------------
 * Singleton-pattern tooltip system using native CSS Anchor Positioning and the
 * Popover API. One tooltip element handles every trigger on the page — no per-
 * element initialization, works with dynamic DOM out of the box.
 *
 * HTML API:
 *	data-tooltip="Text"			- tooltip content (required)
 *	data-tooltip-pos="top"		- position: top | bottom | left | right (default: top)
 *	data-tooltip-delay="300"	- override show delay in ms
 *
 * Title attribute fallback:
 *	Elements with a [title] attribute are also intercepted. The title value is
 *	used as tooltip content and the attribute is removed to prevent the browser's
 *	native tooltip from appearing alongside ours.
 *
 * Programmatic API (via deck.ui.tooltip):
 *	tooltip.show(element)		- show tooltip for a specific element
 *	tooltip.hide()				- hide the current tooltip
 *	tooltip.setDelay(ms)		- update the global show delay
 * =============================================================================
 */

/**
 * @class TooltipManager
 * @description System-level tooltip controller. One instance, one DOM element,
 *				delegated pointer events for zero per-trigger cost.
 */
class TooltipManager {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** The single reusable tooltip <div> element. */
	#el = null;

	/** The element currently showing a tooltip. */
	#activeTarget = null;

	/** Pending show timer ID. */
	#timerId = null;

	/** CSS anchor name — shared between the target and the tooltip element. */
	static #ANCHOR = '--tt-anchor';

	// =========================================================================
	// CONSTRUCTOR
	// =========================================================================

	/**
	 * @param {Object} ui						- Shared UI/system reference.
	 * @param {Object} [options={}]
	 * @param {number} [options.delay=200]		- Hover delay before showing (ms).
	 * @param {string} [options.position='top']	- Default position.
	 */
	constructor(ui, options = {}) {
		this.ui = ui;

		this.delay		= options.delay		?? 200;
		this.position	= options.position	?? 'top';

		this.#build();
		this.#initEvents();
	}

	// =========================================================================
	// PRIVATE — SETUP
	// =========================================================================

	/**
	 * Creates the single tooltip element and appends it to the body.
	 * Called once — the element is reused for every subsequent tooltip.
	 */
	#build() {
		this.#el = document.createElement('div');
		this.#el.className = 'tooltip';
		this.#el.setAttribute('popover',	'manual');
		this.#el.setAttribute('role',		'tooltip');
		this.#el.setAttribute('id',			`tooltip-${Math.random().toString(36).slice(2, 9)}`);

		// Link to the active anchor via CSS custom property
		this.#el.style.setProperty('position-anchor', TooltipManager.#ANCHOR);

		document.body.appendChild(this.#el);
	}

	/**
	 * Attaches delegated pointer event listeners to the document.
	 * One set of listeners handles every tooltip trigger on the page.
	 */
	#initEvents() {

		// ── Show on pointer enter ─────────────────────────────────────────────
		document.addEventListener('pointerover', event => {
			const target = this.#resolveTarget(event.target);
			if (!target || target === this.#activeTarget) return;
			this.#scheduleShow(target);
		});

		// ── Hide on pointer leave ─────────────────────────────────────────────
		document.addEventListener('pointerout', event => {
			const from = event.target.closest('[data-tooltip], [data-tt-title]');
			if (!from || from !== this.#activeTarget) return;

			// Don't hide if moving into the tooltip itself (safe bridge region)
			const to = event.relatedTarget;
			if (to && (this.#el.contains(to) || from.contains(to))) return;

			this.hide();
		});

		// ── Touch: hide on touchstart outside ────────────────────────────────
		// On touch devices pointerout is unreliable — we hide on any touch
		// that isn't on the active target.
		document.addEventListener('touchstart', event => {
			if (!this.#activeTarget) return;
			if (!this.#activeTarget.contains(event.target)) {
				this.hide();
			}
		}, { passive: true });

		// ── Hide on Escape ────────────────────────────────────────────────────
		document.addEventListener('keydown', event => {
			if (event.key === 'Escape') this.hide();
		});

		// ── Hide on page hide (tab switch, window minimize) ───────────────────
		// 'visibilitychange' is more reliable than 'blur' — doesn't fire when
		// focus moves between elements within the same page.
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) this.hide();
		});
	}

	// =========================================================================
	// PRIVATE — TARGET RESOLUTION
	// =========================================================================

	/**
	 * Finds the nearest tooltip trigger from an event target.
	 * Supports [data-tooltip] and [title] attributes.
	 * Converts [title] to [data-tt-title] to prevent the browser's native tooltip.
	 *
	 * @param {EventTarget} eventTarget
	 * @returns {HTMLElement|null}
	 */
	#resolveTarget(eventTarget) {
		const el = eventTarget instanceof Element ? eventTarget : null;
		if (!el) return null;

		// Check for explicit tooltip trigger
		const trigger = el.closest('[data-tooltip]');
		if (trigger) return trigger;

		// Intercept [title] — lift to data-tt-title to suppress native tooltip
		const titled = el.closest('[title]');
		if (titled) {
			titled.dataset.ttTitle = titled.getAttribute('title');
			titled.setAttribute('data-tooltip', titled.dataset.ttTitle);
			titled.removeAttribute('title');
			return titled;
		}

		return null;
	}

	/**
	 * Reads tooltip content from the active target.
	 * @param {HTMLElement} target
	 * @returns {string}
	 */
	#getContent(target) {
		return (
			target.getAttribute('data-tooltip') ||
			target.dataset.ttTitle				||
			''
		).trim();
	}

	/**
	 * Reads the desired position from the target, falling back to the global default.
	 * @param {HTMLElement} target
	 * @returns {string}
	 */
	#getPosition(target) {
		return target.dataset.tooltipPos || this.position;
	}

	/**
	 * Reads the per-trigger delay override, falling back to the global default.
	 * @param {HTMLElement} target
	 * @returns {number}
	 */
	#getDelay(target) {
		const override = target.dataset.tooltipDelay;
		return override !== undefined ? Number(override) : this.delay;
	}

	// =========================================================================
	// PRIVATE — SHOW / HIDE
	// =========================================================================

	/**
	 * Schedules a tooltip show after the configured delay.
	 * Clears any pending timer first to prevent multiple shows.
	 * @param {HTMLElement} target
	 */
	#scheduleShow(target) {
		this.#clearTimer();
		const delay = this.#getDelay(target);

		if (delay <= 0) {
			this.show(target);
		} else {
			this.#timerId = setTimeout(() => this.show(target), delay);
		}
	}

	/**
	 * Applies the anchor name to a target element.
	 * @param {HTMLElement} target
	 */
	#anchorTarget(target) {
		target.style.setProperty('anchor-name', TooltipManager.#ANCHOR);
	}

	/**
	 * Removes the anchor name from a target element.
	 * The small delay allows the CSS exit transition to complete before
	 * the anchor reference is broken — prevents a position jump on hide.
	 * @param {HTMLElement} target
	 */
	#unanchorTarget(target) {
		// Delay must match --tt-duration in CSS
		setTimeout(() => {
			if (target !== this.#activeTarget) {
				target.style.removeProperty('anchor-name');
			}
		}, 200);
	}

	/**
	 * Clears any pending show timer.
	 */
	#clearTimer() {
		if (this.#timerId !== null) {
			clearTimeout(this.#timerId);
			this.#timerId = null;
		}
	}

	// =========================================================================
	// PUBLIC API
	// =========================================================================

	/**
	 * @method show
	 * @description Shows the tooltip for a given element.
	 * Safe to call directly for programmatic control (e.g. onboarding flows).
	 *
	 * @param {HTMLElement} target - Element with [data-tooltip] or [title].
	 */
	show(target) {
		this.#clearTimer();

		const content = this.#getContent(target);
		if (!content) return;

		// Clean up previous target if switching
		if (this.#activeTarget && this.#activeTarget !== target) {
			this.#unanchorTarget(this.#activeTarget);
			this.#activeTarget.removeAttribute('aria-describedby');
		}

		this.#activeTarget = target;

		// Content — always textContent for XSS safety
		this.#el.textContent = content;

		// Position
		const pos = this.#getPosition(target);
		this.#el.setAttribute('data-position', pos);

		// ARIA: link tooltip to trigger for screen readers
		target.setAttribute('aria-describedby', this.#el.id);

		// Anchor the tooltip to this element
		this.#anchorTarget(target);

		// Show via Popover API — promotes to top layer
		if (!this.#el.matches(':popover-open')) {
			this.#el.showPopover();
		}
	}

	/**
	 * @method hide
	 * @description Hides the current tooltip.
	 * Safe to call even when no tooltip is showing.
	 */
	hide() {
		this.#clearTimer();

		if (!this.#activeTarget) return;

		// Dismiss via Popover API
		if (this.#el.matches(':popover-open')) {
			this.#el.hidePopover();
		}

		// Clean up target
		const prev = this.#activeTarget;
		this.#activeTarget = null;

		prev.removeAttribute('aria-describedby');
		this.#unanchorTarget(prev);
	}

	/**
	 * @method setDelay
	 * @description Updates the global show delay at runtime.
	 * @param {number} ms
	 */
	setDelay(ms) {
		this.delay = Math.max(0, ms);
	}

	/**
	 * @method destroy
	 * @description Hides any active tooltip, removes the element, and clears listeners.
	 * Note: delegated document listeners are not removed here because they are
	 * anonymous closures. If you need full teardown, instantiate a new manager.
	 */
	destroy() {
		this.hide();
		this.#el?.remove();
		this.#el = null;
	}
}

export default TooltipManager;