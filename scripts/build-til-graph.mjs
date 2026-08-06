import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '@astrojs/markdown-remark';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scriptDirectory, '..');
const sourceRoot = path.resolve(
	process.env.TIL_CONTENT_DIR ??
		path.join(projectRoot, '..', 'today-i-learned', 'notes')
);
const outputPath = path.resolve(
	process.env.TIL_GRAPH_OUTPUT ??
		path.join(projectRoot, '.generated', 'til-graph.json')
);

async function collectEntries(directory) {
	const entries = [];

	for (const item of await readdir(directory, { withFileTypes: true })) {
		const candidate = path.join(directory, item.name);

		if (item.isDirectory()) {
			entries.push(...(await collectEntries(candidate)));
		} else if (item.isFile() && item.name.toLowerCase() === 'index.md') {
			entries.push(candidate);
		}
	}

	return entries;
}

function normalizeTitle(title) {
	return title.trim().toLocaleLowerCase('en');
}

function extractWikiLinks(content) {
	return [...content.matchAll(/\[\[([^\]\n]+)\]\]/g)]
		.map((match) => match[1].split('|', 1)[0].trim())
		.filter(Boolean);
}

function requireString(value, field, entry) {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${entry}: frontmatter "${field}" must be a string.`);
	}

	return value.trim();
}

function requireDraft(value, entry) {
	if (value === undefined) {
		return false;
	}
	if (typeof value !== 'boolean') {
		throw new Error(`${entry}: frontmatter "draft" must be a boolean.`);
	}

	return value;
}

async function buildTilGraph() {
	const entryFiles = (await collectEntries(sourceRoot)).sort();
	const notes = [];
	const notesByTitle = new Map();

	for (const entryFile of entryFiles) {
		const source = await readFile(entryFile, 'utf8');
		const { content, frontmatter } = parseFrontmatter(source);
		const entry = path
			.relative(sourceRoot, entryFile)
			.replaceAll(path.sep, '/');
		const id = entry.replace(/\/index\.md$/i, '');
		const title = requireString(frontmatter.title, 'title', entry);
		const category = requireString(frontmatter.category, 'category', entry);
		const draft = requireDraft(frontmatter.draft, entry);
		const normalizedTitle = normalizeTitle(title);
		const duplicate = notesByTitle.get(normalizedTitle);

		if (duplicate) {
			throw new Error(
				`Duplicate TIL title "${title}" in ${duplicate.entry} and ${entry}.`
			);
		}

		const note = {
			entry,
			content,
			draft,
			node: {
				id,
				title,
				category,
				href: `/til/${id}`,
				draft,
			},
		};
		notes.push(note);
		notesByTitle.set(normalizedTitle, note);
	}

	const edgesById = new Map();

	for (const note of notes) {
		for (const linkedTitle of extractWikiLinks(note.content)) {
			const target = notesByTitle.get(normalizeTitle(linkedTitle));

			if (!target) {
				throw new Error(
					`${note.entry}: wiki-link target "${linkedTitle}" was not found.`
				);
			}
			if (target.node.id === note.node.id) {
				continue;
			}

			const edge = {
				source: note.node.id,
				target: target.node.id,
			};
			edgesById.set(`${edge.source}\0${edge.target}`, edge);
		}
	}

	const graph = {
		version: 1,
		nodes: notes
			.map(({ node }) => node)
			.sort((left, right) => left.id.localeCompare(right.id)),
		edges: [...edgesById.values()].sort(
			(left, right) =>
				left.source.localeCompare(right.source) ||
				left.target.localeCompare(right.target)
		),
	};
	const temporaryOutput = `${outputPath}.tmp`;

	await mkdir(path.dirname(outputPath), { recursive: true });
	await writeFile(
		temporaryOutput,
		`${JSON.stringify(graph, null, 2)}\n`,
		'utf8'
	);
	await rename(temporaryOutput, outputPath);

	console.log(
		`Built TIL graph with ${graph.nodes.length} nodes and ${graph.edges.length} edges.`
	);
	console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
}

try {
	await buildTilGraph();
} catch (error) {
	console.error(`TIL graph generation failed: ${error.message}`);
	process.exitCode = 1;
}
