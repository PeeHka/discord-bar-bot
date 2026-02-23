const { lastBackup } = require("../backup/roleBackup");

async function restore(guild, database){
  const data = await lastBackup(database);
  if(!data) return false;

  let role = guild.roles.cache.find(r=>r.name===data.name);
  if(!role){
    role = await guild.roles.create({
      name: data.name,
      permissions: data.permissions
    });
  }

  await role.setPermissions(data.permissions);
  await role.setPosition(data.position);
  return true;
}

module.exports = { restore };
