/**
 * @module js.components.component
 * @description Base component infrastructure providing storage, state
 * 				management, event handling, and transitions.
 */

/**
 * @class Component
 * @classdesc Base class for creating components with storage, state management,
 * 			  event handling, and transitions.
 */
class Component {

	constructor(context) {

		// Generate a unique identifier for the instance
		this.dci 				= Math.random().toString(36).substring(2, 9);

		// Initialize instance properties with default values
		this.name				= null;								// Component name
		this.type				= null;								// Component type (optional)
		this.element			= null;								// DOM element associated with the component
		this.deck				= null;								// Deck reference
		this.debug				= false;							// Debug mode flag
		this.storage			= false;							// Storage feature flag | 'local' or 'session'
        this.storageExpiry		= null;								// ms (e.g., 86400000)
        this.persistKeys		= null;								// Array of keys to save
		this.stateKey			= `${context.name}-${this.dci}`;	// Unique key for state persistence
		this.state				= {};								// Component state object
		this.timeout			= undefined;						// Timeout property for delayed actions
		this.isTransitioning	= false;							// Flag indicating if a transition is active
		this.transitions		= { enter: false, leave: false	};	// Transition states for enter/leave animations
		this.maxMobileWidth		= '640px';							// Default maximum width for mobile devices

		this.watchers			= [];								// Active watchers
		this.listeners          = []; 								// Tracked event listeners

		// Merge the context object into the instance, overriding defaults
		Object.assign(this, context);

		// Merge configuration with data attributes, overriding context properties if necessary
		// highest priority for per-page overrides
		Object.assign(this, this.#getConfigAttribute());

		// Set storage key - deterministic identifier
		this.stateKey = `${this.name}-${this.element?.id || 'global'}`;

		// Initialize storage-related functionality if enabled
		this.#initStorage()

		// Ensure the component's name is applied as a CSS class on the associated element
		if (this.element && !this.element.classList.contains(`${this.name}`)){
            this.element.classList.add(`${this.name}`)
        }
	}

	/**
	 * @method #getConfigAttribute
	 * @description Look for config in data-ui-config, data-[name], or [name]
	 * 
	 * @returns {Object} The configuration object parsed from the element's data attributes.
	 * @private
	 */
	#getConfigAttribute() {

		// Safety check: if no element exists, return empty object
		if (!this.element) return {};

		// Define priority of attributes to check
        // Add 'data-config' as a generic fallback for any component
        const attribute = [
            `data-${this.name}-config`, 
            `data-${this.name}`, 
            this.name, 
            'data-config' 
        ].find(attr => this.element.hasAttribute(attr));

		// If no matching attribute found, return empty object (not false)
        if (!attribute) return {};

		// Retrieve the attribute value, trim whitespace, and ensure it's not empty
		const value = this.element.getAttribute(attribute)?.trim();
        if (!value) return {};

		return value.split(';').map(pair => pair.trim()).filter(Boolean).reduce((acc, pair) => {

			// Split each pair at the first ':' and trim whitespace
            const [key, val] = pair.split(':').map(item => item.trim());
            
            // Ensure we have both a key and a value before processing
            if (!key || val === undefined) return acc;

            // Handle Arrays
			// Check if the value contains multiple comma-separated values
            if (val.includes(',')) {
                acc[key] = val.split(',').map(item => item.trim());
            }

            // Handle Booleans
			// Convert "true" and "false" (case-insensitive) to boolean values
            else if (val.toLowerCase() === 'true') acc[key] = true;
            else if (val.toLowerCase() === 'false') acc[key] = false;

            // Handle Numbers (ensuring empty strings aren't treated as 0)
			// Convert numeric strings to numbers
            else if (!isNaN(val) && val !== '') {
                acc[key] = parseFloat(val);
            }
            // Default to String
            else {
                acc[key] = val;
            }

            return acc;

        }, {});

	}
	
	/**
	 * Initializes the component.
	 * Intended to be overridden by subclasses to perform setup tasks such as
	 * initializing state and rendering the initial UI.
	 */
	init() {
		// Initialization logic for the component
	}

	/**
	 * Registers event listeners for the component.
	 * Intended to be overridden by subclasses to handle user interactions.
	 */
	initEvents() {
		// Event initialization logic for the component
	}

