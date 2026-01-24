const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID
} = process.env;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Не заданы TOKEN / CLIENT_ID / GUILD_ID");
  process.exit(1);
}

const commands = [

  // ===== BASIC =====
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Список команд"),

  new SlashCommandBuilder()
    .setName("баланс")
    .setDescription("Посмотреть баланс"),

  new SlashCommandBuilder()
    .setName("выпить")
    .setDescription("Выпить алкоголь"),

  new SlashCommandBuilder()
    .setName("магазин")
    .setDescription("Магазин напитков"),

  new SlashCommandBuilder()
    .setName("топ")
    .setDescription("Топ алкашей"),

  // ===== BUY =====
  new SlashCommandBuilder()
    .setName("купить")
    .setDescription("Купить напиток")
    .addStringOption(o =>
      o.setName("товар")
        .setDescription("Название напитка")
        .setRequired(true)
        .addChoices(
          { name: "пиво", value: "пиво" },
          { name: "виски", value: "виски" },
          { name: "водка", value: "водка" },
          { name: "самогон", value: "самогон" },
          { name: "абсент", value: "абсент" }
        )
    ),

  // ===== CASINO =====
  new SlashCommandBuilder()
    .setName("казино")
    .setDescription("Сыграть в казино")
    .addIntegerOption(o =>
      o.setName("ставка")
        .setDescription("Размер ставки")
        .setRequired(true)
        .setMinValue(1)
    ),

  // ===== DICE =====
  new SlashCommandBuilder()
    .setName("кости")
    .setDescription("Сыграть в кости")
    .addIntegerOption(o =>
      o.setName("ставка")
        .setDescription("Размер ставки")
        .setRequired(true)
        .setMinValue(1)
    ),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🔁 Регистрирую slash-команды...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    console.log("✅ Slash-команды успешно зарегистрированы");
  } catch (err) {
    console.error("❌ Ошибка регистрации slash-команд:");
    console.error(err);
    process.exit(1);
  }
})();
