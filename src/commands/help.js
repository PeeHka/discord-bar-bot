const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Список команд"),
  async execute(i){
    const e = new EmbedBuilder()
      .setTitle("🍻 Бар + Админ бот")
      .setDescription(`
**Бар**
/balance — баланс
/drink — выпить
/daily — ежедневный бонус
/top — топ

**Казино**
/roulette
/dice

**Магазин**
/shop
/buy
/inventory

**Админ (только владелец бота)**
/role
/perms
/panic
      `)
      .setColor(0xf1c40f);
    await i.reply({embeds:[e], ephemeral:true});
  }
};
