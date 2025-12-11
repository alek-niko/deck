/**
 * @class 
 * @fileoverview A class for dynamically loading JavaScript and CSS bundles using
 *				native JavaScript promises and DOM manipulation.
 *				It manages the loading state of defined plugin bundles to prevent duplicate loading.
 * @todo adapt
 * @note not used
 */
export default class Plugins {
	/**
	 * @private
	 * @type {Object<string, string[]>} The map of plugin bundle IDs to their array of asset URLs.
	 */
	#bundles = {
		// https://github.com/naver/billboard.js
		'billboard': ['/assets/js/plugins/billboard.js/dist/billboard.min.js', '/assets/css/plugins/billboard.min.css'],
		// https://github.com/d3/d3
		'd3': ['/assets/js/plugins/d3/dist/d3.min.js'],
		// https://github.com/chartjs/Chart.js
		'chartjs': ['/assets/js/plugins/chart.js/dist/Chart.min.js'],
		// https://openexchangerates.github.io/accounting.js/
		'accounting': ['/assets/js/plugins/accounting.min.js'],
		// https://github.com/jackmoore/autosize
		'autosize': ['/assets/js/plugins/autosize.min.js'],
		// https://github.com/tuupola/jquery_chained
		'chained': ['/assets/js/plugins/jquery.chained.min.js'],
		// https://github.com/PawelDecowski/jquery-creditcardvalidator
		'creditCardValidator': ['/assets/js/plugins/jQuery-CreditCardValidator/jquery.creditCardValidator.js'],
		// https://github.com/longbill/jquery-date-range-picker
		'daterangepicker': ['/assets/js/plugins/jquery-date-range-picker/dist/jquery.daterangepicker.min.js', '/assets/css/plugins/daterangepicker.min.css'],
		// https://github.com/flatpickr/flatpickr
		'flatpickr': ['/assets/js/plugins/flatpickr/dist/flatpickr.min.js', '/assets/js/plugins/flatpickr/dist/plugins/confirmDate/confirmDate.js', '/assets/js/plugins/flatpickr/dist/plugins/rangePlugin.js', '/assets/js/plugins/flatpickr/dist/flatpickr.min.css', '/assets/css/plugins/flatpickr.min.css'],
		// https://github.com/fronteed/icheck
		'icheck': ['/assets/js/plugins/icheck/icheck.min.js'],
		// https://github.com/RobinHerbots/Inputmask
		'inputmask': ['/assets/js/plugins/inputmask/dist/min/jquery.inputmask.bundle.min.js'],
		// https://github.com/lou/multi-select
		'multiSelect': ['/assets/js/plugins/jquery.multi-select.min.js', '/assets/css/plugins/multiselect.min.css'],
		// https://github.com/IonDen/ion.rangeSlider
		'rangeSlider': ['/assets/js/plugins/ion-rangeslider/js/ion.rangeSlider.min.js', '/assets/css/plugins/range_slider.min.css'],
		// https://github.com/guillaumepotier/Parsley.js
		'parsleyJS': ['/assets/js/plugins/parsleyjs/dist/parsley.min.js'],
		// https://github.com/wbotelhos/raty
		'raty': ['/assets/js/plugins/raty-js/lib/jquery.raty.js', '/assets/css/plugins/raty.min.css'],
		// https://github.com/select2/select2
		'select2': ['/assets/js/plugins/select2/dist/js/select2.min.js', '/assets/js/plugins/select2/dist/css/select2.min.css', '/assets/css/plugins/select2.min.css'],
		// https://github.com/rstaib/jquery-steps
		'steps': ['/assets/js/plugins/jquery.steps.min.js', '/assets/css/plugins/steps.min.css'],
		// https://github.com/abpetkov/switchery
		'switchery': ['/assets/js/plugins/switchery/dist/switchery.min.js', '/assets/css/plugins/switchery.min.css'],
		// https://www.tiny.cloud/
		'tinymce': ['/assets/js/plugins/tinymce/tinymce.min.js'],
		// https://ckeditor.com/ckeditor-5/
		'ckeditor': ['/assets/js/plugins/ckeditor/ckeditor.js'],
		// http://backbonejs.org/
		'backbone': ['/assets/js/plugins/backbone/backbone-min.js'],
		// https://chancejs.com/index.html
		'chancejs': ['/assets/js/plugins/chance.min.js'],
		// https://github.com/zenorocha/clipboard.js
		'clipboard': ['/assets/js/plugins/clipboard/dist/clipboard.min.js'],
		// https://codemirror.net/
		'codemirror': ['/assets/js/plugins/codemirror/lib/codemirror.js', '/assets/js/plugins/codemirror/lib/codemirror.css', '/assets/css/plugins/codemirror.min.css', '/assets/js/plugins/codemirror/theme/material.css'],
		'codemirror-modes': ['/assets/js/plugins/codemirror/mode/htmlmixed/htmlmixed.js', '/assets/js/plugins/codemirror/mode/xml/xml.js', '/assets/js/plugins/codemirror/mode/php/php.js', '/assets/js/plugins/codemirror/mode/clike/clike.js', '/assets/js/plugins/codemirror/mode/javascript/javascript.js'],
		'codemirror-addons': ['/assets/js/plugins/codemirror/addon/display/fullscreen.js', '/assets/js/plugins/codemirror/addon/edit/matchbrackets.js', '/assets/js/plugins/codemirror/addon/edit/matchtags.js', '/assets/js/plugins/codemirror/addon/fold/xml-fold.js', '/assets/js/plugins/codemirror/addon/scroll/simplescrollbars.js', '/assets/js/plugins/codemirror/addon/scroll/simplescrollbars.css'],
		// https://github.com/fengyuanchen/cropper
		'cropper': ['/assets/js/plugins/cropper/dist/cropper.min.js', '/assets/css/plugins/cropper.min.css'],
		// https://datatables.net/
		'datatables': ['node_modules/datatables.net/js/jquery.dataTables.min.js', 'node_modules/datatables.net-responsive/js/dataTables.responsive.min.js', 'assets/js/plugins/datatables/responsive.uikit.min.js', 'assets/js/plugins/datatables/dataTables.uikit.min.js', 'assets/css/plugins/datatables.min.css'],
		'datatables-buttons': ['assets/js/plugins/pdfmake.min.js', 'assets/js/plugins/vfs_fonts.js', 'assets/js/plugins/jszip.min.js', 'node_modules/datatables.net-buttons/js/dataTables.buttons.min.js', 'node_modules/datatables.net-buttons/js/buttons.html5.min.js', 'node_modules/datatables.net-buttons/js/buttons.print.min.js'],
		'datatables-scroller': ['node_modules/datatables.net-scroller/js/dataTables.scroller.min.js'],
		// https://github.com/kpdecker/jsdiff
		'diff-tool': ['/assets/js/plugins/diff/dist/diff.min.js'],
		// https://github.com/kamranahmedse/driver.js
		'driver': ['/assets/js/plugins/driver.js/dist/driver.min.js', '/assets/css/plugins/driver.min.css'],
		// https://github.com/bevacqua/dragula
		'dragula': ['/assets/js/plugins/dragula/dist/dragula.min.js', '/assets/css/plugins/dragula.min.css'],
		// https://github.com/mar10/fancytree
		'fancytree': ['/assets/js/plugins/jquery.fancytree/dist/jquery.fancytree-all-deps.min.js', '/assets/js/plugins/jquery.fancytree.glyphMap.min.js', '/assets/js/plugins/jquery.fancytree/dist/skin-material/ui.fancytree.min.css', '/assets/css/plugins/fancytree.min.css'],
		// http://jasny.github.com/bootstrap/javascript/#fileinput
		'fileinput': ['/assets/js/plugins/uikit.fileinput.min.js'],
		// https://github.com/thegrubbsian/jquery.ganttView
		'gantt-chart': ['/assets/js/plugins/jquery.gantt-chart.js', '/assets/css/plugins/gantt_chart.min.css'],
		// google maps
		'gmaps': [`https://maps.google.com/maps/api/js?key="${deck.config.gmapsKey}"&callback=Function.prototype`, '/assets/js/plugins/gmaps.min.js'],
		// https://github.com/wycats/handlebars.js
		'handlebars': ['/assets/js/plugins/handlebars/dist/handlebars.min.js', '/assets/js/handlebars/handlebars_helpers.min.js'],
		// https://github.com/thorst/jquery-idletimer
		'idle-timeout': ['/assets/js/plugins/idle-timer.min.js'],
		// https://github.com/desandro/imagesloaded
		'imagesLoaded': ['/assets/js/plugins/imagesloaded/imagesloaded.pkgd.min.js'],
		// http://intercoolerjs.org/
		'intercooler': ['/assets/js/plugins/intercooler.min.js'],
		// https://github.com/moment/moment/
		'moment': ['/assets/js/plugins/moment/moment.min.js'],
		// https://jquery.com/
		'jquery': ['/assets/js/plugins/jquery/jquery/jquery.min.js'],
		// https://jqueryui.com/
		'jquery-ui': ['/assets/js/plugins/jquery-ui.min.js'],
		// https://github.com/10bestdesign/jqvmap
		'jqvmap': ['/assets/js/plugins/jqvmap/jquery.vmap.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.world.min.js', '/assets/css/plugins/jqvmap.min.css'],
		'jqvmap-maps': ['/assets/js/plugins/jqvmap/maps/jquery.vmap.algeria.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.argentina.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.australia.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.brazil.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.canada.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.china.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.europe.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.france.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.germany.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.greece.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.india.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.iran.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.iraq.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.poland.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.russia.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.south_america.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.tunisia.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.turkey.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.usa.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.africa.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.asia.min.js', '/assets/js/plugins/jqvmap/maps/jquery.vmap.north_america.min.js'],
		// https://github.com/highlightjs/highlight.js
		'highlightJS': ['/assets/js/plugins/highlight.js/highlight.pack.min.js', '/assets/js/plugins/highlight.js/styles/github.css'],
		// https://github.com/davetayls/jquery.kinetic
		'kinetic': ['/assets/js/plugins/jquery.kinetic.min.js'],
		// https://github.com/javve/list.js
		'listjs': ['/assets/js/plugins/list.js/dist/list.min.js'],
		// https://github.com/esteinborn/jquery-listnav
		'listnav': ['/assets/js/plugins/jquery-listnav.min.js', '/assets/css/plugins/listnav.min.css'],
		// https://github.com/jakerella/jquery-mockjax
		'mockjax': ['/assets/js/plugins/jquery-mockjax/dist/jquery.mockjax.min.js'],
		// https://github.com/unite-cms/uikit3-nestable
		'nestable': ['assets/js/plugins/uikit.nestable.min.js', 'assets/css/plugins/nestable.min.css'],
		// https://github.com/VincentGarreau/particles.js/
		'particlesJS': ['/assets/js/plugins/particles.min.js'],
		// https://github.com/mdbootstrap/perfect-scrollbar
		'perfect-scrollbar': ['/assets/js/plugins/perfect-scrollbar/css/perfect-scrollbar.css', '/assets/js/plugins/perfect-scrollbar/dist/perfect-scrollbar.min.js'],
		// https://github.com/Nickersoft/push.js
		'pushJS': ['/assets/js/plugins/push.js/bin/push.min.js'],
		// https://github.com/leafo/sticky-kit
		'stickyKit': ['/assets/js/plugins/sticky-kit.min.js'],
		// https://github.com/sindresorhus/screenfull.js
		'screenfull': ['node_modules/screenfull/dist/screenfull.js'],
		// https://github.com/atmist/snazzy-info-window
		'snazzy-infowindow': ['/assets/js/plugins/snazzy-info-window/dist/snazzy-info-window.min.js', '/assets/css/plugins/snazzy_infowindow.min.css'],
		// https://github.com/mottie/tablesorter
		'tablesorter': ['/assets/js/plugins/tablesorter/dist/js/jquery.tablesorter.min.js', '/assets/js/plugins/tablesorter/dist/js/extras/jquery.tablesorter.pager.min.js', '/assets/js/plugins/tablesorter/dist/js/jquery.tablesorter.widgets.min.js', '/assets/css/plugins/tablesorter.min.css'],
		'tablesorter-widgets': ['/assets/js/plugins/tablesorter/dist/js/widgets/widget-print.min.js'],
		'tablesorter-pagecontrols': ['/assets/js/plugins/tablesorter-pagercontrols/dist/js/jquery.tablesorter.pager.appendcontrols.english.min.js','/assets/js/plugins/tablesorter-pagercontrols/dist/css/jquery.tablesorter.pager.appendcontrols.css'],
		// https://github.com/nhnent/tui-calendar
		'tui-calendar': ['/assets/js/plugins/tui-calendar/dist/tui-calendar.min.js', '/assets/js/plugins/tui-calendar/dist/tui-calendar.min.css', '/assets/css/plugins/calendar.min.css'],
		// https://github.com/nhnent/tui.date-picker
		'tui-datepicker': ['/assets/js/plugins/tui-date-picker/dist/tui-date-picker.min.js', '/assets/js/plugins/tui-date-picker/dist/tui-date-picker.css'],
		// https://github.com/nhnent/tui.grid
		'tui-grid': ['/assets/js/plugins/tui-grid/dist/tui-grid.min.js', '/assets/js/plugins/tui-grid/dist/tui-grid.min.css', '/assets/css/plugins/data_grid.min.css'],
		// https://github.com/nhnent/tui.pagination
		'tui-pagination': ['/assets/js/plugins/tui-pagination/dist/tui-pagination.min.js'],
		// https://github.com/nhnent/tui.code-snippet
		'tui-snippets': ['/assets/js/plugins/tui-code-snippet.min.js'],
		// https://github.com/nhnent/tui.time-picker
		'tui-timepicker': ['/assets/js/plugins/tui-time-picker/dist/tui-time-picker.min.js', '/assets/js/plugins/tui-time-picker/dist/tui-time-picker.css'],
		// https://github.com/DeuxHuitHuit/quicksearch
		'quicksearch': ['/assets/js/plugins/jquery.quicksearch.min.js'],
		// https://www.npmjs.com/package/xhr-mock
		'xhr-mock': ['/assets/js/plugins/xhr-mock.js'],
		// =========== OTHER ASSETS
		'flagsCSS': ['/assets/css/flags/flags.css'],
		'uikitCSS': ['/assets/js/plugins/uikit/dist/css/uikit.min.css'],
		// https://github.com/hammerjs/hammer.js
		'hammerJS': ['assets/js/plugins/hammer.min.js'],
		// https://github.com/jasonday/printThis
		'printThis': ['assets/js/plugins/printThis.min.js'],
		'swiped': ['assets/js/plugins/swiped.js', 'assets/css/plugins/swiped_list.min.css'],
		'swiper': ['node_modules/swiper/swiper-bundle.js', 'node_modules/swiper/swiper-bundle.min.css'],
		// https://github.com/kylestetz/CLNDR
		'clndr': ['assets/js/plugins/clndr/clndr.min.js', 'assets/css/plugins/clndr.min.css']
	};

	/**
	 * @private
	 * @type {boolean} Flag indicating whether the Plugins class has been initialized.
	 */
	#initialized = false;

	/**
	 * @private
	 * @type {Set<string>} Tracks bundle IDs that have been successfully loaded.
	 */
	#loadedBundles = new Set();

	/**
	 * @private
	 * @type {Map<string, Promise<void>>} Stores the loading Promise for bundles currently in progress.
	 */
	#loadingBundles = new Map();

	/**
	 * Creates an instance of Plugins.
	 * @param {boolean} [init=false] Whether to immediately call the init method.
	 */
	constructor(init = false) {
		if (init) this.init();
	}

	/**
	 * @method init
	 * @description Initializes the plugin system by loading core dependencies (like jQuery).
	 * 				Dispatches the 'deck.plugins.ready' custom event upon successful core loading.
	 * 
	 * @returns {Promise<Plugins>} A promise that resolves with the Plugins instance once initialization is complete.
	 */
	init() {

		if (!this.#initialized) {
			this.#initialized = true;

			return new Promise((resolve, reject) => {
				// Load jQuery first, as many bundles rely on it.
				this.#loadJS('/assets/js/plugins/jquery/jquery.min.js')
					.then(() => {
						// Dispatch event indicating core plugins (like jQuery) are ready.
						document.dispatchEvent(new CustomEvent('deck.plugins.ready'));
						resolve(this);
					})
					.catch(e => reject(new Error('Initial jQuery load failed: ' + e)));
			});

		} else {
			// If already initialized, return a resolved promise immediately.
			return Promise.resolve(this);
		}
	}

	/**
	 * @method loadJS
	 * @description Loads a single JavaScript file by creating and appending a script tag.
	 * @private
	 * 
	 * @param {string} url The URL of the script.
	 * @returns {Promise<void>} A promise that resolves when the script's 'load' event fires.
	 */
	#loadJS(url) {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = url;
			script.async = true; // Use async to prevent blocking page rendering
			script.onload = () => resolve();
			script.onerror = () => reject(new Error(`Failed to load script: ${url}`));

			document.head.appendChild(script);
		});
	}

	/**
	 * @method loadCSS
	 * @description Loads a single CSS file by creating and appending a link tag.
	 * @private
	 * 
	 * @param {string} url The URL of the stylesheet.
	 * @returns {Promise<void>} A promise that resolves when the stylesheet's 'load' event fires.
	 */
	#loadCSS(url) {
		return new Promise((resolve, reject) => {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = url;

			// Although 'load' events for link tags can be unreliable, this is the standard approach.
			link.onload = () => resolve();
			link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));

			document.head.appendChild(link);
		});
	}

	/**
	 * @method loadAsset
	 * @description Determines the asset type (JS or CSS) based on the URL extension and loads it.
	 * 				Handles the special case for the Google Maps URL which lacks a clear extension.
	 * @private
	 * 
	 * @param {string} url The URL of the asset.
	 * @returns {Promise<void>} A promise that resolves when the asset is loaded.
	 */
	#loadAsset(url) {

		// Clean URL by stripping parameters and hashes for reliable extension check
		const cleanUrl = url.split('?')[0].split('#')[0];

		if (cleanUrl.endsWith('.js')) {
			return this.#loadJS(url);
		} else if (cleanUrl.endsWith('.css')) {
			return this.#loadCSS(url);
		} else {
			// Special handling for the Google Maps URL (or similar)
			if (url.includes('googleusercontent.com/maps')) {
				return this.#loadJS(url);
			}
			console.warn(`Unsupported asset type for: ${url}`);
			return Promise.resolve(); // Resolve for unsupported types to not block other assets
		}
	}

	/**
	 * @method load
	 * @description Loads one or more plugin bundles and executes a callback function upon completion.
	 * 				This method handles dependency tracking and prevents duplicate loading.
	 * 
	 * @param {string|string[]} bundleIds - The ID(s) of the bundle(s) to load (e.g., 'billboard' or ['chartjs', 'moment']).
	 * @param {function} [cb] - Optional callback function to execute once ALL specified bundles are loaded (replaces loadjs.ready).
	 * @returns {Promise<void>|void} If no callback is provided, returns a Promise that resolves when loading is complete.
	 */
	load(bundleIds, cb) {
		bundleIds = Array.isArray(bundleIds) ? bundleIds : [bundleIds];

		// An array to hold all promises (newly created and existing ones)
		const allPromises = bundleIds.map(bundleId => {
			// If bundle is already loaded, return a resolved promise
			if (this.#loadedBundles.has(bundleId)) {
				return Promise.resolve();
			}

			// If bundle is currently loading, return the existing promise
			if (this.#loadingBundles.has(bundleId)) {
				return this.#loadingBundles.get(bundleId);
			}

			// Start loading a new bundle
			if (!(bundleId in this.#bundles)) {
				console.log('Plugin not defined: ' + bundleId);
				return Promise.resolve();
			}

			const assetUrls = this.#bundles[bundleId];

			// Create a promise to load all assets concurrently using Promise.all
			const bundlePromise = Promise.all(assetUrls.map(url => this.#loadAsset(url)))
				.then(() => {
					this.#loadedBundles.add(bundleId); // Mark as fully loaded
					this.#loadingBundles.delete(bundleId);
				})
				.catch(error => {
					console.error(`Failed to load bundle ${bundleId}:`, error);
					this.#loadingBundles.delete(bundleId); // Clear tracking map entry even on failure
					throw error; // Propagate the error
				});

			this.#loadingBundles.set(bundleId, bundlePromise);
			return bundlePromise;
		});

		// Aggregate all promises (new loads, pending loads) into one
		const finalPromise = Promise.all(allPromises);

		if (cb) {
			// If a callback is provided (loadjs.ready() equivalent), execute it on success.
			finalPromise
				.then(cb)
				.catch(error => console.error("One or more bundles failed to load before callback execution:", error));
			return; // Return void as the result is handled by the callback
		} else {
			// If no callback is provided (returnPromise: true equivalent), return the promise.
			return finalPromise;
		}
	}

	/**
	 * @method getHandlebarsPartial
	 * @description Fetches a Handlebars partial template from the server.
	 * 				Note: This method is unrelated to plugin loading and uses native XMLHttpRequest.
	 * 
	 * @param {string} name - The name of the Handlebars partial file (without .hbs extension).
	 * @param {any} [data] - Optional data to send with the request.
	 * @returns {Promise<string>} A promise that resolves with the template content (string).
	 */
	getHandlebarsPartial(name, data) {

		return new Promise(function (resolve, reject) {
			var request = new XMLHttpRequest();
			request.onreadystatechange = function () {
				if (request.readyState === XMLHttpRequest.DONE) {
					if (request.status === 200) {
						resolve(request.responseText);
					} else {
						reject(Error(request.statusText));
					}
				}
			};
			request.onerror = function () {
				reject(Error("Network Error"));
			};
			request.open('GET', '/assets/js/handlebars/templates/' + name + '.hbs', true);
			request.responseType = 'text';
			request.send(data);

		}).catch(function (error) {console.log('getHandlebarsPartial error: ' + error.message);throw error; });
	}
}