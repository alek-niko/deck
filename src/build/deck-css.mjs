/**
 * Deck CSS ESBuild Configuration File
 * 
 * @description: This file contains the configuration for building Deck CSS using ESBuild.
 * It defines the entry point, output settings, and various plugins used during the build process.
 * 
 * @see /src/scss/main.scss for input.
 * @see /dist/assets/css/deck.min.css for output.
 */

// Update: Added try..catch block and logLevel: 'silent'

import { build } from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

try {

	await build({

		// Entry Points
		entryPoints: ['src/scss/main.scss'],

		// Activate bundling so that import statements are evaluated and their content inlined
		bundle: true,

		// Minify instead of pretty-print.
		minify: true,

		plugins: [
			sassPlugin()
		],

		// Disables automatic esbuild console output
		logLevel: 'silent',

		// Output format should be an ECMAScript Module
		format: 'esm',

		// Ignore resolving
		external: ['/assets/images/*'],

		// Output from the build
		outfile: 'dist/assets/css/deck.min.css',
	});

	console.log('SCSS build completed: deck.min.css\n');
	
} catch (error) {

	console.error('SCSS build failed ! \n\n', error);
	
	process.exit(1);
}