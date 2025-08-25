/**
 * Class to handle file validation logic such as size and type validation.
 * @note v2 includes streams. [ Test ]
 */
class FileValidator {
	/**
	 * List of accepted image, video, and audio file formats.
	 */
	static imageFormats = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
	static videoFormats = ['mp4', 'm4v', 'webm'];
	static audioFormats = ['aac', 'mp3', 'weba'];

	/**
	 * Creates an instance of the FileValidator.
	 * @param {number} maxSize - The maximum allowed file size in bytes.
	 */
	constructor(maxSize = 10485760, acceptedTypes = []) {
		this.maxSize = maxSize; // Maximum allowed file size (default: 10MB)
		this.acceptedTypes = acceptedTypes; // Accepted file types (future use, override defaults)
	}

	/**
	 * Checks if the file size is within the allowed limit.
	 * @param {File} file - The file object to validate.
	 * @returns {boolean} True if the file size is within the limit, otherwise false.
	 */
	isValidSize(file) {
		return file.size <= this.maxSize; // Compare file size against the maximum limit
	}

	/**
	 * Checks if the file type is one of the accepted formats based on its extension.
	 * @param {File} file - The file object to validate.
	 * @returns {boolean} True if the file type is accepted, otherwise false.
	 */
	isValidType(file) {
		const extension = file.name.split('.').pop().toLowerCase();
		return (
			FileValidator.imageFormats.includes(extension) ||
			FileValidator.videoFormats.includes(extension) ||
			FileValidator.audioFormats.includes(extension)
		);
	}

	/**
	 * Determines the file type based on the file extension.
	 * @param {string} fileName - The name of the file to determine the type.
	 * @returns {string} The file type.
	 * @private
	 */
	getFileType(fileName) {
		const extension = fileName.split('.').pop().toLowerCase(); // Get the file extension
		if (FileValidator.imageFormats.includes(extension)) return 'image'; // Return image type if file format matches 
		if (FileValidator.videoFormats.includes(extension)) return 'video'; // Return video type if file format matches
		if (FileValidator.audioFormats.includes(extension)) return 'audio'; // Return audio type if file format matches
		return 'file'; // Return file type for other formats
	}
}

// Import the base Component class from the Component.js file
import Component from './Component.js';

/**
 * Uploader component for handling file uploads.
 * 
 * The Uploader component is designed to simplify the process of uploading files in web applications. 
 * It allows users to select files and handle the upload process, including progress tracking, validation, 
 * and error handling. The component supports POST, PUT, and STREAM upload methods, various customization 
 * options such as file type validation, maximum file size, and event handling for success or failure during 
 * the upload. It can be used for single or multiple file uploads and integrates easily into forms or other UI elements.
 * 
 * @class Uploader
 * @extends Component
 */
