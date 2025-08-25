/**
 * TooltipController - enables data-tooltip elements with optional placement
 * 
 * Usage:
 * <button data-tooltip="Delete" data-placement="top">🗑</button>
 */
export class TooltipController {
	constructor() {
		this.tooltip = this.createTooltipElement();
		document.body.appendChild(this.tooltip);
		this.attachListeners();
	}

	createTooltipElement() {
		const el = document.createElement('div');
		el.className = 'tooltip';
		return el;
	}

	attachListeners() {
		document.addEventListener('pointerenter', this.handlePointerEnter.bind(this), true);
		document.addEventListener('pointerleave', this.handlePointerLeave.bind(this), true);
		document.addEventListener('focusin', this.handlePointerEnter.bind(this), true);
		document.addEventListener('focusout', this.handlePointerLeave.bind(this), true);
	}

	handlePointerEnter(e) {
		const target = e.target.closest('[data-tooltip]');
		if (!target) return;

		const content = target.getAttribute('data-tooltip');
		const placement = target.getAttribute('data-placement') || 'top';

		this.tooltip.textContent = content;
		this.tooltip.className = `tooltip ${placement}`;
		this.tooltip.classList.add('visible');

		this.positionTooltip(target, placement);
	}

	handlePointerLeave() {
		this.tooltip.classList.remove('visible');
	}

	positionTooltip(target, placement) {
		const rect = target.getBoundingClientRect();
		const tip = this.tooltip;
		const offset = 8;

		requestAnimationFrame(() => {
			const tipRect = tip.getBoundingClientRect();

			let top = 0;
			let left = 0;

			switch (placement) {
				case 'top':
					top = rect.top - tipRect.height - offset;
					left = rect.left + rect.width / 2 - tipRect.width / 2;
					break;
				case 'bottom':
					top = rect.bottom + offset;
					left = rect.left + rect.width / 2 - tipRect.width / 2;
					break;
				case 'left':
					top = rect.top + rect.height / 2 - tipRect.height / 2;
					left = rect.left - tipRect.width - offset;
					break;
				case 'right':
					top = rect.top + rect.height / 2 - tipRect.height / 2;
					left = rect.right + offset;
					break;
			}

			// Prevent overflow
			tip.style.top = `${Math.max(top, 0)}px`;
			tip.style.left = `${Math.max(left, 0)}px`;
		});
	}
}

/*
<button data-tooltip="Upload file" data-placement="bottom">Content</button>

*/