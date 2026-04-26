/**
 * @module js.components.toast
 * @description Manages toast notifications with customizable messages, types, timeouts,
 * 				and screen positions. Handles display, appearance, and positioning of notifications.
 */

/**
 * @class ToastManager
 * @extends Component
 * 
 * Provides an interface for displaying toast notifications, handling different input
 * formats, managing appearance, and ensuring proper positioning on the screen.
 */
class ToastManager {
	/**
	 * Creates an instance of ToastManager.
	 * 
	 * @param {Object} [options={}]						- Configuration options.
	 * @param {string} [options.type=null]				- Default toast type (e.g., "success", "error").
	 * @param {number} [options.timeout=4000]			- Default timeout before the toast disappears.
	 * @param {string} [options.position="top-right"]	- Default position of the toast.
	 */
	constructor(options = {}) {

		this.type			= options.type || 'primary';
        this.timeout		= options.timeout !== undefined ? options.timeout : 4000;
        this.position		= options.position || "top-right";

        this.activeTimeouts	= new Map();	// Store active timeouts to allow cleanup if needed
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

			// If the second argument is an object, treat it as additional options
            } else if (typeof typeOrOptions === 'object') {
                Object.assign(options, typeOrOptions);
            }
        }

        return this.makeToast(
            options.message, 
            options.type || this.type, 
            options.timeout !== undefined ? options.timeout : this.timeout, 
            options.position || this.position
        );
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

		// 2026 A11y Standards
        toast.setAttribute("popover", "manual");  // Ensure popover attribute is set before appending to use the Top Layer API
        toast.setAttribute("role", type === 'danger' ? 'alert' : 'status');
        toast.setAttribute("aria-live", type === 'danger' ? 'assertive' : 'polite');
        
        toast.classList.add("toast", "popover", 'newest', `toast-${position}`, `toast-${type}`);

		// Positioning logic: Inline styles to ensure fixed positioning if not handled by CSS file
        toast.style.position = "fixed";
        toast.style.margin = "0";			// Popovers often have default margins

		// Handle horizontal alignment
		if (position.includes("right")) {
            toast.style.right = "24px";

        } else if (position.includes("left")) {
            toast.style.left = "24px";

        } else {
			// Default to center if needed
            toast.style.left = "50%";
            toast.style.transform = "translateX(-50%)";
        }

		const messageContainer = document.createElement("div");
        messageContainer.classList.add("toast-message");
        messageContainer.innerHTML = message;

		const closeButton = document.createElement("a");
        closeButton.href = "#";
        closeButton.classList.add("icon-action", "toast-close");
        closeButton.setAttribute("aria-label", "Close notification");
        closeButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="20" height="20">
                <path fill="currentColor" d="m250.92-218.92-32-32L448-480 218.92-709.08l32-32L480-512l229.08-229.08 32 32L512-480l229.08 229.08-32 32L480-448 250.92-218.92Z"/>
            </svg>`;

		let hideTimeout;

		const removeHandler = () => {
            if (hideTimeout) clearTimeout(hideTimeout);
            toast.classList.add('toast-hide');
            
            // Allow animation to finish before DOM removal
            toast.addEventListener('transitionend', () => {
                if (toast.parentElement) {
                    toast.remove();
                    this.moveToasts(position);
                }
            }, { once: true });
        };

		// Pause timer on hover for better User Experience
        if (timeout > 0) {
            const startTimer = () => {
                hideTimeout = setTimeout(removeHandler, timeout);
            };
            
            toast.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
            toast.addEventListener('mouseleave', startTimer);
            startTimer();
        }

		closeButton.addEventListener("click", (e) => {
            e.preventDefault();
            removeHandler();
        });

        toast.appendChild(messageContainer);
        toast.appendChild(closeButton);
        document.body.appendChild(toast);

        // Required for the Popover API to promote to Top Layer
        toast.showPopover();
        
        // Initial stacking
        this.moveToasts(position);

		// (Optional) Force a reflow if you notice a flicker
		// void toast.offsetHeight;

        return toast; // Return element for external manipulation if needed
	}

	/**
     * Adjusts the position of toast notifications using viewport-fixed coordinates.
     */
	moveToasts(pos) {
		
        const isTop = pos.startsWith('top');
        const side = isTop ? 'top' : 'bottom';
        const toasts = Array.from(document.querySelectorAll(`.toast.toast-${pos}`));
        
        let currentOffset = 24;

        toasts.forEach((toast) => {
            // Only move toasts that aren't currently being dismissed
            if (!toast.classList.contains('toast-hide')) {
                toast.style[side] = `${currentOffset}px`;
                // Add current toast height + spacing
                currentOffset += toast.offsetHeight + 12;
            }
        });
    }
}

export default ToastManager;