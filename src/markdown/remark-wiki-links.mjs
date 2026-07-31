import fs from 'node:fs';

const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
const graphUrl = new URL('../../.generated/til-graph.json', import.meta.url);

function normalizeTitle(title) {
	return title.trim().toLocaleLowerCase('en');
}

function loadNotesByTitle() {
	const graph = JSON.parse(fs.readFileSync(graphUrl, 'utf8'));

	return new Map(graph.nodes.map((note) => [normalizeTitle(note.title), note]));
}

function rewriteWikiLinks(node, notesByTitle) {
	if (!Array.isArray(node?.children) || node.type === 'link') {
		return;
	}

	const children = [];

	for (const child of node.children) {
		if (child.type !== 'text') {
			rewriteWikiLinks(child, notesByTitle);
			children.push(child);
			continue;
		}

		let cursor = 0;

		for (const match of child.value.matchAll(wikiLinkPattern)) {
			if (match.index > cursor) {
				children.push({
					type: 'text',
					value: child.value.slice(cursor, match.index),
				});
			}

			const [title, label] = match[1].split('|', 2).map((part) => part.trim());
			const note = notesByTitle.get(normalizeTitle(title));

			children.push({
				type: 'link',
				url: note.href,
				children: [{ type: 'text', value: label || note.title }],
			});

			cursor = match.index + match[0].length;
		}

		if (cursor === 0) {
			children.push(child);
		} else if (cursor < child.value.length) {
			children.push({ type: 'text', value: child.value.slice(cursor) });
		}
	}

	node.children = children;
}

export default function remarkWikiLinks() {
	const notesByTitle = loadNotesByTitle();

	return (tree) => rewriteWikiLinks(tree, notesByTitle);
}
