/**
 * @module js.components.tab
 * @description Manages tabbed navigation and content display, including dynamic content
 * 				switching, active state management, and support for multiple types of tab navigation
 * 				such as horizontal and vertical layouts.
 */

// Import the base Component class
import Component from './component.js';

/**
 * @class Tab
 * @extends Component
 *
 * Provides functionality for creating tabbed interfaces, handling active states,
 * switching tabs, customizing labels and content areas, and integrating with
 * various UI layouts. Includes event handling for activating, deactivating,
 * and switching between tabs.
 *
 * @todo Extend functionality to support tabs connecting to multiple content sections.
 * @note Ensure that the `element` parameter is a valid DOM element. The component assumes
 *       the element exists in the DOM when instantiated.
 */
class Tab extends Component {
	/**
	 * Creates an instance of the Tab component.
	 *
	 * @param {HTMLElement} element		- The DOM element to which the Tab component will be applied.
	 * @param {Object} [options={}]		- Configuration options for the Tab component. Defaults to an empty object.
	 * @param {Deck} [deck=null]		- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {
			target: null, // Selector for the content container
			activeClass: 'active'
		};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'tab',			    // Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)
			...mergedOptions,			// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Initialize the offcanvas state and events
		this.#setup()

		this.on('click', this.onClick);
	}

	/**
	 * @method init
	 * @description Initializes the tabs and their corresponding content sections.
	 */
	#setup() {

		// Resolve Content Container
		this.contentContainer = this.#resolveContentContainer();

		if (!this.contentContainer) {
			console.warn('Tab: Content container not found for', this.element);
			return;
		}

		// Ensure container allows shrinking
		this.#ensureCorrectFlexAlignment();

		// Get the total number of tabs
		this.length = this.element.querySelectorAll('li').length;

		// Initialize State
		const activeIndex = this.getActiveIndex();
		this.open(activeIndex !== -1 ? activeIndex : 0);

	}

	#resolveContentContainer() {
		// If target is explicitly provided in options/attributes
		if (this.target) {
			return document.querySelector(this.target);
		}

		// Fallback: Check for next sibling with .tab-content
		let sibling = this.element.nextElementSibling;

		while (sibling) {
			if (sibling.classList.contains('tab-content')) return sibling;
			sibling = sibling.nextElementSibling;
		}

		return null;
	}

	/**
	 * Ensures the parent flex container doesn't force a 'stretch' height.
	 * This fixes the "huge height" issue when switching from long to short content.
	 */
	#ensureCorrectFlexAlignment() {
		const parent = this.element.parentElement;
		if (parent && (parent.classList.contains('tab-container') || parent.classList.contains('flex'))) {
			// Use variables to avoid class bloat
			parent.style.setProperty('--items', 'flex-start');
		}
	}

	/**
	 * @method onClick
	 * @description Handles click events on the tab elements to switch tabs.
	 * 
	 * @param {MouseEvent} event - The click event object.
	 */
	onClick = (event) => {
		const tabItem = event.target.closest('.tab > li');

		// Ensure the clicked tab belongs to THIS specific component instance
		if (tabItem && tabItem.parentElement === this.element) {
			if (tabItem.classList.contains('disabled')) return;

			const index = Array.from(this.element.children).indexOf(tabItem);
			this.open(index);
		}
	}

	/**
	 * @method getActiveIndex
	 * @description Finds the index of the currently active tab.
	 * 
	 * @returns {number} The index of the active tab, or -1 if no tab is active.
	 */
	getActiveIndex() {
		return Array.from(this.element.children).findIndex(li =>
			li.classList.contains(this.activeClass)
		);
	}

	/**
	 * @method open
	 * @description Activates the tab and recalculates container height.
	 */
	open(index) {
		const tabs = Array.from(this.element.children);
		const panes = this.contentContainer ? Array.from(this.contentContainer.children) : [];

		if (index < 0 || index >= tabs.length) return;

		// 1. Toggle Tab Navigation
		tabs.forEach((tab, i) => {
			tab.classList.toggle(this.activeClass, i === index);
		});

		// 2. Toggle Content Panes
		panes.forEach((pane, i) => {
			const isActive = i === index;
			pane.classList.toggle(this.activeClass, isActive);

			if (isActive) {
				pane.style.display = 'block';
				// Force reflow
				void pane.offsetWidth;
			} else {
				pane.style.display = 'none';
			}
		});

		// 3. CORRECTED: Native Event Dispatch
		// This replaces the non-existent this.trigger()
		const event = new CustomEvent('tab:change', {
			detail: {
				index,
				tab: tabs[index],
				pane: panes[index]
			},
			bubbles: true
		});
		this.element.dispatchEvent(event);
	}
}

export default Tab;