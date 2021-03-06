const { MongoClient } = require("mongodb");

const settingsDefaults = require("../defaults/settings.json");

// Get the URL from the env variable
const mongoUrl = process.env.ME_CONFIG_MONGODB_URL;

const client = new MongoClient(mongoUrl);

// Database name
const dbName = "autoYT";

const settingsCollection = "settings";
const sourcesCollection = "sources";

// Variables
var db = null;
var settings = null;
var sources = null;

module.exports.init = async () => {
  await client.connect();
  db = client.db(dbName);
  settings = db.collection(settingsCollection);
  sources = db.collection(sourcesCollection);
  console.log("Successsfully connected to the DB");
};

module.exports.getSourcesArray = async () => {
  return await sources.find({}).toArray();
};

module.exports.getSourceById = async (id) => {
  return await sources.findOne({ _id: id });
};

module.exports.getSourcesWatchStream = () => {
  return sources.watch();
};

module.exports.getSettingsWatchStream = () => {
  return settings.watch();
};

module.exports.setSettingsDefaults = async () => {
  settingsDefaults.defaults.forEach(async (setting) => {
    console.log(await this.getSettingById(setting._id));
    if (!(await this.getSettingById(setting._id))) {
      console.log(`Inserting for setting: ${setting._id}`);
      await settings.insertOne(setting);
    }
  });
};

module.exports.getSettingById = async (id) => {
  return await settings.findOne({ _id: id });
};
