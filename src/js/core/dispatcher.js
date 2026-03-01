/**
 * @module DispatcherEvent
 * @description Represents a single event with a list of registered callbacks.
 */

/**
 * @class DispatcherEvent
 * @classdesc Encapsulates a single event and manages its registered callbacks. Provides
 * 			  methods to add, remove, and invoke callbacks when the event is triggered.
 */
class DispatcherEvent {

	constructor(eventName) {
		this.eventName = eventName;		// The name of the event.				{string}
		this.callbacks = [];			// List of registered callbacks.		{Function[]}
	}

	/**
     * Registers a callback for this event.
     * @param {Function} callback - The callback function to register.
     */
	registerCallback(callback) {
		this.callbacks.push(callback);
	}

	/**
     * Unregisters a callback for this event.
     * @param {Function} callback - The callback function to unregister.
     */
	unregisterCallback(callback) {
		const index = this.callbacks.indexOf(callback);
		if (index > -1) {
			this.callbacks.splice(index, 1);
		}
	}

	/**
     * Fires the event, invoking all registered callbacks with the provided data.
     * @param {*} data - Data to pass to each callback.
     */
	fire(data) {
		// Use a shallow copy to prevent issues if a callback unregisters itself during execution
		const callbacks = this.callbacks.slice(0);
		callbacks.forEach((callback) => {
			callback(data);
		});
	}
}

/**
 * @class Dispatcher
 *
 * Provides an event-driven system with support for publishing and subscribing
 * to events, as well as handling WebSocket-based communication. Designed for
 * managing application-wide messaging and state changes.
 */
class Dispatcher {

	constructor() {

		this.host = window.location.host 	// The WebSocket host, derived from the current location
		this.wss = null						// The WebSocket instance.
		this.state = {						// Internal state properties for the dispatcher.
			reconnection: true,
            reconnectionDelay: 1000, 		///(Math.floor(Math.random() * 10) + 1) * 1000)
		}

		//this.connect()

		this.events	= {}					// Registered events with their callbacks
	}
	
	/**
     * Establishes a WebSocket connection.
     */
	connect() {
		this.wss = new WebSocket(`wss://${this.host}`)

		this.wss.onmessage = (e) => {
			if (typeof e.data === 'string') {
				try {
					const datum = JSON.parse(e.data);

					// 1ROUTING BY CHANNEL
					// Used for: "A new post just arrived in the Wire feed"
					if (datum.channel) {
						this.emit(datum.channel, datum); 
						// e.g. emits 'feed:wire:trending', caught by the Wire Feed
					} 
					
					// ROUTING BY ENTITY (The Sync Layer)
					// Used for: "Someone just liked post #505"
					if (datum.entity && datum.id) {
						// Update the store. This triggers the Status.js reactivity.
						this.store.set(this.#mapEntity(datum.entity), datum.data || datum);
					}

					// FALLBACK: Direct Event
					if (datum.event) {
						this.emit(datum.event, datum.data);
					}
		
				} catch {
					//this.say('Unknown signal', 'danger');
					// console.error('Unknown signal');
				}
			} else {
				// Placeholder for future binary message handling
			}
		};

		this.wss.onopen = () => {
			// Reset delay on successful connection
   			this.state.reconnectionDelay = 1000; 
			// Sync to global state so ANY component can check this.deck.state.wssOnline
    		this.setState('wssOnline', true);

			this.emit('wssConnect')
		  };

		this.wss.onclose = e => {
			this.setState('wssOnline', false);
			this.emit('wssDisconnect')

		    if (this.state.reconnection && (!this.wss || this.wss.readyState === 3)) {
				// Exponential backoff logic: 1s, 2s, 4s, 8s... up to 30s
				const delay = Math.min(this.state.reconnectionDelay, 30000);
				
				setTimeout(() => {
					console.log(`Attempting reconnection in ${delay}ms...`);
					this.connect();
					// Increase delay for next attempt
					this.state.reconnectionDelay *= 2; 
				}, delay);
			}
		};

		this.wss.onerror = e => {
			document.dispatchEvent(new CustomEvent('deck.wss.error'), { detail: { error: e.message}});
			this.emit('wssDisconnect')
			this.wss.close();
		};

	}

	/**
     * Disconnects the WebSocket connection and prevents automatic reconnection.
     */
	disconnect() {
		if (this.wss?.readyState === 1) { // 1 = OPEN
            this.state.reconnection = false;
            this.wss.close();
        }
	}

	/**
     * Checks if the WebSocket is connected.
     * @returns {boolean} `true` if the WebSocket is not open, `false` otherwise.
     */

	isConnected(){
		return this.wss && this.wss.readyState === 1;
	}

	/**
     * Gets the current state of the WebSocket connection.
     * @returns {number} The WebSocket readyState.
     */
	wssState() {
		return this.wss ? this.wss.readyState : 3;
	}

	/**
     * Sends data over the WebSocket connection.
     * @param {*} data - The data to send. It will be stringified before sending.
     */
	send(data) {
		if (this.wss && this.wss.readyState === 1) {
            this.wss.send(JSON.stringify(data));
        }
	}

	/**
     * Emits an event, invoking all registered callbacks for the event.
     * Supports wildcard patterns (e.g., `channel:*`).
     * 
     * @param {string} eventName - The name of the event to emit.
     * @param {*} data - Data to pass to the event callbacks.
     */
	emit(eventName, data) {

		// Direct match
        const event = this.events[eventName];
        if (event) { event.fire(data); }

        // Wildcard match [*] - e.g., 'channel:*'
        const escaped = str => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

        Object.entries(this.events).forEach(([name, e]) => {
            if (name.includes("*")) {
                const pattern = new RegExp("^" + name.split("*").map(escaped).join(".*") + "$");
                if (pattern.test(eventName)) {
                    e.fire(data);
                }
            }
        });
	}

	/**
     * Registers a callback for a specific event.
     * 
     * @param {string} eventName - The name of the event to listen for.
     * @param {Function} callback - The callback function to invoke when the event is emitted.
     */
	on(eventName, callback) {

		let event = this.events[eventName];
        if (!event) {
            event = new DispatcherEvent(eventName);
            this.events[eventName] = event;
        }
        event.registerCallback(callback);

        // Return the cleanup function so components can auto-clean
        return () => this.off(eventName, callback);
	}

	/**
     * Unregisters a callback for a specific event.
     * If no callbacks remain for the event, the event is removed.
     * 
     * @param {string} eventName - The name of the event.
     * @param {Function} callback - The callback function to unregister.
     */
	off(eventName, callback) {
		const event = this.events[eventName];

        if (event) {
            event.unregisterCallback(callback);
            if (event.callbacks.length === 0) {
                delete this.events[eventName];
            }
        }
	}

	/**
     * Checks if an event is registered.
     * 
     * @param {string} eventName - The name of the event to check.
     * @returns {boolean} `true` if the event is registered, `false` otherwise.
     */
	hasEvent(eventName) {
		//return this.events.hasOwnProperty(eventName)
		return eventName in this.events
	}

	/**
     * Removes an event and all its callbacks.
     * 
     * @param {string} eventName - The name of the event to remove.
     */
	destroyEvent(eventName) {
		delete this.events[eventName]
	}

	// Helper to ensure 'status' or 'post' both map to the 'statuses' store
	#mapEntity(type) {
		const map = { post: 'statuses', news: 'statuses', comment: 'comments' };
		return map[type] || type;
	}
}

export default Dispatcher