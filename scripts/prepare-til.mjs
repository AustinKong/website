import {
	access,
	mkdir,
	readdir,
	rename,
	rm,
	writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createExcalidrawRenderer } from './excalidraw/renderer.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scriptDirectory, '..');
const sourceRoot = path.resolve(
	process.env.TIL_CONTENT_DIR ??
		path.join(projectRoot, '..', 'today-i-learned', 'notes')
);
const outputRoot = path.join(projectRoot, '.generated', 'til-assets');

async function pathExists(candidate) {
	try {
		await access(candidate);
		return true;
	} catch {
		return false;
	}
}

async function collectFiles(directory) {
	const files = [];

	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const candidate = path.join(directory, entry.name);

		if (entry.isDirectory()) {
			files.push(...(await collectFiles(candidate)));
		} else if (entry.isFile()) {
			files.push(candidate);
		}
	}

	return files;
}

async function prepareTilAssets() {
	if (!(await pathExists(sourceRoot))) {
		throw new Error(`TIL content directory not found: ${sourceRoot}`);
	}

	const files = await collectFiles(sourceRoot);
	const sources = files
		.filter((file) => file.toLowerCase().endsWith('.excalidraw'))
		.sort();

	await rm(outputRoot, { recursive: true, force: true });

	if (sources.length === 0) {
		console.log('No Excalidraw sources found.');
		return;
	}

	const renderer = await createExcalidrawRenderer();

	try {
		for (const [index, input] of sources.entries()) {
			const output = path
				.join(outputRoot, path.relative(sourceRoot, input))
				.replace(/\.excalidraw$/i, '.svg');
			const temporaryOutput = `${output}.tmp`;
			const svg = await renderer.renderFile(input);

			await mkdir(path.dirname(output), { recursive: true });
			await writeFile(temporaryOutput, svg, 'utf8');
			await rename(temporaryOutput, output);
			console.log(
				`[${index + 1}/${sources.length}] ${path.relative(sourceRoot, input)}`
			);
		}
	} finally {
		await renderer.close();
	}

	console.log(`Prepared ${sources.length} generated SVG assets.`);
}

try {
	await prepareTilAssets();
} catch (error) {
	console.error(`TIL asset preparation failed: ${error.message}`);
	process.exitCode = 1;
}
