/**
 * Production-grade FAB Controller
 * Handles Speed Dials (Staggered) and Sheets (Dynamic Expansion)
 */
class FabController {
    constructor() {
        this.animDuration = 40; // Base staggering unit
        this.init();
    }

    init() {
        this.initFabSpeedDials();
        this.initFabSheets();
    }

    /**
     * Calculates and applies sequential animation delays
     * @param {HTMLCollection} fabs - The child action buttons
     * @param {boolean} reverse - Whether to stagger from top-down or bottom-up
     */
    _applyStagger(fabs, reverse) {
        const length = fabs.length - 1;
        Array.from(fabs).forEach((fab, index) => {
            const delay = reverse
                ? (length - index) * (this.animDuration / 1.5)
                : index * (this.animDuration / 1.5);
            fab.style.animationDelay = `${delay}ms`;
        });
    }

    initFabSpeedDials() {
        const triggers = document.querySelectorAll('.fab-speed-dial > .fab');

        triggers.forEach(fab => {
            const speedDial = fab.closest('.fab-speed-dial');
            const wrapper = speedDial.querySelector('.fab-wrapper-inner');
            if (!wrapper) return;

            const children = wrapper.children;
            let config = {};

            // Parse configuration from data attribute
            const dataAttr = speedDial.getAttribute('data-fab');
            if (dataAttr) {
                try { config = JSON.parse(dataAttr); } 
                catch (e) { console.warn('Deck UI: Invalid data-fab JSON', dataAttr); }
            }

            if (config.horizontal) speedDial.classList.add('fab-speed-dial-horizontal');

            const animIn = () => {
                this._applyStagger(children, false);
                speedDial.classList.remove('animOut');
                speedDial.classList.add('fab-speed-dial-active', 'animIn');
            };

            const animOut = () => {
                this._applyStagger(children, true);
                speedDial.classList.remove('animIn');
                speedDial.classList.add('animOut');
                // Timeout matches total stagger + base animation
                setTimeout(() => {
                    speedDial.classList.remove('fab-speed-dial-active', 'animOut');
                }, (this.animDuration * children.length) + 200);
            };

            // Toggle Behavior
            if (config.hover) {
                let leaveTimer;
                speedDial.addEventListener('mouseenter', () => {
                    clearTimeout(leaveTimer);
                    animIn();
                });
                speedDial.addEventListener('mouseleave', () => {
                    leaveTimer = setTimeout(animOut, 100);
                });
            } else {
                fab.addEventListener('click', (e) => {
                    if (fab.tagName === 'A' && fab.getAttribute('href') === '#') e.preventDefault();
                    
                    const isActive = speedDial.classList.contains('fab-speed-dial-active');
                    isActive ? animOut() : animIn();
                });
            }
        });
    }

    initFabSheets() {
        const sheets = document.querySelectorAll('.fab-sheet');

        sheets.forEach(sheet => {
            const trigger = sheet.querySelector('.fab-sheet-trigger');
            const actions = sheet.querySelector('.fab-sheet-actions');

            if (!trigger || !actions) return;

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const childrenLength = actions.children.length;
                
                sheet.classList.add('fab-animated');
                
                // Phase 1: Expand Container
                setTimeout(() => {
                    // Calculating 48px per item (padding + height) + container padding
                    sheet.style.width = '240px';
                    sheet.style.height = `${(childrenLength * 44) + 16}px`;
                    sheet.style.borderRadius = '12px';
                }, 40);

                // Phase 2: Reveal Content
                setTimeout(() => {
                    sheet.classList.add('fab-active');
                }, 200);
            });

            // Handle outside click to close
            window.addEventListener('click', (e) => {
                if (sheet.classList.contains('fab-active') && !e.target.closest('.fab-sheet')) {
                    sheet.classList.remove('fab-active');
                    
                    // Contract container back to circle
                    setTimeout(() => {
                        sheet.style.width = '';
                        sheet.style.height = '';
                        sheet.style.borderRadius = '';
                    }, 100);

                    // Final cleanup
                    setTimeout(() => {
                        sheet.classList.remove('fab-animated');
                    }, 300);
                }
            });
        });
    }
}

// Export for framework use
export default new FabController();