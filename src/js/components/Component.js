/**
 * @class Component
 * @classdesc Base class for creating components with storage, state management, event handling, and transitions.
 */

export default class Component {

	constructor(context) {
		// Generate a unique identifier for the instance
		this.dci 				= Math.random().toString(36).substring(2, 9);

		// Initialize instance properties with default values
		this.name				= null;								// Component name
		this.type				= null;								// Component type (optional)
		this.element			= null;								// DOM element associated with the component
		this.debug				= false;							// Debug mode flag
		this.storage			= false;							// Storage feature flag
		this.stateKey			= `${context.name}-${this.dci}`;		// Unique key for state persistence
		this.state				= {};								// Component state object
		this.timeout			= undefined;						// Timeout property for delayed actions
		this.isTransitioning	= false;							// Flag indicating if a transition is active
		this.transitions		= { enter: false, leave: false	};	// Transition states for enter/leave animations
		this.maxMobileWidth		= '640px';							// Default maximum width for mobile devices
 
		// Merge the context object into the instance, overriding defaults
		Object.assign(this, context);

		// Merge configuration with data attributes, overriding context properties if necessary
		Object.assign(this, this.#getConfigAttribute());

		// Initialize storage-related functionality if enabled
		this.#initStorage()

		// Assign a state change callback, defaulting to a no-op if not provided
		this.onStateChange = this.onStateChange || function () {};

		// Alternative binding logic for onStateChange (commented out):
		// this.onStateChange = this.config.onStateChange || this.onStateChange.bind(this);

		// Optional render callback, defaulting to a no-op if not provided
		this.render = this.render || function () { };

		// Ensure the component's name is applied as a CSS class on the associated element
		if (this.element && !this.element.classList.contains(`${this.name}`)){
            this.element.classList.add(`${this.name}`)
        }
	}

	/**
	 * Retrieves configuration from the element's data attributes and merges it with the instance.
	 * 
	 * @returns {Object} The configuration object parsed from the element's data attributes.
	 * @private
	 */
	#getConfigAttribute() {

		if (!this.element) return;

		// Check if the element has either `this.name` or `data-this.name` attribute and return the first match
		const attribute = [this.name, `data-${this.name}`].find(attr => this.element.hasAttribute(attr));
		if (!attribute) return false;

		// Retrieve the attribute value, trim whitespace, and ensure it's not empty
		const value = this.element.getAttribute(attribute)?.trim();
		if (!value) return;
	
		// Parse the configuration string into an object
		const keyValuePairs = value.split(';').map(pair => pair.trim()).filter(Boolean);
	
		// Convert an array of key-value string pairs into a JavaScript object
		const jsObject = keyValuePairs.reduce((acc, pair) => {

			// Split each pair at the first ':' and trim whitespace
			const [key, value] = pair.split(':').map(item => item.trim());

			// Check if the value contains multiple comma-separated values
			if (value.includes(',')) {
				acc[key] = value.split(',').map(item => item.trim()); // Convert to an array of trimmed strings
			}

			// Convert "true" and "false" (case-insensitive) to boolean values
			else if (value.toLowerCase() === 'true') { acc[key] = true; }
			else if (value.toLowerCase() === 'false') { acc[key] = false; } 

			// Convert numeric strings to numbers
			else if (!isNaN(value)) {acc[key] = parseFloat(value);}

			// Otherwise, store the value as a string
			else { acc[key] = value; }

			return acc;

		}, {});

		Object.assign(this, jsObject);

		return jsObject;
	}
	
	/**
	 * Initializes the component (to be overridden by subclasses).
	 * e.g., setup default state, render initial UI, etc.
	 */
	init() {
		// Initialization logic for the component
	}

	/**
	 * Attach event listeners to the component (to be overridden by subclasses).
	 * e.g., for user interactions like clicks, hover, etc.
	 */
	initEvents() {
		// Event initialization logic for the component
	}

