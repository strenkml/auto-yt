const { program } = require("commander");
const prompt = require("readline-sync");
const fs = require("fs");
const cron = require("node-cron");

const db = require("./helpers/db.js");

const sourceTemplate = require("./defaults/source.json");
const config = require("./config.json");

const types = ["Channel", "Playlist", "Video"];

var sources = null;

main();

async function main() {
  await db.init();
  commandLineOptions();
}

function commandLineOptions() {
  program.version("0.0.1");

  program
    .command("add")
    .description("Add a New Video Source")
    .action(addSource);

  program
    .command("list")
    .description("List the Video Sources")
    .action(listSources);

  program
    .command("edit")
    .description("Edit the timing of an added playlist or channel")
    .action(editSource);

  program
    .command("info")
    .description("Get info for a Video Source")
    .action(sourceInfo);

  program
    .command("delete")
    .description("Delete a Video Source")
    .action(deleteSource);

  program.option(
    "--set-cookies <path>",
    "Set the location of the YT cookies file. The default is /config/cookies.txt\nFor instructions for making the file: https://github.com/ytdl-org/youtube-dl#how-do-i-pass-cookies-to-youtube-dl"
  );

  program.parse();
}

function convertToCron(data) {
  var month = data.dayOfMonth || "*";
  var week = data.dayOfWeek || "*";
  var hour = data.hourOfDay;
  var minute = data.minuteOfHour;

  return `${minute} ${hour} ${month} * ${week}`;
}

async function addSource() {
  sources = await db.getSourcesArray();
  var name = prompt.question(
    "What is the name of the video source (This will be used as the folder name)? ",
    { limit: checkNewName }
  );

  var url = prompt.question(
    "What is the url of the channel, playlist, or video? ",
    { limit: checkNewUrl }
  );

  var type = getSourceTypeFromUrl(url);

  var metadataChoices = ["Title", "Plex", "Custom"];
  var metadataIndex = prompt.keyInSelect(
    metadataChoices,
    "What metadata type should be used? "
  );

  if (metadataIndex == -1) db.close();

  var metadata = null;
  if (metadataIndex == 0) {
    metadata = "%(title)s.%(ext)s";
  } else if (metadataIndex == 1) {
    metadata =
      "%(uploader)s [%(channel_id)s]/%(playlist_index)s - %(title)s [%(id)s].%(ext)s";
  } else if (metadataIndex == 2) {
    metadata = prompt.question(
      "Enter a custom template (https://github.com/ytdl-org/youtube-dl#output-template): "
    );
  }

  var cronFormat = null;
  if (type != types[2]) {
    cronFormat = getTiming();
  } else {
    cronFormat = "no";
  }

  var sourceObj = sourceTemplate;
  sourceObj.name = name;
  sourceObj.url = url;
  sourceObj.type = type;
  sourceObj.metadata = metadata;
  sourceObj.cron = cronFormat;
  await db.addSource(sourceObj);
  db.close();
}

async function listSources() {
  var values = await db.getSourcesArray();

  values.forEach((item) => {
    console.log(`- ${item.name}`);
  });
  db.close();
}

// TODO: Add the ability to edit by name
async function editSource() {
  var values = await db.getSourcesPlaylistChannelArray();

  var names = [];
  values.forEach((item) => {
    names.push(item.name);
  });

  var selectedSourceIndex = prompt.keyInSelect(
    names,
    "Select a source to edit: "
  );

  if (selectedSourceIndex == -1) db.close();

  var source = await db.hasSourceWithName(names[selectedSourceIndex]);

  var cron = getTiming();
  db.updateCronFormat(source._id, cron);
}

// TODO: Add the ability to delete by name
// TODO: Add a confirmation for deleting a source
function deleteSource() {
  var values = db.getSourcesArray();

  var names = [];
  values.forEach((item) => {
    names.push(item.name);
  });

  var selectedSourceIndex = prompt.keyInSelect(
    names,
    "Select a source to delete: "
  );

  db.deleteSource(names[selectedSourceIndex]);
  db.close();
}

function sourceInfo() {}

