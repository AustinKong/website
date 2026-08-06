import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { technologyKeys } from './data/technologies';

const tilContentDirectory =
	process.env.TIL_CONTENT_DIR ?? '../today-i-learned/notes';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.date(),
			image: image(),
			imageAlt: z.string(),
		}),
});

const til = defineCollection({
	loader: glob({
		pattern: '**/index.md',
		base: tilContentDirectory,
		generateId: ({ entry }) =>
			entry.replace(/[/\\]index\.md$/i, '').replaceAll('\\', '/'),
	}),
	schema: z.object({
		title: z.string(),
		category: z.string(),
		draft: z.boolean().default(false),
	}),
});

const projects = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			stat: z.string().optional(),
			order: z.number(),
			cover: image().optional(),
			technologies: z.array(z.enum(technologyKeys)),
			links: z
				.array(
					z.object({
						label: z.string(),
						href: z.string().url(),
						kind: z.enum(['github', 'external']),
					})
				)
				.optional()
				.default([]),
		}),
});

export const collections = {
	blog,
	til,
	projects,
};
