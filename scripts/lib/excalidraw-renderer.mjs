import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const libraryDirectory = path.dirname(fileURLToPath(import.meta.url));
const scriptsDirectory = path.join(libraryDirectory, '..');
const projectRoot = path.join(scriptsDirectory, '..');
const rendererRoot = path.join(scriptsDirectory, 'excalidraw-renderer');
const excalidrawAssets = path.join(
	projectRoot,
	'node_modules',
	'@excalidraw',
	'excalidraw',
	'dist',
	'prod'
);

export const defaultExportOptions = {
	background: true,
	padding: 40,
	theme: 'light',
};

export async function createExcalidrawRenderer() {
	const server = await createServer({
		configFile: false,
		root: rendererRoot,
		publicDir: excalidrawAssets,
		logLevel: 'error',
		server: {
			host: '127.0.0.1',
			port: 0,
			strictPort: false,
		},
		define: {
			'process.env.IS_PREACT': JSON.stringify('false'),
		},
	});

	let browser;

	try {
		await server.listen();
		const address = server.httpServer?.address();
		if (!address || typeof address === 'string') {
			throw new Error('Could not determine the renderer server address.');
		}

		browser = await chromium.launch({ headless: true });
		const page = await browser.newPage();
		const consoleErrors = [];
		const pageErrors = [];

		page.on('console', (message) => {
			if (message.type() === 'error') {
				consoleErrors.push(new Error(message.text()));
			}
		});
		page.on('pageerror', (error) => pageErrors.push(error));

		await page.goto(`http://127.0.0.1:${address.port}`, {
			waitUntil: 'networkidle',
		});
		await page.waitForFunction(() => window.excalidrawRendererReady === true);

		return {
			async renderFile(input, options = {}) {
				const source = await readFile(input, 'utf8');
				const scene = JSON.parse(source);
				const consoleErrorCount = consoleErrors.length;
				const pageErrorCount = pageErrors.length;
				const svg = await page.evaluate(
					({ scene, options }) => window.renderExcalidrawSvg(scene, options),
					{
						scene,
						options: { ...defaultExportOptions, ...options },
					}
				);

				if (pageErrors.length > pageErrorCount) {
					throw pageErrors[pageErrorCount];
				}
				if (consoleErrors.length > consoleErrorCount) {
					throw consoleErrors[consoleErrorCount];
				}

				return `${svg}\n`;
			},
			async close() {
				await browser.close();
				await server.close();
			},
		};
	} catch (error) {
		await browser?.close();
		await server.close();
		throw error;
	}
}
