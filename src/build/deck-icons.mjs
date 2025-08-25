/**
 * Icons Subset Configuration File		[ Optional ] [ DEPRICATED ]
 * 
 * @description: 
 * 	This file contains the configuration for building the projects SVG icon set.
 * 	Filters and extracts SVG icons from Material Symbols Icon Pack.
 * 	Outputs SCSS configuration
 * 
 * @see /scss/common/_icons.scss for output.
 * @see /scss/component/_icons.scss for usage.
 * 
 * @note We default to Inline SVGs, this is optional.
 * @note If used, run before build-css 
 * 
 * @todo Run automatically
 * 
 */


/*------------------------------------*\
	ICONS				[ EDIT THIS ]
\*------------------------------------*/
/*
 *  Icons to include in deck icon pack
 *  Material Symbols subset 
 * 
 * 	Replace with your filter criteria
 */

const filterValues = [

	'article',
	'autorenew',
	'close',
	'dashboard',
	'dashboard_customize',
	'extension',
	'filter',
	'grid_4x4',
	'hub',
	'menu',
	'menu_open',
	'person',
	'person_add',
	'person_remove',
	'web',
	'keyboard_arrow_down',
	'account_circle',
	'search',
	'more_vert',
	'delete',
	'thumb_up',
	'share',
	'favorite',
	'campaign',
	'keep',
	'save',
	'add',
	'send',
	'mail',
	'mail_lock',
	'check',
	'edit',
	'sync',
	'folder',
	'flag',
	'lock',
	'bell',
	'chat',
	'download',
	'info',
	'warning',
	'report',
	'error',
	'grid_view',
	'filter_list',
	'chevron_right',
	'chevron_backward',
	'home',
	'settings',
];


/*------------------------------------*\
	SOURCE
\*------------------------------------*/
/*
 *  Directory containing the SVG files
 */

const svgDir = './node_modules/@material-symbols/svg-300/outlined';

/*------------------------------------*\
	DESTINATION
\*------------------------------------*/
/*
 *  Output SCSS file 
 * 
 *  $svg-icons
 */

const outputFile = './src/scss/common/_icons.scss';

/*------------------------------------*\
	DISCLAIMER
\*------------------------------------*/

const headerText = `
// This file is generated automatically by a script
// DO NOT EDIT directly, changes will be overwritten
//
// build-conf: ../scss/componnents/_icons.scss 
// build-run: npm run build-icons

`;

/*------------------------------------*\
	CODE START
\*------------------------------------*/

import fs from 'fs';
import path from 'path';

/*------------------------------------*\
	ENERATOR
\*------------------------------------*/
/**
 *  Function to read SVG files and generate SCSS content
 */

async function generateScssFromSvgs() {

	try {

		// Read the SVG directory
		const files = fs.readdirSync(svgDir);

		// Start with the header
		let scssContent = headerText;

		// Begin
		scssContent += '$svg-icons: (\n';

		// Process each SVG file
		for (const file of files) {

			if (path.extname(file) === '.svg') {

				const fileNameWithoutExt = path.basename(file, '.svg');

				// Check if the file should be included based on filter values
				if (!filterValues || filterValues.includes(fileNameWithoutExt)) {

					const filePath = path.join(svgDir, file);
					const svgContent = fs.readFileSync(filePath, 'utf8');

					//const escapedSvgContent = svgContent.replace(/'/g, "\\'").replace(/\n/g, '\\A');
					const escapedSvgContent = svgContent;

					// Append to SCSS content
					scssContent += `	${fileNameWithoutExt}: '${escapedSvgContent}',\n`;
				}
			}
		}

		scssContent += ');\n';

		// Write the SCSS content to a file
		fs.writeFileSync(outputFile, scssContent);

		console.log('SCSS file generated successfully!');

	} catch (error) {

		console.error('Error generating SCSS file:', error);

	}
}

/*------------------------------------*\
	RUN
\*------------------------------------*/

generateScssFromSvgs();