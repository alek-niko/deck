/**
 * Devlog class that handles the listing of devlog posts with pagination.
 * It fetches posts from the API, renders them to the page, and provides pagination controls.
 * 
 * @class
 */

class Devlog {
	/**
	 * Creates an instance of the Devlog class.
	 * Initializes the container, API URL, pagination state, and starts the devlog loading process.
	 * @constructor
	 */
	constructor() {
		this.container = document.getElementById('devlog');  // The container element for devlogs
		this.apiUrl = '/api/devlog/list';  // API endpoint for fetching devlog posts
		this.lastPostId = 0;  // Keep track of the last post ID for pagination
		this.isLoading = false;  // Prevents multiple concurrent requests
		this.init();
	}

	/**
	 * Initializes the devlog listing by fetching the posts and setting up pagination controls.
	 * @async
	 * @returns {Promise<void>}
	 */
	async init() {
		await this.loadDevlogs();  // Load the initial set of devlogs
		this.setupPagination();  // Setup the "Load More" button for pagination
	}

	/**
	 * Fetches the devlog posts from the API and renders them to the page.
	 * This method handles pagination by using the `lastPostId` to fetch the next set of posts.
	 * @async
	 * @returns {Promise<void>}
	 */
	async loadDevlogs() {
		if (this.isLoading) return;  // Prevent multiple concurrent requests
		this.isLoading = true;

		try {
			const response = await fetch(`${this.apiUrl}?lastPostId=${this.lastPostId}`);
			const data = await response.json();

			if (data.posts && data.posts.length > 0) {
				this.lastPostId = data.posts[data.posts.length - 1].id;  // Update the last post ID
				this.renderDevlogs(data.posts);
			} else {
				console.log("No more posts to load.");
			}
		} catch (error) {
			console.error("Error loading devlogs:", error);
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Renders the devlog posts to the page using a template literal.
	 * @param {Array} posts - Array of post objects to be rendered.
	 */
	renderDevlogs(posts) {
		posts.forEach(post => {
			const postHTML = `
			<article class="article">
				<h2 class="article-title"><a class="link-reset" href="/devlog/${post.id}">${post.title}</a></h2>
				<p class="article-meta">Written by <a href="#!">${post.author}</a> on ${new Date(post.created_at).toLocaleDateString()}.</p>
			
				${post.excerpt ? `<p class="text-lead">${post.excerpt}</p>` : ''}
			
				<p>${post.content}</p>
			</article>
		`;

			this.container.insertAdjacentHTML('beforeend', postHTML);  // Append the post to the container
		});
	}

	/**
	 * Sets up the "Load More" button for pagination.
	 * When clicked, it loads the next set of devlog posts.
	 */
	setupPagination() {
		const loadMoreButton = document.createElement('button');
		loadMoreButton.textContent = 'Load More Posts';
		loadMoreButton.classList.add('load-more-button button button-default button-outline width-1-6 margin-auto round');
		loadMoreButton.addEventListener('click', () => this.loadDevlogs());
		this.container.appendChild(loadMoreButton);
	}
}

// Initialize Devlog class on the container with posts
document.addEventListener('DOMContentLoaded', () => {
	new Devlog();
});
