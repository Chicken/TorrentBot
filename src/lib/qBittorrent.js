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
        await this.defer;
        if (Date.now() > this.exp) {
            this.defer = this.login(this.user, this.password);
            await this.defer;
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
        await this.checkLogin();
        if (typeof url !== "string") throw new Error("Url is not a string");
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

    static prettySize(bytes) {
        const units = [
            ["B", 0],
            ["KiB", 0],
            ["MiB", 1],
            ["GiB", 2],
            ["TiB", 3],
            ["PiB", 3],
            ["EiB", 3],
        ];

        let value = bytes;
        let depth = 0;
        while (value > 1024 && depth < units.length - 1) {
            value /= 1024;
            depth += 1;
        }

        return `${value.toFixed(units[depth][1])} ${units[depth][0]}`;
    }

    async getStatistics() {
        await this.checkLogin();
        const data = await (await this.fetch("sync/maindata")).json();
        return {
            totalUpload: data.server_state.alltime_ul,
            totalDownload: data.server_state.alltime_dl,
            status: data.server_state.connection_status,
            ratio: data.server_state.global_ratio,
            peers: data.server_state.total_peer_connections,
            torrentCount: Object.values(data.torrents).length,
            trackerCount: Object.values(data.trackers).length,
        };
    }
}

export default qBittorrent;
