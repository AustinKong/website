import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		date: z.date(),
		image: z.string().url(),
		imageAlt: z.string(),
		draft: z.boolean().optional().default(false),
	}),
});

const projects = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		order: z.number(),
		draft: z.boolean().optional().default(false),
	}),
});

export const collections = {
	blog,
	projects,
};
