const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseChapters, parsePages, chapterPath, matchesSearch, parseSeries } = require('../lib/OnePunchMan/Parser');

test('decimal chapters preserve IDs, deduplicate and sort numerically', () => {
  const chapters = parseChapters(['24','24-5','239','1','24-5'].map(n => `<a href="/chapter/${n}/">${n}</a>`).join(''));
  assert.deepEqual(chapters.map(c => c.chapNum), [239,24.5,24,1]);
  assert.equal(chapters[1].id, '/chapter/24-5/');
});
test('reader pages retain order and exclude thumbnails and duplicates', () => {
  const base = 'https://eye.keterscp.com/image/onepunch-man/chapter-1/';
  const html = `<img src="${base}thumb.webp"><img src="data:image/gif;base64,AA" data-src="${base}2.webp"><img src="${base}1.webp"><img src="${base}1.webp"><noscript><img src="${base}3.webp"></noscript>`;
  assert.deepEqual(parsePages(html), [base+'2.webp',base+'1.webp']);
});
test('chapter IDs reject off-site URLs, malformed paths and lookalike hosts', () => {
  for (const path of ['https://evil.example/chapter/1/','https://onepunchmanofficial.com.evil.example/chapter/1/','/chapter/../1/']) assert.equal(chapterPath(path), undefined);
  assert.equal(chapterPath('https://onepunchmanofficial.com/chapter/24-5/'), '/chapter/24-5/');
});
test('series cover, description and title aliases parse', () => {
  assert.deepEqual(parseSeries('<meta name="description" content="A hero"><img class="cover-image" src="/cover.webp">'), {cover:'https://onepunchmanofficial.com/cover.webp',description:'A hero'});
  assert(matchesSearch('wanpanman'));
  assert(matchesSearch('one punch'));
  assert.equal(matchesSearch('spider'),false);
});
test('missing content fails clearly', () => {
  assert.throws(()=>parseChapters('challenge'), /No chapters/);
  assert.throws(()=>parsePages('challenge'), /No readable/);
  assert.throws(()=>parseSeries('challenge'), /cover not found/);
});
