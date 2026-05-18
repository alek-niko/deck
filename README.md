# Deck

**The High-Performance Micro-Kernel Framework for Modern Web Architects.**

Deck is a "modern-only," lean, zero-dependency JavaScript framework designed for developers who value minimalism, raw performance, and architectural elegance. Built with **Vanilla JS (ESM)** and **Sass**, it provides a reactive, event-driven core without the overhead of heavy abstractions.

---

## 🤔 Why Deck?

- **Minimal & Modern:** Focused on minimalism; clean, efficient, and lightweight.  
- **Micro-Kernel Architecture:** A tiny core engine extended by global Plugins and lazy-loaded Modules.
- **Peak Performance:** Ultra-fast loading speeds and compact bundle size.
- **Hybrid Code-Splitting:** Automatically split heavy features into independent chunks-only load what the current page needs.
- **Memory-Safe by Design:** Automated lifecycle management and tracked event listeners prevent memory leaks. 
- **No External Dependencies:** Uses system fonts (System UI) and SVG icons to minimize network requests.
- **Zero Third-Party Bloat:** No jQuery, no Axios, no Underscore. Just optimized native browser APIs.
- **Customizable with Sass:** Seamless theming and style consistency across components.
- **Unified Build Engine:** Powered by **esbuild**, merging JS and SCSS into a synchronized, high-speed pipeline.

---

## ⭐ Philosophy

Deck automates the “boring parts” of frontend development:

- Component discovery
- State hydration
- Persistence
- Lifecycle cleanup
- Event communication
- Optional real-time connectivity

This allows you to focus purely on building features.

---

## 🏗 Core Architecture

Deck operates on a hierarchical layered system:

| Layer | Class / Concept | Responsibility |
| :--- | :--- | :--- |
| **Event Bus** | `Dispatcher` | Global Pub/Sub, Signal broadcasting, and WSS hooks. |
| **The Kernel** | `Deck` | Global state Proxy, Plugin orchestrator, and DOM observer. |
| **Plugins** | `Service` | Global singletons (Analytics, Toasts, Auth) attached to the instance. |
| **UI Logic** | `Component` | Reactive, persistent, and lifecycle-managed UI modules. |

Each layer extends the one beneath it, forming a scalable and decoupled system.

---


## 🛡 Core Features
- **Component-Based JS:** A modular, class-based architecture with a global Deck instance for easy component management (register() and autoload()).
- **Reactive Global State:** Proxy-based state management with high-performance "Watchers."
- **Smart Hydration:** Automatic discovery of UI components via `data-ui` attributes.
- **Persistent Logic:** Built-in `localStorage` synchronization for components with a single flag.
- **Unified Transitions:** A Promise-based CSS transition engine for seamless `async/await` UI flows.
- **Tokenized SCSS:** A robust Sass system built on design tokens for effortless theming, dark mode, and responsive design. Includes a library of utility classes, animations, and transform mixins.
- **Pub/Sub System:** A built-in event bus for seamless communication between different components.
- **Real-Time Ready:** Includes optional WebSocket integration for building dynamic, real-time user experiences.
- **Optimized Tooling:** Uses [esbuild](https://esbuild.github.io/) and [esbuild-sass-plugin](https://github.com/glromeo/esbuild-sass-plugin)  for an incredibly fast and simple build process.


---

## 📁 Project Structure
The project structure is organized for clarity and scalability.

```text
deck/
├─ build/         # Compiled JS and CSS outputs
├─ images/        # Avatars, logos, photos, SVG illustrations
├─ js/            # JavaScript source files
│  ├─ core/       # Deck core classes and utilities
│  ├─ components/ # UI components (Accordion, Modal, Tab, Lightbox, etc.)
│  ├─ modules/    # Deck modules
│  ├─ plugins/    # Custom system plugins
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
- **JS:** Component-based, modular, with `deck.register()` and `deck.autoload()`  
- **Build:** Uses esbuild to generate optimized `deck.js` and `deck.css` files 

---

## 📦 Getting Started

### Installation

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
# The Unified Build Engine
npm run build
npm run build:split

# Granular Builds
npm run build:core
npm run build:pages

# Combined Split + Pages (The "Full" Production Build)
npm run build:prod

# Development / Watch Mode 
npm run dev

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
import { Deck, Accordion } from './core/deck.js';

const app = new Deck();

app.register({
    'accordion': Accordion,                             // Always bundled
    'uploader': () => import('./modules/Uploader.js')   // Fetched only when needed
});

app.boot();
```
---

## 📚 Documentation

Explore Deck through the official documentation portal and full component preview.
This documentation acts as the authoritative technical reference and a complete showcase of the framework’s UI system.

[ View Documentation ](https://cyberpunk.xyz/deck)

#### Included in the Documentation

- Complete reference for core architecture (Dispatcher, Deck engine, Component layer)
- Full UI component showcase (Modals, Tabs, Lightbox, Accordions, and more)
- Responsive grid system and utility class reference
- Theming system with dark mode implementation
- Practical JavaScript integration examples using `deck.register()` and deck.autoload()`
- Real-world layout compositions and structural patterns

This is not a simple demo environment — it is the living specification of the framework and the canonical implementation reference.

---

## 📄 License

CyberDeck is released under the **GNU General Public License v3 (GPLv3)**.  

> If you received access to this code from any third party, you are required to adhere to the **GPLv3 terms** outlined in the [LICENSE](LICENSE) file accompanying this project.

**Alternative Licensing:** Commercial or proprietary licenses may be available upon request.  
For inquiries about alternative licensing, please reach out via the [contact form](https://cyberpunk.xyz/contact).

---

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-GPLv3-blue)
![Version](https://img.shields.io/badge/version-0.9.9-yellow)