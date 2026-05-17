/**
 * =============================================================================
 * DECK
 * @module js.core.deck
 * -----------------------------------------------------------------------------
 * Core application controller. Orchestrates components, state, plugins,
 * and the UI subsystem. Extends Dispatcher for application-wide pub/sub.
 *
 * Responsibilities:
 *	- Component registration and autoloading (including lazy/dynamic imports)
 *	- Application state with Proxy-based reactivity and key watchers
 *	- Plugin system (Vue-style .install, factory functions, plain objects)
 *	- Remote settings hydration
 *	- Automatic instance cleanup via MutationObserver
 *	- Toast notification proxies (deck.notify / deck.toast / deck.say)
 *	- WebSocket connection (inherited from Dispatcher)
 *
 * Usage:
 *	const deck = new Deck({ env: 'development', debug: true });
 *	deck.register({ 'modal': Modal, 'accordion': Accordion });
 *	await deck.autoload();
 *
 * State:
 *	deck.setState('user', { name: 'Jane' });
 *	deck.getState('user');
 *	deck.watch('user', (value) => console.log(value));
 *
 * Plugins:
 *	deck.use(AnalyticsPlugin);
 *	deck.use((deck) => { deck.track = () => {}; });
 * =============================================================================
 */

import Dispatcher	from './dispatcher.js';
import UI			from '../ui/ui.js';

/**
 * @class Deck
 * @extends Dispatcher
 */
class Deck extends Dispatcher {

	// =========================================================================
	// CONSTRUCTOR
	// =========================================================================

