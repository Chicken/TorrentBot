# TorrentBot

Discord bot to search and download torrents.

## Some things

1. Don't use for illegal content as that is against Discord's terms of service.
1. Don't even think about making a public bot, that's a bad idea.
1. Only for private and educational use.

## Deployment

1. Copy the example `docker-compose.yml` or integrate it into your own
1. Fill in the environmental variables from below
1. Start the container

### Environmental variables

| KEY              | VALUE                                                             |
| ---------------- | ----------------------------------------------------------------- |
| TOKEN            | Discord bot token                                                 |
| USERS            | Array of Discord ids allowed to use the bot                       |
| QBIT_HOST        | Url of qBittorent web interface                                   |
| QBIT_USER        | qBittorent username                                               |
| QBIT_PASS        | qBittorrent password                                              |
| QBIT_IGNORE_CERT | `true`/`false`, set to true if using self signed ssl certificates |
