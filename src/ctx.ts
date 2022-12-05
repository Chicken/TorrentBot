import type {
    ApplicationCommandDataResolvable,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Client,
} from "discord.js";
import type { QBittorrent } from "qbit.js";

export interface Command {
    data: ApplicationCommandDataResolvable;
    run: (command: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (autocomplete: AutocompleteInteraction) => Promise<void>;
}

class Context {
    private _client: Client | null = null;
    private _qbit: QBittorrent | null = null;
    public readonly commands = new Map<string, Command>();

    set client(client: Client) {
        if (this._client) throw new Error("Client already initialized!");
        this._client = client;
    }

    get client(): Client {
        if (!this._client) throw new Error("Client not initialized!");
        return this._client;
    }

    set qbit(qbit: QBittorrent) {
        if (this._qbit) throw new Error("qBittorrent already initialized!");
        this._qbit = qbit;
    }

    get qbit(): QBittorrent {
        if (!this._qbit) throw new Error("qBittorrent not initialized!");
        return this._qbit;
    }
}

export const ctx = new Context();
