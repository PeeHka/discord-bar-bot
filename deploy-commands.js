const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Список команд"),

  new SlashCommandBuilder()
    .setName("баланс")
    .setDescription("Посмотреть баланс"),

  new SlashCommandBuilder()
    .setName("выпить")
    .setDescription("Выпить напиток")
    .addStringOption(o =>
      o.setName("напиток")
        .setDescription("пиво / виски / водка / самогон")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("казино")
    .setDescription("Рулетка 50/50")
    .addIntegerOption(o =>
      o.setName("ставка")
        .setDescription("Размер ставки")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("кости")
    .setDescription("Кости против бота")
    .addIntegerOption(o =>
      o.setName("ставка")
        .setDescription("Размер ставки")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("топ")
    .setDescription("Топ алкашей"),

  new SlashCommandBuilder()
    .setName("шутка")
    .setDescription("Случайная шутка"),

  new SlashCommandBuilder()
    .setName("шар")
    .setDescription("Шар предсказаний"),

  new SlashCommandBuilder()
    .setName("напиться")
    .setDescription("Попробовать напиться"),

  // ===== ROLE =====
  new SlashCommandBuilder()
    .setName("роль_выдать")
    .setDescription("Выдать роль пользователю")
    .addUserOption(o =>
      o.setName("пользователь")
        .setDescription("Кому выдать роль")
        .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName("роль")
        .setDescription("Какую роль")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("роль_забрать")
    .setDescription("Забрать роль у пользователя")
    .addUserOption(o =>
      o.setName("пользователь")
        .setDescription("У кого забрать роль")
        .setRequired(true)
    )
    .addRoleOption(o =>
      o.setName("роль")
        .setDescription("Какую роль")
        .setRequired(true)
    ),

  // ===== PERMISSIONS =====
  new SlashCommandBuilder()
    .setName("права_дать")
    .setDescription("Выдать право роли")
    .addRoleOption(o =>
      o.setName("роль")
        .setDescription("Роль")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("право")
        .setDescription("Например: ADMINISTRATOR")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("права_забрать")
    .setDescription("Забрать право у роли")
    .addRoleOption(o =>
      o.setName("роль")
        .setDescription("Роль")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("право")
        .setDescription("Например: MANAGE_ROLES")
        .setRequired(true)
    ),

  // ===== ADMINS =====
  new SlashCommandBuilder()
    .setName("admin_add")
    .setDescription("Добавить админа бота")
    .addUserOption(o =>
      o.setName("пользователь")
        .setDescription("Кого добавить")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("admin_delete")
    .setDescription("Удалить админа бота")
    .addUserOption(o =>
      o.setName("пользователь")
        .setDescription("Кого удалить")
        .setRequired(true)
    )
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
