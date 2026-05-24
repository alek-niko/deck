/**
 * =============================================================================
 * TOGGLE MANAGER
 * @module js.ui.toggle.manager
 * -----------------------------------------------------------------------------
 * Handles toggling behavior across the application. Supports:
 * 	- Class toggling on target elements
 * 	- Native <dialog> open/close via the platform API
 * 	- Visibility toggling via the hidden attribute (fallback)
 * 	- Toggle groups (only one open at a time)
 * 	- Delegated click handling for performance and dynamic DOM support
 *
 * HTML API:
 * 	- data-toggle="#target"				- target selector (required)
 * 	- data-toggle-cls="is-open"			- class to toggle (optional)
 * 	- data-toggle-group="group-name"	- mutual exclusion group (optional)
 * 	- data-toggle-outside="true"		- close when clicking outside (optional)
 *
 * Notes:
 * 	- No Component inheritance — Toggle is a behavior, not an entity
 * 	- All cleanup is automatic via WeakMap (no memory leaks)
 * 	- Safe to call init() multiple times (duplicate guard included)
 * =============================================================================
 */

/**
 * @class ToggleManager
 * @description
 * System-level toggle controller responsible for:
 *	- Scanning the DOM for [data-toggle] triggers
 * 	- Delegated click handling
 * 	- Toggle group management (accordion-style mutual exclusion)
 * 	- Outside-click dismissal
 * 	- Dynamic DOM support via reinit()
 */
class ToggleManager {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** Tracks which triggers are already initialized. WeakSet — no memory leaks. */
	#initialized = new WeakSet();

	/** Currently open targets per group. Map<groupName, Set<HTMLElement>> */
	#groups = new Map();

	/** Whether the outside-click document listener is active. */
	#outsideListenerActive = false;

	/** Bound handler references for clean removeEventListener. */
	#onBodyClick	= null;
	#onOutsideClick	= null;


	// =========================================================================
    // CONSTRUCTOR
    // =========================================================================
	// @param {Object} ui - Shared UI/system reference.

	constructor(ui) {
		this.ui = ui;

		// Bound handler references — required for proper removeEventListener.
		this.#onBodyClick		= this.#handleBodyClick.bind(this);
        this.#onOutsideClick	= this.#handleOutsideClick.bind(this);

		this.init();
	}

	// =========================================================================
	// PUBLIC API
	// =========================================================================

