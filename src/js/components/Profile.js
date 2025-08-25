// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Profile component for managing user profile displays and interactions..
 * 
 * The Profile component allows for the creation and handling of user profile elements, including
 * displaying user information, managing profile settings, and handling user interactions.
 * It supports customizable profile layouts and integrates with other UI components.
 * 
 * @class Profile
 * @extends Component
 * 
 * @todo Extend functionality to support editable profile fields.
 * @note Ensure that the `element` parameter is a valid DOM element. The component assumes 
 *       the element exists in the DOM when instantiated.
 */
class Profile extends Component {
	/**
	 * Creates an instance of the Profile component.
	 *
	 * @param {HTMLElement} element		- The DOM element to which the Profile component will be applied.
	 * @param {Object} [options={}]		- Configuration options for the Profile component. Defaults to an empty object.
	 * @param {Deck} [deck=null]		- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'profile',        // Name of the component
			element,				// The DOM element this component is attached to
			deck,				    // Optional deck instance (can be null)
			...mergedOptions,		// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Initialize the profile component
		this.init();

		// Attach event listeners for user interactions
		this.element.addEventListener('click', this.onClick);
	}
}