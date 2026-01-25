
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [

new SlashCommandBuilder().setName("drink").setDescription("Выпить"),

new SlashCommandBuilder().setName("shop")
 .setDescription("Магазин")
 .addSubcommand(s=>s.setName("list").setDescription("Список"))
 .addSubcommand(s=>s.setName("buy")
  .setDescription("Купить")
  .addStringOption(o=>o.setName("item").setRequired(true))),

new SlashCommandBuilder().setName("inventory").setDescription("Инвентарь"),

new SlashCommandBuilder().setName("dice")
 .setDescription("Кости")
 .addIntegerOption(o=>o.setName("bet").setRequired(true)),

new SlashCommandBuilder().setName("casino")
 .setDescription("Казино")
 .addIntegerOption(o=>o.setName("bet").setRequired(true)),

new SlashCommandBuilder().setName("top")
 .setDescription("Топ")
 .addStringOption(o=>o.setName("type")
  .addChoices(
    { name:"Алкаши", value:"drinks" },
    { name:"Баланс", value:"money" }
  )),

new SlashCommandBuilder().setName("admin")
 .setDescription("Админка")
 .addSubcommand(s=>s.setName("add").addUserOption(o=>o.setName("user").setRequired(true)))
 .addSubcommand(s=>s.setName("remove").addUserOption(o=>o.setName("user").setRequired(true)))
 .addSubcommand(s=>s.setName("give")
  .addUserOption(o=>o.setName("user").setRequired(true))
  .addIntegerOption(o=>o.setName("amount").setRequired(true))),

new SlashCommandBuilder().setName("owner")
 .setDescription("Овнер")
 .addSubcommand(s=>s.setName("reset").setDescription("Сброс"))
 .addSubcommand(s=>s.setName("event")
  .addBooleanOption(o=>o.setName("state").setRequired(true)))
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands.map(c => c.toJSON()) }
);

console.log("✅ Slash-команды зарегистрированы");
