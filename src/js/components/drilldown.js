/**
 * @module js.components.drilldown
 * @description A tiered navigation interface 
 *
 * HTML structure (static, rendered by EJS/server):
 *
 *	<div class="drill" data-drilldown>
 *		<div class="drill-header">
 *			<button class="drill-back" aria-label="Go back">...</button>
 *			<div class="drill-header-info">
 *				<div class="drill-title">Menu</div>
 *				<div class="drill-desc"></div>
 *			</div>
 *		</div>
 *		<div class="drill-body">
 *			<ul class="drill-panel" data-drill-title="Menu" data-drill-desc="...">
 *				<li class="drill-item"><a href="/page">Leaf</a></li>
 *				<li class="drill-item">
 *					<a href="#" data-drill-trigger>...</a>
 *					<ul class="drill-panel" data-drill-title="Section">...</ul>
 *				</li>
 *			</ul>
 *		</div>
 *	</div>
 *
 * On init, JS:
 *	1. Reads the static HTML — no elements created
 *	2. Flattens nested panels into .drill-body as direct siblings
 *	3. Marks the root panel active
 *	4. Transitions between panels using the Web Animations API:
 *		- Both panels go position:absolute during animation
 *		- .drill-body height is locked to the tallest panel for the duration
 *		- On finish, inPanel becomes position:relative (is-active) and
 *		  drives the natural height of .drill-body
 *
 * Lifecycle events (dispatched on this.element, bubbling):
 *	drilldown:beforeopen	{ panel, depth, title }  cancelable
 *	drilldown:open			{ panel, depth, title }
 *	drilldown:beforeback	{ depth }                cancelable
 *	drilldown:back			{ panel, depth, title }
 *	drilldown:reset			{}
 *
 * Public API:
 *	instance.drillTo(panel, trigger?)	— navigate into a panel
 *	instance.back()						— navigate to previous panel
 *	instance.reset()					— return to root instantly
 *	instance.getDepth()					— current depth (0 = root)
 *	instance.getActivePanel()			— currently visible panel element
 */
import Component from './component.js';

class Drilldown extends Component {

	#panels		= [];		// all panels in a flat list, populated by #flatten()
	#stack		= [];		// navigation history: [{ panel, title, desc, trigger }]
	#body		= null;		// .drill-body — clips panels and drives natural height
	#track		= null;		// alias for #body — panels are direct children of .drill-body
	#header		= {};		// { back, title, desc } — cached header elements

	constructor(element, options = {}, deck = null) {

		super({
			name: 'drilldown',
			element,
			deck,
			...options
		});

		this.#setup();
	}

	#setup() {

