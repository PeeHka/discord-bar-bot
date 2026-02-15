const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { TOKEN } = require("./config");
const { connectDB } = require("./database");
const fs = require("fs");
const path = require("path");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");

for(const file of fs.readdirSync(commandsPath)){
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

client.once("ready", ()=>{
  console.log("🛒 SHOP BOT ONLINE");
});

client.on("interactionCreate", async interaction=>{

  if(!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);

  if(cmd) await cmd.execute(interaction);

});

(async()=>{
  await connectDB();
  await client.login(TOKEN);
})();
