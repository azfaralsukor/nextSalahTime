const express = require("express");
const serverless = require("serverless-http");
const axios = require('axios');

const app = express();
const router = express.Router();

let now;
const prayerTimes = ["fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];
const params = { r: "esolatApi/TakwimSolat", period: "today", zone: "WLY01" };
const ISOizeDate = (date, today = now) => new Date(`${today.toISOString().substring(0, today.toISOString().indexOf('T'))}T${date}Z`);
const capitalizeFirstLetter = (string = "") => string.charAt(0).toUpperCase() + string.slice(1);
const timeLeft = (next, current) => {
    const _s = next > current;
    let hourDiff = _s ? next.getHours() - current.getHours() : current.getHours() - next.getHours();
    let minDiff = _s ? next.getMinutes() - current.getMinutes() : current.getMinutes() - next.getMinutes();
    if (_s && minDiff < 0) {
        minDiff += 60;
        hourDiff--;
    }
    
    if (_s && hourDiff < 0) {
        hourDiff += 24;
    }

    return { hourDiff, minDiff };
}

const constructMsg = (next, name, time) => {
    const { hourDiff, minDiff } = timeLeft(next, now);
    const data = `${capitalizeFirstLetter(name)} (${time.substring(0, 5)})`;
    if (!hourDiff && !minDiff) {
        return `It's ${data} now.`;
    }
    const hourStr = `${hourDiff !== 0 ? `${hourDiff} hour${hourDiff > 1 ? "s" : ""}` : ""}`;
    const minStr = `${minDiff !== 0 ? `${minDiff} minute${minDiff > 1 ? "s" : ""}` : ""}`;
    const left = hourStr && minStr ? `${hourStr} and ${minStr}` : hourStr ? hourStr : minStr;
    return `${left} left to ${data}`;
}

const getJAKIM = async (params = { r: "esolatApi/TakwimSolat", period: "today", zone: "WLY01" }) => {
    const url = "https://www.e-solat.gov.my/index.php";
    let result = ''
    await axios.get(url, { params }).then((res) => {
        const { prayerTime } = res.data;
        result = prayerTime[0];
    })
    return result;
}

router.get('/', async (req, res) => {
    now = new Date(new Date().getTime() + 480 * 60000);
    let prayerTime = await getJAKIM();
    let i = 0;
    let prayerTimeISO;
    while (i < prayerTimes.length) {
        prayerTimeISO = ISOizeDate(prayerTime[prayerTimes[i]]);
        if (prayerTimeISO >= now) {
            return res.send(constructMsg(prayerTimeISO, prayerTimes[i], prayerTime[prayerTimes[i]]));
        }
        i++;
    }
    const tommorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    prayerTime = await getJAKIM({ ...params, period: "date", date: tommorrow.toISOString().substring(0, tommorrow.toISOString().indexOf('T')) });
    return res.send(constructMsg(ISOizeDate(prayerTime[prayerTimes[0]], tommorrow), prayerTimes[0], prayerTime[prayerTimes[0]]));
});

router.get('/:name/:details?', async (req, res) => {
    now = new Date(new Date().getTime() + 480 * 60000);
    const { name, details } = req.params;
    if (prayerTimes.includes(name)) {
        const prayerTime = await getJAKIM();
        details ?
            res.send(constructMsg(ISOizeDate(prayerTime[name]), name, prayerTime[name]))
            :
            res.send(prayerTime[name].substring(0, 5));
    }
});

app.use(`/.netlify/functions/api`, router);

module.exports = app;
module.exports.handler = serverless(app);
