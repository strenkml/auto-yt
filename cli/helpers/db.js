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

module.exports.close = async () => {
  await client.close();
  console.log("Closed Connection!");
  process.exit(0);
};

module.exports.addSource = async (value) => {
  await sources.insertOne(value);
};

module.exports.deleteSource = async (name) => {
  const query = { name: name };
  var result = db.deleteOne(query);
};

module.exports.hasSourceWithName = async (name) => {
  const query = { name: name };

  var result = await sources.findOne(query);
  console.log(result);
  if (result) return true;
  return false;
};

module.exports.hasSourceWithUrl = async (url) => {
  const query = { url: url };

  var result = await sources.findOne(query);
  if (result) return true;
  return false;
};

module.exports.getSourcesArray = async () => {
  return await sources.find({}).toArray();
};
