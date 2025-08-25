/**
 * @class Header
 * @classdesc 
 * 
 * The `Header` class manages the header section of the website, including the toggle functionality 
 * for the mobile menu. It handles elements like the header, the mega menu (`mega-menu`), 
 * and the menu toggle button (`mega-menu-toggle`). 
 * 
 * It provides functionality to open and close the mega menu by toggling the appropriate classes
 * and updating the toggle icon. This class is useful for creating a responsive header 
 * that adjusts to mobile views and can be expanded or collapsed via user interaction.
 */
export default class Header {
    /**
     * Creates an instance of the Header component.
     * 
     * Initializes references to the DOM elements: the header, mega menu, and toggle button.
     * Also calls the `#initialize` method to set up the menu toggle functionality if applicable.
     */
	constructor($header) {
		// Try to get the header element by ID
		//const header = document.getElementById("header");

		// only falls back if $sidebar is null or undefined.
		//$header = $header ?? document.getElementById("header");
		if (!$header) {
			$header = document.getElementById("header");
		}
		
		// Set the header element
		this.element = $header;

		// Set the mega menu element
		this.megaMenu = document.getElementById("mega-menu");

		// Set the menu toggle button
		this.megaMenuToggle = document.getElementById('mega-menu-toggle');

		// Select the parent .navbar-right element
		const navbarRight = document.querySelector('.navbar-right');

		// Find the <ul> with class 'navbar-nav' inside the parent
		this.nav = navbarRight ? navbarRight.querySelector('.navbar-nav') : null;

		// Initialize the component
		this.#initialize();
	}

	/**
     * Initializes the component by setting up the mega menu toggle if the menu exists.
     */
	#initialize() {

		// Setup the toggle button if mega menu exists
		if (this.megaMenu) {
			this.#setupToggle();
		}

		// If the menu element exists, initialize the click handler
		if (this.nav) {
			this.initializeNav();
		}
	}

	/**
     * Sets up the click event listener on the menu toggle button.
     * Toggles the mega menu open/close and updates the toggle icon accordingly.
     */
	#setupToggle() {

		// Exit if no toggle button is found
		if (!this.megaMenuToggle) return;

		 // Attach click event listener to the toggle button
		this.megaMenuToggle.addEventListener('click', () => {

			// Toggle the open/close state of the mega menu
			const isOpen = this.megaMenu.classList.toggle('open');

			// Update the toggle icon based on whether the menu is open or closed
			if (!isOpen) {
				this.#setToggleIcon('open');  // Set the icon to 'open'
				document.body.classList.remove('no-scroll');  // Enable body scrolling when menu is closed
			} else {
				this.#setToggleIcon('close');  // Set the icon to 'close'
				
				document.body.classList.add('no-scroll');  // Prevent body scrolling when menu is open
			}
		});
	}

	/**
     * Sets the toggle icon based on the current state (open or close).
     * 
     * @param {string} state - The state of the menu ('open' or 'close').
     */
	#setToggleIcon(state) {
		// Define the SVG icons for open and close states
		const icons = {
			open: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M140-254.62V-300h680v45.38H140Zm0-202.69v-45.38h680v45.38H140ZM140-660v-45.38h680V-660H140Z"/></svg>`,
			close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="m250.92-218.92-32-32L448-480 218.92-709.08l32-32L480-512l229.08-229.08 32 32L512-480l229.08 229.08-32 32L480-448 250.92-218.92Z"/></svg>`
		};

		// Set the innerHTML of the toggle button to the corresponding icon
		this.megaMenuToggle.innerHTML = icons[state];
	}

	/**
	 * Initializes the click handler for the header action menu.
	 * Uses event bubbling to differentiate between various actions.
	 * @listens click
	 */

	initializeNav() {
		// Add event listener to the menu element for click events
		this.nav.addEventListener('click', (event) => {
			// Find the closest <a> tag to the clicked target
			const target = event.target.closest('a');

			// If the target is not a link, return early
			if (!target) return;

			// Get the href attribute of the link
			const href = target.getAttribute('href');

			// If href is set, proceed with the appropriate action
			if (href) {
				// If the link is the logout URL, handle the logout process
				if (href === '/auth/logout') {
					// Prevent the default link behavior and stop event propagation
					event.preventDefault();
					this.handleLogout();
				} else {
					// Otherwise, navigate to the link normally
					window.location.href = href;
				}
			}
		});
	}

	/**
	 * Adds `.elevated` class to header on scroll
	 * for material-style elevation effect.
	 * Called from #initialize()
	 */
	#watchScroll() {
		const threshold = 2; // pixels scrolled before triggering

		const onScroll = () => {
			if (window.scrollY > threshold) {
				this.element.classList.add('elevated');
			} else {
				this.element.classList.remove('elevated');
			}
		};

		// Bind and store handler if needed for removal later
		this._onScroll = onScroll;

		window.addEventListener('scroll', onScroll, { passive: true });

		// Run once on load
		onScroll();
	}

	/**
	 * Handles the logout request by sending a POST fetch request.
	 * After a successful logout, redirects the user to the homepage.
	 * @async
	 * @returns {Promise<void>}
	 */
	async handleLogout() {
		try {
			// Send a POST request to the server for logging out
			const response = await fetch('/auth/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'same-origin',
			});

			// If logout is successful, redirect to the homepage
			if (response.ok) {
				window.location.href = '/';
			} else {
				// Handle any error in the logout process
				// console.error('Logout failed');
				Deck.say('Logout failed', 'danger')
			}
		} catch (error) {
			// Catch and log any error during the fetch request
			//console.error('Error during logout request:', error);
			Deck.say('Logout failed', 'danger')
		}
	}
}