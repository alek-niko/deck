// Import the base Component class from the Component.js file
import Component from './Component.js';
//import Queue from '../util/Queue.js';

/**
 * 
 * The Feed component handles the management of dynamic content, particularly in scenarios where 
 * continuous updates or large volumes of content need to be displayed. This class provides methods 
 * for fetching new feed items, updating the feed in real-time using WebSockets, and implementing 
 * infinite scroll for seamless user interaction. It can be customized to work with different data 
 * sources and integrate with other components such as a pagination system or UI elements for scrolling.
 * 
 * @class Feed
 * @extends Component
 */
class Feed extends Component {
    /**
     * Creates an instance of the Feed component.
     *
     * @param {HTMLElement} element 	- The DOM element to which the Feed component will be applied.
     * @param {Object} [options={}] 	- Configuration options for the Feed component. Defaults to an empty object.
     * @param {Deck} [deck=null] 		- An instance of the Deck class (optional). Defaults to null.
     */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {
			content: 'statuses',		// Type of feed content, used in apiEndpoint 
			feedSize: 10,				// Default feed size
			contentSelector: '.card',	// Selector for content elements
			contentLive: true,			// Use websocket for real-time data
			animated: true,				// Enable animations for appending and prepending items
			apiQueryParams: ['max_id'],	// Default API parameters; todo; add feedSize as limit

			// observer defaults
			observerRoot: null,
			observerMargin: '0px 0px 1000px 0px'
		};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		 // Create a context object containing relevant data for the component
		const context = {
			name: 'feed',				// Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)

			contentSize: 0,				// Current content size (consider reconsidering)
			contentEnd: false,			// Indicates the end of the feed
			isLoading: false,			// Infinite scroll normalizer

			...mergedOptions,			// Final options after merging defaults and user input

		};

		// Call the parent class's constructor with the context object
		super(context);

		// Set API endpoint dynamically based on feed name and id
		this.apiEndpoint ||= `/${this.name}${this.category ? `/${this.category}` : ''}${this.id ? `/${this.id}` : ''}${this.content ? `/${this.content}` : ''}`;

		// Set WebSocket event name dynamically based on feed name and id
		this.wssEvent ||= `feed:${this.name}${this.id ? `:${this.id}` : ''}`;

		// Save container with safe fallback
		this.container = options.container || (this.element && this.element.parentNode) || document.body;

		// Create sentinel inside container
    	this.sentinel = document.createElement('span');
    	this.sentinel.className = 'feed-sentinel';
    	this.sentinel.textContent = 'Loading...';
    	this.container.appendChild(this.sentinel);

		// IntersectionObserver helpers
		this.usedSentinel = false;
		this.lastObserved = null;
		this.isLoading = false;

		// Initialize various functions with default no-op functions
		this.prependItem	= this.prependItem	|| function() {};
		this.appendItem		= this.appendItem 	|| function() {};
		this.appendItems	= this.appendItems	|| function() {};
		this.deleteItem		= this.deleteItem 	|| function() {};
		this.actionHandler	= this.actionHandler|| function() {};

		// Initialize observers and data fetch
		//this.getData()					// Fetch feed data
		this.#initMutationObserver()		// Initialize MutationObserver
		this.#initScrollObserver()			// Initialize infinite scroll
		this.#initOnClickEvent()			// Initialize click event handler

