const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
module.exports = {
  data: new SlashCommandBuilder().setName("balance").setDescription("Показать баланс"),
  async execute(i){
    const u = await users().findOne({id:i.user.id}) || {balance:0};
    await i.reply(`💰 Баланс: **${u.balance} 🍺**`);
  }
};
