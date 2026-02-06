const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
module.exports = {
  data: new SlashCommandBuilder().setName("buy").setDescription("Купить предмет")
    .addStringOption(o=>o.setName("item").setDescription("Название предмета").setRequired(true)),
  async execute(i){
    const item=i.options.getString("item");
    const prices={bonus:50,shield:75};
    if(!prices[item]) return i.reply({content:"❌ Нет такого предмета",ephemeral:true});
    const u=await users().findOne({id:i.user.id})||{balance:0,inv:[]};
    if(u.balance<prices[item]) return i.reply({content:"❌ Недостаточно средств",ephemeral:true});
    await users().updateOne({id:i.user.id},{$inc:{balance:-prices[item]},$push:{inv:item}},{upsert:true});
    await i.reply(`🛒 Куплено: **${item}**`);
  }
};
