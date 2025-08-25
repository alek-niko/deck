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
			apiQueryParams: ['max_id'],	// Default API parameters
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
		//this.apiEndpoint ||= `/${this.name}${this.id ? `/${this.id}` : ''}/${this.content || ''}`;

		this.apiEndpoint ||= `/${this.name}${this.category ? `/${this.category}` : ''}${this.id ? `/${this.id}` : ''}${this.content ? `/${this.content}` : ''}`;

		// Set WebSocket event name dynamically based on feed name and id
		this.wssEvent ||= `feed:${this.name}${this.id ? `:${this.id}` : ''}`;

		// Use queue for websockeet data. handle FIFO firehose bursts 
		//this.queue  = new Queue(100, this.prependItem.bind(this))

		//this.apiQueryParams	= ['max_id'].concat(this.apiQueryParams || [])

		// Initialize various functions with default no-op functions
		this.prependItem	= this.prependItem	|| function() {};
		this.appendItem		= this.appendItem 	|| function() {};
		this.appendItems	= this.appendItems	|| function() {};
		this.deleteItem		= this.deleteItem 	|| function() {};
		this.actionHandler	= this.actionHandler|| function() {};

		// Initialize observers and data fetch
		this.#initMutationObserver()		// Initialize MutationObserver
		this.getData()						// Fetch feed data

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
	 * Method that runs when an observed intersection occurs (e.g., scrolling to the end).
	 * @param {IntersectionObserverEntry[]} entries - The entries passed by the IntersectionObserver.
	 */
	async observeIntersection(entries) {
		if (entries[0].isIntersecting && !this.isLoading) {
			this.isLoading = true;
			
			// Use requestAnimationFrame to run the onScrollToEnd logic at the next render cycle
			requestAnimationFrame(async () => {
				await this.onScrollToEnd();
				this.isLoading = false;
			});
		}
	}

	/**
	 * Initializes the IntersectionObserver for infinite scroll functionality.
	 * @note Creates a "feed-end" div if it does not exist for scroll triggering.
	 */
	#initScrollObserver() {

		//const wireElement = document.querySelector('.wire');
		let nextElement = this.element.nextElementSibling;

		// Create "feed-end" div if it doesn't exist
		if (!nextElement || !nextElement.classList.contains('feed-end')) {
			// Create the element if it doesn't exist or doesn't have the `feed-end` class
			nextElement = document.createElement('span');
			nextElement.classList.add('label', 'feed-end');
			nextElement.textContent = 'Loading....';

			// Insert the new element after the `.wire` element
			this.element.parentNode.insertBefore(nextElement, this.element.nextSibling);
		}

		// Set up IntersectionObserver to monitor scrolling to the end
		//this.observer = new IntersectionObserver(this.observeIntersection.bind(this), { threshold: 1.0 });

		this.observer = new IntersectionObserver(this.observeIntersection.bind(this), {
			root: null,
			rootMargin: `0px 0px ${window.innerHeight * 0.2}px 0px`, // 20% of viewport
			threshold: 0.0
		  });

		//this.observer.observe(this.loadingDiv);
		this.observer.observe(nextElement);
	}

	/**
	 * Initializes the MutationObserver to detect changes to the feed element (e.g., adding/removing nodes).
	 */
	#initMutationObserver() {
		this.observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(node => this.onAddNode(node));
				mutation.removedNodes.forEach(node => this.onRemoveNode(node));
			});
		})

		// Observe changes to the feed element's children
		this.observer.observe(this.element, { childList: true });
	}

	/**
	 * Runs when the user scrolls to the top of the feed.
	 * Removes excess items if necessary.
	 */
	onScrollToTop() {
		this.trim()
		this.contentEnd = this.contentSize < this.feedSize
	}
 
	/**
	 * Runs when the user scrolls to the bottom of the feed.
	 * Fetches more data if necessary.
	 */
	async onScrollToEnd() {
		if (this.contentSize > 5) await this.getData();
	}
	

	/**
	 * Callback when a node is added to the feed.
	 * @param {Node} node - The node that was added.
	 */
	onAddNode(node) {
		//console.log(node)
	}

	/**
	 * Callback when a node is removed from the feed.
	 * @param {Node} node - The node that was removed.
	 */
	onRemoveNode(node) {
		//this.deleteItem()
	}

	/**
	 * Fetches feed data via AJAX.
	 * @note Will stop if the content has ended or if there is no endpoint or element.
	 */

	async getData() {

		if (this.contentEnd || !this.apiEndpoint || !this.element) return;
	
		if (this.length) this.max_id = this.last.dataset.id;
	
		// Build query parameters for the API request
		const params = this.apiQueryParams
			.map(param => this[param] ? `${param}=${this[param]}` : '')
			.filter(Boolean)
			.join('&');
	
		// Build URL
		const url = `/api${this.apiEndpoint}?${params}`.trim().replace(/\?$/, '');
	
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const datum = await response.json();
			this.appendItems(datum);
		} catch (e) {
			console.error(e);
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

		//this.element.insertBefore(this.renderItem([datum.data], true), this.element.firstChild);
		this.element.insertBefore(this.renderItem([datum]), this.element.firstChild);

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
	
		// Emit update event
		this.dispatchEvent(`${this.name}.${this.id}.update`)
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

		// If no data is provided, mark the end of the feed.
		if (!datum.data.length) {
			this.contentEnd = true;
			return;
		}

		// Update the contentEnd flag based on whether the data array is smaller than feedSize.
		this.contentEnd = datum.data.length < this.feedSize;

		// If animations are enabled, append items with sliding animation.
		if (this.animated) {
			// Map each item to a promise that resolves after adding the item with a delay.
			const promises = datum.data.map((json, index) => {
				return new Promise(resolve => {
					setTimeout(() => {
						// Render the item and wrap it in a temporary element.
						const itemHTML = this.renderItem([json], false);
						const template = document.createElement('div');
						template.innerHTML = itemHTML;
						const item = template.firstElementChild;

						 // Add slide animation to the item.
						item.classList.add('animation-slide-bottom-medium');
						
						// Remove the animation class after the animation ends.
						item.addEventListener('animationend', () => {
							item.classList.remove('animation-slide-bottom-medium');
						});
						
						// Append the item to the feed container.
						this.element.appendChild(item);
						resolve(); // Resolve the promise after appending the item.
					}, 40 * (index + 1));	// Add a delay between appending consecutive items.
				});
			});
	
			// Wait for all items to be appended and then update the feed state.
			Promise
				.all(promises)
				.then(() => {
					this.update(); // Call update after all items are appended
				});

		} else {
			// If animations are disabled, append all items directly as HTML.
			this.element.insertAdjacentHTML('beforeend', this.renderItem(datum.data));
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