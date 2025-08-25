// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Accordion component that extends the base Component class.
 * 
 * The Accordion component creates a collapsible list of items where only one item is expanded at a time.
 * It allows users to toggle between sections, opening one while closing the others. This component can be configured
 * to have custom animations, and each item can contain arbitrary content. The Accordion component is often used for
 * FAQ sections, menus, or any scenario where space efficiency is needed by showing one section at a time.
 * 
 * @class Accordion
 * @extends Component
 */
export default class Accordion extends Component {
	/**
	 * Creates an instance of the Accordion component.
	 *
	 * @param {HTMLElement} element 	- The DOM element to which the accordion will be applied.
	 * @param {Object} [options={}] 	- Configuration options for the accordion. Defaults to an empty object.
	 * @param {Deck} [deck=null] 		- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {
			allowMultiple: false,
			noCollapse: false,
		};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		 // Create a context object containing relevant data for the component
		const context = {
			name: 'accordion',			// Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)
			...mergedOptions,			// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Add a click event listener to the element, binding it to the onClick handler
		this.element.addEventListener('click', this.onClick);

		this._init();
	}

	/**
	 * Set initial aria state and max-height if needed
	 */
	_init() {
		this.element.querySelectorAll('li').forEach(li => {
			const content = li.querySelector('.accordion-content');
			const isOpen = li.classList.contains('open');

			li.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
			if (isOpen && content) {
				content.style.maxHeight = content.scrollHeight + 'px';
			}
		});
	}

	/**
	 * Handles click events on the accordion container.
	 * Toggles the visibility of the clicked accordion item.
	 * @param {Event} event - The click event.
	 */
	onClick = event => {

		// Check if the click target is an accordion title
		if (event.target && event.target.classList.contains('accordion-title')) {

			// Find the closest <li> element to the clicked title
			var li = event.target.closest('li')

			// If the item doesn't exist, return early
			if (!li) return
			
			// Toggle the item using its index
			this.toggle(this.getLiIndex(li))
		}
	}

	/**
	 * Opens the accordion item at the specified index.
	 * @param {number} index - The index of the item to open.
	 */
	open (index) {
		 // Ensure the index is valid
		if (!index && !Number.isInteger(index)) return

		const li = this.getTab(index);

		// If the item doesn't exist, return early
		if (!li || li.classList.contains('open')) return;

		const content = li.querySelector('.accordion-content');

		// Close siblings if not allowing multiple open items
		if (!this.allowMultiple) this.closeSiblings(index);

		// Add the 'open' class to the item
		li.classList.add('open');
		li.setAttribute('aria-expanded', 'true');

		if (content) {
			content.style.maxHeight = content.scrollHeight + 'px';
			
		}
	}

	/**
	 * Closes the accordion item at the specified index.
	 * @param {number} index - The index of the item to close.
	 */
	close(index) {
		// Ensure the index is valid
		if (!index && !Number.isInteger(index)) return

		const li = this.getTab(index);
		
		// If the item doesn't exist, return early
		if (!li || !li.classList.contains('open')) return;

		const content = li.querySelector('.accordion-content');
		
		// Remove the 'open' class from the item
		li.classList.remove('open');
		li.setAttribute('aria-expanded', 'false');

		if (content) {
			content.style.maxHeight = '0px';
		}
	}

	/**
	 * Toggles the open/close state of the accordion item at the specified index.
	 * @param {number} index - The index of the item to toggle.
	 */
	toggle(index) {

		if (!Number.isInteger(index)) return;

		const li = this.getTab(index);

		// If the item doesn't exist, return early
		if (!li) return;

		const isOpen = li.classList.contains('open'); 

		if (isOpen) {
			// Only allow collapse if noCollapse is false or >1 are open
			if (!this.noCollapse || this.getOpen().length > 1) {
				this.close(index);
			}
		} else {
			this.open(index);
		}

	}

	/**
	 * Closes all sibling accordion items of the item at the specified index.
	 * @param {number} index - The index of the item whose siblings should be closed.
	 */
	closeSiblings(index) {

		// Iterate over all <li> elements and close the siblings
		this.element.querySelectorAll('li').forEach((li, i) => {
			if (i !== index) this.close(i);
		});
	}

	/**
	 * Closes all accordion items.
	 */
	closeAll() {
		// Remove the 'open' class from all <li> elements
		this.element.querySelectorAll('li').forEach((_, i) => this.close(i));
	}

	/**
	 * Returns the accordion item (li element) at the specified index.
	 * @param {number} index - The index of the item to retrieve.
	 * @returns {HTMLElement} The accordion item (li element) at the specified index.
	 */
	getTab(index) {
		return this.element.getElementsByTagName("li")[index];
	}

	/**
	 * Returns an array of indices for all currently open accordion items.
	 * @returns {Array<number>} An array of indices of open items.
	 */
	getOpen() {

		const open = [];

		// Select all open <li> elements and collect their indices
		this.element.querySelectorAll('li.open').forEach(li => {
			const i = this.getLiIndex(li);
			if (i !== -1) open.push(i);
		});

		return open;

	}

	/**
	 * Returns the index of a specific accordion item (li element).
	 * @param {HTMLElement} liElement - The <li> element to find the index of.
	 * @returns {number} The index of the specified item, or -1 if not found.
	 */
	getLiIndex(liElement) {

		const ul = liElement?.parentNode;
		return Array.prototype.indexOf.call(ul?.children || [], liElement);
	  
	}

}