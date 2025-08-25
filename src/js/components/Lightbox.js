// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Lightbox component for displaying images or media in a full-screen overlay.
 * 
 * The Lightbox component provides an interactive gallery experience. It allows users to view images, videos,
 * or other media in a modal-like overlay, with navigation controls for switching between items. It can be triggered 
 * by clicking on thumbnails or other elements, and includes features like closing the lightbox, navigating between 
 * items, and handling media types dynamically.
 * 
 * @class Lightbox
 * @extends Component
 */
export default class Lightbox extends Component {
    /**
     * Creates an instance of the Lightbox component.
     *
     * @param {HTMLElement} element 	- The DOM element to which the Lightbox component will be applied.
     * @param {Object} [options={}] 	- Configuration options for the Lightbox component. Defaults to an empty object.
     * @param {Deck} [deck=null] 		- An instance of the Deck class (optional). Defaults to null.
     */
	constructor(element, options = {}, deck = null) {
		
		// Define default options for the component
		const defaultOptions = {};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'lightbox',			// Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)
			...mergedOptions,			// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Ensure the DOM element is not the lightbox container
		this.element.classList.remove('lightbox')

		this.element
			.querySelector('a')
			.addEventListener('click', this.onClick);
	}

	/**
	 * Handles click events on the associated element.
	 * @param {MouseEvent} event - The click event.
	 */
	onClick = event => {
		event.preventDefault();

		const toggle = event.target
		const caption = toggle.getAttribute('data-caption'); 	// Optional caption for the lightbox
		const image = toggle.getAttribute('href'); 				// URL of the image to display

		this.close() 
		this.open(image, caption)
	}

	/**
	 * Closes any currently open lightbox instance.
	 */
	close() {
		// Close open lightbox
		const existingLightbox = document.querySelector('.lightbox.open');
		if (existingLightbox) {
			existingLightbox.parentElement.removeChild(existingLightbox);
		}
	}

	/**
	 * Opens a lightbox with the specified image and optional caption.
	 * 
	 * @param {string} image - The URL of the image to display.
	 * @param {string|false} [caption=false] - Optional caption text for the lightbox.
	 */
	open(image, caption=false) {

		// Create lightbox container
		const lightbox = document.createElement('div');
		lightbox.classList.add('lightbox', 'lightbox-panel', 'transition-toggle', 'overflow-hidden', 'open');

		// Create the container for lightbox items
		const lightboxItems = document.createElement('div');
		lightboxItems.classList.add('lightbox-items');

		// Append lightbox-items to lightbox
		lightbox.appendChild(lightboxItems);

		// Create the lightbox toolbar (top bar)
		const lightboxToolbar = document.createElement('div');
		lightboxToolbar.classList.add('lightbox-toolbar', 'position-top', 'text-right', 'transition-slide-top', 'transition-opaque');

		// Create a close button for the lightbox
		const lightboxCloseBtn = document.createElement('a');
		lightboxCloseBtn.setAttribute('href', '#!');
		lightboxCloseBtn.classList.add('icon-action', 'lightbox-toolbar-icon');

		// Create the SVG icon for the close button
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 -960 960 960');
		svg.setAttribute('width', '100'); // Set width as needed
		svg.setAttribute('height', '100'); // Set height as needed
		svg.classList.add('icon-32'); // Add class 'icon-32'

		// Add the close icon path to the SVG
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', 'm250.92-218.92-32-32L448-480 218.92-709.08l32-32L480-512l229.08-229.08 32 32L512-480l229.08 229.08-32 32L480-448 250.92-218.92Z');

		// Append the path to the SVG
		svg.appendChild(path);

		// Append the SVG to the anchor
		lightboxCloseBtn.appendChild(svg);

		// Append the <svg> to the <a>, then append the <a> to the DOM
		lightboxCloseBtn.appendChild(svg);

		// Append close button to lightbox toolbar
		lightboxToolbar.appendChild(lightboxCloseBtn)

		// Append lightbox toolbar to lightbox
		lightbox.appendChild(lightboxToolbar);

		// Check if there's caption
		// const caption = toggle.getAttribute('data-caption');
		
		if (caption) {
			// Create lightbox caption 
			const lightboxCaption = document.createElement('div');
			lightboxCaption.classList.add('lightbox-toolbar', 'lightbox-caption', 'position-bottom', 'text-center', 'transition-slide-bottom', 'transition-opaque');
			lightboxCaption.innerHTML = caption;

			// Append lightbox caption to lightbox
			lightbox.appendChild(lightboxCaption);
		}

		// Create item container
		const item = document.createElement('div');
		item.classList.add('active');

		// Append item to lightbox items
		//lightbox.appendChild(item)
		lightboxItems.appendChild(item);

		// Create the image element
		const img = document.createElement('img');
		img.src = image;
		img.alt = 'Lightbox Image';

		// Append image to lightbox
		item.appendChild(img);

		// Add event listener to close lightbox on click
		lightboxCloseBtn.addEventListener('click', function() {
			lightbox.classList.remove('open');
			document.body.removeChild(lightbox);
		});

		// Append lightbox to body
		document.body.appendChild(lightbox);
	}

	/**
	 * Moves to the next item in the lightbox.
	 * Currently unimplemented.
	 */
	next() {}

	/**
	 * Moves to the previous item in the lightbox.
	 * Currently unimplemented.
	 */
	previous() {}
}