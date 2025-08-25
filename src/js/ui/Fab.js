// WORK IN PROGRESS V1


export default class Fab {


	constructor() {

		this.#init()
	}

	#init() {
		this.initFabSpeedDials()
		this.initFabSheets()
	}

	initFabSpeedDials() {

		const animDuration = 40;
		const triggers = document.querySelectorAll('.fab-speed-dial > .fab');

		const animationDelay = (fabs, reverse) => {
			const length = fabs.length - 1;
			Array.from(fabs).forEach((fab, index) => {
				const delay = reverse
					? (length - index) * (animDuration / 2.2)
					: index * (animDuration / 2.2);
				fab.style.animationDelay = `${delay}ms`;
			});
		};

		const animIn = (speedDial) => {
			speedDial.classList.remove('animOut');
			speedDial.classList.add('fab-speed-dial-active', 'animIn');
		};

		const animOut = (speedDial, fabLength) => {
			speedDial.classList.remove('animIn');
			speedDial.classList.add('animOut');
			setTimeout(() => {
				speedDial.classList.remove('fab-speed-dial-active', 'animOut');
			}, animDuration * fabLength);
		};

		triggers.forEach(fab => {
			const speedDial = fab.closest('.fab-speed-dial');
			const wrapper = speedDial.querySelector('.fab-wrapper-inner');
			if (!wrapper) return;

			const children = wrapper.children;
			let config = speedDial.getAttribute('data-fab');
			if (config) {
				try {
					config = JSON.parse(config);

					if (config.horizontal) {
						speedDial.classList.add('fab-speed-dial-horizontal');
					}

					if (config.hover) {
						let leaveTimer;

						fab.addEventListener('mouseenter', () => {
							clearTimeout(leaveTimer);
							animationDelay(children);
							animIn(speedDial);
						});

						speedDial.addEventListener('mouseleave', () => {
							animationDelay(children, true);
							animOut(speedDial, children.length);
							leaveTimer = setTimeout(() => {
								speedDial.classList.remove('fab-speed-dial-active', 'animOut');
							}, animDuration * children.length);
						});

						return;
					}
				} catch (err) {
					console.warn('Invalid data-fab JSON:', config);
				}
			}

			fab.addEventListener('click', () => {
				const isActive = speedDial.classList.contains('fab-speed-dial-active');
				animationDelay(children, isActive);
				isActive ? animOut(speedDial, children.length) : animIn(speedDial);
			});
		});
	}

	initFabSheets() {
		const sheets = document.querySelectorAll('.fab-sheet');

		sheets.forEach(fab => {
			const trigger = fab.querySelector('.fab-sheet-trigger');
			const actions = fab.querySelector('.fab-sheet-actions');

			if (!trigger || !actions) return;

			trigger.addEventListener('click', (e) => {
				e.stopPropagation(); // prevent window click from firing immediately
				const childrenLength = actions.children.length;
				fab.classList.add('fab-animated');
				setTimeout(() => {
					fab.style.width = '200px';
					fab.style.height = `${childrenLength * 40 + 8}px`;
				}, 140);
				setTimeout(() => {
					fab.classList.add('fab-active');
				}, 280);
			});

			window.addEventListener('click', event => {
				if (!event.target.closest('.fab-sheet')) {
					fab.style.width = '';
					fab.style.height = '';
					fab.classList.remove('fab-active');
					setTimeout(() => {
						fab.classList.remove('fab-animated');
					}, 140);
				}
			});
		});
	}
}