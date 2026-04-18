import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
		date: z.date(),
		author: z.string().optional(),
		tags: z.array(z.string()).optional(),
		image: z.string().url(),
		imageAlt: z.string(),
		draft: z.boolean().optional().default(false),
		readingTime: z.string().optional(),
	}),
});

export const collections = {
	blog,
};
