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
		this.#initAjaxForms();
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

	/**
	 * Intercepts submissions for forms with .deck-form
     * @private
     */
	#initAjaxForms() {
        document.addEventListener('submit', async (event) => {

            const form = event.target.closest('.deck-form');
            if (!form) return;

            event.preventDefault();

            // Show spinner specifically on THIS form
            // 'overlay' ensures it covers the form and respects its border-radius
            if (this.ui.spinner) {
                this.ui.spinner.show(form, { 
                    mode: 'overlay', 
                    variant: 'primary',
                    text: 'Processing...' 
                });
            }
            
            const submitBtn = form.querySelector('[type="submit"]');
            const originalContent = submitBtn?.innerHTML;

            try {
                if (submitBtn) submitBtn.disabled = true;

                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                const response = await fetch(form.action, {
                    method: form.method || 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (response.ok) {
                    if (window.deck?.say) {
                        window.deck.say(result.message || 'Success!', 'success');
                    }
					// Dispatch Custom Event
					// We dispatch on the form so listeners know EXACTLY which form sent data
					const successEvent = new CustomEvent('form:success', {
						bubbles: true,		// Allows parent elements to hear it
						detail: { 
							data: result,	// The actual JSON from the server
							form: form		// Reference to the form element
						}
					});
					form.dispatchEvent(successEvent);
                    form.reset();
                    form.querySelectorAll('.autosize').forEach(el => el.dispatchEvent(new Event('input')));

                } else {
                    const errorMsg = result.error || 'Submission failed.';
                    if (window.deck?.say) window.deck.say(errorMsg, 'danger');
                }

            } catch (err) {
                console.error('Form Submission Error:', err);
                if (window.deck?.say) window.deck.say('Network error.', 'danger');

            } finally {
                // Hide spinner from THIS specific form
                if (this.ui.spinner) this.ui.spinner.hide(form);
                
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalContent;
                }
            }
        });
    }
}