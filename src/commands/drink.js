const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
const { drinks, roll } = require("../economy");
module.exports = {
  data: new SlashCommandBuilder().setName("drink").setDescription("Выпить напиток")
    .addStringOption(o=>o.setName("drink").setDescription("beer/vodka/whiskey/rum/moonshine")),
  async execute(i){
    const key=i.options.getString("drink")||"beer";
    if(!drinks[key]) return i.reply({content:"❌ Нет такого напитка",ephemeral:true});
    const [a,b]=drinks[key]; const gain=roll(a,b);
    await users().updateOne({id:i.user.id},{ $inc:{balance:gain}},{upsert:true});
    await i.reply(`🍹 ${key} → ${gain} 🍺`);
  }
};
