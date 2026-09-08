interface Point {
	x: number;
	y: number;
}

interface ViewportMetrics {
	baseLeft: number;
	baseTop: number;
	width: number;
	height: number;
}

interface MermaidViewport {
	container: HTMLElement;
	svg: SVGSVGElement | null;
	naturalWidth: number;
	naturalHeight: number;
	minimumScale: number;
	scale: number;
	x: number;
	y: number;
	pointers: Map<number, Point>;
	panOrigin: Point | null;
	panOffset: Point | null;
	pinchDistance: number;
	pinchScale: number;
	pinchWorldPoint: Point | null;
	resizeObserver: ResizeObserver;
}

const viewports = new WeakMap<HTMLElement, MermaidViewport>();

function clamp(value: number, minimum: number, maximum: number) {
	return Math.min(maximum, Math.max(minimum, value));
}

function getContentPoint(
	container: HTMLElement,
	clientX: number,
	clientY: number
) {
	const rect = container.getBoundingClientRect();
	const styles = getComputedStyle(container);

	return {
		x: clientX - rect.left - parseFloat(styles.paddingLeft),
		y: clientY - rect.top - parseFloat(styles.paddingTop),
	};
}

function getMetrics(viewport: MermaidViewport): ViewportMetrics {
	const styles = getComputedStyle(viewport.container);
	const width =
		viewport.container.clientWidth -
		parseFloat(styles.paddingLeft) -
		parseFloat(styles.paddingRight);
	const height =
		viewport.container.clientHeight -
		parseFloat(styles.paddingTop) -
		parseFloat(styles.paddingBottom);

	return {
		baseLeft: Math.max(0, (width - viewport.naturalWidth) / 2),
		// The SVG uses horizontal auto margins, but its normal vertical position
		// remains at the top of the viewport.
		baseTop: 0,
		width,
		height,
	};
}

function constrain(viewport: MermaidViewport) {
	const metrics = getMetrics(viewport);
	const scaledWidth = viewport.naturalWidth * viewport.scale;
	const scaledHeight = viewport.naturalHeight * viewport.scale;

	if (scaledWidth <= metrics.width) {
		viewport.x = (metrics.width - scaledWidth) / 2 - metrics.baseLeft;
	} else {
		viewport.x = clamp(
			viewport.x,
			metrics.width - scaledWidth - metrics.baseLeft,
			-metrics.baseLeft
		);
	}

	if (scaledHeight <= metrics.height) {
		viewport.y = (metrics.height - scaledHeight) / 2 - metrics.baseTop;
	} else {
		viewport.y = clamp(
			viewport.y,
			metrics.height - scaledHeight - metrics.baseTop,
			-metrics.baseTop
		);
	}
}

