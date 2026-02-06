const { SlashCommandBuilder } = require("discord.js");
const { isOwner } = require("../admin-utils");
module.exports = {
  data: new SlashCommandBuilder().setName("роль").setDescription("Управление ролями")
    .addSubcommand(s=>s.setName("выдать").addUserOption(o=>o.setName("пользователь").setRequired(true)).addRoleOption(o=>o.setName("роль").setRequired(true)))
    .addSubcommand(s=>s.setName("забрать").addUserOption(o=>o.setName("пользователь").setRequired(true)).addRoleOption(o=>o.setName("роль").setRequired(true)))
    .addSubcommand(s=>s.setName("позиция").addRoleOption(o=>o.setName("роль").setRequired(true)).addIntegerOption(o=>o.setName("позиция").setRequired(true))),
  async execute(i){
    if(!isOwner(i)) return i.reply({content:"❌ Только создатель",ephemeral:true});
    const sub=i.options.getSubcommand();
    if(sub==="выдать"){ await i.options.getMember("пользователь").roles.add(i.options.getRole("роль")); return i.reply("✅ Выдано");}
    if(sub==="забрать"){ await i.options.getMember("пользователь").roles.remove(i.options.getRole("роль")); return i.reply("✅ Забрано");}
    if(sub==="позиция"){ await i.options.getRole("роль").setPosition(i.options.getInteger("позиция")); return i.reply("✅ Позиция изменена");}
  }
};
