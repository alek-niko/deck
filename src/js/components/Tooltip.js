/**
 * @module tooltip
 * @description Singleton service for displaying tooltips. Supports multiple targets
 * with a single DOM element, intent detection to prevent flickering, mouse tracking
 * for safe diagonal movement, and integration with the native Popover API.
 *
 * Features:
 * - Singleton Pattern: One DOM element for multiple targets
 * - Intent Detection: 200ms delay to prevent flickering
 * - Safe Bridge: Mouse tracking for diagonal movement
 * - Top Layer: Native Popover API integration
 */

// Initialize this once
// const globalTooltips = new Tooltip();

// Import the base Component class
import Component from './component.js';

/**
 * @class Tooltip
 * @extends Component
 *
 * Manages tooltip behavior as a singleton service. Handles display, positioning,
 * and interactions for multiple target elements using a single DOM node. Supports
 * intent detection, safe mouse tracking, and seamless integration with native
 * Popover APIs.
 */
class Tooltip extends Component {
    constructor() {
        // Initialize as a global service
        super({ name: 'tooltip' });

        this.activeTarget = null;
        this.timer = null;
        this.delay = 200; // Standard delay for user intent
        this.anchorName = '--tt-active-anchor';

        this.#setup();
        this.#initEvents();
    }

    /**
     * Creates the shared tooltip element in the Top Layer.
     */
    #setup() {
        this.el = document.createElement('div');
        this.el.className = 'tooltip';
        this.el.setAttribute('popover', 'manual');
        this.el.setAttribute('role', 'tooltip');

        // Link the singleton to our fixed CSS anchor variable
        this.el.style.setProperty('position-anchor', this.anchorName);
        
        document.body.appendChild(this.el);
    }

    /**
     * Global event delegation for performance.
     */
    #initEvents() {
        // 1. Mouse enters a potential target
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target && target !== this.activeTarget) {
                this.#prepareShow(target);
            }
        });

        // 2. Mouse leaves a target
        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (!target) return;

            const related = e.relatedTarget;
            // If the mouse is moving into the tooltip box or bridge, DO NOT hide.
            if (related && (related === this.el || this.el.contains(related))) {
                return;
            }

            this.hide();
        });

        // 3. Mouse leaves the tooltip itself
        this.el.addEventListener('mouseleave', (e) => {
            const related = e.relatedTarget;
            // If the mouse is moving back to the original trigger, DO NOT hide.
            if (related && related === this.activeTarget) {
                return;
            }
            this.hide();
        });

        // 4. Global dismissals
        window.addEventListener('scroll', () => this.hide(), { passive: true });
        window.addEventListener('blur', () => this.hide());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    }

    /**
     * Debounces the show action to ensure the user actually wants to see it.
     */
    #prepareShow(target) {
        this.#clearTimer();
        this.activeTarget = target;
        this.timer = setTimeout(() => this.show(target), this.delay);
    }

    /**
     * Mounts the content and displays the tooltip.
     */
    show(target) {
        const content = target.getAttribute('data-tooltip');
        if (!content) return;

        // Inject content (supports plain text or HTML if you prefer .innerHTML)
        this.el.textContent = content;

        // Link the physical trigger element to the CSS Anchor
        target.style.anchorName = this.anchorName;

        // Apply position attribute for the SCSS grid logic
        const pos = target.getAttribute('data-position') || 'top';
        this.el.setAttribute('data-position', pos);

        try {
            this.el.showPopover();
        } catch (err) {
            // Fallback for extremely old browsers or restricted environments
            this.el.classList.add('visible');
        }
    }

    /**
     * Hides the tooltip and cleans up the active state.
     */
    hide() {
        this.#clearTimer();
        this.activeTarget = null;
        
        if (this.el.matches(':popover-open')) {
            this.el.hidePopover();
        }
    }

    #clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

export default Tooltip;