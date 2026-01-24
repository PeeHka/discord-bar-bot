const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");
const { MongoClient } = require("mongodb");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* ================== ENV ================== */
const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const OWNER_ID = process.env.BOT_OWNER_ID;
const GUILD_ID = process.env.GUILD_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

/* ================== MONGO ================== */
const mongo = new MongoClient(MONGO_URI);
let db;

/* ================== ГЛОБАЛЫ ================== */
let EVENT_ACTIVE = false; // ивенты отключают КД и дают бонус

/* ================== НАПИТКИ (БОЛЬШОЙ МАГАЗИН) ================== */
const DRINKS = {
  beer:      { key:"beer",      name:"🍺 Пиво",     price:20,  value:1, unlock:0 },
  cider:    { key:"cider",    name:"🍻 Сидр",     price:35,  value:1, unlock:5 },
  wine:     { key:"wine",     name:"🍷 Вино",     price:70,  value:2, unlock:10 },
  whiskey:  { key:"whiskey",  name:"🥃 Виски",    price:120, value:2, unlock:20 },
  rum:      { key:"rum",      name:"🍹 Ром",      price:180, value:3, unlock:30 },
  vodka:    { key:"vodka",    name:"🍸 Водка",    price:250, value:3, unlock:50 },
  absinthe: { key:"absinthe", name:"💀 Абсент",   price:500, value:5, unlock:80 }
};

/* ================== ТИТУЛЫ + БОНУСЫ ==================
 bonus    — % бонус к наградам
 discount — % скидка в магазине
 cdReduce — уменьшение КД (сек)
*/
const TITLES = [
  { name:"Новичок", need:0,   bonus:0,    discount:0,    cdReduce:0,    color:0x9e9e9e },
  { name:"Пьяница", need:10,  bonus:0.05, discount:0.05, cdReduce:5,    color:0x2ecc71 },
  { name:"Алкаш",   need:30,  bonus:0.10, discount:0.10, cdReduce:10,   color:0xf1c40f },
  { name:"Бармен",  need:60,  bonus:0.15, discount:0.15, cdReduce:20,   color:0xe67e22 },
  { name:"Легенда бара", need:120, bonus:0.25, discount:0.25, cdReduce:9999, color:0xe74c3c }
];

/* ================== КУЛДАУНЫ (сек) ================== */
let BASE_CD = { drink:30, casino:60, dice:45 };

/* ================== УТИЛИТЫ ================== */
const now = () => Math.floor(Date.now()/1000);

async function log(msg){
  if(!LOG_CHANNEL_ID) return;
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);
  if(ch) ch.send(msg);
}
function titleByDrinks(drinks){
  return [...TITLES].reverse().find(t=>drinks>=t.need);
}

/* ================== ПОЛЬЗОВАТЕЛЬ ================== */
async function getUser(id){
  const col = db.collection("users");
  let u = await col.findOne({ id });
  if(!u){
    u = {
      id,
      balance:50,                 // стартовая валюта
      drinks:0,
      title:"Новичок",
      inventory:{ beer:3 },       // стартовое бухло
      cooldowns:{}
    };
    await col.insertOne(u);
  }
  u.inventory ||= { beer:3 };
  u.cooldowns ||= {};
  return u;
}

/* ================== АДМИНЫ ================== */
async function isAdmin(id){
  if(id===OWNER_ID) return true;
  return !!await db.collection("admins").findOne({ id });
}

/* ================== КД ================== */
function cdLeft(user, key, title){
  if(EVENT_ACTIVE) return 0;
  const real = Math.max(0, BASE_CD[key] - (title.cdReduce||0));
  const until = user.cooldowns[key]||0;
  return Math.max(0, until - now());
}
async function setCd(user, key, title){
  const real = Math.max(0, BASE_CD[key] - (title.cdReduce||0));
  user.cooldowns[key] = now()+real;
  await db.collection("users").updateOne({id:user.id},{ $set:{ cooldowns:user.cooldowns }});
}

