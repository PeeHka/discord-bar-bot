const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder().setName("магазин").setDescription("Магазин предметов"),
  async execute(i){
    const e=new EmbedBuilder().setTitle("🛒 Магазин")
      .setDescription("**бонус** — 50 🍺\n**защита** — 75 🍺")
      .setColor(0x2ecc71);
    await i.reply({embeds:[e]});
  }
};
