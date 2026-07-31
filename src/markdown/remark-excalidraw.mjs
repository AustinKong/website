function rewriteImageUrls(node) {
	if (node?.type === 'image' && typeof node.url === 'string') {
		node.url = node.url.replace(/\.excalidraw(?=([?#]|$))/i, '.generated.svg');
	}

	if (Array.isArray(node?.children)) {
		for (const child of node.children) {
			rewriteImageUrls(child);
		}
	}
}

export default function remarkExcalidraw() {
	return rewriteImageUrls;
}
