const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [
  new SlashCommandBuilder().setName("магазин").setDescription("Барный магазин"),
  new SlashCommandBuilder().setName("купить").setDescription("Купить напиток")
    .addStringOption(o=>o.setName("предмет").setDescription("Название").setRequired(true)),
  new SlashCommandBuilder().setName("выпить").setDescription("Выпить")
    .addStringOption(o=>o.setName("напиток").setDescription("Что пить").setRequired(false)),
  new SlashCommandBuilder().setName("казино").setDescription("Казино")
    .addIntegerOption(o=>o.setName("ставка").setDescription("Ставка").setRequired(true)),
  new SlashCommandBuilder().setName("кости").setDescription("Кости"),
  new SlashCommandBuilder().setName("топ").setDescription("Топ алкашей"),

  // ИВЕНТЫ
  new SlashCommandBuilder().setName("event_start").setDescription("Старт ивента (овнер)"),
  new SlashCommandBuilder().setName("event_stop").setDescription("Стоп ивента (овнер)"),

  // ОВНЕР
  new SlashCommandBuilder().setName("admin_add").setDescription("Добавить админа")
    .addUserOption(o=>o.setName("пользователь").setDescription("Кого").setRequired(true)),
  new SlashCommandBuilder().setName("admin_remove").setDescription("Убрать админа")
    .addUserOption(o=>o.setName("пользователь").setDescription("Кого").setRequired(true)),
  new SlashCommandBuilder().setName("money_give").setDescription("Выдать валюту")
    .addUserOption(o=>o.setName("пользователь").setDescription("Кому").setRequired(true))
    .addIntegerOption(o=>o.setName("сумма").setDescription("Сколько").setRequired(true)),
  new SlashCommandBuilder().setName("money_take").setDescription("Забрать валюту")
    .addUserOption(o=>o.setName("пользователь").setDescription("У кого").setRequired(true))
    .addIntegerOption(o=>o.setName("сумма").setDescription("Сколько").setRequired(true)),
  new SlashCommandBuilder().setName("money_reset").setDescription("Сброс валюты")
    .addUserOption(o=>o.setName("пользователь").setDescription("Кому").setRequired(true)),
  new SlashCommandBuilder().setName("reset_all").setDescription("Полный сброс"),
  new SlashCommandBuilder().setName("set_cd").setDescription("Изменить КД")
    .addStringOption(o=>o.setName("команда").setDescription("drink/casino/dice").setRequired(true)
      .addChoices({name:"выпить",value:"drink"},{name:"казино",value:"casino"},{name:"кости",value:"dice"}))
    .addIntegerOption(o=>o.setName("секунды").setDescription("Сек").setRequired(true)),
  new SlashCommandBuilder().setName("cooldown_off").setDescription("Отключить КД (ивент)")
].map(c=>c.toJSON());

const rest = new REST({version:"10"}).setToken(TOKEN);
(async()=>{
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{ body:commands });
  console.log("✅ Slash-команды зарегистрированы");
})();
