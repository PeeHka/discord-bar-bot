const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { TOKEN } = require("./config");
const { connectDB } = require("./database");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

for(const file of fs.readdirSync(path.join(__dirname,"commands"))){
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

client.once("ready", ()=>{
  console.log("🍻 BAR + CASINO + ADMIN BOT (FIXED) ONLINE");
});

client.on("interactionCreate", async i=>{
  if(i.isChatInputCommand()){
    const cmd = client.commands.get(i.commandName);
    if(cmd) await cmd.execute(i);
  }
  if(i.isButton() && i.customId==="panic_restore"){
    const restore = require("./panic_restore");
    await restore(i);
  }
});

(async()=>{
  await connectDB();
  await client.login(TOKEN);
})();
