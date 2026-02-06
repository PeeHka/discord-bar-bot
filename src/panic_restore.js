const { panic } = require("./database");
const { isOwner } = require("./admin-utils");
module.exports = async function(i){
  if(!isOwner(i)) return i.reply({content:"❌ Только создатель",ephemeral:true});
  const data=await panic().findOne({guild:i.guild.id});
  if(!data) return i.reply({content:"❌ Нет данных для отката",ephemeral:true});
  await i.guild.members.fetch();
  for(const uid in data.snap){
    const m=i.guild.members.cache.get(uid);
    if(!m) continue;
    for(const rid of data.snap[uid]){
      const r=i.guild.roles.cache.get(rid);
      if(r) await m.roles.add(r).catch(()=>{});
    }
  }
  await panic().deleteOne({guild:i.guild.id});
  await i.reply({content:"✅ Сервер восстановлен"});
};
