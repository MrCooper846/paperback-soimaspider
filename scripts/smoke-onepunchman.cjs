// Runs the actual bundled extension without Node/browser globals in its sandbox.
// Optional argument: directory containing home.html, chapter.html, chapter1.html.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const base = 'https://onepunchmanofficial.com';
const id = 'one-punch-man';
const recent = '/chapter/239/';
const early = '/chapter/1/';
const fixtures = process.argv[2];
const cache = new Map();
function html(url) {
  if (!cache.has(url)) {
    const file = url === base + '/' ? 'home.html' : url.endsWith(recent) ? 'chapter.html' : 'chapter1.html';
    cache.set(url, fixtures ? fs.readFileSync(path.join(fixtures, file), 'utf8') :
      execFileSync('curl', ['--fail','--silent','--show-error','--location','--max-time','30',url], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
  }
  return cache.get(url);
}
const identity = value => value;
const App = Object.fromEntries(['createRequest','createSourceManga','createMangaInfo',
  'createChapter','createChapterDetails','createPartialSourceManga','createPagedResults',
  'createHomeSection','createMangaUpdates'].map(key => [key, identity]));
App.createRequestManager = options => ({ schedule: async request => {
  request = await options.interceptor.interceptRequest(request);
  assert.equal(request.headers.Referer, base + '/');
  return { data: html(request.url), status: 200 };
}});
const context = vm.createContext({ App, console });
vm.runInContext(fs.readFileSync('bundles/0.8/OnePunchMan/source.js', 'utf8'), context);
(async () => {
  const source = new context.Sources.OnePunchMan();
  const details = await source.getMangaDetails(id);
  assert.equal(details.id, id);
  assert.match(details.mangaInfo.image, /^https:/);
  const chapters = await source.getChapters(id);
  assert(chapters.length > 70);
  assert(chapters.find(c => c.name === 'Chapter 24.5'));
  assert(chapters.find(c => c.name === 'Chapter 239'));
  let homepage;
  await source.getHomePageSections(section => { homepage = section; });
  assert.equal(homepage.items[0].mangaId, id);
  assert.equal((await source.getSearchResults({ title: 'wanpanman' })).results.length, 1);
  assert.equal((await source.getSearchResults({ title: 'unrelated' })).results.length, 0);
  const latestPages = await source.getChapterDetails(id, recent);
  const earlyPages = await source.getChapterDetails(id, early);
  assert(latestPages.pages.length >= 10);
  assert(earlyPages.pages.length >= 10);
  assert.match(latestPages.pages[0], /\/1\.jpg$/);
  assert(latestPages.pages.every(url => /^https:\/\//.test(url)));
  const manifest = JSON.parse(fs.readFileSync('bundles/0.8/versioning.json'));
  assert.equal(manifest.sources.length, 3);
  assert(manifest.sources.find(s => s.id === 'OnePunchMan'));
  assert.equal(manifest.builtWith.types, '0.8.7');
  console.log(JSON.stringify({ chapters: chapters.length, recentChapterPages: latestPages.pages.length,
    earlyChapterPages: earlyPages.pages.length, firstImage: latestPages.pages[0], cover: details.mangaInfo.image,
    bundleRunsWithoutNodeGlobals: true }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
