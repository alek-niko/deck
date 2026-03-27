/**
 * @module js.modules.index
 * @description Manifest for Deck UI modules.
 * 
 * This file acts as the bridge between core components and custom extensions.
 * 
 * REGISTRATION PATTERNS:
 * 	1. Bundled:  'my-component': MyClass (Inlines code into deck.min.js)
 * 	2. Lazy:     'my-component': () => import('./my.component.js') (Creates a separate file)
 */

// import MyComponent from "./my.component.js";

export default {
	/** * Example:
	 * 'status-feed': () => import('./status.feed.js'),
	 * 'profile-card': MyComponent 
	 */
};