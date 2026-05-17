/**
 * @module js.components.drop-manager
 * @description Event-delegated manager for high-volume drop scenarios.
 *
 * When to use :
 *	Drop (instance-per-element)		— nav bars, toolbars, <~20 drops per page
 *	DropManager (one per container)	— social feeds, comment lists, data tables
 *
 * ── HTML contract ─────────────────────────────────────────────────────────────
 *
 * Container: any element. Register with the Deck or instantiate directly.
 *
 * Triggers: elements inside the container with [data-drop-trigger].
 *	<button data-drop-trigger data-position="bottom-right" data-post-id="123">
 *		•••
 *	</button>
 *
 * Content source — pick one per manager instance:
 *
 *	a) Inline per trigger (data-drop-content, HTML string):
 *		<button data-drop-trigger data-drop-content="<ul class='drop-nav'>…</ul>">
 *
 *	b) Shared template (one element for all triggers):
 *		new DropManager(el, { template: '#post-options-menu' })
 *
 *	c) Dynamic / async (different content per trigger):
 *		new DropManager(el, {
 *			onContent: async (trigger) => {
 *				const data = await fetch(`/api/post/${trigger.dataset.postId}/options`);
 *				return data.text();   // return HTML string or HTMLElement
 *			}
 *		})
 *
 * Role: set data-drop-role on the trigger to control popover ARIA role.
 *	data-drop-role="menu"		— nav list (default when .drop-nav is present)
 *	data-drop-role="dialog"		— form or rich content
 *	data-drop-role="listbox"	— option list
 *	(omit)						— no role set (generic container)
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *	const manager = new DropManager(feedElement, {
 *		position: 'bottom-right',
 *		onContent: async (trigger) => renderPostOptions(trigger.dataset.postId),
 *	});
 *
 *	manager.destroy();	// on unmount
 *
 * @extends Component
 */

import Component from './component.js';


// =============================================================================
// CONSTANTS
// =============================================================================

