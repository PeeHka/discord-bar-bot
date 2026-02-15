const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
const shop = require("../shop-data");

module.exports = {

data: new SlashCommandBuilder()
.setName("buy")
.setDescription("Купить предмет из магазина")

.addStringOption(o =>
  o.setName("item")
   .setDescription("Название предмета")
   .setRequired(true)
)

.addIntegerOption(o =>
  o.setName("amount")
   .setDescription("Количество для покупки")
   .setRequired(true)
),

async execute(interaction){

const key = interaction.options.getString("item");
const amount = interaction.options.getInteger("amount");

if(amount <= 0)
return interaction.reply({
content: "❌ Количество должно быть больше 0",
ephemeral: true
});

const item = shop.items[key];

if(!item)
return interaction.reply({
content: "❌ Такого предмета нет",
ephemeral: true
});

let user = await users().findOne({ id: interaction.user.id });

if(!user){
user = {
id: interaction.user.id,
balance: 0,
inventory: {}
};
}

if(!user.inventory)
user.inventory = {};

const price = item.price * amount;

if(user.balance < price)
return interaction.reply({
content: `❌ Нужно ${price} 🍺, у тебя ${user.balance} 🍺`,
ephemeral: true
});

user.inventory[key] = (user.inventory[key] || 0) + amount;

await users().updateOne(
{ id: interaction.user.id },
{
$set: { inventory: user.inventory },
$inc: { balance: -price }
},
{ upsert: true }
);

await interaction.reply(
`✅ Куплено ${amount} × ${item.name} за ${price} 🍺`
);

}

};
