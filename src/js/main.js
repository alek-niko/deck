/**
 * @module main
 * @description Entry point for prototyping and development builds. 
 *				Imports core components and initializes a global `Deck` instance,
 *				automatically register and load UI components
 * 				and checks for an optional modules manifest.
 */

// Core
import Deck  from './core/deck.js';

// Core UI Components
import Accordion from './components/accordion.js';
import Modal from './components/modal.js';
import Tab from './components/tab.js';
import Nav from './components/nav.js';
import Drop from './components/drop.js';
import Lightbox from './components/lightbox.js';
import Offcanvas from './components/offcanvas.js';
import Toggle from './components/toggle.js';
import Drilldown from './components/drilldown.js';
import Uploader from './components/uploader.js';

// Static imports; due to esbuild plitting
import modules from './modules/index.js';
import plugins from './plugins/index.js';

/**
 * Initializes the component registry and optional modules.
 */
async function initialize() {

	// Check for "Developer-Mode" HTML settings (Optional)
	const localOptions = window.DECK_CONFIG || {};

	// Instantiate Deck
	window.deck = new Deck(localOptions);

	// Remote Hydration
	if (window.deck.settings.settingsUrl) {
		await window.deck.hydrate();
	}

	// Define standard UI components
	// ──────────────────────────────
	const registry = {
		'accordion': Accordion,
		'modal': Modal,
		'tab': Tab,
		'nav': Nav,
		'drop': Drop,
		'dropdown': Drop,
		'lightbox': Lightbox,
		'offcanvas': Offcanvas,
		'toggle': Toggle,
		'drilldown': Drilldown,
		'uploader': Uploader,
	}

	/**
	 * Optional Components / Modules (Private or Custom)
	 * Merges external modules into the core component registry.
	 * Normalizes kebab-case keys and prevents overwriting protected core UI.
	 */
	if (modules && typeof modules === 'object') {
		Object.entries(modules).forEach(([key, value]) => {
			try {
				// Helper to normalize keys (kebab-case -> camelCase)
				const cleanKey = key.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());

				// Validate Module: Ensure it's either a Class or a Lazy-Load Function
				if (typeof value !== 'function') {
					console.warn(`Deck: Module "${key}" skipped. Expected a Class or dynamic import function.`);
					return;
				}

				// Collision Guard: Prevent third-party modules from hijacking Core UI (Modal, Nav, etc.)
				if (!registry[cleanKey]) {
					registry[cleanKey] = value;
				} else {
					console.error(`Deck Conflict: "${cleanKey}" is a reserved Core name and cannot be overwritten.`);
				}
			} catch (error) {
				console.error(`Deck: Failed to process module "${key}":`, error);
			}
		});
	}

	/**
	 * Optional Plugins / Services
	 * Initializes global services, state stores, and middleware.
	 * Supports both Array and Object exports from the plugins manifest.
	 */
	if (plugins && (Array.isArray(plugins) || typeof plugins === 'object')) {
		// Standardize input into an iterable array
		const pluginList = Array.isArray(plugins) ? plugins : Object.values(plugins);

		pluginList.forEach((plugin, index) => {
			try {
				// Null check for sparse arrays or undefined exports
				if (!plugin) return;

				// Execute the internal Deck .use() method
				window.deck.use(plugin);

				// Developer Trace (Optional: remove in strict production)
				// const name = plugin.name || plugin.constructor?.name || `Plugin[${index}]`;
				// console.debug(`Deck: Plugin "${name}" initialized.`);

			} catch (error) {
				// Critical: One failing plugin must not stop the entire framework boot
				const name = plugin?.name || `Plugin[${index}]`;
				console.error(`Deck: Critical failure in plugin "${name}":`, error);
			}
		});
	}

	// Register everything
	window.deck.register(registry);

	/**
	 * BOOT LOGIC: Fail-proof execution
	 * We check if DOM is already interactive or complete.
	 */
	const boot = () => {
		// Prevent double-initialization if needed
		if (window.deck.isLoaded) return;
		
		window.deck.autoload();
		window.deck.isLoaded = true; // Set a flag on the instance
		
		// Dispatch a global event so other scripts know Deck is ready
		document.dispatchEvent(new CustomEvent('deck:ready', { detail: window.deck }));
	};

	if (document.readyState !== 'loading') {
		// DOM is already ready (interactive or complete)
		boot();
	} else {
		// DOM is still loading
		document.addEventListener('DOMContentLoaded', boot);
	}

}

// Kick off the async initialization
if (window.deck) {
	console.warn("Deck already initialized. Skipping...");
	
} else {
	
	initialize().catch(err => {
		console.error("Deck: Critical failure during initialization:", err);
	});
}