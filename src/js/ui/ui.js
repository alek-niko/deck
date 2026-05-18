/**
 * =============================================================================
 * UI
 * @module js.ui
 * -----------------------------------------------------------------------------
 * Visual/DOM subsystem. Owns and initializes every manager that touches the
 * page - notifications, toggles, tooltips, lightbox, navigation, sidebars,
 * header, spinners, and progress indicators.
 *
 * Instantiated by Deck as this.ui = new UI(this).
 * All managers receive the deck reference for state and event access where needed.
 *
 * Architecture note:
 *   UI owns visual managers.  Deck owns application concerns (state, components,
 *   plugins, WebSocket). This separation keeps each class focused and testable.
 *
 *   deck.ui.toast.show(...)	- toast notifications
 *   deck.ui.tooltip.show(...)	- tooltip control
 *   deck.ui.toggles			- toggle manager
 *   deck.ui.lightbox			- lightbox manager
 *   deck.ui.sidebarMain		- primary sidebar (if present)
 *   deck.ui.sidebarSecondary	- secondary sidebar (if present)
 *   deck.ui.header				- header (if present)
 * =============================================================================
 */

import Header				from './header.js';
import SidebarMain			from './sidebar.main.js';
import SidebarSecondary		from './sidebar.secondary.js';
import ThemeManager			from './theme.manager.js';
import FormManager			from './form.manager.js';
import NavManager			from './nav.manager.js';
import FabManager			from './fab.manager.js';
import ToggleManager		from './toggle.manager.js';
import LightboxManager		from './lightbox.manager.js';
import ToastManager			from './toast.manager.js';
import TooltipManager		from './tooltip.manager.js';
import Spinner				from './spinner.js';
import Progress				from './progress.js';
import { DomUtils }			from './helpers.js';

class UI {

	// ── Private Fields ───────────────────────────────────────────────────────
    #overlays = new Set();

	/**
	 * @param {Deck} deck - The Deck instance. Passed down to managers that need it.
	 */
	constructor(deck) {

		// Store deck reference — managers that need state/events use this
		this.deck = deck;

		// ── Cached element references ─────────────────────────────────────────
		this.$el = {
			html:				document.documentElement,
			body:				document.body,
			main:				document.querySelector('main'),
			header:				document.querySelector('header'),
			aside:				document.querySelector('aside'),
			loading:			document.querySelector('.loading'),
		};

		// ── Visual managers ───────────────────────────────────────────────────
		this.theme				= new ThemeManager();
		this.forms				= new FormManager(this);
		this.fabs				= new FabManager(this);
		this.navs				= new NavManager(this);
		this.toggles			= new ToggleManager(this);
		this.lightbox			= new LightboxManager(this);
		this.toast				= new ToastManager(this);
		this.tooltip			= new TooltipManager(this);

		// ── Global utilities ──────────────────────────────────────────────────
		this.spinner			= new Spinner(this);
		this.progress			= new Progress(this);

		// ── Layout and sidebar/header references (set by #initLayout) ─────────
		this.header				= null;
		this.sidebarMain		= null;
		this.sidebarSecondary	= null;

		this.#init();
	}

	// =========================================================================
	// PRIVATE FIELDS
	// =========================================================================

	/** Active overlay elements — prevents stacking multiple dimmers. */
	#overlays = new Set();

	// =========================================================================
	// PRIVATE — INIT
	// =========================================================================