		this.connect						// Connect to WebSocket event
	}

	/**
	 * Utility getter to access the first child of the feed element.
	 * @returns {HTMLElement} The first child of the feed element.
	 */
	get first()	{ return this.element.children[0]}

	/**
	 * Utility getter to access the last child of the feed element.
	 * @returns {HTMLElement} The last child of the feed element.
	 */
	get last()	{ return this.element.children[this.element.children.length - 1] }

	/**
	 * Utility getter to get the number of children in the feed element.
	 * @returns {number} The number of children in the feed element.
	 */
	get length() { return this.element.children.length }

	/**
	 * Utility getter to get the size of the feed (same as length).
	 * @returns {number} The size of the feed.
	 */
	get size() { return this.element.children.length }


	/**
	 * Initializes the MutationObserver to detect changes to the feed element (e.g., adding/removing nodes).
	 */
	#initMutationObserver() {
		this.observeMutation = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(node => this.onAddNode(node));
				mutation.removedNodes.forEach(node => this.onRemoveNode(node));
			});
		})

		// Observe changes to the feed element's children
		this.observeMutation.observe(this.element, { childList: true });
	}

	/**
	 * Initializes the IntersectionObserver for infinite scroll functionality.
	 */
	#initScrollObserver() {

		if (this.observer) this.observer.disconnect();

		this.observer = new IntersectionObserver(
			this.onIntersect.bind(this),
			{
				root: this.observerRoot,
				rootMargin: this.observerMargin,
				threshold: 0
			}
		);

		//this.observer.observe(this.sentinel);
		this.observeLastItem();
	}

	/**
	 * Method that runs when an observed intersection occurs.
	 * @param {IntersectionObserverEntry[]} entries - The entries passed by the IntersectionObserver.
	 * Processes only the first valid intersecting entry.
	 */
	async onIntersect(entries) {

		if (this.isLoading) return;

		for (const entry of entries) {
			if (!entry.isIntersecting) continue;

			// Skip stale entries not matching the lastObserved (safety)
			if (this.lastObserved && entry.target !== this.lastObserved) continue;

			// Lock immediately
			this.isLoading = true;

			// Prevent further triggers from this element while loading
			try { this.observer.unobserve(entry.target); } catch (e) { }

			// Fetch / append data and receive whether we still have more
			const hasMore = await this.onScrollToEnd();

			this.isLoading = false;

			if (hasMore) {
				// Defer re-observing until after the DOM updates settle
				requestAnimationFrame(() => this.observeLastItem());
			} else {
				// End of feed -> stop observing forever
				this.observer.disconnect();
				this.lastObserved = null;
			}

			break; // handle only one intersecting entry per callback
		}
	}

	/**
	 * Observe the last item (or sentinel once, if empty).
	 */
	observeLastItem() {

		const items = this.element.children;

		// If feed ended -> stop observing
		if (this.contentEnd) {
			this.observer.disconnect();
			this.lastObserved = null;
			return;
		}

		// If no items yet -> observe sentinel only once
		if (items.length === 0) {
			if (!this.usedSentinel && this.sentinel) {
				this.observer.disconnect();
				this.observer.observe(this.sentinel);
				this.lastObserved = this.sentinel;
				this.usedSentinel = true;
			}
			return;
		}

		const lastItem = items[items.length - 1];

		// Only re-observe if it's a different element
		if (this.lastObserved === lastItem) return;

		this.observer.disconnect();
		this.observer.observe(lastItem);
		this.lastObserved = lastItem;
	}	

	/**
	 * Runs when the user scrolls to the top of the feed.
	 * Removes excess items if necessary.
	 */
	onScrollToTop() {
		this.trim()
		this.contentEnd = this.contentSize < this.feedSize
	}

	async onScrollToEnd() {
		//Set a loading UI here, e.g. this.sentinel.classList.add('loading')
		const hasMore = await this.getData();
		// remove spinner
		return hasMore;
	}

	/**
	 * Callback when a node is added to the feed.
	 * @param {Node} node - The node that was added.
	 */
	onAddNode(node) {}

	/**
	 * Callback when a node is removed from the feed.
	 * @param {Node} node - The node that was removed.
	 */
	onRemoveNode(node) {}

	/**
	 * Fetches feed data via AJAX.
	 * @note Will stop if the content has ended or if there is no endpoint or element.
	 */

	async getData() {

		// Emit 'beforeajax' update event
		this.dispatchEvent("feed.beforeajax", { feedId: this.id }, true);
		
		// Defensive early exits
		if (this.contentEnd || !this.apiEndpoint || !this.element) return false;

		if (this.length) this.max_id = this.last?.dataset?.id;

		const params = this.apiQueryParams
			.map(param => this[param] ? `${param}=${encodeURIComponent(this[param])}` : '')
			.filter(Boolean)
			.join('&');

		const url = `/api${this.apiEndpoint}${params ? '?' + params : ''}`;

		try {
			const response = await fetch(url);
			if (!response.ok) {
				console.error('HTTP error', response.status);
				// Emit 'aftereajax' update event
				this.dispatchEvent("feed.aftereajax", { feedId: this.id, success: false }, true);
				return false;
			}
			const datum = await response.json();

			// Emit 'aftereajax' update event
			this.dispatchEvent("feed.aftereajax", { feedId: this.id, success: true }, true);

			// IMPORTANT: appendItems returns a Promise<boolean>
			const stillHasMore = await this.appendItems(datum);

			return stillHasMore;

		} catch (err) {
			console.error(err);
			return false;
		}
	}

	/**
	 * Initializes the click event listener for the feed.
	 */
	#initOnClickEvent() {
		this.element.addEventListener('click', this.onClick.bind(this));
	}

	/**
	 * Callback method for the click event on the feed element.
	 * @param {Event} event - The click event.
	 */
	onClick = event => {}

	/**
	 * Initializes the WebSocket event handler for real-time updates.
	 */
	#initWebSocketEvent() {
		if (this.contentLive && 
			this.wssEvent && 
			!this.deck.hasEvent()
		) {
			this.deck.on(this.wssEvent, this.onDatum.bind(this))
		}
	}

	/**
	 * Utility getter to connect to the WebSocket.
	 * @note May require reevaluation for subscription handling.
	 */
	get connect() {
		this.subscribe()
	}

	/**
	 * Utility getter to disconnect from the WebSocket.
	 * @note May require reevaluation for unsubscription handling.
	 */
	get disconnect() {
		this.unsubscribe()
	}

	/**
	 * Subscribes to the WebSocket event.
	 */
	subscribe() {
		this.#initWebSocketEvent()
		this.deck.send({
			request: 'subscribe',
			type: this.name,
			id: this.id
		})
	}

	/**
	 * Unsubscribes from the WebSocket event.
	 */
	unsubscribe() {
		this.deck.send({
			request: 'unsubscribe',
			type: this.name,
			id: this.id
		})
	}

	/**
	 * Handles WebSocket data updates.
	 * @param {JSON} datum - The WebSocket data.
	 */
	onDatum(datum) {
		//this.queue.enqueue({data: data})
		if (datum.data.length) {
			datum.data.forEach((json, index) => {
				setTimeout(() => {
					this.prependItem(json)
				}, 500);
			});
		}
	}

	/**
	 * Trims the feed to the default size.
	 * Removes excess items if the feed exceeds the feed size.
	 */
	trim() {
		if (this.contentSize > this.feedSize) {
			const children = Array.from(this.element.children);
			children.slice(this.feedSize).forEach(child => child.remove());
			this.update();
		}
	}

	/**
	 * Prepends an item to the feed.
	 * @param {JSON} datum - The data for the new feed item.
	 */
	prependItem(datum) {

		// Emit 'beforeprepend' update event
		this.dispatchEvent("feed.beforeprepend", { feedId: this.id, items: datum.data }, true);

		//this.element.insertBefore(this.renderItem([datum.data], true), this.element.firstChild);
		this.element.insertBefore(this.renderItem([datum]), this.element.firstChild);

		// Emit 'afterprepend' update event
		this.dispatchEvent("feed.afterappend", { feedId: this.id, count: datum.data.length }, true);

		//item.classList.add('animation-slide-top-medium');

		// Check if state size exceeds page size, remove the last child or increment size
		if (this.contentSize > this.feedSize) {
			this.element.lastElementChild.remove();
		} else {
			this.contentSize += 1;
		}
	
		// Set the max_id from the last element's data attribute
		//this.max_id = this.last.querySelector(this.contentSelector).dataset.id;
		this.max_id = this.last.dataset.id;
	}

	/**
	 * @method appendItems
	 * @description Appends multiple items to the `this.element` container.
	 * Handles animations for added items and updates the feed's state.
	 * 
	 * @param {Object} datum - The data object containing an array of items to append.
	 * @property {Array} datum.data - The array of items to append.
	 */

	appendItems(datum) {

		// Emit 'beforeprepend' update event
		this.dispatchEvent("feed.beforeappend", { feedId: this.id, items: datum.data }, true);

		// sanity
		if (!datum || !Array.isArray(datum.data) || datum.data.length === 0) {
			this.contentEnd = true;
			this.sentinel.textContent = (this.contentSize === 0) ? "No posts yet" : "End of the line";
			return Promise.resolve(false);
		}

		// if returned data size < feedSize, we've reached the end (server-side page count)
		this.contentEnd = datum.data.length < this.feedSize;

		if (this.animated) {
			const promises = datum.data.map((json, index) => {
				return new Promise(resolve => {
					// stagger append for visual effect
					setTimeout(() => {
						const itemHTML = this.renderItem([json], false);
						const template = document.createElement('div');
						template.innerHTML = itemHTML;
						const item = template.firstElementChild;

						item.classList.add('animation-slide-bottom-medium');

						// remove class at animation end
						item.addEventListener('animationend', () => {
							item.classList.remove('animation-slide-bottom-medium');
						}, { once: true });

						this.element.appendChild(item);
						resolve();
					}, 40 * (index + 1));
				});
			});

			return Promise.all(promises)
				.then(() => {
					this.update(); // update internals after DOM changes

					// Emit 'afterprepend' update event
					this.dispatchEvent("feed.afterprepend", { feedId: this.id, items: datum.data }, true);

					return !this.contentEnd;
				})
				.catch(err => {
					console.error(err);

					// Emit 'afterprepend' update event
					this.dispatchEvent("feed.afterprepend", { feedId: this.id, items: datum.data }, true);

					this.update();
					return !this.contentEnd;
				});

		} else {
			// Non-animated: append synchronously and return a resolved promise
			this.element.insertAdjacentHTML('beforeend', this.renderItem(datum.data));

			// Emit 'afterprepend' update event
			this.dispatchEvent("feed.afterprepend", { feedId: this.id, items: datum.data }, true);

			this.update();
			return Promise.resolve(!this.contentEnd);
		}
	}

	/**
	 * @method update
	 * @description Updates the feed state after changes to its content.
	 * - Updates the size of the feed.
	 * - Updates the `max_id` for API requests based on the last item's data attribute.
	 * - Determines if the end of the feed has been reached.
	 * - Emits an update event.
	 */
	update() {

		// Update the feed's current content size.
		this.contentSize = this.length;

		// Retrieve the `max_id` from the last item's data attribute.
		// this.max_id = this.last.querySelector(this.contentSelector).dataset.id;
		this.max_id = this.last.dataset.id;
	
		// Check if the feed is smaller than the defined `feedSize`. If so, mark as content end.
		this.contentEnd = this.contentSize < this.feedSize;
	
		// Emit a custom event to notify listeners about the update.
		this.dispatchEvent(`${this.name}.${this.id}.update`)
		
		// Emit 'update' event
		this.dispatchEvent("feed.update", {
			feedId: this.id,
			contentSize: this.contentSize,
			contentEnd: this.contentEnd},
			true
		);
	}

	/**
	 * @method formatDate
	 * @description Formats a given date string into a readable format (e.g., "Nov 15 14:30").
	 * 
	 * @param {string} dateString - The ISO date string to format.
	 * @returns {string} The formatted date string.
	 * 
	 * @note Used within the `renderItem` method to display dates for feed items.
	 */

	formatDate(dateString) {
		// Parse the date string and interpret it as UTC.
		const date = new Date(dateString + 'Z'); // Interpret date as UTC

		// Format the date to display the month and day.
		const formattedDate = date.toLocaleDateString('en-US', {
			month: 'short',
			day: '2-digit'
		});

		// Format the time to display hours and minutes in 24-hour format.
		const formattedTime = date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		// Return the combined formatted date and time.
		return `${formattedDate} ${formattedTime}`;
	}

	/**
	 * @method renderItem
	 * @description Placeholder method to render feed items.
	 * 
	 * @note This method should be overloaded in derived classes
	 *       to define how feed items are rendered as HTML.
	 * 
	 * @param {Array} items - An array of item data to render.
	 * @param {boolean} [isPrepend=false] - Indicates if the items are being prepended (optional).
	 * @returns {string} A string of HTML representing the rendered items.
	 */
	renderItem() {}

	/**
	 * Fetch feed details from API (instance method).
	 * @returns {Promise<Object|null>} - User details in JSON format or null on error.
	 */
	async hydrate() {

		// Determine identifier
		if (!this.id) throw new Error('Feed identifier is missing'); // Ensure an identifier exists

		// Fetch feed data from API
		const json = await Feed.#fetch(identifier);
		if (!json) throw new Error('Feed data could not be fetched'); // Throw error if no data returned

		// Merge fetched data into the current instance
		Object.assign(this, json);
		return json;
	}

	/**
	 * Fetch feed details from API (static method).
	 * Can be used without creating an instance.
	 * @param {number} feedId - The feed ID or username.
	 * @returns {Promise<Object|null>} - User details in JSON format or null on error.
	 */
	static async asJSON(feedId) {
		return this.#fetch(feedId);
	}

	/**
	 * Private method to fetch feed data from API.
	 * @param {string|number} feedId - The feed ID or username.
	 * @returns {Promise<Object|null>} - User details or null on error.
	 */
	static async #fetch(feedId) {

		const param = `id=${feedId}` 

		// Construct API URL with the appropriate query parameter
		const url = `/api/feed?${param}`;

		// Attempt to fetch user data from the API
		const response = await fetch(url).catch(() => null);
		if (!response || !response.ok) return null; // Return null if request fails or response is not OK

		return response.json().catch(() => null); // Parse JSON safely, return null on failure
	}
}

export default Feed;