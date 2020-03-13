// require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const now = new Date(new Date())//.getTime() + 480 * 60000);
const ISOizeDate = date => new Date(`${now.toISOString().substring(0, now.toISOString().indexOf('T'))}T${date}Z`);
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

const constructMsg = (next, now, name, time) => {
    const { hourDiff, minDiff } = timeLeft(next, now);
    return `${next.toString()} ${now.toString()} ${name} ${time}`
    if (!hourDiff && !minDiff) {
        return `It's ${capitalizeFirstLetter(name)} (${time.substring(0, 5)}) now.`;
    }
    const hourStr = `${hourDiff > 0 ? `${hourDiff} hour${hourDiff > 1 ? "s" : ""}` : ""}`;
    const minStr = `${minDiff > 0 ? `${minDiff} minute${minDiff > 1 ? "s" : ""}` : ""}`;
    const left = hourStr && minStr ? `${hourStr} and ${minStr}` : hourStr ? hourStr : minStr;
    return `${left} left to ${capitalizeFirstLetter(name)} (${time.substring(0, 5)})`;
}

app.get('/', async (req, res) => {
    const prayerTimes = ["fajr", "syuruk", "dhuhr", "asr", "maghrib", "isha"];
    const url = "https://www.e-solat.gov.my/index.php";
    let params = { r: "esolatApi/TakwimSolat", period: "today", zone: "WLY01" };
    let i = 0;
    await axios.get(url, { params })
        .then(function (response) {
            const { prayerTime } = response.data;
            let prayerTimeISO;
            while (i < prayerTimes.length) {
                prayerTimeISO = ISOizeDate(prayerTime[0][prayerTimes[i]]);
                if (prayerTimeISO >= now) {
                    break;
                }
                i++;
            }
            if (i < prayerTimes.length) {
                res.send(constructMsg(prayerTimeISO, now, prayerTimes[i], prayerTime[0][prayerTimes[i]]));
            }
        })

    if (i >= prayerTimes.length) {
        const tommorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        params = { ...params, period: "date", date: tommorrow.substring(0, tommorrow.indexOf('T')) }
        axios.get(url, { params }).then(function (response) {
            res.send(constructMsg(ISOizeDate(response.data.prayerTime[0][prayerTimes[0]]), now, prayerTimes[0], response.data.prayerTime[0][prayerTimes[0]]));
        });
    }
});

app.listen(port, () => console.log(`Server listening on port: ${port}`));