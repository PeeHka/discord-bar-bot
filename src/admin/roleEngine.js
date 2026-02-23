const { backupRole } = require("../backup/roleBackup");

async function execute(action, message, database){
  const guild = message.guild;

  if(action.type === "CREATE"){
    await guild.roles.create({ name: action.role });
    return "Роль создана.";
  }

  const role = guild.roles.cache.find(r=>r.name===action.role);
  if(!role) return "Роль не найдена.";

  if(action.type === "DELETE"){
    await backupRole(database, role);
    await role.delete();
    return "Роль удалена.";
  }

  if(action.type === "ADMIN_ON"){
    await backupRole(database, role);
    await role.setPermissions(["Administrator"]);
    return "Админ включен.";
  }

  if(action.type === "ADMIN_OFF"){
    await backupRole(database, role);
    await role.setPermissions([]);
    return "Админ выключен.";
  }

  return "Готово.";
}

module.exports = { execute };
