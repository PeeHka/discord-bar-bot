const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder().setName("помощь").setDescription("Все команды бота"),
  async execute(i){
    const e = new EmbedBuilder()
      .setTitle("🍻 Bar Admin Bot")
      .setDescription(`
**Бар**
/баланс
/выпить
/ежедневный
/топ

**Казино**
/рулетка
/кости

**Магазин**
/магазин
/купить
/инвентарь
/использовать

**Админ**
/роль
/права
/админ_экономика
/panic
      `)
      .setColor(0xf1c40f);
    await i.reply({embeds:[e], ephemeral:true});
  }
};
