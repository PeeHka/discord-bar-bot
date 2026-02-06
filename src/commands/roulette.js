const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
module.exports = {
  data: new SlashCommandBuilder().setName("roulette").setDescription("Ставка 50/50")
    .addIntegerOption(o=>o.setName("bet").setDescription("Ставка").setRequired(true)),
  async execute(i){
    const bet=i.options.getInteger("bet");
    const u=await users().findOne({id:i.user.id})||{balance:0};
    if(bet<=0||bet>u.balance) return i.reply({content:"❌ Неверная ставка",ephemeral:true});
    const win=Math.random()<0.5;
    await users().updateOne({id:i.user.id},{ $inc:{balance: win?bet:-bet}});
    await i.reply(win?`🎰 Победа +${bet}`:`💀 Проигрыш -${bet}`);
  }
};
