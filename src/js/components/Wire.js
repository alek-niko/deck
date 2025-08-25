// Import the base Feed class from the Feed.js file
import Feed from './Feed.js';

/** 
 * The `Wire` class extends the `Feed` class, providing functionality specific to handling and displaying a news feed. 
 * It manages the configuration for the feed, including setting a default size for the feed items, controlling the 
 * live content updates, and defining the content selector for the news items.
 * 
 * This class includes methods for rendering individual feed items, and it handles WebSocket events for real-time 
 * updates. It can be used to display a dynamic list of news items with support for live updates.
 * 
 * @class Toggle
 * @extends Component
 */
class Wire extends Feed {
	/**
	 * Creates an instance of the Wire component.
	 * 
	 * @param {HTMLElement} element		- The DOM element to which the Wire feed will be applied.
	 * @param {Object} [options={}]		- Configuration options for the Wire feed. Defaults to an empty object.
	 * @param {Deck} deck				- An instance of the Deck class (optional).
	 */
	constructor(element, options = {}, deck = null) {

		// Merges default configuration with passed-in options
		options = Object.assign({
			name: 'wire',				// The name of the feed (default: 'wire')
			defaultSize: 30,			// Default number of items to display (default: 30)
			content: null,				// Content to display (default: null)
			contentLive: false,			// Whether the content should be updated live (default: false)
			contentSelector: '.news',	// CSS selector for news items (default: '.news')
		}, options);

		// Initialize the parent Feed class with the merged configuration
		super(element, options, deck)

		// Define the WebSocket event string for this feed instance
		this.wssEvent	= `feed:${this.name}:${this.id ? `${this.id}` : '*'}`

		// Set content to be live by default
		this.contentLive = true;

		// Initialize WebSocket connection or other required methods (assuming further implementation)
		this.connect
	}

	/**
     * Renders the news items in the feed as HTML.
     * 
     * @param {Array} data - The array of news items to render.
     * @returns {string} - The HTML markup for the news items.
     */
	renderItem(data) {
			return `
				${data.map((news, i) => `
					<div class="news" data-id="${news.id}">
						<div class="content">
							<a href="${news.url}" target="_blank" rel="nofollow noreferrer noopener">
								<h2 class="title">${news.title}</h2>
								<span class="text-small text-muted">${news.name} - ${this.formatDate(news.date)}</span>
							</a>
						</div>
					</div>`).join('')}
				`
	}

}

export default Wire;