	/**
	 * @param {Object} [options={}]
	 * @param {string} [options.env='production']		- Environment ('development' | 'production').
	 * @param {boolean}[options.debug=false]			- Enable debug logging.
	 * @param {string} [options.apiBase=null]			- Base URL for API requests.
	 * @param {string} [options.settingsUrl=null]		- URL to fetch remote config from.
	 * @param {Object} [options.state={}]				- Initial application state.
	 * @param {Object} [options.components]				- Component lazy-load settings.
	 */
	constructor(options = {}) {
		super();

		// ── Settings ──────────────────────────────────────────────────────────
		this.settings = this.#defaultSettings();
		this.#mergeSettings(options);

		// ── Component registry ────────────────────────────────────────────────
		this.components = {};		// Registered component classes / import functions
		this.instances  = {};		// Active instances keyed by DCI

		// ── State ─────────────────────────────────────────────────────────────
		this.#watchers = {};

		// Proxy-based reactive state — emits 'stateChange' and triggers key watchers
		this.state = new Proxy(options.state ?? {}, {
			set: (target, key, value) => {
				if (target[key] !== value) {
					target[key] = value;
					this.emit('stateChange', { [key]: value });
					this.#watchers[key]?.forEach(cb => {
						try { cb(value); } catch (err) {
							console.error(`[Deck] Watcher error for key "${key}":`, err);
						}
					});
				}
				return true;
			},
		});

		// ── UI subsystem ──────────────────────────────────────────────────────
		// UI owns all visual/DOM managers (toast, toggle, tooltip, lightbox,
		// navs, sidebars, header, etc.)
		this.ui = new UI(this);

		// ── Lifecycle ─────────────────────────────────────────────────────────
		this.isLoaded = false;

		// Auto-cleanup: destroy component instances when their elements are removed
		this.#initCleanupObserver();

		// Signal readiness to the page
		document.dispatchEvent(new CustomEvent('deck.ready', { detail: this }));
	}

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** Key-based state watchers: { [key]: Function[] } */
	#watchers = {};

	// =========================================================================
	// PUBLIC — COMPONENT REGISTRY
	// =========================================================================

	/**
	 * @method register
	 * @description Registers component classes or lazy import functions.
	 *				Normalizes kebab-case names to camelCase internally.
	 *
	 * @param {Object} components - { 'modal': ModalClass, 'video-player': () => import('./video.js') }
	 * @returns {Deck} this — chainable
	 *
	 * @example
	 * deck.register({
	 *		'modal':		Modal,
	 *		'accordion':	Accordion,
	 *		'video-player':	() => import('./components/video.js'),
	 * });
	 */
	register(components) {
		for (const rawName in components) {
			// 'video-player' -> 'videoPlayer'
			const name = rawName.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
			this.components[name] = components[rawName];
		}
		return this;
	}

	/**
	 * @method autoload
	 * @description Scans the DOM for registered components and initializes them.
	 *				Supports lazy/dynamic imports — components are loaded on demand.
	 *				Safe to call multiple times — already-initialized elements are skipped.
	 *
	 * @param {string|string[]|null} [filter]			- Component name(s) to initialize. null = all.
	 * @param {HTMLElement|Document} [context=document]	- DOM scope to scan within.
	 * @returns {Promise<void>}
	 *
	 * @example
	 * // Init all registered components
	 * await deck.autoload();
	 *
	 * // Init only specific components
	 * await deck.autoload(['modal', 'accordion']);
	 *
	 * // Init within a dynamically injected container
	 * await deck.autoload(null, document.querySelector('#dynamic-section'));
	 */
	async autoload(filter = null, context = document) {

		const keys = Array.isArray(filter)		? filter
				   : typeof filter === 'string'	? [filter]
				   : Object.keys(this.components);

		await Promise.all(keys.map(async (key) => {

			// camelCase -> kebab-case for DOM selectors
			const kebab		= key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
			const selector	= [
				`.${kebab}`,
				`[${kebab}]`,
				`[data-${kebab}]`,
				`[data-component="${kebab}"]`,
				`[data-ui~="${kebab}"]`,
			].join(', ');

			const elements = [...context.querySelectorAll(selector)];
			if (!elements.length) return;

			// ── Resolve component source ──────────────────────────────────────
			let ComponentClass = this.components[key];

			// Lazy import: a function that is not a constructor
			if (typeof ComponentClass === 'function' && !ComponentClass.prototype?.constructor) {
				try {
					const mod = await ComponentClass();
					ComponentClass = mod.default ?? mod;
					// Swap loader with resolved class for subsequent calls
					this.components[key] = ComponentClass;
				} catch (err) {
					console.error(`[Deck] Failed to lazy-load component "${key}"`, err);
					return;
				}
			}

			// ── Initialize each element ───────────────────────────────────────
			elements.forEach(element => {
				if (this.#hasInstance(element, key)) return; // Already initialized

				try {
					const instance = new ComponentClass(element, {}, this);
					this.#registerInstance(element, key, instance.dci, instance);
				} catch (err) {
					console.error(`[Deck] Failed to initialize component "${key}" on`, element, err);
				}
			});
		}));

		this.isLoaded = true;
	}

	/**
	 * @method reinit
	 * @description Re-scans a DOM branch for uninitialized components.
	 *				Use after AJAX/HTMX content injection.
	 *
	 * @param {HTMLElement} [target=document]
	 * @returns {Promise<void>}
	 */
	reinit(target = document) {
		return this.autoload(null, target);
	}

	// =========================================================================
	// PUBLIC — INSTANCE REGISTRY
	// =========================================================================

	/**
	 * @method getInstance
	 * @description Retrieves a component instance by its element or DCI string.
	 *
	 * @param {HTMLElement|string} input
	 * @returns {Object|null}
	 */
	getInstance(input) {
		const dci = input instanceof HTMLElement ? input._dci : input;
		return (dci && this.instances[dci]) ?? null;
	}

	/**
	 * @method update
	 * @description Finds a component instance on an element and calls its update() method.
	 *
	 * @param {HTMLElement|string} target
	 * @param {string}             componentName
	 * @param {Object}             [options={}]
	 */
	update(target, componentName, options = {}) {
		const element = target instanceof HTMLElement
			? target
			: document.querySelector(target);

		if (!element?.uiInstances) return;

		const dci      = element.uiInstances[componentName];
		const instance = this.instances[dci];

		instance?.update?.(options);
	}

	// =========================================================================
	// PUBLIC — STATE
	// =========================================================================

	/**
	 * @method getState
	 * @description Reads a value from the reactive state object.
	 *
	 * @param {string} key
	 * @returns {*}
	 */
	getState(key) {
		return this.state[key];
	}

	/**
	 * @method setState
	 * @description Writes a value to the reactive state object.
	 *				Triggers 'stateChange' and any key-specific watchers.
	 *
	 * @param {string}	key
	 * @param {*}		value
	 */
	setState(key, value) {
		this.state[key] = value;
	}

	/**
	 * @method watch
	 * @description Subscribes to changes on a specific state key.
	 *
	 * @param {string}		key
	 * @param {Function}	callback  - Receives the new value.
	 * @returns {Function} Unwatch function.
	 */
	watch(key, callback) {
		if (!this.#watchers[key]) this.#watchers[key] = [];
		this.#watchers[key].push(callback);
		return () => this.unwatch(key, callback);
	}

	/**
	 * @method unwatch
	 * @description Removes a specific watcher callback for a state key.
	 *
	 * @param {string}		key
	 * @param {Function}	callback
	 */
	unwatch(key, callback) {
		if (!this.#watchers[key]) return;
		this.#watchers[key] = this.#watchers[key].filter(cb => cb !== callback);
		if (this.#watchers[key].length === 0) delete this.#watchers[key];
	}

	/**
	 * @method clearAllState
	 * @description Wipes framework-related localStorage/sessionStorage entries
	 *				and optionally resets all active component instances.
	 *
	 * @param {boolean} [reboot=true]
	 */
	clearAllState(reboot = true) {
		const componentKeys = Object.keys(this.components);
		if (!componentKeys.length) return;

		const patterns	= componentKeys.join('|');
		const regex		= new RegExp(`^(${patterns})_`);

		[localStorage, sessionStorage].forEach(store => {
			for (let i = store.length - 1; i >= 0; i--) {
				const key = store.key(i);
				if (key && regex.test(key)) store.removeItem(key);
			}
		});

		if (reboot) {
			Object.values(this.instances).forEach(inst => {
				// Guard: only Component instances have reset()
				if (typeof inst.reset === 'function') inst.reset();
			});
		}
	}

	// =========================================================================
	// PUBLIC — PLUGIN SYSTEM
	// =========================================================================

	/**
	 * @method use
	 * @description Registers a plugin. Three plugin shapes are supported:
	 *
	 *   1. Class with .install(deck):	new plugin(deck, options) → install()
	 *   2. Factory function:			plugin(deck, options)
	 *   3. Plain object:				used as-is, attached by .name
	 *
	 * All plugins are auto-attached to deck by their name property.
	 *
	 * @param {Function|Object} plugin
	 * @param {Object}			[options={}]
	 * @returns {Deck} this — chainable
	 *
	 * @example
	 * // Class plugin
	 * deck.use(AnalyticsPlugin, { trackingId: 'UA-XXXX' });
	 *
	 * // Factory function plugin
	 * deck.use((deck) => { deck.track = () => {}; });
	 *
	 * // Object plugin with install
	 * deck.use({ name: 'myPlugin', install(deck) { deck.myMethod = () => {}; } });
	 */
	use(plugin, options = {}) {
		let instance;

		if (typeof plugin === 'function') {
			instance = (plugin.prototype?.constructor)
				? new plugin(this, options)		// Class → instantiate
				: plugin(this, options);		// Factory function → call
		} else {
			instance = plugin;
		}

		if (!instance) return this;

		// Vue-style .install hook
		if (typeof instance.install === 'function') {
			instance.install(this);
		}

		// Auto-attach by name
		const name = instance.name
			?? (instance.constructor?.name !== 'Object' ? instance.constructor?.name : null);

		if (name && !this[name.toLowerCase()]) {
			this[name.toLowerCase()] = instance;
		}

		// Let plugins register components directly
		if (typeof instance.registerComponents === 'function') {
			this.register(instance.registerComponents());
		}

		return this;
	}

	/** Convenience aliases for use() */
	plugin(p, opts) { return this.use(p, opts); }
	extend(p, opts) { return this.use(p, opts); }

	// =========================================================================
	// PUBLIC — NOTIFICATIONS
	// =========================================================================
	// Proxies to deck.ui.toast.show() for convenience.
	// deck.notify('Saved', 'success') works anywhere in the app.

	/** @param {...*} args - Same signature as ToastManager.show() */
	say(...args)	{ return this.ui.toast.show(...args); }
	notify(...args)	{ return this.ui.toast.show(...args); }
	toast(...args)	{ return this.ui.toast.show(...args); }

	// =========================================================================
	// PUBLIC — TOOLTIP PROXY
	// =========================================================================
	// Convenience accessor so deck.tooltip still works after the singleton
	// was moved to deck.ui.tooltip.

	get tooltip() { return this.ui?.tooltip ?? null; }

	// =========================================================================
	// PUBLIC — REMOTE SETTINGS
	// =========================================================================

	/**
	 * @method hydrate
	 * @description Fetches remote configuration from settings.settingsUrl and
	 *				merges it into this.settings. Useful for server-side config
	 *				without embedding sensitive values in HTML.
	 *
	 * @returns {Promise<void>}
	 */
	async hydrate() {
		if (!this.settings.settingsUrl) return;

		try {
			const response = await fetch(this.settings.settingsUrl, {
				headers: { 'X-Requested-With': 'DeckFramework' },
			});

			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const remoteConfig = await response.json();
			this.#mergeSettings(remoteConfig);

		} catch (err) {
			console.error('[Deck] Failed to load remote settings:', err);
		}
	}

	// =========================================================================
	// PRIVATE — INSTANCE REGISTRY
	// =========================================================================

	/**
	 * Registers a component instance in the global registry and maps it to its element.
	 * Uses a direct JS property (_dci) rather than dataset to avoid DOM mutations.
	 */
	#registerInstance(element, componentName, dci, instance) {
		this.instances[dci] = instance;
		element._dci = dci;

		if (!element.uiInstances) element.uiInstances = {};
		element.uiInstances[componentName] = dci;
	}

	/**
	 * Returns true if a component of the given name is already initialized on an element.
	 */
	#hasInstance(element, componentName) {
		return !!element.uiInstances?.[componentName];
	}

	// =========================================================================
	// PRIVATE — CLEANUP OBSERVER
	// =========================================================================

	/**
	 * Watches for removed DOM elements and calls destroy() on their component instances.
	 * Uses queueMicrotask to handle element re-parenting (moved elements are not destroyed).
	 */
	#initCleanupObserver() {
		const observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.removedNodes.forEach(node => {
					if (!(node instanceof HTMLElement)) return;

					queueMicrotask(() => {
						// Node was re-parented (moved in DOM) — not removed
						if (node.isConnected) return;

						const destroy = (el) => {
							const dci = el._dci;
							if (dci && this.instances[dci]) {
								this.instances[dci].destroy?.();
								delete this.instances[dci];
							}
						};

						destroy(node);

						// Walk all descendants efficiently
						const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
						while (walker.nextNode()) destroy(walker.currentNode);
					});
				});
			});
		});

		observer.observe(document.body, { childList: true, subtree: true });
	}

	// =========================================================================
	// PRIVATE — SETTINGS
	// =========================================================================

	#defaultSettings() {
		return {
			env:			'production',
			debug:			false,
			apiBase:		null,
			settingsUrl:	null,
			components: {
				lazy:		true,
				threshold:	0.1,
			},
		};
	}

	/**
	 * Shallow-merges new options into settings.
	 * Nested objects (like `components`) are also shallow-merged.
	 */
	#mergeSettings(newOptions) {
		if (!newOptions || typeof newOptions !== 'object') return;

		for (const key in newOptions) {
			if (
				typeof newOptions[key] === 'object' &&
				newOptions[key] !== null &&
				!Array.isArray(newOptions[key]) &&
				typeof this.settings[key] === 'object'
			) {
				// Nested object: shallow merge
				this.settings[key] = { ...this.settings[key], ...newOptions[key] };
			} else {
				this.settings[key] = newOptions[key];
			}
		}
	}
}

export default Deck;