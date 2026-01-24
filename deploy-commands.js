const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder().setName("help").setDescription("Помощь"),
  new SlashCommandBuilder().setName("баланс").setDescription("Баланс"),
  new SlashCommandBuilder().setName("выпить").setDescription("Выпить"),
  new SlashCommandBuilder().setName("казино").setDescription("Казино"),
  new SlashCommandBuilder().setName("кости").setDescription("Кости"),
  new SlashCommandBuilder().setName("магазин").setDescription("Магазин"),
  new SlashCommandBuilder()
    .setName("купить")
    .setDescription("Купить напиток")
    .addStringOption(o =>
      o.setName("напиток")
        .setRequired(true)
        .addChoices(
          { name: "пиво", value: "пиво" },
          { name: "виски", value: "виски" },
          { name: "водка", value: "водка" },
          { name: "самогон", value: "самогон" },
          { name: "абсент", value: "абсент" }
        )
    ),
  new SlashCommandBuilder().setName("титул").setDescription("Титул"),
  new SlashCommandBuilder().setName("топ").setDescription("Топ"),

  // OWNER ONLY
  new SlashCommandBuilder()
    .setName("admin_add")
    .setDescription("Добавить админа (овнер)")
    .addUserOption(o => o.setName("пользователь").setRequired(true)),

  new SlashCommandBuilder()
    .setName("admin_delete")
    .setDescription("Удалить админа (овнер)")
    .addUserOption(o => o.setName("пользователь").setRequired(true)),

  new SlashCommandBuilder()
    .setName("money_give")
    .setDescription("Выдать валюту (овнер)")
    .addUserOption(o => o.setName("пользователь").setRequired(true))
    .addIntegerOption(o => o.setName("количество").setRequired(true)),

  new SlashCommandBuilder()
    .setName("money_take")
    .setDescription("Забрать валюту (овнер)")
    .addUserOption(o => o.setName("пользователь").setRequired(true))
    .addIntegerOption(o => o.setName("количество").setRequired(true)),

  new SlashCommandBuilder()
    .setName("money_reset")
    .setDescription("Сбросить валюту (овнер)")
    .addUserOption(o => o.setName("пользователь").setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash-команды обновлены");
})();
