/**
 * =============================================================================
 * PROGRESS
 * @module js.ui.progress
 * -----------------------------------------------------------------------------
 * Per-element progress indicator manager. Supports linear progress bars
 * and circular spinners with a clean show → update → hide lifecycle.
 * Multiple independent bars are tracked — one per target element.
 *
 * Usage:
 *	deck.ui.progress.show('#upload-btn', { value: 0 });
 *	deck.ui.progress.update('#upload-btn', 65);
 *	deck.ui.progress.hide('#upload-btn');
 *
 *   // Circular indeterminate
 *	deck.ui.progress.show('#avatar', { type: 'circular' });
 *
 *   // Indeterminate linear
 *	deck.ui.progress.show('#page', { indeterminate: true });
 *
 * Types:		linear (default) | circular
 * Variants:	'' | orange | red | green | secondary | light
 * Sizes:		default | small | medium | large
 * =============================================================================
 */

import { resolveEl } from './helpers.js';

class Progress {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** Map<HTMLElement, { container, bar, label }> */
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
	 * @description Creates (or reuses) a progress indicator on the target element.
	 *              If one already exists on the target, updates it instead.
	 *
	 * @param {HTMLElement|string} target
	 * @param {Object}  [options={}]
	 * @param {'linear'|'circular'} [options.type='linear']
	 * @param {number}  [options.value=0]              - 0–100
	 * @param {boolean} [options.indeterminate=false]
	 * @param {string}  [options.label='']             - Custom text (else shows percentage)
	 * @param {boolean} [options.showLabel=true]       - Show label element at all
	 * @param {'default'|'small'|'medium'|'large'} [options.size='default']
	 * @param {string}  [options.variant='']           - Color variant class suffix
	 * @returns {Object|null} { container, bar, label } or null if target not found
	 */
	show(target, options = {}) {
		const el = resolveEl(target);
		if (!el) return null;

		const config = {
			type:          'linear',
			value:         0,
			indeterminate: false,
			label:         '',
			showLabel:     true,
			size:          'default',
			variant:       '',
			...options,
		};

		// Reuse existing bar if one is already mounted on this element
		let barData = this.#active.get(el);

		if (!barData) {
			barData = this.#build(config);
			el.appendChild(barData.container);
			this.#active.set(el, barData);
		}

		this.update(target, config.value, config);
		return barData;
	}

	/**
	 * @method update
	 * @description Updates the value and state of an existing progress indicator.
	 *
	 * @param {HTMLElement|string} target
	 * @param {number}  value     - 0–100
	 * @param {Object}  [options={}]
	 * @param {boolean} [options.indeterminate]
	 * @param {string}  [options.label]          - Override label text
	 */
	update(target, value, options = {}) {
		const el   = resolveEl(target);
		const data = this.#active.get(el);
		if (!el || !data) return;

		const { bar, label, container } = data;

		if (options.indeterminate) {
			container.classList.add('progress-indeterminate');
			return;
		}

		container.classList.remove('progress-indeterminate');

		const clamped = Math.min(Math.max(value, 0), 100);
		bar.style.width = `${clamped}%`;

		// Update label text — custom label or auto-percentage
		if (label) {
			label.textContent = options.label || `${clamped}%`;
		}
	}

	/**
	 * @method hide
	 * @description Removes the progress indicator from the target element.
	 *
	 * @param {HTMLElement|string} target
	 */
	hide(target) {
		const el   = resolveEl(target);
		const data = this.#active.get(el);
		if (!el || !data) return;

		data.container.remove();
		this.#active.delete(el);
	}

	/**
	 * @method destroy
	 * @description Removes all active progress bars. Called on page teardown or reset.
	 */
	destroy() {
		this.#active.forEach(data => data.container.remove());
		this.#active.clear();
	}

	// =========================================================================
	// PRIVATE — BUILD
	// =========================================================================

	/**
	 * Builds the progress DOM structure for the given config.
	 * Returns references to container, bar, and label for later updates.
	 *
	 * @param {Object} cfg
	 * @returns {{ container: HTMLElement, bar: HTMLElement, label: HTMLElement|null }}
	 */
	#build(cfg) {

		// ── Circular ──────────────────────────────────────────────────────────
		if (cfg.type === 'circular') {
			const circle = document.createElement('div');
			circle.className = 'progress-circular';

			if (cfg.size !== 'default') circle.classList.add(`progress-circular-${cfg.size}`);
			if (cfg.variant)			circle.classList.add(`progress-circular-${cfg.variant}`);

			// Circular animates via CSS — bar reference points at itself
			return { container: circle, bar: circle, label: null };
		}

		// ── Linear ────────────────────────────────────────────────────────────
		const container = document.createElement('div');
		container.className = 'progress';

		if (cfg.size !== 'default') container.classList.add(`progress-${cfg.size}`);

		const bar = document.createElement('div');
		bar.className = 'progress-bar';
		if (cfg.variant) bar.classList.add(`color-${cfg.variant}`);

		let label = null;
		if (cfg.showLabel) {
			label = document.createElement('div');
			label.className = 'progress-label';
			container.classList.add('progress-label-enabled');
			container.appendChild(label);
		}

		container.appendChild(bar);

		return { container, bar, label };
	}
}

export default Progress;