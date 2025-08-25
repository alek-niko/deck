/**
 * @class Queue
 * @classdesc Implements a queue with optional auto-processing using callbacks or events.
 * 
 * @param {number} [queue_size=100] - The maximum size of the queue. Defaults to 100.
 * @param {Function|null} [callback=null] - A callback function invoked to process items in the queue. Defaults to null.
 * @param {string|null} [event=null] - The name of a custom event dispatched to process queue items. Defaults to null.
 * @param {number} [time=1000] - The interval (in milliseconds) between automatic queue processing attempts. Defaults to 1000 ms.
 */

export default class Queue {
	constructor(queue_size = 100, callback = null, event = null, time = 1000) {

		/** 
		 * @type {Array} 
		 * @description Internal queue storage.
		 */
		this.queue = [];
		
		/** 
		 * @type {number} 
		 * @description The maximum size of the queue. 
		 */
		this.queue_size = queue_size;

		/** 
		 * @type {boolean} 
		 * @description Whether auto-processing (callback or event-based) is enabled.
		 */
		this.auto = Boolean(callback || event);

		/** 
		 * @type {boolean} 
		 * @description Tracks if a callback-based processing is running.
		 */
		this.callback = false;

		/** 
		* @type {boolean} 
		* @description Tracks if an event-based processing is running.
		*/
		this.event = false;
		
		// Start automatic queue processing if a callback is provided.
		if (callback) {
			this.run(callback, time);
		}

		// Start automatic queue processing if an event name is provided.
		if (event) {
			this.fire(event, time);
		}
	}

	/**
	 * @property {number}
	 * @readonly
	 * @description Gets the current size of the queue.
	 */
	get size() {
		return this.queue.length;
	}

	/**
	 * @property {boolean}
	 * @readonly
	 * @description Checks if the queue is empty.
	 */
	get isEmpty() {
		return this.size === 0;
	}

	/**
	 * Adds an item to the queue.
	 * @param {*} item - The item to enqueue.
	 */
	enqueue(item) {
		this.queue.push(item);
	}

	/**
	 * @property {*}
	 * @readonly
	 * @description Gets the item at the front of the queue without removing it.
	 */
	get peek() {
		return this.size > 0 ? this.queue[0] : undefined;
	}

	/**
	 * Removes and returns the item at the front of the queue.
	 * @returns {*} The removed item or `undefined` if the queue is empty.
	 */
	shift() {
		return this.size > 0 ? this.queue.shift() : undefined;
	}

	/**
	 * Starts automatic queue processing with a provided callback function.
	 * 
	 * @param {Function} callback - Function to call with the next queue item.
	 * @param {number} interval - Interval (in milliseconds) between processing attempts.
	 */
	run(callback, interval) {
		if (this.auto && !this.callback) {
			this.callback = true;
			setInterval(() => {
				if (this.shouldProcess()) {
					callback(this.shift());
				}
			}, interval);
		}
	}

	/**
	 * Starts automatic queue processing with a custom event.
	 * 
	 * @param {string} event - The name of the custom event to dispatch.
	 * @param {number} interval - Interval (in milliseconds) between event dispatches.
	 */
	fire(event, interval) {
		if (this.auto && !this.event) {
			this.event = true;
			setInterval(() => {
				if (this.shouldProcess()) {
					deck.dispatchEvent(new CustomEvent(event, { detail: this.shift() }));
				}
			}, interval);
		}
	}

	/**
	 * Determines whether the queue should process the next item.
	 * 
	 * @returns {boolean} `true` if conditions allow processing, `false` otherwise.
	 */
	shouldProcess() {
		const visible = document.visibilityState === 'visible';
		const hiddenAndOverflowing = document.visibilityState === 'hidden' && this.size > this.queue_size;
		return this.size > 0 && (visible || hiddenAndOverflowing);
	}
}
