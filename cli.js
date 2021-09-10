const Enmap = require("enmap");
const { program } = require("commander");
const prompt = require("readline-sync");

const sourceTemplate = require("./templates/source.json");

const settings = new Enmap({
  name: "settings",
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
  // TODO: Check if the name already exists
  var name = prompt.question(
    "What is the name of the video source (This will be used as the folder name)? "
  );

  // TODO: Add validation to the url and check if the URL already exists
  var url = prompt.question(
    "What is the url of the channel, playlist, or video? "
  );

  // TODO: Pull this information automatically from the URL
  var typeChoices = ["Channel", "Playlist", "Video"];
  var typeIndex = prompt.keyInSelect(
    typeChoices,
    "What type is the video source? "
  );
  var type = typeChoices[typeIndex];

  var metadataChoices = ["Title", "Plex", "Custom"];
  var metadataIndex = prompt.keyInSelect(
    metadataChoices,
    "What metadata type should be used? ",
    { defaultInput: 2 }
  );

  var customMetadata = null;
  if (metadataIndex == 2) {
    customMetadata = prompt.question(
      "Enter a custom template (https://github.com/ytdl-org/youtube-dl#output-template): "
    );
  }
  var metadata = metadataChoices[metadataIndex];

  var cronFormat = null;
  if (typeIndex != 2) {
    var frequencyChoices = ["One time", "Use scheduler"];
    var frequencyIndex = prompt.keyInSelect(
      frequencyChoices,
      "How often should the videos be downloaded? ",
      { defaultInput: 2 }
    );

    if (frequencyIndex == 1) {
      var timingMethodChoice = [
        "Basic Timing Configurator",
        "Custom (cron format)",
      ];
      var timingMethodIndex = prompt.keyInSelect(
        timingMethodChoice,
        "How would you like the configure the scheduler? ",
        { defaultInput: 1 }
      );

      if (timingMethodIndex == 0) {
        var occurrenceChoices = ["Monthly", "Weekly", "Daily", "Hourly"];
        var occurrenceIndex = prompt.keyInSelect(
          occurrenceChoices,
          "How often would you like to check for new videos? "
        );

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
  var source = sources.get(keys[selectedSourceIndex]);

  var editChoices = ["Name", "URL", "Metadata Type", "Schedule"];
  var editIndex = prompt.keyInSelect(
    editChoices,
    "Select a video source setting to change: "
  );
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
