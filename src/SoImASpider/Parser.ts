import { load, CheerioAPI, Element } from 'cheerio'

export const BASE_URL = 'https://soimaspider.com'
export const MANGA_ID = 'so-im-a-spider-so-what'
export const TITLE = "So I'm a Spider, So What?"
export const ALIASES = [TITLE, 'So Im a Spider So What', 'Kumo Desu ga, Nani ka?']
const CHAPTER_PATH = /^\/manga\/so-im-a-spider-so-what-chapter-(\d+(?:\.\d+)?)([a-z]?)\/$/i

// Avoid browser-only URL/DOM APIs: Paperback 0.8 runs in JavaScriptCore.
export function absoluteImageURL(value: string | undefined): string | undefined {
    const raw = value?.trim()
    if (!raw || /^(data|javascript|blob):/i.test(raw)) return undefined
    const url = raw.startsWith('//') ? `https:${raw}`
        : raw.startsWith('/') ? `${BASE_URL}${raw}` : raw
    if (!/^https?:\/\//i.test(url)) return undefined
    return url.replace(/ /g, '%20')
}

function imageURL($: CheerioAPI, element: Element): string | undefined {
    const image = $(element)
    for (const attr of ['data-src', 'data-lazy-src', 'data-original', 'src']) {
        const url = absoluteImageURL(image.attr(attr))
        if (url) return url
    }
    return undefined
}

export function chapterPath(href: string): string | undefined {
    // IDs are paths on this site only, never arbitrary URLs.
    const path = href.trim().replace(/^https?:\/\/(?:www\.)?soimaspider\.com/i, '')
        .split(/[?#]/)[0].replace(/\/?$/, '/')
    return CHAPTER_PATH.test(path) ? path : undefined
}

export function parseSeries(html: string) {
    const $ = load(html)
    const content = $('article .entry-content').first()
    const firstImage = content.find('img').first()[0]
    const cover = firstImage ? imageURL($, firstImage as Element) : undefined
    if (!cover) throw new Error('Series cover not found. The site layout may have changed.')
    const description = content.find('p').toArray()
        .map(element => $(element).text().trim()).filter(Boolean).join('\n\n')
    return { cover, description }
}

export function parseChapters(html: string) {
    const $ = load(html)
    const chapters: { id: string; name: string; chapNum: number }[] = []
    const seen = new Set<string>()
    $('article .entry-content a[href]').each((_, element) => {
        const id = chapterPath($(element).attr('href') || '')
        if (!id || seen.has(id)) return
        seen.add(id)
        const match = id.match(CHAPTER_PATH)!
        const suffix = match[2].toLowerCase()
        // a=.01, b=.02 etc. Keep the original letter in the display name and ID.
        const chapNum = Number(match[1]) + (suffix ? (suffix.charCodeAt(0) - 96) / 100 : 0)
        chapters.push({ id, name: `Chapter ${match[1]}${suffix}`, chapNum })
    })
    if (!chapters.length) throw new Error('No chapters found. The site layout may have changed.')
    return chapters.sort((a, b) => b.chapNum - a.chapNum)
}

export function parsePages(html: string): string[] {
    const $ = load(html)
    const pages: string[] = []
    const seen = new Set<string>()
    $('article .entry-content img').each((_, element) => {
        if ($(element).closest('noscript, .code-block, .simplesocialbuttons').length) return
        const url = imageURL($, element as Element)
        const alt = $(element).attr('alt') || ''
        // Match either the site's chapter-image path or its series/chapter alt text.
        // This excludes unrelated banners while permitting a future CDN move.
        if (!url || !(/\/soimaspider\.com\/Chapter(?:%20|\s)/i.test(url)
            || /So\s+I[’']?m\s+a\s+Spider.*Chapter/i.test(alt))) return
        if (!seen.has(url)) { pages.push(url); seen.add(url) }
    })
    if (!pages.length) throw new Error('No readable chapter images found. Open the website to check availability.')
    return pages
}

export function matchesSearch(query: string): boolean {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const words = normalize(query).split(/\s+/).filter(Boolean)
    return ALIASES.some(alias => words.every(word => normalize(alias).includes(word)))
}
