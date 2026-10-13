import { load, CheerioAPI, Element } from 'cheerio'

export const BASE_URL = 'https://onepunchmanofficial.com'
export const MANGA_ID = 'one-punch-man'
export const TITLE = 'One Punch Man'
export const ALIASES = [TITLE, 'One-Punch Man', 'Wanpanman']
const CHAPTER_PATH = /^\/chapter\/(\d+(?:-\d+)?)\/$/

export function chapterPath(href: string): string | undefined {
    const path = href.trim().replace(/^https?:\/\/(?:www\.)?onepunchmanofficial\.com(?=\/)/i, '')
        .split(/[?#]/)[0].replace(/\/?$/, '/')
    return CHAPTER_PATH.test(path) ? path : undefined
}

export function absoluteImageURL(value: string | undefined): string | undefined {
    const raw = value?.trim()
    if (!raw) return undefined
    const url = raw.startsWith('//') ? `https:${raw}` : raw.startsWith('/') ? `${BASE_URL}${raw}` : raw
    return /^https?:\/\//i.test(url) ? url.replace(/ /g, '%20') : undefined
}

function imageURL($: CheerioAPI, element: Element): string | undefined {
    for (const attr of ['data-src', 'data-lazy-src', 'data-original', 'src']) {
        const url = absoluteImageURL($(element).attr(attr))
        if (url) return url
    }
    return undefined
}

export function parseSeries(html: string) {
    const $ = load(html)
    const image = $('img.cover-image').first()[0]
    const cover = image ? imageURL($, image as Element) : undefined
    if (!cover) throw new Error('Series cover not found. The site layout may have changed.')
    const description = $('meta[name="description"]').attr('content') || ''
    return { cover, description }
}

export function parseChapters(html: string) {
    const $ = load(html)
    const chapters: { id: string; name: string; chapNum: number }[] = []
    const seen = new Set<string>()
    $('a[href]').each((_, element) => {
        const id = chapterPath($(element).attr('href') || '')
        if (!id || seen.has(id)) return
        seen.add(id)
        const number = id.match(CHAPTER_PATH)![1].replace('-', '.')
        chapters.push({ id, name: `Chapter ${number}`, chapNum: Number(number) })
    })
    if (!chapters.length) throw new Error('No chapters found. The site layout may have changed.')
    return chapters.sort((a, b) => b.chapNum - a.chapNum)
}

export function parsePages(html: string): string[] {
    const $ = load(html)
    const pages: string[] = []
    const seen = new Set<string>()
    $('img').each((_, element) => {
        if ($(element).closest('noscript, .code-block').length) return
        const url = imageURL($, element as Element)
        // Only numbered reader pages; omit chapter thumbnails and unrelated artwork.
        if (!url || !/\/image\/onepunch-man\/chapter-\d+(?:-\d+)?\/\d+\.(?:webp|jpe?g|png)(?:[?#].*)?$/i.test(url)) return
        if (!seen.has(url)) { pages.push(url); seen.add(url) }
    })
    if (!pages.length) throw new Error('No readable chapter images found. The site layout may have changed.')
    return pages
}

export function matchesSearch(query: string): boolean {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const words = normalize(query).split(/\s+/).filter(Boolean)
    return ALIASES.some(alias => words.every(word => normalize(alias).includes(word)))
}