	/**
	 * Initializes the component state using the Deck state system.
	 */
	initState() {

		if (this.deck) {

			// Hydration with Expiry check
			let saved = {};
			if (this.storage) {
				try {
					const raw = this.storage.get('envelope');
					if (raw) {
						const env = JSON.parse(raw);
						if (env.expires && Date.now() > env.expires) {
							this.storage.remove('envelope');
						} else {
							saved = env.data;
						}
					}
				} catch (e) { console.warn('Storage corrupt'); }
			}

			const deckState = this.deck.getState(this.stateKey) || {};
      		this.state = { ...this.state, ...deckState, ...saved };

			const initialState = this.deck.getState(this.stateKey) || {};
			this.state = { ...initialState };
			
			// Persistence Watcher
			this.watch('stateChange', (combinedState) => {
				const myState = combinedState[this.stateKey];
				if (myState !== undefined) {
					this.state = { ...this.state, ...myState };
					if (this.storage) this.#syncToStorage();
					this.onStateChange(this.state);
				}
			});
		}
	}

	/**
	 * Initializes storage for the component (localStorage or sessionStorage).
	 * @private
	 * @note Two same components will share the storage [fix this?]
	 */
	#initStorage() {

        if (!['local','session'].includes(this.storage)) return;

        const storageType = `${this.storage}Storage`;
		const prefix = `${this.name}_${this.element?.id || 'default'}`;
        
