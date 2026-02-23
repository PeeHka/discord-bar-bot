const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { TOKEN, CLIENT_ID, GUILD_ID } = require("./config");

const commands = [

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Очистить память диалога"),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("Выдать или забрать роль")
    .addStringOption(o =>
      o.setName("action")
       .setDescription("add или remove")
       .setRequired(true)
       .addChoices(
         { name: "add", value: "add" },
         { name: "remove", value: "remove" }
       )
    )
    .addUserOption(o =>
      o.setName("user")
       .setDescription("Пользователь")
       .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName("role")
       .setDescription("Роль")
       .setRequired(true)
    )

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Команды зарегистрированы");
})();
