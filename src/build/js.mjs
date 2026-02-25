/**
 * @module src.build.js
 * @description: This file contains the configuration for building Deck JS using ESBuild.
 * It defines the entry point, output settings, and various plugins used during the build process.
 * 
 * @see /src/js/main.js for input.
 * @see /dist/js/deck.min.js for output.
 * 
 * @example <caption>To run this script via npm:</caption>
 * npm run build-js
 */

import { build } from 'esbuild';
//import gzipPlugin from '@luncheon/esbuild-plugin-gzip'; // or
//import { compressor } from 'esbuild-plugin-compressor';

try {

	await build({

		// Entry Points
		entryPoints: ['src/js/main.js'],

		// Activate bundling so that import statements are evaluated and their content inlined
		bundle: true,

		// Minify instead of pretty-print.
		minify: true,

		// Dead code elimination. Automatically removes unreachable code.
		//treeShaking: true,

		// Use esbuild plugins - reconsider gZip
		// plugins: [
		// 	gzipPlugin({
		// 		gzip: true,
		// 	}),
		// ],

		// Output format should be an ECMAScript Module
		format: 'esm',

		// Output from the build
		outfile: 'dist/js/deck.min.js',

	});

	console.log('JS build completed: deck.min.js\n');

} catch (error) {

	console.error('JS build failed ! \n\n', error);
	
	process.exit(1);
}