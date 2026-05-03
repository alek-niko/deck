/**
 * @module js.ui.component.manager
 * @description Central manager for interactive UI components:
 * 				- Floating Action Buttons (speed-dials & sheets)
 * 				- Card minimize/close behavior
 * 				- Avatar fallback to initials
 * 				- Overlay dimming (modal-like background)
 */

import { DomUtils } from './helpers.js';

export default class ComponentManager {

	constructor(ui) {
		this.ui = ui;
		this.activeOverlays = new Set();
	}

	/**
	 * Initializes all component behaviors
	 * Should be called once after DOM is ready
	 */
	init() {
		//this.initFabSpeedDials();
		//this.initFabSheets();
		this.initAvatars();
		this.#bindCardEvents();
	}

	/**
	 * Initializes FAB speed dial toggling behavior
	 * Clicking main FAB toggles child actions with animation classes
	 * @private
	 */
	initFabSpeedDials() {
		// Using :scope > would be more correct, but querySelectorAll doesn't support :scope yet in older browsers
		document.querySelectorAll('.fab-speed-dial > .fab').forEach(fab => {
			const speedDial = fab.closest('.fab-speed-dial');

			fab.addEventListener('click', () => {
				const isActive = speedDial.classList.contains('fab-speed-dial-active');

				if (isActive) {
					// Play outro animation → then remove active state
					speedDial.classList.add('animOut');
					setTimeout(() => speedDial.classList.remove('fab-speed-dial-active', 'animOut'), 300);

				} else {
					// Just switch to active + intro animation
					speedDial.classList.add('fab-speed-dial-active', 'animIn');
				}
			});
		});
	}

	/**
	 * Initializes FAB sheet (bottom/full screen action sheet) behavior
	 * Opens on trigger click, closes on outside click
	 * @private
	 */
	initFabSheets() {
		document.querySelectorAll('.fab-sheet').forEach(fab => {
			const trigger = fab.querySelector('.fab-sheet-trigger');
			if (!trigger) return;

			trigger.addEventListener('click', (e) => {
				e.stopPropagation();
				fab.classList.add('fab-animated', 'fab-active');
			});

			// Global outside-click close (common mobile sheet pattern)
			window.addEventListener('click', () => {
				if (!sheet.classList.contains('fab-active')) return;

				sheet.classList.remove('fab-active');
				setTimeout(() => {
				sheet.classList.remove('fab-animated');
				}, 200);
			});
		});
	}

	/**
	 * Binds global card control events (minimize / close)
	 * Uses event delegation on body
	 * @private
	 */
	#bindCardEvents() {

		this.ui.$el.body.addEventListener('click', e => {

			const toggle = e.target.closest('.js-card-toggle');
			const close = e.target.closest('.js-card-close');

			if (toggle) {
				const card = toggle.closest('.card');
				if (!card) return;
				
				const content = card.querySelector('.card-content');
				if (!content) return;

				const isMin = card.classList.toggle('card-minimized');
				toggle.classList.toggle('window-minimize', !isMin);
				toggle.classList.toggle('window-maximize', isMin);

				isMin ? DomUtils.slideUp(content) : DomUtils.slideDown(content);
			}

			if (close) {
				const card = close.closest('.card');
				if (!card) return;

				card.classList.add('animation-scale-up', 'animation-reverse');
				card.addEventListener('animationend', () => card.remove(), { once: true });
			}

		});
	}

	/**
	 * Creates a dimming overlay (modal backdrop) on top of the given parent
	 * Prevents stacking multiple dimmers on same parent
	 *
	 * @param {HTMLElement} [parent=this.ui.$el.body] - Element to append overlay to
	 * @param {boolean} [animate=true] - Whether to play fade-in transition
	 * @returns {HTMLElement|undefined} The created overlay element or undefined if prevented
	 */
	dim(parent = this.ui.$el.body, animate = true) {
		// Prevent stacking multiple dimmers on the same element
		if (parent.querySelector(':scope > .overlay.js-dimmer')) return;

		const overlay = document.createElement('div');
		// js-dimmer ensures it behaves as a curtain, overlay-primary gives it our style
		overlay.className = 'overlay js-dimmer overlay-primary';
		
		parent.appendChild(overlay);

		// Force reflow so transition starts from correct state
		overlay.offsetHeight; 

		if (animate) {
			overlay.classList.add('dimmed');
		} else {
			overlay.style.transition = 'none';
			overlay.classList.add('dimmed');
		}
		
		this.activeOverlays.add(overlay);
		return overlay;
	}

	/**
	 * Removes dimming overlay from the given parent
	 * Handles both instant and animated removal
	 *
	 * @param {HTMLElement} [parent=this.ui.$el.body]
	 */
	undim(parent = this.ui.$el.body) {
		const overlay = parent.querySelector(':scope > .overlay.js-dimmer');
		if (!overlay) return;

		overlay.classList.remove('dimmed');

		const cleanup = () => {
			overlay.remove();
			this.activeOverlays.delete(overlay);
		};

		// If no transition is actually happening → remove immediately
		if (getComputedStyle(overlay).transitionDuration === '0s') {
			cleanup();
		} else {
			overlay.addEventListener('transitionend', cleanup, { once: true });
		}
	}

	/**
	 * Initializes avatar fallback logic (image → initials)
	 * @param {Document|HTMLElement} [target=document] - Scope to search for avatars
	 */
	initAvatars(target = document) {
		const avatars = target.querySelectorAll('.avatar:not([data-initialized])');

		avatars.forEach(avatar => {
			avatar.dataset.initialized = 'true';

			const img = avatar.querySelector('.avatar-image');
			const initials = avatar.querySelector('.avatar-initials');

			if (img && initials) {
				img.onerror = () => {
					img.style.display = 'none';
					initials.style.display = 'flex';
				};
			}
		});
	}
}