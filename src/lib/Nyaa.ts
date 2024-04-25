import { JSDOM } from "jsdom";
import fetch from "node-fetch";

export enum Type {
    Default = "default",
    Remake = "remake",
    Trusted = "trusted",
}

const typeClasses = {
    default: Type.Default,
    danger: Type.Remake,
    success: Type.Trusted,
};

export enum Filter {
    NoFilter = "0",
    NoRemakes = "1",
    TrustedOnly = "2",
}

export enum Sort {
    Size = "size",
    Date = "id",
    Seeders = "seeders",
    Leechers = "leechers",
    Downloads = "downloads",
    Comments = "comments",
}

export enum Order {
    Ascending = "asc",
    Descending = "desc",
}

export enum Category {
    All = "0_0",
    Anime = "1_0",
    AnimeMusicVideo = "1_1",
    AnimeEnglish = "1_2",
    AnimeNonEnglish = "1_3",
    AnimeRaw = "1_4",
    Audio = "2_0",
    AudioLossless = "2_1",
    AudioLossy = "2_2",
    Literature = "3_0",
    LiteratureEnglish = "3_1",
    LiteratureNonEnglish = "3_2",
    LiteratureRaw = "3_3",
    LiveAction = "4_0",
    LiveActionEnglish = "4_1",
    LiveActionIdolPromotional = "4_2",
    LiveActionNonEnglish = "4_3",
    LiveActionRaw = "4_4",
    Pictures = "5_0",
    PicturesGraphics = "5_1",
    PicturesPhotos = "5_2",
    Software = "6_0",
    SoftwareApplications = "6_1",
    SoftwareGames = "6_2",
}

const categoryNames = {
    [Category.All]: "All Categories",
    [Category.Anime]: "Anime",
    [Category.AnimeMusicVideo]: "Anime - Anime Music Video",
    [Category.AnimeEnglish]: "Anime - English-translated",
    [Category.AnimeNonEnglish]: "Anime - Non-English-translated",
    [Category.AnimeRaw]: "Anime - Raw",
    [Category.Audio]: "Audio",
    [Category.AudioLossless]: "Audio - Lossless",
    [Category.AudioLossy]: "Audio - Lossy",
    [Category.Literature]: "Literature",
    [Category.LiteratureEnglish]: "Literature - English-translated",
    [Category.LiteratureNonEnglish]: "Literature - Non-English-translated",
    [Category.LiteratureRaw]: "Literature - Raw",
    [Category.LiveAction]: "Live Action",
    [Category.LiveActionEnglish]: "Live Action - English-translated",
    [Category.LiveActionIdolPromotional]: "Live Action - Idol/Promotional video",
    [Category.LiveActionNonEnglish]: "Live Action - Non-English-translated",
    [Category.LiveActionRaw]: "Live Action - Raw",
    [Category.Pictures]: "Pictures",
    [Category.PicturesGraphics]: "Pictures - Graphics",
    [Category.PicturesPhotos]: "Pictures - Photos",
    [Category.Software]: "Software",
    [Category.SoftwareApplications]: "Software - Applications",
    [Category.SoftwareGames]: "Software - Games",
};

export interface Torrent {
    id: string;
    name: string;
    hash: string;
    type: Type;
    category: Category;
    magnet: string;
    torrent: string;
    filesize: string;
    date: Date;
    timestamp: number;
    seeders: number;
    leechers: number;
    downloads: number;
}

class Nyaa {
    query = "";
    page = 0;
    filter = Filter.NoFilter;
    sort = Sort.Date;
    order = Order.Descending;
    category = Category.All;
    pages: (Torrent[] | undefined)[] = [];
    totalResults = 0;
    maxPages = 0;
    started = false;

    setQuery(query = ""): this {
        if (this.started) throw new Error("Can't modify options after starting.");
        this.query = query.toString();
        return this;
    }

    setFilter(filter = Filter.NoFilter): this {
        if (this.started) throw new Error("Can't modify options after starting.");
        this.filter = filter;
        return this;
    }

    setSort(sort = Sort.Date): this {
        if (this.started) throw new Error("Can't modify options after starting.");
        this.sort = sort;
        return this;
    }

