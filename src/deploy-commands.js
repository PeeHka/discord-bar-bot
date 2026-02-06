const { REST, Routes } = require("discord.js");
const { TOKEN, CLIENT_ID, GUILD_ID } = require("./config");
const fs = require("fs");
const path = require("path");

const commands = [];
for(const file of fs.readdirSync(path.join(__dirname,"commands"))){
  const cmd = require(`./commands/${file}`);
  commands.push(cmd.data.toJSON());
}

const rest = new REST({version:"10"}).setToken(TOKEN);
(async()=>{
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("✅ Slash-команды зарегистрированы");
})();
