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

		// Identity & Framework Internals
		this.dci 				= Math.random().toString(36).substring(2, 9);		// Generate a unique identifier for the instance
		this.name				= null;								// Component name
		this.element			= null;								// DOM element associated with the component
		this.deck				= null;								// Deck reference

		// Default Properties
		this.type				= null;								// Component type (optional)
		this.debug				= false;							// Debug mode flag
		this.storage			= false;							// Storage feature flag: 'local' | 'session' | 'false'
		this.storageExpiry		= null;								// ms (e.g., 86400000)
		this.persistKeys		= null;								// Array of keys to save
		this.timeout			= undefined;						// Timeout property for delayed actions
		this.isTransitioning	= false;							// Flag indicating if a transition is active
		this.transitions		= { enter: false, leave: false	};	// Transition states for enter/leave animations
		this.maxMobileWidth		= '640px';							// Default maximum width for mobile devices

		this.watchers			= [];								// Active watchers
		this.listeners          = []; 								// Tracked event listeners
		this.state				= {};								// Component state object

		// Merge Context (User Options)
		Object.assign(this, context);

		// Merge Data Attributes (Highest priority overrides)
		Object.assign(this, this.#getConfigAttribute());

		/**
         * State Key Logic
         * - If element has an ID: Use it (allows persistent targeted state)
         * - No ID: Use DCI (Instance isolation, volatile)
         */
        this.stateKey = this.element?.id 
            ? `${this.name}-${this.element.id}` 
            : `${this.name}-${this.dci}`;

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
     * @method initState
     * @description Merges defaults, global deck state, and local storage into the component instance.
     */
	initState() {

		if (!this.deck) return;

		// Hydration from Storage (Highest priority override)
        let saved = {};

        if (this.storage) {
            try {
                const raw = this.storage.get('envelope');
                if (raw) {
                    const env = JSON.parse(raw);
                    // Check for expiration
                    if (env.expires && Date.now() > env.expires) {
                        this.storage.remove('envelope');
                    } else {
                        saved = env.data || {};
                    }
                }
            } catch (e) { 
                this.log('Storage corruption detected, resetting storage state.', 'warn');
            }
        }

		// Merge logic: Default State < Deck State < Storage State
        const deckState = this.deck.getState(this.stateKey) || {};
        
        // We update this.state by merging all layers
        this.state = { 
            ...this.state, 
            ...deckState, 
            ...saved 
        };

        // Sync the merged result back to the Deck so other components stay in sync
        this.deck.setState(this.stateKey, this.state);

		// Persistence Watcher
        // Listens for external changes to this component's specific key
        this.watch('stateChange', (combinedState) => {
            const myState = combinedState[this.stateKey];
            
            if (myState !== undefined) {
                // Update local state object
                this.state = { ...this.state, ...myState };
                
                // If storage is active, sync the new state to disk
                if (this.storage) {
                    this.#syncToStorage();
                }

                // Trigger UI update hook
                this.onStateChange(this.state);
            }
        });
	}

	/**
     * @method #initStorage
     * @description Initializes storage only if a stable ID is present 
     * to prevent localStorage pollution from volatile DCIs.
     */
	#initStorage() {

		// Check if storage is even requested ('local' or 'session')
        if (!['local', 'session'].includes(this.storage)) {
            this.storage = false; // Reset to false to prevent errors in other methods
            return;
        }

		// SAFETY CHECK: Prevents Garbage/Pollution
        // If the element has no ID, we cannot guarantee a stable key across refreshes.
        // We disable storage for this instance to prevent "junk" keys.
        if (!this.element?.id) {
            console.warn(`Component [${this.name}]: Storage enabled but element has no ID. Persistence disabled to prevent garbage.`);
            this.storage = false;
            return;
        }

		const type = `${this.storage}Storage`;
        const prefix = this.stateKey;
        const engine = window[type];
        
        this.storage = {
            set: (k, v) => engine.setItem(`${prefix}_${k}`, v),
            get: (k)    => engine.getItem(`${prefix}_${k}`),
            remove: (k) => engine.removeItem(`${prefix}_${k}`)
        };
	}

	/**
     * @method #syncToStorage
     * @private
     * @description Persists the current state to the configured storage engine.
     */
	#syncToStorage() {

		if (!this.storage) return;

		// Determine what data to save
        const data = (this.persistKeys && Array.isArray(this.persistKeys))
            ? Object.fromEntries(
                Object.entries(this.state).filter(([key]) => this.persistKeys.includes(key))
              )
            : this.state;

		// Wrap in an envelope with a timestamp/expiry
        const envelope = {
            data,
            expires: this.storageExpiry ? Date.now() + this.storageExpiry : null
        };

        try {
            this.storage.set('envelope', JSON.stringify(envelope));
        } catch (e) {
            this.log('Failed to sync state to storage.', 'error');
        }
	}

	/**
     * @method reset
     * @description Resets the component to its default state and clears storage.
     */
	reset() {
		this.log(`Resetting component: ${this.name}`, 'log');
		
		// Reset internal state
		this.state = {};

		// Notify the Deck to clear the global state for this key
        if (this.deck) {
            this.deck.setState(this.stateKey, {});
        }

		// Clear its specific storage envelope (Matching the key in #syncToStorage)
        if (this.storage) {
            this.storage.remove('envelope');
        }

		// Re-run initialization to restore defaults
        if (typeof this.init === 'function') {
            this.init();
        }		

		// Trigger state change for UI updates
		this.handleStateChange();
	}

	/**
	 * Updates the component's state and saves it to the deck.
	 * 
	 * @param {Object} newState - The new state to merge with the current state.
	 */
	updateState(newState) {
		this.state = { ...this.state, ...newState };
        
        if (this.deck) {
            this.deck.setState(this.stateKey, this.state);
        }

		// This ensures the local UI reacts immediately without waiting for the Deck's loop.
    	this.onStateChange(this.state);

        // storage is either a helper object or the boolean 'false'
        if (this.storage && typeof this.#syncToStorage === 'function') {
            this.#syncToStorage();
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