	/**
	 * Initializes the component's state using the deck's state system.
	 */
	initState() {

		if (this.deck) {
			const initialState = this.deck.getState(this.stateKey) || {};

			this.state = { ...initialState };
	
			this.deck.on('stateChange', (newState) => {
			  if (newState[this.stateKey] !== undefined) {
				this.state = { ...this.state, ...newState[this.stateKey] };
				this.handleStateChange();
			  }
			});
		}
	}

	/**
	 * Initializes storage for the component (localStorage or sessionStorage).
	 * @private
	 */
	#initStorage() {

		if (!['local','session'].includes(this.storage)) return;

		this.storage = {
			set: (key, value) => {
					key = `${this.name}_${key}`;
					window[`${this.storage}Storage`].setItem(key, value);
				 },
			get: (key) => {
					key = `${this.name}_${key}`;
					return window[`${this.storage}Storage`].getItem(key);
				 },
			remove: (key) => {
					key = `${this.name}_${key}`;
					window[`${this.storage}Storage`].removeItem(key);
				 },
		};
	}

	/**
	 * Updates the component's state and saves it to the deck.
	 * 
	 * @param {Object} newState - The new state to merge with the current state.
	 */
	updateState(newState) {
		const updatedState = { ...this.state, ...newState };
		if (this.deck) {
			this.deck.setState(this.stateKey, updatedState);
		}
	}

	/**
	 * Handles state change events.
	 */
	handleStateChange() {
		//console.log('Component state updated:', this.state);
		this.onStateChange(this.state);
		// Update the DOM or perform other actions based on the new state
	}

	/**
	 * Default state change callback that can be overridden by subclasses or options.
	 * 
	 * @param {Object} state - The current state of the component.
	 */
	onStateChange(state) {
		// Default implementation (can be overridden by subclasses or options)
		//console.log('Default onStateChange:', state);
	}

	/**
	 * Checks if the device is in mobile viewport.
	 * 
	 * @returns {boolean} True if the device width is below the maxMobileWidth threshold.
	 */
	isMobile() {
		return window.matchMedia(`(max-width: ${this.maxMobileWidth})`).matches;
	};

	/**
	 * Logs messages to the console if debugging is enabled.
	 * 
	 * @param {string} message - The message to log.
	 * @param {string} [type='error'] - The log type (e.g., 'error', 'log', 'warn').
	 */
	debug(message, type = 'error') {
		if (!this.debug) return;

		console[type](message);
	};

	/**
	 * Sets a timeout for a handler function.
	 * 
	 * @param {function} handler - The callback function to execute after the timeout.
	 * @param {number} timeout - The delay in milliseconds before executing the handler.
	 */
	setTimeout = (handler, timeout) => {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(handler, timeout);
	};

	/**
	 * Adds an event listener to the component's element.
	 * 
	 * @param {string} eventName - The name of the event.
	 * @param {function} handler - The function to handle the event.
	 * @param {boolean|Object} [options=false] - Optional event listener options.
	 */
	on(eventName, handler, options = false) {
		if (!this.element) return;
		this.element.addEventListener(eventName, handler, options);
	}

	/**
	 * Removes an event listener from the component's element.
	 * 
	 * @param {string} eventName - The name of the event.
	 * @param {function} handler - The function that handles the event.
	 * @param {boolean|Object} [options=false] - Optional event listener options.
	 */
	off(eventName, handler, options = false) {
		if (!this.element) return;
		this.element.removeEventListener(eventName, handler, options);
	}

	/**
	 * Adds an event listener that will execute only once.
	 * 
	 * @param {string} eventName - The name of the event.
	 * @param {function} handler - The function to handle the event.
	 */
	one(eventName, handler) {
		if (!this.element) return;
		this.element.addEventListener(eventName, handler, { once: true });
	}

	/**
	 * Dispatches an event (built-in or custom) from the component's element.
	 * 
	 * @param {string} eventName - The name of the event to dispatch.
	 * @param {Object} [detail=null] - The detail data to include in the event.
	 * @param {boolean} [isCustom=false] - Indicates if the event is custom.
	 * @param {HTMLElement} [context=this.element] - The context to dispatch the event from.
	 */
	dispatchEvent = (eventName, detail = null, isCustom = false, context = this.element) => {
		if (!context) return;

		// const event = isCustom
		// 	? new CustomEvent(eventName, { detail: { self: this, ...detail }, bubbles: true, cancelable: true })
		// 	: new Event(eventName, { bubbles: true, cancelable: true });

		const event = isCustom
			? new CustomEvent(eventName, { detail, bubbles: true, cancelable: true })
			: new Event(eventName, { bubbles: true, cancelable: true });

		// context.dispatchEvent(event);

		const dispatched = context.dispatchEvent(event);

		// Check if any listener explicitly returned false
		if (!dispatched || event.defaultPrevented) {
			return false; // Event was canceled
		}

		// Optional external deck emitter
		if (this.deck) {
			this.deck.emit(eventName, detail);
    	}

		return true;
	};

	// [STATUS: DELAYED]
	// #initTransition() { 

	// 	if (this.transitions.enter) {
	// 		this.transitions = Object.assign(
	// 			{
	// 				transitionEnter: null,
	// 				transitionEnterStart: null,
	// 				transitionEnterEnd: null,
	// 			},
	// 			this.transitions
	// 		);
	// 	}

	// 	if (this.transitions.leave) {
	// 		this.transitions = Object.assign(
	// 			{
	// 				transitionLeave: null,
	// 				transitionLeaveStart: null,
	// 				transitionLeaveEnd: null,
	// 			},
	// 			this.transitions
	// 		);
	// 	}

	// 	this.hasTransition =
	// 		this.transitions.transitionEnter ||
	// 		this.transitions.transitionLeave
	// 			? true
	// 			: false;
	// }

	/**
	 * Run a transition/animation.
	 * 
	 * @param {string} type transitionEnter/transitionLeave
	 * @param {HTMLElement} element 
	 * @param {function} callback
	 * @returns 
	 */
	// transition = (type, element, callback) => {
	// 	let transitionEvent = 'transitionend';
	// 	callback = typeof callback === 'function' ? callback : () => void 0;

	// 	if (!this.transitions[`${type}`]) {
	// 		return false;
	// 	}

	// 	const transitionCleanup = (element) => {
	// 		const transitions = ['transitionEnter', 'transitionLeave'];

	// 		for (const transition of transitions) {
	// 			element.classList.remove(this.transitions[`${transition}`]);
	// 			element.classList.remove(this.transitions[`${transition}Start`]);
	// 			element.classList.remove(tthis.transitions[`${transition}End`]);
	// 		}
	// 	};

	// 	transitionCleanup(element);
	// 	element.classList.add(this.transitions[`${type}`]);
	// 	element.classList.add(this.transitions[`${type}Start`]);

	// 	let animationDuration = parseFloat(window.getComputedStyle(element).animationDuration);

	// 	transitionEvent = isNaN(animationDuration) || animationDuration <= 0
	// 		? transitionEvent
	// 		: 'animationend';

	// 	const _handler = (e) => {
	// 		this.isTransitioning = false;
	// 		callback(e);
	// 		element.classList.remove(this.transitions[`${type}`]);
	// 		element.classList.remove(this.transitions[`${type}End`]);
	// 	};

	// 	element.addEventListener(
	// 		transitionEvent.replace('end', 'start'),
	// 		() => this.isTransitioning = true,
	// 		{ once: true }
	// 	);

	// 	element.addEventListener(transitionEvent, _handler, { once: true });

	// 	window.requestAnimationFrame(() => {
	// 		element.classList.remove(this.transitions[`${type}Start`]);
	// 		element.classList.add(this.transitions[`${type}End`]);
	// 	});

	// 	return true;
	// };

	/**
	 * Destroys the component and removes its instance from the element.
	 */
	destroy() {
		if (!this.element) return;
		this.#removeInstance(this.element, this.component.name);
	}

	/**
	 * Removes the component's instance from the element.
	 * @note Fix This
	 * 
	 * @param {HTMLElement} element - The element to remove the instance from.
	 * @param {string} component - The name of the component.
	 * @private
	 */
	#removeInstance = (element, component) => {
		if (!element) return;

		if (element[Deck.config.elementPropName]) {
			delete element[Deck.config.elementPropName][component];
		}
	}
}
