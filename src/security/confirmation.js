const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function buildConfirm(){
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_yes")
      .setLabel("Подтвердить")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("confirm_no")
      .setLabel("Отмена")
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = { buildConfirm };
