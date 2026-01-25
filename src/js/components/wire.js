/**
 * @module wire
 * @description Extends the Feed component to handle and display a dynamic news feed,
 * including configuration for feed size, content selectors, and live updates via WebSockets.
 */

// Import the base Feed class
import Feed from './feed.js';

/**
 * @class Wire
 * @extends Feed
 *
 * Provides functionality for rendering individual feed items and managing
 * real-time content updates. Supports live feeds, dynamic item rendering,
 * and integration with WebSocket events for instant updates.
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
	// renderItem(data) {

	// 	// Helper to extract domain from a URL
	// 	const extractDomain = (url) => {
	// 		try {
	// 			const hostname = new URL(url).hostname;
	// 			return hostname.replace(/^www\./, '');
	// 		} catch {
	// 			return null;
	// 		}
	// 	};

	// 	return data.map(news => {
	// 		// Determine link target
	// 		const link = news.url || `/wire/${news.id}`;

	// 		// Extract domain if URL exists
	// 		const domain = news.url ? extractDomain(news.url) : null;
	// 		const domainText = domain ? ` ${domain}` : '';

	// 		// Build metadata parts
	// 		const parts = [];
	// 		if (news.points != null) parts.push(`${news.points} points`);
	// 		if (news.username) parts.push(`by ${news.username}`);
	// 		if (news.name) parts.push(news.name);
	// 		if (news.date) parts.push(this.formatDate(news.date));
	// 		if (domainText) parts.push(domainText);

	// 		// Comments link: only if property exists
	// 		if ('comments' in news) {
	// 			const count = news.comments;
	// 			if (count === 0) {
	// 				parts.push(`<a href="/wire/${news.id}" class="comments-link">discuss</a>`);
	// 			} else if (count === 1) {
	// 				parts.push(`<a href="/wire/${news.id}" class="comments-link">1 comment</a>`);
	// 			} else {
	// 				parts.push(`<a href="/wire/${news.id}" class="comments-link">${count} comments</a>`);
	// 			}
	// 		}

	// 		const metadata = parts.join(' | ');

	// 		return `
	// 			<div class="news" data-id="${news.id}">
	// 				<div class="content">
	// 					<a href="${link}" target="${news.url ? '_blank' : '_self'}" rel="${news.url ? 'nofollow noreferrer noopener' : ''}">
	// 						<h2 class="title">${news.title}</h2>
	// 						<span class="text-small text-muted">${metadata}</span>
	// 					</a>
	// 				</div>
	// 			</div>
	// 		`;
	// 	}).join('');
	// }

	/**
	 * Renders the news items in the feed as HTML. This method overloads a parent method.
	 * * @param {Array<Object>} data - The array of news items to render.
	 * @returns {string} - The combined HTML markup for the news items.
	 */
	renderItem(data) {
		// Process each news item and join the resulting HTML strings.
		return data.map(news => this.#renderSingleItem(news)).join('');
	}

	/**
	 * Renders a single news item as an HTML string.
	 * @private
	 * @param {Object} news - The news item object.
	 * @returns {string} The HTML markup for a single news item.
	 */
	#renderSingleItem(news) {
		// Use Nullish Coalescing (??) for a cleaner default value.
		const link = news.url ?? `/wire/${news.id}`;
		const isExternal = !!news.url;
		const metadata = this.#buildMetadata(news);

		return `
			<div class="news" data-id="${news.id}">
				<div class="content">
					<a href="${link}" 
					target="${isExternal ? '_blank' : '_self'}" 
					rel="${isExternal ? 'nofollow noreferrer noopener' : ''}">
						<h2 class="title">${news.title}</h2>
					</a>
					<span class="text-small text-muted">${metadata}</span>
				</div>
			</div>
		`;
	}

	/**
	 * Builds the metadata string (e.g., "15 points by user | 2 hours ago | 5 comments").
	 * @private
	 * @param {Object} news - The news item object.
	 * @returns {string} The formatted metadata string.
	 */
	#buildMetadata(news) {
		const domain = this.#extractDomain(news.url);
		
		const parts = [
			(news.points != null) && `${news.points} points`,
			news.username && `by ${news.username}`,
			news.name,
			domain && `(${domain})`,
			news.date && this.formatDate(news.date),
			this.#formatComments(news)
		];

		// Filter out any falsy values (false, null, undefined, '') and join.
		return parts.filter(Boolean).join(' | ');
	}

	/**
	 * Formats the comments link based on the comment count.
	 * @private
	 * @param {Object} news - The news item object.
	 * @returns {string|null} The HTML for the comments link, or null if not applicable.
	 */
	#formatComments(news) {
		if (!('comments' in news)) {
			return null;
		}

		const count = news.comments;
		const url = `/wire/${news.id}`;
		let text = 'discuss';

		if (count === 1) {
			text = '1 comment';
		} else if (count > 1) {
			text = `${count} comments`;
		}
		
		return `<a href="${url}" class="comments-link">${text}</a>`;
	}

	/**
	 * Extracts the hostname from a URL, removing "www."
	 * @private
	 * @param {string} url - The URL to parse.
	 * @returns {string|null} The extracted domain or null if the URL is invalid.
	 */
	#extractDomain(url) {
		if (!url) return null;
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch (e) {
			return null;
		}
	}

}

export default Wire;