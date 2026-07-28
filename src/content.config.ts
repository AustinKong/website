import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { technologyKeys } from './data/technologies';

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
	projects,
};
