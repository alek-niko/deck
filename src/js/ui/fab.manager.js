/**
 * @module js.ui.fab.manager
 * @description Manages Floating Action Buttons, Speed Dials, and Action Sheets.
 * 
 * Features:
 *  - Auto-initialises on construction (full document scan)
 *  - init(context) for AJAX / modal / dynamic content re-scans
 *  - destroy(context) for clean SPA route-change teardown
 *  - Unique anchor names per instance (multiple components coexist safely)
 *  - Staggered entry/exit animations for speed dial children
 *  - Keyboard: Escape closes any open speed dial or sheet
 *  - Hover mode: icon preserved, no swap; panel hover keeps it open
 *  - Sheet morph: circle → rounded panel via CSS transition on JS-set dimensions
 *
 * ─── Positioning model ───────────────────────────────────────────────────────
 *
 * The TRIGGER (circle button) is placed at a card/page corner via CSS using
 * fab-card-* or fab-* modifier classes on the wrapper element.
 *
 * The PANEL (speed dial items / sheet actions) is always position:fixed.
 * This means it can never be clipped by a card's overflow:hidden, and is
 * never trapped inside a stacking context. Two placement paths:
 *
 *  Modern browsers (CSS Anchor Positioning — Chromium 125+, Edge 125+):
 *    JS assigns a unique `anchor-name` to the trigger and a matching
 *    `position-anchor` to the panel. CSS `position-area` + `@position-try-fallbacks`
 *    handle direction and viewport-edge flipping automatically.
 *
 *  All other browsers (getBoundingClientRect fallback):
 *    On each open(), JS reads the trigger's viewport rect and computes
 *    exact top/left coordinates for the panel, respecting which corner
 *    the trigger lives in so the panel always opens toward the center.
 *    Coordinates are set as inline styles on the panel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * @class FabManager
 * @classdesc Manages Floating Action Buttons, Speed Dials, and Action Sheets.
 */
export default class FabManager {

	#controller = new AbortController();					// Master AbortController — abort = full instance teardown 
	#components = new Map();								// Per-component AbortControllers for granular cleanup
	#uid = 0;												// Auto-incrementing UID for unique anchor names
	#supportsAnchor = CSS.supports('anchor-name', '--x');	// True when the browser supports CSS Anchor Positioning
	#sheetPanelWidth = 240;									// Panel width for sheets (px)
	#sheetItemHeight = 44;									// Row height per action item for sheet height calculation (px)
	#observer = null;
	#globalListenersAttached = false;

	animDuration = 200;										// ms — keep in sync with $fab-transition-duration in _fab.scss 

	constructor(ui) {
		this.ui = ui;
		this.#initObserver();
		this.init();
	}

	/**
	 * Scan a DOM context and initialise any uninitialised FAB components.
	 * Safe to call multiple times — already-initialised nodes are skipped.
	 * @param {HTMLElement|Document} [context=document]
	 */
	init(context = document) {
		this.#initSpeedDials(context);
		this.#initSheets(context);
		this.#initGlobalListeners();
	}

