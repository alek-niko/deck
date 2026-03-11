/**
 * @module js.ui.dom
 * @description Pure, stateless DOM manipulation helpers.
 * 				Focused on smooth animations and common DOM normalizations.
 *
 * All functions are side-effect free regarding external state —
 * they only modify the passed element(s).
 */

/**
 * Collapses an element by smoothly reducing its height to 0.
 *
 * @param {HTMLElement} el - The element to slide up (collapse)
 * @param {number} [duration=300] - Animation duration in milliseconds
 */
export function slideUp(el, duration = 300) {

	// Bail out early if element is already hidden or doesn't exist
	if (!el || getComputedStyle(el).display === 'none') return;

	// Force current computed height so transition has a starting point
	el.style.height = el.offsetHeight + 'px';

	// Prepare properties that will animate
	el.style.transitionProperty = 'height, margin, padding';
	el.style.transitionDuration = `${duration}ms`;
	el.style.boxSizing = 'border-box';
	el.style.overflow = 'hidden';

	// Trigger reflow so browser applies the height before we change it
	el.offsetHeight; // Reflow
	
	// Collapse
	el.style.height = '0';
	el.style.paddingTop = '0';
	el.style.paddingBottom = '0';
	el.style.marginTop = '0';
	el.style.marginBottom = '0';

	// Clean up after animation completes
	setTimeout(() => {
		el.style.display = 'none';

		[
			'height',
			'padding-top',
			'padding-bottom',
			'margin-top',
			'margin-bottom',
			'overflow',
			'transition-duration',
			'transition-property'
		].forEach(p => el.style.removeProperty(p));
		
	}, duration);
}

/**
 * Expands a previously collapsed or hidden element with a smooth height animation.
 *
 * @param {HTMLElement} el - The element to slide down (expand)
 * @param {number} [duration=300] - Animation duration in milliseconds
 */
export function	slideDown(el, duration = 300) {

	if (!el) return;

	// Make sure element is visible so we can measure natural height
	el.style.removeProperty('display');
	let display = window.getComputedStyle(el).display;

	// Most elements should fallback to block if display:none was set
	if (display === 'none') display = 'block';

	el.style.display = display;
	
	// Measure natural height **after** display is restored
	const height = el.offsetHeight;

	// Prepare for animation from 0
	el.style.overflow = 'hidden';
	el.style.height = '0';
	el.style.paddingTop = '0';
	el.style.paddingBottom = '0';

	// Trigger reflow
	el.offsetHeight; // Reflow

	// Set up transition
	el.style.transitionProperty = 'height, margin, padding';
	el.style.transitionDuration = `${duration}ms`;

	// Animate to natural height
	el.style.height = `${height}px`;

	// Clean up transition-related properties after animation
	setTimeout(() => {
		[
			'height',
			'overflow',
			'transition-duration',
			'transition-property'
		].forEach(p => el.style.removeProperty(p));
	}, duration);
}

/**
 * Normalizes `<pre><code>` blocks by removing leading/trailing empty lines
 * and de-indenting the content based on the smallest common indent.
 *
 * Useful when code is coming from markdown renderers, CMS, or user input
 * that often adds inconsistent indentation.
 */
export function fixPreCode() {
	document.querySelectorAll('pre > code').forEach(codeEl => {
		let lines = codeEl.textContent.split('\n');

		// Remove completely empty lines from start and end
		while (lines.length && lines[0].trim() === '') lines.shift();
		while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

		// Find the smallest indent level among non-empty lines
		let minIndent = lines.reduce((min, line) => {
			if (line.trim() === '') return min;
			let match = line.match(/^(\s*)/);
			let indent = match ? match[1].length : 0;
			return min === null ? indent : Math.min(min, indent);
		}, null);

		// De-indent everything by the common minimum
		if (minIndent) lines = lines.map(line => line.slice(minIndent));

		// Write cleaned content back
		codeEl.textContent = lines.join('\n');
	});
}

/**
 * @typedef {Object} DomUtils
 * @property {function(HTMLElement, number=): void} slideUp
 * @property {function(HTMLElement, number=): void} slideDown
 * @property {function(): void} fixPreCode
 */
export const DomUtils = {
	slideUp,
	slideDown,
	fixPreCode,
};