const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { isOwner } = require("../admin-utils");
const { panic } = require("../database");

module.exports = {
  data: new SlashCommandBuilder().setName("panic").setDescription("Аварийная заморозка сервера"),
  async execute(i){
    if(!isOwner(i)) return i.reply({content:"❌ Только создатель",ephemeral:true});
    const g=i.guild; await g.members.fetch();
    const snap={};
    g.members.cache.forEach(m=> snap[m.id]=m.roles.cache.filter(r=>r.name!=="@everyone").map(r=>r.id));
    await panic().deleteOne({guild:g.id});
    await panic().insertOne({guild:g.id, snap});
    for(const m of g.members.cache.values()){
      for(const r of m.roles.cache.values()){
        if(r.name!=="@everyone") await m.roles.remove(r).catch(()=>{});
      }
    }
    const row=new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("panic_restore").setLabel("🔄 ОТМЕНИТЬ PANIC").setStyle(ButtonStyle.Danger)
    );
    await i.reply({content:"🚨 PANIC ВКЛЮЧЁН",components:[row]});
  }
};