class Uploader extends Component {
	/**
	 * Creates an instance of the Uploader component.
	 *
	 * @param {HTMLElement} element 		- The DOM element to which the Uploader component will be applied.
	 * @param {Object} [config={}]			- Configuration options for the Uploader component. Defaults to an empty object.
	 * @param {Deck} [deck=null]			- An instance of the Deck class (optional). Defaults to null.
	 */
	constructor(element, options = {}, deck = null) {

		// Define default options for the component
		const defaultOptions = {
			wrapper: document.body, 			// {HTMLElement}	- The container element where the file input will be attached.
			multiple: false, 					// {boolean}		- Allow multiple file selection
			autoUpload: true, 					// {boolean}		- Whether to automatically upload files after selection.
			method: 'post',						// {string}			- Upload method: 'post', 'put', or 'stream'.
			limit: -1, 							// {number}			- The maximum number of files allowed for upload. No file limit by default
			accept: '*', 						// {string}			- The accepted file types (MIME types).
			headers: {}, 						// {Object}			- Additional headers to include in the upload request.
			data: {}, 							// {Object}			- Extra data to send with the file upload.
			maxSize: 10 * 1024 * 1024, 	    	// {number}			- Maximum allowed file size in bytes. Max size set to 10MB by default
			acceptedTypes: [],					// {Array<string>}  - Accepted file types for upload.
			userId: 'anonymous',				// {string}			- User ID for streaming uploads.
			withCredentials: false, 			// {boolean}		- Whether to include credentials in the upload request.
			usePresigned: true, 				// {boolean}		- Whether to use presigned URLs for uploading.
			url: '/api/upload/multipart',		// {string} 		- The server URL to which the files will be uploaded.
			presignUrl: '/api/upload/presign', 	// {string}			- URL to request presigned URLs for upload.
			streamUrl: '/api/upload/stream',	// {string}			- URL for streaming uploads.
			target: '',							// {string}			- Holds the upload type and context, like 'user/avatar'
		};

		// Merge user-provided options with the default options
		const mergedOptions = { ...defaultOptions, ...options };

		// Create a context object containing relevant data for the component
		const context = {
			name: 'uploader',				// Name of the component
			element,						// The DOM element this component is attached to
			deck,							// Optional deck instance (can be null)
			...mergedOptions,				// Final options after merging defaults and user input
		};

		// Call the parent class's constructor with the context object
		super(context);

		// Array to hold files selected for upload
		this.uploadFiles = [];

		// File validator instance
		this.fileValidator = new FileValidator(this.maxSize, this.acceptedTypes);

		// Initialize the uploader
		this.#init();
	}

	/**
	 * Initializes the uploader, setting up the file input and drag-and-drop support.
	 * @private
	 */
	#init() {
		
		this.input = this.createInputElement(); // Create the file input element

		this.input.addEventListener('change', (e) => {
			const files = Array.from(e.target.files); // Get the selected files
			if (this.dispatchEvent('choose', { files }, true) !== false) {
				this.loadFiles(files); // Load the files for validation and upload
			}
		});

		this.element.insertAdjacentElement('afterend', this.input);

		// Initializes <a> or <button>
		if (this.element.tagName === 'A' || this.element.tagName === 'BUTTON') {
			this.element.addEventListener('click', () => this.chooseFile());
			return;
		}

		// Initializes the drag-and-drop functionality.
		if (this.element.tagName === 'DIV' && this.element.classList.contains('upload-drop')) {

			this.element.addEventListener('dragover', this.handleDragOver.bind(this)); // Handle drag over event
			this.element.addEventListener('dragleave', this.handleDragLeave.bind(this)); // Handle drag leave event
			this.element.addEventListener('drop', this.handleDrop.bind(this)); // Handle drop event
		}

