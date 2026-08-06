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
```

The TIL repository is expected at `../today-i-learned` for local development.
Set `TIL_CONTENT_DIR` to its `notes` directory if it lives elsewhere.

### TIL and Excalidraw

TIL Markdown is loaded directly from the separate `today-i-learned` repository.
Nothing is copied into this repository. Only `notes/**/index.md` files are
published. Notes provide `title` and `category` frontmatter; an optional
`draft: true` shows a note only in the local development site. `.excalidraw`
image references are rewritten to
SVGs under `website/.generated/til-assets` during Markdown rendering. The TIL
repository remains read-only during this process.

`npm run dev` and `npm run build` automatically generate those ignored SVGs
through the official Excalidraw renderer in headless Chromium.

Export any individual Excalidraw source with:

```sh
npm run export:excalidraw -- path/to/diagram.excalidraw
```

The SVG is written beside the source file by default. Pass a second path to
choose another destination:

```sh
npm run export:excalidraw -- input.excalidraw output.svg
```

Run `npx playwright install chromium` once after installing dependencies if
Chromium is not already available.

The Excalidraw implementation is grouped under `scripts/excalidraw/`:
`renderer.mjs` owns the Node, Vite, and Playwright lifecycle, while
`browser.js` and `index.html` form the browser context that calls Excalidraw's
official export API. The top-level `export-excalidraw.mjs` and
`prepare-til.mjs` files handle single-file and build-time batch exports.

### TIL knowledge graph

The `/til` page renders an interactive Cytoscape graph. Graph data is generated
automatically by `npm run dev` and `npm run build`. The generator treats every
`notes/**/index.md` as a node and every
`[[Note Title]]` wiki-link as a directed edge. It writes the deterministic
result to `.generated/til-graph.json`. Duplicate note titles and links to
unknown notes fail the command. The graph builder treats every
`[[Note Title]]` occurrence as an edge, including occurrences inside code
blocks or comments. In article prose, wiki-links render as underlined links to
the corresponding TIL page. Use
`[[Note Title|natural link text]]` when the surrounding sentence needs a
different label.

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

Production deployment runs through `.github/workflows/deploy.yml` instead of
Cloudflare Git integration. The workflow checks out both repositories, builds
inside the version-matched Playwright container, and deploys with Wrangler.
Configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as secrets in the
website repository.

TIL pushes request a deployment through a `repository_dispatch` event.
Configure a fine-grained token limited to the website repository with
`Contents: write` permission as `WEBSITE_DISPATCH_TOKEN` in the TIL repository.
Website pushes and manual workflow runs also deploy production.

Static output is written to `dist/`; Cloudflare serves the generated
`404.html` for missing routes.
