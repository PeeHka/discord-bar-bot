const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { isOwner } = require("../admin-utils");
module.exports = {
  data: new SlashCommandBuilder().setName("права").setDescription("Права ролей")
    .addSubcommand(s=>s.setName("выдать").addRoleOption(o=>o.setName("роль").setRequired(true)).addStringOption(o=>o.setName("право").setRequired(true)))
    .addSubcommand(s=>s.setName("забрать").addRoleOption(o=>o.setName("роль").setRequired(true)).addStringOption(o=>o.setName("право").setRequired(true))),
  async execute(i){
    if(!isOwner(i)) return i.reply({content:"❌ Только создатель",ephemeral:true});
    const role=i.options.getRole("роль"); const perm=i.options.getString("право");
    if(!PermissionsBitField.Flags[perm]) return i.reply({content:"❌ Нет такого права",ephemeral:true});
    const p=new PermissionsBitField(role.permissions);
    i.options.getSubcommand()==="выдать"?p.add(PermissionsBitField.Flags[perm]):p.remove(PermissionsBitField.Flags[perm]);
    await role.setPermissions(p);
    await i.reply("✅ Права обновлены");
  }
};
