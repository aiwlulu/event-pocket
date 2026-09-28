# Event Pocket

A mobile-first event pass manager. Event details and ticket images stay in the browser on the device where they are added.

## Privacy

- Events are stored in this browser's IndexedDB.
- The app has no backend, account, analytics, or upload endpoint.
- The public GitHub Pages site serves the application code only. Each visitor has a separate local database.
- Clearing browser site data can remove saved events. Export regular backups, and keep backup files private because they contain ticket images and QR codes.
- Data does not sync between browsers or devices. Use Export Backup and Import Backup to move it.

## Features

- Add, edit, and delete single-day or multi-day events with an optional ticket or QR image
- Automatic Upcoming and Past sections sorted by start date; multi-day events stay Upcoming through their final day
- Large, full-screen ticket view
- JSON backup export and import, including image data
- Clear all local event data

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Create a production build with `npm run build`; preview it with `npm run preview`.

## Deploy to GitHub Pages

The included GitHub Actions workflow builds and deploys on every push to `main` and supports manual runs. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source. The Vite base path is configured for `/event-pocket/`.

After the workflow succeeds, the site will be available at https://aiwlulu.github.io/event-pocket/.

## Backups

Choose **Export backup** in the app to download a JSON file. The backup includes images encoded in the file. Treat it like an entry ticket: anyone with the backup may be able to access the QR code. Importing a backup replaces the current local collection after validation. Existing version 1 backups without an end date remain compatible.
