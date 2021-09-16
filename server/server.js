const cron = require("node-cron");
const { spawn } = require("child_process");
const fs = require("fs");

const db = require("./helpers/db.js");

const config = require("./config.json");

// Declare variables
var downloads = [];
var sourcesWatch = null;
var settingsWatch = null;

init();

async function init() {
  await db.init();
  await db.setSettingsDefaults();

  sourcesWatch = db.getSourcesWatchStream();
  settingsWatch = db.getSettingsWatchStream();

  sourcesWatch.on("change", onSourcesChange);
  settingsWatch.on("change", onSettingsChange);

  var sources = await db.getSourcesArray();

  sources.forEach((source) => {
    if (source.cron != "N/A") {
      createCron(source, true);
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

function createCron(source, onStart) {
  // Instantly start downloading the media source if the server is not starting up
  if (!onStart) {
    var instantCmd = createYTDLCommand(
      source.url,
      source.name,
      source.metadata
    );
    var instantChild = spawn(instantCmd.command, instantCmd.args);

    instantChild.stdout.on("data", (data) => {
      console.log(`stdout:\n${data}`);
    });

    instantChild.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    instantChild.on("error", (error) => {
      console.error(`error: ${error.message}`);
    });

    instantChild.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
    });
  }

  var child = null;
  let task = cron.schedule(
    source.cron,
    async () => {
      var cmd = createYTDLCommand(source.url, source.name, source.metadata);
      child = spawn(cmd.command, cmd.args);

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
      scheduled: source.enabled,
      timezone: await db.getSettingById("timezone"),
    }
  );

  downloads.push({
    key: source._id,
    task: task,
    running: enabled,
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
  createCron(newSource, false);
}

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
  try {
    // Check if the cookies file exists
    if (fs.existsSync(db.getSettingById("cookiesFile"))) {
      args.push("--cookies");
      args.push(db.getSettingById("cookiesFile"));
    }
  } catch (e) {
    console.error("Cookies file not found!");
  }
  return obj;
}

function onSourcesChange(change) {
  console.log(change);
  if (change.operationType === "insert") {
    createCron(change.fullDocument, false);
  } else if (change.operationType === "replace") {
    editCron(change.documentKey._id, change.fullDocument);
  } else if (change.operationType === "delete") {
    removeCron(change.documentKey._id);
  }
}

function onSettingsChange(change) {
  if (change.documentKey._id == "timezone") {
    changeGlobalTimezone();
  }
}

function changeGlobalTimezone() {
  var _downloads = downloads;
  _downloads.forEach((download) => {
    // Kill spawned command
    download.child.kill("SIGINT");
    // Remove cron
    if (download.task != null) download.task.destroy();

    // Remove cron from array
    downloads = downloads.find((item) => item.key != download.key);

    // Add a new cron with the new timezone
    createCron(db.getSourceById(download.key), true);
  });
}
