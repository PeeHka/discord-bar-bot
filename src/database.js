const { MongoClient } = require("mongodb");
const { MONGO_URI } = require("./config");

const client = new MongoClient(MONGO_URI);
let db;

async function connectDB(){
  await client.connect();
  db = client.db("admin_ai_bot");
  console.log("🍃 MongoDB подключена");
}

module.exports = {
  connectDB,
  memory: () => db.collection("memory")
};