	#init() {
		this.#initLayout();
		this.forms.init();
		this.fabs.init();
		this.#initCards();
		this.#initAvatars();
		DomUtils.fixPreCode();
		this.#initInputDetection();
		this.#initGlobalEvents();
		this.#initClipboardUtility();
	}

	/**
	 * Initializes layout components — header and sidebars.
	 * Each is detected by presence in the DOM. Safe to call on pages
	 * where none of them exist.
	 * @private
	 */
	#initLayout() {

		// ── Header ────────────────────────────────────────────────────────────
		const headerEl = document.getElementById('header');
		if (headerEl) {
			this.header = new Header(headerEl);
		}

		// ── Sidebar Main ──────────────────────────────────────────────────────
		// Deck fixed navigation. Collapsed/drawer behavior.
		if (document.querySelector('.sidebar-main')) {
			this.sidebarMain = new SidebarMain('.sidebar-main', '#sidebar-main-toggle');
		}

		// ── Sidebar Secondary ─────────────────────────────────────────────────
		// Flexible nav sidebar with submenus. Drawer on mobile.
		const sidebarSecEl = document.querySelector('.sidebar-secondary');
		if (sidebarSecEl) {
			this.sidebarSecondary = new SidebarSecondary(
				'.sidebar-secondary',
				'#sidebar-toggle',
				{ responsiveBreakpoint: 1280 }
			);
		}

		// ── Sidebar Right ─────────────────────────────────────────────────────
		// CSS-only sticky column. Driven by ToggleManager — no class needed.
	}

	/**
	 * Delegated card minimize/close behavior.
	 *	.js-card-toggle → minimize/expand .card-content via slideUp/slideDown
	 *	.js-card-close  → animate then remove the card
	 * @private
	 */
	#initCards() {
		this.$el.body.addEventListener('click', event => {

			const toggle = event.target.closest('.js-card-toggle');
			if (toggle) {
				const card		= toggle.closest('.card');
				const content	= card?.querySelector('.card-content');
				if (!card || !content) return;

				const isMin = card.classList.toggle('card-minimized');
				toggle.classList.toggle('window-minimize', !isMin);
				toggle.classList.toggle('window-maximize',  isMin);

				isMin
					? DomUtils.slideUp(content)
					: DomUtils.slideDown(content);
			}

			const close = event.target.closest('.js-card-close');
			if (close) {
				const card = close.closest('.card');
				if (!card) return;
				card.classList.add('animation-scale-up', 'animation-reverse');
				card.addEventListener('animationend', () => card.remove(), { once: true });
			}
		});
	}

	/**
	 * Avatar image-to-initials fallback.
	 * If .avatar-image fails to load, it hides and shows .avatar-initials.
	 * Uses data-avatar-init to prevent re-processing on reinit calls.
	 * @param {Document|HTMLElement} [root=document]
	 * @private
	 */
	#initAvatars(root = document) {
		root.querySelectorAll('.avatar:not([data-avatar-init])').forEach(avatar => {
			avatar.setAttribute('data-avatar-init', '');

			const img      = avatar.querySelector('.avatar-image');
			const initials = avatar.querySelector('.avatar-initials');
			if (!img || !initials) return;

			img.addEventListener('error', () => {
				img.style.display      = 'none';
				initials.style.display = 'flex';
			}, { once: true });
		});
	}

	/**
	 * Distinguishes between touch and mouse input for hybrid devices.
	 * Adds .is-touch-primary on load for touch-primary devices,
	 * and .touch-device on first actual touchstart event.
	 * @private
	 */
	#initInputDetection() {
		if (!window.matchMedia('(hover: hover)').matches) {
			this.$el.body.classList.add('is-touch-primary');
		}

		const onFirstTouch = () => {
			this.$el.body.classList.add('touch-device');
			window.TOUCH_DETECTED = true;
			window.removeEventListener('touchstart', onFirstTouch, { passive: true });
		};

		window.addEventListener('touchstart', onFirstTouch, { passive: true });
	}

	/**
	 * Global delegated event listeners for patterns used across the app.
	 * @private
	 */
	#initGlobalEvents() {
		this.$el.body.addEventListener('click', event => {
			const { target } = event;

			// ── Dropdown close button ─────────────────────────────────────────
			const closeBtn = target.closest('.dropdown-close');
			if (closeBtn) {
				const dropdown = closeBtn.closest('.dropdown');
				if (dropdown) {
					const instance = this.deck?.getInstance(dropdown);
					instance?.close();
				}
			}

			// ── Prevent empty hash jumps ──────────────────────────────────────
			if (target.matches('a[href="#"]')) {
				event.preventDefault();
			}

			// ── Generic dismiss pattern ───────────────────────────────────────
			// data-dismiss="#selector" removes the target element.
			// data-dismiss (no value) removes the trigger's parent.
			const dismissTrigger = target.closest('[data-dismiss]');
			if (dismissTrigger) {
				const selector = dismissTrigger.getAttribute('data-dismiss');
				const targetEl = selector
					? document.querySelector(selector)
					: dismissTrigger.parentElement;
				targetEl?.remove();
			}
		});
	}

	/**
	 * Clipboard utility for framework documentation preview.
	 * Copies code content from .code-tab components.
	 * Only activates if any .code-tab exists on the page.
	 * @private
	 */
	#initClipboardUtility() {
		if (!document.querySelector('.code-tab')) return;

		this.$el.body.addEventListener('click', event => {
			const copyBtn = event.target.closest('.code-tab .iconnav a');
			if (!copyBtn) return;

			event.preventDefault();

			const codeTab = copyBtn.closest('.code-tab');
			const source  = codeTab?.querySelector('.tab-content .active, .tab-content div:first-child');
			if (!source) return;

			const text = source.innerText || source.textContent;

			navigator.clipboard.writeText(text.trim())
				.then(() => {
					this.deck?.notify('Code copied to clipboard.', 'success');
				})
				.catch(err => console.error('[UI] Clipboard error:', err));
		});
	}

	// =========================================================================
	// PUBLIC API PROXIES
	// =========================================================================
	// Convenience methods that delegate to ComponentManager.
	// Allows deck.ui.dim() to work directly.

	/**
	 * @method dim
	 * @description Creates a dimming overlay on a parent element.
	 *				Prevents stacking — safe to call repeatedly.
	 *
	 * @param {HTMLElement}	[parent=this.$el.body]
	 * @param {boolean}		[animate=true]
	 * @returns {HTMLElement|undefined} Overlay element, or undefined if already present.
	 */
	dim(parent = this.$el.body, animate = true) {
		if (parent.querySelector(':scope > .overlay.js-dimmer')) return;

		const overlay		= document.createElement('div');
		overlay.className	= 'overlay js-dimmer overlay-primary';
		parent.appendChild(overlay);

		void overlay.offsetHeight; // Force reflow for transition start

		if (!animate) overlay.style.transition = 'none';
		overlay.classList.add('dimmed');

		this.#overlays.add(overlay);
		return overlay;
	}

	/**
	 * @method undim
	 * @description Removes the dimming overlay from a parent element.
	 *				Waits for CSS transition to complete before removal.
	 *
	 * @param {HTMLElement} [parent=this.$el.body]
	 */
	undim(parent = this.$el.body) {
		const overlay = parent.querySelector(':scope > .overlay.js-dimmer');
		if (!overlay) return;

		overlay.classList.remove('dimmed');

		const cleanup = () => {
			overlay.remove();
			this.#overlays.delete(overlay);
		};

		const duration = window.getComputedStyle(overlay).transitionDuration;
		if (!duration || duration === '0s') {
			cleanup();
		} else {
			overlay.addEventListener('transitionend', cleanup, { once: true });
		}
	}

	// =========================================================================
	// PUBLIC — REINIT HELPERS
	// =========================================================================

	/**
	 * @method initAvatars
	 * @description Re-runs avatar fallback for newly injected content.
	 * @param {Document|HTMLElement} [root=document]
	 */
	initAvatars(root = document) {
		this.#initAvatars(root);
	}
}

export default UI;