    setOrder(order = Order.Descending): this {
        if (this.started) throw new Error("Can't modify options after starting.");
        this.order = order;
        return this;
    }

    setCategory(category = Category.All): this {
        if (this.started) throw new Error("Can't modify options after starting.");
        this.category = category;
        return this;
    }

    static categoryText(id: Category): string {
        return categoryNames[id];
    }

    static parse(page: string): {
        torrents: Torrent[];
        pages: number;
        totalResults: number;
    } {
        const {
            window: { document },
        } = new JSDOM(page);
        const torrents = [...document.querySelectorAll("tr")].slice(1).map<Torrent>((el) => {
            const child = (n: number) => el.querySelector(`td:nth-child(${n})`) as HTMLElement;
            const nameContainer = child(2);
            const linkContainer = child(3);
            const timestamp = parseInt(child(5).getAttribute("data-timestamp")!, 10) * 1000;
            return {
                id: nameContainer.querySelector("a:not(.comments)")!.getAttribute("href")!.match(/\d+/)![0],
                name: (nameContainer.querySelector("a:not(.comments)") as HTMLAnchorElement).innerHTML.trim(),
                hash: linkContainer
                    .querySelector("a:nth-child(2)")!
                    .getAttribute("href")!
                    .match(/urn:btih:([0-9a-z]+)/i)![1],
                type: typeClasses[el.getAttribute("class") as keyof typeof typeClasses],
                category: child(1).querySelector("a")!.getAttribute("href")!.split("=")[1] as Category,
                magnet: linkContainer.querySelector("a:nth-child(2)")!.getAttribute("href")!,
                torrent: `https://nyaa.si${linkContainer.querySelector("a:nth-child(1)")!.getAttribute("href")!}`,
                filesize: child(4).innerHTML,
                date: new Date(timestamp),
                timestamp,
                seeders: parseInt(child(6).innerHTML, 10),
                leechers: parseInt(child(7).innerHTML, 10),
                downloads: parseInt(child(8).innerHTML, 10),
            };
        });

        const totalResults = parseInt(
            document.querySelector("div.pagination-page-info")?.innerHTML?.match(/ (\d+) /)?.[1] || "7500",
            10
        );

        const pages = Math.ceil(totalResults / 75);

        return {
            torrents,
            pages,
            totalResults,
        };
    }

    async setPage(page = 0) {
        if (!this.started) throw new Error("Can't modify page before starting.");
        if (Number.isNaN(page)) throw new Error(`Invalid page "${page}"`);
        if (page < 0 || page + 1 > this.maxPages) throw new Error("Page out of range");
        this.page = page;
        await this.fetch();
        return this;
    }

    async fetch() {
        if (this.pages !== null && this.pages[this.page]) return this.pages[this.page];
        const res = await fetch(
            `https://nyaa.si/?f=${this.filter}&c=${this.category}&q=${encodeURIComponent(this.query)}&s=${
                this.sort
            }&o=${this.order}&p=${this.page + 1}`
        );
        if (!res.ok) throw new Error(`Failed to fetch: "${res.statusText}"`);
        const parsed = Nyaa.parse(await res.text());
        if (parsed.torrents.length === 0) {
            this.maxPages = 0;
            this.pages = [];
            this.totalResults = 0;
            this.started = true;
            return this;
        }
        this.maxPages = parsed.pages;
        if (this.pages === null) this.pages = [...Array<undefined>(this.maxPages)];
        this.pages[this.page] = parsed.torrents;
        this.totalResults = parsed.totalResults;
        this.started = true;
        return this;
    }

    get current(): Torrent[] {
        if (!this.started || !this.pages[this.page]) throw new Error("Can't get page before starting.");
        return this.pages[this.page]!;
    }

    async next() {
        if (!this.started) throw new Error("Can't modify page before starting.");
        if (this.page + 1 === this.pages.length) throw new Error("Page out of range.");
        await this.setPage(this.page + 1);
        return this;
    }

    async back() {
        if (!this.started) throw new Error("Can't modify page before starting.");
        if (this.page === 0) throw new Error("Page out of range.");
        await this.setPage(this.page - 1);
        return this;
    }
}

export default Nyaa;
