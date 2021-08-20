import fetch from "node-fetch";
import FormData from "form-data";
import https from "https";
import http from "http";

class qBittorrent {
    constructor({
        host = "http://localhost:8080",
        insecure = false,
        user = "admin",
        password = "adminadmin",
    } = {}) {
        this.user = user;
        this.password = password;
        const parsedHost = new URL(host);
        if (!["http:", "https:"].includes(parsedHost.protocol))
            throw new Error(`Invalid protocol "${parsedHost.protocol}"!`);
        this.host = parsedHost.href;
        this.agent =
            parsedHost.protocol === "http:"
                ? new http.Agent()
                : new https.Agent({ rejectUnauthorized: !insecure });
        this.session = "";
        this.exp = null;
        this.defer = this.login(user, password);
        this.user = user;
        this.password = password;
    }

    async login(user, pass) {
        this.session = "";
        this.exp = null;
        const res = await this.fetch("auth/login", {
            method: "POST",
            body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        const session = res.headers.get("set-cookie")?.split(";")?.[0];
        if (!session) {
            throw new Error("Invalid credentials");
        }
        this.session = session;
        this.exp = Date.now() + 55 * 60 * 1000;
    }

    async checkLogin() {
        if (Date.now() > this.exp) {
            this.defer = this.login(this.user, this.password);
            await this.defer();
        }
    }

    async fetch(url, opts = { headers: {} }) {
        const res = await fetch(`${this.host}api/v2/${url}`, {
            ...opts,
            headers: {
                ...opts.headers,
                Cookie: this.session,
            },
            referrer: this.host,
            agent: this.agent,
        });
        return res;
    }

    async addTorrent(url, category) {
        await this.defer;
        await this.checkLogin();
        if (typeof url !== "string") throw new Error("Url is not a string");
        await this.defer;
        const data = new FormData();
        data.append("urls", url);
        if (category) data.append("category", category);
        const res = await this.fetch("torrents/add", {
            method: "POST",
            body: data,
        });
        switch (res.status) {
            case 200:
                return "Success";
            case 415:
                return "Invalid torrent";
            default:
                throw new Error(`Unexpected response status ${res.status}.`);
        }
    }
}

export default qBittorrent;
