import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import mermaid from 'astro-mermaid';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import remarkExcalidraw from './src/markdown/remark-excalidraw.mjs';
import remarkMermaidCaption from './src/markdown/remark-mermaid-caption.mjs';
import remarkWikiLinks from './src/markdown/remark-wiki-links.mjs';

export default defineConfig({
	// Supposedly, mermaid library should support Astro 7 (https://github.com/joesaby/astro-mermaid/issues/71),
	// but it doesn't work for me. This is a temporary workaround until it gets fixed.
	// TODO: Remove @astrojs/markdown-remark library and prefer satteri engine once issue is fixed.
	markdown: {
		processor: unified({
			remarkPlugins: [
				remarkMath,
				remarkMermaidCaption,
				remarkExcalidraw,
				remarkWikiLinks,
			],
			rehypePlugins: [rehypeKatex],
		}),
	},
	image: {
		layout: 'constrained',
		responsiveStyles: true,
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Inter',
			cssVariable: '--font-sans',
			weights: ['100 900'],
			styles: ['normal', 'italic'],
			fallbacks: ['Arial', 'Helvetica', 'sans-serif'],
		},
		{
			provider: fontProviders.local(),
			name: 'Liberation Serif',
			cssVariable: '--font-serif',
			fallbacks: ['Georgia', 'Times New Roman', 'serif'],
			options: {
				variants: [
					{
						src: [
							'./src/assets/fonts/liberation-serif/LiberationSerif-Regular.ttf',
						],
						weight: 400,
						style: 'normal',
					},
					{
						src: [
							'./src/assets/fonts/liberation-serif/LiberationSerif-Italic.ttf',
						],
						weight: 400,
						style: 'italic',
					},
					{
						src: [
							'./src/assets/fonts/liberation-serif/LiberationSerif-Bold.ttf',
						],
						weight: 700,
						style: 'normal',
					},
					{
						src: [
							'./src/assets/fonts/liberation-serif/LiberationSerif-BoldItalic.ttf',
						],
						weight: 700,
						style: 'italic',
					},
				],
			},
		},
	],
	integrations: [
		mdx(),
		mermaid({
			mermaidConfig: {
				// No support for hand-drawn sequence diagrams yet https://github.com/mermaid-js/mermaid/issues/1886
				look: 'handDrawn',
				handDrawnSeed: 42,
				// Use Mermaid's built-in Dagre layout by default; diagrams can still
				// opt into ELK with a diagram-level `layout: elk` config.
				layout: 'dagre',
				flowchart: { useMaxWidth: false },
				er: { useMaxWidth: false },
				// Keep the tree's SVG at its natural dimensions so its text does not
				// scale with the container width.
				treeView: { useMaxWidth: false },
				// Sequence diagrams have independent text defaults; keep them aligned
				// with the small text used by the other Mermaid diagrams.
				sequence: {
					// Keep the SVG at its natural dimensions so it never scales its text
					// to the available article width.
					useMaxWidth: false,
					// The article provides surrounding whitespace, so keep Mermaid's
					// internal horizontal padding deliberately minimal.
					diagramMarginX: 5,
					actorFontSize: 14,
					noteFontSize: 14,
					messageFontSize: 14,
				},
				themeVariables: {
					fontSize: '14px',
					// treeView has its own label size, which otherwise defaults to 16px.
					treeView: { labelFontSize: '14px' },
				},
			},
		}),
	],
	compressHTML: true,
});
