/**
 * @module deck
 * @description Core application controller that manages components, state,
 * utility instances, and orchestrates the main application logic.
 * @description Core application controller that manages components, state,
 *				utility instances, and orchestrates the main application logic.
 */

import Dispatcher from './dispatcher.js';
import UI from '../ui/ui.js';
import Util from '../util/util.js';
import Toast from '../components/toast.js';
import tooltip from '../components/tooltip.js';

/**
 * @class Deck
 * @extends Dispatcher
 * @classdesc Acts as the main application controller, coordinating components,
 * 			  state management, and utility services.
 */
class Deck extends Dispatcher {

	constructor(options = {}) {

		super();

		// Configuration options for the Deck instance.
		this.options = options instanceof Object ? options : {};

		this.components = {};				// Registered components
		this.instances = {};				// Instances of initialized components (keyed by DCI)
		this.ui = new UI()					// UI utility instance
		this.util = new Util()				// General-purpose utility instance
		this.notifier = new Toast()			// Manages toast notifications
		this.tooltip = tooltip;
		
		this.isLoaded = false;              // Flag to track initial autoload
		this.watchers = {};					// Internal storage for watch callbacks

		// Application state object wrapped in a Proxy; emits events on state changes
		this.state = new Proxy(options.state || {}, {
			set: (state, key, value) => {
				// Only trigger if value actually changed to prevent infinite loops
				if (state[key] !== value) {
					state[key] = value;

					// Emit the generic global state change
					this.emit('stateChange', { [key]: value });

					// Trigger specific watchers for this key
					if (this.watchers[key]) {
						this.watchers[key].forEach(callback => callback(value));
					}
				}
			},
		});

		// Start the Auto-Cleanup Observer
		this.#initCleanupObserver();

		// Emit a global event to indicate Deck is ready
		document.dispatchEvent(new CustomEvent('deck.ready', { detail: this }));
	}

	/**
	 * @method register
	 * @description Registers component constructors and creates factory methods.
	 * * @param {Object} components - A dictionary of component constructors.
	 */

	register(components) {
		for (const name in components) {

			this.components[name] = (...args) => {

				// ELEMENT
				const element = args[0] instanceof HTMLElement
									? args[0]
									: typeof args[0] === 'string' 
										? document.querySelector(args[0]) 
										: null;
				// OPTIONS
				const options = args[1] instanceof Object && !(args[1] instanceof HTMLElement) 
									? args[1] 
									: args.length === 1 && 
									  args[0] instanceof Object && 
									  !(args[0] instanceof HTMLElement) 
											? args[0] 
											: {}; // was: undefined;
				
				// Construct the instance
				return new components[name](element, options, this);		
			};
		}
	}

	/**
	 * @method autoload
	 * @description Automatically initializes components based on their presence in the DOM.
	 * 				Prevents double-initialization by checking for existing DCIs.
	 * 
	 * @param {string[]|string} [filter] - Specific components to load.
	 * @param {HTMLElement} [context=document] - The DOM context to search.
	 */
	autoload(filter, context = document) {

		const components = filter instanceof Array
							? filter
							: (typeof filter === 'string' ? [filter] : Object.keys(this.components));

		components.forEach((component) => {

			// Supports multi-selector logic + data-ui standard
			const selector = `.${component}, [${component}], [data-${component}], [data-component="${component}"], [data-ui~="${component}"]`;
			const elements = context.querySelectorAll(selector);

			elements.forEach((element) => {

				 // Fail-proof: Check if this specific component type is already initialized on this element
				if (this.#hasInstanceOnElement(element, component)) {
					return;
				}

				try {
					const instance = this.components[component](element);

					// The Component constructor handles its own dci generation.
					// We simply register what the instance provides.
					this.#registerInstance(element, component, instance.dci, instance);

				} catch (error) {
					console.error(`Deck: Failed to initialize component "${component}"`, error);
				}
			});
		});
	}

	/**
	 * @method reinit
	 * @description Re-scans a specific DOM branch for new components.
	 * 				Useful for AJAX/HTMX content updates.
	 * * @param {HTMLElement} [target=document] - The element to scan.
	 */
	reinit(target = document) {
		this.autoload(null, target);
	}

	/**
	 * Internal helper to track instances and prevent duplicates.
	 * Stores instances in the global this.instances map and maps them to the element.
	 */
	#registerInstance(element, componentName, dci, instance) {
		// Store in the global registry
		this.instances[dci] = instance;