		// Default case: set click event on the provided element
		this.element.addEventListener('click', () => this.chooseFile());
	}

	/**
	 * Creates and returns the file input element.
	 * @returns {HTMLInputElement} The file input element.
	 * @private
	 */
	createInputElement() {
		const el = document.createElement('input'); // Create an input element
		Object.assign(el, {
			type: 'file', // Set the input type to file
			accept: this.accept, // Set accepted file types
			multiple: this.multiple, // Allow multiple file selection
			hidden: true // Hide the input element (can be triggered programmatically)
		});
		return el;
	}

	/**
	 * Opens the file input dialog to select files.
	 */
	chooseFile() {
		this.input.value = ''; // Reset the file input
		this.input.click(); // Trigger the file input click
	}

	/**
	 * Loads the selected files, validating and preparing them for upload.
	 * @param {Array<File>} files - The files to load.
	 */
	loadFiles(files) {
		// Check if the file count exceeds the limit
		if (this.limit !== -1 && files.length + this.uploadFiles.length > this.limit) {
			this.dispatchEvent('exceed', {files}, true); // Emit 'exceed' event if file limit is reached
			return;
		}

		files.forEach(file => {
			// Validate file size
			if (!this.fileValidator.isValidSize(file)) {
				// Emit error if file size exceeds limit
				this.dispatchEvent('error', { message: 'File too large', file }, true);
				return;
			}
			// Validate file type
			if (!this.fileValidator.isValidType(file)) {
				// Emit error if file type is invalid
				this.dispatchEvent('error', { message: 'Invalid file type', file }, true);
				return;
			}

			// Add valid file to the upload queue
			this.uploadFiles.push({
				uid: Math.random().toString(36).substr(2, 10), // Generate a unique ID for the file
				rawFile: file, // Store the raw file
				fileName: file.name, // Store the file name
				size: file.size, // Store the file size
				status: 'ready' // Set initial file status to 'ready'
			});
		});

		this.dispatchEvent('change', this.uploadFiles); // Emit 'change' event with updated files
		if (this.autoUpload) this.upload(); // Automatically upload files if enabled
	}

	/**
	 * Removes a file from the upload queue.
	 * @param {Object} file - The file object to remove.
	 */
	removeFile(file) {
		this.uploadFiles = this.uploadFiles.filter(item => item.uid !== file.uid); // Remove the file from the array
		this.dispatchEvent('change', this.uploadFiles); // Emit 'change' event with updated files
	}

	/**
	 * Starts the file upload process.
	 * @param {Object} [file] - An optional file to upload; if not provided, all ready files will be uploaded.
	 */
	async upload(file) {
		const filesToUpload = file ? [file] : this.uploadFiles.filter(f => f.status === 'ready'); // Get files to upload
		for (const f of filesToUpload) {
			if (this.method === 'stream') {
				await this.stream(f);
			} else if (this.method === 'put') {
				await this.put(f);
			} else {
				await this.post(f);
			}
		}
	}

	/**
	 * Handles the dragover event to indicate the drop area.
	 * @param {Event} event - The dragover event.
	 * @private
	 */
	handleDragOver(event) {
		event.preventDefault(); // Prevent the default behavior of the browser
		event.stopPropagation(); // Stop the event from propagating
		event.dataTransfer.dropEffect = 'copy'; // Show copy cursor
		this.element.classList.add('dragover');
		//event.target.style.border = '2px solid #00f'; // Highlight drop area
	}

	/**
	 * Handles the dragleave event to reset the drop area.
	 * @param {Event} event - The dragleave event.
	 * @private
	 */
	handleDragLeave(event) {
		this.element.classList.remove('dragover');
	}

	/**
	 * Handles the drop event to process files dropped into the drop area.
	 * @param {Event} event - The drop event.
	 * @private
	 */
	handleDrop(event) {
		event.preventDefault(); // Prevent the default behavior of the browser
		event.stopPropagation(); // Stop the event from propagating
		const files = Array.from(event.dataTransfer.files); // Get the dropped files
		if (this.dispatchEvent('choose', { files }, true) !== false) {
			this.loadFiles(files); // Load the files for validation and upload
		}
		event.target.style.border = ''; // Reset drop area style
	}

	/**
	 * Posts a file to the server using the POST method and a presigned POST URL.
	 * This method supports multipart form uploads.
	 * @param {Object} file - The file to upload.
	 * @private
	 */
	async post(file) {

		try {

			const { presignUrl, data, headers, withCredentials, usePresigned } = this;

			//let uploadUrl = this.url;
			var uploadUrl = `${this.url}${uploadTarget ? `/${uploadTarget}` : ''}`;

			let formData = new FormData();

			if (usePresigned) {

				// Get presigned POST data for file upload
				//const response = await fetch(`${presignUrl}?filename=${file.fileName}`);
				const response = await fetch(
					`${presignUrl}${uploadTarget ? `/${uploadTarget}` : ''}${file?.fileName ? `?filename=${encodeURIComponent(file.fileName)}` : ''}`
				);


				if (!response.ok) throw new Error('Failed to get presigned URL');

				const presigned = await response.json();

				file.type = this.fileValidator.getFileType(file.fileName);
				file.fileName = presigned.data.filename;
				uploadUrl = presigned.data.url;

				// Append presigned fields to form data
				Object.entries(presigned.data.fields).forEach(([key, value]) => {
					formData.append(key, value);
				});
			}

			// Append file to form data
			formData.append('file', file.rawFile);

			// Append extra data
			Object.entries(data).forEach(([key, value]) => {
				formData.append(key, value);
			});

			// Start uploading via POST method
			const uploadResponse = await fetch(uploadUrl, {
				method: 'POST',
				body: formData,
				headers,
				credentials: withCredentials ? 'include' : 'same-origin',
			});

			if (!uploadResponse.ok) {
				throw new Error('Upload failed');
			}

			file.status = 'done'; // Mark as uploaded successfully
			this.dispatchEvent('done', { file }, true);

		} catch (error) {
			file.status = 'error'; // Set error status on failure
			this.dispatchEvent('error', { message: error.message, file }, true);
		}
	}

	/**
	 * Posts a file to the server using a PUT method and a presigned URL.
	 * @param {Object} file - The file to upload.
	 * @private
	 */
	async put(file) {

		try {
			const { presignUrl, data, headers, withCredentials, usePresigned } = this;

			//var uploadUrl = this.url;
			var uploadUrl = `${this.url}${uploadTarget ? `/${uploadTarget}` : ''}`;
			
			if (usePresigned) {

				// Get presigned URL for file upload
				//const response = await fetch(`${presignUrl}?filename=${file.fileName}`);
				const response = await fetch(
					`${presignUrl}${uploadTarget ? `/${uploadTarget}` : ''}${file?.fileName ? `?filename=${encodeURIComponent(file.fileName)}` : ''}`
				);

				if (!response.ok) throw new Error('Failed to get presigned URL');

				const presigned = await response.json();
				
				file.type = this.fileValidator.getFileType(file.fileName);
				file.fileName = presigned.data.filename;
				uploadUrl = presigned.data.url;
			}

			// Prepare the file for upload
			const fileBlob = file.rawFile;

			// Start uploading the file via PUT
			const uploadResponse = await fetch(uploadUrl, {
				method: 'PUT',
				body: fileBlob,
				headers,
				credentials: withCredentials ? 'include' : 'same-origin',
			});

			if (!uploadResponse.ok) {
				throw new Error('Upload failed');
			}

			file.status = 'done'; // Mark as uploaded successfully
			this.dispatchEvent('done', { file }, true);

		} catch (error) {
			file.status = 'error'; // Set error status on failure
			this.dispatchEvent('error', { message: error.message, file }, true);
		}
	}

	/**
	 * Streams a file to the server using the POST method with Server-Sent Events for progress tracking.
	 * @param {Object} file - The file to upload.
	 * @private
	 */
	async stream(file) {

		try {
			const { streamUrl, headers, withCredentials, userId } = this;
			const fileType = this.fileValidator.getFileType(file.fileName);
			const contentType = file.rawFile.type || 'application/octet-stream';

			// Construct query parameters
			const queryParams = new URLSearchParams({
				filename: file.fileName,
				type: contentType,
				userId,
				totalSize: file.size.toString()
			}).toString();

			//const uploadUrl = `${streamUrl}?${queryParams}`;
			const uploadUrl = `${streamUrl}${uploadTarget ? `/${uploadTarget}` : ''}?${queryParams}`;

			// Create a ReadableStream from the File
			const stream = file.rawFile.stream();
			const reader = stream.getReader();

			// Initialize EventSource for SSE
			const eventSource = new EventSource(uploadUrl);
			let uploadStarted = false;

			eventSource.onopen = () => {
				uploadStarted = true;
				file.status = 'uploading';
				this.dispatchEvent('start', { file }, true);
			};

			eventSource.addEventListener('s3progress', (event) => {
				const progress = JSON.parse(event.data);
				this.dispatchEvent('progress', {
					file,
					loaded: progress.loaded,
					total: progress.total,
					percentage: progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0
				}, true);
			});

			eventSource.addEventListener('done', (event) => {
				const result = JSON.parse(event.data);
				file.status = 'done';
				file.key = result.key;
				file.location = result.location;
				this.dispatchEvent('done', { file, result }, true);
				eventSource.close();
			});

			eventSource.addEventListener('error', (event) => {
				const errorData = JSON.parse(event.data || '{}');
				file.status = 'error';
				this.dispatchEvent('error', { message: errorData.message || 'Streaming upload failed', file }, true);
				eventSource.close();
			});

			eventSource.onerror = () => {
				if (!uploadStarted) {
					file.status = 'error';
					this.dispatchEvent('error', { message: 'Failed to establish streaming connection', file }, true);
					eventSource.close();
				}
			};

			// Stream the file data
			const sendStream = async () => {
				try {
					const response = await fetch(uploadUrl, {
						method: 'POST',
						body: stream,
						headers: {
							...headers,
							'Content-Type': contentType
						},
						credentials: withCredentials ? 'include' : 'same-origin',
						duplex: 'half'
					});

					if (!response.ok) {
						throw new Error('Streaming upload failed');
					}
				} catch (error) {
					file.status = 'error';
					this.dispatchEvent('error', { message: error.message, file }, true);
					eventSource.close();
				} finally {
					reader.cancel();
				}
			};

			sendStream();

		} catch (error) {
			file.status = 'error';
			this.dispatchEvent('error', { message: error.message, file }, true);
		}
	}

	/**
	 * Streams a file to the server and simulates progress tracking on the client-side.
	 * This method uses a TransformStream to monitor the number of bytes being sent
	 * and dispatches progress events accordingly. It simplifies the backend, which no longer
	 * needs to support Server-Sent Events (SSE) for progress.
	 *
	 * @param {Object} file - The file to upload.
	 * @private
	 */
	// async stream(file) {
	// 	try {
	// 		const { streamUrl, headers, withCredentials, target, userId } = this;
	// 		const contentType = file.rawFile.type || 'application/octet-stream';

	// 		// Construct the upload URL with necessary parameters
	// 		const queryParams = new URLSearchParams({
	// 			filename: file.fileName,
	// 			contentType: contentType,
	// 			userId: userId,
	// 		}).toString();

	// 		const uploadUrl = `${streamUrl}${target ? `/${target}` : ''}?${queryParams}`;

	// 		let bytesSent = 0;

	// 		// Create a TransformStream to intercept and count the data chunks.
	// 		const progressStream = new TransformStream({
	// 			transform: (chunk, controller) => {
	// 				// Increment the count of bytes sent
	// 				bytesSent += chunk.length;

	// 				// Calculate the percentage of the upload completed
	// 				const percentage = file.size > 0 ? Math.round((bytesSent / file.size) * 100) : 0;

	// 				// Dispatch a 'progress' event with the current status
	// 				this.dispatchEvent('progress', {
	// 					file,
	// 					loaded: bytesSent,
	// 					total: file.size,
	// 					percentage: percentage
	// 				}, true);

	// 				// Pass the chunk along to be sent in the request
	// 				controller.enqueue(chunk);
	// 			}
	// 		});

	// 		file.status = 'uploading';
	// 		this.dispatchEvent('start', { file }, true);

	// 		// Start the upload using fetch
	// 		const response = await fetch(uploadUrl, {
	// 			method: 'POST',
	// 			headers: {
	// 				'Content-Type': contentType,
	// 				...headers,
	// 			},
	// 			// The file stream is piped through our progress-tracking stream
	// 			body: file.rawFile.stream().pipeThrough(progressStream),
	// 			credentials: withCredentials ? 'include' : 'same-origin',
	// 			// 'duplex: half' is required for streaming request bodies
	// 			duplex: 'half',
	// 		});

	// 		// Handle the server's final response
	// 		if (!response.ok) {
	// 			// Try to get a detailed error message from the server's response body
	// 			const errorData = await response.json().catch(() => ({ message: 'Streaming upload failed' }));
	// 			throw new Error(errorData.message || 'Upload failed with status ' + response.status);
	// 		}

	// 		const result = await response.json();

	// 		// Mark the upload as complete
	// 		file.status = 'done';
	// 		this.dispatchEvent('done', { file, result }, true);

	// 	} catch (error) {
	// 		file.status = 'error';
	// 		this.dispatchEvent('error', { message: error.message, file }, true);
	// 	}
	// }
}

export default Uploader;