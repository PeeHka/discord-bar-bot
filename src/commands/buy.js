const { SlashCommandBuilder } = require("discord.js");
const { users } = require("../database");
const shop = require("../shop-data");

module.exports = {

data: new SlashCommandBuilder()
.setName("buy")
.setDescription("Купить предмет")
.addStringOption(o=>o.setName("item").setRequired(true))
.addIntegerOption(o=>o.setName("amount").setRequired(true)),

async execute(interaction){

const key=interaction.options.getString("item");
const amount=interaction.options.getInteger("amount");

const item=shop.items[key];

if(!item)
return interaction.reply({content:"❌ Нет предмета",ephemeral:true});

let user=await users().findOne({id:interaction.user.id})||{balance:0,inventory:{}};

const price=item.price*amount;

if(user.balance<price)
return interaction.reply({content:"❌ Недостаточно денег",ephemeral:true});

user.inventory[key]=(user.inventory[key]||0)+amount;

await users().updateOne(
{id:interaction.user.id},
{$set:{inventory:user.inventory},$inc:{balance:-price}},
{upsert:true}
);

await interaction.reply(`✅ Куплено ${amount} × ${key}`);

}

};
