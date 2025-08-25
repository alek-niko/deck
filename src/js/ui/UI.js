/**
 * @class UI
 * @classdesc
 */

import Sidebar from './Sidebar.js';
import Header from './Header.js';
import ThemeManager from './ThemeManager.js';

//import UserInput from './Input.v2.js';

export default class UI {

	#inputObserver;
	#initInputCharCounters;

	constructor() {
		
		this.html 		= document.documentElement
		this.body 		= document.body
		this.window 	= document.window
		this.$main 		= document.getElementById("main") 
		this.$sidebar 	= document.getElementById("sidebar") 
		this.$header 	= document.getElementById("header")
		this.$footer 	= document.getElementById("footer")
		this.$options	= document.getElementById('options')

		this.$loading	= document.querySelector('.loading');

		//this.userInput = new UserInput()

		// this.sidebar = new Sidebar()
		// this.header = new Header()

		this.#init()
	}

	#init() {

		this.#initHeader()
		this.#initSidebar()
		this.#initThemeManager()

		this.#initEvents()
		this.#initCardMinimizeEvents()
		this.#initCardCloseEvents()
		this.#initBgGradient()

		// temp
		this.#testLoading()
		
		this.#initAutosizeTextarea()
		this.#iniInputCharCounters()
		this.initInput()
		
		// Init custom Fabs
		this.initFabSpeedDials()
		this.initFabSheets()

		this.initAvatars();
		this.observeAvatarMutations();

