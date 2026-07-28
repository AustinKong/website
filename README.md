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

## Hosting

The site uses Astro's default static output, so it does not need a Node.js
server in production.

For Netlify, Vercel, Cloudflare Pages, or another Git-based static host, use:

```text
Build command: npm run build
Publish directory: dist
Node.js version: 22.12 or newer
```

To host it manually, build the site and upload the contents of `dist/` to any
static web server:

```sh
npm ci
npm run build
```

Serve `dist/index.html` at the domain root and preserve the generated directory
structure. No SPA fallback or server-side runtime is required.

If deploying to a subdirectory instead of a domain root, set Astro's `base`
option in `astro.config.mjs` before building.
