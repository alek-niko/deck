/**
 * @module build.css.pages
 * @description: Builds and minifies separate CSS files from SCSS files in a directory.
 * 
 * @see /src/css/pages for input.
 * @see /dist/css/page for output.
 * 
 * @example <caption>To run this script via npm:</caption>
 * npm run build-css-pages
 */

import { build } from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

try {

	await build({

		// Entry Points: Use a glob pattern to target all individual SCSS files in a folder structure
		entryPoints: ['src/css/pages/**/*.scss'],

		// Activate bundling so that any @import within a page SCSS file is included
		bundle: true,

		// Minify instead of pretty-print.
		minify: true,

		plugins: [
			sassPlugin()
		],

		// Disables automatic esbuild console output
		logLevel: 'silent',

		// Output format should be an ECMAScript Module (required, even for CSS)
		format: 'esm',

		// Ignore resolving external files (like images)
		external: ['/assets/images/*'],

		// Output Directory: Path where the bundled and minified files will be saved
		outdir: 'dist/css/page', // <-- CHANGE: Specifies the output folder

		// Output Naming: This tells ESBuild how to name the files:
		// [dir] preserves the folder structure from 'src/css/pages/'
		// [name] uses the original filename (e.g., 'contact', 'about').
		// .min is added as a suffix.
		entryNames: '[dir]/[name].min',
	});

	console.log('SCSS Pages build completed: Separate .min.css files generated in dist/assets/css/page\n');
	
} catch (error) {

	console.error('SCSS Pages build failed ! \n\n', error);
	
	process.exit(1);
}