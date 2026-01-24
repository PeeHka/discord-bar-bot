const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder().setName("выпить").setDescription("Выпить алкоголь"),
  new SlashCommandBuilder().setName("баланс").setDescription("Посмотреть баланс"),
  new SlashCommandBuilder().setName("топ").setDescription("Топ алкашей"),
  new SlashCommandBuilder().setName("магазин").setDescription("Магазин алкоголя"),

  new SlashCommandBuilder()
    .setName("купить")
    .setDescription("Купить алкоголь")
    .addStringOption(o =>
      o.setName("товар").setDescription("Название").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("казино")
    .setDescription("Сыграть в казино")
    .addIntegerOption(o =>
      o.setName("ставка").setDescription("Ставка").setRequired(true)
    ),

  new SlashCommandBuilder().setName("кости").setDescription("Сыграть в кости"),
  new SlashCommandBuilder().setName("help").setDescription("Помощь"),

  // OWNER
  new SlashCommandBuilder()
    .setName("admin_add")
    .setDescription("Добавить админа")
    .addUserOption(o =>
      o.setName("user").setDescription("Кого").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("admin_delete")
    .setDescription("Удалить админа")
    .addUserOption(o =>
      o.setName("user").setDescription("Кого").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("money_give")
    .setDescription("Выдать валюту")
    .addUserOption(o => o.setName("user").setDescription("Кому").setRequired(true))
    .addIntegerOption(o => o.setName("amount").setDescription("Сколько").setRequired(true)),

  new SlashCommandBuilder()
    .setName("money_take")
    .setDescription("Забрать валюту")
    .addUserOption(o => o.setName("user").setDescription("У кого").setRequired(true))
    .addIntegerOption(o => o.setName("amount").setDescription("Сколько").setRequired(true)),

  new SlashCommandBuilder()
    .setName("money_reset")
    .setDescription("Сбросить валюту")
    .addUserOption(o => o.setName("user").setDescription("Кому").setRequired(true)),
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands.map(c => c.toJSON()) }
  );
  console.log("✅ Slash-команды зарегистрированы");
})();
