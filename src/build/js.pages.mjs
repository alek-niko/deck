/**
 * @module build.js.pages
 * @description Builds and minifies CyberDeck Page-specific JS.
 */

import { build } from 'esbuild';
import pkg from '../../package.json' with { type: 'json' };

const VERSION = pkg.version || '1.0.0';

try {

	await build({

		entryPoints: ['src/js/page/**/*.js'],

		bundle: true,
		minify: true,
		format: 'esm',
		platform: 'browser',
		target: ['es2024'],

		// Tree Shaking: This will
		// automatically remove dead code (unreachable code)
		// treeShaking: true, 

		// Plugins: Used for additional transformations like compression, uncomment to use
		// plugins: [
		//   gzipPlugin({
		//     gzip: true, // Enables gzip compression (if plugin is active)
		//   }),
		// ],

		outbase: 'src/js/page', 
		outdir: 'dist/js/page',

		entryNames: '[dir]/[name].min',
		
		banner: {
			js: `/** CyberDeck Page Asset v${VERSION} **/`
		},
		
		logLevel: 'info'
	});

	console.log('JS Pages built successfully.');

} catch (e) {
	process.exit(1);
}
