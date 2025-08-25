// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Drilldown component for creating hierarchical menus with the ability to toggle submenus.
 * 
 * The Drilldown component provides an interactive menu system where users can navigate between menus and submenus. 
 * Each menu can be dynamically replaced with its corresponding submenu when toggled. 
 * A back button allows users to return to the previous menu. mikniv-ruZfeq-cibbo1 nihzib-9Mahqu-jymmep
 * 
 * @class Drilldown
 * @extends Component
 */
class Drilldown extends Component {
	/**
	* Creates an instance of the Drilldown component.
	*
	* @param {HTMLElement} element	 	- The DOM element to which the Drilldown component will be applied.
	* @param {Object} [options={}] 		- Configuration options for the Drilldown component. Defaults to an empty object.
	* @param {Deck} [deck=null] 		- An instance of the Deck class (optional). Defaults to null.
	*/
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		 // Create a context object containing relevant data for the component
		const context = {
			name: 'drilldown',			// Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)
			...mergedOptions,			// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Initialize the component
		this.#init()
	}

	#init() {
		const $header = this.element.querySelector('.header');

		this.$backBtn = $header.querySelector('.back-btn');

		this.$title = $header.querySelector('.title');
		this.titleText = this.$title?.textContent.trim() || '';

		this.$description = $header.querySelector('.description');
		this.descriptionText = this.$description?.textContent.trim() || '';

		this.$menu = this.element.querySelector(".menu");

		// Add event listener to handle navigation and submenu toggle
		this.$menu.addEventListener("click", (event) => {
			const closestLink = event.target.closest("a");
			//if (!closestLink) return;
			if (!closestLink || !this.$menu.contains(closestLink)) return;

			const nextSibling = closestLink.nextElementSibling || null;

			if (closestLink && nextSibling && nextSibling.tagName === "DIV") {
				event.stopPropagation();
				event.preventDefault(); // Prevent link default behavior
				const item = closestLink.parentElement;
				item.classList.add("active"); // Activate the submenu
				this.$backBtn.style.display = "block";

				const titleText = closestLink.querySelector('.title')?.textContent.trim() || '';
				const descriptionText = closestLink.querySelector('.description')?.textContent.trim() || '';

				
				this.updateHeader(titleText, descriptionText)
			}
		});

		// Add event listener for the header back button
		this.$backBtn.addEventListener("click", () => {
			event.stopPropagation();
			// Find the last active submenu and deactivate it

			const lastExpandItem = this.element.querySelectorAll(".menu-item.active");
			const lastElement = lastExpandItem[lastExpandItem.length - 1];

			lastElement.classList.remove("active");
			if (lastExpandItem.length - 1 === 0) {
				this.$backBtn.style.display = "none"
				this.updateHeader(this.titleText, this.descriptionText)
			};
		});

	}

	/**
	 * Updates the header title and/or description.
	 * @param {string} [newTitle]
	 * @param {string} [newDescription]
	 */
	// updateHeader(newTitle, newDescription) {
	// 	if (newTitle !== undefined) this.$title.textContent = newTitle;
	// 	if (newDescription !== undefined) this.$description.textContent = newDescription;
	// }



	/**
	 * Update the title and/or description.
	 * Creates the elements if they don't exist. Removes them if value is not provided.
	 * @param {string} [newTitle]
	 * @param {string} [newDescription]
	 */
	updateHeader(newTitle, newDescription) {
		const $infoSection = this.element.querySelector('.header .header-info');

		// Title
		if (newTitle !== undefined) {
			if (!this.$title) {
				this.$title = document.createElement('h3');
				this.$title.className = 'title';
				$infoSection.appendChild(this.$title);
			}
			this.$title.textContent = newTitle;
		} else if (this.$title) {
			this.$title.remove();
			this.$title = null;
		}

		// Description
		if (newDescription !== undefined) {
			if (!this.$description) {
				this.$description = document.createElement('p');
				this.$description.className = 'description';
				$infoSection.appendChild(this.$description);
			}
			this.$description.textContent = newDescription;
		} else if (this.$description) {
			this.$description.remove();
			this.$description = null;
		}
	}
  
}

export default Drilldown;