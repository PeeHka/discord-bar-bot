const { MongoClient } = require("mongodb");
const { MONGO_URI } = require("./config");

const client = new MongoClient(MONGO_URI);
let db;

async function connectDB(){
  await client.connect();
  db = client.db("barbot");
  console.log("🍃 MongoDB подключена");
}

module.exports = {
  connectDB,
  users: ()=>db.collection("users"),
  panic: ()=>db.collection("panic_state")
};
