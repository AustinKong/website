import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
	createExcalidrawRenderer,
	defaultExportOptions,
} from './excalidraw/renderer.mjs';

function printUsage() {
	console.error(
		[
			'Usage: npm run export:excalidraw -- <input.excalidraw> [output.svg]',
			'',
			'Options:',
			'  --background       Use the website surface background (default)',
			'  --no-background    Export with a transparent background',
			'  --theme <theme>    Export theme: light or dark (default: light)',
			'  --padding <pixels> Export padding in pixels (default: 40)',
		].join('\n')
	);
}

function parseArguments(argv) {
	const positional = [];
	const options = { ...defaultExportOptions };

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];

		if (argument === '--background') {
			options.background = true;
		} else if (argument === '--no-background') {
			options.background = false;
		} else if (argument === '--theme') {
			options.theme = argv[++index];
		} else if (argument === '--padding') {
			options.padding = Number(argv[++index]);
		} else if (argument === '--help' || argument === '-h') {
			printUsage();
			process.exit(0);
		} else if (argument.startsWith('-')) {
			throw new Error(`Unknown option: ${argument}`);
		} else {
			positional.push(argument);
		}
	}

	if (!positional[0]) {
		throw new Error('An input .excalidraw file is required.');
	}
	if (!['light', 'dark'].includes(options.theme)) {
		throw new Error('--theme must be either "light" or "dark".');
	}
	if (!Number.isFinite(options.padding) || options.padding < 0) {
		throw new Error('--padding must be a non-negative number.');
	}

	const input = path.resolve(positional[0]);
	const output = path.resolve(
		positional[1] ?? input.replace(/\.excalidraw$/i, '.svg')
	);

	if (!input.toLowerCase().endsWith('.excalidraw')) {
		throw new Error('The input filename must end with .excalidraw.');
	}
	if (!output.toLowerCase().endsWith('.svg')) {
		throw new Error('The output filename must end with .svg.');
	}

	return { input, output, options };
}

async function exportDiagram({ input, output, options }) {
	const renderer = await createExcalidrawRenderer();

	try {
		const svg = await renderer.renderFile(input, options);
		await writeFile(output, svg, 'utf8');
		console.log(`Exported ${path.relative(process.cwd(), input)}`);
		console.log(`      to ${path.relative(process.cwd(), output)}`);
	} finally {
		await renderer.close();
	}
}

try {
	await exportDiagram(parseArguments(process.argv.slice(2)));
} catch (error) {
	console.error(`Excalidraw export failed: ${error.message}`);
	process.exitCode = 1;
}
