/**
 * @module sidebar
 * @description Manages sidebar functionality, including toggling, menu interactions,
 * active item highlighting, and placeholder methods for future enhancements.
 */

/**
 * @class Sidebar
 *
 * Handles sidebar behavior such as opening/closing, interacting with menu items
 * (expanding/collapsing submenus), highlighting the active menu item, and providing
 * placeholder methods like `show`, `hide`, `open`, and `close` for future functionality.
 */
class Sidebar {

    /**
     * @param {string} elementSelector - The CSS selector for the sidebar element.
     * @param {string} toggleSelector - The CSS selector for the toggle button.
     * @param {object} [options={}] - Configuration options for the sidebar.
     * @param {string} [options.storageKey='sidebar.open'] - The key for localStorage.
     * @param {number|null} [options.responsiveBreakpoint=null] - The window width (in px) below which special visibility logic applies.
     * @param {string} [options.bodyHiddenClass='sidebar-hidden'] - The class applied to the <body> to hide the sidebar.
     * @param {string} [options.responsiveVisibleClass='is-visible'] - The class applied to the sidebar element for visibility on smaller screens.
     * @param {string} [options.toggleOpenClass='open'] - The class applied to the toggle button when the sidebar is open.
     */

	constructor(elementSelector, toggleSelector, options = {}) {

        this.element = document.querySelector(elementSelector);
        this.toggle = document.querySelector(toggleSelector);

		// Merge default options with user-provided ones
        this.options = {
            storageKey: 'sidebar.open',
            responsiveBreakpoint: null,
            bodyHiddenClass: 'sidebar-hidden',
            responsiveVisibleClass: 'is-visible',
            toggleOpenClass: 'open',
            ...options
        };

		// Prevents initialization if essential elements are missing
		if (!this.element || !this.toggle) {
            console.warn(`Sidebar initialization failed for selector "${elementSelector}". Element or toggle not found.`);
            return;
        }

        this.init();
	}

    /**
     * Initializes the sidebar by setting its initial state and attaching event listeners.
     */
    init() {
        this.#setInitialState();
        this.#attachEventListeners();
		this.#highlightActiveItem();
        this.#setupMenuInteraction();
    }	

