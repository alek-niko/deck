/**
 * =============================================================================
 * LIGHTBOX MANAGER
 * @module js.ui.lightbox.manager
 * -----------------------------------------------------------------------------
 * Delegated gallery and lightbox system. One manager instance handles every
 * lightbox trigger on the page — including dynamically injected content —
 * with zero per-element initialization cost.
 *
 * HTML API:
 *	data-lightbox					- single image trigger (required)
 *	data-lightbox-gallery="name"	- groups triggers into a navigable gallery
 *	data-lightbox-caption="..."		- caption text for the item
 *	data-lightbox-zoom="false"		- disable zoom for a specific item
 *
 * Trigger element:
 *	<a href="full.jpg" data-lightbox data-lightbox-gallery="trip">
 *		<img src="thumb.jpg" alt="...">
 *	</a>
 *
 * Notes:
 *	- The dialog is created once on first use and reused across opens
 *	- No per-trigger initialization — works with dynamic DOM out of the box
 *	- Image-only for now; renderItem() is the single hook point for video later
 *	- Swipe (touch) and drag (mouse) both supported
 *	- Consistent lifecycle events with Modal and Offcanvas
 * =============================================================================
 */

/**
 * @class LightboxManager
 * @description
 * System-level lightbox controller responsible for:
 * 	- Delegated click handling for all [data-lightbox] triggers
 * 	- Gallery grouping and navigation
 * 	- Dialog lifecycle (create once, reuse always)
 * 	- Focus management and ARIA
 * 	- Scroll locking
 * 	- Keyboard, swipe, and mouse-drag navigation
 * 	- Image preloading (next + previous)
 * 	- Zoom on click / double-tap
 * 	- Lifecycle events
 */
class LightboxManager {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** The single reusable <dialog> element. Created on first open. */
	#dialog = null;

	/** Internal UI element references — built once, reused. */
	#ui = {};

	/** All items in the current gallery. Array of trigger <a> elements. */
	#items = [];

	/** Currently displayed index within #items. */
	#index = 0;

	/** URLs already preloaded into browser cache. */
	#preloaded = new Set();

	/** Whether the lightbox is currently open. */
	#isOpen = false;

	/** Zoom state for the current image. */
	#isZoomed = false;

	/** Touch tracking for swipe gesture. */
	#touch = { startX: 0, startY: 0, isDragging: false };

	/** Mouse drag tracking. */
	#drag = { startX: 0, isDragging: false, moved: false };

	/** Bound handler references for clean removeEventListener. */
	#handlers = {};

	/** Reference to the element focused before the lightbox opened. */
	#previouslyFocused = null;