		// Update the element's tracking attributes
		element.dataset.dci = dci; // Primary DCI

		// Keep a internal reference for multi-component support on one element
		if (!element.uiInstances) {
			element.uiInstances = {};
		}

		element.uiInstances[componentName] = dci;
	}

	/**
	 * Internal helper to check if a component is already active on an element.
	 */
	#hasInstanceOnElement(element, componentName) {
		return element.uiInstances && element.uiInstances[componentName];
	}

	/**
	 * @method getInstance
	 * @description Retrieves a component instance by its unique identifier (DCI) or associated element.
	 * 
	 * @param {string|HTMLElement} input - The DCI string or the element associated with the component.
	 * @returns {Object|null} The component instance, or null if not found.
	 */
	getInstance(input) {
		let dci = (input instanceof HTMLElement) ? input.dataset.dci : input;
		return dci ? this.instances[dci] || null : null;
	}

	/**
	 * @method update
	 * @description Finds a component instance on an element and updates its options.
	 * 
	 * @param {HTMLElement|string} target - The element or selector.
	 * @param {string} componentName - The name of the component to update.
	 * @param {Object} options - New configuration options.
	 */
	update(target, componentName, options = {}) {
		
		const element = target instanceof HTMLElement ? target : document.querySelector(target);
		if (!element || !element.uiInstances) return;

		const dci = element.uiInstances[componentName];
		const instance = this.instances[dci];

		if (instance && typeof instance.update === 'function') {
			instance.update(options);
		}
	}

	/**
	 * @method watch
	 * @description Subscribes a callback to a specific state key.
	 * 
	 * @param {string} key - The state key to monitor.
	 * @param {Function} callback - Function to execute when the key changes.
	 */
	watch(key, callback) {

		if (!this.watchers[key]) this.watchers[key] = [];

		this.watchers[key].push(callback);
		
		// Return an unwatch function for easy cleanup
		return () => this.unwatch(key, callback);
	}

	/**
	 * @method unwatch
	 * @description Removes a specific callback from a state key.
	 */
	unwatch(key, callback) {
		if (!this.watchers[key]) return;
		this.watchers[key] = this.watchers[key].filter(cb => cb !== callback);
	}

	/**
	 * @method #initCleanupObserver
	 * @description Watches the entire DOM for removed elements and destroys their instances.
	 */
	#initCleanupObserver() {

		const observer = new MutationObserver((mutations) => {

			mutations.forEach((mutation) => {
				mutation.removedNodes.forEach((node) => {

					// Only care about HTMLElements
					if (!(node instanceof HTMLElement)) return;

					// RE-PARENTING CHECK:
					// Wait one "tick" (microtask) to see if the node was 
					// re-inserted elsewhere in the DOM.
					queueMicrotask(() => {

						 if (node.isConnected) return; // It was just moved!

						// Find the element itself or any children that have components
						const elementsWithComponents = [
							...(node.dataset.dci ? [node] : []),
							...node.querySelectorAll('[data-dci]')
						];

						elementsWithComponents.forEach((el) => {
							const dci = el.dataset.dci;
							if (dci && this.instances[dci]) {
								// Trigger the component's internal cleanup
								this.instances[dci].destroy();
							}
						});

					});
				});
			});
			
		});

		// Observe the body for child removals
		observer.observe(document.body, { childList: true, subtree: true });
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
	 * @method clearAllState
	 * @description Wipes all framework-related persistent storage and resets active instances.
	 * @param {boolean} [reboot=true] - If true, triggers a reset on all active component instances.
	 */
	clearAllState(reboot = true) {

		const componentKeys = Object.keys(this.components);
        if (componentKeys.length === 0) return; // Nothing to clear

		// Create a regex that matches "ComponentName_..."
		const patterns = Object.keys(this.components).join('|');
		const regex = new RegExp(`^(${patterns})_`);
		
		[localStorage, sessionStorage].forEach(store => {
			for (let i = store.length - 1; i >= 0; i--) {
				const key = store.key(i);
				if (regex.test(key)) store.removeItem(key);
			}
		});

		// Optionally reset all active component instances
		if (reboot) {
			Object.values(this.instances).forEach(inst => inst.reset());
		}
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

export default Deck