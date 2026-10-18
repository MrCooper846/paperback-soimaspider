# Mo's Paperback Sources for Paperback 0.8

Paperback sources for [SoImASpider](https://soimaspider.com/) , [One Punch Man](https://onepunchmanofficial.com/) and [Vinland Saga](https://vinlandsaga.website/).
Each source provides search, the series cover and description, chapter discovery, and ordered
page-image URLs. The repository contains extension code, not manga image files.

## Install

Once GitHub Pages has been enabled and the deployment has succeeded:

1. Open https://mrcooper846.github.io/paperback-soimaspider/0.8/ in Safari on your iPhone/iPad.
2. Tap **Add to Paperback** on the generated repository page.
3. In Paperback's external source settings, install **SoImASpider**, **OnePunchMan** or **VinlandSaga** from **Mo's Paperback Sources**.
4. Open the source and add the series to your library.

You can also add the repository URL manually in Paperback:
`https://mrcooper846.github.io/paperback-soimaspider/0.8/`.

This targets **Paperback 0.8**, with `@paperback/types` and `@paperback/toolchain`
pinned to **0.8.7**. It is not a 0.9 extension.

## First GitHub deployment

1. Create the public repository `MrCooper846/paperback-soimaspider`.
2. Push these files to its `main` branch (keep the license and lockfile).
3. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
4. Run **Build and publish Paperback source** under Actions, or push another commit.
5. Check that both `build` and `deploy` are green before using the install link.

If renaming or moving the repository, update `baseURL` in `package.json` and these URLs.
The workflow rebuilds and republishes on every push to `main`.

## Development

Use Node.js 22 and npm.

```sh
npm ci
npm test
npm run bundle
npm run smoke
```

`npm run smoke` also needs `curl` and reads each homepage plus two chapters from
the live website. It runs the actual generated bundle in an isolated JavaScript
context without Node/browser globals. The deterministic parser tests run in CI;
the live smoke test is manual so website outages do not break deployments.

`npm run serve` starts the Paperback development server. Compiled distribution
files are generated under `bundles/0.8/`; GitHub Actions deploys the `bundles` directory.

## Behaviour and maintenance

- Chapter IDs preserve the complete path, including letter suffixes.
- Split chapters sort numerically with `a=.01`, `b=.02`, etc.; display labels retain
  the website's original chapter numbers and letters.
- Reads lazy-loaded image URLs, ignores placeholders and ad blocks, removes duplicate
  image URLs, and preserves document order.
- Includes a site Referer on requests and limits source requests to two per second.
- Reads the chapter list dynamically; newly listed chapters do not require republishing.
- Does not invent chapter dates or claim an ongoing/completed status that the homepage
  does not supply.
- Throws an explanatory error if the site's layout changes or access fails.
- Does not bypass authentication or interactive website challenges.

## Validation at preparation (8 October 2026)

- TypeScript compilation and five parser tests passed.
- The packaged extension found 106 chapters in the downloaded live homepage.
- Chapter 79b returned 16 ordered image URLs; chapter 1 returned 39.
- Homepage, search, series details and repository manifest passed the smoke check.
- The bundle ran without browser/Node globals in the smoke sandbox.
- Final on-device Paperback 0.8 reading/download validation remains necessary.

`src/SoImASpider/Parser.ts` holds website selectors and URL parsing.
`src/SoImASpider/SoImASpider.ts` adapts those results to Paperback's API.

## OnePunchMan (added 13 October 2026)

Refresh the existing repository in Paperback and install **OnePunchMan**. No new repository URL is needed. This source parses the homepage chapter list, preserves decimal chapter paths such as `/chapter/24-5/`, and reads numbered chapter images in document order while excluding thumbnails. It uses the site cover and metadata description.

`src/OnePunchMan/Parser.ts` holds its selectors; `scripts/smoke-onepunchman.cjs` checks the actual generated bundle without Node/browser globals. On-device reading and downloads remain untested.

## VinlandSaga (added 18 October 2026)

Refresh the existing repository in Paperback and install **VinlandSaga**. The installation URL is unchanged. The source reads the homepage chapter list and series cover, preserves chapter paths, and extracts ordered chapter images while excluding ads and duplicate images. `scripts/smoke-vinlandsaga.cjs` exercises chapters 220 and 1 using the generated bundle without Node/browser globals. On-device reading remains untested for this source.

SoImASpider and OnePunchMan have been confirmed working on-device by the repository owner.
