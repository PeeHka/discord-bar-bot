const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");

module.exports={

data:new SlashCommandBuilder()
.setName("inventory")
.setDescription("Ваш инвентарь"),

async execute(interaction){

const user=await users().findOne({id:interaction.user.id});

if(!user || !user.inventory)
return interaction.reply("🎒 Пусто");

let text="";

for(const item in user.inventory){

text+=`${item} × ${user.inventory[item]}\n`;

}

await interaction.reply(`🎒 Инвентарь:\n${text}`);

}

};
