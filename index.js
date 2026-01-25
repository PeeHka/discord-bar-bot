
import { Client, GatewayIntentBits } from "discord.js";
import mongoose from "mongoose";

import User from "./models/User.js";
import Shop from "./models/Shop.js";
import Title from "./models/Title.js";
import Config from "./models/Config.js";
import Admin from "./models/Admin.js";

const client = new Client({ intents:[GatewayIntentBits.Guilds] });
await mongoose.connect(process.env.MONGO);

function antiFarm(user){
  const now = Date.now();
  user.lastActions = user.lastActions.filter(t => now - t < 60000);
  user.lastActions.push(now);
  return user.lastActions.length <= 5;
}

async function isAdmin(userId, ownerId){
  if(userId === ownerId) return true;
  return await Admin.findOne({ userId });
}

async function checkTitle(member, user){
  const titles = await Title.find().sort({ drinks:-1 });
  const newTitle = titles.find(t => user.totalDrinks >= t.drinks);
  if(!newTitle || user.title === newTitle.name) return;

  if(user.title){
    const old = titles.find(t=>t.name===user.title);
    if(old?.roleId){
      const r = member.guild.roles.cache.get(old.roleId);
      if(r) await member.roles.remove(r).catch(()=>{});
    }
  }

  if(!newTitle.roleId){
    const role = await member.guild.roles.create({ name:newTitle.name, color:"Random" });
    newTitle.roleId = role.id;
    await newTitle.save();
  }

  const role = member.guild.roles.cache.get(newTitle.roleId);
  if(role) await member.roles.add(role).catch(()=>{});

  user.title = newTitle.name;
  await user.save();
}

client.once("ready", async()=>{
  if(!await Config.findOne())
    await Config.create({ ownerId: process.env.OWNER_ID });

  if(await Shop.countDocuments() === 0)
    await Shop.insertMany([
      {id:"beer",name:"Пиво",price:0,min:10,max:15},
      {id:"wine",name:"Вино",price:200,min:25,max:35},
      {id:"vodka",name:"Водка",price:500,min:40,max:60},
      {id:"whiskey",name:"Виски",price:1200,min:80,max:120}
    ]);

  if(await Title.countDocuments() === 0)
    await Title.insertMany([
      {name:"🍼 Алкопадаван",drinks:0},
      {name:"🍺 Завсегдатай",drinks:100},
      {name:"🥃 Барный демон",drinks:500},
      {name:"👑 Легенда бара",drinks:2000}
    ]);

  console.log("🍺 Бар-бот запущен");
});

client.on("interactionCreate", async i=>{
 if(!i.isChatInputCommand()) return;

 let user = await User.findOne({userId:i.user.id});
 if(!user) user = await User.create({userId:i.user.id});
 const config = await Config.findOne();

 if(i.commandName==="drink"){
  if(!antiFarm(user))
   return i.reply({content:"🚫 Слишком часто",ephemeral:true});

  if(Date.now() < user.cooldowns.drink)
   return i.reply({content:"⏳ Рано",ephemeral:true});

  const item = await Shop.findOne({id:user.inventory[0]});
  const profit = Math.floor((Math.random()*(item.max-item.min)+item.min));
  user.balance += profit;
  user.totalDrinks++;
  user.cooldowns.drink = Date.now()+config.cooldowns.drink*1000;
  await user.save();
  await checkTitle(i.member,user);
  return i.reply(`🍺 ${item.name} +${profit}`);
 }
});

client.login(process.env.TOKEN);