function checkNewName(name) {
  // Check if there is already a folder in the download directory with the same name
  try {
    if (fs.existsSync(`${config.downloadDir}/${name}`)) {
      console.log(
        "An directory with this name already exists in the download directory!"
      );
      return false;
    }
  } catch (e) {
    console.log("An error has occurred, please try again.");
    return false;
  }

  // Check if there is a source that has the same name
  if (sources.find((e) => e.name === name)) {
    console.log("A video source with the same name already exists");
    return false;
  }
  return true;
}

function checkNewUrl(url) {
  // Check if the URL is valid
  let regex =
    /^https?:\/\/(www\.)?youtube\.com\/c\/\S+$|^https?:\/\/(www\.)?youtube\.com\/channel\/\S+$|^https?:\/\/(www\.)?youtube\.com\/playlist\?list=\S+$|^https?:\/\/(www\.)?youtube\.com\/watch\?v=\S+$/;
  if (!url.match(regex)) {
    console.log("Invalid URL!");
    return false;
  }

  // Check if there is a source that has the same url
  if (sources.find((e) => e.url === url)) {
    console.log("A video source with the same url already exists");
    return false;
  }
  return true;
}

function getSourceTypeFromUrl(url) {
  let channelRegex =
    /^https?:\/\/(www\.)?youtube\.com\/c\/\S+$|^https?:\/\/(www\.)?youtube\.com\/channel\/\S+$/;
  let playlistRegex = /^https?:\/\/(www\.)?youtube\.com\/playlist\?list=\S+$/;
  let videoRegex = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=\S+$/;

  if (url.match(channelRegex)) {
    return types[0];
  }

  if (url.match(playlistRegex)) {
    return types[1];
  }

  if (url.match(videoRegex)) {
    return types[2];
  }
  return null;
}

function getTiming() {
  var timing = null;

  var frequencyChoices = ["One time", "Use scheduler"];
  var frequencyIndex = prompt.keyInSelect(
    frequencyChoices,
    "How often should the videos be downloaded? "
  );

  if (frequencyIndex == -1) db.close();

  if (frequencyIndex == 1) {
    var timingMethodChoice = [
      "Basic Timing Configurator",
      "Custom (cron format)",
    ];
    var timingMethodIndex = prompt.keyInSelect(
      timingMethodChoice,
      "How would you like the configure the scheduler? "
    );

    if (timingMethodIndex == -1) db.close();

    if (timingMethodIndex == 0) {
      var occurrenceChoices = ["Monthly", "Weekly", "Daily", "Hourly"];
      var occurrenceIndex = prompt.keyInSelect(
        occurrenceChoices,
        "How often would you like to check for new videos? "
      );

      if (occurrenceIndex == -1) db.close();

      switch (occurrenceIndex) {
        case 0:
          var dayOfMonth = prompt.question(
            "What day of the month should new videos be checked for (1-31)? ",
            { limit: /^([1-9]|[12][0-9]|3[01])$/ }
          );
          var hourOfDay = prompt.question(
            "What hour of the day should new videos be checked for (0-23)? ",
            { limit: /^(1{0,1}[0-9]|2[0-3])$/ }
          );
          var minuteOfHour = prompt.question(
            "What minute of the hour should new videos be checked for (0-59)? ",
            { limit: /^([0-5]{0,1}[0-9])$/ }
          );
          break;
        case 1:
          var dayOfWeek = prompt.question(
            "What day of the week should new videos be checked for (1-7)? ",
            { limit: /^[1-7]$/ }
          );
        case 2:
          var hourOfDay = prompt.question(
            "What hour of the day should new videos be checked for (0-23)? ",
            { limit: /^(1{0,1}[0-9]|2[0-3])$/ }
          );
        case 3:
          var minuteOfHour = prompt.question(
            "What minute of the hour should new videos be checked for (0-59)? ",
            { limit: /^([0-5]{0,1}[0-9])$/ }
          );
      }
      timing = convertToCron({
        dayOfMonth: dayOfMonth,
        dayOfWeek: dayOfWeek,
        hourOfDay: hourOfDay,
        minuteOfHour: minuteOfHour,
      });
    } else {
      timing = prompt.question("In cron format, enter a custom schedule: ", {
        limit: (input) => {
          return cron.validate(input);
        },
      });
    }
  } else {
    timing = "no";
  }
  return timing;
}
