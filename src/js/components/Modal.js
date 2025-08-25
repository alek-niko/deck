// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Modal component for displaying content in a full-screen or centered overlay.
 * 
 * The Modal component is used to display content in a dialog box, typically for alerts, confirmations,
 * or user input forms. It allows for easy control of visibility, as well as customization of the modal content,
 * styling, and animations. The Modal component includes methods for opening, closing, and managing the state
 * of the modal, as well as handling interactions like clicks outside the modal to close it.
 * 
 * @class Modal
 * @extends Component
 */
class Modal extends Component {
	/**
     * Creates an instance of the Modal component.
     *
     * @param {HTMLElement} element 	- The DOM element to which the Modal component will be applied.
     * @param {Object} [options={}]		- Configuration options for the Modal component. Defaults to an empty object.
     * @param {Deck} [deck=null]		- An instance of the Deck class (optional). Defaults to null.
     */
	constructor(element, options = {}, deck = null) {

		if (!(element instanceof HTMLDialogElement)) {
			throw new Error("Element must be a <dialog> for Modal class.");
		}

		// Define default options for the component
		const defaultOptions = {};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'modal',			// Name of the component
			element,					// The DOM element this component is attached to
			deck,						// Optional deck instance (can be null)
			...mergedOptions,			// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Initialize the component
		this.#init();

		// Attach event listeners to the component
		this.#initEvents();
	}

	/**
	 * @private
	 * @method #init
	 * @description Sets up the modal's properties and initial state.
	 */
	#init() {

		const el = this.element;

		// Fullscreen
		if (el.hasAttribute('data-modal-full')) {
			el.classList.add('modal-full');
		}

		// Size: sm, lg, xl
		const size = el.dataset.modalSize;
		if (size) {
			el.classList.add(`modal-${size}`);
		}

		// Transition: top, bottom, center
		const transition = el.dataset.modalTransition || 'center';
		el.classList.add(`modal-slide-${transition}`);

		// Scrollable
		if (el.hasAttribute('data-modal-scrollable')) {
			el.classList.add('modal-scrollable');
		}
	}

	/**
	 * @private
	 * @method #initEvents
	 * @description Adds event listeners for modal actions.
	 */
	#initEvents() {

		// Close button functionality
		this.element
			.querySelectorAll('.modal-close, .modal-close-button')
			.forEach(closeButton => {
				closeButton.addEventListener('click', () => this.close());
			});

		// Handle cancel event (e.g., clicking backdrop or pressing Escape)
		this.element.addEventListener('cancel', event => {
			event.preventDefault(); // Prevent closing if desired
			this.close();
		});

		// Optional: Close on clicking outside the dialog
		if (this.bgClose !== false) {
			this.element.addEventListener('click', event => {
				if (event.target === this.element) {
					this.close();
				}
			});
		}

		// Trap focus while open
		el.addEventListener('keydown', this.#trapFocus);
	}

	/**
	 * Trap keyboard focus inside modal
	 * @param {KeyboardEvent} event
	 */
	#trapFocus = (event) => {
		if (event.key !== 'Tab') return;

		const focusables = this.element.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
		const focusArray = Array.from(focusables);
		const first = focusArray[0];
		const last = focusArray[focusArray.length - 1];

		if (!first || !last) return;

		if (event.shiftKey && document.activeElement === first) {
			last.focus();
			event.preventDefault();
		} else if (!event.shiftKey && document.activeElement === last) {
			first.focus();
			event.preventDefault();
		}
	};

	#focusFirst() {
		const focusable = this.element.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
		if (focusable) focusable.focus();
	}

	/**
	 * @method open
	 * @description Opens the modal and dispatches events.
	 */
	open() {
		this.dispatchEvent('beforeshow', {}, true)
		if (!this.isOpen()) {
			this.element.showModal();
			setTimeout(() => this.#focusFirst(), 10);
		}
		this.dispatchEvent('shown', {}, true)
	}

	/**
	 * @method close
	 * @description Closes the modal and dispatches events.
	 */
	close() {
		this.dispatchEvent('beforehide', {}, true)
		if (this.isOpen()) {
			this.element.close();
		}
		this.dispatchEvent('hidden', {}, true)
	}

	/**
	 * @method isOpen
	 * @description Checks if the modal is currently open.
	 * 
	 * @returns {boolean} `true` if the modal is open, otherwise `false`.
	 */
	isOpen() {
		return this.element.open;
	}

	/**
	 * @method setModalPosition
	 * @description Sets the modal dialog's position.
	 */
	setModalPosition() {
		// Positioning can largely be handled by CSS, but custom styles can be applied here
		if (this.position) {
			this.element.style.position = 'absolute';
			switch (this.position) {
				case 'top':
					this.element.style.top = '10%';
					this.element.style.transform = 'translateX(-50%)';
					break;
				case 'bottom':
					this.element.style.bottom = '10%';
					this.element.style.transform = 'translateX(-50%)';
					break;
				case 'center':
				default:
					this.element.style.top = '50%';
					this.element.style.transform = 'translate(-50%, -50%)';
					break;
			}
		}
	}
}

export default Modal;