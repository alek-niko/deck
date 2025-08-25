document
	.getElementById('contact-form')
	.addEventListener('submit', async function (event) {

		event.preventDefault(); // Prevent default form submission

		const form = event.target;

		// Convert form data to a JSON object
		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries()); // Convert FormData to a plain object

		try {
			const response = await fetch(`/contact?deck=1`, {
				method: form.method,
				headers: {
					'Content-Type': 'application/json', // Indicate JSON payload
					'Accept': 'application/json',       // Request JSON response
				},
				body: JSON.stringify(data), // Convert the data object to JSON
			});

			if (response.ok) {
				const result = await response.json();
				alert(result.success); // Show success message
				form.reset(); // Clear all form fields
			} else {
				const error = await response.json();
				alert(error.error || 'An error occurred. Please try again.');
			}
		} catch (err) {
			alert('Network error: ' + err.message);
		}
	});
