/**
 * @module lightbox
 * @description Provides an interactive gallery experience for displaying images, videos,
 * or other media in a full-screen overlay. Supports navigation controls, dynamic media
 * handling, and can be triggered by clicking thumbnails or other UI elements.
 * 
 * Fullscreen lightbox overlay using <dialog>.
 * Supports single items or galleries via data-gallery.
 */

// Import the base Component class
import Component from './component.js';

/**
 * @class Lightbox
 * @extends Component
 *
 * Enables viewing of images, videos, or other media in a modal-like overlay.
 * Supports navigation between items, closing the overlay, and dynamic handling
 * of different media types for a seamless user experience.
 */
class Lightbox extends Component {

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

		this.items = [];
		this.index = 0;
		this.preloaded = new Set();

		this.onClick = this.onClick.bind(this);
		this.onKeydown = this.onKeydown.bind(this);

		this.#setup();
	}

    /**
     * Initialize trigger
     */
    #setup() {
        this.trigger =
            this.element.tagName === 'A'
                ? this.element
                : this.element.querySelector('a');

        if (!this.trigger) return;

        this.trigger.addEventListener('click', this.onClick);
    }

    /**
	 * Handles click events on the associated element.
	 * @param {MouseEvent} event - The click event.
	 */
    onClick(event) {
        event.preventDefault();
        this.prepareItems();
        this.open();
    }

    /**
     * Collect gallery items
     */
    prepareItems() {
        const gallery = this.trigger.getAttribute('data-gallery');

        if (gallery) {
            this.items = Array.from(
                document.querySelectorAll(`[data-gallery="${gallery}"]`)
            );
        } else {
            this.items = [this.trigger];
        }

        this.index = this.items.indexOf(this.trigger);
    }

    /**
     * Open the lightbox
     */
    open() {
        this.close(); // ensure single instance

        this.dialog = document.createElement('dialog');
        this.dialog.className = 'lightbox-panel';

        this.buildToolbar();
        this.buildNavigation();
        this.buildItems();
        this.buildCaption();

        document.body.appendChild(this.dialog);
        this.dialog.showModal();

        document.addEventListener('keydown', this.onKeydown);

        this.update();
    }

    /**
     * Build top toolbar
     */
    // buildToolbar() {
    //     const bar = document.createElement('div');
    //     bar.className = 'lightbox-toolbar position-top';

    //     const close = document.createElement('button');
    //     close.className = 'icon-action';
    //     close.innerHTML = `
    //         <svg viewBox="0 -960 960 960" width="32" height="32">
    //             <path d="m250.92-218.92-32-32L448-480 218.92-709.08l32-32L480-512l229.08-229.08 32 32L512-480l229.08 229.08-32 32L480-448 250.92-218.92Z"/>
    //         </svg>
    //     `;

    //     close.addEventListener('click', () => this.close());

    //     bar.appendChild(close);
    //     this.dialog.appendChild(bar);
    // }

	/**
	 * Build top toolbar
	 */
	buildToolbar() {
		const bar = document.createElement('div');
		bar.className = 'lightbox-toolbar position-top';

		const close = document.createElement('i');
		close.className = 'icon-action';
		close.setAttribute('role', 'button');
		close.setAttribute('tabindex', '0');
		close.setAttribute('aria-label', 'Close lightbox');

		close.innerHTML = `
			<svg viewBox="0 -960 960 960" width="32" height="32">
				<path d="m250.92-218.92-32-32L448-480 218.92-709.08l32-32L480-512l229.08-229.08 32 32L512-480l229.08 229.08-32 32L480-448 250.92-218.92Z"/>
			</svg>
		`;

		// Mouse click
		close.addEventListener('click', () => this.close());

		// Keyboard activation (Enter / Space)
		close.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				this.close();
			}
		});

		bar.appendChild(close);
		this.dialog.appendChild(bar);
	}


    /**
     * Build navigation arrows
     */
    buildNavigation() {
        if (this.items.length <= 1) return;

        this.prevBtn = this.createNav('prev', 'M15 18l-6-6 6-6');
        this.nextBtn = this.createNav('next', 'M9 18l6-6-6-6');

        this.dialog.appendChild(this.prevBtn);
        this.dialog.appendChild(this.nextBtn);
    }

    createNav(direction, path) {
        const btn = document.createElement('button');
        btn.className = `lightbox-nav lightbox-nav-${direction}`;
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="${path}"/></svg>`;

        btn.addEventListener('click', () => {
            direction === 'next' ? this.next() : this.previous();
        });

        return btn;
    }

    /**
     * Build content container
     */
    buildItems() {
        this.itemsContainer = document.createElement('div');
        this.itemsContainer.className = 'lightbox-items';
        this.dialog.appendChild(this.itemsContainer);
    }

    /**
     * Build caption bar
     */
    buildCaption() {
        this.captionBar = document.createElement('div');
        this.captionBar.className = 'lightbox-toolbar position-bottom';

        this.caption = document.createElement('div');
        this.caption.className = 'lightbox-caption';

        this.captionBar.appendChild(this.caption);
        this.dialog.appendChild(this.captionBar);
    }

    /**
     * Update active content
     */
    update() {
        const item = this.items[this.index];
        if (!item) return;

        const src = item.getAttribute('href');
        const caption = item.getAttribute('data-caption') || '';

        this.itemsContainer.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'active';

        const img = document.createElement('img');
        img.src = src;
        img.alt = caption || 'Lightbox image';

        wrapper.appendChild(img);
        this.itemsContainer.appendChild(wrapper);

        this.caption.textContent = caption;

        this.preloadNext();
    }

    /**
     * Preload next image
     */
    preloadNext() {
        if (this.items.length < 2) return;

        const next = (this.index + 1) % this.items.length;
        const url = this.items[next].getAttribute('href');

        if (url && !this.preloaded.has(url)) {
            const img = new Image();
            img.src = url;
            this.preloaded.add(url);
        }
    }

    /**
     * Keyboard navigation
     */
    onKeydown(event) {
        if (event.key === 'ArrowRight') this.next();
        if (event.key === 'ArrowLeft') this.previous();
        if (event.key === 'Escape') this.close();
    }

    next() {
        this.index = (this.index + 1) % this.items.length;
        this.update();
    }

    previous() {
        this.index =
            (this.index - 1 + this.items.length) % this.items.length;
        this.update();
    }

    /**
     * Close and destroy
     */
    close() {
        if (!this.dialog) return;

        document.removeEventListener('keydown', this.onKeydown);
        this.dialog.close();
        this.dialog.remove();
        this.dialog = null;
    }
}

export default Lightbox;
