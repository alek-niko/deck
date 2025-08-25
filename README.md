# Deck
A modern, lean, and open-source front-end framework.

**Deck** is a modern-only, lean, open-source front-end framework designed for developers who value minimalism, performance, and efficiency. Built entirely with **Vanilla JavaScript** and **Sass**, Deck eliminates unnecessary complexity and delivers a finely tuned environment for building modern web applications.

---

## 🚀 Why Deck?

- **Minimal & Modern:** Focused on minimalism; clean, efficient, and lightweight.  
- **Peak Performance:** Ultra-fast loading speeds and compact bundle size. 
- **No External Dependencies:** Uses system fonts (System UI) and SVG icons to minimize network requests.
- **Customizable with Sass:** Seamless theming and style consistency across components.
- **Streamlined Build Process:** Uses **esbuild** to generate optimized `deck.js` and `deck.css` files.  
---

## 🌟 Core Features
- **Component-Based JS:** A modular, class-based architecture with a global Deck instance for easy component management (register() and autoload()).
- **Tokenized SCSS:** A robust Sass system built on design tokens for effortless theming, dark mode, and responsive design. Includes a library of utility classes, animations, and transform mixins.
- **Pub/Sub System:** A built-in event bus for seamless communication between different components.
- **Real-Time Ready:** Includes optional WebSocket integration for building dynamic, real-time user experiences.
- **Optimized Tooling:** Uses [esbuild](https://esbuild.github.io/) and [esbuild-sass-plugin](https://github.com/glromeo/esbuild-sass-plugin)  for an incredibly fast and simple build process.
---

## 🏗 Core Architecture
The project structure is organized for clarity and scalability.

```text
deck/
├─ build/         # Compiled JS and CSS outputs
├─ images/        # Avatars, logos, photos, SVG illustrations
├─ js/            # JavaScript source files
│  ├─ core/       # Deck core classes and utilities
│  ├─ components/ # UI components (Accordion, Modal, Tab, Lightbox, etc.)
│  ├─ pages/      # Page-specific scripts
│  ├─ ui/         # Layout and UI helpers
│  └─ util/       # Utility functions
├─ scss/          # Sass source files
│  ├─ abstracts/  # Variables, mixins, and tokens
│  ├─ base/       # Base styles, resets, overrides
│  ├─ components/ # Component styles (buttons, cards, modals, forms, tables, tooltips, etc.)
│  ├─ layouts/    # Layout utilities, grids, page areas
│  └─ themes/     # Theme and color schemes (dark mode, palette management)
└─ main.scss      # Entry point for SCSS
```
- **SCSS:** Fully tokenized, responsive, and dark-mode ready  
- **JS:** Component-based, modular, with `Deck.register()` and `Deck.autoload()`  
- **Build:** Uses esbuild to generate optimized `deck.js` and `deck.css` files 

---

## 📦 Getting Started

### 1. Installation

Clone the repository and install the development dependencies.

```bash
git clone https://github.com/alek-niko/deck.git
cd deck
npm install
```

Deck has only 3 dependencies:
- esbuild
- esbuild-sass-plugin
- @material-symbols/svg-300"

### Build scripts:

Run the build commands to compile the source files into the build/ directory.

```bash
# Compile all JavaScript components
npm run build-js

# Compile all SCSS components
npm run build-css
```
---

## 🛠 Usage Example

### SCSS
Import only the components you need into your main stylesheet.

```css
// main.scss
@import "abstracts/tokens";
@import "base/reset";

@import "components/button";
@import "components/card";
@import "layouts/grid";

```
### JavaScript
Initialize the Deck core and register your components. The autoload() method will automatically instantiate components based on data-component attributes in your HTML.


```js
import Deck from './core/Deck.js';
import Modal from './components/Modal.js';
import Lightbox from './components/Lightbox.js';

// Create global instance
window.Deck = new Deck();

// Register components
window.Deck.register({
    'modal': Modal,
    'lightbox': Lightbox
});

// Automatically initialize components on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    window.Deck.autoload();
});

```
---

## 🎬 Demo

Try Deck in action with our live demo:

[Explore the CyberDeck Demo](https://cyberpunk.xyz/deck)

The demo showcases:

- Core UI components like Modals, Tabs, Lightbox, and Accordions  
- Responsive layouts and utility classes  
- Dark mode support and theming  
- Interactive JS features with `Deck.register()` and `Deck.autoload()`

---

## 📄 License

CyberDeck is released under the **GNU General Public License v3 (GPLv3)**.  

> If you received access to this code from any third party, you are required to adhere to the **GPLv3 terms** outlined in the [LICENSE](LICENSE) file accompanying this project.

**Alternative Licensing:** Commercial or proprietary licenses may be available upon request.  
For inquiries about alternative licensing, please reach out via the [contact form](https://cyberpunk.xyz/contact).

---

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-GPLv3-blue)
![Version](https://img.shields.io/badge/version-0.9.0-yellow)