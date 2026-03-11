/**
 * @module js.ui.progress
 * @description Manages overlay progress indicators (linear and circular) attached to specific DOM targets.
 * 				Useful for showing loading states, form submission progress, file upload status, etc.
 * 
 * Features:
 * - Linear progress bars with optional percentage label
 * - Circular indeterminate spinners
 * - Multiple independent bars (one per target element)
 * - Variants/colors and size modifiers
 * - Clean show → update → hide lifecycle
 */
class Progress {

	constructor(deck) {

		this.deck = deck;
		this.activeBars = new Map(); // Track bars by target element
	}

	/**
	 * Shows (creates or re-uses) a progress indicator on the target element.
	 *
	 * @param {HTMLElement|string} target					- DOM element or CSS selector
	 * @param {Object} [options={}]							- Configuration
	 * @param {'linear'|'circular'} [options.type='linear']
	 * @param {number} [options.value=0]					- 0–100 (ignored in indeterminate mode)
	 * @param {boolean} [options.indeterminate=false]
	 * @param {string} [options.label='']					- Custom text (or percentage if omitted)
	 * @param {'small'|'medium'|'large'|'default'} [options.size='default']
	 * @param {''|'orange'|'red'|'green'|'secondary'|'light'} [options.variant='']
	 * @returns {{container: HTMLElement, bar: HTMLElement, label: ?HTMLElement}|undefined}
	 */
	show(target, options = {}) {

		const el = typeof target === 'string' ? document.querySelector(target) : target;
		if (!el) return;

		const config = {
			type: 'linear', // 'linear' or 'circular'
			value: 0,       // 0 to 100
			indeterminate: false,
			label: '',
			size: 'default', // 'small', 'medium', 'large'
			variant: '',     // 'orange', 'red', 'green', 'secondary', 'light'
			...options
		};

		let barData = this.activeBars.get(el);

		if (!barData) {
			barData = this._createBar(config);
			el.appendChild(barData.container);
			this.activeBars.set(el, barData);
		}

		this.update(target, config.value, config);
		return barData;
	}

	/**
	 * Updates value, label, indeterminate state, etc. of an existing progress indicator.
	 *
	 * @param {HTMLElement|string} target
	 * @param {number} value - 0–100
	 * @param {Object} [options={}]
	 * @param {boolean} [options.indeterminate]
	 * @param {string} [options.label]
	 */
	update(target, value, options = {}) {

		const el = typeof target === 'string' ? document.querySelector(target) : target;
		const data = this.activeBars.get(el);
		if (!data) return;

		const { bar, label, container } = data;

		// Update Value
		if (!options.indeterminate) {
			const clampedValue = Math.min(Math.max(value, 0), 100);
			bar.style.width = `${clampedValue}%`;

			if (label) label.textContent = options.label || `${clampedValue}%`;
			container.classList.remove('progress-indeterminate');

		} else {
			container.classList.add('progress-indeterminate');
		}
	}

	/**
	 * Removes the progress indicator from the target element.
	 *
	 * @param {HTMLElement|string} target
	 */
	hide(target) {
		const el = typeof target === 'string' ? document.querySelector(target) : target;
		const data = this.activeBars.get(el);
		if (data) {
			data.container.remove();
			this.activeBars.delete(el);
		}
	}

	/**
	 * Internal factory method — builds the DOM structure for linear or circular progress.
	 *
	 * @private
	 * @param {Object} cfg - Normalized configuration
	 * @returns {{container: HTMLElement, bar: HTMLElement, label: ?HTMLElement}}
	 */
	_createBar(cfg) {

		if (cfg.type === 'circular') {
			const circle = document.createElement('div');
			circle.className = 'progress-circular';

			if (cfg.size !== 'default') circle.classList.add(`progress-circular-${cfg.size}`);
			if (cfg.variant) circle.classList.add(`progress-circular-${cfg.variant}`);
			
			// For circular we usually don't separate bar/label — the element itself animates
			return { container: circle, bar: circle, label: null };
		}

		// Linear Construction
		const container = document.createElement('div');
		container.className = 'progress';

		if (cfg.size !== 'default') container.classList.add(`progress-${cfg.size}`);
		
		const bar = document.createElement('div');
		bar.className = 'progress-bar';

		if (cfg.variant) bar.classList.add(`color-${cfg.variant}`);
		
		let label = null;
		
		if (cfg.label !== false) {
			label = document.createElement('div');
			label.className = 'progress-label';
			container.classList.add('progress-label-enabled');
			container.appendChild(label);
		}

		container.appendChild(bar);

		return { container, bar, label };
	}

	/**
	 * Removes all active progress bars (useful on page unload / deck reset)
	 */
	destroy() {
		for (const [, data] of this.activeBars) {
		data.container.remove();
		}
		this.activeBars.clear();
	}
}

export default Progress;