const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
const { drinks, roll } = require("../economy");

module.exports = {
  data: new SlashCommandBuilder().setName("выпить").setDescription("Выпить напиток")
    .addStringOption(o=>o.setName("напиток").setRequired(false)),
  async execute(i){
    const name = i.options.getString("напиток") || "пиво";
    if(!drinks[name]) return i.reply({content:"❌ Нет такого напитка",ephemeral:true});
    const [a,b]=drinks[name]; const gain=roll(a,b);
    await users().updateOne({id:i.user.id},{ $inc:{balance:gain}},{upsert:true});
    await i.reply(`🍹 ${name} → ${gain} 🍺`);
  }
};
