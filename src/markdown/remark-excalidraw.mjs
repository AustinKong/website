import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const sourceRoot = path.resolve(
	process.env.TIL_CONTENT_DIR ??
		path.join(projectRoot, '..', 'today-i-learned', 'notes')
);
const outputRoot = path.join(projectRoot, '.generated', 'til-assets');

function rewriteImageUrls(node, entryPath) {
	if (node?.type === 'image' && typeof node.url === 'string') {
		const [sourceUrl, suffix = ''] = node.url.split(/(?=[?#])/s, 2);

		if (sourceUrl.toLowerCase().endsWith('.excalidraw')) {
			const sourcePath = path.resolve(path.dirname(entryPath), sourceUrl);
			const relativeSource = path.relative(sourceRoot, sourcePath);

			if (
				relativeSource.startsWith(`..${path.sep}`) ||
				path.isAbsolute(relativeSource)
			) {
				throw new Error(
					`Excalidraw source is outside TIL content: ${sourceUrl}`
				);
			}

			const outputPath = path
				.join(outputRoot, relativeSource)
				.replace(/\.excalidraw$/i, '.svg');
			node.url =
				path
					.relative(path.dirname(entryPath), outputPath)
					.replaceAll(path.sep, '/') + suffix;
		}
	}

	if (Array.isArray(node?.children)) {
		for (const child of node.children) {
			rewriteImageUrls(child, entryPath);
		}
	}
}

export default function remarkExcalidraw() {
	return (tree, file) => {
		const entryPath = file.path ?? file.history[0];

		if (!entryPath) {
			throw new Error(
				'Cannot resolve Excalidraw image without a Markdown path.'
			);
		}

		rewriteImageUrls(tree, entryPath);
	};
}
