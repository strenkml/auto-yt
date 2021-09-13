const cron = require("node-cron");
const { execSync, spawn, exec } = require("child_process");
const diff = require("deep-diff").diff;

const db = require("./helpers/db.js");

const config = require("./config.json");

execSync(`mkdir -p ${config.userConfigDir}/data`);

// Declare variables
var crons = [];
var oldArray = null;

init();

setInterval(async () => {
  checkSourcesDifferences();
}, 2000);

async function init() {
  await db.init();

  oldArray = await db.getSourcesArray();

  oldArray.forEach((source) => {
    // if (source.cron != "no") {
    //   createCron(source);
    // }
    createCron(source);
  });
}

function createCron(source) {
  let task = cron.schedule(
    "* * * * *",
    () => {
      exec(
        createYTDLCommand(source.url, source.name, source.metadata),
        (error, stdout, stderr) => {
          if (error) {
            console.log(`error: ${error.message}`);
          }
          if (stderr) {
            console.log(`stderr: ${stderr}`);
          }
          console.log(`stdout: ${stdout}`);
        }
      );
    },
    { scheduled: true, timezone: "America/New_York" }
  );

  crons.push({
    key: source._id,
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
  return `youtube-dl "${url}" --download-archive "${config.downloadDir}/${name}/downloaded.txt" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --output "${config.downloadDir}/${name}/${name}.%(ext)s" --retries infinite --fragment-retries infinite --continue --no-overwrites --embed-thumbnail --embed-subs --add-metadata --restrict-filenames`;
}

async function checkSourcesDifferences() {
  var newArray = await db.getSourcesArray();
  var arrayDiff = diff(oldArray, newArray);
  if (arrayDiff) {
    arrayDiff.forEach((e) => {
      console.log(e);
      if (e.kind == "A") {
        if (e.item.kind == "N") {
          // Source was added
          createCron(e.item.rhs);
        } else if (e.item.kind == "D") {
          // Source was deleted
          removeCron(e.item.rhs.id_);
        } else if (e.item.kind == "E") {
          // Source was edited
          editCron(e.item.rhs.key, e.item.rhs.value);
        }
      }
    });
  }
  oldArray = newArray;
}
