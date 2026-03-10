/**
 * @module main
 * @description Entry point for prototyping and development builds. 
 *				Imports core components and initializes a global `Deck` instance,
 				automatically register and load UI components
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

/**
 * @global
 * @description Creates a new instance of the Deck class and attaches it to the global `window` object.
 */
window.deck = new Deck()

/**
 * Initializes the component registry and optional modules.
 */
async function initialize() {

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

	// Optional Components / Modules (Private or Custom)
	// ────────────────────────────────────────────────
	try {
		// We look for index.js inside the modules folder
		const moduleManifest = await import('./modules/index.js');
		
		if (moduleManifest.default) {
			Object.assign(registry, moduleManifest.default);
			//console.info("Deck: Modules loaded successfully.");
		}

	} catch (e) {
		// If modules/index.js doesn't exist, we just carry on
		//console.info("Deck: No additional modules found.");

		if (e.code !== 'ERR_MODULE_NOT_FOUND') {
			console.warn("Deck: Optional modules failed.", e);
		}
	}
	
	// Optional Plugins / Services
	// ────────────────────────────────────────────────
	try {
		const pluginsManifest = await import('./plugins/index.js');
		const plugins = pluginsManifest.default ?? [];

		// Handle both array and object exports gracefully
		const pluginList = Array.isArray(plugins)
			? plugins
			: (typeof plugins === 'object' && plugins !== null ? Object.values(plugins) : []);

		pluginList.forEach(plugin => {
			window.deck.use(plugin);
			// Optional: log if you want visibility during dev
			// console.info(`Deck: Plugin loaded → ${plugin.name || plugin.constructor?.name || 'anonymous'}`);
		});

		if (pluginList.length > 0) {
			// console.info(`Deck: ${pluginList.length} plugin(s) initialized.`);
		}
	} catch (e) {
		if (e.code !== 'ERR_MODULE_NOT_FOUND') {
			console.warn("Deck: Optional plugins failed to load.", e);
		}
		// else: no plugins folder/file → silent, expected
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
initialize().catch(err => {
	console.error("Deck: Critical failure during initialization:", err);
});