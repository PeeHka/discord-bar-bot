module.exports = async function log(client, text){
  const { LOG_CHANNEL_ID } = require("../config/env");
  if(!LOG_CHANNEL_ID) return;
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);
  if(ch) ch.send("📜 " + text);
};
