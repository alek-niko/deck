/**
 * @module js.components.drop
 * @description Controller for .drop / .dropdown components.
 *
 * Works with the unified _drop.scss — single --drop-* token namespace.
 * Both .drop and .dropdown registry keys map to this class.
 * 
 * Responsibilities:
 *	- Binds toggle elements to popover dropdowns via CSS anchor names
 *	- Manages container anchors for dropbar / mega-menu layouts
 *	- Handles click, hover, and touch interaction modes
 *	- Submenu support (nested Drop instances with shared lifecycle)
 *	- Focus trap when open (accessibility)
 *	- Keyboard navigation (Arrow keys, Home/End, Escape, Tab)
 *	- ARIA attribute management (aria-expanded, aria-controls, aria-haspopup)
 *	- Legacy browser fallback (JS-calculated position when anchor CSS absent)
 *	- Lifecycle events: open / close (bubbling CustomEvents + Deck emitter)
 *	- Clean destroy() with full listener / anchor / ARIA cleanup
 *
 * Visibility contract:
 *	- Modern browsers: :popover-open is the single source of truth.
 *	- Legacy browsers: .open class is added/removed; JS calculates position.
 *
 */

import Component from './component.js';


// =============================================================================
// CONSTANTS
// =============================================================================

/** Standard focusable selector used for keyboard nav and focus trap. */
const FOCUSABLE = [
	'a[href]:not([disabled]):not([aria-disabled="true"])',
	'button:not([disabled]):not([aria-disabled="true"])',
	'input:not([disabled]):not([aria-disabled="true"])',
	'select:not([disabled]):not([aria-disabled="true"])',
	'textarea:not([disabled]):not([aria-disabled="true"])',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]',
].join(', ');

/** Detected once at module load — avoids per-instance CSS.supports calls. */
const SUPPORTS_ANCHOR = CSS.supports('position-area', 'top');

/** Whether the browser supports the `inert` attribute. */
const SUPPORTS_INERT = 'inert' in HTMLElement.prototype;


// =============================================================================
// DROP
// =============================================================================

class Drop extends Component {

	/**
	 * @param {HTMLElement}		element
	 * @param {Object}			[options={}]
	 * @param {Object|null}		[deck=null]
	 *
	 * ── Options ────────────────────────────────────────────────────────────────
	 * mode				'click'|'hover'		Interaction trigger.			'click'
	 * position			string				Anchor position token.			'bottom-center'
	 * offset			number				Toggle ↔ drop gap px.			10
	 * stretch			string|boolean		Container selector (dropbar).	null
	 * width			string|null			Explicit width or 'match'.		null
	 * height			string|null			Explicit height.				null
	 * hoverDelay		number				Hide delay ms (hover mode).		150
	 * trapFocus		boolean				Trap focus inside drop.			false
	 * closeOnScroll	boolean				Close when toggle scrolls out.	true
	 * closeOnResize	boolean				Close on window resize.			false
	 * ───────────────────────────────────────────────────────────────────────────
	 */
	constructor(element, options = {}, deck = null) {

		const defaults = {
			mode:			'click',
			position:		'bottom-center',
			offset:			10,
			stretch:		null,
			width:			null,
			height:			null,
			hoverDelay:		150,
			trapFocus:		false,
			closeOnScroll:	true,
			closeOnResize:	false,
		};

		super({
			...defaults,
			...options,
			element,
			deck,
			name: element.classList.contains('dropdown') ? 'dropdown' : 'drop',
		});

		this.anchorName		= `--anchor-${this.dci}`;
		this.containerName	= `--container-${this.dci}`;

		this.toggle				= null;
		this.container			= null;
		this.submenus			= [];
		this._hoverTimer		= null;
		this._scrollObserver	= null;
		this._portalPlaceholder	= null;

		/** Whether this drop is using popover="manual" (no light-dismiss). */
		this._isManual = element.getAttribute('popover') === 'manual';

		/** Inert targets set by focus trap — cleared on close. */
		this._inertTargets = [];

		/** All bound handlers keyed by name for precise removal. */
		this._h = {};

		this.#setup();
		this.initEvents();
	}


