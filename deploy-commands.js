import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [

new SlashCommandBuilder()
 .setName("drink")
 .setDescription("Выпить алкоголь"),

new SlashCommandBuilder()
 .setName("shop")
 .setDescription("Магазин")
 .addSubcommand(s =>
  s.setName("list")
   .setDescription("Показать магазин"))
 .addSubcommand(s =>
  s.setName("buy")
   .setDescription("Купить бухло")
   .addStringOption(o =>
    o.setName("item")
     .setDescription("ID товара")
     .setRequired(true)
   )),

new SlashCommandBuilder()
 .setName("inventory")
 .setDescription("Инвентарь"),

new SlashCommandBuilder()
 .setName("dice")
 .setDescription("Кости")
 .addIntegerOption(o =>
  o.setName("bet")
   .setDescription("Ставка")
   .setRequired(true)
 ),

new SlashCommandBuilder()
 .setName("casino")
 .setDescription("Казино")
 .addIntegerOption(o =>
  o.setName("bet")
   .setDescription("Ставка")
   .setRequired(true)
 ),

new SlashCommandBuilder()
 .setName("top")
 .setDescription("Топ игроков")
 .addStringOption(o =>
  o.setName("type")
   .setDescription("Тип топа")
   .addChoices(
    { name:"Алкаши", value:"drinks" },
    { name:"Баланс", value:"money" }
   )
 ),

new SlashCommandBuilder()
 .setName("admin")
 .setDescription("Админка")
 .addSubcommand(s =>
  s.setName("add")
   .setDescription("Добавить админа")
   .addUserOption(o =>
    o.setName("user")
     .setDescription("Пользователь")
     .setRequired(true)
   ))
 .addSubcommand(s =>
  s.setName("remove")
   .setDescription("Убрать админа")
   .addUserOption(o =>
    o.setName("user")
     .setDescription("Пользователь")
     .setRequired(true)
   ))
 .addSubcommand(s =>
  s.setName("give")
   .setDescription("Выдать деньги")
   .addUserOption(o =>
    o.setName("user")
     .setDescription("Пользователь")
     .setRequired(true)
   )
   .addIntegerOption(o =>
    o.setName("amount")
     .setDescription("Сумма")
     .setRequired(true)
   )),

new SlashCommandBuilder()
 .setName("owner")
 .setDescription("Овнер команды")
 .addSubcommand(s =>
  s.setName("reset")
   .setDescription("Полный сброс"))
 .addSubcommand(s =>
  s.setName("event")
   .setDescription("Включить или выключить ивент")
   .addBooleanOption(o =>
    o.setName("state")
     .setDescription("true / false")
     .setRequired(true)
   ))
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

await rest.put(
 Routes.applicationGuildCommands(
  process.env.CLIENT_ID,
  process.env.GUILD_ID
 ),
 { body: commands.map(c => c.toJSON()) }
);

console.log("✅ Slash-команды успешно зарегистрированы");
