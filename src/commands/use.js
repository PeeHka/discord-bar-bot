const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
const shop = require("../shop-data");
const { rand } = require("../economy-utils");

module.exports={

data:new SlashCommandBuilder()
.setName("use")
.setDescription("Использовать предмет")
.addStringOption(o=>o.setName("item").setRequired(true)),

async execute(interaction){

const key=interaction.options.getString("item");

const item=shop.items[key];

if(!item)
return interaction.reply("❌ Нет предмета");

let user=await users().findOne({id:interaction.user.id});

if(!user?.inventory?.[key])
return interaction.reply("❌ Нет предмета");

if(key==="beer_box"){

const gain=rand(20,60);

await users().updateOne(
{id:user.id},
{
$inc:{balance:gain},
$set:{[`inventory.${key}`]:user.inventory[key]-1}
}
);

return interaction.reply(`🍺 Получено ${gain} 🍺`);

}

if(key==="shield"){

await users().updateOne(
{id:user.id},
{$set:{[`inventory.${key}`]:user.inventory[key]-1}}
);

return interaction.reply("🛡 Щит активирован");

}

}

};
