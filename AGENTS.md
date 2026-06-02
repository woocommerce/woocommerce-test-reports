# AGENTS.md

## Project Overview

This repository builds the WooCommerce test reports dashboard and contains scripts that publish and maintain report data in S3.

- `src/` is a React 18 single-page dashboard built with Webpack and React Bootstrap.
- `bin/` contains Node and shell scripts used by GitHub Actions to generate reports, update JSON data, update stats, and clean old reports.
- `.github/workflows/` wires the reporting, stats, cleanup, and deploy jobs.
- `dist/`, `data/`, `node_modules/`, logs, and generated report outputs are ignored.

## Commands

- Install dependencies with `npm install`.
- Start the local dashboard with `npm start`; Webpack dev server is configured for port `3000`.
- Build production assets with `npm run build`.
- Run linting with `npm run lint`.
- There is no useful test suite wired up: `npm test` is a placeholder that exits with an error.

## Coding Conventions

- Use the existing CommonJS style for root config and `bin/` scripts, and ES modules/JSX in `src/`.
- Formatting follows `.prettierrc.js`: tabs, single quotes, semicolons, `printWidth: 100`, and spaced parentheses in calls.
- ESLint extends the WordPress recommended formatting rules; keep changes compatible with `npm run lint`.
- Prefer existing hooks and utilities in `src/hooks/` and `src/utils/` before adding new shared helpers.
- Keep dashboard routing hash-based; production assets are served under `/woocommerce-test-reports/`.

## Data And Runtime Notes

- In development, dashboard data is fetched from local paths; in production it uses `src/config.json`.
- When a local `data/` directory exists, treat its JSON files as the source of truth for UI checks.
- Scripts in `bin/` often assume GitHub Actions inputs, generated Allure artifacts, and S3 credentials; avoid running publishing or cleanup scripts unless the required environment is clear.

## Verification

- For UI changes, check the running app before and after when possible, preferably with Playwright/browser automation.
- Verify displayed dashboard values against the local `data/` JSON files when they are present.
- For script changes, run the narrowest relevant Node/script command with fixture or local data if available, and always run `npm run lint` for touched JavaScript.
