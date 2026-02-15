const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
const shop = require("../shop-data");
const { rand } = require("../economy-utils");

module.exports = {

data: new SlashCommandBuilder()
.setName("use")
.setDescription("Использовать предмет")

.addStringOption(o =>
  o.setName("item")
   .setDescription("Название предмета")
   .setRequired(true)
),

async execute(interaction){

const key = interaction.options.getString("item");

const item = shop.items[key];

if(!item)
return interaction.reply({
content: "❌ Такого предмета нет",
ephemeral: true
});

let user = await users().findOne({ id: interaction.user.id });

if(!user || !user.inventory || !user.inventory[key] || user.inventory[key] <= 0)
return interaction.reply({
content: "❌ У тебя нет этого предмета",
ephemeral: true
});


// 🍺 beer_box
if(key === "beer_box"){

const gain = rand(20, 60);

user.inventory[key]--;

await users().updateOne(
{ id: user.id },
{
$set: { inventory: user.inventory },
$inc: { balance: gain }
}
);

return interaction.reply(
`🍺 Ты открыл ящик и получил ${gain} 🍺`
);

}


// 🛡 shield
if(key === "shield"){

user.inventory[key]--;

await users().updateOne(
{ id: user.id },
{
$set: { inventory: user.inventory }
}
);

return interaction.reply(
"🛡 Щит активирован. Он спасёт тебя от следующего проигрыша."
);

}


return interaction.reply("❌ Этот предмет нельзя использовать");

}

};
