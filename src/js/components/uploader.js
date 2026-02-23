/**
 * @module uploader
 * @description Handles file uploads with support for multiple methods (POST, PUT, STREAM),
 * progress tracking, validation, error handling, and integration with UI elements or forms.
 * Supports single or multiple file uploads with customizable file type and size limits.
 */

// Import the base Component class from the Component.js file
import Component from './component.js';

/**
 * @class FileValidator
 * Handles file validation logic, including size, type, and stream-based checks.
 *
 * @note v2 includes streams. [ Test ]
 */
class FileValidator {
	/**
	 * List of accepted image, video, and audio file formats.
	 */
	static WHITELIST = {
        IMAGE: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'],
        VIDEO: ['mp4', 'mov', 'webm', 'mkv'],
        AUDIO: ['mp3', 'wav', 'm4a', 'ogg'],
        DOC: ['pdf', 'txt', 'zip', 'docx']
    };

	static SPECS = {
        feed: { maxSize: 15 * 1024 * 1024, type: 'IMAGE' },
        avatar: { width: 400, height: 400, maxSize: 5 * 1024 * 1024, type: 'IMAGE' },
        cover: { width: 1500, height: 500, maxSize: 15 * 1024 * 1024, type: 'IMAGE' },
        thumb: { width: 200, height: 200, maxSize: 2 * 1024 * 1024, type: 'IMAGE' },
        preview: { width: 1200, height: 630, maxSize: 8 * 1024 * 1024, type: 'IMAGE' },
        shorts: { maxSize: 100 * 1024 * 1024, type: 'VIDEO' },
        videos: { maxSize: 5 * 1024 * 1024 * 1024, type: 'VIDEO' }
    };

	/**
	 * Creates an instance of the FileValidator.
	 * @param {number} maxSize - The maximum allowed file size in bytes.
	 */
	constructor(target = 'feed') {
		this.target = target;
		this.spec = FileValidator.SPECS[target] || FileValidator.SPECS.feed;
	}

	/**
	 * Checks if the file size is within the allowed limit.
	 * @param {File} file - The file object to validate.
	 * @returns {boolean} True if the file size is within the limit, otherwise false.
	 */
	isValidSize(file) {
		return file.size <= this.spec.maxSize; // Compare file size against the maximum limit
	}

	/**
	 * Checks if the file type is one of the accepted formats based on its extension.
	 * @param {File} file - The file object to validate.
	 * @returns {boolean} True if the file type is accepted, otherwise false.
	 */
	isValidType(file) {
		const ext = file.name.split('.').pop().toLowerCase();
        const allowed = FileValidator.WHITELIST[this.spec.type] || [];
        return allowed.includes(ext);
	}

	/**
	 * Determines the file type based on the file extension.
	 * @param {string} fileName - The name of the file to determine the type.
	 * @returns {string} The file type.
	 * @private
	 */
	getFileType(fileName) {
		const ext = fileName.split('.').pop().toLowerCase();
        for (const [category, extensions] of Object.entries(FileValidator.WHITELIST)) {
            if (extensions.includes(ext)) return category.toLowerCase();
        }
        return 'file';
	}
}

