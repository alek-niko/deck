/**
 * Manages toast notifications with customizable messages, types, timeouts, and positions.
 * 
 * This class provides an interface for displaying toast notifications, handling different formats
 * of input, managing their appearance, and ensuring they are properly positioned on the screen.
 * 
 * @class ToastManager
 */
class ToastManager {
    /**
     * Creates an instance of ToastManager.
     * 
     * @param {Object} [options={}] - Configuration options.
     * @param {string} [options.type=null] - Default toast type (e.g., "success", "error").
     * @param {number} [options.timeout=4000] - Default timeout before the toast disappears.
     * @param {string} [options.position="top-right"] - Default position of the toast.
     */
	constructor( options = {} ) {

		this.type = options.type || null;
		this.timeout = options.timeout || 4000;
		this.position = options.position || "top-right";

	}

	/**
     * Displays a toast notification with various formats.
     * 
     * Supports multiple input formats:
     *  - notify("My message");
     *  - notify("My message", "success");
     *  - notify("My message", { type: "error", timeout: 5000 });
     *  - notify({ message: "My message", type: "info" });
     * 
     * @param {string|Object} messageOrOptions - Message string or an options object.
     * @param {string|Object} [typeOrOptions={}] - Optional type string or additional options.
     */
	notification(messageOrOptions, typeOrOptions = {}) {
		let options = {};

		// If first argument is an object (full options)
		if (typeof messageOrOptions === 'object') {
			options = messageOrOptions;
		
		} else {
			options.message = messageOrOptions;

			// If the second argument is a string, treat it as type
			if (typeof typeOrOptions === 'string') {
				options.type = typeOrOptions;
			} 
			// If the second argument is an object, treat it as additional options
			else if (typeof typeOrOptions === 'object') {
				Object.assign(options, typeOrOptions);
			}
		}

		this.makeToast(options.message, options.type, options.timeout, options.position)
	}

	/**
     * Creates and displays a toast notification.
     * 
     * @param {string} message - The message content of the toast.
     * @param {string} [type=this.type] - The toast type (affects styling).
     * @param {number} [timeout=this.timeout] - Duration before the toast disappears.
     * @param {string} [position=this.position] - The position where the toast appears.
     */
	makeToast(message, type = this.type, timeout = this.timeout, position = this.position) {

		const toast = document.createElement("div");
		toast.classList.add("toast", "popover", 'newest', `toast-${position}`, `toast-${type}`);

		toast.setAttribute("popover", "manual");

		const messageContainer = document.createElement("div");
		messageContainer.classList.add("toast-message");

		const closeButton = document.createElement("a");
		closeButton.href = "#";
		closeButton.classList.add("icon-action", "toast-close");
		closeButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
	<path d="m250.92-218.92-32-32L448-480 218.92-709.08l32-32L480-512l229.08-229.08 32 32L512-480l229.08 229.08-32 32L480-448 250.92-218.92Z"/>
 </svg>
`;
		closeButton.addEventListener("click", (event) => {
			event.preventDefault();
			toast.classList.add('toast-hide');
			//toast.onanimationend = () => (toast.hidePopover(), toast.remove());
			//toast.onanimationend = () => toast.remove();
			setTimeout(() => toast.remove(), 300)
			//this.reStackToasts();
		});
		
		messageContainer.innerHTML = message;

		toast.appendChild(messageContainer);
		toast.appendChild(closeButton);

		document.body.appendChild(toast);

		this.moveToasts(position);

		toast.showPopover();

		if (timeout) {
			setTimeout(() => {
				toast.classList.add('toast-hide');
				//toast.onanimationend = () => (toast.hidePopover(), toast.remove());
				//toast.onanimationend = () => toast.remove();
				setTimeout(() => toast.remove(), 300)
			}, timeout);
		}

		// When a new toast appears, run the movetoastsUp() function
		toast.addEventListener("toggle", (event) => {
			if (event.newState === "open") {
				this.moveToasts(position);
			} else if (event.newState === "closed") {
				//this.reStackToasts(position);
			}
		});

	}

	/**
     * Adjusts the position of toast notifications to prevent overlap.
     * 
     * @param {string} pos - The position of the toasts (e.g., "top-right", "bottom-left").
     */
	moveToasts(pos) {
		const position = pos.match(/\b(top|bottom)\b/)?.[0] || null;

		if (position) {

			const toasts = document.querySelectorAll(`.toast.toast-${pos}`);

			toasts.forEach(toast => {
				// If the toast is the one that has just appeared.
				if (toast.classList.contains("newest")) {
					toast.style[position] = `15px`;
					toast.classList.remove("newest");
				} else {
					// Move all the other toasts by 35px to make way for the new one
					const prevValue = toast.style[position].replace("px", "");
					const newValue = parseInt(prevValue) + 35;
					toast.style[position] = `${newValue}px`;
				}
			})
		}
	}
}

export default ToastManager;