	#initObserver() {
		this.#observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				// If the trigger leaves the viewport, close the component
				if (!entry.isIntersecting) {
					const el = entry.target.parentElement; // The .fab-speed-dial or .fab-sheet

					if (el.classList.contains('fab-speed-dial')) {
						const panel = el.querySelector('.fab-speed-dial-panel');
						this.#closeSpeedDial(el, panel);
					} else if (el.classList.contains('fab-sheet')) {
						const panel = el.querySelector('.fab-sheet-panel');
						this.closeSheet(panel);
					}
				}
			});
		}, { threshold: 0 });
	}

	/**
	 * Remove all listeners in a context and clear initialisation markers.
	 * Pass `document` for a full manager teardown.
	 * @param {HTMLElement|Document} [context=document]
	 */
	destroy(context = document) {
		for (const [el, ctrl] of this.#components) {
			if (context === document || context.contains(el)) {
				const trigger = el.querySelector('.fab, .fab-sheet-trigger');

				// STOP OBSERVING: This prevents memory leaks
				if (trigger) this.#observer.unobserve(trigger);

				ctrl.abort();
				delete el.dataset.fabInitialized;
				this.#components.delete(el);
			}
		}

		if (context === document) {
			this.#controller.abort();
			this.#observer.disconnect(); // Fully shut down the observer
		}
	}

	/**
	 * Placement helpers
	 * @returns {string} A unique CSS custom-property anchor name
	 */
	#nextAnchorName() {
		return `--fab-anchor-${++this.#uid}`;
	}

	/**
	 * Wire CSS Anchor Positioning between a trigger and its panel.
	 * No-op in non-supporting browsers — the getBoundingClientRect path is used
	 * instead, triggered on each open() call.
	 *
	 * @param {HTMLElement} trigger
	 * @param {HTMLElement} panel
	 * @returns {string} The anchor name assigned, or '' if not supported
	 */
	#linkAnchor(trigger, panel, placement) {
		if (!this.#supportsAnchor) return '';
		const name = this.#nextAnchorName();
		trigger.style.anchorName = name;
		panel.style.positionAnchor = name;

		// We don't set position-area in JS; we let the SCSS handle it 
		// based on the .fab-card-* classes we identified in #getPlacement.
		return name;
	}

	/**
	 * Determine which corner a component lives in by inspecting its modifier classes.
	 *
	 * Returns one of: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
	 * Defaults to 'bottom-right' if no modifier is found.
	 *
	 * @param {HTMLElement} el  The .fab-speed-dial or .fab-sheet element
	 * @returns {'bottom-right'|'bottom-left'|'top-right'|'top-left'}
	 */
	#getPlacement(el) {
		const cl = el.classList;
		if (cl.contains('fab-bottom-left') || cl.contains('fab-card-bottom-left')) return 'bottom-left';
		if (cl.contains('fab-top-right') || cl.contains('fab-card-top-right')) return 'top-right';
		if (cl.contains('fab-top-left') || cl.contains('fab-card-top-left')) return 'top-left';
		return 'bottom-right'; // default — most common
	}

	/**
	 * Position a fixed panel relative to a trigger using getBoundingClientRect.
	 * Called on every open() in non-anchor browsers so the coordinates are always
	 * current (handles scroll, resize, dynamic layouts).
	 *
	 * The panel opens toward the center of the screen:
	 *   bottom-right → panel bottom-right corner aligns to trigger top-right (grows left+up)
	 *   bottom-left  → panel bottom-left corner aligns to trigger top-left (grows right+up)
	 *   top-right    → panel top-right corner aligns to trigger bottom-right (grows left+down)
	 *   top-left     → panel top-left corner aligns to trigger bottom-left (grows right+down)
	 *
	 * @param {HTMLElement} trigger
	 * @param {HTMLElement} panel
	 * @param {'bottom-right'|'bottom-left'|'top-right'|'top-left'} placement
	 * @param {number} [gap=8]  Gap between trigger and panel edge (px)
	 */
	#positionPanel(trigger, panel, placement, gap = this.#sheetPanelWidth > 0 ? 4 : 8) {
		const r = trigger.getBoundingClientRect();

		// Reset any previously set coordinates
		panel.style.top = '';
		panel.style.left = '';
		panel.style.right = '';
		panel.style.bottom = '';

		switch (placement) {
			case 'bottom-right':
				// Panel grows upward + leftward from the trigger's top-right corner
				panel.style.bottom = `${window.innerHeight - r.top + gap}px`;
				panel.style.right = `${window.innerWidth - r.right}px`;
				break;

			case 'bottom-left':
				// Panel grows upward + rightward from the trigger's top-left corner
				panel.style.bottom = `${window.innerHeight - r.top + gap}px`;
				panel.style.left = `${r.left}px`;
				break;

			case 'top-right':
				// Panel grows downward + leftward from the trigger's bottom-right corner
				panel.style.top = `${r.bottom + gap}px`;
				panel.style.right = `${window.innerWidth - r.right}px`;
				break;

			case 'top-left':
				// Panel grows downward + rightward from the trigger's bottom-left corner
				panel.style.top = `${r.bottom + gap}px`;
				panel.style.left = `${r.left}px`;
				break;
		}
	}

	/**
	 * Speed Dial
	 * @param {HTMLElement|Document} context
	 */
	#initSpeedDials(context) {
		context.querySelectorAll('.fab-speed-dial').forEach(speedDial => {
			if (speedDial.dataset.fabInitialized) return;

			const trigger = speedDial.querySelector(':scope > .fab');
			const panel = speedDial.querySelector(':scope > .fab-speed-dial-panel');
			if (!trigger || !panel) return;

			const ctrl = new AbortController();
			this.#components.set(speedDial, ctrl);
			const { signal } = ctrl;

			// Parse config
			let config = {};
			try {
				const raw = speedDial.getAttribute('data-fab');
				if (raw) config = JSON.parse(raw);
			} catch {
				console.warn('[FabManager] Invalid data-fab JSON on', speedDial);
			}

			if (config.horizontal) speedDial.classList.add('fab-speed-dial-horizontal');
			// Marks hover mode in CSS so icon swap is suppressed
			if (config.hover) speedDial.classList.add('fab-speed-dial-hover');

			// Determine placement and stamp it on the panel for CSS flex-direction rules
			const placement = this.#getPlacement(speedDial);
			panel.dataset.placement = placement;

			// Pass placement: This allows CSS to use specific position-areas
			this.#linkAnchor(trigger, panel, placement);

			const open = () => this.#openSpeedDial(speedDial, trigger, panel, placement, config);
			const close = () => this.#closeSpeedDial(speedDial, panel);
			const toggle = () =>
				speedDial.classList.contains('fab-speed-dial-active') ? close() : open();

			if (config.hover) {
				let leaveTimer;
				const cancelLeave = () => clearTimeout(leaveTimer);
				const scheduleClose = () => { leaveTimer = setTimeout(close, 150); };

				// Both the wrapper and the panel (which is position:fixed) need
				// mouseenter/mouseleave so moving between them doesn't flicker
				speedDial.addEventListener('mouseenter', () => { cancelLeave(); open(); }, { signal });
				speedDial.addEventListener('mouseleave', scheduleClose, { signal });
				panel.addEventListener('mouseenter', cancelLeave, { signal });
				panel.addEventListener('mouseleave', scheduleClose, { signal });
			} else {
				trigger.addEventListener('click', (e) => {
					if (trigger.tagName === 'A' && trigger.getAttribute('href') === '#') e.preventDefault();
					toggle();
				}, { signal });
			}

			speedDial.dataset.fabInitialized = 'true';
		});
	}

	/**
	 * @param {HTMLElement} speedDial
	 * @param {HTMLElement} trigger
	 * @param {HTMLElement} panel
	 * @param {string}      placement
	 * @param {object}      config
	 */
	#openSpeedDial(speedDial, trigger, panel, placement, config) {
		// Position panel before showing it (fallback path only)
		if (!this.#supportsAnchor) {
			const gap = config.horizontal ? 8 : 8;
			this.#positionPanel(trigger, panel, placement, gap);
		}

		this.#applyStagger(panel.children, false);
		speedDial.classList.remove('animOut');
		speedDial.classList.add('fab-speed-dial-active', 'animIn');
	}

	/**
	 * @param {HTMLElement} speedDial
	 * @param {HTMLElement} panel
	 */
	#closeSpeedDial(speedDial, panel) {
		const count = panel.children.length;
		this.#applyStagger(panel.children, true);
		speedDial.classList.remove('animIn');
		speedDial.classList.add('animOut');

		clearTimeout(speedDial._fabCloseTimer);
		speedDial._fabCloseTimer = setTimeout(() => {
			speedDial.classList.remove('fab-speed-dial-active', 'animOut');
		}, count * (this.animDuration / 1.5) + this.animDuration);
	}

	/**
	 * Apply staggered animation-delay to speed dial children.
	 * @param {HTMLCollection} items
	 * @param {boolean}        reverse  true = last-in-first-out exit feel
	 */
	#applyStagger(items, reverse) {
		const last = items.length - 1;
		Array.from(items).forEach((item, i) => {
			const delay = reverse
				? (last - i) * (this.animDuration / 1.5)
				: i * (this.animDuration / 1.5);
			item.style.animationDelay = `${delay}ms`;
		});
	}

	/**
	 * FAB Sheet 
	 * @param {HTMLElement|Document} context
	 */
	#initSheets(context) {
		context.querySelectorAll('.fab-sheet').forEach(sheet => {
			if (sheet.dataset.fabInitialized) return;

			const trigger = sheet.querySelector('.fab-sheet-trigger');
			const panel = sheet.querySelector('.fab-sheet-panel');
			const actions = sheet.querySelector('.fab-sheet-actions');
			if (!trigger || !panel || !actions) return;

			const ctrl = new AbortController();
			this.#components.set(sheet, ctrl);
			const { signal } = ctrl;

			const placement = this.#getPlacement(sheet);

			// Wire anchor positioning (no-op in non-supporting browsers)
			this.#linkAnchor(trigger, panel);

			trigger.addEventListener('click', (e) => {
				e.stopPropagation();
				panel.classList.contains('fab-animated')
					? this.closeSheet(panel)
					: this.openSheet(panel, actions, trigger, placement);
			}, { signal });

			sheet.dataset.fabInitialized = 'true';
		});
	}

	/**
	 * Morph the panel from a circle to the expanded action list.
	 *
	 * @param {HTMLElement} panel
	 * @param {HTMLElement} actions
	 * @param {HTMLElement} trigger
	 * @param {'bottom-right'|'bottom-left'|'top-right'|'top-left'} placement
	 */
	openSheet(panel, actions, trigger, placement) {
		if (panel.classList.contains('fab-animated')) return;

		const targetH = (actions.children.length * this.#sheetItemHeight) + 16;
		const targetW = this.#sheetPanelWidth;

		// Fallback path: position the panel now, before it becomes visible
		if (!this.#supportsAnchor) {
			this.#positionPanel(trigger, panel, placement, 4);
		}

		// Phase 1 — make it visible (transition will animate from circle size)
		panel.classList.add('fab-animated');

		// Phase 2 — expand to target size after one paint so the transition fires
		requestAnimationFrame(() => requestAnimationFrame(() => {
			panel.style.width = `${targetW}px`;
			panel.style.height = `${targetH}px`;
			panel.style.borderRadius = '12px';
		}));

		// Phase 3 — reveal action links after expansion is mostly done
		clearTimeout(panel._fabOpenTimer);
		panel._fabOpenTimer = setTimeout(() => {
			panel.classList.add('fab-active');
		}, 150);
	}

	/**
	 * Morph the panel back to a circle and hide it.
	 * @param {HTMLElement} panel
	 */
	closeSheet(panel) {
		if (!panel.classList.contains('fab-animated')) return;

		// Phase 1 — fade out action links
		panel.classList.remove('fab-active');

		// Phase 2 — shrink back to circle dimensions
		clearTimeout(panel._fabCloseTimer);
		panel._fabCloseTimer = setTimeout(() => {
			panel.style.width = '';
			panel.style.height = '';
			panel.style.borderRadius = '';
		}, 100);

		// Phase 3 — remove animated class; CSS visibility:hidden re-applies
		// (delayed by $fab-transition-duration via CSS transition on visibility)
		setTimeout(() => {
			panel.classList.remove('fab-animated');
			// Clear fallback positioning so it doesn't accumulate stale values
			if (!this.#supportsAnchor) {
				panel.style.top = '';
				panel.style.left = '';
				panel.style.right = '';
				panel.style.bottom = '';
			}
		}, 300);
	}

	// Global listeners
	#initGlobalListeners() {

		if (this.#globalListenersAttached) return;

		this.#globalListenersAttached = true;
		const { signal } = this.#controller;

		document.addEventListener('click', (e) => {
			// Close ALL open Sheets
			const openSheets = document.querySelectorAll('.fab-sheet-panel.fab-animated');
			openSheets.forEach(panel => {
				// Don't close if we clicked inside the sheet itself
				if (!e.target.closest('.fab-sheet') || !panel.contains(e.target)) {
					this.closeSheet(panel);
				}
			});

			// Close ALL open Speed Dials (if not in hover mode)
			const openDials = document.querySelectorAll('.fab-speed-dial.fab-speed-dial-active:not(.fab-speed-dial-hover)');
			openDials.forEach(dial => {
				if (!dial.contains(e.target)) {
					const panel = dial.querySelector('.fab-speed-dial-panel');
					this.#closeSpeedDial(dial, panel);
				}
			});
		}, { signal });

		// Escape key should also close everything
		document.addEventListener('keydown', (e) => {
			if (e.key !== 'Escape') return;

			document.querySelectorAll('.fab-sheet-panel.fab-animated').forEach(p => this.closeSheet(p));
			document.querySelectorAll('.fab-speed-dial.fab-speed-dial-active').forEach(d => {
				const p = d.querySelector('.fab-speed-dial-panel');
				this.#closeSpeedDial(d, p);
			});
		}, { signal });
	}
}