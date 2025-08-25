/**
 *  JS Pages ESBuild Configuration File
 * 
 * @description This file contains the configuration for building Page Auth JS using ESBuild.
 * 
 * @see /src/js/pages for input.
 * @see /dist/assets/js/page for output.
 * 
 * @example
 * To run this script, execute the following command in your terminal:
 * npm run build-js-pages
 */

import { build } from 'esbuild';


await build({
    // Entry Points: The main file(s) that ESBuild will process
    entryPoints: ['src/js/pages/**/*.js'],

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
    outdir: 'dist/assets/js/page',

    entryNames: '[dir]/[name].min',
});
