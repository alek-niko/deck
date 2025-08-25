// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Drop component that manages the display and behavior of dropdown-like elements.
 * 
 * The Drop component is responsible for creating a dropdown UI element. It allows users to trigger a dropdown menu
 * and dynamically position it relative to a target element. The component handles the opening, closing, and positioning
 * of the dropdown based on user interaction and configuration options.
 * 
 * @class Drop
 * @extends Component
 */
export default class Drop extends Component {
	/**
	 * Creates an instance of the Drop component.
	 *
	 * @param {HTMLElement} element 		- The DOM element to which the Drop component will be applied.
	 * @param {Object} [options={}]			- Configuration options for the Drop component. Defaults to an empty object.
	 * @param {Deck} [deck=null]			- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {
			mode: 'click',					// Can be 'click' or 'hover'
			position: 'bottom-center',		// Positioning of the dropdown
			offset: 10,						// Offset for positioning
			stretch: null,					// Whether to stretch the dropdown
			width: null,					// Custom width for the dropdown
			height: null					// Custom height for the dropdown
		};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		 // Create a context object containing relevant data for the component
		const context = {
			name: 'drop',					// Name of the component
			element,						// The DOM element this component is attached to
			deck,							// Optional deck instance (can be null)
			...mergedOptions,				// Final options after merging defaults and user input
		};

		if (element.classList.contains('dropdown')){
			element.classList.add('drop')
			context.name = 'dropdown'
		}

		// Call the parent class's constructor with the context object
		super(context);

		// Initialize the component
		this.#init()

		// Attach event listeners to the component 
		this.initEvents()
	}

	/**
	 * Initializes the dropdown by determining the toggle element (button or previous element).
	 */
	#init() {

		if (this.target) {
			// If a target is specified, use it as the toggle
			this.toggle = document.querySelector(this.target);
		} else {
			// Otherwise, use the preceding element as the toggle
			const previousElement = this.element.previousElementSibling;
	
			// if (previousElement && (previousElement.tagName === 'BUTTON' || previousElement.classList.contains('icon'))) {
			// we may want to use any element, not only buttons & icons ? 
			if (previousElement) {
				this.toggle = previousElement;
			 }
		}

		if (!this.toggle) {
			return;
		}

		 // [?] Set parent position to relative [?]
		 // Ensure the parent of the toggle has relative positioning
		this.toggleParent = this.toggle.parentElement;
		const toggleParentComputedStyle = window.getComputedStyle(this.toggleParent);

