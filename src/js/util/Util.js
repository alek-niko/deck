/**
 * @class Util
 * @classdesc Includes various helper functions.
 * 
 * @todo Remove unnecessary functions.
 */

export default class Util {

	constructor() {	}

	uniqueID() {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for (var i = 0; i < 6; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	randomString(length) {
		length = length >= 1 && length <= 16 ? length : 16; 
	
		const string = String(
			Date.now().toString(24) + Math.random().toString(24)
		).replace(/\./g, '');
	
		return string.substring(string.length - length); 
	}
	
	randomNumber(length) {
		length = length >= 1 && length <= 24 ? length : 24; 
	
		let string = String(
			Date.now().toString() + Math.random().toString()
		).replace(/\./g, '');
		string = shuffle(string);
	
		return string.substring(string.length - length);
	}

	shuffle(string) {
		return [...string].sort(()=>Math.random()-.5).join('');
	}

	isNumber(value) {
		return !isNaN(parseFloat(value)) && isFinite(value);
	}

	isObject(string) {
		return typeof string === 'object' && string !== null && !Array.isArray(string)
	}

	isUrl(string) {
		return /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/gim.test(string)
	}

	isEmail(string) {
		//return /([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)/gim.test(string);

		const emailRegex = /([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)/gim;
		return string.match(emailRegex);
	}

	getHashes(string) {
		//return /([\s>])#(\d*[A-Za-z_]+\d*)\b(?!;)/.test(s)
		string.match(/#([A-Za-z0-9._-]+)/g);
	}

	getMentions(string) {
		return string.match(/@\w+/g);
	}

	capitalize(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	
	camelCase(string) {
		return string
			.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
				return index === 0 ? word.toLowerCase() : word.toUpperCase();
			})
			.replace(/\s+/g, '');
	}
	
	kebabCase(string) {
		return string
			.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
	}

	slug(string) {
		return string
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	async copyToClipboard(text) {
		try {
		  await navigator.clipboard.writeText(text);
		  console.log('Content copied to clipboard');
		} catch (err) {
		  console.error('Failed to copy: ', err);
		}
	}

	validateEmailAddress(email) {
		var pattern = new RegExp(/^(("[\w-+\s]+")|([\w-+]+(?:\.[\w-+]+)*)|("[\w-+\s]+")([\w-+]+(?:\.[\w-+]+)*))(@((?:[\w-+]+\.)*\w[\w-+]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?(25[0-5]\.|2[0-4][\d]\.|1[\d]{2}\.|[\d]{1,2}\.)((25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\.){2}(25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\]?$)/i);
		return pattern.test(email);
	}

	lastUrl(text) {
		let urls = text.match(/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gim);
		return (Array.isArray(urls) && urls.length) ? urls.pop() : undefined
	}

	linkify(text) {
		var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
		return text.replace(urlRegex, function(url) { return '<a href="' + url + '">' + url + '</a>' })
	}

	imageAllowed(image, size=5242880) {

		if (!['jpeg', 'jpg', 'png', 'gif', 'webp'].indexOf(image.name.split(".").pop() == -1 ) ) {
			deck.say('Wrong file type', 'danger');
			return false;
		}

		if (image.size > size) {
			deck.say(`Max File Size is ${size}`, 'danger');
			return false;
		}

		return true
	}
	
	frameYoutube(video, height='300px', width='100%') {
		return $('<iframe>', {
			src: `https://www.youtube.com/embed/${video}`,
			height:'300px', width:'100%', frameborder:0, allowfullscreent:1
		})
	}

	trimHtml(html) {
		let matches = html.match(/ +/g); 
		let initial = matches[0].length;
		let regex = RegExp(`\n {${initial}}`, 'g');
	
		return html.replace(regex, '\n').trim();
	}

	isHtmlString(string) {
		if (typeof string === 'string' && string.indexOf('<') > -1) {
			return true;
		}
	
		return false;
	}

	stringToDom(html) {
		if (html instanceof HTMLElement) {
			return html;
		}
	
		if (this.isHtmlString(html)) {
			const template = document.createElement('template');
			template.innerHTML = html.trim();
	
			return template.content.firstChild;
		}
	
		return null;
	}

	serialize (data) {
		let obj = {};
		for (let [key, value] of data) {
			if (obj[key] !== undefined) {
				if (!Array.isArray(obj[key])) {
					obj[key] = [obj[key]];
				}
				obj[key].push(value);
			} else {
				obj[key] = value;
			}
		}
		return obj;
	}

	escapeHtml = (html) => {
		return html.replace(
			/[&<>'"]/g,
			tag =>
				({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
				'/': '&#x2F;',
				'`': '&#x60;',
				'=': '&#x3D;'
				}[tag] || tag)
			);
	}
	
	unescapeHtml = (html) => {
		return html.replace(
			/&amp;|&lt;|&gt;|&#39;|&quot;|&#x2F;|&#x60;|&#x3D;/g,
			tag =>
				({
				'&amp;': '&',
				'&lt;': '<',
				'&gt;': '>',
				'&quot;': '"',
				'&#39;': "'",
				'&#x2F;': '/',
				'&#x60;': '`',
				'&#x3D;': '='
				}[tag] || tag)
			);
	}

	debounce(func, wait, immediate) {
		var timeout;
		return function () {
			var context = this;
			var args = arguments;
			var later = function () {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	}

	delay(fn, ms) {
		let timer = 0
		return function(...args) {
			clearTimeout(timer)
			timer = setTimeout(fn.bind(this, ...args), ms || 0)
		}
	}

	// For a deep extend, set the first argument to `true`.
	extend (...options) {
		let extended = {};
		let deep = false;
		let i = 0;
		let length = options.length;
	
		// check if a deep merge
		if (typeof options[0] === 'boolean') {
			deep = options[0];
			i ++;
		}
	
		// merge the object into the extended object
		let merge = (obj) => {
			for (const prop in obj) if (Object.prototype.hasOwnProperty.call(obj, prop)) {
				// if deep merge and property is an object, merge properties
				if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
					extended[prop] = this.extend(true, extended[prop], obj[prop]);
				} else {
					extended[prop] = obj[prop];
				}
			}
		};
	
		// loop through each object and conduct a merge
		for (; i < length; i++) {
			let obj = options[i];
			merge(obj);
		}
	
		return extended;
	};

	deepClone(obj) {
		if (obj === null) return null;
	
		let clone = Object.assign({}, obj);
	
		Object.keys(clone).forEach((key) => {
			return clone[key] = typeof obj[key] === 'object' ? this.deepClone(obj[key]) : obj[key];
		});
	
		if (Array.isArray(obj)) {
			clone.length = obj.length;
	
			return Array.from(clone);
		}
	
		return clone;
	};

	findObjectByKey(array, key, value) {
		var object = function () {
			for (var i = 0; i < array.length; i++) {
				if (array[i][key] === value) {
					return array[i];
				}
			}
			return null;
		};
		return Promise.resolve(object()).catch(function (error) {
			console.log('There has been a error: ' + error.message);
			throw error;
		});
	}

	replaceObjectKeys(object, search, replace = '') {
		object = Object.entries(object).map(([key, value]) => {
			key = key == search ? key : key.replace(search, replace)
			key = key.charAt(0).toLowerCase() + key.slice(1);
			return [key, value];
		});
	
		return Object.fromEntries(object);
	}

	parseNestedDatasetKey(keys, value, data) {
		data = data || {};
		let key = keys[0].substr( 0, 1 ).toLowerCase() + keys[0].substr( 1 );

		if (!data[key]) {
			data[key] = {};
		}

		if (keys.length > 1) {
			keys.splice(0, 1);
			data[key] = this.parseNestedDatasetKey(keys, value, data[key]);
		} else {
			data[key] = value;
		}

		return data;
	}

	parseNestedDataset(dataset) {
		let keys = Object.keys(dataset);
		let data = {};
		let value = null;
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			let splat = key.split('-');

			try {
				value = JSON.parse(dataset[key]);
			} catch (error) {
				value = dataset[key];
			}

			data = this.parseNestedDatasetKey(splat, value, data);
		}

		return data;
	}

	generateInitials(name) {
		if (!name || typeof name !== "string") return ""; // Handle null, undefined, or non-string input
	  
		// Trim and split the name by spaces
		const nameParts = name.trim().split(/\s+/);
	  
		if (nameParts.length === 1) {
		  // Single name: return first two letters
		  return nameParts[0].slice(0, 2).toUpperCase();
		}
	  
		// Use the first letter of the first and last name
		const firstInitial = nameParts[0][0]?.toUpperCase() || "";
		const lastInitial = nameParts[nameParts.length - 1][0]?.toUpperCase() || "";
	  
		return firstInitial + lastInitial;
	}

/*
	// Observe element mutations
const observeMutations = (element, callback, options) => {
	const observer = new MutationObserver(mutations =>
	  mutations.forEach(m => callback(m))
	);
	observer.observe(
	  element,
	  Object.assign(
		{
		  childList: true,
		  attributes: true,
		  attributeOldValue: true,
		  characterData: true,
		  characterDataOldValue: true,
		  subtree: true,
		},
		options
	  )
	);
	return observer;
  };


  // Generate UUID (browser)
const UUIDGeneratorBrowser = () =>
	([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
	  (
		c ^
		(crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
	  ).toString(16)
  );

// Serialize form
const serializeForm = form =>
	Array.from(new FormData(form), field =>
	field.map(encodeURIComponent).join('=')
).join('&');

// Form to object
const formToObject = form =>
  Array.from(new FormData(form)).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: value
    }),
    {}
);

// Find closest matching node
const findClosestMatchingNode = (node, selector) => {
	for (let n = node; n.parentNode; n = n.parentNode)
	  if (n.matches && n.matches(selector)) return n;
	return null;
};

// Listen for an event only once
const listenOnce = (el, evt, fn) =>
	el.addEventListener(evt, fn, { once: true });



// Element is focused
const elementIsFocused = el => (el === document.activeElement);

// Select the focused DOM element
const focusedElement = document.activeElement;

// Check if browser tab is focused
const isBrowserTabFocused = () => !document.hidden;

// Element is visible in viewport
const elementIsVisibleInViewport = (el, partiallyVisible = false) => {
	const { top, left, bottom, right } = el.getBoundingClientRect();
	const { innerHeight, innerWidth } = window;
	return partiallyVisible
	  ? ((top > 0 && top < innerHeight) ||
		  (bottom > 0 && bottom < innerHeight)) &&
		  ((left > 0 && left < innerWidth) || (right > 0 && right < innerWidth))
	  : top >= 0 && left >= 0 && bottom <= innerHeight && right <= innerWidth;
};
*/

}