const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");

module.exports = {
  data: new SlashCommandBuilder().setName("ежедневный").setDescription("Ежедневный бонус"),
  async execute(i){
    const now = Date.now();
    const u = await users().findOne({id:i.user.id}) || {balance:0};
    if (u.daily && now - u.daily < 24*60*60*1000)
      return i.reply({content:"⏳ Уже получал сегодня", ephemeral:true});
    await users().updateOne(
      {id:i.user.id},
      {$set:{daily:now}, $inc:{balance:20}},
      {upsert:true}
    );
    await i.reply("🎁 Ты получил **20 🍺**");
  }
};
