import { exportToSvg, restore } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

window.renderExcalidrawSvg = async (scene, options) => {
	await document.fonts.ready;

	const restored = restore(scene, null, null, {
		refreshDimensions: true,
		repairBindings: true,
	});
	const svg = await exportToSvg({
		elements: restored.elements.filter((element) => !element.isDeleted),
		appState: {
			...restored.appState,
			exportBackground: options.background,
			exportEmbedScene: false,
			exportScale: 1,
			exportWithDarkMode: options.theme === 'dark',
		},
		files: restored.files,
		exportPadding: options.padding,
	});

	return svg.outerHTML;
};

window.excalidrawRendererReady = true;
