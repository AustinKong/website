function escapeHtml(value) {
	return value.replace(/[&<>"']/g, (character) => {
		const entities = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		};

		return entities[character];
	});
}

function extractCaption(value) {
	const frontmatterMatch = value.match(/^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);

	if (!frontmatterMatch) {
		return null;
	}

	const captionMatch = frontmatterMatch[1].match(
		/^\s*caption:\s*(?:"([^"]*)"|'([^']*)'|(.+?))\s*$/m
	);

	if (!captionMatch) {
		return null;
	}

	const caption = captionMatch[1] ?? captionMatch[2] ?? captionMatch[3];
	const remainingFrontmatter = frontmatterMatch[1]
		.split(/\r?\n/)
		.filter((line) => !/^\s*caption:\s*/.test(line))
		.join('\n')
		.trim();

	const diagram = remainingFrontmatter
		? `---\n${remainingFrontmatter}\n---\n${value.slice(frontmatterMatch[0].length)}`
		: value.slice(frontmatterMatch[0].length);

	return { caption, diagram };
}

export default function remarkMermaidCaption() {
	return (tree) => {
		const visit = (nodes) => {
			for (const node of nodes ?? []) {
			if (node.type !== 'code' || node.lang !== 'mermaid') {
				if (node.children) visit(node.children);
				continue;
			}

			const result = extractCaption(node.value);

			if (!result) {
				continue;
			}

			node.type = 'html';
			node.value = [
				'<figure class="mermaid-figure">',
				`<pre class="mermaid">${escapeHtml(result.diagram)}</pre>`,
				`<figcaption>${escapeHtml(result.caption)}</figcaption>`,
				'</figure>',
			].join('');
			delete node.lang;
			delete node.meta;
		}
		};

		visit(tree.children);
	};
}