	/** Focusable selector — consistent with Modal/Offcanvas. */
	static #FOCUSABLE = [
		'a[href]', 'button:not([disabled])',
		'[tabindex]:not([tabindex="-1"])',
	].join(', ');

	// =========================================================================
	// CONSTRUCTOR
	// =========================================================================

	/**
	 * @param {Object} ui  - Shared UI/system reference.
	 * @param {Object} [options={}]
	 */
	constructor(ui, options = {}) {
		this.ui = ui;

		this.options = {
			threshold:			50,		// px — minimum drag/swipe to trigger nav
			preloadAhead:		1,		// how many items ahead/behind to preload
			zoomScale:			2.5,	// CSS scale applied on zoom
			animateDuration:	300,	// ms — must match CSS --lb-duration
			...options,
		};

		// Pre-bind all handlers so we can add and remove them cleanly
		this.#handlers = {
			bodyClick:		this.#onBodyClick.bind(this),
			keydown:		this.#onKeydown.bind(this),
			touchStart:		this.#onTouchStart.bind(this),
			touchMove:		this.#onTouchMove.bind(this),
			touchEnd:		this.#onTouchEnd.bind(this),
			mouseDown:		this.#onMouseDown.bind(this),
			mouseMove:		this.#onMouseMove.bind(this),
			mouseUp:		this.#onMouseUp.bind(this),
		};

		this.init();
	}

	// =========================================================================
	// PUBLIC API
	// =========================================================================

	/**
	 * Attach the delegated body listener.
	 * Safe to call multiple times.
	 */
	init() {
		document.body.addEventListener('click', this.#handlers.bodyClick);
	}

	/**
	 * Open the lightbox programmatically.
	 *
	 * @param {HTMLElement|string} trigger  - A [data-lightbox] element or CSS selector.
	 */
	open(trigger) {
		const el = typeof trigger === 'string'
			? document.querySelector(trigger)
			: trigger;

		if (!el) return;
		this.#prepare(el);
		this.#open();
	}

	/**
	 * Close the lightbox programmatically.
	 */
	close() {
		this.#close();
	}

	/**
	 * Navigate to the next item.
	 */
	next() {
		if (this.#items.length < 2) return;
		this.#navigate((this.#index + 1) % this.#items.length);
	}

	/**
	 * Navigate to the previous item.
	 */
	previous() {
		if (this.#items.length < 2) return;
		this.#navigate((this.#index - 1 + this.#items.length) % this.#items.length);
	}

	/**
	 * Navigate to a specific index.
	 * @param {number} index
	 */
	goTo(index) {
		const clamped = Math.max(0, Math.min(index, this.#items.length - 1));
		this.#navigate(clamped);
	}

	/**
	 * Remove all listeners. Call when tearing down the application.
	 */
	destroy() {
		document.body.removeEventListener('click', this.#handlers.bodyClick);
		this.#close();
		this.#dialog?.remove();
		this.#dialog = null;
	}

	// =========================================================================
	// PRIVATE — SETUP
	// =========================================================================

	/**
	 * Build the dialog and all inner UI elements.
	 * Called once on first open — then reused every subsequent open.
	 */
	#buildDialog() {
		const dialog = document.createElement('dialog');
		dialog.className = 'lightbox-panel';
		dialog.setAttribute('aria-modal', 'true');
		dialog.setAttribute('role', 'dialog');
		dialog.setAttribute('aria-label', 'Image lightbox');

		// ── Backdrop click to close ───────────────────────────────────────────
		dialog.addEventListener('click', event => {
			if (event.target === dialog) this.#close();
		});

		// ── Cancel (native Escape) ────────────────────────────────────────────
		dialog.addEventListener('cancel', event => {
			event.preventDefault();
			this.#close();
		});

		// ── Toolbar: top ──────────────────────────────────────────────────────
		const toolbar = document.createElement('div');
		toolbar.className = 'lightbox-toolbar lightbox-toolbar-top';

		const counter = document.createElement('span');
		counter.className = 'lightbox-counter';
		counter.setAttribute('aria-live', 'polite');

		const closeBtn = this.#createButton('lightbox-close', 'Close lightbox', `
			<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6 6 18M6 6l12 12"/>
			</svg>
		`);
		closeBtn.addEventListener('click', () => this.#close());

		toolbar.appendChild(counter);
		toolbar.appendChild(closeBtn);

		// ── Navigation ────────────────────────────────────────────────────────
		const prevBtn = this.#createButton('lightbox-nav lightbox-nav-prev', 'Previous image', `
			<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M15 18l-6-6 6-6"/>
			</svg>
		`);
		prevBtn.addEventListener('click', () => this.previous());

		const nextBtn = this.#createButton('lightbox-nav lightbox-nav-next', 'Next image', `
			<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M9 18l6-6-6-6"/>
			</svg>
		`);
		nextBtn.addEventListener('click', () => this.next());

		// ── Items container ───────────────────────────────────────────────────
		const itemsContainer = document.createElement('div');
		itemsContainer.className = 'lightbox-items';

		// Swipe/drag listeners live on the items container
		itemsContainer.addEventListener('touchstart', this.#handlers.touchStart, { passive: true });
		itemsContainer.addEventListener('touchmove',  this.#handlers.touchMove,  { passive: false });
		itemsContainer.addEventListener('touchend',   this.#handlers.touchEnd,   { passive: true });
		itemsContainer.addEventListener('mousedown',  this.#handlers.mouseDown);

		// ── Caption: bottom toolbar ───────────────────────────────────────────
		const captionBar = document.createElement('div');
		captionBar.className = 'lightbox-toolbar lightbox-toolbar-bottom';

		const caption = document.createElement('p');
		caption.className = 'lightbox-caption';

		captionBar.appendChild(caption);

		// ── Assemble ──────────────────────────────────────────────────────────
		dialog.appendChild(toolbar);
		dialog.appendChild(prevBtn);
		dialog.appendChild(nextBtn);
		dialog.appendChild(itemsContainer);
		dialog.appendChild(captionBar);

		document.body.appendChild(dialog);

		// Store references — never query again
		this.#ui = { dialog, toolbar, counter, closeBtn, prevBtn, nextBtn, itemsContainer, captionBar, caption };
		this.#dialog = dialog;
	}

	/**
	 * Helper: create a <button> with class, aria-label, and inner HTML.
	 */
	#createButton(className, label, innerHTML) {
		const btn = document.createElement('button');
		btn.className = className;
		btn.setAttribute('aria-label', label);
		btn.innerHTML = innerHTML;
		return btn;
	}

	// =========================================================================
	// PRIVATE — OPEN / CLOSE
	// =========================================================================

	/**
	 * Collect gallery items and set the starting index from a trigger element.
	 * @param {HTMLElement} trigger
	 */
	#prepare(trigger) {
		const gallery = trigger.dataset.lightboxGallery;

		this.#items = gallery
			? [...document.querySelectorAll(`[data-lightbox-gallery="${gallery}"]`)]
			: [trigger];

		this.#index = Math.max(0, this.#items.indexOf(trigger));
	}

	/**
	 * Open the dialog, lock scroll, attach global listeners, render first item.
	 */
	#open() {
		// Fire beforeshow — cancelable
		const event = new CustomEvent('lightbox:beforeshow', {
			bubbles: true, cancelable: true,
			detail: { index: this.#index, items: this.#items }
		});
		document.dispatchEvent(event);
		if (event.defaultPrevented) return;

		// Build dialog on first use
		if (!this.#dialog) this.#buildDialog();

		// Store focus origin
		this.#previouslyFocused = document.activeElement;

		// Show nav only when gallery has multiple items
		const multi = this.#items.length > 1;
		this.#ui.prevBtn.hidden = !multi;
		this.#ui.nextBtn.hidden = !multi;
		this.#ui.counter.hidden = !multi;

		// Open native dialog
		this.#dialog.showModal();
		this.#isOpen = true;

		// Scroll lock
		this.#lockScroll();

		// Global keyboard listener
		document.addEventListener('keydown', this.#handlers.keydown);

		// Mouse move/up on document (drag can leave the container)
		document.addEventListener('mousemove', this.#handlers.mouseMove);
		document.addEventListener('mouseup',   this.#handlers.mouseUp);

		// Render first item
		this.#render();

		// Trigger open animation on next frame
		requestAnimationFrame(() => {
			this.#dialog.classList.add('is-open');
		});

		requestAnimationFrame(() => {
			document.dispatchEvent(new CustomEvent('lightbox:show', {
				bubbles: true,
				detail: { index: this.#index, items: this.#items }
			}));
		});
	}

	/**
	 * Animate close, then close the native dialog and restore state.
	 */
	#close() {
		if (!this.#isOpen) return;

		// Fire beforehide — cancelable
		const event = new CustomEvent('lightbox:beforehide', {
			bubbles: true, cancelable: true,
			detail: { index: this.#index }
		});
		document.dispatchEvent(event);
		if (event.defaultPrevented) return;

		this.#isOpen = false;
		this.#isZoomed = false;

		// Remove open class — triggers CSS leave animation
		this.#dialog.classList.remove('is-open');

		// Remove zoom state from image
		this.#ui.itemsContainer.querySelector('img')?.classList.remove('is-zoomed');

		// Wait for CSS transition then close native dialog
		setTimeout(() => {
			if (this.#dialog?.open) this.#dialog.close();

			this.#unlockScroll();

			document.removeEventListener('keydown',   this.#handlers.keydown);
			document.removeEventListener('mousemove', this.#handlers.mouseMove);
			document.removeEventListener('mouseup',   this.#handlers.mouseUp);

			// Restore focus
			this.#previouslyFocused?.focus();
			this.#previouslyFocused = null;

			document.dispatchEvent(new CustomEvent('lightbox:hide', { bubbles: true }));
		}, this.options.animateDuration);
	}

	// =========================================================================
	// PRIVATE — RENDERING
	// =========================================================================

	/**
	 * Render the current item and update all UI state.
	 * This is the single hook point for adding video support later:
	 * inspect the URL/type and call the appropriate render method.
	 */
	#render() {
		const item		= this.#items[this.#index];
		const src		= item.getAttribute('href') || item.dataset.lightboxSrc;
		const caption	= item.dataset.lightboxCaption || item.getAttribute('title') || '';

		// Reset zoom
		this.#isZoomed = false;

		// ── Counter ───────────────────────────────────────────────────────────
		this.#ui.counter.textContent = `${this.#index + 1} / ${this.#items.length}`;

		// ── Caption ───────────────────────────────────────────────────────────
		this.#ui.caption.textContent = caption;
		this.#ui.captionBar.hidden   = !caption;

		// ── Media ─────────────────────────────────────────────────────────────
		// Future: switch on this.#detectType(src) for video/iframe support
		this.#renderImage(src, caption);

		// ── Preload neighbours ────────────────────────────────────────────────
		this.#preload();
	}

	/**
	 * Render an image item.
	 * @param {string} src
	 * @param {string} alt
	 */
	#renderImage(src, alt) {
		const container = this.#ui.itemsContainer;

		// Fade out existing content
		const existing = container.querySelector('.lightbox-item');
		if (existing) existing.classList.add('is-leaving');

		const wrapper = document.createElement('div');
		wrapper.className = 'lightbox-item';

		const img = document.createElement('img');
		img.alt = alt || 'Lightbox image';
		img.draggable = false; // prevent browser native drag interfering with our drag

		// Loading state
		wrapper.classList.add('is-loading');

		img.addEventListener('load', () => {
			wrapper.classList.remove('is-loading');
			wrapper.classList.add('is-loaded');
		}, { once: true });

		img.addEventListener('error', () => {
			wrapper.classList.remove('is-loading');
			wrapper.classList.add('is-error');
			img.alt = 'Image failed to load';
		}, { once: true });

		// Zoom on click
		img.addEventListener('click', () => this.#toggleZoom(img));

		// Double-tap zoom (mobile)
		let lastTap = 0;
		img.addEventListener('touchend', (e) => {
			const now = Date.now();
			if (now - lastTap < 300) {
				e.preventDefault();
				this.#toggleZoom(img);
			}
			lastTap = now;
		});

		img.src = src;

		wrapper.appendChild(img);
		container.appendChild(wrapper);

		// Remove the leaving item after transition
		if (existing) {
			setTimeout(() => existing.remove(), this.options.animateDuration);
		}
	}

	/**
	 * Navigate to a new index with a directional animation class.
	 * @param {number} newIndex
	 */
	#navigate(newIndex) {
		if (newIndex === this.#index) return;

		const direction = newIndex > this.#index ? 'forward' : 'backward';
		this.#index = newIndex;

		this.#ui.itemsContainer.dataset.direction = direction;
		this.#render();

		requestAnimationFrame(() => {
			delete this.#ui.itemsContainer.dataset.direction;
		});
	}

	// =========================================================================
	// PRIVATE — ZOOM
	// =========================================================================

	/**
	 * Toggle zoom state on the current image.
	 * @param {HTMLImageElement} img
	 */
	#toggleZoom(img) {
		this.#isZoomed = !this.#isZoomed;
		img.classList.toggle('is-zoomed', this.#isZoomed);
		this.#dialog.classList.toggle('is-zoomed', this.#isZoomed);

		// Disable swipe/drag while zoomed
		this.#ui.itemsContainer.classList.toggle('is-zoomed', this.#isZoomed);
	}

	// =========================================================================
	// PRIVATE — PRELOADING
	// =========================================================================

	/**
	 * Preload the next and previous image URLs into the browser cache.
	 */
	#preload() {
		if (this.#items.length < 2) return;

		const ahead  = this.options.preloadAhead;
		const total  = this.#items.length;
		const toLoad = [];

		for (let i = 1; i <= ahead; i++) {
			toLoad.push((this.#index + i) % total);
			toLoad.push((this.#index - i + total) % total);
		}

		toLoad.forEach(i => {
			const url = this.#items[i]?.getAttribute('href');
			if (url && !this.#preloaded.has(url)) {
				const img  = new Image();
				img.src    = url;
				img.onload = () => this.#preloaded.add(url);
			}
		});
	}

	// =========================================================================
	// PRIVATE — SCROLL LOCK
	// =========================================================================

	#lockScroll() {
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
		document.body.classList.add('lightbox-open');
	}

	#unlockScroll() {
		document.body.classList.remove('lightbox-open');
		document.body.style.removeProperty('--scrollbar-width');
	}

	// =========================================================================
	// PRIVATE — EVENT HANDLERS
	// =========================================================================

	/**
	 * Delegated body click — finds the nearest [data-lightbox] trigger.
	 * @param {MouseEvent} event
	 */
	#onBodyClick(event) {
		const trigger = event.target.closest('[data-lightbox]');
		if (!trigger) return;

		event.preventDefault();
		this.#prepare(trigger);
		this.#open();
	}

	/**
	 * Keyboard handler — attached to document only while open.
	 * @param {KeyboardEvent} event
	 */
	#onKeydown(event) {
		switch (event.key) {
			case 'ArrowRight':	this.next();     break;
			case 'ArrowLeft':	this.previous(); break;
			case 'Escape':		this.#close();   break;
			case 'Tab':			this.#trapFocus(event); break;
		}
	}

	/**
	 * Tab focus trap — keeps focus inside the dialog while open.
	 * @param {KeyboardEvent} event
	 */
	#trapFocus(event) {
		const focusables = [...this.#dialog.querySelectorAll(LightboxManager.#FOCUSABLE)];
		if (!focusables.length) return;

		const first = focusables[0];
		const last  = focusables[focusables.length - 1];

		if (event.shiftKey && document.activeElement === first) {
			last.focus();
			event.preventDefault();

		} else if (!event.shiftKey && document.activeElement === last) {
			first.focus();
			event.preventDefault();
		}
	}

	// ─── Touch ────────────────────────────────────────────────────────────────

	#onTouchStart(event) {
		if (this.#isZoomed) return;
		const t = event.touches[0];
		this.#touch = { startX: t.clientX, startY: t.clientY, isDragging: false };
	}

	#onTouchMove(event) {
		if (this.#isZoomed) return;
		const t			= event.touches[0];
		const deltaX	= t.clientX - this.#touch.startX;
		const deltaY	= t.clientY - this.#touch.startY;

		// Only intercept horizontal swipes — let vertical scroll through
		if (!this.#touch.isDragging && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
			this.#touch.isDragging = true;
		}

		if (this.#touch.isDragging) {
			event.preventDefault(); // Block vertical scroll only once confirmed horizontal
			this.#ui.itemsContainer.style.setProperty('--drag-offset', `${deltaX}px`);
		}
	}

	#onTouchEnd(event) {
		if (this.#isZoomed || !this.#touch.isDragging) return;

		const t			= event.changedTouches[0];
		const deltaX	= t.clientX - this.#touch.startX;

		this.#ui.itemsContainer.style.removeProperty('--drag-offset');

		if (Math.abs(deltaX) >= this.options.threshold) {
			deltaX < 0 ? this.next() : this.previous();
		}

		this.#touch.isDragging = false;
	}

	// ─── Mouse drag ───────────────────────────────────────────────────────────

	#onMouseDown(event) {
		if (this.#isZoomed || event.button !== 0) return;
		this.#drag = { startX: event.clientX, isDragging: true, moved: false };
		this.#ui.itemsContainer.classList.add('is-dragging');
		event.preventDefault();
	}

	#onMouseMove(event) {
		if (!this.#drag.isDragging) return;

		const deltaX = event.clientX - this.#drag.startX;
		this.#drag.moved = Math.abs(deltaX) > 4;
		this.#ui.itemsContainer.style.setProperty('--drag-offset', `${deltaX}px`);
	}

	#onMouseUp(event) {
		if (!this.#drag.isDragging) return;

		const deltaX = event.clientX - this.#drag.startX;
		this.#ui.itemsContainer.style.removeProperty('--drag-offset');
		this.#ui.itemsContainer.classList.remove('is-dragging');

		if (this.#drag.moved && Math.abs(deltaX) >= this.options.threshold) {
			deltaX < 0 ? this.next() : this.previous();
		}

		this.#drag = { startX: 0, isDragging: false, moved: false };
	}
}

export default LightboxManager;