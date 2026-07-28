# Austin Kong's Portfolio

Personal portfolio and project case studies built with Astro. The site is
statically generated and includes MDX content, Mermaid diagrams, responsive
image components, and a small Matter.js interaction for technology tags.

## Requirements

- Node.js 22.12 or newer
- npm

## Local development

```sh
npm install
npm run dev
```

Astro serves the site at `http://localhost:4321`.

Other useful commands:

```sh
npm run build    # Generate the production site in dist/
npm run preview  # Preview the production build locally
npm run astro    # Run the Astro CLI
```

## Project structure

```text
src/
├── assets/       Images, fonts, and icons processed by Astro
├── components/   Homepage sections and shared UI
├── content/      Blog and project content
├── layouts/      Shared page layouts
├── pages/        File-based routes
└── styles/       Global styles and design tokens
public/           Files copied directly to the site root
```

Project case studies live in `src/content/projects`. Larger MDX case studies
keep their images beside the content in a project-specific directory. Shared
presentation components live in `src/components/shared`.

## Cloudflare deployment

The site deploys to Cloudflare Workers as static assets. It does not need a
Node.js server, the Astro Cloudflare adapter, or a Worker entrypoint.

Install dependencies and log in to Cloudflare once:

```sh
npm ci
npx wrangler login
```

Then build and deploy:

```sh
npm run deploy
```

Wrangler creates or updates the Worker named `website` using `wrangler.jsonc`.
The first deployment prints its `workers.dev` URL. To use a custom domain, open
the Worker in the Cloudflare dashboard, then add it under **Settings → Domains &
Routes**.

For Cloudflare Git integration, import this repository as a Worker and use:

```text
Build command: npm run build
Deploy command: npx wrangler deploy
Node.js version: 22.12 or newer
```

Static output is written to `dist/`; Cloudflare serves the generated
`404.html` for missing routes.
