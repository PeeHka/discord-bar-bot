const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Не заданы TOKEN / CLIENT_ID / GUILD_ID");
  process.exit(1);
}

const commands = [

  new SlashCommandBuilder().setName("help").setDescription("Список команд"),
  new SlashCommandBuilder().setName("баланс").setDescription("Баланс"),
  new SlashCommandBuilder().setName("выпить").setDescription("Выпить"),
  new SlashCommandBuilder()
    .setName("казино")
    .setDescription("Сыграть в казино")
    .addIntegerOption(o =>
      o.setName("ставка").setDescription("Размер ставки").setRequired(true).setMinValue(1)
    ),
  new SlashCommandBuilder()
    .setName("кости")
    .setDescription("Сыграть в кости")
    .addIntegerOption(o =>
      o.setName("ставка").setDescription("Размер ставки").setRequired(true).setMinValue(1)
    ),
  new SlashCommandBuilder().setName("магазин").setDescription("Магазин"),
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
  new SlashCommandBuilder().setName("топ").setDescription("Топ"),
  
  // ===== OWNER =====
  new SlashCommandBuilder()
    .setName("admin_add")
    .setDescription("Добавить админа бота")
    .addUserOption(o =>
      o.setName("пользователь").setDescription("Кого").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("admin_delete")
    .setDescription("Удалить админа бота")
    .addUserOption(o =>
      o.setName("пользователь").setDescription("Кого").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("money_give")
    .setDescription("Выдать валюту")
    .addUserOption(o => o.setName("пользователь").setDescription("Кому").setRequired(true))
    .addIntegerOption(o => o.setName("количество").setDescription("Сколько").setRequired(true)),

  new SlashCommandBuilder()
    .setName("money_take")
    .setDescription("Забрать валюту")
    .addUserOption(o => o.setName("пользователь").setDescription("У кого").setRequired(true))
    .addIntegerOption(o => o.setName("количество").setDescription("Сколько").setRequired(true)),

  new SlashCommandBuilder()
    .setName("money_reset")
    .setDescription("Сбросить валюту")
    .addUserOption(o => o.setName("пользователь").setDescription("Кому").setRequired(true)),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );
  console.log("✅ Slash-команды зарегистрированы");
})();
