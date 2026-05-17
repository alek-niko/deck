/**
 * =============================================================================
 * NAVIGATION MANAGER
 * @module js.ui.nav.manager
 * -----------------------------------------------------------------------------
 * Handles recursive navigation behavior, expand/collapse state,
 * active item management, and automatic parent discovery.
 *
 * Features:
 * 	- Recursive multi-level navigation support
 * 	- Event delegation for high performance
 * 	- Accordion and multi-expand modes
 * 	- Automatic active-parent expansion
 * 	- Optional always-open navigation mode
 * 	- Dynamic parent icon injection
 * 	- Safe re-initialization protection
 *
 * Supported Navigation Behaviors:
 * 	- data-open		- force all navigation branches open
 * 	- data-multiple	- allow multiple branches open simultaneously
 *
 * Notes:
 * 	- Uses delegated click handling to avoid per-item listeners
 * 	- Automatically scans nested navigation structures
 * 	- Designed for large/dynamic navigation trees
 * =============================================================================
 */

/**
 * @class NavManager
 * @description
 * System-level navigation controller responsible for:
 *	- Recursive navigation initialization
 * 	- Expand/collapse behavior
 * 	- Active state synchronization
 * 	- Parent relationship management
 */
class NavManager {

	/**
	 * -------------------------------------------------------------------------
	 * Create Navigation Manager
	 * -------------------------------------------------------------------------
	 * @param {Object} ui - Shared UI/system reference.
	 */
	constructor(ui) {
		this.ui = ui;

		this.init();
	}

	/**
	 * -------------------------------------------------------------------------
	 * Initialize Navigation System
	 * -------------------------------------------------------------------------
	 * Performs:
	 * 	- Initial navigation scan
	 * 	- Global delegated click binding
	 *
	 * Uses event delegation for:
	 * 	- Better performance
	 * 	- Lower memory usage
	 * 	- Dynamic DOM compatibility
	 * -------------------------------------------------------------------------
	 */
	init() {
		this.setup();

		// Global click delegation.
		document.body.addEventListener(
			'click',
			this.onClick.bind(this)
		);
	}

	/**
	 * -------------------------------------------------------------------------
	 * Setup Navigation Trees
	 * -------------------------------------------------------------------------
	 * Scans the provided container for .nav elements and prepares:
	 * 	- Parent relationships
	 * 	- Expandable branches
	 * 	- Parent indicators
	 * 	- Active-state expansion
	 *
	 * Prevents duplicate initialization using:
	 * data-nav-initialized
	 * -------------------------------------------------------------------------
	 *
	 * @param {HTMLElement|Document} container
	 * Scope to scan for navigation instances.
	 */
	setup(container = document) {

		// Find all navigation containers.
		const navs = container.querySelectorAll('.nav');

		navs.forEach(nav => {

			// Prevent duplicate initialization.
			if (nav.dataset.navInitialized) {
				return;
			}

			// -----------------------------------------------------------------
			// Navigation Configuration
			// -----------------------------------------------------------------

			// Force entire navigation tree open.
			const forceOpen = nav.hasAttribute('data-open');

			// -----------------------------------------------------------------
			// Process Navigation Items
			// -----------------------------------------------------------------
			nav.querySelectorAll('li').forEach(li => {

				// Detect direct child submenu.
				const subMenu = li.querySelector(
					':scope > ul, :scope > .nav-sub'
				);

				// Skip non-parent items.
				if (!subMenu) {
					return;
				}

				// Mark as expandable parent.
				li.classList.add('parent');

				// -------------------------------------------------------------
				// Force-Open Mode
				// -------------------------------------------------------------
				// Opens every parent immediately.
				if (forceOpen) {
					li.classList.add('open');
				}

				// -------------------------------------------------------------
				// Parent Icon Injection
				// -------------------------------------------------------------
				// Automatically injects expand indicator SVG if missing.
				// Prevents duplicate icons on repeated setup calls.
				// -------------------------------------------------------------
				if (!li.querySelector('.nav-parent-icon')) {

					const link = li.querySelector(':scope > a');

					if (link) {

						// Standardized navigation chevron icon.
						const svgTemplate = `
							<svg class="icon-action nav-parent-icon"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 -960 960 960">

								<path d="M480-357.85 253.85-584l32.61-32.61L480-423.08l193.54-193.53L706.15-584 480-357.85Z"/>
							</svg>
						`;

						// Append icon to navigation link.
						link.insertAdjacentHTML(
							'beforeend',
							svgTemplate
						);
					}
				}
			});

			// -----------------------------------------------------------------
			// Auto-Expand Active Navigation Paths
			// -----------------------------------------------------------------
			// Ensures all parents of active items are opened automatically.
			//
			// Example:
			// Dashboard
			//	 Settings
			//		Profile (active)
			//
			// Result:
			// Dashboard + Settings become open automatically.
			// -----------------------------------------------------------------
			if (!forceOpen) {

				nav.querySelectorAll('li.active').forEach(activeItem => {

					let parent =
						activeItem.parentElement.closest('li.parent');

					while (parent) {

						parent.classList.add('open');

						parent =
							parent.parentElement.closest('li.parent');
					}
				});
			}

			// Mark navigation as initialized.
			nav.dataset.navInitialized = 'true';
		});
	}

