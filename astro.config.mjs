import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import mermaid from 'astro-mermaid';

export default defineConfig({
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
						src: ['./src/assets/fonts/liberation-serif/LiberationSerif-Regular.ttf'],
						weight: 400,
						style: 'normal',
					},
					{
						src: ['./src/assets/fonts/liberation-serif/LiberationSerif-Italic.ttf'],
						weight: 400,
						style: 'italic',
					},
					{
						src: ['./src/assets/fonts/liberation-serif/LiberationSerif-Bold.ttf'],
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
				// Use Mermaid's built-in Dagre layout by default; diagrams can still
				// opt into ELK with a diagram-level `layout: elk` config.
				layout: 'dagre',
				flowchart: { useMaxWidth: false },
				er: { useMaxWidth: false },
				themeVariables: { fontSize: '14px' },
			},
		}),
	],
});
