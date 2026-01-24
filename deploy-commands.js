const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder().setName("help").setDescription("Помощь"),
  new SlashCommandBuilder().setName("баланс").setDescription("Твой баланс"),
  new SlashCommandBuilder().setName("выпить").setDescription("Выпить пиво"),
  new SlashCommandBuilder().setName("казино").setDescription("Сыграть в казино"),
  new SlashCommandBuilder().setName("кости").setDescription("Бросить кости"),
  new SlashCommandBuilder().setName("магазин").setDescription("Магазин бара"),
  new SlashCommandBuilder()
    .setName("купить")
    .setDescription("Купить напиток")
    .addStringOption(o =>
      o.setName("напиток")
        .setDescription("Что купить")
        .setRequired(true)
        .addChoices(
          { name: "🍺 пиво", value: "пиво" },
          { name: "🥃 виски", value: "виски" },
          { name: "🍾 водка", value: "водка" },
          { name: "☠ самогон", value: "самогон" },
          { name: "🧪 абсент", value: "абсент" }
        )
    ),
  new SlashCommandBuilder().setName("титул").setDescription("Твой титул"),
  new SlashCommandBuilder().setName("топ").setDescription("Топ алкашей")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash-команды зарегистрированы");
})();
