const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const shop = require("../shop-data");

module.exports = {

data: new SlashCommandBuilder()
.setName("shop")
.setDescription("Открыть магазин"),

async execute(interaction){

let text="";

for(const cat in shop.categories){

text+=`\n${shop.categories[cat]}\n`;

for(const key in shop.items){

const item=shop.items[key];

if(item.category===cat){

text+=`**${key}** — ${item.price} 🍺\n${item.description}\n`;

}

}

}

const embed=new EmbedBuilder()
.setTitle("🛒 Магазин")
.setDescription(text)
.setColor(0x2ecc71);

await interaction.reply({embeds:[embed]});

}

};