	/**
	 * -------------------------------------------------------------------------
	 * Navigation Click Handler
	 * -------------------------------------------------------------------------
	 * Handles:
	 * 	- Expand/collapse behavior
	 * 	- Accordion mode
	 * 	- Active item switching
	 *
	 * Behavior Modes:
	 * 	- Accordion mode (default)
	 * 	- Multi-expand mode via [data-multiple]
	 * 	- Always-open mode via [data-open]
	 * -------------------------------------------------------------------------
	 *
	 * @param {MouseEvent} event
	 */
	onClick(event) {

		// Find clicked navigation item.
		const clickedItem = event.target.closest('.nav li');

		if (!clickedItem) {
			return;
		}

		// Resolve navigation container.
		const nav = clickedItem.closest('.nav');

		// Determine item capabilities.
		const isParent =
			clickedItem.classList.contains('parent');

		// ---------------------------------------------------------------------
		// Navigation Configuration
		// ---------------------------------------------------------------------

		// Accordion mode enabled by default.
		const isAccordion =
			!nav.hasAttribute('data-multiple');

		// Prevent collapsing entirely.
		const isAlwaysOpen =
			nav.hasAttribute('data-open');

		// ---------------------------------------------------------------------
		// Parent Navigation Item
		// ---------------------------------------------------------------------
		// Handles expand/collapse interactions.
		// ---------------------------------------------------------------------
		if (isParent) {

			// Ignore collapse logic when permanently open.
			if (!isAlwaysOpen) {

				// -------------------------------------------------------------
				// Accordion Behavior
				// -------------------------------------------------------------
				// Closes sibling branches at the same nesting level.
				if (isAccordion) {

					const siblings =
						clickedItem.parentElement.querySelectorAll(
							':scope > li.parent.open'
						);

					siblings.forEach(el => {

						if (el !== clickedItem) {
							el.classList.remove('open');
						}
					});
				}

				// Toggle current branch.
				clickedItem.classList.toggle('open');

			} else {

				// Always-open mode prevents collapsing.
				clickedItem.classList.add('open');
			}

		} else {

			// -----------------------------------------------------------------
			// Leaf Navigation Item
			// -----------------------------------------------------------------
			// Handles active state switching for terminal items.
			// -----------------------------------------------------------------

			// Remove previous active items.
			nav.querySelectorAll('li.active')
				.forEach(el => el.classList.remove('active'));

			// Activate clicked item.
			clickedItem.classList.add('active');
		}
	}
}

export default NavManager;