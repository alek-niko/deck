/**
 * Main Deck JS.
 * 
 * Description: This script is intended for prototyping and development builds only.
 * It imports various components and initializes a global `Deck` instance. The instance
 * is used to register different UI components and automatically load them once the DOM content is fully loaded.
 * 
 * @module main
 */

// Deck
import Deck  from './core/Deck.js';

// Components
import Accordion from './components/Accordion.js';
import Modal from './components/Modal.js';
import Tab from './components/Tab.js';
import Nav from './components/Nav.js';
import Drop from './components/Drop.js';
import Lightbox from './components/Lightbox.js';
import Offcanvas from './components/Offcanvas.js';
import Feed from "./components/Feed.js";
import Wire from './components/Wire.js';
import Toggle from './components/Toggle.js';
import Drilldown from './components/Drilldown.js';
import Uploader from './components/Uploader.js';
import User from './components/User.js';
/**
 * Creates a new instance of the Deck class and attaches it to the global `window` object.
 * 
 * @global
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