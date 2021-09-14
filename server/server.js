const cron = require("node-cron");
const { spawn } = require("child_process");

const db = require("./helpers/db.js");

const config = require("./config.json");

// Declare variables
var downloads = [];
var sourcesWatch = null;
var settingsWatch = null;

init();

async function init() {
  await db.init();

  sourcesWatch = db.getSourcesWatchStream();
  settingsWatch = db.getSettingsWatchStream();

  sourcesWatch.on("change", onSourcesChange);

  settingsWatch.on("change", onSettingsChange);

  var sources = await db.getSourcesArray();

  sources.forEach((source) => {
    if (source.cron != "no") {
      createCron(source);
    } else {
      oneTimeDownload(source);
    }
  });
}

function oneTimeDownload(source) {
  var data = createYTDLCommand(source.url, source.name, source.metadata);
  var child = spawn(data.command, data.args);

  child.stdout.on("data", (data) => {
    console.log(`stdout:\n${data}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  child.on("error", (error) => {
    console.error(`error: ${error.message}`);
  });

  child.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });

  downloads.push({
    key: source._id,
    task: null,
    running: true,
    child: child,
  });
}

function createCron(source) {
  var child = null;
  let task = cron.schedule(
    "* * * * *",
    () => {
      var data = createYTDLCommand(source.url, source.name, source.metadata);
      child = spawn(data.command, data.args);

      child.stdout.on("data", (data) => {
        console.log(`stdout:\n${data}`);
      });

      child.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      child.on("error", (error) => {
        console.error(`error: ${error.message}`);
      });

      child.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
      });
    },
    {
      scheduled: true,
      timezone: "America/New_York",
    }
  );

  downloads.push({
    key: source._id,
    task: task,
    running: true,
    child: child,
  });
}

function removeCron(key) {
  var _cron = downloads.find((item) => item.key === key);
  _cron.child.kill("SIGINT");
  if (_cron.task != null) _cron.task.destroy();

  // Remove the destroyed task from the downloads array
  downloads = downloads.find((item) => item.key != key);
}

function editCron(key, newSource) {
  removeCron(key);
  createCron(newSource);
}

// function pauseCron(key) {
//   var _cron = downloads.find((item) => item.key === key);
//   _cron.task.stop();
//   downloads.map((item) => (item.running = false));
// }

// function resumeCron(key) {
//   var _cron = downloads.find((item) => item.key === key);
//   _cron.task.start();
//   downloads.map((item) => (item.running = true));
// }

function createYTDLCommand(url, name, metadata) {
  var obj = {
    command: "youtube-dl",
    args: [
      `${url}`,
      "-v",
      "--download-archive",
      `${config.downloadDir}/${name}/downloaded.txt`,
      "-f",
      "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--output",
      `${config.downloadDir}/${name}/${metadata}`,
      "--retries",
      "infinite",
      "--fragment-retries",
      "infinite",
      "--no-continue",
      "--embed-thumbnail",
      "--embed-subs",
      "--add-metadata",
      "--restrict-filenames",
    ],
  };
  return obj;
}

function onSourcesChange(change) {
  console.log(change);
  if (change.operationType === "insert") {
    createCron(change.fullDocument);
  } else if (change.operationType === "replace") {
    editCron(change.documentKey._id, change.fullDocument);
  } else if (change.operationType === "delete") {
    removeCron(change.documentKey._id);
  }
}

function onSettingsChange(change) {}
