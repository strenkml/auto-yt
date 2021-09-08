const Enmap = require("enmap");
const { program } = require("commander");
const prompt = require("prompt");

const sourceTemplate = require("./templates/source.json");

const settings = new Enmap({
  name: "settings",
  dataDir: "/config/settings",
});

const sources = new Enmap({
  name: "sources",
  dataDir: "/config/sources",
});

program.version("0.0.1");

program.command("add").description("Add a New Video Source").action(addSource);

program
  .command("list")
  .description("List the Video Source")
  .action(() => {
    console.log("Listing sources");
  });

program
  .command("edit")
  .description("Edit a Video Source")
  .action(() => {
    console.log("Editing source");
  });

program
  .command("delete")
  .description("Delete Video Source")
  .action(() => {
    console.log("Deleting source");
  });

program.option(
  "--set-cookies <path>",
  "Set the location of the YT cookies file. The default is /config/cookies.txt\nFor instructions for making the file: https://github.com/ytdl-org/youtube-dl#how-do-i-pass-cookies-to-youtube-dl"
);

program.parse();

console.log(program.opts());

function addSource() {
  let newSource = {
    properties: {
      name: {
        description: "Enter the name of the video source",
        type: "string",
        required: true,
      },
      sourceUrl: {
        description: "Enter the URL of a channel, playlist, or video",
        type: "string",
        required: true,
      },
      sourceType: {
        description:
          "Enter the type of the video source. Channel, playlist, or video",
        pattern: /^channel$|^video$|^playlist$/,
        message:
          "Invalid selection!  Must be either channel, playlist, or video",
        type: "string",
        required: true,
      },
      metadata: {
        description:
          "Select one of the options below for the type of metadata to use:\n(1) Title\n(2) Plex",
        type: "integer",
        pattern: /^[1-2]$/,
        message: "Must be a number between 1 and 2",
        required: true,
        default: 2,
      },
    },
  };

  let occurrence = {
    properties: {
      occurrence: {
        description:
          "Select one of the options below for the type of download it is:\n(1) one time download\n(2) should the videos be grabbed on a schedule",
        type: "integer",
        pattern: /^[1-2]$/,
        message: "Must be a number between 1 and 2",
        required: true,
      },
    },
  };

  let configuratorType = {
    properties: {
      configuratorType: {
        description:
          "Select one of the options below for setting a schdule:\n(1) Use Configurator\n(2) Cron format",
        type: "integer",
        pattern: /^[1-2]$/,
        message: "Must be a number between 1 and 2",
        required: true,
        default: 1,
      },
    },
  };

  let timeConfigurator = {
    properties: {
      timeTable: {
        description:
          "Select an option below for how often the videos should be grabbed:\n(1) Montly\n(2) Weekly\n(3) Daily\n(4) Hourly",
        type: "integer",
        pattern: /^[1-4]$/,
        message: "Invalid selection! Must be either 1, 2, 3, or 4",
        required: true,
      },
    },
  };

  let monthly = {
    properties: {
      dayOfMonth: {
        description: "Enter the day of the month to check for new videos",
        pattern: /^[1-31]$/,
        type: "integer",
        message: "Invalid day of the month!",
        required: true,
      },
    },
  };

  let weekly = {
    properties: {
      dayOfweek: {
        description:
          "Enter the day of the week (a number 1-7) to check for new videos.",
        pattern: /^[1-7]$/,
        type: "integer",
        message: "Invalid day of the week!",
        required: true,
      },
    },
  };

  let daily = {
    properties: {
      hourOfDay: {
        description:
          "Enter the hour of the day (a number 0-23) to check for new videos",
        pattern: /^[0-23]$/,
        type: "integer",
        message: "Invalid hour of the day!",
        required: true,
      },
    },
  };

  let hourly = {
    properties: {
      minuteOfHour: {
        description:
          "Enter the minute of the hour (a number 0-59) to check for new videos",
        pattern: /^[0-59]$/,
        type: "integer",
        message: "Invalid minute of the hour!",
        required: true,
      },
    },
  };

  let cronFormat = {
    properties: {
      cron: {
        description: "Enter a schedule in the cron format:",
        pattern:
          /(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|(^((?!\*-)((\d+,)+\d+|([\d\*]+(\/|-)\d+)|\d+|(?<!\d)\*(?!\d)) ?){5,7})/,
        message: "Invalid cron format!",
        type: "string",
        required: true,
      },
    },
  };

  prompt.start();

  var dayOfMonth = null;
  var dayOfWeek = null;
  var hour = null;
  var minute = null;

  var currentKey = null;
  prompt.get(newSource, (err, sourceRes) => {
    currentKey = sources.autonum;
    sources.set(currentKey, sourceTemplate);
    sources.set(currentKey, newSource.name, "name");
    sources.set(currentKey, newSource.sourceUrl, "url");
    sources.set(currentKey, newSource.sourceType, "type");
    sources.set(currentKey, newSource.metadata, "metadata");
    if (sourceRes.sourceType != "video") {
      prompt.get(occurrence, (err, occurrenceRes) => {
        if (occurrenceRes.occurrence == 2) {
          prompt.get(configuratorType, (err, configuratorTypeRes) => {
            if (configuratorTypeRes.configuratorType == 1) {
              prompt.get(timeConfigurator, (err, timeConfiguratorRes) => {
                switch (timeConfiguratorRes.timeTable) {
                  case 1:
                    prompt.get(monthly, (err, monthlyRes) => {
                      dayOfMonth = monthlyRes.dayOfMonth;
                    });
                    prompt.get(daily, (err, dailyRes) => {
                      hour = dailyRes.hourOfDay;
                    });
                    prompt.get(hourly, (err, hourslyRes) => {
                      minute = hourslyRes.minuteOfHour;
                    });
                    break;
                  case 2:
                    prompt.get(weekly, (err, weeklyRes) => {
                      dayOfWeek = weeklyRes.dayOfWeek;
                    });
                  case 3:
                    prompt.get(daily, (err, dailyRes) => {
                      hour = dailyRes.hourOfDay;
                    });
                  case 4:
                    prompt.get(hourly, (err, hourslyRes) => {
                      minute = hourslyRes.minuteOfHour;
                    });
                }
                sources.set(
                  currentKey,
                  convertToCron({
                    dayOfMonth: dayOfMonth,
                    dayOfWeek: dayOfWeek,
                    hourOfDay: hour,
                    minuteOfHour: minute,
                  }),
                  "cron"
                );
              });
            } else {
              prompt.get(cronFormat, (err, format) => {
                sources.set(currentKey, format, "cron");
              });
            }
          });
        } else {
          sources.set(currentKey, "no", "cron");
        }
      });
    }
  });
}

function convertToCron(data) {
  var month = data.dayOfMonth || "*";
  var week = data.dayOfWeek || "*";
  var hour = data.hourOfDay;
  var minute = data.minuteOfHour;

  return `${minute} ${hour} ${month} * ${week}`;
}
