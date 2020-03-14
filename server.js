// require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const now = new Date(new Date().getTime() + 480 * 60000);
const prayerTimes = ["fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];
const params = { r: "esolatApi/TakwimSolat", period: "today", zone: "WLY01" };
const ISOizeDate = (date, today = now) => new Date(`${today.toISOString().substring(0, today.toISOString().indexOf('T'))}T${date}Z`);
const capitalizeFirstLetter = (string = "") => string.charAt(0).toUpperCase() + string.slice(1);
const timeLeft = (next, current) => {
    let hourDiff = next.getHours() - current.getHours();
    let minDiff = next.getMinutes() - current.getMinutes();
    if (minDiff < 0) {
        minDiff = 60 + minDiff;
        hourDiff--;
    }
    return { hourDiff, minDiff };
}

const constructMsg = (next, name, time) => {
    const { hourDiff, minDiff } = timeLeft(next, now);
    const data = `${capitalizeFirstLetter(name)} (${time.substring(0, 5)})`;
    if (!hourDiff && !minDiff) {
        return `It's ${data} now.`;
    }
    const hourStr = `${hourDiff > 0 ? `${hourDiff} hour${hourDiff > 1 ? "s" : ""}` : ""}`;
    const minStr = `${minDiff > 0 ? `${minDiff} minute${minDiff > 1 ? "s" : ""}` : ""}`;
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

app.get('/', async (req, res) => {
    let prayerTime = await getJAKIM();
    let i = 0;
    let prayerTimeISO;
    while (i < prayerTimes.length) {
        prayerTimeISO = ISOizeDate(prayerTime[prayerTimes[i]]);
        if (prayerTimeISO >= now) {
            res.send(constructMsg(prayerTimeISO, prayerTimes[i], prayerTime[prayerTimes[i]]));
        }
        i++;
    }
    const tommorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    prayerTime = await getJAKIM({ ...params, period: "date", date: tommorrow.toISOString().substring(0, tommorrow.toISOString().indexOf('T')) });
    res.send(constructMsg(ISOizeDate(prayerTime[prayerTimes[0]], tommorrow), prayerTimes[0], prayerTime[prayerTimes[0]]));
});

app.get('/:name', async (req, res) => {
    const { name } = req.params;
    if (prayerTimes.includes(name)) {
        const prayerTime = await getJAKIM();
        res.send(prayerTime[name].substring(0, 5));
    }
});


app.listen(port, () => console.log(`Server listening on port: ${port}`));