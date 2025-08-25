/**
 * @class DispatcherEvent
 * @classdesc Represents a single event with a list of registered callbacks.
 */

class DispatcherEvent {
	/**
     * @constructor
     * @param {string} eventName - The name of the event.
     */
	constructor(eventName) {
		/** @property {string} eventName - The name of the event. */
		this.eventName = eventName;

		/** @property {Function[]} callbacks - List of registered callbacks. */
		this.callbacks = [];
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
		const callbacks = this.callbacks.slice(0);
		callbacks.forEach((callback) => {
			callback(data);
		});
	}
}

/**
 * @class Dispatcher
 * @classdesc Implements PubSub and WebSocket functionality, allowing event-driven communication.
 */
export default class Dispatcher {

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
		
					if (datum.channel) {
						this.emit(datum.channel, datum);
					} else {
						this.emit(datum.event, datum.data);
					}
		
				} catch {
					this.say('Unknown signal', 'danger');
				}
			} else {
				// Placeholder for future binary message handling
			}
		};

		this.wss.onopen = () => {
			document.dispatchEvent(new CustomEvent('deck.wss.open'));
			this.emit('wssConnect')
		  };

		this.wss.onclose = e => {
			document.dispatchEvent(new CustomEvent('deck.wss.close'));
			this.emit('wssDisconnect')
			if (this.state.reconnection && 
				((this.wss === null) || (this.wss.readyState == 3))) {
					setTimeout(() => {
						this.connect();
					}, this.reconnectionDelay);
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
		if (this.wss?.readyState === this.wss?.OPEN) {
			this.state.reconnection = false
			this.wss.close()
		}
	}

	/**
     * Checks if the WebSocket is connected.
     * @returns {boolean} `true` if the WebSocket is not open, `false` otherwise.
     */

	isConnected(){
		return this.wss.readyState !== this.wss.OPEN
	}

	/**
     * Gets the current state of the WebSocket connection.
     * @returns {number} The WebSocket readyState.
     */
	wssState() {
		return this.wss.readyState
	}

	/**
     * Sends data over the WebSocket connection.
     * @param {*} data - The data to send. It will be stringified before sending.
     */
	send(data) {
		if (this.wss && this.wss.readyState === this.wss.OPEN) {
			this.wss.send(JSON.stringify(data))
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

		//direct
		const event = this.events[eventName];

		if (event) { event.fire(data) }

		//wildcard [*] - 'channel:*'
		const escaped = eventName => eventName.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
		
		Object.entries(this.events).forEach(
			([name, e]) => {
				if ( name.includes("*") && 
					new RegExp("^" + name.split("*").map(escaped).join(".*") + "$").test(eventName) )
						{ e.fire(data) }
			}
		);
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
		if (event && event.callbacks.indexOf(callback) > -1) {
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
}