		this.#fixPreCode();
	} 

	#initHeader() {
		const header = document.getElementById("header");
		if (!header) return;
		this.header = new Header()
	}

	#initSidebar() {
		const sidebar = document.querySelector("aside");
		if (!sidebar) return;

		if (sidebar.classList.contains("sidebar-secondary")) {
			this.sidebar = new Sidebar()
		}

		// temp - move to its own class
		if (sidebar.classList.contains("sidebar-main")) {

			const navItems = sidebar.querySelectorAll(".nav-item");
	
			const pathOnly = window.location.pathname.replace(/\/+$/, "").toLowerCase();
		
			navItems.forEach((item) => {
				const href = item.getAttribute("href")?.replace(/\/+$/, "").toLowerCase();
				if (href === pathOnly) {
					item.classList.add("active");
				} else {
					item.classList.remove("active");
				}
			});
		}
	}

	#initThemeManager() {
		console.log('init theme')
		this.theme = new ThemeManager();
	}

	// Temporary
	#testLoading() {
		// Show loading animation on page load
		window.addEventListener('load', () => {
			this.showLoadingAnimation()
			setTimeout(() => {
				this.hideLoadingAnimation()
			}, 1000)
		});
	}

	// Temporary
	/**
	 * @method showLoadingAnimation
	 * Displays the loading animation if the element exists.
	 */
	showLoadingAnimation() {
		if (this.$loading) {
			this.$loading.style.display = 'block';
		}
	}

	// Temporary
	/**
	 * @method hideLoadingAnimation
	 * Hides the loading animation if the element exists.
	 */
	hideLoadingAnimation() {
		if (this.$loading) {
			this.$loading.style.display = 'none';
		}
	}

	// Temporaray
	#fixPreCode() {

		/* OLD
			document.querySelectorAll('pre > code').forEach(codeEl => {
				// Get raw text content
				let text = codeEl.textContent;
				// Trim leading and trailing whitespace including newlines
				text = text.replace(/^\s+/, '').replace(/\s+$/, '');
				// Update the code element's text content
				codeEl.textContent = text;
			});
		*/

		document.querySelectorAll('pre > code').forEach(codeEl => {
			let lines = codeEl.textContent.split('\n');

			// Remove leading/trailing empty lines
			while (lines.length && lines[0].trim() === '') lines.shift();
			while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

			// Compute minimum indent (number of spaces/tabs before first non-whitespace char)
			let minIndent = lines.reduce((min, line) => {
				if (line.trim() === '') return min; // skip empty lines
				let match = line.match(/^(\s*)/);
				let indent = match ? match[1].length : 0;
				return min === null ? indent : Math.min(min, indent);
			}, null);

			// Remove minIndent from each line
			if (minIndent && minIndent > 0) {
				lines = lines.map(line => line.slice(minIndent));
			}

			codeEl.textContent = lines.join('\n');
		});

	}

	addClass (element, classNames) {
		if (!element || !classNames) return;	

		classNames = classNames ? classNames.split(' ') : [];
		element.classList.add(...classNames);
	}
	
	removeClass = (element, classNames) => {
		if (!element || !classNames) return;

		classNames = classNames ? classNames.split(' ') : [];
		element.classList.remove(...classNames);
	}

	toggleClass = (el, ...cls) => cls.map(cl => el.classList.toggle(cl))

	getElement = (selector, context = document) => {
		if (selector instanceof HTMLElement) {
			return selector;
		}
		return typeof selector === 'string' 
			? context.querySelector(selector) 
			: null;
	}

	getElements = (selector, context = document) => {
		if (selector instanceof NodeList) {
			return selector;
		}
	
		return typeof selector === 'string'
			? context.querySelectorAll(selector)
			: null;
	}

	showElement (element, display = 'inherit') {
		if (!element) return;

		element.style.display = display;
	}
	
	hideElement (element, display = 'none'){
		if (!element) return;
		element.style.display = display;
	}

	isVisible (element) {
		return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
	}

	setAttributes(element, attributes) {
		if (!element) return;

		Object.keys(attributes).forEach(key => element.setAttribute(key, attributes[key]));
	}

	removeAttributes(element, ...attributes) {
		if (!element) return;

		attributes.forEach(attribute => element.removeAttribute(attribute))
	}

	setStyle (element, styles = {})  {
		if (!element) return;
	
		for (const styleName in styles) {
			element.style[styleName] = styles[styleName];
		}
	}

	setTheme (theme = 'dark') {
		document.documentElement.classList.add(theme);
	}

	removeTheme (theme = 'dark') {
		document.documentElement.classList.remove(theme);
	}

	removeElement(element, delay) {
		delay
			? setTimeout(function () { element.remove()}, delay)
			: element.remove();
	}

	
	#initEvents() {

		// touch detect
		window.addEventListener('touchstart', function onFirstTouch () {
			document.body.classList.add('touch-device');
			window.TOUCH_DETECTED = true;
			// $body.dispatchEvent('touch-detected', true);
			window.removeEventListener('touchstart', onFirstTouch, false);
		}, false);

		document.body.addEventListener('click', event => { 
			if ( event.target.classList.contains('dropdown-close')) {
				UIkit.dropdown($(event.target).closest('.dropdown')).hide();
			}
			if (event.target.matches('a[href="#"]')) {
				event.preventDefault();
			}
		})

		document.body
			.addEventListener("focus", (event) => {
				if (event.target.matches('[data-input]')) {
					event.target
						.closest('.input-wrapper')
						.classList.add('input-focus');
				}
			},true,);

		document.body
			.addEventListener("blur", (event) => {
				if (event.target.matches('[data-input]')) {
					let $element = event.target;
					$element
						.closest('.input-wrapper')
						.classList.remove('input-focus');

					if (!$element.classList.contains('label-fixed')) {
						if ($element.value !== '') {
							$element
								.closest('.input-wrapper')
								.classList.add('input-filled')
						} else {
							$element
								.closest('.input-wrapper')
								.classList.remove('input-filled')
						}
					}
				}
			}, true,);

		document.body
			.addEventListener('input', (event) => {
				if (event.target.matches('[data-input]')) {
					let $input = event.target;
					if (!$input.classList.contains('label-fixed')) {
						if ($input.value !== '') {
							$input
								.closest('.input-wrapper')
								.classList.add('input-filled')
						} else {
							$input
								.closest('.input-wrapper')
								.classList.remove('input-filled')
						}
					}
					this.#inputUpdate($input);
				}
			}, true,);

		// Temporary copy to clipboard code. Framework preview only. REMOVE !

		document.addEventListener('DOMContentLoaded', () => {
			// Check if there's at least one .code-tab on the page
			if (document.querySelector('.code-tab')) {
				document.body.addEventListener('click', (event) => {
					// Check if the clicked element is an <a> or an <svg> inside an <a> within a .code-tab
					const target = event.target;
					const link = target.closest('.code-tab > .iconnav > li > a');

					if (link) {
						// Find the closest .code-tab parent
						const codeTab = link.closest('.code-tab');

						if (codeTab) {
							// Find the first <div> inside .tab-content within this specific .code-tab
							const firstTabContent = codeTab.querySelector('.tab-content > div:first-child');

							if (firstTabContent) {
								// Get the HTML content
								const contentToCopy = firstTabContent.innerHTML.trim();

								// Copy to clipboard
								navigator.clipboard.writeText(contentToCopy)
									.then(() => {
										//alert('HTML content copied to clipboard.');
										Deck.say('HTML content copied to clipboard.', 'primary')
										//console.log('HTML content copied to clipboard:', contentToCopy);
									})
									.catch((err) => {
										console.error('Failed to copy HTML content:', err);
									});
							}
						}
					}
				});
			}
		});
	}


	// #initEvents() {
	// 	// Touch detect
	// 	window.addEventListener('touchstart', function onFirstTouch() {
	// 		document.body.classList.add('touch-device');
	// 		window.TOUCH_DETECTED = true;
	// 		window.removeEventListener('touchstart', onFirstTouch, false);
	// 	}, false);
	
	// 	// Close dropdown on click
	// 	document.body.addEventListener('click', event => {
	// 		if (event.target.classList.contains('dropdown-close')) {
	// 			UIkit.dropdown($(event.target).closest('.dropdown')).hide();
	// 		}
	// 		if (event.target.matches('a[href="#"]')) {
	// 			event.preventDefault();
	// 		}
	// 	});
	
	// 	// Add focus and filled classes on input focus
	// 	document.body.addEventListener("focus", event => {
	// 		if (event.target.matches('[data-input]')) {
	// 			event.target.closest('.input-wrapper').classList.add('input-focus');
	// 		}
	// 	}, true);
	
	// 	// Remove focus and filled classes on input blur
	// 	document.body.addEventListener("blur", event => {
	// 		if (event.target.matches('[data-input]')) {
	// 			const input = event.target;
	// 			const wrapper = input.closest('.input-wrapper');
	// 			wrapper.classList.remove('input-focus');
	// 			if (!input.classList.contains('label-fixed')) {
	// 				input.value !== '' ? wrapper.classList.add('input-filled') : wrapper.classList.remove('input-filled');
	// 			}
	// 		}
	// 	}, true);
	
	// 	// Add or remove filled class on input change
	// 	document.body.addEventListener('input', event => {
	// 		if (event.target.matches('[data-input]')) {
	// 			const input = event.target;
	// 			const wrapper = input.closest('.input-wrapper');
	// 			if (!input.classList.contains('label-fixed')) {
	// 				input.value !== '' ? wrapper.classList.add('input-filled') : wrapper.classList.remove('input-filled');
	// 			}
	// 			this.#inputUpdate(input);
	// 		}
	// 	}, true);
	// }
	
	preloader($element, ratio, color) {
		if (!$element) return
		$element.innerHTML = '<div class="' + (color || '') + ' flex flex-center flex-middle height-1-1 animation-fade js-preloader width-1-1" data-spinner="ratio: ' + (ratio || 2) + '"></div>';
	}

	frameYoutube(video, height='300px', width='100%') {

		var iframe = document.createElement("iframe");

		iframe.src = `https://www.youtube.com/embed/${video}`;
		iframe.width = height;
		iframe.height = width;
		iframe.frameborder = "0";
		iframe.allowfullscreent = "1"

		return iframe
	}

	maxWidth(media) {
		switch(media) {
			case 'smallMax': return window.matchMedia('(max-width: 959px)').matches; break;
			case 'mediumMin': return window.matchMedia('(min-width: 960px)').matches; break;
			case 'mediumMax': return window.matchMedia('(max-width: 1199px)').matches; break;
			case 'largeMin': return window.matchMedia('(min-width: 1200px)').matches; break;
			case 'largeMax': return window.matchMedia('(max-width: 1599px)').matches; break;
			case 'xlargeMin': return window.matchMedia('(min-width: 1600px)').matches; break;
		}
	}

	spinnerShow(css, element, ratio, color) {
		var $element = element || document.body;
		var spinner = css
						? '<div class="spinner"></div>' 
						: '<div class="' + (color || 'md-color-light-blue-500') + '" spinner="ratio: ' + (ratio || 1) + '"></div>';
		var fixed = ($element === document.body) ? ' fixed' : '';

		$element.insertAdjacentHTML(
			'beforeend',
			`<div class="spinner-overlay ${fixed}">${spinner}</div>`
		)
		setTimeout(function () {
			document.querySelector('.spinner-overlay').classList.add('enter');
		}, 50)
	}

	spinnerHide() {
		var $spinner = document.querySelector('.spinner-overlay');
		if (!$spinner) return
		$spinner.classList.remove('enter');
		setTimeout(function () {
			$spinner.remove();
		}, 300)
	}

	dim(parent = document.body, animate, offset) {
		const offsetTop = offset ? `style="top:${offset}px"` : '';
		const overlayHTML = `<div class="overlay" ${offsetTop}></div>`;
		
		parent.insertAdjacentHTML('beforeend', overlayHTML);
		
		if (animate) {
			setTimeout(() => {
				parent.querySelector('.overlay')?.classList.add('dimmed');
			}, 10);
		} else {
			parent.querySelector('.overlay').classList.add('dimmed');
		}
	}

	undim(parent = document.body, animate) {
		const $overlay = parent.querySelector('.overlay');
		if (animate) {
			$overlay.classList.remove('dimmed');
			setTimeout(() => $overlay.remove(), 280);
		} else {
			$overlay.remove();
		}
	}

	hideDuringTransform($element, delay = 280, elExcluded) {
		$element.classList.add('js-el-transform');
		if (elExcluded) {
			$element.querySelector(elExcluded)?.classList.add('js-el-transform-visible');
		}
		setTimeout(() => {
			$element.classList.remove('js-el-transform');
			if (elExcluded) {
				$element.querySelector(elExcluded)?.classList.remove('js-el-transform-visible');
			}
		}, delay);
	}

	#initBgGradient() {
		const elements = document.querySelectorAll('[data-bg-gradient]');
		elements.forEach(element => {
			const [color1, color2] = element.getAttribute('data-bg-gradient').split(',');
			Object.assign(element.style, {
				backgroundColor: color2,
				backgroundImage: `linear-gradient(135deg, ${color1} 10%, ${color2} 100%)`
			});
		});
	}

	initInput(parent = document) {
		const inputs = parent.querySelectorAll('[data-input]');
		
		inputs.forEach(input => {
			if (!input.parentNode.classList.contains('input-wrapper')) {
				// Wrap
				const wrapper = document.createElement('div');
				wrapper.classList.add('input-wrapper');
				input.parentNode.insertBefore(wrapper, input);
				wrapper.appendChild(input);
	
				// Test
				if (input.dataset.input === 'outline') {
					input.classList.add(input.tagName.toLowerCase() === 'input' ? 'input-outline' : 'textarea-outline');
				}
	
				// Add outline or span
				if (input.classList.contains('input-outline') || input.classList.contains('textarea-outline')) {
					wrapper.classList.add('input-wrapper-outline');
				} else {
					const span = document.createElement('span');
					span.classList.add('input-bar');
					input.after(span);
				}
	
				// Set label
				Array.from(input.parentNode.parentNode.children).forEach(sibling => {
					if (sibling !== input && sibling.tagName.toLowerCase() === 'label') {
						wrapper.prepend(sibling);
					}
				});
			}
			this.#inputUpdate(input);
		});
	}
	
	#inputUpdate(input) {
		const inputGroup = input.closest('.input-group');
		const inputWrapper = input.closest('.input-wrapper');
	
		inputGroup?.classList.remove('input-group-danger', 'input-group-success');
		inputWrapper?.classList.remove('input-wrapper-danger', 'input-wrapper-success', 'input-wrapper-disabled');
	
		if (input.classList.contains('form-danger')) {
			inputGroup?.classList.add('input-group-danger');
			inputWrapper.classList.add('input-wrapper-danger');
		}
		if (input.classList.contains('form-success')) {
			inputGroup?.classList.add('input-group-success');
			inputWrapper.classList.add('input-wrapper-success');
		}
		if (input.disabled) {
			inputWrapper.classList.add('md-input-wrapper-disabled');
		}
		if (input.value !== '') {
			inputWrapper.classList.add('input-filled');
		} else {
			inputWrapper.classList.remove('input-filled');
		}
		if (input.classList.contains('label-fixed')) {
			inputWrapper.classList.add('input-filled');
		}
	}

	inputDisableSubmit(inputs) {
		inputs.forEach(input => {
			input.addEventListener('keyup', event => {
				if (event.key === 'Enter') {
					event.preventDefault();
				}
			});
		});
	}

	#iniInputCharCounters() {

		const inputs = document.querySelectorAll("input[maxlength], textarea[maxlength]");

		inputs.forEach(input => {
			const maxLength = parseInt(input.getAttribute("maxlength"), 10);
			if (!maxLength) return;

			let counter = null;

			// 1. Check if input has a data-counter-id attribute
			const counterId = input.getAttribute("data-counter-id");
			if (counterId) {
				counter = document.getElementById(counterId);
			}

			// 2. Else, check if the next sibling has the char-counter class
			if (!counter) {
				const next = input.nextElementSibling;
				if (next && next.classList.contains("char-counter")) {
					counter = next;
				}
			}

			// 3. If a counter element is found, set up the listener
			if (counter) {
				const form = input.closest("form");
				const submit = form?.querySelector("button[type=submit]");

				const updateCount = () => {
					const length = input.value.trim().length;
					counter.textContent = `${length} / ${maxLength}`;

					if (submit) {
						submit.disabled = length > maxLength;
					}
				};

				input.addEventListener("input", updateCount);
				updateCount(); // Initialize
			}
		});
	}

	#initAutosizeTextarea(){
		const textareas = document.querySelectorAll("textarea.autosize");

		textareas.forEach(textarea => {
		  const resize = () => {
			textarea.style.height = "auto"; // Reset the height
			textarea.style.height = textarea.scrollHeight + "px"; // Set to scrollHeight
		  };
	  
		  textarea.addEventListener("input", resize);
		  resize(); // Resize on load in case there's prefilled content
		});
	}
	
	initFabSpeedDials() {

		const animDuration = 40;
		const triggers = document.querySelectorAll('.fab-speed-dial > .fab');

		const animationDelay = (fabs, reverse) => {
			const length = fabs.length - 1;
			Array.from(fabs).forEach((fab, index) => {
				const delay = reverse
					? (length - index) * (animDuration / 2.2)
					: index * (animDuration / 2.2);
				fab.style.animationDelay = `${delay}ms`;
			});
		};

		const animIn = (speedDial) => {
			speedDial.classList.remove('animOut');
			speedDial.classList.add('fab-speed-dial-active', 'animIn');
		};

		const animOut = (speedDial, fabLength) => {
			speedDial.classList.remove('animIn');
			speedDial.classList.add('animOut');
			setTimeout(() => {
				speedDial.classList.remove('fab-speed-dial-active', 'animOut');
			}, animDuration * fabLength);
		};

		triggers.forEach(fab => {
			const speedDial = fab.closest('.fab-speed-dial');
			const wrapper = speedDial.querySelector('.fab-wrapper-inner');
			if (!wrapper) return;

			const children = wrapper.children;
			let config = speedDial.getAttribute('data-fab');
			if (config) {
				try {
					config = JSON.parse(config);

					if (config.horizontal) {
						speedDial.classList.add('fab-speed-dial-horizontal');
					}

					if (config.hover) {
						let leaveTimer;

						fab.addEventListener('mouseenter', () => {
							clearTimeout(leaveTimer);
							animationDelay(children);
							animIn(speedDial);
						});

						speedDial.addEventListener('mouseleave', () => {
							animationDelay(children, true);
							animOut(speedDial, children.length);
							leaveTimer = setTimeout(() => {
								speedDial.classList.remove('fab-speed-dial-active', 'animOut');
							}, animDuration * children.length);
						});

						return;
					}
				} catch (err) {
					console.warn('Invalid data-fab JSON:', config);
				}
			}

			fab.addEventListener('click', () => {
				const isActive = speedDial.classList.contains('fab-speed-dial-active');
				animationDelay(children, isActive);
				isActive ? animOut(speedDial, children.length) : animIn(speedDial);
			});
		});
	}

	initFabSheets() {
		const sheets = document.querySelectorAll('.fab-sheet');

		sheets.forEach(fab => {
			const trigger = fab.querySelector('.fab-sheet-trigger');
			const actions = fab.querySelector('.fab-sheet-actions');

			if (!trigger || !actions) return;

			trigger.addEventListener('click', (e) => {
				e.stopPropagation(); // prevent window click from firing immediately
				const childrenLength = actions.children.length;
				fab.classList.add('fab-animated');
				setTimeout(() => {
					fab.style.width = '200px';
					fab.style.height = `${childrenLength * 40 + 8}px`;
				}, 140);
				setTimeout(() => {
					fab.classList.add('fab-active');
				}, 280);
			});

			window.addEventListener('click', event => {
				if (!event.target.closest('.fab-sheet')) {
					fab.style.width = '';
					fab.style.height = '';
					fab.classList.remove('fab-active');
					setTimeout(() => {
						fab.classList.remove('fab-animated');
					}, 140);
				}
			});
		});
	}


	cardContentHide(element, preloader) {
		const card = element.closest('.card');
		if (!card.classList.contains('card-hidden')) {
			card.classList.add('card-hidden');
			if (preloader) {
				card.insertAdjacentHTML('beforeend', '<div data-spinner="ratio: 2"></div>');
			}
		}
	}

	cardContentShow(element, preloader) {
		const card = element.closest('.card');
		if (card.classList.contains('card-hidden')) {
			card.classList.remove('card-hidden');
			if (preloader) {
				const spinner = card.querySelector('[data-spinner]');
				spinner?.remove();
			}
		}
	}

	#initCardMinimizeEvents() {
		const toggles = document.querySelectorAll(".js-card-toggle");
		if (!toggles.length) return;
	
		toggles.forEach(toggle => {
			toggle.addEventListener('click', () => {
				const card = toggle.closest('.card');
				const content = card.querySelector('.card-content');
				if (!card.classList.contains('card-minimized')) {
					card.classList.add('card-minimized');
					toggle.classList.toggle('window-minimize');
					toggle.classList.toggle('window-maximize');
					this.slideUp(content, 880);
				} else {
					this.slideDown(content, 880);
					card.classList.remove('card-minimized');
					toggle.classList.toggle('window-minimize');
					toggle.classList.toggle('window-maximize');
				}
			});
		});
	
		const cardsMinimized = document.querySelectorAll(".card-minimized");
		if (!cardsMinimized.length) return;
	
		cardsMinimized.forEach(card => {
			const toggle = card.querySelector('.js-card-toggle');
			const content = card.querySelector('.card-content');
			content.style.display = 'none';
			toggle.classList.toggle('window-minimize');
			toggle.classList.toggle('window-maximize');
		});
	}

	#initCardCloseEvents() {
		document.body.addEventListener('click', event => {
			if (event.target.matches('.js-card-close')) {
				const card = event.target.closest('.card');
				card.classList.add('animation-scale-up', 'animation-reverse');
				card.addEventListener('animationend', () => {
					this.elementRemove(card, 100);
				}, { once: true });
			}
		}, true);
	}

	initAvatars(target = null) {
		const avatars = target
			? (target instanceof Element ? [target] : Array.from(target))
			: document.querySelectorAll('.avatar');
	
		avatars.forEach(avatar => {
			if (avatar.dataset.initialized === 'true') return;
			avatar.dataset.initialized = 'true';
	
			const img = avatar.querySelector('.avatar-image');
			const initials = avatar.querySelector('.avatar-initials');
	
			if (img && initials) {
				img.onerror = () => {
					img.style.display = 'none';
					initials.style.display = 'flex';
					// Restore fallback background color only if not manually overridden
					if (!avatar.style.getPropertyValue('--avatar-bg')) {
						//avatar.style.setProperty('--avatar-bg', '#f5f5f5');
					}
				};
	
				// Check if image loads correctly
				if (img.complete && img.naturalWidth !== 0) {
					initials.style.display = 'none';
					avatar.style.setProperty('--avatar-bg', 'transparent');
				} else {
					img.style.display = 'none';
					initials.style.display = 'flex';
					if (!avatar.style.getPropertyValue('--avatar-bg')) {
						//avatar.style.setProperty('--avatar-bg', '#f5f5f5');
					}
				}
			}
	
			// Auto contrast for initials only, if text color not already set
			if ((!img || img.style.display === 'none') && !avatar.style.getPropertyValue('--avatar-color')) {
				const bg = getComputedStyle(avatar).getPropertyValue('--avatar-bg').trim();
				const rgb = this.hexToRgb(bg);
				if (rgb) {
					const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
					const textColor = luminance > 186 ? 'black' : 'white';
					avatar.style.setProperty('--avatar-color', textColor);
				}
			}
		});
	}
	
	observeAvatarMutations() {
		const observer = new MutationObserver(mutations => {
			for (const { addedNodes } of mutations) {
				for (const node of addedNodes) {
					if (!(node instanceof HTMLElement)) continue;

					if (node.classList.contains('avatar')) {
						this.initAvatars(node);
					} else {
						const avatars = node.querySelectorAll?.('.avatar');
						if (avatars?.length) this.initAvatars(avatars);
					}
				}
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	hexToRgb(hex) {
		hex = hex.replace('#', '');
		if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
		const int = parseInt(hex, 16);
		if (isNaN(int)) return null;
		return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
	}
}