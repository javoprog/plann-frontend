# Plann Frontend

Next.js App Router frontend for the Plann personal planning MVP. It includes JWT authentication, a shared protected dashboard shell, goal management, and a unified task list.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local`. The default API URL is `http://localhost:4000`.

3. Start the frontend:

   ```bash
   npm run dev
   ```

Open `http://localhost:2009`. Start the backend first so authentication and planning data are available.

## Commands

- `npm run dev` — start the local development server
- `npm run build` — create a production build
- `npm run lint` — run ESLint
- `npm run start` — serve the production build

## Architecture notes

- Authentication state is centralized in `AuthProvider`; Axios attaches the stored JWT to API requests.
- Sidebar, header, categories, quick actions, and the main container live only in `src/app/(dashboard)/layout.tsx`.
- Category names, colors, badges, and Lucide icons are centralized in `src/lib/constants/categories.ts`.
- Styling uses Tailwind utility classes. The only stylesheet is `src/app/globals.css`, which contains Tailwind and shadcn theme setup.
