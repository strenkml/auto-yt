const { MongoClient } = require("mongodb");

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
  settings = db.collection("settings");
  sources = db.collection("sources");
  console.log("Successsfully connected to the DB");
};

module.exports.getSourcesArray = async () => {
  return await sources.find({}).toArray();
};
