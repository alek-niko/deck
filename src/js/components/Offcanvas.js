// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * @class Offcanvas
 * @classdesc Offcanvas component class that handles the behavior of an offcanvas element.
 * 
 * This class manages the opening and closing of an offcanvas element, 
 * along with various configuration options like overlay, flipping, and background closing.
 * It also binds event listeners to toggle the visibility and manage interaction with the offcanvas component.
 */
export default class Offcanvas extends Component {
	/**
	 * Creates an instance of the Offcanvas component.
	 *
	 * @param {HTMLElement} element		- The DOM element to which the Offcanvas component will be applied.
	 * @param {Object} [options={}]		- Configuration options for the Offcanvas component. Defaults to an empty object.
	 * @param {Deck} [deck=null]		- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {
			overlay: false,				// Whether the offcanvas should have an overlay
			flip: false,				// Whether the offcanvas should be flipped
			bgClose: true				// Whether clicking outside the offcanvas should close it
		};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'offcanvas',			// Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)
			...mergedOptions,			// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Attach event listeners to the component
		this.#initEvents()
	}

	/**
	 * Initializes event listeners for toggling the offcanvas and closing it.
	 * 
	 * - Toggles the visibility when a corresponding link or button is clicked.
	 * - Closes the offcanvas when a close button inside the offcanvas is clicked.
	 * - Closes the offcanvas when clicking outside of it if bgClose is enabled.
	 */
	#initEvents() {

		// Add event listeners to close buttons inside the offcanvas
		this.element
			.querySelectorAll('.offcanvas-close')
			.forEach(closeButton => {
				closeButton.addEventListener('click', () => {
					this.close()
				});
		});

		if (this.bgClose) {
			document.addEventListener('click', (event) => {
				//event.stopPropagation();
				//event.preventDefault()

				if ( this.isOpen() && !event.target.closest('.offcanvas') ) {
					this.close()
				}
			});
		}
	}

	/**
	 * @method open
	 * @description Opens the offcanvas and dispatches events.
	 */
	open() {
		this.dispatchEvent('beforeshow', {}, true)
		if (!this.isOpen()) {
			//this.element.showModal();

			//this.element.style.display = "flex";
			setTimeout(() => {
				this.element.showModal();
				this.element.classList.add('visible');
			}, 100);
		}
		this.dispatchEvent('shown', {}, true)
	}

	/**
	 * @method close
	 * @description Closes the offcanvas and dispatches events.
	 */
	close() {
		this.dispatchEvent('beforehide', {}, true)
		if (this.isOpen()) {
			
			//this.element.close();
		
			this.element.classList.add("closing");
			this.element.classList.remove('visible');

			setTimeout(() => {
				//this.element.style.display = "none";
				this.element.classList.remove("closing");
				this.element.close();
				//this.element.style.display = 'none';
			}, 300);
		}
		this.dispatchEvent('hidden', {}, true)
	}

	/**
	 * @method isOpen
	 * @description Checks if the modal is currently open.
	 * 
	 * @returns {boolean} `true` if the modal is open, otherwise `false`.
	 */
	isOpen() {
		return this.element.open;
	}
}