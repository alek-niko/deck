/**
 * @module src.build.js.pages
 * @description Builds and minifies separate JS files using ESBuild.
 * 
 * @see /src/js/page for input.
 * @see /dist/js/page for output.
 * 
 * @example <caption>To run this script via npm:</caption>
 * npm run build-js-pages
 */

import { build } from 'esbuild';


await build({
    // Entry Points: The main file(s) that ESBuild will process
    entryPoints: ['src/js/page/**/*.js'],

    // Bundle: Combine all dependencies into a single output file
    bundle: true,

    // Minify: Remove whitespace, comments, and shortens variable names to reduce file size
    minify: true,

    // Tree Shaking: This will automatically remove dead code (unreachable code)
    // treeShaking: true, // Uncomment this line if tree shaking is desired

    // Plugins: Used for additional transformations like compression, uncomment to use
    // plugins: [
    //   gzipPlugin({
    //     gzip: true, // Enables gzip compression (if plugin is active)
    //   }),
    // ],

    // Output format: ECMAScript module format for compatibility with other ESM-based projects
    format: 'esm',

    // Output dir: Path where the bundled and minified file(s) will be saved
    outdir: 'dist/js/page',

    entryNames: '[dir]/[name].min',
});
