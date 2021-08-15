import { blue, greenBright, redBright, yellow } from "colorette";
import { inspect } from "util";

const time = () => blue(`[${new Date().toLocaleString("en-gb")}]`);
const dataToString = (data) =>
    data
        .map((e) => (typeof e !== "string" ? inspect(e) : e))
        .join(" ")
        .split("\n")
        .join(`\n${" ".repeat(23)}`);

export default {
    log: (...data) => console.log(`${time()} ${dataToString(data)}`),
    success: (...data) => console.log(`${time()} ${greenBright(dataToString(data))}`),
    error: (...data) => console.error(`${time()} ${redBright(dataToString(data))}`),
    debug: (...data) => console.log(`${time()} ${yellow(dataToString(data))}`),
};