/**
 * @class Uploader
 * @extends Component
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
			presign: true, 						// {boolean}		- Whether to use presigned URLs for uploading.
			url: '/api/upload/multipart',		// {string} 		- The server URL to which the files will be uploaded.
			presignUrl: '/api/upload/presign', 	// {string}			- URL to request presigned URLs for upload.
			streamUrl: '/api/upload/stream',	// {string}			- URL for streaming uploads.
			target: 'feed',						// {string}			- Default target query param, defaults to 'feed'
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
		this.fileValidator = new FileValidator(this.target);

		// Initialize the uploader
		this.#setup();
	}

	/**
	 * Initializes the uploader, setting up the file input and drag-and-drop support.
	 * @private
	 */
	#setup() {
		
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

			const { presignUrl, data, headers, withCredentials, presign, target } = this;

			let uploadUrl = this.url;
			let formData = new FormData();

			if (presign) {

				// Get presigned POST data for file upload
				const response = await fetch(`${presignUrl}?target=${target}&filename=${encodeURIComponent(file.fileName)}`);
				
				if (!response.ok) throw new Error('Failed to get presigned URL');

				const presigned = await response.json();

				file.type = this.fileValidator.getFileType(file.fileName);
				file.fileName = presigned.data.filename;
				uploadUrl = presigned.data.url;

				// Append presigned fields to form data
				Object.entries(presigned.data.fields).forEach(([k, v]) => formData.append(k, v));
			}

			// Append file to form data
			formData.append('file', file.rawFile);

			// Append extra data
			Object.entries(data).forEach(([k, v]) => formData.append(k, v));

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
            const { presignUrl, headers, withCredentials, presign, target } = this;

            // Start with our internal API URL
            let uploadUrl = this.url;
            
            if (presign) {
                /**
                 * Request the Presigned URL from our backend.
                 * Backend expects: ?target=xxx&filename=yyy
                 * Note: Size is usually optional for PUT presigns unless we 
                 * enforce Content-Length headers in S3.
                 */
                const response = await fetch(
                    `${presignUrl}?target=${target}&filename=${encodeURIComponent(file.fileName)}`
                );

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Failed to get presigned URL');
                }

                const presigned = await response.json();
                
                // Update file metadata from server response
                file.type = this.fileValidator.getFileType(file.fileName);
                file.fileName = presigned.data.filename;
                
                // The 'url' returned here is the direct AWS S3 PUT URL
                uploadUrl = presigned.data.url;
            }

            /**
             * Perform the actual PUT upload.
             * For PUT, we send the raw File/Blob as the body.
             * We DO NOT use FormData here.
             */
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: file.rawFile, // Binary body
                headers: {
                    ...headers,
                    // S3 often requires the Content-Type to match what was 
                    // used to generate the presigned URL.
                    'Content-Type': file.rawFile.type || 'application/octet-stream'
                },
                // Credentials are usually NOT sent to S3 direct URLs, 
                // but kept for 'same-origin' if usePresigned is false.
                credentials: usePresigned ? 'omit' : (withCredentials ? 'include' : 'same-origin'),
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload to S3 failed with status: ${uploadResponse.status}`);
            }

            // Mark as successful
            file.status = 'done';
            this.dispatchEvent('done', { file }, true);

        } catch (error) {
            console.error('[Uploader] PUT Error:', error);
            file.status = 'error';
            this.dispatchEvent('error', { message: error.message, file }, true);
        }
	}

	/**
	 * Streams a file to the server using POST with a duplex stream.
	 * Includes built-in Retry logic, Abort (Cancel) capability, and SSE parsing.
	 * * @param {Object} file - The file object (must contain file.rawFile as a Blob/File).
	 * @param {number} attempt - Current retry attempt (internal use).
	 * @returns {Promise<void>}
	 */
	async stream(file, attempt = 0) {

		const MAX_RETRIES = 3;
		const RETRY_DELAY = 2000;

		// Initialize AbortController for this specific file
		// This allows us to cancel the fetch request and the server-side stream.
		file.abortController = new AbortController();
		const { signal } = file.abortController;

		try {
			const { streamUrl, headers, withCredentials, target } = this;
			const contentType = file.rawFile.type || 'application/octet-stream';
			
			// Prepare Metadata (Matching Backend req.query)
			const queryParams = new URLSearchParams({
                filename: file.fileName,
                target: target, 
                totalSize: file.size.toString(),
                type: contentType
            }).toString();

			const uploadUrl = `${streamUrl}?${queryParams}`;

			// Initial UI state change
			if (attempt === 0) {
				file.status = 'uploading';
				this.dispatchEvent('start', { file }, true);
			}

			const response = await fetch(uploadUrl, {
                method: 'POST',
                body: file.rawFile.stream(),
                headers: { ...headers, 'Content-Type': contentType },
                credentials: withCredentials ? 'include' : 'same-origin',
                duplex: 'half',
                signal: signal
            });

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Server responded with ${response.status}`);
			}

			// Read the Response Stream (SSE Parser)
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				// Check if user clicked cancel during the read loop
				if (signal.aborted) throw new Error('AbortError');

				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				
				// SSE blocks are separated by double newlines
				const parts = buffer.split('\n\n');
				buffer = parts.pop(); // Keep partial data for the next read

				for (const part of parts) {
					const isFatal = this.#processSseEvent(part, file);
					// If the backend sent a fatal error (like spoofing), stop retrying.
					if (isFatal) return; 
				}
			}

		} catch (error) {
			// Handle User Cancellation
			if (error.name === 'AbortError' || signal.aborted) {
				console.warn(`[Stream] Upload cancelled by user: ${file.fileName}`);
				file.status = 'cancelled';
				this.dispatchEvent('cancelled', { file }, true);
				return;
			}

			// Handle Retries for network/server hiccups
			if (attempt < MAX_RETRIES) {
				console.warn(`[Stream] Upload error, retrying (${attempt + 1}/${MAX_RETRIES})...`, error);
				
				setTimeout(() => {
					// Ensure we don't retry if the user cancelled while waiting for the timeout
					if (!signal.aborted) {
						this.stream(file, attempt + 1);
					}
				}, RETRY_DELAY * (attempt + 1));
				return;
			}

			// Final Failure
			console.error('[Stream] Final failure after retries:', error);
			file.status = 'error';

			this.dispatchEvent('error', { 
				message: error.message || 'Streaming upload failed', 
				file 
			}, true);
		}
	}

	/**
	 * Unified SSE processor that handles both single-file streams and multi-file multipart uploads.
	 * * @param {string} eventBlock - The raw text block from the server (event: x\ndata: y)
	 * @param {Object|Array} fileContext - The file object or array of file objects being uploaded.
	 * @returns {boolean} - Returns true if a fatal error occurred (used to stop retries).
	 * @private
	 */
	#processSseEvent(eventBlock, fileContext) {
		const lines = eventBlock.split('\n');
		let eventName = '';
		let data = null;

		// Parse the SSE format
		for (const line of lines) {
			if (line.startsWith('event:')) {
				eventName = line.replace('event:', '').trim();
			} else if (line.startsWith('data:')) {
				try {
					data = JSON.parse(line.replace('data:', '').trim());
				} catch (e) {
					console.error('[SSE] JSON Parse Error:', e);
				}
			}
		}

		if (!eventName || !data) return false;

		/**
		 * Helper to find the correct file object.
		 * If fileContext is an array (Multipart), we match by filename.
		 * If fileContext is a single object (Stream), we return it directly.
		 */
		const getTargetFile = (incomingName) => {
			if (Array.isArray(fileContext)) {
				// Find file in the batch by name (matches backend data.filename)
				return fileContext.find(f => f.fileName === incomingName || f.name === incomingName);
			}
			return fileContext;
		};

		// Handle Events
		switch (eventName) {
			case 's3progress': {
				const file = getTargetFile(data.filename);
				if (file) {
					this.dispatchEvent('progress', {
						file,
						loaded: data.loaded,
						total: data.total,
						percentage: data.total ? Math.round((data.loaded / data.total) * 100) : 0
					}, true);
				}
				break;
			}

			case 'done': {
				// Multipart sends an array of results; Stream sends a single object
				if (data.results && Array.isArray(data.results)) {
					data.results.forEach(res => {
						const file = getTargetFile(res.originalName || res.filename);
						if (file) {
							file.status = 'done';
							file.key = res.key;
							file.location = res.location;
						}
					});
				} else {
					// Single stream fallback
					fileContext.status = 'done';
					fileContext.key = data.key;
					fileContext.location = data.location;
				}
				this.dispatchEvent('done', { result: data, file: fileContext }, true);
				break;
			}

			case 'error': {
				const file = getTargetFile(data.file); // Backend sends { message, file } on error
				if (file) {
					file.status = 'error';
				}
				this.dispatchEvent('error', { 
					message: data.message || 'Server error during upload', 
					file 
				}, true);
				
				// Return true to signal the calling function to stop retrying (Fatal)
				return true; 
			}
		}

		return false;
	}

	/**
	 * Public method to cancel an ongoing upload
	 * @param {Object} file 
	 */
	cancelUpload(file) {
		if (file.abortController) {
			file.abortController.abort();
		}
	}

	/**
	 * Uploads one or more files using multipart/form-data.
	 * Works with the Busboy-based backend controller and parses SSE progress.
	 * @param {Array|Object} files - A single file object or an array of file objects.
	 */
	async multipart(files) {
		// Standardize input to an array
		const fileList = Array.isArray(files) ? files : [files];
		
		// Use an AbortController so we can cancel the whole batch
		const controller = new AbortController();
		const { signal } = controller;

		try {
			const { url, headers, withCredentials, target } = this;

			// Prepare Multipart Form Data
			const formData = new FormData();

			fileList.forEach(file => {
				formData.append('files', file.rawFile, file.fileName);
				file.status = 'uploading';
				file.abortController = controller; // Attach controller to each file for UI access
			});

			// Prepare Query Params (Matches backend req.query.target)
			const queryParams = new URLSearchParams({
                target: target
            }).toString();

			const uploadUrl = `${url}/multipart?${queryParams}`;

			this.dispatchEvent('start', { files: fileList }, true);

			// Execute Fetch
			const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData,
                headers,	// Note: Do NOT set Content-Type here.
                credentials: withCredentials ? 'include' : 'same-origin',
                signal: signal
            });

			if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Multipart upload failed`);
            }

			// Read the SSE Response Stream
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const parts = buffer.split('\n\n');
				buffer = parts.pop();

				for (const part of parts) {
					// Reuse your existing SSE processor
					const isFatal = this.#processSseEvent(part, fileList); 
					if (isFatal) return;
				}
			}

		} catch (error) {
			if (error.name === 'AbortError') {
				fileList.forEach(f => f.status = 'cancelled');
				this.dispatchEvent('cancelled', { files: fileList }, true);
				return;
			}

			fileList.forEach(f => f.status = 'error');
            this.dispatchEvent('error', { message: error.message, files: fileList }, true);
		}
	}

}

export default Uploader;