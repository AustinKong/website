import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { technologyKeys } from './data/technologies';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.date(),
		image: z.string().url(),
		imageAlt: z.string(),
	}),
});

const projects = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
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
			draft: z.boolean().optional().default(false),
		}),
});

export const collections = {
	blog,
	projects,
};
