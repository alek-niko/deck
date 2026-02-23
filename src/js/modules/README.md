# Modules Directory

This directory is intended for **extended functionality**, site-specific logic, or higher-level features that sit outside the core UI components. 

Modules in this framework are built using the same architecture as core components (like Accordions or Tabs), allowing them to tap into the global `Deck` state, storage, and event systems.

## Purpose

While `/components` contains atomic UI elements, `/modules` is designed for:
* **Feature Engines**: Systems like User Dashboards, Media Uploaders, or Activity Feeds.
* **Third-Party Hooks**: Integrating external APIs or libraries.
* **Extensibility**: Providing a clean way for developers to add custom logic without modifying the core framework files.

## Module Structure

All modules should extend the base `Component` class. This ensures they inherit features like:
1. **Automatic Configuration**: Parsing of `data-[module-name]` attributes into JS objects.
2. **State Management**: Access to the global Deck state and persistent storage.
3. **Event Helpers**: Simplified event dispatching and listening.

### 1. Create your module
Create a file (e.g., `modules/my-feature.js`):

```javascript
import Component from '../components/component.js';

class MyFeature extends Component {
    constructor(element, options = {}, deck = null) {
        // Define default options
        const defaultOptions = {
            theme: 'dark',
            refreshRate: 5000
        };

        // Merge and set context
        const context = {
            name: 'my-feature',
            element,
            deck,
            ...defaultOptions,
            ...options
        };

        // Initialize base class (triggers config parsing and storage)
        super(context);
        
        this.init();
    }

    init() {
        console.log(`Module initialized with theme: ${this.theme}`);
    }
}

export default MyFeature;