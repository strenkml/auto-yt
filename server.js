const Enmap = require("enmap");
const cron = require("node-cron");
const { spawn } = require("child_process");

const config = require("./config.json");

const settings = new Enmap({
  name: "settings",
  autoEnsure: {
    cookiesFile: "cookies.txt",
    timezone: "America/New_York",
  },
});

const sources = new Enmap({
  name: "sources",
});

// Declare variables
var crons = [];

init();

sources.changed(sourceChanged);
settings.changed(sourceChanged);

function init() {
  var sourcesArray = sources.array();
  var keysArray = sources.keysArray();

  sourcesArray.forEach((source, index) => {
    if (source.cron != "no") {
      createCron(source, keysArray[index]);
    }
  });
}

function sourceChanged(key, oldVal, newVal) {}

function settingsChanged(key, oldVal, newVal) {}

function createCron(source, key) {
  let task = cron.schedule(
    source.cron,
    () => {
      var download = spawn(
        createYTDLCommand(source.url, source.name, source.metadata)
      );

      download.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });

      download.stderr.on("data", (data) => {
        console.log(`stderr: ${data}`);
      });
    },
    { scheduled: true, timezone: settings.get("timezone") }
  );

  crons.push({
    key: key,
    task: task,
    running: true,
  });
}

function removeCron(key) {
  var _cron = crons.find((item) => item.key === key);
  _cron.task.destroy();

  // Remove the destroyed task from the crons array
  crons = crons.find((item) => item.key != key);
}

function editCron(key, newSource) {
  removeCron(key);
  createCron(newSource, key);
}

function pauseCron(key) {
  var _cron = crons.find((item) => item.key === key);
  _cron.task.stop();
  crons.map((item) => (item.running = false));
}

function resumeCron(key) {
  var _cron = crons.find((item) => item.key === key);
  _cron.task.start();
  crons.map((item) => (item.running = true));
}

function createYTDLCommand(url, name, metadata) {
  return `youtube-dl "${url}" --download-archive "${config.downloadDir}/${name}/downloaded.txt" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --output "${config.downloadDir}/${name}/${metadata}" --retries infinite --fragment-retries infinite --continue --no-overwrites --embed-thumbnail --embed-subs --add-metadata`;
}
