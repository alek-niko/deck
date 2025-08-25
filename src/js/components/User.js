// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * User component for managing user-related functionalities and interactions.
 * 
 * The User component handles user-specific data such as profile details,
 * authentication status, and interaction history.
 * 
 * @class User
 * @extends Component
 * 
 * @todo Implement authentication and authorization handling.
 * @note Ensure that the `element` parameter is a valid DOM element. The component assumes 
 *       the element exists in the DOM when instantiated.
 */
class User extends Component {
	/**
	 * Creates an instance of the User component.
	 *
	 * @param {HTMLElement} element		- The DOM element to which the User component will be applied.
	 * @param {Object} [options={}]		- Configuration options for the User component. Defaults to an empty object.
	 * @param {Deck} [deck=null]		- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'user',
			element,
			deck,
			...mergedOptions,
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Attempt to hydrate user data, and throw an error if it fails
		this.hydrate().catch(error => {
			throw new Error(`Failed to initialize user: ${error.message}`);
		});

		// Initialize the User component
		//this.#init();
	}

	/**
	 * Private method to initialize the User component.
	 */
	#init() {
		console.log('User initialized');
	}

	/** 
	 * Fetch user details from API.
	 * @param {string|number} identifier - The user ID or username.
	 * @returns {Promise<Object>} - User details in JSON format.
	 */
	// async hydrate(identifier) {
	// 	// Determine query parameter based on identifier type
	// 	const param = typeof identifier === 'number'
	// 		? `id=${identifier}` // If number, treat as user ID
	// 		: `username=${encodeURIComponent(identifier)}`; // If string, treat as username

	// 	// Construct API URL with the appropriate query parameter
	// 	const url = `/api/user?${param}`;

	// 	// Attempt to fetch user data from the API
	// 	const response = await fetch(url).catch(() => null);
	// 	if (!response || !response.ok) return null; // Return null if request fails or response is not OK

	// 	return response.json().catch(() => null); // Parse JSON safely, return null on failure
	// }

	/**
	 * Fetch and update the user instance with data from the API (instance method).
	 * @throws {Error} If user data cannot be fetched.
	 * @returns {Promise<Object>} The fetched user data.
	 */
	async hydrate() {
		// Determine identifier (prefer ID over username if both exist)
		const identifier = this.id ?? this.username;
		if (!identifier) throw new Error('User identifier is missing'); // Ensure an identifier exists

		// Fetch user data from API
		const json = await User.#fetch(identifier);
		if (!json) throw new Error('User data could not be fetched'); // Throw error if no data returned

		// Merge fetched data into the current instance
		Object.assign(this, json);
		return json;
	}

	/**
	 * Fetch user details from API (static method).
	 * Can be used without creating an instance.
	 * @param {string|number} identifier - The user ID or username.
	 * @returns {Promise<Object|null>} - User details in JSON format or null on error.
	 */
	static async asJSON(identifier) {
		return this.#fetch(identifier);
	}

	/**
	 * Private method to fetch user data from API.
	 * @param {string|number} identifier - The user ID or username.
	 * @returns {Promise<Object|null>} - User details or null on error.
	 */
	static async #fetch(identifier) {

		// Determine query parameter based on identifier type
		const param = typeof identifier === 'number'
			? `id=${identifier}` // If number, treat as user ID
			: `username=${encodeURIComponent(identifier)}`; // If string, treat as username

		// Construct API URL with the appropriate query parameter
		const url = `/api/user?${param}`;

		// Attempt to fetch user data from the API
		const response = await fetch(url).catch(() => null);
		if (!response || !response.ok) return null; // Return null if request fails or response is not OK

		return response.json().catch(() => null); // Parse JSON safely, return null on failure
	}
}

export default User;