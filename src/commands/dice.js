const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
module.exports = {
  data: new SlashCommandBuilder().setName("dice").setDescription("Игра в кости")
    .addIntegerOption(o=>o.setName("bet").setDescription("Ставка").setRequired(true)),
  async execute(i){
    const bet=i.options.getInteger("bet");
    const u=await users().findOne({id:i.user.id})||{balance:0};
    if(bet<=0||bet>u.balance) return i.reply({content:"❌ Неверная ставка",ephemeral:true});
    const you=Math.ceil(Math.random()*6);
    const bot=Math.ceil(Math.random()*6);
    let res=0;
    if(you>bot) res=bet;
    else if(you<bot) res=-bet;
    await users().updateOne({id:i.user.id},{ $inc:{balance:res}});
    await i.reply(`🎲 Ты ${you} | Бар ${bot} → ${res>=0?"+":""}${res}`);
  }
};