	/**
	 * -------------------------------------------------------------------------
	 * Initialize Toggle System
	 * -------------------------------------------------------------------------
	 * Scans for [data-toggle] triggers and attaches delegated body listener.
	 * Safe to call multiple times — duplicate guard is built in.
	 * -------------------------------------------------------------------------
	 */
	init() {
        this.#setup();

		// Single delegated listener on body — handles all current and future toggles.
        document.body.addEventListener('click', this.#onBodyClick);
    }

	/**
	 * -------------------------------------------------------------------------
	 * Re-initialize
	 * -------------------------------------------------------------------------
	 * Call after dynamic HTML injection (AJAX, HTMX, etc.) to register
	 * new [data-toggle] triggers without re-attaching body listeners.
	 *
	 * @param {HTMLElement|Document} [container=document]
	 * -------------------------------------------------------------------------
	 */
	reinit(container = document) {
        this.#setup(container);
    }

	/**
	 * -------------------------------------------------------------------------
	 * Open
	 * -------------------------------------------------------------------------
	 * Programmatically open a target element.
	 *
	 * @param {HTMLElement} target
	 * @param {string} [cls]
	 * -------------------------------------------------------------------------
	 */
	open(target, cls) {
		if (cls) {
			target.classList.add(cls);
			return;
		}
		if (target instanceof HTMLDialogElement) {
			target.showModal();
			return;
		}
		target.hidden = false;
	}

	/**
	 * -------------------------------------------------------------------------
	 * Close
	 * -------------------------------------------------------------------------
	 * Programmatically close a target element.
	 *
	 * @param {HTMLElement} target
	 * @param {string} [cls]
	 * -------------------------------------------------------------------------
	 */
	close(target, cls) {
		if (cls) {
			target.classList.remove(cls);
			return;
		}
		if (target instanceof HTMLDialogElement) {
			target.close();
			return;
		}
		target.hidden = true;
	}

	/**
	 * -------------------------------------------------------------------------
	 * Toggle
	 * -------------------------------------------------------------------------
	 * Programmatically toggle a target element.
	 * Respects group logic if a group name is provided.
	 *
	 * @param {HTMLElement} target
	 * @param {string} [cls]
	 * @param {string} [group]
	 * -------------------------------------------------------------------------
	 */
	toggle(target, cls, group) {
        const isOpen = this.#isOpen(target, cls);
 
        if (group) {
            this.#handleGroup(target, cls, group, !isOpen);

        } else {
            isOpen ? this.close(target, cls) : this.open(target, cls);
        }
    }

	/**
	 * -------------------------------------------------------------------------
	 * Destroy
	 * -------------------------------------------------------------------------
	 * Removes all body-level listeners. Call when tearing down the application.
	 * -------------------------------------------------------------------------
	 */
	destroy() {
        document.body.removeEventListener('click', this.#onBodyClick);
        document.removeEventListener('click', this.#onOutsideClick);
        this.#groups.clear();
        this.#outsideListenerActive = false;
    }

	// =========================================================================
	// PRIVATE METHODS
	// =========================================================================

	/**
	 * -------------------------------------------------------------------------
	 * Setup
	 * -------------------------------------------------------------------------
	 * Scans container for [data-toggle] triggers.
	 * Marks each as initialized to prevent duplicate processing.
	 * Registers outside-click listener when data-toggle-outside is present.
	 *
	 * @param {HTMLElement|Document} [container=document]
	 * -------------------------------------------------------------------------
	 */
	#setup(container = document) {
		const triggers = container.querySelectorAll('[data-toggle]');

		triggers.forEach(trigger => {
			if (this.#initialized.has(trigger)) return;
			this.#initialized.add(trigger);

			// Wire outside-click dismissal if requested.
			if (trigger.dataset.toggleOutside === 'true') {
				// Lazily attach one document-level outside-click listener.
				if (!this._outsideListenerActive) {
					document.addEventListener('click', this.#onOutsideClick);
					this.#outsideListenerActive = true;
				}
			}
		});
    }

	/**
	 * -------------------------------------------------------------------------
	 * Body Click Handler (Delegated)
	 * -------------------------------------------------------------------------
	 * Single entry point for all toggle interactions.
	 * Walks up from the clicked element to find the nearest [data-toggle] trigger.
	 *
	 * @param {MouseEvent} event
	 * -------------------------------------------------------------------------
	 */
	#handleBodyClick(event) {
        const trigger = event.target.closest('[data-toggle]');
        if (!trigger) return;
 
		// Prevent default for anchor triggers.
        if (trigger.tagName === 'A') event.preventDefault();
        event.stopPropagation();
 
        const selector = trigger.dataset.toggle || trigger.getAttribute('href');
        if (!selector) return;
 
        const cls	= trigger.dataset.toggleCls		|| null;
        const group	= trigger.dataset.toggleGroup	|| null;
 
        const targets = document.querySelectorAll(selector);
        if (!targets.length) return;
 
        targets.forEach(target => this.toggle(target, cls, group));
    }

	/**
	 * -------------------------------------------------------------------------
	 * Outside Click Handler
	 * -------------------------------------------------------------------------
	 * Closes any open toggle whose trigger has data-toggle-outside="true"
	 * when the user clicks outside both the trigger and the target.
	 *
	 * @param {MouseEvent} event
	 * -------------------------------------------------------------------------
	 */
	#handleOutsideClick(event) {
		const outsideTriggers = document.querySelectorAll(
			'[data-toggle][data-toggle-outside="true"]'
		);

		outsideTriggers.forEach(trigger => {
			const selector = trigger.dataset.toggle
				|| trigger.getAttribute('href');

			if (!selector) return;

			const targets = document.querySelectorAll(selector);
			const cls     = trigger.dataset.toggleCls || null;

			targets.forEach(target => {
				if (!this._isOpen(target, cls)) return;

				// Close only if click was outside both trigger and target.
				const clickedInsideTrigger = trigger.contains(event.target);
				const clickedInsideTarget  = target.contains(event.target);

				if (!clickedInsideTrigger && !clickedInsideTarget) {
					this.close(target, cls);
				}
			});
		});
	}

	/**
	 * -------------------------------------------------------------------------
	 * Handle Group Logic
	 * -------------------------------------------------------------------------
	 * Implements mutual exclusion: closing all other open targets in the group
	 * before opening the requested one (accordion-style).
	 *
	 * @param {HTMLElement} target
	 * @param {string|null} cls
	 * @param {string} group
	 * @param {boolean} opening   - true = we want to open, false = closing
	 * -------------------------------------------------------------------------
	 */
	#handleGroup(target, cls, group, opening) {
        if (!this.#groups.has(group)) {
            this.#groups.set(group, new Set());
        }
 
        const openTargets = this.#groups.get(group);
 
        if (opening) {
            openTargets.forEach(openTarget => {
                if (openTarget !== target) {
                    this.close(openTarget, cls);
                    openTargets.delete(openTarget);
                }
            });
            this.open(target, cls);
            openTargets.add(target);
        } else {
            this.close(target, cls);
            openTargets.delete(target);
        }
    }

	/**
	 * -------------------------------------------------------------------------
	 * Is Open
	 * -------------------------------------------------------------------------
	 * Determines the current open/closed state of a target element.
	 *
	 * @param {HTMLElement} target
	 * @param {string|null} cls
	 * @returns {boolean}
	 * -------------------------------------------------------------------------
	 */
	#isOpen(target, cls) {
        if (target instanceof HTMLDialogElement) return target.open;
        if (cls) return target.classList.contains(cls);
        return !target.hidden;
    }
}

export default ToggleManager;