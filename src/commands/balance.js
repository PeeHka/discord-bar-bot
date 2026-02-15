const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");

module.exports={

data:new SlashCommandBuilder()
.setName("balance")
.setDescription("Баланс"),

async execute(interaction){

const user=await users().findOne({id:interaction.user.id})||{balance:0};

await interaction.reply(`💰 Баланс: ${user.balance} 🍺`);

}

};
