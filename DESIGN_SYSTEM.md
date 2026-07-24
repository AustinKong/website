# Design system

This site uses semantic HTML as its design system. Prefer an existing element
over adding a class.

## Typography

- Body copy, interface text, and article `h2`–`h4` use the sans-serif stack
  defined on `body`.
- Page titles and homepage section titles use the serif stack.
- Shared heading sizes live in `--font-size-h1` through `--font-size-h4`.
- The hierarchy uses the Fibonacci/golden-ratio steps where they matter most:
  - `h1`: `2.618rem`
  - `h2`: `1.272rem`
  - `h3`: `1.125rem`
  - `h4`: `1rem`
- Heading sizes become fluid below their maximum so they remain readable on
  small screens.
- Body copy uses a compact `1.3` line height; headings use `1`.

## Heading rules

- Use one `h1` for the page title.
- Use `h2` for named homepage sections and article sections.
- Use `h3` for a subsection within an `h2`.
- Use `h4` only when a third nested level is genuinely necessary.
- Do not use `h5` or `h6`. Simplify the content hierarchy instead.
- Do not choose a heading tag for its size.

## Body elements

- `p`: paragraphs.
- `ul` or `ol`: lists where order is meaningful or useful.
- `a`: navigation and inline links.
- `time`: machine-readable dates.
- `small`: supporting metadata.
- `blockquote`: quoted material.
- `pre` and `code`: code.

Body elements inherit the sans-serif font. Do not set `font-family` on
components.

The profile name is the only identity exception: it uses the shared H2 size
with the inherited sans-serif font.

## Spacing and layout

- The base spacing unit is `1rem`.
- Prefer multiples of `1rem`; use `0.5rem` only for tight relationships.
- Text lines should remain below `80ch` for comfortable reading.
- Use normal body text for introductions. Do not create display-copy classes.
- The complete sidebar and content shell is capped at `82rem` and centered.
- Classes are for layout or exceptional emphasis, not typography duplication.
- Sections have only two width modes:
  - `.section--narrow`: `80ch` for About, Experience, and individual articles.
  - Full width is the default for Projects, Blog grids, and Contact.
- About, Experience, Projects, and Contact are sections on the homepage and use
  native anchor navigation.

## Colour and interaction

- Use the colour variables in `global.css`; do not add component-local colour
  literals.
- Text must retain readable contrast against the light background.
- Links stay recognizable through underlines or their navigation context.
- Keyboard focus must remain visible; do not remove browser focus outlines.

## Project cards

- Projects and blog posts use the shared `ContentGrid` presentation.
- Card media uses a `9 / 10` aspect ratio.
- Media corners use a `0.5rem` radius.
- Desktop project grids use three equal columns with a `1rem` gutter.
- Blog card titles use `h2`; project card titles use `h3`.
- Descriptions use normal body text.

## Components

- Homepage sections live in `components/sections` and own their content.
- Reusable presentation lives in `components/shared`.
- `PhotoStrip` accepts any number of captioned photos; it is not tied to the
  About section's “currently” content.

## Physics tags

`TechTag` is ordinary HTML until activated. Clicking it once creates a Matter.js
body confined to `main`; activated tags can then be grabbed and thrown.
