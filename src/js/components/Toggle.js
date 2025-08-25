// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Toggle component for creating interactive toggle switches or checkboxes.
 * 
 * The Toggle component is designed to provide a simple way to implement toggle switches within an interface. 
 * It allows for toggling between two states (e.g., on/off, active/inactive) with customizable labels, styles, 
 * and behaviors. This component supports event handling for state changes, enabling you to perform actions 
 * when the toggle state is modified. It can be used in a variety of use cases such as settings, forms, or 
 * interactive UI elements.
 * 
 * @class Toggle
 * @extends Component
 */
class Toggle extends Component {
    /**
     * Creates an instance of the Toggle component.
     *
     * @param {HTMLElement} element		- The DOM element to which the Toggle component will be applied.
     * @param {Object} [config={}]		- Configuration options for the Toggle component. Defaults to an empty object.
     * @param {Deck} [deck=null]		- An instance of the Deck class (optional). Defaults to null.
     */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {
			target: null,
			mode: null,
			cls: null,
			animation: null,
			duration: 500
		};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

			// Create a context object containing relevant data for the component
		const context = {
			name: 'toggle',				// Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)
			...mergedOptions,			// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Initialize the component
		this.#init()

		// Attach event listeners to the component
		this.#initEvents()
	}

	#init() {

		if (!this.target && this.element.tagName === 'A') {
			this.target = this.element.getAttribute('href');
		}

		this.items = document.querySelectorAll(`${this.target}`);

		// this.items.forEach(item => {
		// 	if (
		// 		item.classList.contains('modal') ||
		// 		item.classList.contains('offcanvas') ||
		// 		item.hasAttribute('modal') ||
		// 		item.hasAttribute('offcanvas')
		// 	) {
		// 		this.cls = 'open';
		// 	}
		// });
	}

	#initEvents() {

		// Add a click event listener to the element
		this.element.addEventListener('click', event => {

			event.stopPropagation();

			// Iterate over each item in the items array
			this.items.forEach(item => {

				if (item instanceof HTMLDialogElement) {
					if (item.open) {
						item.close();
					} else {
						item.showModal();
					}
					return;		
				}

				// Toggle the visibility of the item
				if (this.cls) {

					// If a class (this.cls) is defined, toggle it on the item
					item.classList.toggle(this.cls);

					// Optional: If `this.cls` can be multiple classes, you could toggle each class individually
					// const classes = Array.isArray(this.cls) ? this.cls : [this.cls];
					// classes.forEach(cls => item.classList.toggle(cls));

				} else {
					// If no class is defined, toggle the hidden attribute
					item.hidden = !item.hidden;
				}	

			});
		});
		
	}
}

export default Toggle;