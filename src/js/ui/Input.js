// WORK IN PROGRESS V1


export default class UserInput {

	#inputObserver;
	#initInputCharCounters;

	constructor() {

	this.#init()
	}

	#init() {
		this.#initAutosizeTextarea();
		this.#initInputCharCounters()
		this.initInput();         
		this.inputUpdate();       
		this.inputDisableSubmit();
		this.#observeInputsAndTextareas(); 
	}

	initInput(parent = document) {
		const inputs = parent.querySelectorAll('[data-input]');

		inputs.forEach(input => {
			// Skip if already enhanced
			if (input.dataset.enhanced === 'true') return;
			input.dataset.enhanced = 'true';

			// Ensure input is wrapped
			if (!input.closest('.input-wrapper')) {
				const wrapper = document.createElement('div');
				wrapper.classList.add('input-wrapper');
				input.parentNode.insertBefore(wrapper, input);
				wrapper.appendChild(input);

				// Outline handling
				if (input.dataset.input === 'outline') {
					input.classList.add(
						input.tagName.toLowerCase() === 'input'
							? 'input-outline'
							: 'textarea-outline'
					);
				}

				// Add outline wrapper or underline bar
				if (input.classList.contains('input-outline') || input.classList.contains('textarea-outline')) {
					wrapper.classList.add('input-wrapper-outline');
				} else {
					const span = document.createElement('span');
					span.classList.add('input-bar');
					input.after(span);
				}

				// Move associated label into wrapper
				const label = input.parentNode.parentNode.querySelector(`label[for="${input.id}"]`)
					|| Array.from(input.parentNode.parentNode.children).find(el => el.tagName.toLowerCase() === 'label');
				if (label) wrapper.prepend(label);
			}

			this.#inputUpdate(input);
		});
	}


	#inputUpdate(input) {
		const inputGroup = input.closest('.input-group');
		const inputWrapper = input.closest('.input-wrapper');

		// Reset state classes
		inputGroup?.classList.remove('input-group-danger', 'input-group-success');
		inputWrapper?.classList.remove(
			'input-wrapper-danger',
			'input-wrapper-success',
			'input-wrapper-disabled',
			'input-filled'
		);

		// Validation state
		if (input.classList.contains('form-danger')) {
			inputGroup?.classList.add('input-group-danger');
			inputWrapper.classList.add('input-wrapper-danger');
		}
		if (input.classList.contains('form-success')) {
			inputGroup?.classList.add('input-group-success');
			inputWrapper.classList.add('input-wrapper-success');
		}

		// Disabled state
		if (input.disabled) {
			inputWrapper.classList.add('input-wrapper-disabled');
		}

		// Filled state
		if (input.value || input.classList.contains('label-fixed')) {
			inputWrapper.classList.add('input-filled');
		}
	}


	inputDisableSubmit(inputs) {
		inputs.forEach(input => {
			input.addEventListener('keydown', event => {
				if (event.key === 'Enter') event.preventDefault();
			});
		});
	}

	/**
	 * Start observing the DOM for dynamically added inputs
	 */
	observeInputs() {
		// Run once initially
		this.initInput(document);

		// Set up MutationObserver
		const observer = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.type === 'childList' && mutation.addedNodes.length) {
					mutation.addedNodes.forEach(node => {
						if (node.nodeType !== Node.ELEMENT_NODE) return;

						// Direct match
						if (node.matches?.('[data-input]')) {
							this.initInput(node.parentNode || document);
						}

						// Descendants match
						const descendants = node.querySelectorAll?.('[data-input]');
						if (descendants?.length) {
							this.initInput(node);
						}
					});
				}
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	/**
	 * Observes DOM changes to auto-init char counters and autosize on new inputs/textareas.
	 * Keeps overhead minimal by ignoring irrelevant mutations.
	 */
	#observeInputsAndTextareas() {
		// Disconnect any existing observer to avoid duplicates
		if (this.#inputObserver) {
			this.#inputObserver.disconnect();
		}

		// Create MutationObserver with lightweight filter
		this.#inputObserver = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.type !== "childList" || !mutation.addedNodes.length) continue;

				for (const node of mutation.addedNodes) {
					// Directly added input/textarea
					if (node.nodeType === Node.ELEMENT_NODE) {
						if (node.matches?.("input[maxlength], textarea[maxlength]")) {
							this.#initInputCharCounters(node);
						}
						if (node.matches?.("textarea[data-autosize]")) {
							this.#initAutosizeTextarea(node);
						}

						// If it’s a container, check its descendants
						if (node.querySelectorAll) {
							const charCounterEls = node.querySelectorAll("input[maxlength], textarea[maxlength]");
							charCounterEls.forEach(el => this.#initInputCharCounters(el));

							const autosizeEls = node.querySelectorAll("textarea[data-autosize]");
							autosizeEls.forEach(el => this.#initAutosizeTextarea(el));
						}
					}
				}
			}
		});
				// Observe only subtree additions (ignores attributes/text changes)
		this.#inputObserver.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	/**
	 * Initializes character counters on provided element or globally if none given.
	 * @param {HTMLElement} el Optional single element to initialize.
	 */
	#initInputCharCounters(el) {
		const targets = el ? [el] : document.querySelectorAll("input[maxlength], textarea[maxlength]");
		targets.forEach(input => {
			if (input.dataset.charCounterInit) return; // Prevent duplicate init
			input.dataset.charCounterInit = "true";

			const counter = document.createElement("span");
			counter.className = "char-counter";
			counter.textContent = `0 / ${input.maxLength}`;
			input.insertAdjacentElement("afterend", counter);

			input.addEventListener("input", () => {
				counter.textContent = `${input.value.length} / ${input.maxLength}`;
			});
		});
	}

	/**
	 * Initializes textarea autosizing on provided element or globally if none given.
	 * @param {HTMLElement} el Optional single element to initialize.
	 */
	#initAutosizeTextarea(el) {
		const targets = el ? [el] : document.querySelectorAll("textarea[data-autosize]");
		targets.forEach(textarea => {
			if (textarea.dataset.autosizeInit) return; // Prevent duplicate init
			textarea.dataset.autosizeInit = "true";

			const resize = () => {
				textarea.style.height = "auto";
				textarea.style.height = textarea.scrollHeight + "px";
			};

			textarea.addEventListener("input", resize);
			resize(); // Initial sizing
		});
	}

}