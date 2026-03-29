/* Engine
██████╗██╗    ██╗██████╗ ███████╗██████╗ ██████╗ ███████╗ ██████╗██╗  ██╗
██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝██║ ██╔╝
██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║  ██║█████╗  ██║     █████╔╝ 
██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██║  ██║██╔══╝  ██║     ██╔═██╗ 
╚██████╗   ██║   ██████╔╝███████╗██║  ██║██████╔╝███████╗╚██████╗██║  ██╗
 ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝*/
/**
 * @module build.engine
 * @description The Unified CyberDeck Build Engine.
 *
 * This script handles Framework Core, Dynamic Components, and Page-specific assets.
 * It supports granular building via CLI flags to optimize Developer Experience.
 * 
 * * @example
 * node build.js			// Build everything
 * node build.js --core		// Build only main framework files
 * node build.js --pages	// Build only page-specific scripts/styles
 * node build.js --watch	// Enter watch mode for development
 */

import { build, context } from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
import { glob } from 'glob';
import { readdirSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Attributes for package metadata.
import pkg from '../../package.json' with { type: 'json' };

// Configuration & CLI Flags
const args			= process.argv.slice(2);

// Switches
const IS_WATCH		= args.includes('--watch');
const IS_PROD		= args.includes('--prod') || !IS_WATCH;
const IS_SPLIT		= args.includes('--split');
const NO_DELAY      = args.includes('--nodelay'); // Switch to skip SFTP sync wait

// Build Targets
const BUILD_CORE	= args.includes('--core') || args.length === 0 || IS_WATCH;
const BUILD_PAGES	= args.includes('--pages') || args.length === 0 || IS_WATCH;

// Paths & Metadata
const BASE_PATH     = '/assets/';					// Centralized Base Path
const DIST_DIR		= join(process.cwd(), 'dist');
const VERSION		= pkg.version || '1.0.0';
const AUTHOR		= pkg.author || 'CyberPunk';
const BUILD_DATE	= new Date().toISOString().split('T')[0];

/**
 * @description Utility to pause execution with a visual countdown. 
 * 				Allow SFTP watchers to sync deletions.
 */
const countdown = async (seconds) => {
	
	if (NO_DELAY) return; // Skip if flag is present

	for (let i = seconds; i > 0; i--) {
		process.stdout.write(`\r--- Syncing with SFTP Watcher: ${i}s remaining... `);
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	process.stdout.write(`\r--- Syncing complete. Launching build...           \n`);
};

/**
 * @description Purges only the assets relevant to the current build flags.
 */
function purgeManagedAssets() {

	// Identify what we are allowed to delete based on flags
	const targets = [];

	if (BUILD_CORE) {
		// Targets the root deck files in js/ and css/
		targets.push(join(DIST_DIR, 'js/deck.min.js'));
		targets.push(join(DIST_DIR, 'css/deck.min.css'));
		// Clean shared chunks if building core
		targets.push(join(DIST_DIR, 'shared')); 
	}

	if (BUILD_PAGES) {
		// Targets the page subdirectories specifically
		targets.push(join(DIST_DIR, 'js/page'));
		targets.push(join(DIST_DIR, 'css/page'));
	}

	console.log(`[Purge] Initializing selective cleanup...`);

	targets.forEach(target => {
		if (existsSync(target)) {
			try {
				// If it's a directory (like /page or /shared), clear it
				// If it's a file (like deck.min.js), delete it
				rmSync(target, { recursive: true, force: true });
				
				// Re-create the directory handles immediately to keep SFTP happy
				if (target.endsWith('page') || target.endsWith('shared')) {
					mkdirSync(target, { recursive: true });
				}
				
				console.log(`  -> Purged: ${target.replace(process.cwd(), '')}`);
			} catch (err) {
				console.warn(`  !! Error purging ${target}: ${err.message}`);
			}
		}
	});
}

/**
 * ENTRY RESOLVER
 * Resolves source paths and maps them to their respective /dist subdirectories.
 */
async function getEntryPoints() {
	
	/**
	 * Entry Point Strategy:
	 * We define our targets based on the flags provided.
	 */
	let entries = [];

	if (BUILD_CORE) {
		// Direct map: src/js/main.js -> dist/js/deck.min.js
		entries.push({ in: 'src/js/main.js', out: 'js/deck' });
		entries.push({ in: 'src/scss/main.scss', out: 'css/deck' });
	}

	if (BUILD_PAGES) {
		// Page-specific JS and SCSS (Automated via Glob)
		// Results in: dist/js/page/*.min.js and dist/css/page/*.min.css
		const jsPages = await glob('src/js/page/**/*.js');
		const scssPages = await glob('src/scss/page/**/*.scss');
		
		// Map pages to preserve directory structure (e.g. js/page/auth/login)
		const mappedJs = jsPages.map(p => ({ 
			in: p, 
			out: p.replace('src/js/', 'js/').replace('.js', '')
		}));
		
		// Preserve nested directory structure for CSS
		const mappedScss = scssPages.map(p => ({ 
			in: p, 
			out: p.replace('src/scss/page/', 'css/page/').replace('.scss', '')
		}));
		
		entries = [...entries, ...mappedJs, ...mappedScss];
	}

	return entries;
}


/**
 * MAIN EXECUTION
 */
async function runBuild() {

	const startTime = Date.now();

	const entries = await getEntryPoints();

	// Always purge based on context flags
	purgeManagedAssets();

	// Wait for SFTP watcher to catch up
	await countdown(2);

	/**
	 * ESBUILD CONFIGURATION
	 * Shared settings for both Framework and Page assets.
	 */
	const config = {

		entryPoints: entries,
		bundle: true,
		minify: IS_PROD,
		splitting: IS_SPLIT,		// Enables code-splitting for () => import() logic
		format: 'esm',				// Required for splitting and modern browser support
		platform: 'browser',
		target: ['es2024'],

		// Adaptive routing for Single File vs Code-Split Pages
		// Adaptive Output: Directory mode is required for Splitting/Page Globbing
		...(IS_SPLIT || entries.length > 1
			? { outdir: 'dist' } 
			: { outfile: 'dist/js/deck.min.js' } // Note: CSS will still need outdir or separate handling in non-split mode
		),

		// chunkNames & publicPath work together for lazy-loading
		publicPath: BASE_PATH, // The base path for dynamic chunk loading

		// Chunks (shared code) are stored in a centralized directory
		chunkNames: '${BASE_PATH}shared/[name]-[hash]',

		// Asset handling (images/fonts referenced in CSS)
		assetNames: '${BASE_PATH}build-assets/[name]-[hash]',

		//entryNames: '[dir]/[name]',
		entryNames: '[dir]/[name].min',

		// Banner implementation: Applied to JS and CSS files
		banner: {
			js: `/**\n * CyberDeck Framework v${VERSION}\n * Build: ${BUILD_DATE}\n * Author: ${AUTHOR}\n * @license MIT\n */`,
			css: `/** CyberDeck v${VERSION} | ${BUILD_DATE} | ${AUTHOR} **/`,
		},

		plugins: [
			sassPlugin({
				// Allows @use "abstracts/variables" without complex relative paths
				loadPaths: ['./src/scss'],
				quietDeps: true	// Silences 3rd party SCSS warnings
			})
		],

		// Tell esbuild to completely ignore the JS-style comment warning in CSS
		logOverride: {
			'js-comment-in-css': 'silent'
		},

		// Treat local statics as external to avoid redundant processing
		// Prevent esbuild from trying to resolve static asset paths
		external: ['${BASE_PATH}images/*'],

		loader: {
			'.png': 'file',
			'.jpg': 'file',
			'.svg': 'file',
			'.woff2': 'file'
		},

		logLevel: 'info',
	};

	try {
		if (IS_WATCH) {
			// Development Mode: Stay alive and watch for changes
			const ctx = await context(config);
			await ctx.watch();
			console.log('CyberDeck: Watch mode active...');

		} else {
			// Production Mode: Standard one-time build
			await build(config);
			const duration = Date.now() - startTime;
			console.log(`\n CyberDeck Build Successful! (${duration}ms)`);

			// --- DEVELOPER NOTIFICATIONS ---
			if (BUILD_CORE && !BUILD_PAGES) {
				console.log('Core bundle built.');
				if (!IS_SPLIT) {
					console.log(' [NON-SPLITTING MODE]: Pages were NOT included.');
					console.log('    To update page assets, please run:');
					console.log('    > npm run build-js-pages');
					console.log('    > npm run build-css-pages');
				}
			}
			
			if (BUILD_CORE) console.log('  -> Core: dist/js/deck.min.js & dist/css/deck.min.css');
			if (BUILD_PAGES) console.log('  -> Pages: dist/js/page/ & dist/css/page/');
			console.log('  -> Assets: dist/assets/shared/ & dist/assets/media/\n');
		}

	} catch (error) {
		console.error('CyberDeck Build Failed:', error);
		process.exit(1);
	}
}

runBuild();