const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder().setName("shop").setDescription("Магазин предметов"),
  async execute(i){
    const e=new EmbedBuilder().setTitle("🛒 Магазин")
      .setDescription("**bonus** — 50 🍺\n**shield** — 75 🍺")
      .setColor(0x2ecc71);
    await i.reply({embeds:[e]});
  }
};