function render(viewport: MermaidViewport) {
	if (!viewport.svg) return;

	constrain(viewport);
	viewport.svg.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`;
	viewport.container.setAttribute(
		'aria-label',
		`Interactive Mermaid diagram, ${Math.round(viewport.scale * 100)}% zoom. Drag to pan; scroll or pinch to zoom.`
	);
}

function updateLayout(viewport: MermaidViewport, forceFit = false) {
	if (!viewport.svg || viewport.naturalWidth <= 0) return;

	const wasFitted =
		forceFit ||
		Math.abs(viewport.scale - viewport.minimumScale) < Number.EPSILON * 10;
	const metrics = getMetrics(viewport);
	const nextMinimumScale = Math.min(1, metrics.width / viewport.naturalWidth);
	const styles = getComputedStyle(viewport.container);
	const nonContentHeight =
		parseFloat(styles.paddingTop) +
		parseFloat(styles.paddingBottom) +
		parseFloat(styles.borderTopWidth) +
		parseFloat(styles.borderBottomWidth);
	const nextHeight = `${viewport.naturalHeight * nextMinimumScale + nonContentHeight}px`;

	if (viewport.container.style.height !== nextHeight) {
		viewport.container.style.height = nextHeight;
	}

	viewport.minimumScale = nextMinimumScale;
	if (wasFitted || viewport.scale < nextMinimumScale) {
		viewport.scale = nextMinimumScale;
	}
	render(viewport);
}

function zoomAt(viewport: MermaidViewport, nextScale: number, point: Point) {
	if (!Number.isFinite(nextScale) || nextScale <= 0) return;

	const metrics = getMetrics(viewport);
	const worldX = (point.x - metrics.baseLeft - viewport.x) / viewport.scale;
	const worldY = (point.y - metrics.baseTop - viewport.y) / viewport.scale;

	viewport.scale = Math.max(nextScale, viewport.minimumScale);
	viewport.x = point.x - metrics.baseLeft - worldX * viewport.scale;
	viewport.y = point.y - metrics.baseTop - worldY * viewport.scale;
	render(viewport);
}

function midpoint(points: Point[]) {
	return {
		x: (points[0].x + points[1].x) / 2,
		y: (points[0].y + points[1].y) / 2,
	};
}

function distance(points: Point[]) {
	return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
}

function startPinch(viewport: MermaidViewport) {
	const points = [...viewport.pointers.values()];
	if (points.length !== 2) return;

	const center = midpoint(points);
	const metrics = getMetrics(viewport);
	viewport.pinchDistance = distance(points);
	viewport.pinchScale = viewport.scale;
	viewport.pinchWorldPoint = {
		x: (center.x - metrics.baseLeft - viewport.x) / viewport.scale,
		y: (center.y - metrics.baseTop - viewport.y) / viewport.scale,
	};
}

function createViewport(container: HTMLElement): MermaidViewport {
	const viewport: MermaidViewport = {
		container,
		svg: null,
		naturalWidth: 0,
		naturalHeight: 0,
		minimumScale: 1,
		scale: 1,
		x: 0,
		y: 0,
		pointers: new Map(),
		panOrigin: null,
		panOffset: null,
		pinchDistance: 0,
		pinchScale: 1,
		pinchWorldPoint: null,
		resizeObserver: new ResizeObserver(() => updateLayout(viewport)),
	};

	container.addEventListener(
		'wheel',
		(event) => {
			if (!viewport.svg) return;
			event.preventDefault();
			const point = getContentPoint(container, event.clientX, event.clientY);
			zoomAt(
				viewport,
				viewport.scale * Math.exp(-event.deltaY * 0.0015),
				point
			);
		},
		{ passive: false }
	);

	container.addEventListener('pointerdown', (event) => {
		if (!viewport.svg || (event.target as Element).closest('a')) return;
		event.preventDefault();
		container.setPointerCapture(event.pointerId);
		viewport.pointers.set(
			event.pointerId,
			getContentPoint(container, event.clientX, event.clientY)
		);

		if (viewport.pointers.size === 1) {
			viewport.panOrigin = [...viewport.pointers.values()][0];
			viewport.panOffset = { x: viewport.x, y: viewport.y };
			container.dataset.panning = '';
		} else if (viewport.pointers.size === 2) {
			viewport.panOrigin = null;
			viewport.panOffset = null;
			startPinch(viewport);
		}
	});

	container.addEventListener('pointermove', (event) => {
		if (!viewport.pointers.has(event.pointerId)) return;
		viewport.pointers.set(
			event.pointerId,
			getContentPoint(container, event.clientX, event.clientY)
		);

		if (viewport.pointers.size === 2 && viewport.pinchWorldPoint) {
			const points = [...viewport.pointers.values()];
			const center = midpoint(points);
			const metrics = getMetrics(viewport);
			const nextScale =
				viewport.pinchScale * (distance(points) / viewport.pinchDistance);
			if (!Number.isFinite(nextScale) || nextScale <= 0) return;
			viewport.scale = Math.max(nextScale, viewport.minimumScale);
			viewport.x =
				center.x -
				metrics.baseLeft -
				viewport.pinchWorldPoint.x * viewport.scale;
			viewport.y =
				center.y -
				metrics.baseTop -
				viewport.pinchWorldPoint.y * viewport.scale;
			render(viewport);
			return;
		}

		if (viewport.panOrigin && viewport.panOffset) {
			const point = [...viewport.pointers.values()][0];
			viewport.x = viewport.panOffset.x + point.x - viewport.panOrigin.x;
			viewport.y = viewport.panOffset.y + point.y - viewport.panOrigin.y;
			render(viewport);
		}
	});

	const endPointer = (event: PointerEvent) => {
		viewport.pointers.delete(event.pointerId);
		viewport.pinchWorldPoint = null;

		if (viewport.pointers.size === 1) {
			viewport.panOrigin = [...viewport.pointers.values()][0];
			viewport.panOffset = { x: viewport.x, y: viewport.y };
		} else {
			viewport.panOrigin = null;
			viewport.panOffset = null;
			delete container.dataset.panning;
		}
	};

	container.addEventListener('pointerup', endPointer);
	container.addEventListener('pointercancel', endPointer);

	viewport.resizeObserver.observe(container);
	return viewport;
}

function initialize(container: HTMLElement) {
	const svg = container.querySelector<SVGSVGElement>(':scope > svg');
	if (!svg) return;

	let viewport = viewports.get(container);
	if (!viewport) {
		viewport = createViewport(container);
		viewports.set(container, viewport);
	}
	if (viewport.svg === svg) return;

	svg.style.transform = 'none';
	const bounds = svg.getBoundingClientRect();
	viewport.svg = svg;
	viewport.naturalWidth = bounds.width;
	viewport.naturalHeight = bounds.height;
	viewport.pointers.clear();
	container.dataset.panZoom = '';
	viewport.minimumScale = 1;
	viewport.scale = 1;
	viewport.x = 0;
	viewport.y = 0;
	updateLayout(viewport, true);
}

function initializeAll(root: ParentNode = document) {
	root
		.querySelectorAll<HTMLElement>('pre.mermaid[data-processed]')
		.forEach(initialize);
}

initializeAll();

new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		const target = mutation.target as Element;
		const container = target.closest?.('pre.mermaid[data-processed]');
		if (container instanceof HTMLElement) initialize(container);
	}
}).observe(document.body, { childList: true, subtree: true });

document.addEventListener('astro:after-swap', () => initializeAll());
