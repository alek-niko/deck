/**
 * @module build.palette
 * @description: This file contains the configuration for building Deck Palette using ESBuild.
 * 
 * @see /src/scss/colors/_palette.scss for input.
 * @see /dist/css/palette.min.css for output.
 * 
 * @example <caption>To run this script via npm:</caption>
 * npm run build-palette
 */

import { build } from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

await build({

	// Entry Points
	entryPoints: ['src/scss/colors/_palette.scss'],

	// Activate bundling so that import statements are evaluated and their content inlined
	bundle: true,

	// Minify instead of pretty-print.
	minify: true,

	plugins: [
		sassPlugin()
	],

	// Output format should be an ECMAScript Module
	format: 'esm',

	// Output from the build
	outfile: 'dist/css/palette.min.css',

});