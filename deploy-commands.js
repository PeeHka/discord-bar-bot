const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [

  new SlashCommandBuilder()
    .setName("выпить")
    .setDescription("Выпить алкоголь")
    .addStringOption(o =>
      o.setName("напиток")
        .setDescription("Что будем пить")
        .setRequired(false)
        .addChoices(
          { name: "Пиво 🍺", value: "beer" },
          { name: "Виски 🥃", value: "whiskey" },
          { name: "Водка 🍸", value: "vodka" }
        )
    ),

  new SlashCommandBuilder()
    .setName("магазин")
    .setDescription("Магазин алкоголя"),

  new SlashCommandBuilder()
    .setName("купить")
    .setDescription("Купить напиток")
    .addStringOption(o =>
      o.setName("товар")
        .setDescription("Что купить")
        .setRequired(true)
        .addChoices(
          { name: "Пиво 🍺", value: "beer" },
          { name: "Виски 🥃", value: "whiskey" },
          { name: "Водка 🍸", value: "vodka" }
        )
    ),

  new SlashCommandBuilder()
    .setName("казино")
    .setDescription("Сыграть в казино")
    .addIntegerOption(o =>
      o.setName("ставка")
        .setDescription("Сумма ставки")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("кости")
    .setDescription("Сыграть в кости")
    .addIntegerOption(o =>
      o.setName("ставка")
        .setDescription("Сумма ставки")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("топ")
    .setDescription("Топ алкашей"),

  new SlashCommandBuilder()
    .setName("set_cd")
    .setDescription("Изменить кулдаун (ОВНЕР)")
    .addStringOption(o =>
      o.setName("команда")
        .setDescription("Для какой команды")
        .setRequired(true)
        .addChoices(
          { name: "выпить", value: "drink" },
          { name: "казино", value: "casino" },
          { name: "кости", value: "dice" }
        )
    )
    .addIntegerOption(o =>
      o.setName("секунды")
        .setDescription("Новый кулдаун в секундах")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("reset_all")
    .setDescription("СБРОС ВСЕЙ СТАТИСТИКИ (ОВНЕР)")
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log("✅ Slash-команды успешно зарегистрированы");
  } catch (e) {
    console.error("❌ Ошибка регистрации команд:", e);
  }
})();
