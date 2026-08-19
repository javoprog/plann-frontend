<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project UI requirements

- Do not use the built-in browser for verification. Prefer static inspection,
  linting, type checks, builds, and automated tests.
- Use clean, registry-compatible shadcn components throughout the interface.
  Do not recreate an available shadcn primitive with raw interactive elements
  or custom CSS.
- Keep `src/app/globals.css` limited to the generated Tailwind/shadcn theme and
  global base setup. Do not add custom selectors or component-specific CSS.
- Treat the product as release-ready: all UI work must preserve professional
  visual hierarchy, responsive behavior, accessibility, localization, clear
  loading/error/empty states, and design consistency across every route.
- Prefer reusable application compositions built exclusively from shadcn
  primitives and semantic theme tokens. Avoid hard-coded palette utilities for
  product states when a shadcn variant or semantic token can express the state.
