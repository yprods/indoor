## Indoor Navigator

Interactive indoor navigation system built with Next.js 16 App Router, TypeScript, and Tailwind CSS. It ships with a spatial map, turn-by-turn directions, multilingual UI, and a SQLite data store seeded with sample building data.

### Features

- Responsive, mobile-first layout for quickly switching between current location, nearby places, and step-by-step directions.
- Interactive minimap that highlights the user’s position, current selection, and nearby destinations.
- Full-text search across places with quick filtering and the ability to set any result as the current location.
- Directions API that computes routes using a graph built from indoor connections, returning localized instructions, total distance, and an overlayed path on the floorplan.
- Optional text-to-speech guidance (Hebrew by default) that reads the current route aloud with a single click.
- First-run assistant with large-type UI that attempts to detect your location via GPS and guides you through selecting a start and end point.
- Multilingual experience: manage languages dynamically, translate place metadata, and render UI strings in the active locale.
- Hebrew-first experience with automatic RTL/LTR switching based on the active language.
- Dedicated admin console (`/admin`) for creating places, defining translations, and wiring up bi-directional connections.
- Visual map builder inside the admin console that lets you place points by clicking the blueprint canvas and fine-tune coordinates before saving.
- Light/dark display modes with smooth transitions that respect user preference and persist across sessions.
- Interactive floorplan styled after Barzilai Medical Center with realistic clinical wings, connectors, and orientation-aware routing.
- SQLite persistence (via `better-sqlite3`) with automatic seeding for languages, places, translations, and connections.

### Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

By default the app runs on [http://localhost:3000](http://localhost:3000).

### Configuration

- Copy `.env.local.example` (if present) or create a `.env.local` file and set an admin PIN:

  ```env
  ADMIN_PIN=2468
  ```

  The value defaults to `2468` when the variable is not provided. The admin console at `/admin` requires this PIN for any changes and the value is never exposed in client bundles.

### Project Structure

- `src/app/page.tsx` – primary client UI for exploring the building, selecting locations, and viewing routes.
- `src/app/api/*` – REST endpoints for languages, places, neighbors, translations, and directions.
- `src/lib/db.ts` – SQLite setup, schema migrations, and seed data.
- `src/lib/places.ts` – data access helpers, BFS routing logic, and translation utilities.
- `src/lib/translations.ts` – localized UI strings and direction formatting helpers.

### Data Files

SQLite data is stored in `data/indoor-navigation.sqlite`. The database is created and seeded automatically on first run.

### Tooling

- Next.js 16 with React 19
- Tailwind CSS 4 (PostCSS)
- TypeScript, ESLint, and the React Compiler Babel plugin

### Scripts

- `npm run dev` – start Next.js in development mode.
- `npm run build` – generate a production build.
- `npm run start` – start the production server.
- `npm run lint` – run ESLint over the project.

