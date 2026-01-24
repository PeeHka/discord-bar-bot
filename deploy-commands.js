const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Не заданы TOKEN / CLIENT_ID / GUILD_ID");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Показать список команд"),

  new SlashCommandBuilder()
    .setName("баланс")
    .setDescription("Показать баланс"),

  new SlashCommandBuilder()
    .setName("выпить")
    .setDescription("Выпить напиток")
    .addStringOption(o =>
      o.setName("напиток")
        .setDescription("Название напитка")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("рулетка")
    .setDescription("Сыграть в рулетку")
    .addIntegerOption(o =>
      o.setName("ставка")
        .setDescription("Ставка")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("кости")
    .setDescription("Сыграть в кости")
    .addIntegerOption(o =>
      o.setName("ставка")
        .setDescription("Ставка")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("топ")
    .setDescription("Топ по балансу"),

  new SlashCommandBuilder()
    .setName("роль")
    .setDescription("Управление ролями")
    .addSubcommand(s =>
      s.setName("дать")
        .setDescription("Выдать роль")
        .addUserOption(o =>
          o.setName("пользователь").setDescription("Кому").setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("роль").setDescription("Роль").setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("забрать")
        .setDescription("Забрать роль")
        .addUserOption(o =>
          o.setName("пользователь").setDescription("У кого").setRequired(true)
        )
        .addRoleOption(o =>
          o.setName("роль").setDescription("Роль").setRequired(true)
        )
    ),

  new SlashCommandBuilder()
    .setName("права")
    .setDescription("Права ролей")
    .addSubcommand(s =>
      s.setName("дать")
        .setDescription("Добавить право роли")
        .addRoleOption(o =>
          o.setName("роль").setDescription("Роль").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("право")
            .setDescription("Например: ADMINISTRATOR")
            .setRequired(true)
        )
    )
    .addSubcommand(s =>
      s.setName("забрать")
        .setDescription("Убрать право роли")
        .addRoleOption(o =>
          o.setName("роль").setDescription("Роль").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("право")
            .setDescription("Например: MANAGE_ROLES")
            .setRequired(true)
        )
    ),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("⏳ Регистрирую slash-команды...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log("✅ Slash-команды зарегистрированы");
  } catch (err) {
    console.error("❌ Ошибка регистрации:", err);
  }
})();
