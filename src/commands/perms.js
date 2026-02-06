const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { isOwner } = require("../admin-utils");
module.exports = {
  data: new SlashCommandBuilder().setName("perms").setDescription("Права ролей")
    .addSubcommand(s=>s.setName("add").setDescription("Выдать право")
      .addRoleOption(o=>o.setName("role").setDescription("Роль").setRequired(true))
      .addStringOption(o=>o.setName("perm").setDescription("Право (ADMINISTRATOR и т.д.)").setRequired(true)))
    .addSubcommand(s=>s.setName("remove").setDescription("Забрать право")
      .addRoleOption(o=>o.setName("role").setDescription("Роль").setRequired(true))
      .addStringOption(o=>o.setName("perm").setDescription("Право").setRequired(true))),
  async execute(i){
    if(!isOwner(i)) return i.reply({content:"❌ Только создатель бота",ephemeral:true});
    const role=i.options.getRole("role"); const perm=i.options.getString("perm");
    if(!PermissionsBitField.Flags[perm]) return i.reply({content:"❌ Нет такого права",ephemeral:true});
    const p=new PermissionsBitField(role.permissions);
    i.options.getSubcommand()==="add"?p.add(PermissionsBitField.Flags[perm]):p.remove(PermissionsBitField.Flags[perm]);
    await role.setPermissions(p);
    await i.reply("✅ Права обновлены");
  }
};
