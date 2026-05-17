/**
 * =============================================================================
 * DISPATCHER
 * @module js.core.dispatcher
 * -----------------------------------------------------------------------------
 * Centralized pub/sub event system with WebSocket support.
 * Provides on(), off(), once(), emit() with wildcard pattern matching,
 * and a full WebSocket lifecycle with exponential backoff reconnection.
 *
 * Extended by Deck — all application-level event handling flows through here.
 *
 * Usage:
 *   dispatcher.on('user:login', callback)		- subscribe
 *   dispatcher.once('deck.ready', callback)	- subscribe once
 *   dispatcher.off('user:login', callback)		- unsubscribe
 *   dispatcher.emit('user:login', data)		- publish
 *
 *   dispatcher.connect()		- open WebSocket
 *   dispatcher.disconnect()	- close WebSocket (no reconnect)
 *   dispatcher.send(data)		- send JSON over WebSocket
 *   dispatcher.isConnected()	- boolean
 * =============================================================================
 */
class Dispatcher {

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** Registered events: Map<eventName, Set<Function>> */
	#events = new Map();

	/** Compiled wildcard regex cache: Map<pattern, RegExp> */
	#patternCache = new Map();

	/** WebSocket instance. */
	#wss = null;

	/** Reconnection state. */
	#reconnect = {
		enabled: true,
		delay:   1000,
		maxDelay: 30000,
	};

	// =========================================================================
	// CONSTRUCTOR
	// =========================================================================

	constructor() {
		this.host = window.location.host;
	}

	// =========================================================================
	// PUBLIC — PUB/SUB
	// =========================================================================

	/**
	 * @method on
	 * @description Subscribes a callback to an event. Supports wildcard patterns
	 *				using * (e.g. 'feed:*' matches 'feed:wire', 'feed:trending').
	 *
	 * @param {string}		eventName
	 * @param {Function}	callback
	 * @returns {Function}	Unsubscribe function — call it to remove the listener.
	 */
	on(eventName, callback) {
		if (!this.#events.has(eventName)) {
			this.#events.set(eventName, new Set());
		}
		this.#events.get(eventName).add(callback);
		return () => this.off(eventName, callback);
	}

	/**
	 * @method once
	 * @description Subscribes a callback that fires exactly once, then removes itself.
	 *
	 * @param {string}   eventName
	 * @param {Function} callback
	 * @returns {Function} Unsubscribe function.
	 */
	once(eventName, callback) {
		const wrapper = (data) => {
			callback(data);
			this.off(eventName, wrapper);
		};
		return this.on(eventName, wrapper);
	}

	/**
	 * @method off
	 * @description Unsubscribes a callback from an event.
	 *              Cleans up the event entry if no callbacks remain.
	 *
	 * @param {string}   eventName
	 * @param {Function} callback
	 */
	off(eventName, callback) {
		const listeners = this.#events.get(eventName);
		if (!listeners) return;

		listeners.delete(callback);
		if (listeners.size === 0) {
			this.#events.delete(eventName);
			this.#patternCache.delete(eventName);
		}
	}

	/**
	 * @method emit
	 * @description Fires an event, invoking all matching callbacks.
	 *              Direct matches are checked first, then wildcard patterns.
	 *
	 * @param {string} eventName
	 * @param {*}      [data]
	 */
	emit(eventName, data) {
		// ── Direct match ──────────────────────────────────────────────────────
		const direct = this.#events.get(eventName);
		if (direct) {
			// Snapshot to prevent mutation during iteration
			[...direct].forEach( cb => {
				try { cb(data); } catch (err) {
					console.error(`[Dispatcher] Error in listener for "${eventName}":`, err);
				}
			});
		}

		// ── Wildcard match ────────────────────────────────────────────────────
		// Only check registered patterns that contain *, skip direct matches already fired.
		this.#events.forEach((listeners, pattern) => {
			if (!pattern.includes('*') || pattern === eventName) return;

			const regex = this.#getPattern(pattern);
			if (!regex.test(eventName)) return;

			[...listeners].forEach( cb => {
				try { cb(data); } catch (err) {
					console.error(`[Dispatcher] Error in wildcard listener "${pattern}":`, err);
				}
			});
		});
	}

	/**
	 * @method hasEvent
	 * @description Returns true if any listener is registered for the event.
	 * @param {string} eventName
	 * @returns {boolean}
	 */
	hasEvent(eventName) {
		return this.#events.has(eventName);
	}

	/**
	 * @method destroyEvent
	 * @description Removes an event and all its callbacks.
	 * @param {string} eventName
	 */
	destroyEvent(eventName) {
		this.#events.delete(eventName);
		this.#patternCache.delete(eventName);
	}

	/**
	 * @method clearEvents
	 * @description Removes all registered events and callbacks.
	 */
	clearEvents() {
		this.#events.clear();
		this.#patternCache.clear();
	}

	// =========================================================================
	// PRIVATE — WILDCARD PATTERN CACHE
	// =========================================================================

	/**
	 * Returns a compiled RegExp for a wildcard pattern string.
	 * Caches the result so each pattern is compiled only once.
	 * @param {string} pattern
	 * @returns {RegExp}
	 */
	#getPattern(pattern) {
		if (this.#patternCache.has(pattern)) {
			return this.#patternCache.get(pattern);
		}
		
		// Escape all regex special characters except *, then replace * with .*
		const escaped = pattern
			.replace(/[.+?^=!:${}()|[\]/\\]/g, '\\$&')
			.replace(/\*/g, '.*');
			
		const regex = new RegExp(`^${escaped}$`);
		this.#patternCache.set(pattern, regex);
		return regex;
	}

	// =========================================================================
	// PUBLIC — WEBSOCKET
	// =========================================================================

	/**
	 * @method connect
	 * @description Opens a WebSocket connection to the current host.
	 *				Sets up message routing, reconnection, and lifecycle events.
	 */
	connect() {
		this.#wss = new WebSocket(`wss://${this.host}`);

		this.#wss.onmessage = (e) => {
			if (typeof e.data !== 'string') return; // Binary placeholder

			try {
				const datum = JSON.parse(e.data);

				// Route by channel — e.g. 'feed:wire:trending'
				if (datum.channel) {
					this.emit(datum.channel, datum);
				}

				// Route by entity — triggers store reactivity
				if (datum.entity && datum.id) {
					const type = this.#mapEntity(datum.entity);
					this.emit(`entity:${type}`, datum.data ?? datum);
				}

				// Direct event routing
				if (datum.event) {
					this.emit(datum.event, datum.data);
				}

			} catch {
				// Malformed message — silently ignore
			}
		};

		this.#wss.onopen = () => {
			this.#reconnect.delay = 1000; // Reset backoff on successful connect
			this.emit('wss:connect');
		};

		this.#wss.onclose = () => {
			this.emit('wss:disconnect');

			if (this.#reconnect.enabled) {
				const delay = Math.min(this.#reconnect.delay, this.#reconnect.maxDelay);

				setTimeout(() => this.connect(), delay);

				// Exponential backoff: 1s -> 2s -> 4s -> 8s -> … -> 30s
				this.#reconnect.delay = Math.min(delay * 2, this.#reconnect.maxDelay);
			}
		};

		this.#wss.onerror = () => {
			// Fire the error event before close, which will handle reconnection
			document.dispatchEvent(new CustomEvent('deck.wss.error'));
			this.emit('wss:error');
			this.#wss.close();
		};
	}

	/**
	 * @method disconnect
	 * @description Closes the WebSocket and disables automatic reconnection.
	 */
	disconnect() {
		this.#reconnect.enabled = false;
		if (this.#wss?.readyState === WebSocket.OPEN) {
			this.#wss.close();
		}
	}

	/**
	 * @method send
	 * @description Sends data over the WebSocket as a JSON string.
	 *				Silently no-ops if the connection is not open.
	 *
	 * @param {*} data - Any JSON-serializable value.
	 */
	send(data) {
		if (this.#wss?.readyState === WebSocket.OPEN) {
			this.#wss.send(JSON.stringify(data));
		}
	}

	/**
	 * @method isConnected
	 * @description Returns true if the WebSocket is currently open.
	 * @returns {boolean}
	 */
	isConnected() {
		return this.#wss?.readyState === WebSocket.OPEN;
	}

	/**
	 * @method wssState
	 * @description Returns the current WebSocket readyState.
	 *				3 (CLOSED) is returned if no connection exists.
	 * @returns {number}
	 */
	wssState() {
		return this.#wss?.readyState ?? WebSocket.CLOSED;
	}

	// =========================================================================
	// PRIVATE — HELPERS
	// =========================================================================

	/**
	 * Maps singular entity type names to their canonical store keys.
	 * @param {string} type
	 * @returns {string}
	 */
	#mapEntity(type) {
		const map = {
			post:    'statuses',
			news:    'statuses',
			comment: 'comments',
		};
		return map[type] ?? type;
	}
}

export default Dispatcher;