/**
 * @module main
 * @description Entry point for prototyping and development builds. Imports core components
 * and initializes a global `Deck` instance, automatically registering and loading UI components
 * once the DOM content is fully loaded.
 */

// Core
import Deck  from './core/deck.js';

// Components
import Accordion from './components/accordion.js';
import Modal from './components/modal.js';
import Tab from './components/tab.js';
import Nav from './components/nav.js';
import Drop from './components/drop.js';
import Lightbox from './components/lightbox.js';
import Offcanvas from './components/offcanvas.js';
import Feed from "./components/feed.js";
import Wire from './components/wire.js';
import Toggle from './components/toggle.js';
import Drilldown from './components/drilldown.js';
import Uploader from './components/uploader.js';
import User from './components/user.js';

/**
 * @global
 * @description Creates a new instance of the Deck class and attaches it to the global `window` object.
 */
window.Deck = new Deck()

/**
 * Registers various components with the Deck instance.
 * 
 * @function
 * @name registerComponents
 */

window.Deck.register({
        'accordion': Accordion,
        'modal': Modal,
        'tab': Tab,
        'nav': Nav,
        'drop': Drop,
        'dropdown': Drop,
        'lightbox': Lightbox,
        'offcanvas': Offcanvas,
        'feed': Feed,
        'wire': Wire,
        'toggle': Toggle,
        'drilldown': Drilldown,
        'uploader': Uploader,
        'user': User
});

/**
 * Sets up an event listener for the `DOMContentLoaded` event. Once the DOM is fully loaded,
 * it calls the `autoload` method of the Deck instance to automatically initialize registered components.
 * 
 * @event
 * @name DOMContentLoaded
 * @type {Event}
 */

window.addEventListener('DOMContentLoaded', () => {
    window.Deck.autoload();
});