       this.storage = {
            set: (k, v) => window[type].setItem(`${prefix}_${k}`, v),
            get: (k)	=> window[type].getItem(`${prefix}_${k}`),
            remove: (k) => window[type].removeItem(`${prefix}_${k}`)
        };
    }


	#syncToStorage() {
        const data = this.persistKeys 
            ? Object.keys(this.state).filter(k => this.persistKeys.includes(k)).reduce((o, k) => { o[k] = this.state[k]; return o; }, {})
            : this.state;

        this.storage.set('envelope', JSON.stringify({
            data,
            expires: this.storageExpiry ? Date.now() + this.storageExpiry : null
        }));
    }

	/**
	 * @method reset
	 * @description Resets the component to its default state and clears storage.
	 */
	reset() {
		this.log(`Resetting component: ${this.name}`, 'log');
		
		// Clear internal state
		this.state = {};
		
		// Clear its specific storage envelope
		if (this.storage) {
			this.storage.remove('ui_state_envelope');
		}

		// 3. Re-run initialization to restore defaults and re-render
		if (typeof this.init === 'function') {
			this.init();
		}
		
		// 4. Trigger state change for UI updates
		this.handleStateChange();
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
	 * @param {Object} state - The current state of the component.
	 */
	onStateChange(state) {}

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
	log(message, type = 'error') {
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
	 * @method initWssAwareness
	 * @description Optional helper to auto-bind connection hooks.
	 */
	initWssAwareness() {
		if (!this.deck) return;

		// Listen for global signals and trigger local hooks if they exist
		this.listen('wssConnect', () => {
			if (typeof this.onConnect === 'function') this.onConnect();
		});

		this.listen('wssDisconnect', () => {
			if (typeof this.onDisconnect === 'function') this.onDisconnect();
		});

		// Immediate check for current state
		if (this.deck.isConnected()) {
			if (typeof this.onConnect === 'function') this.onConnect();
		}
	}

	/**
	 * @method watch
	 * @description Component-level watch that tracks itself for automatic cleanup.
	 */
	watch(key, callback) {
		if (!this.deck) return;
		
		// Bind the callback to 'this' so the component context is preserved
		const boundCallback = callback.bind(this);
		
		// Subscribe via Deck
		const unwatchFn = this.deck.watch(key, boundCallback);
		
		// Store the cleanup function
		this.watchers.push({ key, unwatchFn });
		
		return unwatchFn;
	}

	/**
	 * @method unwatchAll
	 * @description Clears all state watchers for this component.
	 */
	unwatchAll() {
		this.watchers.forEach(watcher => watcher.unwatchFn());
		this.watchers = [];
	}

	/**
     * @method listen
     * @description Subscribes to a Deck/Dispatcher event and tracks it for auto-cleanup.
	 * 
     * @param {string} eventName - The name of the event to listen for.
     * @param {Function} callback - The function to execute.
     * @returns {Function} The unsubscribe function.
     */
    listen(eventName, callback) {
        if (!this.deck) return;

        // Bind the callback to the component instance
        const boundCallback = callback.bind(this);

        // Subscribe to the dispatcher (Deck inherits from Dispatcher)
        // This relies on the .on() method returning the unregister function
        const unlistenFn = this.deck.on(eventName, boundCallback);

        // Store in watchers for automatic cleanup in destroy()
        this.watchers.push({ key: eventName, unwatchFn: unlistenFn });

        return unlistenFn;
    }

	/**
     * @method unlisten
     * @description Unsubscribes to a Deck/Dispatcher event and tracks it for auto-cleanup.
	 */
	unlisten(eventName) {
		// Find the watcher and execute its cleanup
		this.watchers = this.watchers.filter(w => {
			if (w.key === eventName) {
				w.unwatchFn();
				return false; // Remove from array
			}
			return true;
		});
	}

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
        this.listeners.push({ eventName, handler, options });
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
        this.listeners = this.listeners.filter(l => 
            !(l.eventName === eventName && l.handler === handler)
        );
	}

	/**
	 * Adds an event listener that will execute only once.
	 * 
	 * @param {string} eventName - The name of the event.
	 * @param {function} handler - The function to handle the event.
	 */
	one(eventName, handler) {
		if (!this.element) return;
        // Tracking 'once' is tricky because it self-removes; 
        // but we track it anyway so destroy() can kill it if it hasn't fired yet.
        this.element.addEventListener(eventName, handler, { once: true });
        this.listeners.push({ eventName, handler, options: { once: true } });
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
	
	/**
     * @method transition
     * @description Executes a CSS transition using the Active/Start/End class pattern.
	 * 
     * @param {string} type - 'enter' or 'leave'
     * @param {HTMLElement} [element=this.element] - Target element
     * @returns {Promise} Resolves when the transition completes
     */
    async transition(type, element = this.element) {
        if (!element || !this.transitions[type]) return;

        const baseClass = this.transitions[`transition${type.charAt(0).toUpperCase() + type.slice(1)}`]; // e.g., transitionEnter
        const startClass = this.transitions[`transition${type.charAt(0).toUpperCase() + type.slice(1)}Start`];
        const endClass = this.transitions[`transition${type.charAt(0).toUpperCase() + type.slice(1)}End`];

        if (!baseClass) return;

        this.isTransitioning = true;

        // Cleanup previous states and add Start + Active classes
        element.classList.remove(startClass, endClass); // Clean slate
        element.classList.add(baseClass);
        element.classList.add(startClass);

        // Force a "reflow" to ensure the browser registers the 'Start' state
        // Without this, the browser skips the animation and jumps to the end.
        void element.offsetHeight;

        return new Promise((resolve) => {
            const duration = this.#getTransitionDuration(element);

            const done = (e) => {
                // Ensure we only trigger for the main element, not bubbling children
                if (e && e.target !== element) return;

                element.classList.remove(baseClass, endClass);
                this.isTransitioning = false;
                resolve();
            };

            // Set a fallback timer in case transitionend fails to fire (e.g., element hidden)
            this.setTimeout(done, duration + 50);

            // Start the transition by swapping classes
            window.requestAnimationFrame(() => {
                element.classList.remove(startClass);
                element.classList.add(endClass);
            });

            // Listen for the native event for precision
            element.addEventListener('transitionend', done, { once: true });
            element.addEventListener('animationend', done, { once: true });
        });
    }

    /**
     * Helper to calculate the total duration (delay + duration) of an element's CSS.
     */
    #getTransitionDuration(element) {
        const style = window.getComputedStyle(element);
        const duration = parseFloat(style.transitionDuration) || parseFloat(style.animationDuration) || 0;
        const delay = parseFloat(style.transitionDelay) || parseFloat(style.animationDelay) || 0;
        return (duration + delay) * 1000;
    }

	/**
     * @method destroy
     * @description Cleanly removes the component, listeners, and watchers.
     */
	destroy() {

		if (!this.element) return;

        // Remove all state watchers automatically
        this.unwatchAll();

		// Auto-remove all tracked event listeners
        this.listeners.forEach(({ eventName, handler, options }) => {
            this.element.removeEventListener(eventName, handler, options);
        });

        this.listeners = [];

        // Remove event listeners (if logic exists in subclass)
        if (typeof this.removeEvents === 'function') {
            this.removeEvents();
        }

        // Cleanup Deck references
        if (this.element.uiInstances) {
            delete this.element.uiInstances[this.name];
        }
        
        // Remove from global Deck instances
        if (this.deck && this.deck.instances[this.dci]) {
            delete this.deck.instances[this.dci];
        }

        console.log(`Component ${this.name} [${this.dci}] destroyed.`);

	}

	/**
	 * Default component renderer.
	 */
	render() {} 

}

export default Component;