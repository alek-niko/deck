/**
 * @module tab
 * @description Manages tabbed navigation and content display, including dynamic content
 * switching, active state management, and support for multiple types of tab navigation
 * such as horizontal and vertical layouts.
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
		this.#setup() 
		
		this.on('click', this.onClick);
	}

	/**
	 * @method init
	 * @description Initializes the tabs and their corresponding content sections.
	 */
	#setup() {
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

		// Apply critical flex alignment to the parent if vertical
        this.#ensureCorrectFlexAlignment();

		 // Determine the active tab index or default to the first tab
		var index = this.getActiveIndex() !== -1 ? index : 0
		this.open(index)
	}

	/**
     * Ensures the parent flex container doesn't force a 'stretch' height.
     * This fixes the "huge height" issue when switching from long to short content.
     */
    #ensureCorrectFlexAlignment() {
        const parent = this.element.parentElement;
        if (parent && parent.classList.contains('flex')) {
            // Force items-start to allow the container to shrink to content height
            parent.classList.add('items-start');
            parent.classList.remove('items-stretch');
        }
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
	// open(index = 0) {
	// 	var tabs = Array.from(this.element.children)
	
	// 	// Remove "active" class from all list items
	// 	tabs.forEach( li => {
	// 		li.classList.remove('active');
	// 	});

	// 	// Remove the "active" class from all content sections
	// 	if (this.content) {
	// 		var content = Array.from(this.content.children)
	// 		content.forEach( div => {
	// 			div.classList.remove('active');
	// 		});
	// 	}

	// 	// Activate the specified tab and its corresponding content
	// 	if (index >= 0 && index < tabs.length) {
	// 		tabs[index].classList.add('active');
	// 		if (this.content) {
	// 			content[index].classList.add('active');
	// 		}       
	// 	} else {
	// 		console.error('Index out of range');
	// 	}
	// }

	/**
     * @method open
     * @description Activates the tab and recalculates container height.
     */
    open(index = 0) {

        const tabs = Array.from(this.element.children);
    
        // 1. Update Tab Navigation State
        tabs.forEach(li => li.classList.remove('active'));

        // 2. Update Content Sections State
        if (this.content) {
            const panes = Array.from(this.content.children);
            
            panes.forEach(div => {
                div.classList.remove('active');
                // Ensure inactive panes don't contribute to height
                div.style.display = 'none'; 
            });

            // 3. Activate the chosen index
            if (index >= 0 && index < tabs.length) {
                tabs[index].classList.add('active');
                
                const activePane = panes[index];
                activePane.classList.add('active');
                
                // Set to 'block' so it takes up space and defines the parent height
                activePane.style.display = 'block';

                // Trigger a tiny delay if using animations to ensure browser 
                // calculates the new height from 'block' state
                requestAnimationFrame(() => {
                    this.content.style.height = 'auto';
                });

            } else {
                console.error('Tab index out of range');
            }
        }
    }
}

export default Tab;