		if (toggleParentComputedStyle.position !== "relative") {
			this.toggleParent.style.position = "relative";
		}
	}

	/**
	 * Initializes event listeners for the dropdown's behavior (click or hover).
	 */
	initEvents() {

		if (this.mode === 'click') {
		   // Show dropdown on click
			this.toggle.addEventListener('click', event => {
				event.preventDefault();
				event.stopPropagation();
				this.toggleDrop();
			});
			
		} else {
		   // Show dropdown on hover
			this.toggle.addEventListener('mouseover', this.show);
			//toggle.addEventListener('mouseleave', () => setTimeout(hide, 2000));

			this.toggle.addEventListener('mouseleave', () => {
				this.hideTimeout = setTimeout(this.hide, 1500);
			});
	
			// Prevent hiding the dropdown when hovering over it
			//drop.addEventListener('mouseleave', () => setTimeout(hide, 2000));
			this.element.addEventListener('mouseover', () => {
				clearTimeout(this.hideTimeout);
			});
	
			this.element.addEventListener('mouseleave', () => {
				this.hideTimeout = setTimeout(this.hide, 1500);
			});
		}

		// Close the dropdown when clicking outside of it
		document.addEventListener('click', (event) => this.#handleOutsideClick(event));

		// Close the dropdown if it scrolls out of view
		document.getElementById('main').addEventListener('scroll', () => this.#handleScroll());
	}

	/**
	 * Handles clicks outside the dropdown to close it.
	 * @param {Event} event - The click event.
	 */
	#handleOutsideClick(event) {
		let currentElement = event.target;
		let isInsideDrop = false;

		// Traverse up the DOM tree to check if the click was inside this dropdown
		while (currentElement) {
			if (currentElement === this.dropElement) {
				isInsideDrop = true;
				break;
			}
			currentElement = currentElement.parentElement;
		}

		// Close this dropdown if the click was outside
		if (!isInsideDrop && this.element.classList.contains('open')) {
			//this.element.classList.remove('open');
			this.hide()
		}
	}

	/**
	 * Handles scroll events to close the dropdown if it's out of view.
	 */
	#handleScroll() {
		if (this.element.classList.contains('open')) {
			const rect = this.element.getBoundingClientRect();

			// Close the dropdown if it's out of view
			if (
				rect.bottom < 0 ||							// Above the viewport
				rect.top > window.innerHeight ||			// Below the viewport
				rect.top < 0 ||								// Partially above the viewport
				rect.bottom > window.innerHeight			// Partially below the viewport
			) {
				//this.element.classList.remove('open');
				this.hide()
			}
		}
	}

	/**
	 * Toggles the dropdown visibility.
	 */
	toggleDrop = () => {
		this.element.classList.toggle('open');
		this.positionDrop();
		this.#rotateIcon();
	}

	/**
	 * Shows the dropdown.
	 */
	show = () => {
		clearTimeout(this.hideTimeout);
		this.element.classList.add('open');
		this.positionDrop();
		this.#rotateIcon();
	}

	/**
	 * Hides the dropdown.
	 */
	hide = () => {
		this.element.classList.remove('open');
		this.#rotateIcon();
	}

	/**
	 * Rotates the toggle icon to indicate dropdown state.
	 */
	#rotateIcon() {
		// rotate toggle icon 

		let icon = this.toggle.querySelector('svg')
		if (!icon) return

		// Rotate the icon based on dropdown visibility
		if (icon.style.transform === 'rotate(180deg)') {
			// If it is, reset the transform property to flip it back
			icon.style.transform = 'rotate(0deg)';
		} else {
			// Otherwise, set the transform property to flip it
			icon.style.transform = 'rotate(180deg)';
		}

		// Apply smooth transition for rotation
		icon.style.transition = 'transform 0.3s ease-in-out';
	}

	/**
	 * Positions the dropdown relative to its toggle element.
	 */
	positionDrop() {

		const toggleRect = this.toggle.getBoundingClientRect();
		const elementRect = this.element.getBoundingClientRect();

		if (this.width) {
			// Set width if specified
			let elementWidth = (this.width === 'match') ? toggleRect.width + 'px' : this.width
			this.element.style.width = elementWidth;
		}

		if (this.height) {
			// Set height if specified
			this.element.style.height = this.height;
		}

		let top, left;

		// Handle dropdown stretching or positioning
		if (this.stretch) {

			//const stretchValue = this.element.getAttribute('data-stretch');
			const toggleParentRect = this.toggleParent.getBoundingClientRect();
			
			// If data-stretch contains selector
			if (typeof this.stretch === 'string' && this.stretch.trim() !== '') {

				const targetElement = this.element.closest(this.stretch);

				if (!targetElement) return

				const targetElementRect = targetElement.getBoundingClientRect()

				top = toggleRect.height + this.offset
				left = -(toggleParentRect.left - targetElementRect.left);

				this.element.style.width = targetElementRect.width + 'px';

			} else { // try to guess stretch element

				const targetElement = this.toggleParent.parentElement.getBoundingClientRect();

				top = toggleRect.height + this.offset
				left = -(toggleParentRect.left - targetElement.left);
				this.element.style.width = targetElement.width + 'px';

			}

		} else { // Set drop position 

			switch (this.position) {
				case 'top-left':
					top = -(elementRect.height + this.offset);
					left = 0;
					break;
				case 'top-center':
					top = -(elementRect.height + this.offset);
					left = -(( elementRect.width - toggleRect.width) / 2);
				break;
				case 'top-right':
					top = -(elementRect.height + this.offset);
					left = -(( elementRect.width - toggleRect.width));
				break;
				case 'bottom-left':
					top = toggleRect.height + this.offset;
					left = 0;
					break;
				case 'bottom-center':
					top = toggleRect.height + this.offset;
					left = -(( elementRect.width - toggleRect.width) / 2);
					break;
				case 'bottom-right':
					top = toggleRect.height + this.offset;
					left = -(( elementRect.width - toggleRect.width));
					break;
				case 'left-top':
					top = -elementRect.height;
					left = -( elementRect.width + this.offset);
					break;
				case 'left-center':
					top = -(( elementRect.height - toggleRect.height) / 2);
					left = -( elementRect.width + this.offset);
					break;
				case 'left-bottom':
					top = toggleRect.height;
					left = -( elementRect.width + this.offset);
					break;
				case 'right-top':
					top =  -elementRect.height;
					left =  toggleRect.width + this.offset ;
					break;
				case 'right-center':
					top = -(( elementRect.height - toggleRect.height) / 2);
					left =  toggleRect.width + this.offset ;
					break;
				case 'right-bottom':
					top =  toggleRect.height;
					left =  toggleRect.width + this.offset ;
					break;
				default:
					top = toggleRect.height + this.offset;
					left = 0;
			}
		}


		/// temp . move
		if (this.dropbar) {

			const toggleParentRect = this.toggleParent.getBoundingClientRect();
			
			const targetElement = this.element.closest('.dropnav');
			
			if (!targetElement) return

			const targetElementRect = targetElement.getBoundingClientRect()

			top = toggleRect.height + this.offset
			left = -(toggleParentRect.left - targetElementRect.left);

			this.element.style.width = targetElementRect.width + 'px';
		}

		/// end temp . move

		this.element.style.top = `${top}px`;
		this.element.style.left = `${left}px`;

	}
}