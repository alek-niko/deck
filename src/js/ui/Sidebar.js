/**
 * @class Sidebar
 * 
 * Handles sidebar functionality, including:
 * - Toggling the sidebar open/close state.
 * - Interacting with menu items, such as expanding/collapsing submenus.
 * - Highlighting the active menu item based on the current page.
 * - Providing placeholder methods (`show`, `hide`, `open`, `close`) for future functionality.
 */
export default class Sidebar {
	/**
     * Initializes the Sidebar component by:
     * - Retrieving references to key DOM elements (`sidebar`, `menu`, and `toggle`).
     * - Calling the `#initialize` method to set up functionality.
     */
	constructor($sidebar) {

 		// Find the <aside> element
		// only falls back if $sidebar is null or undefined.
		// $sidebar = $sidebar ?? document.querySelector('aside');

		// fallback if any falsy value 
		// $sidebar = $sidebar || document.querySelector('aside');

		if (!$sidebar) {
			$sidebar = document.querySelector('aside');
		}

		// Exit if no sidebar element is found -  may be partially initialized
		//if (!sidebar) return;

		// if (!sidebar || !sidebar.classList.contains("sidebar-secondary")) {
		// 	throw new Error("Initialization failed: Required sidebar with class 'sidebar-secondary' not found.");
		// }

		// Set the sidebar element
		this.element = $sidebar;

		// Reference to the menu within the sidebar
		this.menu = document.querySelector('.menu');
		
		// Sidebar toggle button
		this.toggle = document.getElementById('sidebar-toggle');

		// Initialize the sidebar functionality
		this.#initialize();
	}

	/**
     * Initializes the sidebar by setting up:
     * - The toggle button for opening/closing the sidebar.
     * - Menu interaction for submenu toggling.
     * - Highlighting the active item in the menu.
     */
	#initialize() {
		if (this.menu) {
			this.#setupToggle();			// Set up toggle button functionality
			this.#setupMenuInteraction();	// Set up menu interaction for submenus
			this.#highlightActiveItem();	// Highlight the active menu item
		}
	}

	/**
     * Sets up the sidebar toggle functionality, allowing the sidebar to be opened or closed.
     * Stores the sidebar's open/close state in `localStorage` for persistence.
     */
	#setupToggle() {

		// Exit if no toggle button is found
		if (!this.toggle) return;

		const body = document.body;
		const isSidebarOpen = localStorage.getItem("deck_sidebar_open") !== null;

		// Initialize the sidebar's open/close state
		body.classList.toggle('sidebar-hidden', !isSidebarOpen);
		this.toggle.classList.toggle('open', isSidebarOpen);

		// Add a click event listener to the toggle button
		this.toggle.addEventListener('click', () => {

			// Toggle sidebar visibility
			const isOpen = body.classList.toggle('sidebar-hidden');

			// Update toggle button state
			this.toggle.classList.toggle('open', !isOpen);

			// Save or remove the open state in localStorage
			if (!isOpen) {
				localStorage.setItem('deck_sidebar_open', 'true');
				this.#setToggleIcon('close');
			} else {
				localStorage.removeItem('deck_sidebar_open');
				this.#setToggleIcon('open');
			}
		});
	}

	/**
     * Updates the toggle button's icon based on the sidebar's state.
     * @param {string} state - The state of the sidebar ('open' or 'close').
     */
	#setToggleIcon(state) {
		const icons = {
			open: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M140-254.62V-300h680v45.38H140Zm0-202.69v-45.38h680v45.38H140ZM140-660v-45.38h680V-660H140Z"/></svg>`,
			close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M140-260v-45.39h488.46V-260H140Zm648-47L613.62-480.62l173.76-172.99L820-621 678.84-480.62l141.77 141L788-307ZM140-458.92v-45.39h371.54v45.39H140Zm0-195.69V-700h488.46v45.39H140Z"/></svg>`
		};

		// Update the toggle button's content with the corresponding icon
		this.toggle.innerHTML = icons[state];
	}

	/**
     * Sets up interaction for the menu, allowing submenus to be toggled.
     * Ensures only one submenu is open at a time.
     */
	#setupMenuInteraction() {
		this.menu?.addEventListener('click', (event) => {
			// Find the closest menu item
			const item = event.target.closest('li');

			// Exit if no submenu exists in the item
			if (!item?.querySelector('.submenu')) return;

			// Toggle the open state of the clicked item
			item.classList.toggle('open');

			// Close any other open submenus
			const siblings = Array.from(this.menu.querySelectorAll('li.open')).filter(sibling => sibling !== item);
			siblings.forEach(sibling => sibling.classList.remove('open'));
		});
	}

	/**
     * Highlights the active menu item based on the current page URL.
     * Expands the parent submenu (if applicable) and scrolls the active item into view.
     */
	#highlightActiveItem() {

		// Get the current page path without query strings or fragments
		const currentPage = window.location.pathname.replace(/(\?.*)?$/, '');

		// Find the menu item for the current page
		const item = document.querySelector(`a[href='${currentPage}']`)?.parentElement;
		
		// Exit if no matching menu item is found
		if (!item) return;

		// Highlight the active menu item
		item.classList.add('active');

		// Open the parent submenu if the item is not part of "Documentation"
		if (item.getAttribute("title") !== 'Documentation') {
			item.closest('.submenu')?.parentNode.classList.add('open');
		}

		// Scroll the active item into view
		document.querySelector('.sidebar .active')?.scrollIntoView({ behavior: 'instant', block: 'center' });
	}

	// Placeholder methods for future functionality
    show() {} // Show the sidebar
    hide() {} // Hide the sidebar
    open(index) {} // Open a specific menu item
    close(index) {} // Close a specific menu item
}