function parse(content){
  const create = content.match(/создай\s+роль\s+(.+)/i);
  const del = content.match(/удали\s+роль\s+(.+)/i);
  const adminGive = content.match(/дай\s+админ\s+роли\s+(.+)/i);
  const adminRemove = content.match(/забери\s+админ\s+у\s+роли\s+(.+)/i);

  if(create) return { type:"CREATE", role: create[1] };
  if(del) return { type:"DELETE", role: del[1], dangerous:true };
  if(adminGive) return { type:"ADMIN_ON", role: adminGive[1], dangerous:true };
  if(adminRemove) return { type:"ADMIN_OFF", role: adminRemove[1], dangerous:true };

  return null;
}

module.exports = { parse };
