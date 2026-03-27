/**
 * @module build.css.pages
 * @description: Builds and minifies CyberDeck Page-specific SCSS.
 */

import { build } from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

import pkg from '../../package.json' with { type: 'json' };

const VERSION = pkg.version || '1.0.0';

try {

	await build({

		entryPoints: ['src/css/pages/**/*.scss'],
		bundle: true,
		minify: true,
		
		// Match main engine's plugin config
		plugins: [
			sassPlugin({
				loadPaths: ['./src/scss'],
				quietDeps: true
			})
		],

		external: ['/assets/images/*', '/assets/world/*'],
		
		// Crucial: keeps dist structure clean
		outbase: 'src/css/pages', 
		outdir: 'dist/css/page',

		entryNames: '[dir]/[name].min',
		
		banner: {
			css: `/** CyberDeck UI Page v${VERSION} **/`
		},
		
		logLevel: 'info'
	});

	console.log('SCSS Pages built successfully.');

} catch (e) {
	process.exit(1);
}