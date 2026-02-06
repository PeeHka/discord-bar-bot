const { SlashCommandBuilder } = require("discord.js");
const { isOwner } = require("../admin-utils");
module.exports = {
  data: new SlashCommandBuilder().setName("role").setDescription("Управление ролями")
    .addSubcommand(s=>s.setName("add").setDescription("Выдать роль")
      .addUserOption(o=>o.setName("user").setDescription("Пользователь").setRequired(true))
      .addRoleOption(o=>o.setName("role").setDescription("Роль").setRequired(true)))
    .addSubcommand(s=>s.setName("remove").setDescription("Забрать роль")
      .addUserOption(o=>o.setName("user").setDescription("Пользователь").setRequired(true))
      .addRoleOption(o=>o.setName("role").setDescription("Роль").setRequired(true)))
    .addSubcommand(s=>s.setName("position").setDescription("Изменить позицию роли")
      .addRoleOption(o=>o.setName("role").setDescription("Роль").setRequired(true))
      .addIntegerOption(o=>o.setName("position").setDescription("Позиция").setRequired(true))),
  async execute(i){
    if(!isOwner(i)) return i.reply({content:"❌ Только создатель бота",ephemeral:true});
    const sub=i.options.getSubcommand();
    if(sub==="add"){ await i.options.getMember("user").roles.add(i.options.getRole("role")); return i.reply("✅ Роль выдана");}
    if(sub==="remove"){ await i.options.getMember("user").roles.remove(i.options.getRole("role")); return i.reply("✅ Роль забрана");}
    if(sub==="position"){ await i.options.getRole("role").setPosition(i.options.getInteger("position")); return i.reply("✅ Позиция изменена");}
  }
};