	// =========================================================================
	// SETUP
	// =========================================================================

	#setup() {

		// ── Resolve toggle ───────────────────────────────────────────────────
		const explicitSelector = this.element.dataset.dropToggle || this.target;

		if (explicitSelector) {
			this.toggle = document.querySelector(explicitSelector);

		} else if (this.element.id) {
			this.toggle = document.querySelector(`[aria-controls="${this.element.id}"]`);
		}

		if (!this.toggle) this.toggle = this.element.previousElementSibling;

		if (!this.toggle) {
			this.log(`Drop [${this.dci}]: no toggle found — not interactive.`, 'warn');
			return;
		}

		this.element.setAttribute('data-managed-popover', 'true');


		// ── Detect / set popover mode ──────────────────────────────────────────

		if (!this.element.hasAttribute('popover')) {
			this.element.setAttribute('popover', 'auto');
		}

		this._isManual = this.element.getAttribute('popover') === 'manual';

		// Mark manual popover for SCSS rule — relaxes the hard-kill override
		if (this._isManual) {
			this.element.setAttribute('data-manual-popover', '');
		}


		// ── Portal to <body> ───────────────────────────────────────────────────
		// Ancestors with backface-visibility:hidden, transform, filter, or
		// will-change create stacking contexts that block top-layer promotion
		// in Chrome. Moving to <body> eliminates all ancestor stacking contexts.
		//
		// CSS Anchor Positioning works across DOM positions — the anchor
		// resolves from the toggle's rendered position, not DOM ancestry.

		if (this.element.parentElement !== document.body) {
			this._portalPlaceholder = document.createComment(`drop:${this.dci}`);
			this.element.parentNode.insertBefore(this._portalPlaceholder, this.element);
			document.body.appendChild(this.element);
		}


		// ── CSS Anchor bridge ──────────────────────────────────────────────────
		this.toggle.style.anchorName = this.anchorName;
		this.element.style.setProperty('--anchor-id', this.anchorName);


		// ── Stable element ID ──────────────────────────────────────────────────
		if (!this.element.id) this.element.id = `drop-${this.dci}`;


		// ── ARIA ───────────────────────────────────────────────────────────────
		this.toggle.setAttribute('aria-controls', this.element.id);
		this.toggle.setAttribute('aria-haspopup', 'true');
		this.toggle.setAttribute('aria-expanded', 'false');


		// ── Position ──────────────────────––––––––─────────────────────────────
		// data-position may be on the drop element (canonical) OR the toggle
		// (author convenience). Drop element takes priority.

		const position = this.element.getAttribute('data-position')
			|| this.toggle.getAttribute('data-position');

		if (position) this.position = position;
		this.element.setAttribute('data-position', this.position);


		// ── Offset → --drop-spacing ─────────────────────────────────────────────

		this.element.style.setProperty('--drop-spacing', `${this.offset}px`);


		// ── Dropbar / stretch ───────────────────────────────────────────────────
		// closest() searches from the placeholder's parent (original position),
		// not from the portalled element which is now on <body>.

		if (this.stretch || this.element.classList.contains('drop-dropbar')
						 || this.element.classList.contains('dropdown-dropbar')) {

			const selector  = typeof this.stretch === 'string' ? this.stretch : '.dropnav';
			const searchRoot = this._portalPlaceholder?.parentElement ?? this.element;
			this.container   = searchRoot.closest(selector);

			if (this.container) {
				this.container.style.anchorName = this.containerName;
				this.element.style.setProperty('--container-id', this.containerName);
				this.element.classList.add('drop-dropbar');
			}
		}


		// ── Sizing ───────────────────────────────────––––––––––────────────────

