const Enmap = require("enmap");
const { program } = require("commander");
const prompt = require("readline-sync");
const fs = require("fs");

const sourceTemplate = require("./defaults/source.json");
const config = require("./config.json");

const types = ["Channel", "Playlist", "Video"];

const settings = new Enmap({
  name: "settings",
  autoEnsure: {
    cookiesFile: "cookies.txt",
  },
});

const sources = new Enmap({
  name: "sources",
});

program.version("0.0.1");

program.command("add").description("Add a New Video Source").action(addSource);

program
  .command("list")
  .description("List the Video Source")
  .action(listSources);

program.command("edit").description("Edit a Video Source").action(editSource);

program
  .command("info")
  .description("Get info for a Video Source")
  .action(sourceInfo);

program
  .command("delete")
  .description("Delete Video Source")
  .action(deleteSource);

program.option(
  "--set-cookies <path>",
  "Set the location of the YT cookies file. The default is /config/cookies.txt\nFor instructions for making the file: https://github.com/ytdl-org/youtube-dl#how-do-i-pass-cookies-to-youtube-dl"
);

program.parse();

function convertToCron(data) {
  var month = data.dayOfMonth || "*";
  var week = data.dayOfWeek || "*";
  var hour = data.hourOfDay;
  var minute = data.minuteOfHour;

  return `${minute} ${hour} ${month} * ${week}`;
}

function addSource() {
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

  if (metadataIndex == -1) return;

  var customMetadata = null;
  if (metadataIndex == 2) {
    customMetadata = prompt.question(
      "Enter a custom template (https://github.com/ytdl-org/youtube-dl#output-template): "
    );
  }
  var metadata = metadataChoices[metadataIndex];

  var cronFormat = null;
  if (type != types[2]) {
    var frequencyChoices = ["One time", "Use scheduler"];
    var frequencyIndex = prompt.keyInSelect(
      frequencyChoices,
      "How often should the videos be downloaded? "
    );

    if (frequencyIndex == -1) return;

    if (frequencyIndex == 1) {
      var timingMethodChoice = [
        "Basic Timing Configurator",
        "Custom (cron format)",
      ];
      var timingMethodIndex = prompt.keyInSelect(
        timingMethodChoice,
        "How would you like the configure the scheduler? "
      );

      if (timingMethodIndex == -1) return;

      if (timingMethodIndex == 0) {
        var occurrenceChoices = ["Monthly", "Weekly", "Daily", "Hourly"];
        var occurrenceIndex = prompt.keyInSelect(
          occurrenceChoices,
          "How often would you like to check for new videos? "
        );

        if (occurrenceIndex == -1) return;

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
        cronFormat = convertToCron({
          dayOfMonth: dayOfMonth,
          dayOfWeek: dayOfWeek,
          hourOfDay: hourOfDay,
          minuteOfHour: minuteOfHour,
        });
      } else {
        cronFormat = prompt.question(
          "In cron format, enter a custom schedule: ",
          {
            limit:
              /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|(^((?!\*-)((\d+,)+\d+|([\d\*]+(\/|-)\d+)|\d+|(?<!\d)\*(?!\d)) ?){5,7})/,
          }
        );
      }
    } else {
      cronFormat = "no";
    }
  } else {
    cronFormat = "no";
  }

  var currentKey = sources.autonum;
  sources.set(currentKey, sourceTemplate);
  sources.set(currentKey, name, "name");
  sources.set(currentKey, url, "url");
  sources.set(currentKey, type, "type");
  sources.set(currentKey, metadata, "metadata");
  sources.set(currentKey, cronFormat, "cron");
  if (customMetadata != null) {
    sources.set(currentKey, customMetadata, "customMetadata");
  }

  console.log(sources.get(currentKey));
}

function listSources() {
  var values = sources.array();

  values.forEach((item) => {
    console.log(`- ${item.name}`);
  });
}

// TODO: Add the ability to edit by name
function editSource() {
  var keys = sources.keyArray();
  var values = sources.array();

  var names = [];
  values.forEach((item) => {
    names.push(item.name);
  });

  var selectedSourceIndex = prompt.keyInSelect(
    names,
    "Select a source to edit: "
  );

  if (selectedSourceIndex == -1) return;

  var source = sources.get(keys[selectedSourceIndex]);

  var editChoices = ["Name", "URL", "Metadata Type", "Schedule"];
  var editIndex = prompt.keyInSelect(
    editChoices,
    "Select a video source setting to change: "
  );

  if (editIndex == -1) return;
}

// TODO: Add the ability to delete by name
// TODO: Add a confirmation for deleting a source
function deleteSource() {
  var keys = sources.keyArray();
  var values = sources.array();

  var names = [];
  values.forEach((item) => {
    names.push(item.name);
  });

  var selectedSourceIndex = prompt.keyInSelect(
    names,
    "Select a source to delete: "
  );
  sources.delete(keys[selectedSourceIndex]);
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
  if (sources.find((val) => val.name === name)) {
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
  if (sources.find((val) => val.url === url)) {
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
