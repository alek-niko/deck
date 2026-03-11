/**
 * @module js.ui.spinner
 * @description Manages loading spinners — lightweight, accessible, and stylable via data attributes.
 *
 * Features:
 * - Multiple spinners tracked independently per target element
 * - Supports overlay mode (full container coverage + dimming potential)
 * - Inline / centered / block positioning modes
 * - Size, color variant, glow, delay animation control
 * - Screen-reader friendly hidden text
 * - `data-loading` attribute for styling disabled states / buttons
 */
class Spinner {
	
	constructor(deckInstance) {
		this.deck = deckInstance;
		this.activeSpinners = new Map(); // Track spinners per element
	}

	/**
	 * Displays a spinner on the target element (defaults to body).
	 * Prevents duplicate spinners on the same target.
	 *
	 * @param {HTMLElement|string} [target='body'] - Element or CSS selector
	 * @param {Object} [options={}] Configuration
	 * @param {'sm'|'md'|'lg'} [options.size='md']
	 * @param {'primary'|'secondary'|'success'|'danger'|'warning'|'info'|'light'|'dark'|'dots'} [options.variant='primary']
	 * @param {'center'|'inline'|'block'|'overlay'} [options.mode='center']
	 * @param {string} [options.text='Loading...'] - Screen-reader announcement
	 * @param {boolean} [options.glow=false] - Extra glow effect
	 * @param {boolean} [options.delay=false] - Delayed appearance animation
	 * @returns {HTMLElement|undefined} The created spinner (or overlay) element
	 */
	show(target = 'body', options = {}) {
		const el = typeof target === 'string' ? document.querySelector(target) : target;
		if (!el) return;

		// Prevent stacking multiple spinners on same target
		if (this.activeSpinners.has(el)) return;

		const config = {
			size: 'md',
			variant: 'primary',
			mode: 'center', // 'center', 'inline', 'block', 'overlay'
			text: 'Loading...',
			glow: false,
			delay: false,
			...options
		};

		const spinner = this._createSpinner(config);
		
		// Handle Overlay vs Direct Injection
		if (config.mode === 'overlay') {
			const overlay = document.createElement('div');
			overlay.className = 'spinner-overlay';
			overlay.setAttribute('data-state', 'visible');
			overlay.appendChild(spinner);

			// Make sure container can position the absolute overlay
			// const currentPosition = window.getComputedStyle(el).position;
			// if (currentPosition === 'static') {
			// 	el.style.setProperty('position', 'relative', 'important');
			// }

			el.appendChild(overlay);
			this.activeSpinners.set(el, overlay);
			
			// Ensure container is relative for absolute overlay
			if (window.getComputedStyle(el).position === 'static') {
				el.style.setProperty('position', 'relative', 'important');
			}
		} else {
			el.appendChild(spinner);
			this.activeSpinners.set(el, spinner);
		}

		// Signal loading state
		el.setAttribute('data-loading', 'true');
		
		return spinner;
	}

	/**
	 * Removes the spinner (and overlay if used) from the target.
	 *
	 * @param {HTMLElement|string} [target='body']
	 */
	hide(target = 'body') {
		const el = typeof target === 'string' ? document.querySelector(target) : target;
		if (!el || !this.activeSpinners.has(el)) return;

		const spinner = this.activeSpinners.get(el);
		spinner.remove();

		// Clean up loading indicator
		el.removeAttribute('data-loading');

		// If we forced position: relative, we could optionally revert it here,
		// but usually it's safer to leave it (many containers should be relative anyway)
		// el.style.removeProperty('position');

		this.activeSpinners.delete(el);
	}

	/**
	 * Internal: Creates the spinner DOM structure using data attributes
	 * for styling (matches common SCSS/CSS variable-based theming).
	 *
	 * @private
	 * @param {Object} cfg Normalized configuration
	 * @returns {HTMLElement} The spinner <span> element
	 */
	_createSpinner(cfg) {
		const span = document.createElement('span');
		span.className = 'spinner';
		span.setAttribute('role', 'status');
		spinner.setAttribute('aria-live', 'polite');
		
		// Attributes based on our SCSS tokens
		if (cfg.size) span.setAttribute('data-size', cfg.size);
		if (cfg.variant) span.setAttribute('data-variant', cfg.variant);
		if (cfg.mode && cfg.mode !== 'overlay') span.setAttribute('data-mode', cfg.mode);

		if (cfg.glow) span.setAttribute('data-glow', 'true');
		if (cfg.delay) span.setAttribute('data-delay', 'true');

		// Accessible loading message (hidden visually)
		const srText = document.createElement('span');
		srText.className = 'spinner-sr';
		srText.textContent = cfg.text;
		span.appendChild(srText);

		// Special handling for dots variant (common bouncing dots animation)
		if (cfg.variant === 'dots') {
			const dot = document.createElement('span');
			span.appendChild(dot);
		}

		return span;
	}

	/**
	 * Removes **all** active spinners.
	 * Useful during navigation, page reset, or component cleanup.
	 */
	destroy() {
		for (const spinnerOrOverlay of this.activeSpinners.values()) {
		spinnerOrOverlay.remove();
		}
		this.activeSpinners.clear();
	}
}

export default Spinner;