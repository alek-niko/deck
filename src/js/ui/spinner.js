/**
 * =============================================================================
 * SPINNER
 * @module js.ui.spinner
 * -----------------------------------------------------------------------------
 * Per-element loading spinner manager. Tracks one spinner per target element
 * and prevents stacking. Supports inline, centered, block, and overlay modes.
 *
 * Usage:
 *	deck.ui.spinner.show('#my-form');
 *	deck.ui.spinner.show(buttonEl, { size: 'sm', variant: 'light', mode: 'inline' });
 *	deck.ui.spinner.hide('#my-form');
 *
 * Modes:
 *	center	- centered inside the target (default)
 *	inline	- flows inline with content (icon replacement)
 *	block	- full-width block
 *	overlay	- absolute overlay covering the target, with dimming potential
 *
 * Variants:
 *   primary | secondary | success | danger | warning | info | light | dark | dots
 *
 * Sizes: sm | md (default) | lg
 * =============================================================================
 */

import { resolveEl } from './helpers.js';

class Spinner {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** Map<HTMLElement, HTMLElement> — tracks the spinner/overlay per target. */
	#active = new Map();

	// =========================================================================
	// CONSTRUCTOR
	// =========================================================================

	/**
	 * @param {Object} ui - Shared UI/system reference.
	 */
	constructor(ui) {
		this.ui = ui;
	}

	// =========================================================================
	// PUBLIC API
	// =========================================================================

	/**
	 * @method show
	 * @description Shows a spinner on the target element.
	 *              Prevents stacking — calling show() on an element that already
	 *              has a spinner is a no-op.
	 *
	 * @param {HTMLElement|string}	[target='body']
	 * @param {Object}				[options={}]
	 * @param {'sm'|'md'|'lg'}		[options.size='md']
	 * @param {string}				[options.variant='primary']
	 * @param {'center'|'inline'|'block'|'overlay'} [options.mode='center']
	 * @param {string}				[options.text='Loading...'] - Screen reader text.
	 * @param {boolean}				[options.glow=false]
	 * @param {boolean}				[options.delay=false]       - Delayed appearance.
	 * @returns {HTMLElement|null} The spinner element, or null if target not found.
	 */
	show(target = 'body', options = {}) {
		const el = resolveEl(target);
		if (!el) return null;

		// Already showing — no-op
		if (this.#active.has(el)) return this.#active.get(el);

		const config = {
			size:		'md',
			variant:	'primary',
			mode:		'center',
			text:		'Loading...',
			glow:		false,
			delay:		false,
			...options,
		};

		const spinner = this.#build(config);
		let mounted   = spinner;

		if (config.mode === 'overlay') {
			const overlay = document.createElement('div');
			overlay.className = 'spinner-overlay';
			overlay.setAttribute('data-state', 'visible');
			overlay.appendChild(spinner);

			// Ensure the container can position the absolute overlay
			if (window.getComputedStyle(el).position === 'static') {
				el.style.setProperty('position', 'relative', 'important');
			}

			el.appendChild(overlay);
			mounted = overlay;
		} else {
			el.appendChild(spinner);
		}

		// Signal loading state to CSS (disables pointer events, dims buttons, etc.)
		el.setAttribute('data-loading', 'true');

		this.#active.set(el, mounted);
		return spinner;
	}

	/**
	 * @method hide
	 * @description Removes the spinner from the target element.
	 *
	 * @param {HTMLElement|string} [target='body']
	 */
	hide(target = 'body') {
		const el = resolveEl(target);
		if (!el || !this.#active.has(el)) return;

		this.#active.get(el).remove();
		this.#active.delete(el);
		el.removeAttribute('data-loading');
	}

	/**
	 * @method destroy
	 * @description Removes all active spinners. Called on page teardown or reset.
	 */
	destroy() {
		this.#active.forEach(spinner => spinner.remove());
		this.#active.clear();
	}

	// =========================================================================
	// PRIVATE — BUILD
	// =========================================================================

	/**
	 * Builds the spinner DOM element from config.
	 * Uses data attributes for styling — matches CSS token-based theming.
	 *
	 * @param {Object} cfg
	 * @returns {HTMLElement}
	 */
	#build(cfg) {
		const span = document.createElement('span');
		span.className = 'spinner';
		span.setAttribute('role',      'status');
		span.setAttribute('aria-live', 'polite');

		if (cfg.size)					span.setAttribute('data-size',    cfg.size);
		if (cfg.variant)				span.setAttribute('data-variant', cfg.variant);
		if (cfg.mode && cfg.mode !== 'overlay') span.setAttribute('data-mode', cfg.mode);
		if (cfg.glow)					span.setAttribute('data-glow',    'true');
		if (cfg.delay)					span.setAttribute('data-delay',   'true');

		// Screen-reader text — visually hidden
		const sr = document.createElement('span');
		sr.className   = 'spinner-sr';
		sr.textContent = cfg.text;
		span.appendChild(sr);

		// Dots variant: needs an extra child element for the animation
		if (cfg.variant === 'dots') {
			span.appendChild(document.createElement('span'));
		}

		return span;
	}
}

export default Spinner;