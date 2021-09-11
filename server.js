const Enmap = require("enmap");
const cron = require("node-cron");

const config = require("./config.json");

const settings = new Enmap({
  name: "settings",
  autoEnsure: {
    cookiesFile: "cookies.txt",
  },
});

const sources = new Enmap({
  name: "sources",
});

init();

sources.changed(sourceChanged);
settings.changed(sourceChanged);

function init() {
  var sourcesArray = sources.array();
  sourcesArray.forEach((source) => {
    if (source.cron != "no") {
      createCron(source);
    }
  });
}

function sourceChanged(key, oldVal, newVal) {}

function settingsChanged(key, oldVal, newVal) {}

function createCron(source) {}
