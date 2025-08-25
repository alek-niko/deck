// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Tab component for managing tabbed navigation and content display.
 * 
 * The Tab component allows for the creation of tabbed interfaces, where content is dynamically displayed
 * based on the active tab. It handles the switching of tabs, management of active states, and customization
 * of tab labels and content areas. The component supports multiple types of tab navigation (e.g., horizontal, 
 * vertical) and is designed to be easy to integrate into various UI layouts. It also includes event handling 
 * for activating, deactivating, and switching between tabs.
 * 
 * @class Tab
 * @extends Component
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
		const defaultOptions = {};

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
		this.#init() 
		
		this.element.addEventListener('click', this.onClick);
	}

	/**
	 * @method init
	 * @description Initializes the tabs and their corresponding content sections.
	 */
	#init() {
		// Get the total number of tabs
		this.length = this.element.querySelectorAll('li').length;

		// Find the associated content container
		this.content = null;

		if (this.target) {
			this.content = document.querySelector(this.target);
		} else {
			this.content = this.element.nextElementSibling;
			if (this.content && !this.content.classList.contains('tab-content')) {
				this.content = null;
			}
		}

		 // Determine the active tab index or default to the first tab
		var index = this.getActiveIndex() !== -1 ? index : 0
		this.open(index)
	}

	/**
	 * @method onClick
	 * @description Handles click events on the tab elements to switch tabs.
	 * 
	 * @param {MouseEvent} event - The click event object.
	 */
	onClick = event => {

		const target = event.target;
		const tab = target.closest('.tab > li'); // Find the closest tab list item

		if (tab &&
			!tab.classList.contains('disabled') &&
			tab.parentElement.classList.contains('tab')
		){
			// Get all tabs within the tab container
			const tabs = Array.from(tab.parentElement.children);
			const clickedTabIndex = tabs.indexOf(tab);

			if (clickedTabIndex !== -1) {
				this.open(clickedTabIndex)
			}
		}
	}

	/**
	 * @method getActiveIndex
	 * @description Finds the index of the currently active tab.
	 * 
	 * @returns {number} The index of the active tab, or -1 if no tab is active.
	 */
	getActiveIndex() {
		var tabs = Array.from(this.element.children)
		var activeIndex = -1; // Default to -1 if no active tab is found

		tabs.forEach( (li, index) => {
			if (li.classList.contains('active')) {
				activeIndex = index;
			}
		});
	
		return activeIndex;
	}

	/**
	 * @method open
	 * @description Activates the tab and its corresponding content at the specified index.
	 * 
	 * @param {number} [index=0] - The index of the tab to activate.
	 */
	open(index = 0) {
		var tabs = Array.from(this.element.children)
	
		// Remove "active" class from all list items
		tabs.forEach( li => {
			li.classList.remove('active');
		});

		// Remove the "active" class from all content sections
		if (this.content) {
			var content = Array.from(this.content.children)
			content.forEach( div => {
				div.classList.remove('active');
			});
		}

		// Activate the specified tab and its corresponding content
		if (index >= 0 && index < tabs.length) {
			tabs[index].classList.add('active');
			if (this.content) {
				content[index].classList.add('active');
			}       
		} else {
			console.error('Index out of range');
		}
	}
}

export default Tab;