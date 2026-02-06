const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { users } = require("../database");
module.exports = {
  data: new SlashCommandBuilder().setName("топ").setDescription("Топ по балансу"),
  async execute(i){
    const list = await users().find().sort({balance:-1}).limit(10).toArray();
    let d="";
    list.forEach((u,idx)=> d+=`**${idx+1}.** <@${u.id}> — ${u.balance} 🍺\n`);
    const e=new EmbedBuilder().setTitle("🏆 Топ алкашей").setDescription(d).setColor(0xf1c40f);
    await i.reply({embeds:[e]});
  }
};
