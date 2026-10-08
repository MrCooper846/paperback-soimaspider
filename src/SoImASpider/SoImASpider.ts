import {
    Source, SourceInfo, ContentRating, SourceIntents, Chapter, ChapterDetails,
    SourceManga, PartialSourceManga, PagedResults, SearchRequest, HomeSection,
    MangaUpdates
} from '@paperback/types'
import {
    BASE_URL, MANGA_ID, TITLE, ALIASES, chapterPath, parseSeries,
    parseChapters, parsePages, matchesSearch
} from './Parser'

export const SoImASpiderInfo: SourceInfo = {
    version: '1.0.0',
    name: 'SoImASpider',
    icon: 'icon.png',
    author: 'MrCooper846',
    authorWebsite: 'https://github.com/MrCooper846',
    description: "So I'm a Spider, So What? from soimaspider.com",
    contentRating: ContentRating.MATURE,
    websiteBaseURL: BASE_URL,
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS
}

export class SoImASpider extends Source {
    requestManager = App.createRequestManager({
        requestsPerSecond: 2,
        requestTimeout: 20000,
        interceptor: {
            interceptRequest: async request => {
                request.headers = { ...request.headers, Referer: `${BASE_URL}/` }
                return request
            },
            interceptResponse: async response => response
        }
    })

    private async fetchHTML(path: string): Promise<string> {
        const response = await this.requestManager.schedule(App.createRequest({
            url: `${BASE_URL}${path}`, method: 'GET'
        }), 1)
        if (response.status !== 200) throw new Error(`Website returned HTTP ${response.status}.`)
        if (typeof response.data !== 'string') throw new Error('Website did not return HTML.')
        return response.data
    }

    private validateManga(id: string): void {
        if (id !== MANGA_ID) throw new Error('Unknown series ID.')
    }

    private async tile(): Promise<PartialSourceManga> {
        const { cover } = parseSeries(await this.fetchHTML('/'))
        return App.createPartialSourceManga({ mangaId: MANGA_ID, title: TITLE, image: cover })
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        this.validateManga(mangaId)
        const { cover, description } = parseSeries(await this.fetchHTML('/'))
        return App.createSourceManga({
            id: MANGA_ID,
            mangaInfo: App.createMangaInfo({
                titles: ALIASES, image: cover, desc: description, status: 'UNKNOWN'
            })
        })
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        this.validateManga(mangaId)
        return parseChapters(await this.fetchHTML('/')).map(chapter =>
            App.createChapter({ ...chapter, langCode: 'en' }))
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        this.validateManga(mangaId)
        const path = chapterPath(chapterId)
        if (!path || path !== chapterId) throw new Error('Invalid chapter ID.')
        return App.createChapterDetails({
            id: chapterId, mangaId, pages: parsePages(await this.fetchHTML(path))
        })
    }

    override async getSearchResults(query: SearchRequest): Promise<PagedResults> {
        return App.createPagedResults({
            results: matchesSearch(query.title || '') ? [await this.tile()] : []
        })
    }

    override async getHomePageSections(callback: (section: HomeSection) => void): Promise<void> {
        callback(App.createHomeSection({
            id: 'series', title: 'SoImASpider', type: 'singleRowNormal', containsMoreItems: false,
            items: [await this.tile()]
        }))
    }

    override getMangaShareUrl(mangaId: string): string {
        this.validateManga(mangaId)
        return `${BASE_URL}/`
    }

    async filterUpdatedManga(callback: (updates: MangaUpdates) => void, _time: Date, ids: string[]): Promise<void> {
        // The homepage has no reliable chapter timestamps. Ask Paperback to recheck
        // the sole series rather than inventing publication dates.
        if (ids.includes(MANGA_ID)) callback(App.createMangaUpdates({ ids: [MANGA_ID] }))
    }
}
