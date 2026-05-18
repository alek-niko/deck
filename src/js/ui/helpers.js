/**
 * =============================================================================
 * DOM UTILITIES
 * @module js.ui.helpers
 * -----------------------------------------------------------------------------
 * Pure, stateless DOM manipulation helpers. No external dependencies,
 * no side effects beyond the elements passed in.
 *
 * Exports:
 *	slideUp(el, duration?)		- animate element height to 0 then hide
 *	slideDown(el, duration?)	- reveal element and animate to natural height
 *	fixPreCode()				- normalize <pre><code> indentation
 *	resolveEl(target)			- resolve string selector or element to HTMLElement
 *	DomUtils					- named export object (all of the above)
 * =============================================================================
 */

// ─── Reduced motion check ─────────────────────────────────────────────────────
// Read once at module load — avoids a matchMedia call on every animation.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collapses an element by animating its height to 0, then hides it.
 * Respects prefers-reduced-motion — hides instantly when enabled.
 *
 * @param {HTMLElement} el
 * @param {number}		[duration=300] - ms
 */
export function slideUp(el, duration = 300) {
	if (!el) return;

	const style = window.getComputedStyle(el);
	if (style.display === 'none') return;

	// Reduced motion: skip animation, hide immediately
	if (prefersReducedMotion) {
		el.style.display = 'none';
		return;
	}

	// Lock to current height so transition has a start point
	el.style.height        = `${el.offsetHeight}px`;
	el.style.overflow      = 'hidden';
	el.style.boxSizing     = 'border-box';
	el.style.transitionProperty = 'height, padding, margin';
	el.style.transitionDuration = `${duration}ms`;

	// Force reflow so browser registers the start state
	void el.offsetHeight;

	// Animate to collapsed
	el.style.height        = '0';
	el.style.paddingTop    = '0';
	el.style.paddingBottom = '0';
	el.style.marginTop     = '0';
	el.style.marginBottom  = '0';

	setTimeout(() => {
		el.style.display = 'none';

		[
			'height', 'overflow', 'box-sizing',
			'padding-top', 'padding-bottom',
			'margin-top', 'margin-bottom',
			'transition-property', 'transition-duration',
		].forEach(p => el.style.removeProperty(p));
	}, duration);
}

/**
 * Reveals a hidden element and animates its height to its natural size.
 * Respects prefers-reduced-motion — shows instantly when enabled.
 *
 * @param {HTMLElement} el
 * @param {number}      [duration=300] - ms
 */
export function slideDown(el, duration = 300) {
	if (!el) return;

	// Reduced motion: show immediately
	if (prefersReducedMotion) {
		el.style.removeProperty('display');
		if (window.getComputedStyle(el).display === 'none') {
			el.style.display = 'block';
		}
		return;
	}

	// Restore display so we can measure natural height
	el.style.removeProperty('display');
	const display = window.getComputedStyle(el).display;
	if (display === 'none') el.style.display = 'block';

	const targetHeight = el.offsetHeight;

	// Start from collapsed state
	el.style.height        = '0';
	el.style.overflow      = 'hidden';
	el.style.paddingTop    = '0';
	el.style.paddingBottom = '0';
	el.style.boxSizing     = 'border-box';

	// Force reflow
	void el.offsetHeight;

	// Animate to natural height
	el.style.transitionProperty = 'height, padding';
	el.style.transitionDuration = `${duration}ms`;
	el.style.height             = `${targetHeight}px`;

	el.style.removeProperty('padding-top');
	el.style.removeProperty('padding-bottom');

	setTimeout(() => {
		['height', 'overflow', 'box-sizing',
		 'transition-property', 'transition-duration'].forEach(p => {
			el.style.removeProperty(p);
		});
	}, duration);
}

/**
 * Normalizes indentation in <pre><code> blocks.
 * Removes leading/trailing empty lines and de-indents by the minimum
 * common indent level. Safe to call on every page load.
 *
 * @param {Document|HTMLElement} [root=document]
 */
export function fixPreCode(root = document) {
	root.querySelectorAll('pre > code').forEach(code => {
		let lines = code.textContent.split('\n');

		// Strip leading and trailing blank lines
		while (lines.length && lines[0].trim() === '')             lines.shift();
		while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

		// Find minimum indent among non-empty lines
		const minIndent = lines.reduce((min, line) => {
			if (line.trim() === '') return min;
			const indent = line.match(/^(\s*)/)[1].length;
			return min === null ? indent : Math.min(min, indent);
		}, null);

		// De-indent
		if (minIndent) lines = lines.map(l => l.slice(minIndent));

		code.textContent = lines.join('\n');
	});
}

/**
 * Resolves a CSS selector string or HTMLElement to an HTMLElement.
 * Returns null if nothing matches.
 *
 * @param {string|HTMLElement|null} target
 * @returns {HTMLElement|null}
 */
export function resolveEl(target) {
	if (!target) return null;
	if (target instanceof HTMLElement) return target;
	if (typeof target === 'string') return document.querySelector(target);
	return null;
}

/**
 * Named export object — same API, object style.
 * Useful for: import { DomUtils } from './helpers.js'
 */
export const DomUtils = {
	slideUp,
	slideDown,
	fixPreCode,
	resolveEl,
};