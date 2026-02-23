async function backupRole(database, role){
  await database.collection("role_backups").insertOne({
    name: role.name,
    permissions: role.permissions.bitfield,
    position: role.position,
    date: Date.now()
  });
}

async function lastBackup(database){
  return await database.collection("role_backups")
    .find().sort({ date:-1 }).limit(1).next();
}

module.exports = { backupRole, lastBackup };