		// Cache header elements
		this.#header = {
			back:	this.element.querySelector('.drill-back'),
			title:	this.element.querySelector('.drill-title'),
			desc:	this.element.querySelector('.drill-desc'),
		};

		this.#body	= this.element.querySelector('.drill-body');
		this.#track	= this.#body; // panels live directly in .drill-body

		const root  = this.#body?.querySelector('.drill-panel');

		if (!this.#body || !root || !this.#header.back) {
			console.warn('[Drilldown] Invalid structure. Expected .drill-body > .drill-panel inside', this.element);
			return;
		}

		// Move all nested panels up into .drill-body as direct siblings of root
		this.#flatten(root);

		// Seed the navigation stack with the root panel
		this.#stack = [{
			panel:		root,
			title:		root.dataset.drillTitle || '',
			desc:		root.dataset.drillDesc  || '',
			trigger:	null,
		}];

		// Initial header
		this.#setHeader(this.#stack[0].title, this.#stack[0].desc, false);

		// ARIA
		this.#initAria();

		// Events
		this.on('click',	e => this.#onClick(e));
		this.on('keydown',	e => this.#onKeydown(e));
		this.#header.back.addEventListener('click', () => this.back());

		// Show root panel
		root.classList.add('is-active');
	}

	// ── Flatten ───────────────────────────────────────────────────────────────
	// Recursively walks the nested panel tree and moves each child panel into
	// .drill-body as a direct sibling. Depth-first preserves logical order.
	// After flattening, all panels are siblings and none are nested in the DOM.

	#flatten(panel) {

		if (!this.#panels.includes(panel)) {
			this.#panels.push(panel);
		}

		panel.querySelectorAll(':scope > .drill-item > [data-drill-trigger]').forEach(trigger => {
			const child = trigger.parentElement.querySelector(':scope > .drill-panel');
			if (!child) return;

			child._trigger = trigger;		// back-reference so we can find the panel from its trigger
			this.#track.appendChild(child);	// move to track as sibling
			this.#flatten(child);
		});
	}

	// ── ARIA ──────────────────────────────────────────────────────────────────

	#initAria() {
		this.#panels.forEach(panel => {
			panel.setAttribute('role', 'menu');
			panel.querySelectorAll(':scope > .drill-item > a').forEach(link => {
				link.setAttribute('role', 'menuitem');
				if (link.hasAttribute('data-drill-trigger')) {
					link.setAttribute('aria-haspopup', 'true');
					link.setAttribute('aria-expanded', 'false');
				}
			});
		});
	}

	// ── Transition ────────────────────────────────────────────────────────────
	// Animates between two panels using the Web Animations API.
	//
	// Both panels go position:absolute for the duration so neither influences
	// document flow during the animation — this prevents layout jank and the
	// buzzing/trembling artefact that occurs when a position:relative element
	// animates translateX.
	//
	// .drill-body height is locked to the tallest of the two panels before
	// the animation starts, then released on finish so the incoming panel's
	// natural height takes over.

	#transition(outPanel, inPanel, directionIn) {
		const directionOut = directionIn === 'right' ? 'left' : '-right';

		if (!outPanel) {
			inPanel.classList.add('is-active');
			return;
		}

		[outPanel, inPanel].forEach(p => {
			p.classList.remove('is-active', 'is-transitioning');
			p.style.transform = '';
		});

		const inStart = directionIn  === 'right' ?  '100%' : '-100%';
		const outEnd  = directionOut === 'right' ?  '100%' : '-100%';
		const timing  = {
			duration: 300,
			easing:   'cubic-bezier(0.4, 0, 0.2, 1)',
			fill:     'forwards',
		};

		// inPanel drives height (position:relative via is-active)
		// outPanel slides out on top (position:absolute via is-transitioning)
		inPanel.classList.add('is-active');
		outPanel.classList.add('is-transitioning');

		const inAnim  = inPanel.animate(
			[{ transform: `translateX(${inStart})` }, { transform: 'translateX(0)' }],
			timing
		);
		const outAnim = outPanel.animate(
			[{ transform: 'translateX(0)' }, { transform: `translateX(${outEnd})` }],
			timing
		);

		inAnim.onfinish = () => {
			outPanel.classList.remove('is-transitioning');
			outPanel.style.transform = '';
			inPanel.style.transform  = '';
			inAnim.cancel();
			outAnim.cancel();
		};
	}

	// ── Transition ────────────────────────────────────────────────────────────
	// #transition(outPanel, inPanel, directionIn) {
	// 	if (!outPanel) {
	// 		inPanel.classList.add('is-active');
	// 		return;
	// 	}

	// 	[outPanel, inPanel].forEach(p => {
	// 		p.classList.remove('is-active', 'is-transitioning');
	// 		p.style.transform = '';
	// 	});

	// 	const inStart = directionIn === 'right' ?  '100%' : '-100%';
	// 	const outEnd  = directionIn === 'right' ? '-100%' :  '100%';
	// 	const timing  = {
	// 		duration: 300,
	// 		easing:   'cubic-bezier(0.4, 0, 0.2, 1)',
	// 		fill:     'forwards',
	// 	};

	// 	// Lock height BEFORE both panels go absolute
	// 	// Use the taller of the two so nothing clips during transition
	// 	outPanel.classList.add('is-active');
	// 	inPanel.classList.add('is-active');
	// 	const height = Math.max(outPanel.offsetHeight, inPanel.offsetHeight);
	// 	this.#body.style.height = `${height}px`;
	// 	outPanel.classList.remove('is-active');
	// 	inPanel.classList.remove('is-active');

	// 	// Both absolute — no layout influence during animation
	// 	outPanel.classList.add('is-transitioning');
	// 	inPanel.classList.add('is-transitioning');

	// 	const inAnim = inPanel.animate(
	// 		[{ transform: `translateX(${inStart})` }, { transform: 'translateX(0)' }],
	// 		timing
	// 	);
	// 	const outAnim = outPanel.animate(
	// 		[{ transform: 'translateX(0)' }, { transform: `translateX(${outEnd})` }],
	// 		timing
	// 	);

	// 	inAnim.onfinish = () => {
	// 		outPanel.classList.remove('is-transitioning');
	// 		inPanel.classList.remove('is-transitioning');
	// 		inPanel.classList.add('is-active');
	// 		outPanel.style.transform = '';
	// 		inPanel.style.transform  = '';
	// 		this.#body.style.height  = '';
	// 		inAnim.cancel();
	// 		outAnim.cancel();
	// 	};
	// }

	// ── Header ────────────────────────────────────────────────────────────────

	#setHeader(title, desc, showBack) {
		if (this.#header.title) this.#header.title.textContent  = title;
		if (this.#header.desc)  this.#header.desc.textContent   = desc || '';
		if (this.#header.back)  this.#header.back.style.display = showBack ? 'flex' : 'none';
	}

	// ── Focus ─────────────────────────────────────────────────────────────────

	#focusFirst(panel) {
		requestAnimationFrame(() => {
			panel.querySelector('.drill-item:not(.disabled) > a')?.focus();
		});
	}

	#getActiveItems() {
		const active = this.#stack[this.#stack.length - 1]?.panel;
		if (!active) return [];

		return [...active.querySelectorAll(':scope > .drill-item:not(.disabled) > a')];
	}

	// ── Events ────────────────────────────────────────────────────────────────

	#onClick(e) {
		const trigger = e.target.closest('[data-drill-trigger]');
		if (!trigger) return;

		const active = this.#stack[this.#stack.length - 1].panel;
		if (!active.contains(trigger)) return;

		const child = this.#panels.find(p => p._trigger === trigger);
		if (!child) return;

		e.preventDefault();
		e.stopPropagation();
		this.drillTo(child, trigger);
	}

	#onKeydown(e) {
		const items = this.#getActiveItems();
		if (!items.length) return;

		const cur = items.indexOf(document.activeElement);

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				items[cur < items.length - 1 ? cur + 1 : 0].focus();
				break;
			case 'ArrowUp':
				e.preventDefault();
				items[cur > 0 ? cur - 1 : items.length - 1].focus();
				break;
			case 'ArrowRight':
			case 'Enter':
				if (cur === -1) break;
				if (items[cur].hasAttribute('data-drill-trigger')) {
					e.preventDefault();
					const child = this.#panels.find(p => p._trigger === items[cur]);
					if (child) this.drillTo(child, items[cur]);
				}
				break;
			case 'ArrowLeft':
			case 'Escape':
				if (this.#stack.length > 1) { e.preventDefault(); this.back(); }
				break;
			case 'Home': e.preventDefault(); items[0]?.focus(); break;
			case 'End':  e.preventDefault(); items[items.length - 1]?.focus(); break;
		}
	}

	// ── Public API ────────────────────────────────────────────────────────────

	drillTo(panel, trigger = null) {

		const before = new CustomEvent('drilldown:beforeopen', {
			bubbles: true, cancelable: true,
			detail: { panel, depth: this.#stack.length, title: panel.dataset.drillTitle || '' },
		});

		if (!this.element.dispatchEvent(before)) return this;

		trigger?.setAttribute('aria-expanded', 'true');

		this.#stack.push({
			panel,
			title:   panel.dataset.drillTitle || '',
			desc:    panel.dataset.drillDesc  || '',
			trigger,
		});

		const outPanel = this.#stack[this.#stack.length - 2]?.panel;
		this.#transition(outPanel, panel, 'right');
		const top = this.#stack[this.#stack.length - 1];
		this.#setHeader(top.title, top.desc, true);
		this.#focusFirst(panel);

		this.element.dispatchEvent(new CustomEvent('drilldown:open', {
			bubbles: true,
			detail: { panel, depth: this.#stack.length - 1, title: top.title },
		}));

		return this;
	}

	back() {
		if (this.#stack.length <= 1) return this;

		const before = new CustomEvent('drilldown:beforeback', {
			bubbles: true, cancelable: true,
			detail: { depth: this.#stack.length - 1 },
		});

		if (!this.element.dispatchEvent(before)) return this;

		const out = this.#stack.pop();
		const ret = this.#stack[this.#stack.length - 1];

		out.trigger?.setAttribute('aria-expanded', 'false');
		this.#transition(out.panel, ret.panel, 'left');
		this.#setHeader(ret.title, ret.desc, this.#stack.length > 1);

		requestAnimationFrame(() => out.trigger?.focus());

		this.element.dispatchEvent(new CustomEvent('drilldown:back', {
			bubbles: true,
			detail: { panel: ret.panel, depth: this.#stack.length - 1, title: ret.title },
		}));

		return this;
	}

	reset() {
		if (this.#stack.length <= 1) return this;

		this.element.querySelectorAll('[data-drill-trigger][aria-expanded="true"]')
			.forEach(t => t.setAttribute('aria-expanded', 'false'));

		this.#stack = [this.#stack[0]];
		this.#panels.forEach(p => p.classList.remove('is-active', 'is-transitioning'));
		this.#stack[0].panel.classList.add('is-active');
		const root = this.#stack[0];

		this.#setHeader(root.title, root.desc, false);
		this.element.dispatchEvent(new CustomEvent('drilldown:reset', { bubbles: true }));

		return this;
	}

	getDepth()			{ return this.#stack.length - 1; }
	getActivePanel()	{ return this.#stack[this.#stack.length - 1]?.panel ?? null; }

	destroy() {
		this.reset();
		super.destroy();
	}
}

export default Drilldown;