import fetch from "node-fetch";
import cheerio from "cheerio";

export const Type = {
    DEFAULT: "default",
    REMAKE: "remake",
    TRUSTED: "trusted",
};

const typeClasses = new Map(
    Object.entries({
        default: Type.DEFAULT,
        danger: Type.REMAKE,
        success: Type.TRUSTED,
    })
);

export const Filter = {
    NO_FILTER: "0",
    NO_REMAKES: "1",
    TRUSTED_ONLY: "2",
};

export const Sort = {
    SIZE: "size",
    ID: "id",
    DATE: "id",
    SEEDERS: "seeders",
    LEECHERS: "leechers",
    DOWNLOADS: "downloads",
    COMMENTS: "comments",
};

export const Order = {
    ASCENDING: "asc",
    DESCENDING: "desc",
};

export const Category = {
    ALL: "0_0",
    ANIME: "1_0",
    ANIME_MUSIC_VIDEO: "1_1",
    ANIME_ENGLISH: "1_2",
    ANIME_NON_ENGLISH: "1_3",
    ANIME_RAW: "1_4",
    AUDIO: "2_0",
    AUDIO_LOSSLESS: "2_1",
    AUDIO_LOSSY: "2_2",
    LITERATURE: "3_0",
    LITERATURE_ENGLISH: "3_1",
    LITERATURE_NON_ENGLISH: "3_2",
    LITERATURE_RAW: "3_3",
    LIVE_ACTION: "4_0",
    LIVE_ACTION_ENGLISH: "4_1",
    LIVE_ACTION_IDOL_PROMOTIONAL: "4_2",
    LIVE_ACTION_NON_ENGLISH: "4_3",
    LIVE_ACTION_RAW: "4_4",
    PICTURES: "5_0",
    PICTURES_GRAPHICS: "5_1",
    PICTURES_PHOTOS: "5_2",
    SOFTWARE: "6_0",
    SOFTWARE_APPLICATIONS: "6_1",
    SOFTWARE_GAMES: "6_2",
};

const categoryNames = new Map(
    Object.entries({
        "0_0": "All Categories",
        "1_0": "Anime",
        "1_1": "Anime - Anime Music Video",
        "1_2": "Anime - English-translated",
        "1_3": "Anime - Non-English-translated",
        "1_4": "Anime - Raw",
        "2_0": "Audio",
        "2_1": "Audio - Lossless",
        "2_2": "Audio - Lossy",
        "3_0": "Literature",
        "3_1": "Literature - English-translated",
        "3_2": "Literature - Non-English-translated",
        "3_3": "Literature - Raw",
        "4_0": "Live Action",
        "4_1": "Live Action - English-translated",
        "4_2": "Live Action - Idol/Promotional video",
        "4_3": "Live Action - Non-English-tramsöated",
        "4_4": "Live Action - Raw",
        "5_0": "Pictures",
        "5_1": "Pictures - Graphics",
        "5_2": "Pictures - Photos",
        "6_0": "Software",
        "6_1": "Software - Applications",
        "6_2": "Software - Games",
    })
);

class Nyaa {
    constructor() {
        this.query = "";
        this.page = 0;
        this.filter = Filter.NO_FILTER;
        this.sort = Sort.DATE;
        this.order = Order.DESCENDING;
        this.category = Category.ALL;
        this.pages = null;
        this.totalResults = null;
        this.started = false;
    }

    setQuery(query = "") {
        if (this.started) throw new Error("Can't modify options after starting.");
        this.query = query.toString();
        return this;
    }

    setFilter(filter = Filter.NO_FILTER) {
        if (this.started) throw new Error("Can't modify options after starting.");
        if (!Object.values(Filter).includes(filter)) throw new Error(`Invalid filter "${filter}"`);
        this.filter = filter;
        return this;
    }

    setSort(sort = Sort.DATE) {
        if (this.started) throw new Error("Can't modify options after starting.");
        if (!Object.values(Sort).includes(sort)) throw new Error(`Invalid sort option "${sort}"`);
        this.sort = sort;
        return this;
    }

    setOrder(order = Order.DESCENDING) {
        if (this.started) throw new Error("Can't modify options after starting.");
        if (!Object.values(Order).includes(order))
            throw new Error(`Invalid order option "${order}"`);
        this.order = order;
        return this;
    }

    setCategory(category = Category.ALL) {
        if (this.started) throw new Error("Can't modify options after starting.");
        if (!Object.values(Category).includes(category))
            throw new Error(`Invalid category option "${category}"`);
        this.category = category;
        return this;
    }

    static categoryText(id) {
        return categoryNames.get(id) || null;
    }

    static parse(page) {
        const $ = cheerio.load(page);
        const torrents = $("tr")
            .slice(1)
            .toArray()
            .map((el) => {
                const s = $(el);
                const child = (n) => s.find(`td:nth-child(${n})`);
                const nameContainer = child(2);
                const linkContainer = child(3);
                const timestamp = child(5).attr("data-timestamp") * 1000;
                return {
                    id: nameContainer.find("a:not(.comments)").attr("href").match(/\d+/)[0],
                    name: nameContainer.find("a:not(.comments)").text().trim(),
                    hash: linkContainer
                        .find("a:nth-child(2)")
                        .attr("href")
                        .match(/urn:btih:([0-9a-z]+)/i)[1],
                    type: typeClasses.get(s.attr("class")),
                    category: child(1).find("a").attr("href").split("=")[1],
                    magnet: linkContainer.find("a:nth-child(2)").attr("href"),
                    torrent: `https://nyaa.si${linkContainer.find("a:nth-child(1)").attr("href")}`,
                    filesize: child(4).text(),
                    date: new Date(timestamp),
                    timestamp,
                    seeders: parseInt(child(6).text(), 10),
                    leechers: parseInt(child(7).text(), 10),
                    downloads: parseInt(child(8).text(), 10),
                };
            });

        const totalResults =
            parseInt(
                $("div.pagination-page-info")
                    ?.text()
                    ?.match(/ (\d+) /),
                10
            ) || 7500;

        const pages = Math.ceil(totalResults / 75);

        return {
            torrents,
            pages,
            totalResults,
        };
    }

    async setPage(page = 0) {
        if (!this.started) throw new Error("Can't modify page before starting.");
        const num = parseInt(page, 10);
        if (Number.isNaN(num)) throw new Error(`Invalid page "${page}"`);
        if (num < 0 || num + 1 > this.pages) throw new Error("Page out of range");
        this.page = num;
        await this.fetch();
        return this;
    }

    async fetch() {
        if (this.pages !== null && this.pages[this.page]) return this.pages[this.page];
        const res = await fetch(
            `https://nyaa.si/?f=${this.filter}&c=${this.category}&q=${encodeURIComponent(
                this.query
            )}&s=${this.sort}&o=${this.order}&p=${this.page + 1}`
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
        if (this.pages === null) this.pages = [...Array(this.maxPages)];
        this.pages[this.page] = parsed.torrents;
        this.totalResults = parsed.totalResults;
        this.started = true;
        return this;
    }

    get current() {
        if (!this.started) throw new Error("Can't get page before starting.");
        return this.pages[this.page];
    }

    async next() {
        if (!this.started) throw new Error("Can't modify page before starting.");
        if (this.page + 1 === this.pages) throw new Error("Page out of range.");
        this.setPage(this.page + 1);
        return this;
    }

    async back() {
        if (!this.started) throw new Error("Can't modify page before starting.");
        if (this.page === 0) throw new Error("Page out of range.");
        this.setPage(this.page - 1);
        return this;
    }
}

export default Nyaa;
