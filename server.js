const Enmap = require("enmap");
const cron = require("node-cron");
const { execSync, spawn, exec } = require("child_process");
const diff = require("deep-diff").diff;

const config = require("./config.json");

execSync(`mkdir -p ${config.userConfigDir}/data`);

// Declare variables
var crons = [];
var settings = null;
var sources = null;

init();

setInterval(() => {
  settings = new Enmap({
    name: "settings",
    autoEnsure: {
      cookiesFile: "cookies.txt",
      timezone: "America/New_York",
    },
    dataDir: `${config.userConfigDir}/data`,
  });

  sources = checkSourcesDifferences(
    sources,
    new Enmap({
      name: "sources",
      dataDir: `${config.userConfigDir}/data`,
    })
  );
}, 5000);

function init() {
  settings = new Enmap({
    name: "settings",
    autoEnsure: {
      cookiesFile: "cookies.txt",
      timezone: "America/New_York",
    },
    dataDir: `${config.userConfigDir}/data`,
  });

  sources = new Enmap({
    name: "sources",
    dataDir: `${config.userConfigDir}/data`,
  });

  var sourcesArray = sources.array();
  var keysArray = sources.keyArray();

  sourcesArray.forEach((source, index) => {
    if (source.cron != "no") {
      createCron(source, keysArray[index]);
    } else {
      // TODO: REMOVE
      source.cron = "* * * * *";
      createCron(source, keysArray[index]);
    }
  });
}

function createCron(source, key) {
  let task = cron.schedule(
    source.cron,
    () => {
      exec(
        createYTDLCommand(source.url, source.name, source.metadata),
        (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`);
            return;
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
        }
      );
    },
    { scheduled: true, timezone: "America/New_York" }
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

function checkSourcesDifferences(oldEnmap, newEnmap) {
  var oldArray = [];
  var newArray = [];

  oldEnmap.map((value, index) => {
    oldArray.push({ key: index, value: value });
  });

  newEnmap.map((value, index) => {
    newArray.push({ key: index, value: value });
  });

  var enmapDiff = diff(oldArray, newArray);
  console.log(enmapDiff);
  if (enmapDiff != null) {
    enmapDiff.forEach((e) => {
      console.log(e);
      if (e.kind == "A") {
        if (e.item.kind == "N") {
          // Source was added
          createCron(e.item.rhs.value, e.item.rhs.key);
        } else if (e.item.kind == "D") {
          // Source was deleted
          removeCron(e.item.rhs.key);
        } else if (e.item.kind == "E") {
          // Source was edited
          editCron(e.item.rhs.key, e.item.rhs.value);
        }
      }
    });
    return newEnmap;
  }
  return oldEnmap;
}
