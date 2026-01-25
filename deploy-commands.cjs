const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder().setName("баланс").setDescription("Баланс"),
  new SlashCommandBuilder().setName("магазин").setDescription("Магазин"),
  new SlashCommandBuilder().setName("выпить").setDescription("Выпить")
    .addStringOption(o=>o.setName("напиток").setRequired(false)),
  new SlashCommandBuilder().setName("казино").setDescription("Казино")
    .addIntegerOption(o=>o.setName("ставка").setRequired(true)),
  new SlashCommandBuilder().setName("кости").setDescription("Кости"),
  new SlashCommandBuilder().setName("топ").setDescription("Топ"),

  // owner
  new SlashCommandBuilder().setName("money_add").setDescription("Выдать деньги")
    .addUserOption(o=>o.setName("пользователь").setRequired(true))
    .addIntegerOption(o=>o.setName("сумма").setRequired(true)),
  new SlashCommandBuilder().setName("money_take").setDescription("Забрать деньги")
    .addUserOption(o=>o.setName("пользователь").setRequired(true))
    .addIntegerOption(o=>o.setName("сумма").setRequired(true)),
  new SlashCommandBuilder().setName("reset_user").setDescription("Сброс пользователя")
    .addUserOption(o=>o.setName("пользователь").setRequired(true)),
  new SlashCommandBuilder().setName("reset_all").setDescription("Сброс ВСЕХ")
].map(c=>c.toJSON());

const rest=new REST({version:"10"}).setToken(TOKEN);
(async()=>{
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{ body:commands });
  console.log("✅ Slash-команды обновлены");
})();