		if (this.width === 'match') {
			this.element.classList.add('drop-stretch');
		} else if (this.width) {
			this.element.style.width = this.width;
		}

		if (this.height) this.element.style.height = this.height;


		// ── Submenus ──────────────────–––––––––─────────────────────────────────

		this.#initSubmenus();

		if (!SUPPORTS_ANCHOR) {
			this.log('Drop: CSS Anchor Positioning not supported. JS fallback active.', 'log');
		}
	}


	// =========================================================================
	// EVENTS
	// =========================================================================

	initEvents() {
		if (!this.toggle) return;

		// ── Interaction mode ──────────────────–––─────────────────────────────────

		if (this.mode === 'click') {

			this._h.click = (e) => {
				// Do NOT stopPropagation.
				// popover="auto" light-dismiss depends on document-level click
				// events. Stopping them causes Chrome to open then immediately
				// close the popover in the same event tick.
				const isNavLink = e.currentTarget.tagName === 'A'
					&& e.currentTarget.getAttribute('href')
					&& e.currentTarget.getAttribute('href') !== '#';

				if (!isNavLink) e.preventDefault();
				this.toggleDrop();
			};

			this.toggle.addEventListener('click', this._h.click);

		} else if (this.mode === 'hover') {

			this._h.toggleEnter = () => this.show();
			this._h.toggleLeave = () => this._scheduleHide();
			this._h.dropEnter   = () => this._cancelHide();
			this._h.dropLeave   = () => this._scheduleHide();

			this.toggle.addEventListener('mouseenter', this._h.toggleEnter);
			this.toggle.addEventListener('mouseleave', this._h.toggleLeave);
			this.element.addEventListener('mouseenter', this._h.dropEnter);
			this.element.addEventListener('mouseleave', this._h.dropLeave);

			// Touch: first tap opens; second tap navigates naturally
			this._h.touch = (e) => {
				if (!this.isOpen()) { e.preventDefault(); this.show(); }
			};
			this.toggle.addEventListener('touchstart', this._h.touch, { passive: false });
		}


		// ── Popover toggle event ──────────────────–––––––––──────────────────────────

		this._h.popoverToggle = (e) => {
			const open = e.newState === 'open';
			this.#syncAria(open);
			this.#syncIcon(open);
			open ? this.#onOpen() : this.#onClose();
			this.dispatchEvent(open ? 'open' : 'close', { self: this }, true);
		};
		this.element.addEventListener('toggle', this._h.popoverToggle);


		// ── Keyboard ──────────────────–––––––––──────––––––───────────────────────────

		this._h.keydown = (e) => this.#onKeydown(e);
		this.toggle.addEventListener('keydown',  this._h.keydown);
		this.element.addEventListener('keydown', this._h.keydown);


		// ── Window-level ──────────────────–––––––––───–––──────────────────────────────

		if (this.closeOnResize) {
			this._h.resize = () => { if (this.isOpen()) this.hide(); };
			window.addEventListener('resize', this._h.resize, { passive: true });
		}
	}


	// =========================================================================
	// PUBLIC API
	// =========================================================================

	toggleDrop() { this.isOpen() ? this.hide() : this.show(); }

	show() {
		this._cancelHide();
		if (this.isOpen()) return;
		if (!SUPPORTS_ANCHOR) this.#legacyPosition();
		this.element.showPopover();
	}

	hide() {
		if (!this.isOpen()) return;
		this.submenus.forEach(s => s.hide());
		this.element.hidePopover();
	}

	isOpen() {
		try   { return this.element.matches(':popover-open'); }
		catch { return this.element.classList.contains('open'); }
	}


	// =========================================================================
	// LIFECYCLE
	// =========================================================================

	#onOpen() {
		if (this.trapFocus) this.#trapFocusOn();
		if (this.closeOnScroll) this.#startScrollWatch();
	}

	#onClose() {
		this.#trapFocusOff();

		// Return focus to toggle only if it came from inside the drop (WCAG §3.2.2)
		if (this.toggle && this.element.contains(document.activeElement)) {
			this.toggle.focus({ preventScroll: true });
		}

		this.#stopScrollWatch();
	}


	// =========================================================================
	// FOCUS TRAP  (inert-based — modern, robust)
	// =========================================================================
	// The modern, accessible approach: mark everything outside the drop as
	// `inert`. The browser then natively excludes inert subtrees from the tab
	// order and from AT announcement — no event interception needed.
	//
	// Fallback: if `inert` is not supported, a keydown Tab intercept is used.

	#trapFocusOn() {
		if (!SUPPORTS_INERT) {
			// Fallback — intercept Tab inside the popover
			this._h.trapTab = (e) => {
				if (e.key !== 'Tab') return;
				e.preventDefault();
				e.shiftKey ? this.#focusPrev(e.target) : this.#focusNext(e.target);
			};
			this.element.addEventListener('keydown', this._h.trapTab);
			requestAnimationFrame(() => this.#focusFirst());
			return;
		}

		// Mark all direct children of <body> as inert, except the drop itself.
		// We mark only body's direct children (not the whole subtree) to avoid
		// touching deeply nested elements that may have their own inert state.
		this._inertTargets = [];

		Array.from(document.body.children).forEach(child => {
			if (child === this.element) return;
			if (child.inert) return;            // already inert — don't touch it
			child.inert = true;
			this._inertTargets.push(child);
		});

		requestAnimationFrame(() => this.#focusFirst());
	}

	#trapFocusOff() {
		// Restore inert state
		this._inertTargets.forEach(el => { el.inert = false; });
		this._inertTargets = [];

		// Remove fallback listener if it was used
		if (this._h.trapTab) {
			this.element.removeEventListener('keydown', this._h.trapTab);
			delete this._h.trapTab;
		}
	}


	// =========================================================================
	// KEYBOARD NAVIGATION
	// =========================================================================

	#onKeydown(e) {
		const inToggle	= e.target === this.toggle || this.toggle.contains(e.target);
		const inDrop	= this.element.contains(e.target);
		const open		= this.isOpen();

		switch (e.key) {

			case 'Enter': case ' ':
				if (inToggle && !open) {
					e.preventDefault();
					this.show();
					requestAnimationFrame(() => this.#focusFirst());
				}
				break;

			case 'ArrowDown':
				e.preventDefault();
				if (inToggle && !open) { this.show(); requestAnimationFrame(() => this.#focusFirst()); }
				else if (inDrop)       this.#focusNext(e.target);
				break;

			case 'ArrowUp':
				e.preventDefault();
				if (inToggle && !open) { this.show(); requestAnimationFrame(() => this.#focusLast()); }
				else if (inDrop)       this.#focusPrev(e.target);
				break;

			case 'Home': if (inDrop) { e.preventDefault(); this.#focusFirst(); } break;
			case 'End':  if (inDrop) { e.preventDefault(); this.#focusLast();  } break;

			case 'Escape':
				if (open) {
					e.preventDefault();
					e.stopPropagation();    // prevent parent drops closing too
					this.hide();
					this.toggle.focus({ preventScroll: true });
				}
				break;

			case 'Tab':
				// With inert trap, Tab is handled natively by the browser.
				// Without inert (fallback), this.#_h.trapTab handles it.
				// In non-trap mode, close on Tab so focus flows naturally.
				if (open && !this.trapFocus) this.hide();
				break;
		}
	}


	// =========================================================================
	// FOCUS HELPERS
	// =========================================================================

	#focusable() {
		return [...this.element.querySelectorAll(FOCUSABLE)]
			.filter(el => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]'));
	}

	#focusFirst() {
		this.#focusable()[0]?.focus({ preventScroll: true });
	}

	#focusLast() {
		this.#focusable().at(-1)?.focus({ preventScroll: true });
	}

	#focusNext(current) {
		const f   = this.#focusable();
		const idx = f.indexOf(current);
		// Explicit wrap: (idx + 1) % length — no ambiguity
		f[(idx + 1) % f.length]?.focus({ preventScroll: true });
	}

	#focusPrev(current) {
		const f   = this.#focusable();
		const idx = f.indexOf(current);
		// Explicit wrap: add length before modulo so -1 becomes last index
		f[(idx - 1 + f.length) % f.length]?.focus({ preventScroll: true });
	}


	// =========================================================================
	// ARIA + ICON SYNC
	// =========================================================================

	#syncAria(open) {
		this.toggle.setAttribute('aria-expanded', String(open));
	}

	// Handles inline SVG — icon fonts are handled by CSS [aria-expanded] rule
	#syncIcon(open) {
		const svg = this.toggle.querySelector('svg');
		if (!svg) return;
		svg.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)';
		// Clear inline transform on close so CSS [aria-expanded] rule takes over
		svg.style.transform  = open ? 'rotate(180deg)' : '';
	}


	// =========================================================================
	// SCROLL CLOSE  (IntersectionObserver)
	// =========================================================================

	#startScrollWatch() {
		if (!this.toggle || this._scrollObserver) return;

		if ('IntersectionObserver' in window) {
			this._scrollObserver = new IntersectionObserver(
				([entry]) => { if (!entry.isIntersecting && this.isOpen()) this.hide(); },
				{ threshold: 0 }
			);
			this._scrollObserver.observe(this.toggle);

		} else {
			this._h.scrollFallback = () => { if (this.isOpen()) this.hide(); };
			window.addEventListener('scroll', this._h.scrollFallback, { passive: true });
		}
	}

	#stopScrollWatch() {
		if (this._scrollObserver) {
			this._scrollObserver.disconnect();
			this._scrollObserver = null;
		}
		if (this._h.scrollFallback) {
			window.removeEventListener('scroll', this._h.scrollFallback);
			delete this._h.scrollFallback;
		}
	}


	// =========================================================================
	// SUBMENUS
	// =========================================================================

	#initSubmenus() {
		this.element
			.querySelectorAll('[aria-haspopup="true"][data-drop-submenu]')
			.forEach(trigger => {
				const sel = trigger.dataset.dropSubmenu
					|| trigger.getAttribute('aria-controls');
				if (!sel) return;

				const el = sel.startsWith('#')
					? document.querySelector(sel)
					: document.getElementById(sel);
				if (!el) return;

				const sub = new Drop(el, {
					mode:			this.mode === 'hover' ? 'hover' : 'click',
					position:		'right-center',
					offset:			this.offset,
					closeOnScroll:	this.closeOnScroll,
				}, this.deck);

				sub.element.classList.add('drop-submenu');
				this.submenus.push(sub);

				el.addEventListener('toggle', (e) => {
					if (e.newState !== 'open') return;
					this.submenus.forEach(s => { if (s !== sub && s.isOpen()) s.hide(); });
				});
			});
	}


	// =========================================================================
	// LEGACY POSITIONING
	// =========================================================================

	#legacyPosition() {
		const tr = this.toggle.getBoundingClientRect();
		const sx = window.scrollX, sy = window.scrollY;
		const vw = window.innerWidth, vh = window.innerHeight;
		const dw = this.element.offsetWidth  || 300;
		const dh = this.element.offsetHeight || 200;
		const o  = this.offset;
		const [vp, hp] = this.position.split('-');

		let top, left;

		if		(vp === 'top')						top = tr.top	+ sy - dh - o;
		else if	(vp === 'left' || vp === 'right')	top = tr.top	+ sy + (tr.height - dh) / 2;
		else										top = tr.bottom	+ sy + o;

		if		(hp === 'left'  || hp === 'start')	left = tr.left  + sx;
		else if	(hp === 'right' || hp === 'end')	left = tr.right + sx - dw;
		else										left = tr.left  + sx + (tr.width - dw) / 2;

		if (vp === 'left')  { left = tr.left  + sx - dw - o; top = tr.top + sy + (tr.height - dh) / 2; }
		if (vp === 'right') { left = tr.right + sx + o;      top = tr.top + sy + (tr.height - dh) / 2; }

		// Clamp to viewport
		left = Math.max(sx + 8, Math.min(left, sx + vw - dw - 8));
		top  = (top + dh > sy + vh - 8) ? tr.top + sy - dh - o : top;
		top  = Math.max(sy + 8, top);

		Object.assign(this.element.style, {
			top:  `${Math.round(top)}px`,
			left: `${Math.round(left)}px`,
		});
		this.element.classList.add('open');
	}


	// =========================================================================
	// HOVER HELPERS
	// =========================================================================

	_scheduleHide() {
		this._cancelHide();
		this._hoverTimer = setTimeout(() => this.hide(), this.hoverDelay);
	}

	_cancelHide() {
		clearTimeout(this._hoverTimer);
		this._hoverTimer = null;
	}


	// =========================================================================
	// DESTROY
	// =========================================================================
	// SPA-safe: all DOM operations are guarded with isConnected / optional
	// chaining so that partial unmounts (route changes that wipe DOM before
	// destroy() is called) don't throw.

	destroy() {
		// Close silently — hidePopover() may throw if element is already detached
		try { this.hide(); } catch { /* detached — ignore */ }

		// Ensure focus trap is released even if close didn't fire
		this.#trapFocusOff();
		this.#stopScrollWatch();

		// ── Event listeners ───────────────────────────────────────────────────

		const te = this.toggle;
		const el = this.element;

		if (te) {
			te.removeEventListener('click',			this._h.click);
			te.removeEventListener('mouseenter',	this._h.toggleEnter);
			te.removeEventListener('mouseleave',	this._h.toggleLeave);
			te.removeEventListener('touchstart',	this._h.touch);
			te.removeEventListener('keydown',		this._h.keydown);
		}

		if (el) {
			el.removeEventListener('toggle',		this._h.popoverToggle);
			el.removeEventListener('mouseenter',	this._h.dropEnter);
			el.removeEventListener('mouseleave',	this._h.dropLeave);
			el.removeEventListener('keydown',		this._h.keydown);
		}

		window.removeEventListener('resize', this._h.resize);

		// ── CSS anchor cleanup ────────────────────────────────────────────────

		if (te) {
			te.style.removeProperty('anchor-name');
			te.removeAttribute('aria-expanded');
			te.removeAttribute('aria-controls');
			te.removeAttribute('aria-haspopup');
		}

		if (this.container?.isConnected) {
			this.container.style.removeProperty('anchor-name');
		}

		if (el?.isConnected) {
			el.style.removeProperty('--anchor-id');
			el.style.removeProperty('--container-id');
			el.style.removeProperty('--drop-spacing');
			el.removeAttribute('data-managed-popover');
			el.removeAttribute('data-manual-popover');
		}

		// Portal cleanup
		// –––––––––––––––––– 
		// Restore element to its original DOM position.
		// Guarded: placeholder or its parent may already be gone in SPA teardown.

		try {
			if (this._portalPlaceholder?.isConnected && el?.isConnected) {
				this._portalPlaceholder.parentNode.insertBefore(
					el,
					this._portalPlaceholder
				);
			}
			this._portalPlaceholder?.remove();
		} catch {
			// Parent was already removed — leave element where it is
		}

		this._portalPlaceholder = null;

		// Submenus
		// –––––––––––––––––– 

		this.submenus.forEach(s => s.destroy());
		this.submenus = [];

		super.destroy();
	}
}

export default Drop;