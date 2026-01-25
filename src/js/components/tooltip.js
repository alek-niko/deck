/**
 * @module tooltip
 * @description
 * Industry-standard singleton tooltip service using CSS Anchor & Popover API.
 * Optimized for performance, plain-text safety, and accessibility.
 *
 * Features:
 * - Singleton pattern: only one tooltip element exists
 * - Uses native CSS anchor positioning and popover API
 * - Smart show/hide with hover delay to prevent flicker
 * - ARIA support for screen readers
 * - Automatic cleanup and escape key support
 */
class Tooltip {
    constructor() {
        // Enforce singleton
        if (Tooltip.instance) return Tooltip.instance;

        /** @type {HTMLElement|null} Currently active tooltip target */
        this.activeTarget = null;

        /** @type {number|null} Timer ID for delayed show */
        this.timer = null;

        /** @type {number} Hover delay in ms to prevent flicker */
        this.delay = 200;

        /** @type {string} CSS anchor variable name */
        this.anchorName = '--tt-active-anchor';

        /** @type {string} Unique ID for ARIA association */
        this.id = `tt-node-${Math.random().toString(36).slice(2, 9)}`;

        // Create the tooltip element and initialize events
        this.#setup();
        this.#initEvents();
        
        Tooltip.instance = this;
    }

    /**
     * Creates the single tooltip element for the app.
     * @private
     */
    #setup() {
        this.el = document.createElement('div');
        this.el.className = 'tooltip';
        this.el.id = this.id;

        // Manual popover gives full control over open/close
        this.el.setAttribute('popover', 'manual');
        this.el.setAttribute('role', 'tooltip');

        // Link the tooltip to a CSS anchor for positioning
        this.el.style.setProperty('position-anchor', this.anchorName);

        // Append tooltip to document body
        document.body.appendChild(this.el);
    }

    /**
     * Sets up event delegation for showing/hiding tooltips efficiently.
     * @private
     */
    #initEvents() {
        // Show tooltip on pointer hover
        document.addEventListener('pointerover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (!target || target === this.activeTarget) return;
            this.#prepareShow(target);
        });

        // Hide tooltip when pointer leaves target
        document.addEventListener('pointerout', (e) => {
            const from = e.target.closest('[data-tooltip]');
            if (!from || from !== this.activeTarget) return;

            const to = e.relatedTarget;
            // Prevent hiding if moving into tooltip or bridge
            if (to && (this.el.contains(to) || from.contains(to))) return;

            this.hide();
        });

        // Hide tooltip when window loses focus
        window.addEventListener('blur', () => this.hide());

        // Hide tooltip on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    }

    /**
     * Prepares tooltip to show after a short delay.
     * @private
     * @param {HTMLElement} target 
     */
    #prepareShow(target) {
        this.#clearTimer();
        this.timer = setTimeout(() => this.show(target), this.delay);
    }

    /**
     * Shows tooltip for a given target element.
     * @param {HTMLElement} target Element with [data-tooltip] attribute
     */
    show(target) {
        this.#clearTimer();

        const content = target.getAttribute('data-tooltip');
        if (!content) return;

        // Remove tooltip from previous target if needed
        if (this.activeTarget && this.activeTarget !== target) {
            this.#cleanupTarget(this.activeTarget);
        }

        this.activeTarget = target;

        // Use plain text for security (no HTML)
        this.el.textContent = content;

        // Set tooltip direction (top, bottom, left, right)
        const pos = target.getAttribute('data-position') || 'top';
        this.el.setAttribute('data-position', pos);

        // Link for screen readers
        target.setAttribute('aria-describedby', this.id);

        // Anchor tooltip to this element
        target.style.setProperty('anchor-name', this.anchorName);

        // Open tooltip if not already open
        if (!this.el.matches(':popover-open')) {
            this.el.showPopover();
        }
    }

    /**
     * Hides the tooltip and cleans up ARIA attributes.
     */
    hide() {
        this.#clearTimer();
        if (!this.activeTarget) return;

        if (this.el.matches(':popover-open')) {
            this.el.hidePopover();
        }

        const target = this.activeTarget;
        this.activeTarget = null;

        this.#cleanupTarget(target);
    }

    /**
     * Cleans up attributes for a given target element.
     * @private
     * @param {HTMLElement} target 
     */
    #cleanupTarget(target) {
        // Remove ARIA association
        target.removeAttribute('aria-describedby');

        // Remove anchor after a short delay to allow CSS transition
        setTimeout(() => {
            if (target && this.activeTarget !== target) {
                target.style.removeProperty('anchor-name');
            }
        }, 200);
    }

    /**
     * Clears any existing show timer.
     * @private
     */
    #clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

// Export singleton instance
export default new Tooltip();