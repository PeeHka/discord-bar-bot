import { REST, Routes, SlashCommandBuilder } from "discord.js";

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder()
    .setName("выпить")
    .setDescription("Выпить напиток")
    .addStringOption(o =>
      o.setName("напиток")
        .setDescription("Что пить")
        .setRequired(false)
        .addChoices(
          { name:"Пиво", value:"beer" },
          { name:"Сидр", value:"cider" },
          { name:"Виски", value:"whiskey" },
          { name:"Ром", value:"rum" },
          { name:"Водка", value:"vodka" },
          { name:"Абсент", value:"absinthe" }
        )
    ),

  new SlashCommandBuilder().setName("магазин").setDescription("Магазин"),
  new SlashCommandBuilder()
    .setName("купить")
    .setDescription("Купить напиток")
    .addStringOption(o =>
      o.setName("предмет")
        .setDescription("Название")
        .setRequired(true)
        .addChoices(
          { name:"Пиво", value:"beer" },
          { name:"Сидр", value:"cider" },
          { name:"Виски", value:"whiskey" },
          { name:"Ром", value:"rum" },
          { name:"Водка", value:"vodka" },
          { name:"Абсент", value:"absinthe" }
        )
    ),

  new SlashCommandBuilder().setName("казино").setDescription("Казино"),
  new SlashCommandBuilder().setName("кости").setDescription("Кости"),
  new SlashCommandBuilder().setName("топ").setDescription("Топ алкашей"),
  new SlashCommandBuilder().setName("reset_all").setDescription("Сброс всего (овнер)")
].map(c=>c.toJSON());

const rest = new REST({ version:"10" }).setToken(TOKEN);
await rest.put(
  Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
  { body: commands }
);
console.log("✅ Slash-команды обновлены");
