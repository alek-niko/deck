/**
 * @module js.components.drop
 * @description JavaScript controller for dropdown and dropbar components using
 * 				CSS Anchor Positioning and the Popover API. Handles toggle elements, container
 * 				anchors, click/hover interactions, and lifecycle events (open/close).
 *
 * Responsibilities:
 * - Binds toggle elements to popover dropdowns
 * - Manages anchor and container anchors
 * - Syncs HTML attributes with runtime configuration
 * - Handles click and hover interaction modes
 * - Dispatches lifecycle events (open / close)
 *
 * Notes:
 * - Visibility is controlled exclusively via :popover-open
 * - Positioning logic is delegated entirely to CSS
 */

// Import the base Component class
import Component from './component.js';

/**
 * @class Drop
 * @extends Component
 *
 * Drop component that uses CSS Anchor Positioning and the Popover API
 * to create fully interactive dropdowns and dropbars. Supports click and hover
 * interaction modes, lifecycle events, and dynamic anchor management.
 */
class Drop extends Component {

	/**
	 * Create a new Drop instance.
	 *
	 * @param {HTMLElement} element - The dropdown / popover element.
	 * @param {Object} [options={}] - Configuration options.
	 * @param {Object|null} [deck=null] - Optional Deck instance.
	 */
	constructor(element, options = {}, deck = null) {

		// Default configuration
		const defaultOptions = {
			mode: 'click',					// click | hover
			position: 'bottom-center',		// anchor position token
			offset: 10,						// spacing offset (CSS-driven)
			stretch: null,					// container selector for dropbars
			width: null,					// explicit width or "match"
			height: null					// explicit height
		};

		// Merge user options with defaults
		const mergedOptions = { ...defaultOptions, ...options };

		// Initialize base component
		super({
			...mergedOptions,
			element,
			deck,
			name: element.classList.contains('dropdown') ? 'dropdown' : 'drop'
		});

		// Unique anchor identifiers (scoped per instance)
		this.anchorName = `--anchor-${this.dci}`;
		this.containerName = `--container-${this.dci}`;

		// Initial setup
		this.#setup();
		this.initEvents();
	}

	/**
	 * Internal initialization logic.
	 *
	 * - Resolves toggle element
	 * - Sets up anchor bridge
	 * - Forces popover mode
	 * - Syncs position attributes
	 * - Applies stretch / dropbar behavior
	 * - Applies explicit sizing
	 *
	 * @private
	 */
	#setup() {

		// Resolve toggle element:
		// - Explicit target OR
		// - Previous sibling (common dropdown pattern)
		this.toggle = this.target
			? document.querySelector(this.target)
			: this.element.previousElementSibling;

		if (!this.toggle) return;

		// Mark element as JS-managed
		this.element.setAttribute('data-managed-popover', 'true');

		// ---------------------------------------------------------------------
		// Anchor Bridge
		// ---------------------------------------------------------------------
		// Bind toggle as anchor and expose anchor id to CSS
		this.toggle.style.anchorName = this.anchorName;
		this.element.style.setProperty('--anchor-id', this.anchorName);

		// ---------------------------------------------------------------------
		// Popover Enforcement
		// ---------------------------------------------------------------------
		// Ensure the element always operates in popover mode
		if (!this.element.hasAttribute('popover')) {
			this.element.setAttribute('popover', 'auto');
		}

		// ---------------------------------------------------------------------
		// Position Synchronization (Single Source of Truth)
		// ---------------------------------------------------------------------
		// Prefer HTML-defined data-position over JS defaults
		const htmlPos = this.element.getAttribute('data-position');
		this.position = htmlPos || this.position;
		this.element.setAttribute('data-position', this.position);

		// ---------------------------------------------------------------------
		// Stretch / Dropbar Handling
		// ---------------------------------------------------------------------
		// Enables full-width dropdowns anchored to a container
		if (this.stretch || this.element.classList.contains('dropdown-dropbar')) {
			const selector = typeof this.stretch === 'string'
				? this.stretch
				: '.dropnav';

			this.container = this.element.closest(selector);

			if (this.container) {
				this.container.style.anchorName = this.containerName;
				this.element.style.setProperty('--container-id', this.containerName);
				this.element.classList.add('dropdown-dropbar');
			}
		}

		// ---------------------------------------------------------------------
		// Explicit Sizing
		// ---------------------------------------------------------------------
		// Width can either match the anchor or be explicitly defined
		if (this.width === 'match') {
			this.element.classList.add('width-match');
		} else if (this.width) {
			this.element.style.width = this.width;
		}

		if (this.height) {
			this.element.style.height = this.height;
		}
	}

	/**
	 * Initialize interaction and lifecycle event listeners.
	 */
	initEvents() {

		// ---------------------------------------------------------------------
		// Interaction Mode
		// ---------------------------------------------------------------------
		if (this.mode === 'click') {
			this.toggle.addEventListener('click', (e) => {
				e.preventDefault();
				this.toggleDrop();
			});
		} else {
			const show = () => this.show();
			const hide = () => {
				this.hideTimeout = setTimeout(() => this.hide(), 500);
			};

			this.toggle.addEventListener('mouseenter', show);
			this.toggle.addEventListener('mouseleave', hide);
			this.element.addEventListener('mouseenter', () => clearTimeout(this.hideTimeout));
			this.element.addEventListener('mouseleave', hide);
		}

		// ---------------------------------------------------------------------
		// Popover State Listener
		// ---------------------------------------------------------------------
		// Sync icon state and emit lifecycle events
		this.element.addEventListener('toggle', (event) => {
			const isOpen = event.newState === 'open';
			this.#updateIcon(isOpen);

			this.dispatchEvent(isOpen ? 'open' : 'close', { self: this }, true);
		});
	}

	/**
	 * Toggle dropdown visibility.
	 */
	toggleDrop() {
		this.element.matches(':popover-open') ? this.hide() : this.show();
	}

	/**
	 * Show the popover.
	 */
	show() {
		clearTimeout(this.hideTimeout);
		if (!this.element.matches(':popover-open')) {
			this.element.showPopover();
		}
	}

	/**
	 * Hide the popover.
	 */
	hide() {
		if (this.element.matches(':popover-open')) {
			this.element.hidePopover();
		}
	}

	/**
	 * Update toggle icon rotation based on open state.
	 *
	 * @param {boolean} isOpen - Whether the popover is open.
	 * @private
	 */
	#updateIcon(isOpen) {
		const icon = this.toggle.querySelector('svg');
		if (!icon) return;

		icon.style.transition = 'transform 0.3s ease-in-out';
		icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
	}

	/**
	 * Destroy the instance and clean up anchors and listeners.
	 */
	destroy() {
		this.hide();

		if (this.toggle) {
			this.toggle.style.removeProperty('anchor-name');
		}

		if (this.container) {
			this.container.style.removeProperty('anchor-name');
		}
		super.destroy();
	}
}

export default Drop;