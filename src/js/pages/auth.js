/**
 * Class responsible for handling form submission, validation, and related interactions.
 * - Initializes the form and sets up necessary event listeners for submission and validation.
 * - Tracks user interactions like mouse movements and clicks to detect real users.
 * - Handles password validation and username availability checks.
 * 
 * @class FormHandler
 */

class FormHandler {

	#form;					// The form element being handled
	#formId;				// The ID of the form element
	#actionUrl;				// The URL where the form will be submitted
	#startTime;				// The timestamp when the form was initialized
	#clicked = false;		// Tracks if the form has been clicked by the user
	#submitBtn;				// The form's submit button element
	#mouseMoved = false;	// Tracks if the user has moved the mouse.

	/**
	 * Creates an instance of FormHandler and initializes the form.
	 * 
	 * @param {string} formId - The ID of the form element.
	 * @param {string} actionUrl - The action URL for form submission.
	 */
	constructor(formId, actionUrl) {

		// Retrieve the form element by its ID
		this.#form = document.getElementById(formId);

		// If the form doesn't exist, return early and do nothing
		if (!this.#form) return;

		// Set form ID and action URL
		this.#formId = formId;
		this.#actionUrl = `/auth/${actionUrl}`;

		// Initialize the form submission start time
		this.#startTime = Date.now();

		// Get the submit button element from the form
		this.#submitBtn = this.#form.querySelector('button[type="submit"]');

		// Initialize additional form setup like event listeners and validation
		this.#init();
	}

	/**
	 * Initializes the form with event listeners and additional setup.
	 * - Tracks if the form was clicked and sets `#clicked` to `true`.
	 * - Adds a hidden honeypot field to the form for user validation.
	 * - Prevents default form submission and handles it via `#handleSubmit()`.
	 * - Validates passwords using `#checkPasswords()`.
	 * - Tracks mouse movement to detect if the user has moved the mouse.
	 * 
	 * @private
	 */
	#init() {

		// Track if the form has been clicked by the user
		this.#form.addEventListener('click', () => (this.#clicked = true));

		// Find the first child div within the form to append a honeypot field
		let metaDiv = this.#form.querySelector(':scope > div');

		if (metaDiv) {
			// Create a hidden input field (honeypot) to distinguish real users
			let honeypot = document.createElement("input");
			honeypot.type = "hidden";
			honeypot.name = "source";
			honeypot.value = "deck"; // Only real users should have this field

			// Append the honeypot input to the form's first div
			metaDiv.appendChild(honeypot);
		}

		// Prevent default form submission and handle the submission manually
		this.#form.addEventListener('submit', (event) => {
			event.preventDefault(); // Prevents the form from submitting in the usual way
			this.#handleSubmit(); // Calls the custom submit handler
		});

		// Track mouse movement and set the #mouseMoved flag to true
		document.addEventListener('mousemove', () => {
			this.#mouseMoved = true;
		});

		// If the form ID is 'register-form'
		if (this.#formId === 'register-form') {

			this.#checkUsername();
			this.#checkPasswords();

		}
	}



	// /**
	//  * Checks if the username is available for registration.
	//  * Disables the submit button while checking, then enables it if the username is available 
	//  * and passwords are valid. Displays a message if the username is taken.
	//  * 
	//  * @private
	//  */
	// #checkUsername() {
	// 	if (this.#formId === 'register-form') {
	// 		const signupUsername = this.#form.querySelector('#signup-username').value;

	// 		// Disable submit button while checking
	// 		this.#submitBtn.disabled = true;

	// 		// Fetch request to check username availability
	// 		fetch(`/auth/register/${signupUsername}?source=deck`)
	// 			.then(response => response.json())
	// 			.then(data => {
	// 				if (data.available) {
	// 					// Enable submit button if passwords are valid
	// 					if (this.#checkPasswords()) {
	// 						this.#submitBtn.disabled = false;
	// 					}
	// 				} else {
	// 					// Notify the user if the username is taken
	// 					Deck.say('Username taken');
	// 				}
	// 			})
	// 			.catch(error => {
	// 				console.error('Error checking username:', error);
	// 			});
	// 	}
	// }

	/**
	 * Checks if the username is available for registration.
	 * - Disables the submit button while checking.
	 * - If the username is available and passwords are valid, enables the submit button.
	 * - Displays an error message if the username is taken.
	 * 
	 * @private
	 * @returns {Promise<void>} Resolves when the username check is complete.
	 */

	async #checkUsername() {

		const usernameInput = this.#form.querySelector('#signup-username');
		let debounceTimeout;

		usernameInput.addEventListener('input', () => {
			clearTimeout(debounceTimeout); // Clear any previous timeout

			debounceTimeout = setTimeout(async () => {
				const signupUsername = usernameInput.value.trim();

				if (!signupUsername) return; // Don't check if empty

				try {
					// Send request to check username availability
					const response = await fetch(`/auth/register/${signupUsername}?source=deck`);
					const data = await response.json();

					// If username is available and passwords are valid, enable submit button
					if (data.available) {
						// Enable submit button here if needed
						// this.#submitBtn.disabled = false;
						// Username available, remove color-red class
						usernameInput.parentElement.classList.remove('color-red');
					} else {
						// Username taken, add color-red class
						usernameInput.parentElement.classList.add('input-wrapper-danger');
						// Notify user if username is taken
						Deck.say('This username is already taken.', 'danger');
					}
				} catch (error) {
					console.error('Error checking username:', error);
				}
			}, 500); // Wait 500ms after typing stops before sending request
		});

	}

	/**
	 * Validates the password and confirmation password fields.
	 * - Disables the submit button if passwords are invalid or do not match.
	 * - Enables the submit button only if both passwords are valid and match.
	 * 
	 * @private
	 */
	#checkPasswords() {

		// Get the password and confirmation password elements
		const signupPassword = this.#form.querySelector(`#signup-password`);
		const confirmPassword = this.#form.querySelector(`#signup-password-confirm`);

		// Disable submit button initially until passwords are checked
		this.#submitBtn.disabled = true;

		/**
		 * Function to check if the passwords are valid and match.
		 * - Checks if both passwords are valid in length and if they match.
		 * - Enables the submit button if passwords are valid and match.
		 */
		const checkPasswords = () => {
			// Check validity of password length and confirmation
			const isValidLength = signupPassword.validity.valid && confirmPassword.validity.valid;
			// Check if both passwords match
			const passwordsMatch = signupPassword.value === confirmPassword.value;

			// Enable submit button if both conditions are met, otherwise disable it
			this.#submitBtn.disabled = !(isValidLength && passwordsMatch);
		}

		// Add event listeners to validate passwords on user input
		signupPassword.addEventListener('input', checkPasswords);
		confirmPassword.addEventListener('input', checkPasswords);

	}

	/**
	 * Handles form submission with additional metadata.
	 * - Disables the submit button to prevent duplicate submissions.
	 * - Appends security and tracking data before sending.
	 * - Sends the request as JSON and handles potential errors.
	 * - Redirects on success or shows an error message on failure.
	 * 
	 * @private
	 */
	async #handleSubmit() {

		// Disable submit button to prevent multiple submissions
		this.#submitBtn.disabled = true;

		// Set form action URL (ensures correct submission endpoint)
		this.#form.setAttribute('action', this.#actionUrl);

		// Collect form data
		const formData = new FormData(this.#form);
		formData.append('csrfToken', document.body.getAttribute('data-csrfToken') || '');
		formData.append('clicked', this.#clicked ? '1' : '0');
		formData.append('timeElapsed', (Date.now() - this.#startTime) / 1000);
		formData.append('mouseMoved', this.#mouseMoved ? '1' : '0');
		formData.append('source', this.#form.querySelector('[name="source"]')?.value);

		// Convert FormData to a plain object for JSON submission
		const data = Object.fromEntries(formData.entries());

		try {
			// Send a POST request with JSON data
			const response = await fetch(`${this.#actionUrl}?source=deck`, {
				method: this.#form.method,
				headers: {
					'Content-Type': 'application/json', // Indicate JSON payload
					'Accept': 'application/json',       // Request JSON response
				},
				body: JSON.stringify(data),
			});

			// Handle non-200 responses
			if (!response.ok) {
				const contentType = response.headers.get('content-type');

				// If the response is JSON, parse and throw the error message
				if (contentType?.includes('application/json')) {
					const error = await response.json();
					throw new Error(error.message || 'Unknown error');
				}

				// Otherwise, throw a generic error
				throw new Error('Oops! Something went wrong.');
			}

			// Parse JSON response
			const result = await response.json();

			// Redirect to homepage after successful submission
			//window.location.href = '/';

			if (this.#formId === 'login-form' || this.#formId === 'register-form' ) {
				const username = formData.get('username'); // get username from form
				window.location.href = `@${username}`
			}
			

		} catch (error) {
			// Display error message and re-enable submit button
			Deck.say(error.message, 'danger');
			this.#submitBtn.disabled = false;
		}
	}

}

// Usage
new FormHandler('login-form', 'login');
new FormHandler('register-form', 'register');
new FormHandler('password-reset-form', 'reset');