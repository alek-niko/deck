/**
 * @class Deck
 * @extends Dispatcher
 * @classdesc Core class that acts as the main application controller. 
 * Manages components, state, and utility instances.
 */

import Dispatcher from './Dispatcher.js';
//import Queue from '../util/Queue.js';
import UI from '../ui/UI.js';
import Util from '../util/Util.js';
import Toast from '../components/Toast.js';


export default class Deck extends Dispatcher {

	constructor(options = {}) {

		super();

		// Configuration options for the Deck instance.
		this.options = options instanceof Object ? options : {};

		this.components = {};				// Registered components
		this.instances = {};				// Instances of initialized components
		this.events = {};					// Event listeners for the Deck instance
		this.ui = new UI()					// UI utility instance for handling UI-related tasks
		this.util = new Util()				// General-purpose utility instance
		this.notifier = new Toast()			// Manages toast notifications
		//this.queue = new Queue()			// Queue utility instance
		//this.store = {};

		// Application state object wrapped in a Proxy to emit events on state changes
		this.state = new Proxy(options.state || {}, {
			set: (state, key, value) => {
				state[key] = value;
				this.emit('stateChange', { [key]: value });
				return true;

				if (state[key] !== value) {
					state[key] = value;
					this.emit('stateChange', { [key]: value });
				}
			},
		});

		// Emit a global event to indicate Deck is ready
		document.dispatchEvent(new CustomEvent('deck.ready', { detail: this }));
	}

	 /**
     * @method register
     * @description Registers component constructors and creates factory methods for them.
     * 
     * @param {Object} components - A dictionary of component constructors keyed by component names.
     */
	register(components) {
		for (const name in components) {
			this.components[name] = (...args) => {
				const element = args[0] instanceof HTMLElement
									? args[0]
									: typeof args[0] === 'string' 
										? document.querySelector(args[0]) 
										: null;
				
				const options = args[1] instanceof Object && !(args[1] instanceof HTMLElement) 
									? args[1] 
									: args.length === 1 && 
									  args[0] instanceof Object && 
									  !(args[0] instanceof HTMLElement) 
											? args[0] 
											: undefined;
				
				const instance = new components[name](element, options, this);
								
				return instance;
			};
		}
	}

	/**
     * @method autoload
     * @description Automatically initializes components based on their presence in the DOM.
     * 
     * @param {string[]|string} filter - A list of component names or a single component name to autoload.
     * @param {HTMLElement} [context=document] - The DOM context to search for components.
     */
	autoload(filter, context = document) {
		const components = filter instanceof Array ? filter : Object.keys(this.components);

		components.forEach((component) => {
			
			// Using HTML 'valid' attribute [update]
			const elements = context.querySelectorAll(`.${component}, [${component}], [data-${component}]`);

			elements.forEach((element) => {
				try {
					const instance = this.components[component](element);
					//element.dataset.dci = `${Math.random().toString(36).substr(2, 9)}`;
					element.dataset.dci = instance.dci;
					this.instances[element.dataset.dci] = instance;
				} catch (error) {
					console.error(error);
				}
			});
		});
	}

	/**
     * @method getInstance
     * @description Retrieves a component instance by its unique identifier (DCI) or associated element.
     * 
     * @param {string|HTMLElement} input - The DCI string or the element associated with the component.
     * @returns {Object|null} The component instance, or null if not found.
     */
	getInstance(input) {
		let dci;

		if (typeof input === 'string') {
			dci = input;
		} else if (input instanceof HTMLElement) {
			dci = input.dataset.dci;
		}
	
		return dci ? this.instances[dci] || null : null;
	}

	/**
     * @method getState
     * @description Retrieves a value from the application state by its key.
     * 
     * @param {string} key - The state key to retrieve.
     * @returns {*} The value associated with the key.
     */
	getState(key) {
		return this.state[key];
	}

	/**
     * @method setState
     * @description Sets a value in the application state and triggers a state change event.
     * 
     * @param {string} key - The state key to set.
     * @param {*} value - The value to associate with the key.
     */
	setState(key, value) {
		this.state[key] = value; // This triggers the Proxy's set handler
	}

	/**
     * @method say
     * @description Temporary method for displaying a toast message.
	 * @note Rename to notification [?]
     * 
     * @param {string} message - The message to display.
     */
	say(...message) {
		this.notifier.notification(...message);
	}
}