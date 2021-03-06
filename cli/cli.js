const { program } = require("commander");
const prompt = require("readline-sync");
const fs = require("fs");
const cron = require("node-cron");

const db = require("./helpers/db.js");

// Version of the CLI
const cliVersion = "1.0.0";

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
  program.version(cliVersion);

  program
    .command("add")
    .description("Add a New Media Source")
    .action(addSource);

  program
    .command("list [filter]")
    .description("List the Media Sources")
    .action(listSources);

  program
    .command("edit [name]")
    .description("Edit the timing of an added playlist or channel")
    .action(editSource);

  program
    .command("info [name]")
    .description("Get info for a Media Source")
    .action(sourceInfo);

  program
    .command("delete [name]")
    .description("Delete a Media Source")
    .action(deleteSource);

  program
    .command("enable [name]")
    .description("Enable a Media Source")
    .action(enableSource);

  program
    .command("disable [name]")
    .description("Disable a Media Source")
    .action(disableSource);

  program.option(
    "--set-cookies <path>",
    "Set the location of the YT cookies file. The default is /config/cookies.txt\nFor instructions for making the file: https://github.com/ytdl-org/youtube-dl#how-do-i-pass-cookies-to-youtube-dl"
  );

  program.option(
    "--set-timezone <timezone>",
    "Set the timezone that will be used for scheduling the downloading of the videos.\nAvailable timezones: https://momentjs.com/timezone/"
  );

  program.parse();

  if (program.opts().setCookies) {
    db.updateCookieSettings(program.opts().setCookies);
  }

  if (program.opts().setTimezone) {
    db.updateTimezoneSettings(program.opts().setTimezone);
  }
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
    "What is the name of the media source (This will be used as the folder name)? ",
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

  var metadataType = metadataChoices[metadataIndex];
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
    cronFormat = "N/A";
  }

  var sourceObj = sourceTemplate;
  sourceObj.name = name;
  sourceObj.url = url;
  sourceObj.type = type;
  sourceObj.metadataType = metadataType;
  sourceObj.metadata = metadata;
  sourceObj.cron = cronFormat;
  await db.addSource(sourceObj);
  console.log(`${name} added!`);
  db.close();
}

async function listSources(filter) {
  var values = null;
  if (filter != null) {
    if (filter.toLowerCase() == "video") {
      values = await db.getVideoSourcesArray();
      checkListLength(values, "video");
    } else if (filter.toLowerCase() == "playlist") {
      values = await db.getPlaylistSourcesArray();
      checkListLength(values, "playlist");
    } else if (filter.toLowerCase() == "channel") {
      values = await db.getChannelSourcesArray();
      checkListLength(values, "channel");
    } else if (filter.toLowerCase() == "title") {
      values = await db.getTitleMetadataArray();
      checkListLength(values, "title");
    } else if (filter.toLowerCase() == "plex") {
      values = await db.getPlexMetadataArray();
      checkListLength(values, "plex");
    } else if (filter.toLowerCase() == "custom") {
      values = await db.getCustomMetadataArray();
      checkListLength(values, "custom");
    } else {
      values = await db.getSourcesArray();
      checkListLength(values, null);
    }
  } else {
    values = await db.getSourcesArray();
    checkListLength(values, null);
  }

  values.forEach((item) => {
    console.log(`- ${item.name}`);
    if (item.cron != "N/A") {
      console.log(`-- ${item.enabled ? "Enabled" : "Disabled"}`);
    } else {
      console.log(`-- One Time Download`);
    }
  });
  db.close();
}

function checkListLength(values, type) {
  if (values.length > 0) {
    if (type != null) {
      console.log(`Sources with the media type: ${type}:`);
    } else {
      console.log(`All media sources:`);
    }
  } else {
    if (type != null) {
      console.log(`No sources with the media type: ${type}!`);
    } else {
      console.log(`No media sources!`);
    }
  }
}

async function editSource(name) {
  if (name == null) {
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
    var source = await db.getSourceWithName(names[selectedSourceIndex]);
  } else {
    var source = await db.getSourceWithName(name);
  }

  var cron = getTiming();
  await db.updateCronFormat(source._id, cron);
  console.log(`${name} has been update!`);
  db.close();
}

async function deleteSource(name) {
  if (name == null) {
    var values = await db.getSourcesArray();

    var names = [];
    values.forEach((item) => {
      names.push(item.name);
    });

    var selectedSourceIndex = prompt.keyInSelect(
      names,
      "Select a source to delete: "
    );

    if (selectedSourceIndex == -1) db.close();

    if (confirmAction(`delete media source ${names[selectedSourceIndex]}`)) {
      await db.deleteSource(names[selectedSourceIndex]);
      console.log("Media source was deleted!");
    } else {
      console.log("Media source was not deleted!");
    }
  } else {
    if (confirmAction(`delete media source ${name}`)) {
      await db.deleteSource(name);
      console.log("Media source was deleted!");
    } else {
      console.log("Media source was not deleted!");
    }
  }

  db.close();
}

async function sourceInfo(name) {
  var source = null;
  if (name == null) {
    var values = db.getSourcesArray();

    var names = [];
    values.forEach((item) => {
      names.push(item.name);
    });

    var selectedSourceIndex = prompt.keyInSelect(
      names,
      "Select a source to view more info: "
    );

    if (selectedSourceIndex == -1) db.close();

    source = await db.getSourceWithName(names[selectedSourceIndex]);
  } else {
    source = await db.getSourceWithName(name);
  }
  console.log(`Name: ${source.name}`);
  console.log(`Url: ${source.url}`);
  console.log(`Type: ${source.type}`);
  console.log(`Metadata Type: ${source.metadataType}`);
  console.log(`Metadata Format: ${source.metadata}`);
  console.log(`Cron Timing: ${source.cron}`);
  console.log(`Enabled?: ${source.enabled}`);
}

async function enableSource(name) {
  if (name == null) {
    var values = await db.getSourcesArray();

    var names = [];
    values.forEach((item) => {
      names.push(item.name);
    });

    var selectedSourceIndex = prompt.keyInSelect(
      names,
      "Select a source to enable: "
    );

    if (selectedSourceIndex == -1) db.close();
    var source = await db.getSourceWithName(names[selectedSourceIndex]);
  } else {
    var source = await db.getSourceWithName(name);
  }

  db.setEnabled(source._id, true);
  db.close();
}

async function disableSource(name) {
  if (name == null) {
    var values = await db.getSourcesArray();

    var names = [];
    values.forEach((item) => {
      names.push(item.name);
    });

    var selectedSourceIndex = prompt.keyInSelect(
      names,
      "Select a source to disable: "
    );

    if (selectedSourceIndex == -1) db.close();
    var source = await db.getSourceWithName(names[selectedSourceIndex]);
  } else {
    var source = await db.getSourceWithName(name);
  }

  db.setEnabled(source._id, false);
  db.close();
}

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
    console.log("A media source with the same name already exists");
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
    console.log("A media source with the same url already exists");
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
    timing = "N/A";
  }
  return timing;
}

function confirmAction(action) {
  return prompt.keyInYNStrict(`Are you sure that you want to ${action}?`);
}
