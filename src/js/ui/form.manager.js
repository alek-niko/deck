/**
 * @module js.ui.form.manager
 * @description Manages form input enhancements:
 *  			- Floating / outline label styles via wrapper + state classes
 * 				- Auto-resizing textareas
 * 				- Live character counters with submit button disabling
 * 				- Focus / filled / error / success visual states
 */

export default class FormManager {

	constructor(ui) {
		this.ui = ui;
	}

	init() {
		this.initInputs();
		this.initAutosizeTextareas();
		this.initCharCounters();
		this.#bindEvents();
	}

	/**
	 * Wraps inputs/textareas marked with data-input attribute
	 * and prepares them for floating-label / outline styling.
	 *
	 * @param {Document|HTMLElement} [parent=document] - Scope to search for inputs
	 */
	initInputs(parent = document) {
		
		parent.querySelectorAll('[data-input]').forEach(input => {
			// Prevent double-wrapping
			if (input.parentNode.classList.contains('input-wrapper')) return;

			const wrapper = document.createElement('div');
			wrapper.className = 'input-wrapper';
			
			// Outline variant (Material Design / modern look)
			if (input.dataset.input === 'outline') {
				wrapper.classList.add('input-wrapper-outline');
				input.classList.add(input.tagName === 'TEXTAREA' ? 'textarea-outline' : 'input-outline');
			}

			// Restructure DOM: input → wrapper → input
			input.parentNode.insertBefore(wrapper, input);
			wrapper.appendChild(input);

			// Classic underlined style needs animated bar
			if (!wrapper.classList.contains('input-wrapper-outline')) {
				const bar = document.createElement('span');
				bar.className = 'input-bar';
				input.after(bar);
			}

			// Move sibling <label> inside wrapper (common pattern)
			const label = Array.from(wrapper.parentNode.children).find(
				(sibling) =>
				sibling !== wrapper &&
				sibling.tagName === 'LABEL'
				// && sibling.htmlFor === input.id
			);

			if (label) {
				wrapper.prepend(label);
			}

			// Set initial visual state
			this.updateInputState(input);
		});
	}

	/**
	 * Makes textareas with .autosize class grow/shrink according to content.
	 * Uses scrollHeight trick → very reliable cross-browser.
	 */
	initAutosizeTextareas() {
		document.querySelectorAll("textarea.autosize").forEach(area => {
			const resize = () => {
				area.style.height = "auto";						// reset so scrollHeight is correct
				area.style.height = `${area.scrollHeight}px`;
			};
			area.addEventListener("input", resize);
			// Initial sizing (important for pre-filled textareas)
			resize();
		});
	}

	/**
	 * Initializes live character counters for inputs with maxlength.
	 * Updates counter text and can disable submit button when over limit.
	 */
	initCharCounters() {
		document.querySelectorAll("[maxlength]").forEach(input => {

			const max = parseInt(input.getAttribute("maxlength"), 10);
			if (Number.isNaN(max)) return;

			// Two common patterns: data-counter-id or next sibling with .char-counter
			const counter = 
				document.getElementById(input.dataset.counterId) || 
				(input.nextElementSibling?.classList.contains("char-counter")
					? input.nextElementSibling
					: null);

			if (counter) {

				const update = () => {

					const len = input.value.trim().length;
					counter.textContent = `${len} / ${max}`;

					// Optional: disable submit when over limit (UX choice)
					const submit = input.closest("form")?.querySelector("button[type=submit]");
					if (submit) submit.disabled = len > max;
				};

				input.addEventListener("input", update);
				update();
			}
		});
	}

	/**
	 * Updates visual state classes on the input wrapper based on:
	 *   • value presence (filled)
	 *   • focus (handled separately via events)
	 *   • error/success/validation classes
	 *   • disabled state
	 *
	 * @param {HTMLInputElement|HTMLTextAreaElement} input
	 */
	updateInputState(input) {
		const wrapper = input.closest('.input-wrapper');
		if (!wrapper) return;

		// Manage Focus/Filled states
		const isFilled = input.value !== '';
		const isFixed = input.classList.contains('label-fixed');

		wrapper.classList.toggle('input-filled', isFixed || isFilled);

		// if (isFixed || isFilled) {
		// 	wrapper.classList.add('input-filled');
		// } else {
		// 	wrapper.classList.remove('input-filled');
		// }

		// Validation states
		wrapper.classList.toggle('input-wrapper-danger', input.classList.contains('form-danger'));
		wrapper.classList.toggle('input-wrapper-success', input.classList.contains('form-success'));

		// Disabled state
		wrapper.classList.toggle('input-wrapper-disabled', input.disabled);
	}

	/**
	 * Binds delegated focus/blur/input events on document.body.
	 * Uses capture phase (true) so we catch events before they reach the target.
	 * @private
	 */
	#bindEvents() {
		// Focus → add focus ring/class
		this.ui.$el.body.addEventListener("focus", (e) => {
			if (e.target.matches('[data-input]')) {
				e.target.closest('.input-wrapper')?.classList.add('input-focus');
			}
		}, true);

		// Blur → remove focus class + update filled/error state
		this.ui.$el.body.addEventListener("blur", (e) => {
			if (e.target.matches('[data-input]')) {
				e.target.closest('.input-wrapper')?.classList.remove('input-focus');
				this.updateInputState(e.target);
			}
		}, true);

		// Input/change → update filled state in real time
		this.ui.$el.body.addEventListener('input', (e) => {
			if (e.target.matches('[data-input]')) {
				this.updateInputState(e.target);
			}
		}, true);
	}
}