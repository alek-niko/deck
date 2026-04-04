/**
 * @module js.components.uploader
 * @description Handles file uploads with support for multiple methods (POST, PUT, STREAM),
 * 				progress tracking, validation, error handling, and integration with UI elements or forms.
 * 				Supports single or multiple file uploads with customizable file type and size limits.
 */

// Import the base Component class from the Component.js file
import Component from './component.js';

/**
 * @class FileValidator
 * @extends Component
 * 
 * Handles file validation logic, including size, type, and stream-based checks.
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

	// todo: Consider image instead of feed. 
	static SPECS = {
		feed:		{ width: 1200, maxSize: 15 * 1024 * 1024, type: 'IMAGE' },
		avatar:		{ width: 400, height: 400, maxSize: 5 * 1024 * 1024, type: 'IMAGE' },
		cover:		{ width: 1500, height: 500, maxSize: 15 * 1024 * 1024, type: 'IMAGE' },
		thumb:		{ width: 200, height: 200, maxSize: 2 * 1024 * 1024, type: 'IMAGE' },
		preview:	{ width: 1200, height: 630, maxSize: 8 * 1024 * 1024, type: 'IMAGE' },
		shorts:		{ maxSize: 100 * 1024 * 1024, maxDuration: 60, type: 'VIDEO' }, // 60s limit
		videos:		{ maxSize: 5 * 1024 * 1024 * 1024, type: 'VIDEO' },
		audio:		{ maxSize: 10 * 1024 * 1024, maxDuration: 300, type: 'AUDIO' }, // 5m limit
		documents:	{ maxSize: 25 * 1024 * 1024, type: 'DOC' }
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

	async getMediaMetadata(file) {
		// Check if the current spec type even supports dimensions
		const specType = this.spec.type; // e.g., 'IMAGE', 'VIDEO', 'AUDIO', 'DOC'
		
		// If it's a DOC or AUDIO, dimensions don't exist. Resolve early.
		if (specType === 'DOC' || specType === 'AUDIO') {
			return { width: 0, height: 0, size: file.size };
		}

		return new Promise((resolve) => {
			const url = URL.createObjectURL(file);
			const isVideo = specType === 'VIDEO';
			const media = isVideo ? document.createElement('video') : new Image();

			if (isVideo) {
				media.preload = 'metadata';
				// Important for some browsers to trigger metadata load
				media.muted = true; 
				media.playsInline = true;

				media.onloadedmetadata = () => {
					const meta = { 
						width: media.videoWidth, 
						height: media.videoHeight, 
						duration: media.duration 
					};
					URL.revokeObjectURL(url);
					resolve(meta);
				};
			} else {
				media.onload = () => {
					const meta = { 
						width: media.naturalWidth, 
						height: media.naturalHeight 
					};
					URL.revokeObjectURL(url);
					resolve(meta);
				};
			}

			media.onerror = () => {
				URL.revokeObjectURL(url);
				resolve(null);
			};
			
			media.src = url;
		});
	}

	async validate(file) {
		const spec = this.spec;

		// Basic Type/Size Checks
		if (!this.isValidType(file)) {
			throw new Error(`Invalid file type. Allowed: ${FileValidator.WHITELIST[spec.type].join(', ')}`);
		}
		
		if (!this.isValidSize(file)) {
			throw new Error(`File is too large. Max: ${spec.maxSize / (1024 * 1024)}MB`);
		}

		// Only check dimensions if the spec defines them
		if (spec.width || spec.height) {
			const meta = await this.getMediaMetadata(file);
			
			if (!meta) throw new Error('Could not read media metadata.');

			// For Avatar/Cover, we usually check for "Exactly" or "Minimum"
			// Let's assume these are Minimum requirements
			if (spec.width && meta.width < spec.width) {
				throw new Error(`Width too small. Required: ${spec.width}px, Found: ${meta.width}px`);
			}
			if (spec.height && meta.height < spec.height) {
				throw new Error(`Height too small. Required: ${spec.height}px, Found: ${meta.height}px`);
			}
			
			file.dimensions = meta;
		}

		return true;
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
			approveUrl: '/api/media/approve',	// {string}			- URL for upload confirmation.
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
		// Only get files that are strictly 'ready'
		const filesToUpload = file ? [file] : this.uploadFiles.filter(f => f.status === 'ready');
		for (const f of filesToUpload) {
			// IMMEDIATELY change status to prevent concurrent loops from picking it up
            f.status = 'uploading';

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
	 * Extracts dimensions from a File or Blob object.
	 * @param {File|Blob} file 
	 * @returns {Promise<{width: number, height: number}>}
	 */
	async getImageDimensions(file) {
		return new Promise((resolve, reject) => {
			if (!file.type.startsWith('image/')) {
				return resolve({ width: 0, height: 0 });
			}

			const img = new Image();
			const url = URL.createObjectURL(file);

			img.onload = () => {
				const dimensions = {
					width: img.naturalWidth,
					height: img.naturalHeight
				};
				URL.revokeObjectURL(url); // Clean up memory immediately
				resolve(dimensions);
			};

			img.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error("Failed to load image for dimension check."));
			};

			img.src = url;
		});
	}

	/**
	 * Posts a file to the server using the POST method and a presigned POST URL.
	 * This method supports multipart form uploads.
	 * @param {Object} file - The file to upload.
	 * @private
	 */
	async post(file) {
		try {
			
			// Collect Metadata (Universal Sensor)
            // We use the unified helper to handle Image, Video, and Audio.
			const meta = await this.fileValidator.getMediaMetadata(file.rawFile);

			// Attach stats to the file object
            file.width = meta?.width || 0;
            file.height = meta?.height || 0;
            file.duration = meta?.duration || 0;
            file.sizeFormatted = (file.size / 1024).toFixed(2) + ' KB';

			console.log(`[Uploader] Preparing ${file.fileName}: ${file.width}x${file.height} (${file.sizeFormatted})`);

			const { presignUrl, approveUrl, data, headers, withCredentials, presign, target } = this;

			let uploadUrl = this.url;
			let formData = new FormData();

			// Get Presigned URL and Reserver record
			if (presign) {

				// We send filename, target, and size so the backend 'guard' can validate the specs.
                const urlParams = new URLSearchParams({
                    target: target,
                    filename: file.fileName,
                    size: file.size,
					width: file.width,
					height: file.height,
					duration: file.duration,
                    mimeType: file.rawFile.type
                }).toString();

				// Get presigned POST data for file upload
				const response = await fetch(`${presignUrl}?${urlParams}`, {
                   //headers: headers // Pass auth headers if needed for the presign request
                });

				if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || 'Failed to get presigned URL');
                }

				const presigned = await response.json();

				// Extract S3 payload and internal Tracking IDs
                const s3Fields = presigned.data?.fields || presigned.fields;
                const s3Url = presigned.data?.url || presigned.url;
                const mediaId = presigned.data?.media_id; // Reserved ID from DB
                const serverName = presigned.data?.filename || presigned.filename; // Sanitized name

				// Update file identity based on server-side sanitization
                file.id = mediaId;
                file.location = s3Fields.key; // The full S3 path (folder/sanitized_name)
                file.fileName = serverName;
                file.type = this.fileValidator.getFileType(serverName);

				uploadUrl = s3Url;

				/**
                 * CRITICAL S3 ORDERING:
                 * S3 requires all policy fields (X-Amz-Signature, etc.) to appear 
                 * in the FormData BEFORE the 'file' field.
                 */
				Object.entries(s3Fields).forEach(([k, v]) => {
					formData.append(k, v);
				});				
			}

			// Append binary file to form data
			formData.append('file', file.rawFile);

			// Append developer-provided data (Only used if NOT uploading to S3)
			if (!presign) {
				Object.entries(data).forEach(([k, v]) => formData.append(k, v));
			}

			// Upload to S3
            // Note: We use 'omit' for credentials when hitting S3 directly.
			const uploadResponse = await fetch(uploadUrl, {
				method: 'POST',
				body: formData,
				headers,
				credentials: withCredentials ? 'include' : 'same-origin',
			});

			if (!uploadResponse.ok) {
				const errorText = await uploadResponse.text();
				console.error('[S3 Error Response]', errorText);
				throw new Error(`Upload failed with status ${uploadResponse.status}`);
			}

			// Backend approval/confirmation
            // This transitions the record from 'pending' to 'approved' in DB.
            if (presign && file.id) {
                const approveResponse = await fetch(`${approveUrl}/${file.id}`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...headers 
                    }
                });

                if (!approveResponse.ok) {
                    throw new Error('Upload succeeded, but backend approval failed.');
                }
            }

			// Finalize status and mark as uploaded successfully
			file.status = 'done';

			// Dispatch event with the fully enriched file object
			this.dispatchEvent('done', { file }, true);

		} catch (error) {
			console.error('[Uploader] Post Error:', error);
            file.status = 'error';
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

			// Collect Metadata (Universal Sensor)
            // Using the validator's helper to ensure cross-type compatibility (Image/Video/Audio)
            const meta = await this.fileValidator.getMediaMetadata(file.rawFile);

			// Attach to the file object
			file.width = meta?.width || 0;
			file.height = meta?.height || 0;
			file.duration = meta?.duration || 0;
			file.sizeFormatted = (file.size / 1024).toFixed(2) + ' KB';

			console.log(`[Uploader] Preparing ${file.fileName} (PUT): ${file.width}x${file.height} (${file.sizeFormatted})`);

			const { presignUrl, approveUrl, headers, withCredentials, presign, target } = this;

			// Start with our internal API URL
			let uploadUrl = this.url;
			
			if (presign) {
				// We send filename, target, and size so the backend 'guard' can validate the specs.
				const urlParams = new URLSearchParams({
                    target: target,
                    filename: file.fileName,
                    size: file.size,
					width: file.width,
					height: file.height,
					duration: file.duration,
                    mimeType: file.rawFile.type
                }).toString();

				/**
				 * Request the Presigned URL from our backend.
				 * Backend expects: ?target=xxx&filename=yyy
				 * Note: Size is usually optional for PUT presigns unless we 
				 * enforce Content-Length headers in S3.
				 */
				const response = await fetch(`${presignUrl}?${urlParams}`, { headers });

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.message || 'Failed to get presigned URL');
				}

				const presigned = await response.json();

				// Extract IDs and Sanitized Filename from backend
                const mediaId = presigned.data?.media_id;
                const serverName = presigned.data?.filename || presigned.filename;
                
				// Update file metadata from server response
                file.id = mediaId;
                file.fileName = serverName;
                file.type = this.fileValidator.getFileType(serverName);

				/**
                 * S3 PUT logic: The location is the S3 Key.
                 * Unlike POST, PUT presigns usually return the key directly in the data object.
                 */
                file.location = presigned.data?.key || (presigned.data?.fields && presigned.data.fields.key);

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
				const errorText = await uploadResponse.text();
				console.error('[S3 PUT Error Response]', errorText);
				throw new Error(`Upload to S3 failed with status: ${uploadResponse.status}`);
			}

			// Backend approval
            // Finalize the 'pending' record in the database
            if (presign && file.id) {
                const approveResponse = await fetch(`${approveUrl}/${file.id}`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...headers 
                    }
                });

                if (!approveResponse.ok) {
                    throw new Error('Upload succeeded, but backend approval failed.');
                }
            }

			// Mark as successful and dispatch
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

			// Collect Metadata (Universal Sensor)
            const meta = await this.fileValidator.getMediaMetadata(file.rawFile);

			// Attach immediate local stats
            file.width = meta?.width || 0;
            file.height = meta?.height || 0;
            file.duration = meta?.duration || 0;
            file.sizeFormatted = (file.size / 1024).toFixed(2) + ' KB';

			const { streamUrl, headers, withCredentials, target } = this;
			const contentType = file.rawFile.type || 'application/octet-stream';

			// Prepare request
            // We pass metadata via query so the backend can use it for the immediate DB 'approved' record
            const queryParams = new URLSearchParams({
                filename: file.fileName,
                target: target, 
                totalSize: file.size.toString(),
                type: contentType,
                width: file.width,
                height: file.height,
                duration: file.duration
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

					/**
                     * processSseEvent should update the 'file' object with 
                     * the final 'location' and 'fileName' once the 'done' event arrives.
                     */
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

			// Metadata collection and preparation
            // We map through the list to gather all metadata concurrently before appending
            await Promise.all(fileList.map(async (file) => {
                const meta = await this.fileValidator.getMediaMetadata(file.rawFile);
                
                // Append metadata to the local file object
                file.width = meta?.width || 0;
                file.height = meta?.height || 0;
                file.duration = meta?.duration || 0;
                file.sizeFormatted = (file.size / 1024).toFixed(2) + ' KB';
                file.status = 'uploading';
                file.abortController = controller;

                /**
                 * Append to Form Data
                 * We append the binary file. Note: If your backend expects 
                 * specific metadata fields per file (like width/height), 
                 * you would append them here as well.
                 */
                formData.append('files', file.rawFile, file.fileName);
            }));

			// Prepare request
            const queryParams = new URLSearchParams({
                target: target // Backend uses this to determine S3 folder and specs
            }).toString();

			const uploadUrl = `${url}/multipart?${queryParams}`;

			this.dispatchEvent('start', { files: fileList }, true);

			// Execute Fetch
			const response = await fetch(uploadUrl, {
				method: 'POST',
				body: formData,
				headers,	// IMPORTANT: Do NOT manually set Content-Type for FormData
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

				if (signal.aborted) throw new Error('AbortError');

				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const parts = buffer.split('\n\n');
				buffer = parts.pop();

				for (const part of parts) {
					/**
                     * #processSseEvent is critical here. It must match 
                     * the 'done' event data to the specific file in the fileList array.
                     */
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

			console.error('[Uploader] Multipart Error:', error);
			fileList.forEach(f => f.status = 'error');
			this.dispatchEvent('error', {
				message: error.message,
				files: fileList
			}, true);
		}
	}

}

export default Uploader;