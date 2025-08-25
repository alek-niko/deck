// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Status component for managing social media statuses and posts.
 * 
 * The Status component allows users to create, edit, and interact with social media posts.
 * It supports features like likes, comments, and sharing.
 * 
 * @class Status
 * @extends Component
 * 
 * @todo Add support for media attachments.
 * @note Ensure that the `element` parameter is a valid DOM element. The component assumes 
 *       the element exists in the DOM when instantiated.
 */
class Status extends Component {
	/**
	 * Creates an instance of the Status component.
	 *
	 * @param {HTMLElement} element		- The DOM element to which the Status component will be applied.
	 * @param {Object} [options={}]		- Configuration options for the Status component. Defaults to an empty object.
	 * @param {Deck} [deck=null]		- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'status',
			element,
			deck,
			...mergedOptions,
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Initialize the Status component
		this.init();
	}
}