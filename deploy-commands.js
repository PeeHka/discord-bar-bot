const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder().setName("выпить").setDescription("Выпить")
    .addStringOption(o =>
      o.setName("напиток").addChoices(
        { name: "Пиво", value: "beer" },
        { name: "Виски", value: "whiskey" },
        { name: "Водка", value: "vodka" }
      )
    ),
  new SlashCommandBuilder().setName("магазин").setDescription("Магазин"),
  new SlashCommandBuilder().setName("купить").setDescription("Купить")
    .addStringOption(o =>
      o.setName("товар").setRequired(true).addChoices(
        { name: "Пиво", value: "beer" },
        { name: "Виски", value: "whiskey" },
        { name: "Водка", value: "vodka" }
      )
    ),
  new SlashCommandBuilder().setName("казино").setDescription("Казино")
    .addIntegerOption(o => o.setName("ставка").setRequired(true)),
  new SlashCommandBuilder().setName("кости").setDescription("Кости")
    .addIntegerOption(o => o.setName("ставка").setRequired(true)),
  new SlashCommandBuilder().setName("топ").setDescription("Топ"),
  new SlashCommandBuilder().setName("set_cd").setDescription("Изменить КД (овнер)")
    .addStringOption(o =>
      o.setName("команда").setRequired(true).addChoices(
        { name: "выпить", value: "drink" },
        { name: "казино", value: "casino" },
        { name: "кости", value: "dice" }
      )
    )
    .addIntegerOption(o => o.setName("секунды").setRequired(true)),
  new SlashCommandBuilder().setName("reset_all").setDescription("Сбросить ВСЁ (овнер)")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash-команды обновлены");
})();