/* ================== РОЛИ ПО ТИТУЛАМ ================== */
async function ensureRoles(guild){
  if(!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;
  for(const t of TITLES){
    if(!guild.roles.cache.find(r=>r.name===t.name)){
      await guild.roles.create({ name:t.name, color:t.color, reason:"Титул" });
    }
  }
}
async function syncMemberRole(member, titleName){
  const roles = member.guild.roles.cache;
  const target = roles.find(r=>r.name===titleName);
  if(!target) return;
  for(const t of TITLES){
    const r = roles.find(x=>x.name===t.name);
    if(r && member.roles.cache.has(r.id) && r.id!==target.id){
      await member.roles.remove(r).catch(()=>{});
    }
  }
  if(!member.roles.cache.has(target.id)){
    await member.roles.add(target).catch(()=>{});
  }
}

/* ================== READY ================== */
client.once("ready", async ()=>{
  await mongo.connect();
  db = mongo.db("barbot");
  console.log("🍃 MongoDB подключена");
  console.log("🍻 Бар-бот запущен");
  const g = await client.guilds.fetch(GUILD_ID).catch(()=>null);
  if(g) await ensureRoles(g);
});

/* ================== SLASH ================== */
client.on("interactionCreate", async i=>{
  if(i.isChatInputCommand()){
    const user = await getUser(i.user.id);
    const title = titleByDrinks(user.drinks);
    const admin = await isAdmin(i.user.id);

    /* ===== /магазин (кнопки) ===== */
    if(i.commandName==="магазин"){
      const emb = new EmbedBuilder().setTitle("🛒 Барный магазин");
      const rows = [];
      let row = new ActionRowBuilder();
      let c=0;
      for(const k in DRINKS){
        const d = DRINKS[k];
        if(user.drinks<d.unlock) continue;
        const price = Math.floor(d.price*(1-title.discount));
        emb.addFields({ name:d.name, value:`Цена: ${price} 🍺 | +${d.value}` , inline:true});
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`buy:${k}`)
            .setLabel(`Купить ${d.name}`)
            .setStyle(ButtonStyle.Primary)
        );
        c++;
        if(c===5){ rows.push(row); row=new ActionRowBuilder(); c=0; }
      }
      if(c>0) rows.push(row);
      return i.reply({ embeds:[emb], components:rows });
    }

    /* ===== /купить ===== */
    if(i.commandName==="купить"){
      const key = i.options.getString("предмет");
      const d = DRINKS[key];
      if(!d) return i.reply("❌ Нет такого");
      if(user.drinks<d.unlock) return i.reply("🔒 Не открыт");
      const price = Math.floor(d.price*(1-title.discount));
      if(user.balance<price) return i.reply("💸 Мало денег");
      user.balance-=price;
      user.inventory[key]=(user.inventory[key]||0)+1;
      await db.collection("users").updateOne({id:user.id},{ $set:user });
      return i.reply(`🛒 Куплено: ${d.name}`);
    }

    /* ===== /выпить (кнопка подтверждения) ===== */
    if(i.commandName==="выпить"){
      const key = i.options.getString("напиток")||"beer";
      if(!user.inventory[key]) return i.reply("❌ Нет этого напитка");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`drink:${key}`).setLabel("Выпить").setStyle(ButtonStyle.Success)
      );
      return i.reply({ content:`Готов выпить ${DRINKS[key].name}?`, components:[row], ephemeral:true });
    }

    /* ===== /казино ===== */
    if(i.commandName==="казино"){
      const bet = i.options.getInteger("ставка");
      if(bet<=0 || user.balance<bet) return i.reply("❌ Неверная ставка");
      const cd = cdLeft(user,"casino",title);
      if(cd>0 && !admin) return i.reply(`⏳ ${cd} сек`);
      const win = Math.random() < (0.45 + title.bonus + (EVENT_ACTIVE?0.1:0));
      user.balance += win ? bet : -bet;
      if(!admin) await setCd(user,"casino",title);
      await db.collection("users").updateOne({id:user.id},{ $set:user });
      return i.reply(win?`🎰 WIN +${bet}`:`💀 LOSE ${bet}`);
    }

    /* ===== /кости ===== */
    if(i.commandName==="кости"){
      const cd = cdLeft(user,"dice",title);
      if(cd>0 && !admin) return i.reply(`⏳ ${cd} сек`);
      const a=Math.ceil(Math.random()*6), b=Math.ceil(Math.random()*6);
      let res="Ничья";
      if(a>b){ user.balance+=5; res="+5"; }
      if(a<b){ user.balance-=5; res="-5"; }
      if(!admin) await setCd(user,"dice",title);
      await db.collection("users").updateOne({id:user.id},{ $set:user });
      return i.reply(`🎲 ${a} vs ${b} → ${res}`);
    }

    /* ===== /топ ===== */
    if(i.commandName==="топ"){
      const list = await db.collection("users").find().sort({drinks:-1}).limit(10).toArray();
      let t="🏆 **Топ алкашей**\n\n";
      list.forEach((x,i2)=> t+=`${i2+1}. <@${x.id}> — ${x.drinks} 🍺 (${x.title})\n`);
      return i.reply(t);
    }

    /* ===== ИВЕНТЫ (ОВНЕР) ===== */
    if(i.commandName==="event_start" && i.user.id===OWNER_ID){
      EVENT_ACTIVE=true; return i.reply("🎉 Ивент стартовал (КД выкл, бонусы ↑)");
    }
    if(i.commandName==="event_stop" && i.user.id===OWNER_ID){
      EVENT_ACTIVE=false; return i.reply("⏹ Ивент завершён");
    }

    /* ===== ОВНЕР ===== */
    if(i.user.id===OWNER_ID){
      if(i.commandName==="admin_add"){
        const u=i.options.getUser("пользователь");
        await db.collection("admins").updateOne({id:u.id},{ $set:{id:u.id}},{upsert:true});
        return i.reply(`✅ ${u.username} админ`);
      }
      if(i.commandName==="admin_remove"){
        const u=i.options.getUser("пользователь");
        await db.collection("admins").deleteOne({id:u.id});
        return i.reply(`❌ ${u.username} снят`);
      }
      if(i.commandName==="money_give"){
        const u=await getUser(i.options.getUser("пользователь").id);
        const s=i.options.getInteger("сумма"); u.balance+=s;
        await db.collection("users").updateOne({id:u.id},{ $set:u });
        return i.reply(`💰 Выдано ${s}`);
      }
      if(i.commandName==="money_take"){
        const u=await getUser(i.options.getUser("пользователь").id);
        const s=i.options.getInteger("сумма"); u.balance=Math.max(0,u.balance-s);
        await db.collection("users").updateOne({id:u.id},{ $set:u });
        return i.reply(`💰 Забрано ${s}`);
      }
      if(i.commandName==="money_reset"){
        const u=i.options.getUser("пользователь");
        await db.collection("users").updateOne({id:u.id},{ $set:{balance:0}});
        return i.reply("♻ Деньги сброшены");
      }
      if(i.commandName==="reset_all"){
        await db.collection("users").updateMany({},{
          $set:{ balance:50, drinks:0, title:"Новичок", inventory:{beer:3}, cooldowns:{} }
        });
        return i.reply("💣 ВСЁ сброшено");
      }
      if(i.commandName==="set_cd"){
        const cmd=i.options.getString("команда");
        const sec=i.options.getInteger("секунды");
        if(!BASE_CD[cmd]) return i.reply("❌ Нет команды");
        BASE_CD[cmd]=sec; return i.reply(`⏱ ${cmd}=${sec}`);
      }
      if(i.commandName==="cooldown_off"){
        EVENT_ACTIVE=true; return i.reply("🎉 КД отключены");
      }
    }
  }

  /* ================== КНОПКИ ================== */
  if(i.isButton()){
    const user = await getUser(i.user.id);
    const title = titleByDrinks(user.drinks);
    const admin = await isAdmin(i.user.id);

    if(i.customId.startsWith("buy:")){
      const key=i.customId.split(":")[1];
      const d=DRINKS[key];
      if(!d) return i.reply({content:"❌",ephemeral:true});
      if(user.drinks<d.unlock) return i.reply({content:"🔒",ephemeral:true});
      const price=Math.floor(d.price*(1-title.discount));
      if(user.balance<price) return i.reply({content:"💸",ephemeral:true});
      user.balance-=price;
      user.inventory[key]=(user.inventory[key]||0)+1;
      await db.collection("users").updateOne({id:user.id},{ $set:user });
      return i.reply({content:`🛒 Куплено: ${d.name}`,ephemeral:true});
    }

    if(i.customId.startsWith("drink:")){
      const key=i.customId.split(":")[1];
      const d=DRINKS[key];
      if(!user.inventory[key]) return i.reply({content:"❌",ephemeral:true});
      const cd=cdLeft(user,"drink",title);
      if(cd>0 && !admin) return i.reply({content:`⏳ ${cd} сек`,ephemeral:true});

      user.inventory[key]--;
      let gain=Math.ceil(d.value*(1+title.bonus)*(EVENT_ACTIVE?1.5:1));
      if(Math.random()<0.15) gain++;
      if(Math.random()<0.05) gain=0;

      user.drinks+=gain;
      user.balance+=gain*10;

      const nt=titleByDrinks(user.drinks);
      if(nt.name!==user.title){
        user.title=nt.name;
        await log(`🏆 <@${user.id}> апнул **${nt.name}**`);
        await syncMemberRole(i.member, nt.name);
      }
      if(!admin) await setCd(user,"drink",title);
      await db.collection("users").updateOne({id:user.id},{ $set:user });
      return i.reply({content:`🍾 ${d.name} → +${gain} 🍺`,ephemeral:true});
    }
  }
});

client.login(TOKEN);
