import {
	access,
	mkdir,
	readdir,
	rename,
	rm,
	readFile,
	writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const manifestPath = path.join(outputRoot, 'manifest.json');
const cacheVersion = 1;
const rendererInputs = [
	path.join(projectRoot, 'package-lock.json'),
	path.join(scriptDirectory, 'excalidraw', 'browser.js'),
	path.join(scriptDirectory, 'excalidraw', 'index.html'),
	path.join(scriptDirectory, 'excalidraw', 'renderer.mjs'),
];

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

function hash(content) {
	return createHash('sha256').update(content).digest('hex');
}

async function hashFile(file) {
	return hash(await readFile(file));
}

async function getRendererHash() {
	const inputs = await Promise.all(
		rendererInputs.map(async (input) => ({
			path: path.relative(projectRoot, input),
			hash: await hashFile(input),
		}))
	);

	return hash(JSON.stringify({ cacheVersion, inputs }));
}

async function readManifest() {
	try {
		const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

		if (
			manifest?.version === cacheVersion &&
			typeof manifest.rendererHash === 'string' &&
			manifest.assets &&
			typeof manifest.assets === 'object'
		) {
			return manifest;
		}
	} catch {
		// A missing or unreadable manifest simply causes a cache miss.
	}

	return { version: cacheVersion, rendererHash: '', assets: {} };
}

function getOutputRelativePath(input) {
	return path
		.relative(sourceRoot, input)
		.replace(/\.excalidraw$/i, '.svg')
		.replaceAll(path.sep, '/');
}

function getOutputPath(outputRelativePath) {
	const output = path.resolve(outputRoot, outputRelativePath);
	const relativeOutput = path.relative(outputRoot, output);

	if (
		relativeOutput.startsWith(`..${path.sep}`) ||
		path.isAbsolute(relativeOutput)
	) {
		throw new Error(
			`Generated asset path escapes the cache: ${outputRelativePath}`
		);
	}

	return output;
}

async function writeManifest(manifest) {
	const temporaryManifestPath = `${manifestPath}.tmp`;

	await mkdir(outputRoot, { recursive: true });
	await writeFile(
		temporaryManifestPath,
		`${JSON.stringify(manifest, null, '\t')}\n`
	);
	await rename(temporaryManifestPath, manifestPath);
}

async function removeOrphanedOutputs(previousAssets, activeOutputs) {
	for (const asset of Object.values(previousAssets)) {
		if (typeof asset?.output !== 'string' || activeOutputs.has(asset.output)) {
			continue;
		}

		await rm(getOutputPath(asset.output), { force: true });
	}
}

async function prepareTilAssets() {
	if (!(await pathExists(sourceRoot))) {
		throw new Error(`TIL content directory not found: ${sourceRoot}`);
	}

	const files = await collectFiles(sourceRoot);
	const sources = files
		.filter((file) => file.toLowerCase().endsWith('.excalidraw'))
		.sort();
	const [manifest, rendererHash] = await Promise.all([
		readManifest(),
		getRendererHash(),
	]);
	const assets = await Promise.all(
		sources.map(async (input) => {
			const source = path.relative(sourceRoot, input).replaceAll(path.sep, '/');
			const output = getOutputRelativePath(input);
			const sourceHash = await hashFile(input);
			const previousAsset = manifest.assets[source];
			const cached =
				manifest.rendererHash === rendererHash &&
				previousAsset?.sourceHash === sourceHash &&
				previousAsset.output === output &&
				(await pathExists(getOutputPath(output)));

			return { input, source, output, sourceHash, cached };
		})
	);
	const staleAssets = assets.filter((asset) => !asset.cached);
	const activeOutputs = new Set(assets.map((asset) => asset.output));

	if (staleAssets.length > 0) {
		const renderer = await createExcalidrawRenderer();

		try {
			for (const [index, asset] of staleAssets.entries()) {
				const output = getOutputPath(asset.output);
				const temporaryOutput = `${output}.tmp`;
				const svg = await renderer.renderFile(asset.input);

				await mkdir(path.dirname(output), { recursive: true });
				await writeFile(temporaryOutput, svg, 'utf8');
				await rename(temporaryOutput, output);
				console.log(`[${index + 1}/${staleAssets.length}] ${asset.source}`);
			}
		} finally {
			await renderer.close();
		}
	}

	await removeOrphanedOutputs(manifest.assets, activeOutputs);
	await writeManifest({
		version: cacheVersion,
		rendererHash,
		assets: Object.fromEntries(
			assets.map((asset) => [
				asset.source,
				{ sourceHash: asset.sourceHash, output: asset.output },
			])
		),
	});

	console.log(
		`Prepared ${assets.length} generated SVG assets ` +
			`(${staleAssets.length} rendered, ${assets.length - staleAssets.length} cached).`
	);
}

try {
	await prepareTilAssets();
} catch (error) {
	console.error(`TIL asset preparation failed: ${error.message}`);
	process.exitCode = 1;
}
