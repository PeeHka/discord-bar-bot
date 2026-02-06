const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
module.exports = {
  data: new SlashCommandBuilder().setName("инвентарь").setDescription("Ваш инвентарь"),
  async execute(i){
    const u=await users().findOne({id:i.user.id})||{inv:[]};
    await i.reply(u.inv.length?`🎒 ${u.inv.join(", ")}`:"🎒 Пусто");
  }
};
