const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseChapters, parsePages, chapterPath, matchesSearch } = require('../lib/SoImASpider/Parser');
const wrap = html => `<article><div class="entry-content">${html}</div></article>`;

test('split chapters remain unique, ordered and deduplicated', () => {
  const html = ['79a','1','79b','79a','0'].map(n =>
    `<a href="https://soimaspider.com/manga/so-im-a-spider-so-what-chapter-${n}/">Chapter ${n}</a>`).join('');
  const chapters = parseChapters(wrap(html));
  assert.deepEqual(chapters.map(c => c.name), ['Chapter 79b','Chapter 79a','Chapter 1','Chapter 0']);
  assert.equal(new Set(chapters.map(c => c.id)).size, 4);
});

test('reads lazy URLs in DOM order and ignores ads, placeholders and duplicates', () => {
  const image = n => `https://images.readmartialpeak.com/soimaspider.com/Chapter%201/${n}.jpg`;
  const html = `<img src="logo.png"><img src="data:image/gif;base64,AA" data-src="${image('02')}">
  <div class="code-block"><img src="https://ads.example/banner.jpg"></div>
  <img src="${image('01')}"><noscript><img src="${image('01')}"></noscript>
  <img src="${image('01')}">`;
  assert.deepEqual(parsePages(wrap(html)), [image('02'), image('01')]);
});

test('rejects off-site and malformed chapter identifiers', () => {
  assert.equal(chapterPath('https://evil.example/manga/so-im-a-spider-so-what-chapter-1/'), undefined);
  assert.equal(chapterPath('/manga/../private/'), undefined);
  assert.equal(chapterPath('/manga/so-im-a-spider-so-what-chapter-79a/'), '/manga/so-im-a-spider-so-what-chapter-79a/');
});

test('search supports the English and Japanese titles', () => {
  assert.equal(matchesSearch('spider'), true);
  assert.equal(matchesSearch('kumo desu'), true);
  assert.equal(matchesSearch(''), true);
  assert.equal(matchesSearch('one piece'), false);
});

test('layout failures produce useful errors instead of empty chapters', () => {
  assert.throws(() => parsePages('<html>Challenge</html>'), /No readable/);
  assert.throws(() => parseChapters('<html>Error</html>'), /No chapters/);
});