    /**
     * Reads the state from localStorage and applies the initial classes.
     */
    #setInitialState() {
        // localStorage stores strings, 'true' indicates it was previously open.
        const isVisible = localStorage.getItem(this.options.storageKey) === 'true';
        this.#applyState(isVisible);
    }
	
    /**
     * Attaches the click event listener to the toggle button.
     */
    #attachEventListeners() {
		this.toggle.addEventListener('click', () => this.#handleToggle());
				
		// Add listener for clicks outside the sidebar
        document.addEventListener('click', (event) => this.#handleClickOutside(event));
    }
	
    /**
     * Handles the logic when the toggle button is clicked.
     */
    #handleToggle() {
        // Check visibility by seeing if the hidden class is NOT on the body
        const isNowVisible = document.body.classList.toggle(this.options.bodyHiddenClass);
        this.#applyState(!isNowVisible);
    }

    /**
     * Handles clicks on the document to close the sidebar when clicking outside of it.
     * This functionality is only active on screen sizes below the responsive breakpoint.
     * @param {MouseEvent} event - The click event object.
     */
    #handleClickOutside(event) {

        // Only run this logic on smaller screens
        if (!this.options.responsiveBreakpoint || window.innerWidth >= this.options.responsiveBreakpoint) {
            return;
        }
        
        // Check if the sidebar is currently visible/open
        const isHidden = document.body.classList.contains(this.options.bodyHiddenClass);
        if (isHidden) {
            return;
        }

        // Check if the click was inside the sidebar or on the toggle button itself
        const clickedInsideSidebar = this.element.contains(event.target);
        const clickedOnToggle = this.toggle.contains(event.target) ;

        if (clickedInsideSidebar || clickedOnToggle) {
            return;
        }

        // If all checks pass, it was a click outside, so hide the sidebar
        this.hide();
    }	

    /**
     * Applies all visual and state changes based on sidebar visibility.
     * @param {boolean} isVisible - Whether the sidebar should be visible.
     */
    #applyState(isVisible) {
        document.body.classList.toggle(this.options.bodyHiddenClass, !isVisible);
		this.toggle.classList.toggle(this.options.toggleOpenClass, isVisible);

        this.#updatePersistentState(isVisible);
        this.#handleResponsiveBehavior(isVisible);
    }

    /**
     * Updates the state in localStorage.
     * @param {boolean} isVisible - The current visibility state.
     */
    #updatePersistentState(isVisible) {
        if (isVisible) {
            localStorage.setItem(this.options.storageKey, 'true');
        } else {
            localStorage.removeItem(this.options.storageKey);
        }
    }
	
   /**
     * Toggles a responsive-specific visibility class if the screen
     * is below the configured breakpoint.
     * @param {boolean} isVisible - The current visibility state.
     */
    #handleResponsiveBehavior(isVisible) {
        if (this.options.responsiveBreakpoint && window.innerWidth < this.options.responsiveBreakpoint) {
            this.element.classList.toggle(this.options.responsiveVisibleClass, isVisible);
        }
    }	

	/**
	 * Sets up interaction for the menu, allowing submenus to be toggled.
	 * Uses event delegation and ensures only one submenu is open at a time.
	 */
	#setupMenuInteraction() {
		// Exit if there's no menu element to attach listener to
		if (!this.element.querySelector('ul')) return;
		
		this.element.addEventListener('click', (event) => {
			const clickedItem = event.target.closest('li');
			
			// Ensure we clicked an item and it has a submenu
			if (!clickedItem || !clickedItem.querySelector('.submenu')) {
				return;
			}

			const currentlyOpenItem = this.element.querySelector('li.open');

			// If another item is open, close it
			if (currentlyOpenItem && currentlyOpenItem !== clickedItem) {
				currentlyOpenItem.classList.remove('open');
			}

			// Toggle the clicked item's state
			clickedItem.classList.toggle('open');
		});
	}

	/**
	 * Highlights the active menu item based on the current URL.
	 * Expands parent submenus and scrolls the active item into view.
	 */
	#highlightActiveItem() {
		const currentPath = window.location.pathname;
		const menuLinks = this.element.querySelectorAll('a[href]');
		
		let activeItem = null;

		// Find the best link match. This is more robust than a direct attribute selector.
		for (const link of menuLinks) {
			// A simple check to see if the link's href is part of the current path
			if (currentPath.endsWith(link.getAttribute('href'))) {
				activeItem = link.parentElement; // We want the <li>
				break; // Stop after finding the first match
			}
		}

		if (!activeItem) return;

		activeItem.classList.add('active');

		// Expand parent submenu if it exists and isn't marked otherwise
		const parentSubmenu = activeItem.closest('.submenu');
		if (parentSubmenu) {
			const parentLi = parentSubmenu.parentElement;
			// Use a data-attribute for exceptions instead of a hardcoded title
			if (!parentLi.hasAttribute('data-no-auto-expand')) {
				parentLi.classList.add('open');
			}
		}

		// Scroll the active item into view efficiently
		activeItem.scrollIntoView({
			behavior: 'instant',
			block: 'center'
		});
	}	

    /**
     * Makes the sidebar visible.
     */
    show() {
        this.#applyState(true);
    }

    /**
     * Hides the sidebar.
     */
    hide() {
        this.#applyState(false);
    }

    /**
     * Opens a specific submenu by its index.
     * @param {number} index - The zero-based index of the submenu item to open.
     */
    open(index) {
        // Check if the index is valid
        if (index < 0 || index >= this.submenuItems.length) {
            console.warn(`Submenu index ${index} is out of bounds.`);
            return;
        }

        const itemToOpen = this.submenuItems[index];
        const currentlyOpenItem = this.element.querySelector('li.open');

        // Close any other open item first
        if (currentlyOpenItem && currentlyOpenItem !== itemToOpen) {
            currentlyOpenItem.classList.remove('open');
        }

        // Open the target item
        itemToOpen.classList.add('open');
    }

    /**
     * Closes a specific submenu by its index.
     * @param {number} index - The zero-based index of the submenu item to close.
     */
    close(index) {
        // Check if the index is valid
        if (index < 0 || index >= this.submenuItems.length) {
            console.warn(`Submenu index ${index} is out of bounds.`);
            return;
        }
        
        const itemToClose = this.submenuItems[index];
        itemToClose.classList.remove('open');
    }
}

export default Sidebar;