const FOCUSABLE = [
	'a[href]:not([disabled]):not([aria-disabled="true"])',
	'button:not([disabled]):not([aria-disabled="true"])',
	'input:not([disabled]):not([aria-disabled="true"])',
	'select:not([disabled]):not([aria-disabled="true"])',
	'textarea:not([disabled]):not([aria-disabled="true"])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

const SUPPORTS_ANCHOR = CSS.supports('position-area', 'top');
const SUPPORTS_INERT  = 'inert' in HTMLElement.prototype;

const TRIGGER_ATTR = 'data-drop-trigger';


// =============================================================================
// DROP MANAGER
// =============================================================================

class DropManager extends Component {

	/**
	 * @param {HTMLElement}  container
	 * @param {Object}       [options={}]
	 * @param {Object|null}  [deck=null]
	 *
	 * ── Options ────────────────────────────────────────────────────────────────
	 * position      string        Default anchor position.           'bottom-center'
	 * template      string|null   CSS selector for shared template.  null
	 * offset        number        Toggle ↔ drop gap px.              10
	 * hoverDelay    number        Hover hide delay ms.               150
	 * closeOnScroll boolean       Close on trigger scroll-out.       true
	 * trapFocus     boolean       Trap focus inside drop.            false
	 * onContent     Function|null Async content callback.            null
	 *   Signature: async (triggerElement: HTMLElement) => string | HTMLElement
	 * ───────────────────────────────────────────────────────────────────────────
	 */
	constructor(container, options = {}, deck = null) {

		const defaults = {
			position:      'bottom-center',
			template:      null,
			offset:        10,
			hoverDelay:    150,
			closeOnScroll: true,
			trapFocus:     false,
			onContent:     null,
		};

		super({
			...defaults,
			...options,
			element: container,       // Component uses container as its element
			deck,
			name: 'drop-manager',
		});

		this.container     = container;
		this.anchorName    = `--anchor-${this.dci}`;

		/** The single reused popover element. */
		this._popover      = null;

		/** The trigger that most recently opened the popover. */
		this._activeTrigger = null;

		/** Generation counter — incremented on each open() call.
		 *  Async content callbacks check their captured generation against this;
		 *  if mismatched, the result is stale and discarded. */
		this._generation   = 0;

		this._scrollObserver = null;
		this._inertTargets   = [];
		this._h              = {};

		this.#createPopover();
		this.#initEvents();
	}


	// =========================================================================
	// POPOVER CREATION
	// =========================================================================

	#createPopover() {
		this._popover = document.createElement('div');
		this._popover.id        = `drop-manager-${this.dci}`;
		this._popover.className = 'drop';
		this._popover.setAttribute('popover', 'auto');
		this._popover.setAttribute('data-position', this.position);
		this._popover.setAttribute('data-managed-popover', 'true');

		this._popover.style.setProperty('--anchor-id',    this.anchorName);
		this._popover.style.setProperty('--drop-spacing', `${this.offset}px`);

		document.body.appendChild(this._popover);

		// Popover lifecycle
		this._h.popoverToggle = (e) => {
			const open = e.newState === 'open';
			open ? this.#onOpen() : this.#onClose();
			this.dispatchEvent(open ? 'open' : 'close', {
				trigger: this._activeTrigger,
				self:    this,
			}, true);
		};
		this._popover.addEventListener('toggle', this._h.popoverToggle);

		// Keyboard navigation inside popover
		this._h.keydown = (e) => this.#onKeydown(e);
		this._popover.addEventListener('keydown', this._h.keydown);
	}


	// =========================================================================
	// EVENTS  (delegated)
	// =========================================================================

	#initEvents() {

		// ── Click delegation ──────────────────────────────────────────────────

		this._h.containerClick = (e) => {
			const trigger = e.target.closest(`[${TRIGGER_ATTR}]`);
			if (!trigger || !this.container.contains(trigger)) return;

			const isNavLink = trigger.tagName === 'A'
				&& trigger.getAttribute('href')
				&& trigger.getAttribute('href') !== '#';
			if (!isNavLink) e.preventDefault();

			// Toggle: if same trigger clicked while open → close
			if (this._activeTrigger === trigger && this.isOpen()) {
				this.hide();
			} else {
				this.open(trigger);
			}
		};
		this.container.addEventListener('click', this._h.containerClick);


		// ── Keyboard: open from trigger ───────────────────────────────────────

		this._h.containerKeydown = (e) => {
			const trigger = e.target.closest(`[${TRIGGER_ATTR}]`);
			if (!trigger || this.isOpen()) return;

			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				this.open(trigger);
				requestAnimationFrame(() => this.#focusFirst());
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				this.open(trigger);
				requestAnimationFrame(() => this.#focusFirst());
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				this.open(trigger);
				requestAnimationFrame(() => this.#focusLast());
			}
		};
		this.container.addEventListener('keydown', this._h.containerKeydown);
	}


	// =========================================================================
	// PUBLIC API
	// =========================================================================

	/**
	 * Open the shared popover for a specific trigger.
	 *
	 * Handles anchor transfer, content loading (inline / template / async),
	 * ARIA role, and position. Async loads use a generation counter to discard
	 * stale results if the user opens a different trigger before fetch resolves.
	 *
	 * @param {HTMLElement} trigger
	 */
	async open(trigger) {

		// ── Transfer anchor ───────────────────────────────────────────────────

		if (this._activeTrigger && this._activeTrigger !== trigger) {
			this._activeTrigger.style.removeProperty('anchor-name');
			this._activeTrigger.removeAttribute('aria-expanded');
			this._activeTrigger.removeAttribute('aria-controls');
			// Keep aria-haspopup — it's a persistent capability indicator
		}

		this._activeTrigger = trigger;
		trigger.style.anchorName = this.anchorName;
		trigger.setAttribute('aria-expanded', 'true');
		trigger.setAttribute('aria-controls', this._popover.id);
		trigger.setAttribute('aria-haspopup', 'true');

		// ── Position ──────────────────────────────────────────────────────────

		const position = trigger.getAttribute('data-position') || this.position;
		this._popover.setAttribute('data-position', position);

		// ── Generation counter — race condition guard ──────────────────────────
		//
		// Each open() call gets a unique generation number.
		// If the user clicks a second trigger before the first async fetch
		// resolves, this._generation will have incremented. The first fetch
		// checks its captured myGen against this._generation; if they differ,
		// the result is stale and is silently dropped.

		const myGen = ++this._generation;


		// ── Load content ──────────────────────────────────────────────────────

		const inlineContent = trigger.dataset.dropContent;

		if (inlineContent) {
			// a) Inline HTML on the trigger element
			this._popover.innerHTML = inlineContent;

		} else if (this.template) {
			// b) Shared template element — cloned each time
			const tmpl = document.querySelector(this.template);
			if (tmpl) {
				this._popover.innerHTML = '';
				this._popover.appendChild(
					tmpl.tagName === 'TEMPLATE'
						? tmpl.content.cloneNode(true)
						: tmpl.cloneNode(true)
				);
			}

		} else if (typeof this.onContent === 'function') {
			// c) Async / dynamic content
			//
			// Show a loading state immediately so the popover has size
			// and the user gets feedback. aria-busy signals AT to wait.
			this._popover.innerHTML = '<div class="drop-loading" aria-live="polite" aria-busy="true"></div>';

			// Show popover now so it appears instantly with the loading state
			if (!this.isOpen()) {
				if (!SUPPORTS_ANCHOR) this.#legacyPosition(trigger);
				this._popover.showPopover();
			}

			try {
				const result = await this.onContent(trigger);

				// ── Stale check ───────────────────────────────────────────────
				// If generation changed while we awaited, discard this result.
				if (myGen !== this._generation) return;

				if (typeof result === 'string') {
					this._popover.innerHTML = result;
				} else if (result instanceof HTMLElement || result instanceof DocumentFragment) {
					this._popover.innerHTML = '';
					this._popover.appendChild(result);
				}
			} catch (err) {
				if (myGen !== this._generation) return;
				this._popover.innerHTML = '<div class="drop-error" role="alert">Failed to load content.</div>';
				this.log(`DropManager: onContent error — ${err?.message}`, 'error');
			}

			// Content is now loaded — ARIA role is set below after innerHTML settled
		}


		// ── ARIA role ─────────────────────────────────────────────────────────
		//
		// Set a meaningful ARIA role on the popover based on:
		//   1. data-drop-role on the trigger (explicit override)
		//   2. Presence of .drop-nav inside the content (implies menu)
		//   3. No role (generic container)

		const explicitRole = trigger.getAttribute('data-drop-role');

		if (explicitRole) {
			this._popover.setAttribute('role', explicitRole);
		} else if (this._popover.querySelector('.drop-nav')) {
			this._popover.setAttribute('role', 'menu');
		} else {
			this._popover.removeAttribute('role');
		}


		// ── Show ──────────────────────────────────────────────────────────────

		if (!this.isOpen()) {
			if (!SUPPORTS_ANCHOR) this.#legacyPosition(trigger);
			this._popover.showPopover();
		}

		if (this.closeOnScroll) this.#startScrollWatch();
	}

	hide() {
		if (!this.isOpen()) return;
		this._popover.hidePopover();
	}

	isOpen() {
		try   { return this._popover.matches(':popover-open'); }
		catch { return this._popover.classList.contains('open'); }
	}


	// =========================================================================
	// LIFECYCLE
	// =========================================================================

	#onOpen() {
		if (this.trapFocus) this.#trapFocusOn();
	}

	#onClose() {
		this.#trapFocusOff();
		this.#stopScrollWatch();

		if (this._activeTrigger) {
			this._activeTrigger.setAttribute('aria-expanded', 'false');

			if (this._popover.contains(document.activeElement)) {
				this._activeTrigger.focus({ preventScroll: true });
			}
		}
	}


	// =========================================================================
	// FOCUS TRAP  (inert-based)
	// =========================================================================

	#trapFocusOn() {
		if (!SUPPORTS_INERT) {
			// Fallback Tab intercept
			this._h.trapTab = (e) => {
				if (e.key !== 'Tab') return;
				e.preventDefault();
				e.shiftKey ? this.#focusPrev(e.target) : this.#focusNext(e.target);
			};
			this._popover.addEventListener('keydown', this._h.trapTab);
			requestAnimationFrame(() => this.#focusFirst());
			return;
		}

		this._inertTargets = [];
		Array.from(document.body.children).forEach(child => {
			if (child === this._popover) return;
			if (child.inert) return;
			child.inert = true;
			this._inertTargets.push(child);
		});

		requestAnimationFrame(() => this.#focusFirst());
	}

	#trapFocusOff() {
		this._inertTargets.forEach(el => { el.inert = false; });
		this._inertTargets = [];

		if (this._h.trapTab) {
			this._popover.removeEventListener('keydown', this._h.trapTab);
			delete this._h.trapTab;
		}
	}


	// =========================================================================
	// KEYBOARD
	// =========================================================================

	#onKeydown(e) {
		switch (e.key) {

			case 'ArrowDown': e.preventDefault(); this.#focusNext(e.target); break;
			case 'ArrowUp':   e.preventDefault(); this.#focusPrev(e.target); break;
			case 'Home':      e.preventDefault(); this.#focusFirst();        break;
			case 'End':       e.preventDefault(); this.#focusLast();         break;

			case 'Escape':
				e.preventDefault();
				e.stopPropagation();
				this.hide();
				this._activeTrigger?.focus({ preventScroll: true });
				break;

			case 'Tab':
				if (!this.trapFocus) {
					this.hide();
				}
				break;
		}
	}

	#focusable()       { return [...this._popover.querySelectorAll(FOCUSABLE)].filter(el => !el.closest('[hidden]')); }
	#focusFirst()      { this.#focusable()[0]?.focus({ preventScroll: true }); }
	#focusLast()       { this.#focusable().at(-1)?.focus({ preventScroll: true }); }

	#focusNext(current) {
		const f = this.#focusable();
		f[(f.indexOf(current) + 1) % f.length]?.focus({ preventScroll: true });
	}

	#focusPrev(current) {
		const f = this.#focusable();
		// Explicit positive modulo — avoids sign ambiguity
		f[(f.indexOf(current) - 1 + f.length) % f.length]?.focus({ preventScroll: true });
	}


	// =========================================================================
	// SCROLL CLOSE
	// =========================================================================

	#startScrollWatch() {
		if (this._scrollObserver || !this._activeTrigger) return;

		if ('IntersectionObserver' in window) {
			this._scrollObserver = new IntersectionObserver(
				([entry]) => { if (!entry.isIntersecting && this.isOpen()) this.hide(); },
				{ threshold: 0 }
			);
			this._scrollObserver.observe(this._activeTrigger);
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
	// LEGACY POSITIONING
	// =========================================================================

	#legacyPosition(trigger) {
		const tr  = trigger.getBoundingClientRect();
		const sx  = window.scrollX, sy = window.scrollY;
		const dw  = this._popover.offsetWidth  || 200;
		const dh  = this._popover.offsetHeight || 150;
		const o   = this.offset;
		const pos = trigger.getAttribute('data-position') || this.position;
		const [vp, hp] = pos.split('-');

		let top  = vp === 'top'  ? tr.top + sy - dh - o : tr.bottom + sy + o;
		let left = hp === 'right' ? tr.right + sx - dw
				 : hp === 'left'  ? tr.left  + sx
				 : tr.left + sx + (tr.width - dw) / 2;

		left = Math.max(sx + 8, Math.min(left, sx + window.innerWidth  - dw - 8));
		top  = Math.max(sy + 8, Math.min(top,  sy + window.innerHeight - dh - 8));

		Object.assign(this._popover.style, {
			top:  `${Math.round(top)}px`,
			left: `${Math.round(left)}px`,
		});
		this._popover.classList.add('open');
	}


	// =========================================================================
	// DESTROY  (SPA-safe)
	// =========================================================================

	destroy() {
		// Cancel any in-flight async — increment generation so stale callbacks exit
		this._generation++;

		try { this.hide(); } catch { /* detached */ }

		this.#trapFocusOff();
		this.#stopScrollWatch();

		this.container.removeEventListener('click',   this._h.containerClick);
		this.container.removeEventListener('keydown', this._h.containerKeydown);

		if (this._popover) {
			this._popover.removeEventListener('toggle',  this._h.popoverToggle);
			this._popover.removeEventListener('keydown', this._h.keydown);
		}

		// Restore active trigger ARIA
		if (this._activeTrigger?.isConnected) {
			this._activeTrigger.style.removeProperty('anchor-name');
			this._activeTrigger.removeAttribute('aria-expanded');
			this._activeTrigger.removeAttribute('aria-controls');
			this._activeTrigger.removeAttribute('aria-haspopup');
		}

		// Remove the single shared popover
		try {
			if (this._popover?.isConnected) this._popover.remove();
		} catch { /* detached */ }

		this._popover       = null;
		this._activeTrigger = null;

		super.destroy();
	}
}


export default DropManager;