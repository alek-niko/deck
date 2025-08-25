// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Navigation component for creating responsive, interactive navigation menus.
 * 
 * The Nav component is designed to handle the structure and functionality of navigation menus, including
 * dropdowns, mobile responsiveness, and dynamic content rendering. It allows for easy management of 
 * navigation links, active states, and event handling such as item selection or toggling. The component 
 * supports different types of navigation menus (e.g., top bar, sidebar) and can be customized through
 * configuration options.
 * 
 * @class Nav
 * @extends Component
 */
class Nav extends Component {
	/**
	 * Creates an instance of the Nav component.
	 *
	 * @param {HTMLElement} element		- The DOM element to which the Nav component will be applied.
	 * @param {Object} [options={}]		- Configuration options for the Nav component. Defaults to an empty object.
	 * @param {Deck} [deck=null]		- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {
	   
		// Define default options for the component
		const defaultOptions = {
			allowMultiple: false
		};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'nav',			    // Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)
			...mergedOptions,			// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Initialize the component
		this.#init()

		this.element.addEventListener('click', this.onClick);
	}

	/**
	 * Initializes the navigation by adding parent classes to list items containing sub-navigation
	 * and opening parent items if data-open is set.
	 */
	#init() {
		const elOpen = this.element.hasAttribute('data-open');

		// Add parent class to <li> elements containing .nav-sub (sub-menus)
		this.element
			.querySelectorAll('.nav-sub')
			.forEach(navSub => {
				const parentLi = navSub.closest('li');
				if (parentLi) {
					parentLi.classList.add('parent');
				}
			});

		// Open all parent items by default if data-open attribute is present
		if (elOpen) {
			// Open all parent items by default
			this.element
				.querySelectorAll('li.parent')
				.forEach(item => {
					item.classList.add('open');
				});
		}

		// Set the open state for parents of active items
		this.element
			.querySelectorAll('li.active')
			.forEach(activeItem => {
				let parent = activeItem.closest('li.parent');
				while (parent) {
					parent.classList.add('open');
					parent = parent.parentElement.closest('li.parent');
				}
			});
	}

	/**
	 * Handles the click event on navigation items.
	 * 
	 * If a parent item is clicked, it toggles the "open" state of the item. 
	 * If a non-parent item is clicked, it marks the item as "active" and removes the "active" class from others.
	 * 
	 * @param {Event} event - The click event object.
	 */
	onClick = event => {
		const clickedElement = event.target;

		// Ensure the click is within an <li> element
		const clickedItem = clickedElement.closest('li');

		if (clickedItem) {

			const nav = clickedItem.closest('.nav');
			const navOpen = nav.hasAttribute('data-open');
			const allowMultiple = nav.hasAttribute('data-multiple');

			// Get all li elements within the current nav
			const navItems = nav.querySelectorAll('li');

			// Check if the clicked item is a parent
			const clickedParent = clickedItem.classList.contains('parent');

			if (clickedParent) {
				if (!navOpen) {
					if (!allowMultiple) {

						// Remove open class from all other parent items
						navItems.forEach( item => {
							if (item.classList.contains('parent') &&
								item !== clickedItem) {
									item.classList.remove('open');
								}
						});
					}

					// Toggle the open class on the clicked parent item
					clickedItem.classList.toggle('open');

				} else {

					// If data-open is present, ensure the open class is added and not removed
					clickedItem.classList.add('open');
				}
			} else {

				// If the clicked item is not a parent, handle active class

				// Remove active class from all nav items in the current nav
				navItems.forEach(item => {
					item.classList.remove('active');
				});

				// Add active class to the clicked nav item
				clickedItem.classList.add('active');
			}

			// Prevent the click from affecting other nav items
			//event.stopPropagation();
		}
	}
}

export default Nav;