const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder().setName("help").setDescription("Список команд"),
  new SlashCommandBuilder().setName("баланс").setDescription("Баланс"),
  new SlashCommandBuilder()
    .setName("выпить")
    .setDescription("Выпить")
    .addStringOption(o => o.setName("напиток").setRequired(false)),
  new SlashCommandBuilder()
    .setName("казино")
    .setDescription("Рулетка")
    .addIntegerOption(o => o.setName("ставка").setRequired(true)),
  new SlashCommandBuilder()
    .setName("кости")
    .setDescription("Кости")
    .addIntegerOption(o => o.setName("ставка").setRequired(true)),
  new SlashCommandBuilder().setName("топ").setDescription("Топ"),
  new SlashCommandBuilder().setName("шутка").setDescription("Шутка"),
  new SlashCommandBuilder().setName("шар").setDescription("Шар предсказаний"),
  new SlashCommandBuilder().setName("напиться").setDescription("Напиться"),

  new SlashCommandBuilder()
    .setName("роль_выдать")
    .setDescription("Выдать роль")
    .addUserOption(o => o.setName("пользователь").setRequired(true))
    .addRoleOption(o => o.setName("роль").setRequired(true)),

  new SlashCommandBuilder()
    .setName("роль_забрать")
    .setDescription("Забрать роль")
    .addUserOption(o => o.setName("пользователь").setRequired(true))
    .addRoleOption(o => o.setName("роль").setRequired(true)),

  new SlashCommandBuilder()
    .setName("права_дать")
    .setDescription("Выдать право роли")
    .addRoleOption(o => o.setName("роль").setRequired(true))
    .addStringOption(o => o.setName("право").setRequired(true)),

  new SlashCommandBuilder()
    .setName("права_забрать")
    .setDescription("Забрать право роли")
    .addRoleOption(o => o.setName("роль").setRequired(true))
    .addStringOption(o => o.setName("право").setRequired(true)),

  new SlashCommandBuilder()
    .setName("admin_add")
    .setDescription("Добавить админа")
    .addUserOption(o => o.setName("пользователь").setRequired(true)),

  new SlashCommandBuilder()
    .setName("admin_delete")
    .setDescription("Удалить админа")
    .addUserOption(o => o.setName("пользователь").setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  console.log("⏳ Регистрирую slash-команды...");
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );
  console.log("✅ Slash-команды зарегистрированы");
})();
