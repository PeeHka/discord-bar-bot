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

/* ================= CLIENT ================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* ================= ENV ================= */
const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const OWNER_ID = process.env.BOT_OWNER_ID;
const GUILD_ID = process.env.GUILD_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

/* ================= MONGO ================= */
const mongo = new MongoClient(MONGO_URI);
let db;

/* ================= НАПИТКИ ================= */
const DRINKS = {
  beer:      { key:"beer", name:"🍺 Пиво",     price:20,  value:1, unlock:0 },
  cider:    { key:"cider", name:"🍻 Сидр",     price:35,  value:1, unlock:5 },
  wine:     { key:"wine", name:"🍷 Вино",     price:70,  value:2, unlock:10 },
  whiskey:  { key:"whiskey", name:"🥃 Виски",  price:120, value:2, unlock:20 },
  rum:      { key:"rum", name:"🍹 Ром",        price:180, value:3, unlock:30 },
  vodka:    { key:"vodka", name:"🍸 Водка",    price:250, value:3, unlock:50 },
  absinthe: { key:"absinthe", name:"💀 Абсент",price:500, value:5, unlock:80 }
};

/* ================= ТИТУЛЫ ================= */
const TITLES = [
  { name:"Новичок", need:0,   bonus:0,    discount:0,    cdReduce:0,    color:0x9e9e9e },
  { name:"Пьяница", need:10,  bonus:0.05, discount:0.05, cdReduce:5,    color:0x2ecc71 },
  { name:"Алкаш",   need:30,  bonus:0.10, discount:0.10, cdReduce:10,   color:0xf1c40f },
  { name:"Бармен",  need:60,  bonus:0.15, discount:0.15, cdReduce:20,   color:0xe67e22 },
  { name:"Легенда бара", need:120, bonus:0.25, discount:0.25, cdReduce:9999, color:0xe74c3c }
];

/* ================= КУЛДАУНЫ ================= */
let BASE_CD = { drink:30, casino:60, dice:45 };

/* ================= ИВЕНТЫ (РУЧНЫЕ) ================= */
let CURRENT_EVENT = null;
const EVENTS = {
  double_drinks: "🍻 x2 выпивка",
  double_money: "💸 x2 деньги",
  no_cooldown: "🚫 без кулдаунов",
  casino_boost: "🎰 шанс выше",
  hardcore: "💀 хардкор"
};

/* ================= УТИЛИТЫ ================= */
const now = () => Math.floor(Date.now()/1000);

async function log(msg){
  if(!LOG_CHANNEL_ID) return;
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);
  if(ch) ch.send(msg);
}

function titleByDrinks(d){
  return [...TITLES].reverse().find(t=>d>=t.need);
}

async function getUser(id){
  const col = db.collection("users");
  let u = await col.findOne({ id });
  if(!u){
    u = {
      id,
      balance:50,
      drinks:0,
      title:"Новичок",
      inventory:{ beer:3 },
      cooldowns:{}
    };
    await col.insertOne(u);
  }
  u.inventory ||= { beer:3 };
  u.cooldowns ||= {};
  return u;
}

async function isAdmin(id){
  if(id===OWNER_ID) return true;
  return !!await db.collection("admins").findOne({ id });
}

function cdLeft(user,key,title){
  if(CURRENT_EVENT==="no_cooldown") return 0;
  const real = Math.max(0, BASE_CD[key] - title.cdReduce);
  const until = user.cooldowns[key]||0;
  return Math.max(0, until-now());
}

async function setCd(user,key,title){
  const real = Math.max(0, BASE_CD[key] - title.cdReduce);
  user.cooldowns[key]=now()+real;
  await db.collection("users").updateOne(
    {id:user.id},{ $set:{ cooldowns:user.cooldowns } }
  );
}

/* ================= РОЛИ ПО ТИТУЛАМ ================= */
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

/* ================= READY ================= */
client.once("ready", async ()=>{
  await mongo.connect();
  db=mongo.db("barbot");
  console.log("🍃 MongoDB подключена");
  console.log("🍻 Бар-бот запущен");

  const g = await client.guilds.fetch(GUILD_ID).catch(()=>null);
  if(g) await ensureRoles(g);
});

/* ================= INTERACTIONS ================= */
client.on("interactionCreate", async i=>{
  if(!i.isChatInputCommand() && !i.isButton()) return;

  /* ---------- SLASH ---------- */
  if(i.isChatInputCommand()){
    const user=await getUser(i.user.id);
    const title=titleByDrinks(user.drinks);
    const admin=await isAdmin(i.user.id);

    if(i.commandName==="баланс"){
      return i.reply(`🍺 ${user.drinks} | 💰 ${user.balance} | 🏷 ${user.title}`);
    }

    if(i.commandName==="магазин"){
      const emb=new EmbedBuilder().setTitle("🛒 Барный магазин");
      const row=new ActionRowBuilder();
      for(const k in DRINKS){
        const d=DRINKS[k];
        if(user.drinks<d.unlock) continue;
        const price=Math.floor(d.price*(1-title.discount));
        emb.addFields({ name:d.name, value:`Цена: ${price} 🍺 | +${d.value}`, inline:true});
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`buy:${k}`)
            .setLabel(`Купить ${d.name}`)
            .setStyle(ButtonStyle.Primary)
        );
      }
      return i.reply({ embeds:[emb], components:[row] });
    }

    if(i.commandName==="выпить"){
      const k=i.options.getString("напиток")||"beer";
      if(!user.inventory[k]) return i.reply("❌ У тебя нет этого напитка");
      const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`drink:${k}`).setLabel("Выпить").setStyle(ButtonStyle.Success)
      );
      return i.reply({ content:`Выпить ${DRINKS[k].name}?`, components:[row], ephemeral:true });
    }

    if(i.commandName==="казино"){
      const bet=i.options.getInteger("ставка");
      if(bet<=0||user.balance<bet) return i.reply("❌ Неверная ставка");
      const cd=cdLeft(user,"casino",title);
      if(cd>0&&!admin) return i.reply(`⏳ ${cd} сек`);
      let chance=0.45+title.bonus;
      if(CURRENT_EVENT==="casino_boost") chance+=0.15;
      const win=Math.random()<chance;
      user.balance+=win?bet:-bet;
      if(!admin) await setCd(user,"casino",title);
      await db.collection("users").updateOne({id:user.id},{ $set:user });
      return i.reply(win?`🎰 WIN +${bet}`:`💀 LOSE ${bet}`);
    }

    if(i.commandName==="кости"){
      const cd=cdLeft(user,"dice",title);
      if(cd>0&&!admin) return i.reply(`⏳ ${cd} сек`);
      const a=Math.ceil(Math.random()*6),b=Math.ceil(Math.random()*6);
      if(a>b) user.balance+=5;
      if(a<b) user.balance-=5;
      if(!admin) await setCd(user,"dice",title);
      await db.collection("users").updateOne({id:user.id},{ $set:user });
      return i.reply(`🎲 ${a} vs ${b}`);
    }

    if(i.commandName==="топ"){
      const list=await db.collection("users").find().sort({drinks:-1}).limit(10).toArray();
      let t="🏆 Топ\n\n";
      list.forEach((x,i2)=>t+=`${i2+1}. <@${x.id}> — ${x.drinks} (${x.title})\n`);
      return i.reply(t);
    }

    /* ===== ОВНЕР ===== */
    if(i.user.id!==OWNER_ID) return;

    if(i.commandName==="admin_add"){
      const u=i.options.getUser("пользователь");
      await db.collection("admins").updateOne({id:u.id},{ $set:{id:u.id}},{upsert:true});
      return i.reply(`✅ ${u.username} админ`);
    }

    if(i.commandName==="admin_del"){
      const u=i.options.getUser("пользователь");
      await db.collection("admins").deleteOne({id:u.id});
      return i.reply(`❌ ${u.username} снят`);
    }

    if(i.commandName==="event_start"){
      const e=i.options.getString("ивент");
      CURRENT_EVENT=e;
      await log(`🎉 Ивент начат: **${EVENTS[e]}**`);
      return i.reply(`🎉 ${EVENTS[e]}`);
    }

    if(i.commandName==="event_stop"){
      CURRENT_EVENT=null;
      await log("⏹ Ивент остановлен");
      return i.reply("⏹ Ивент остановлен");
    }

    if(i.commandName==="cooldown_set"){
      const c=i.options.getString("команда");
      const s=i.options.getInteger("сек");
      BASE_CD[c]=s;
      return i.reply(`⏱ ${c} = ${s}`);
    }
  }

  /* ---------- BUTTONS ---------- */
  if(i.isButton()){
    const user=await getUser(i.user.id);
    const title=titleByDrinks(user.drinks);
    const admin=await isAdmin(i.user.id);

    if(i.customId.startsWith("buy:")){
      const k=i.customId.split(":")[1];
      const d=DRINKS[k];
      if(!d||user.drinks<d.unlock) return i.reply({content:"❌",ephemeral:true});
      const price=Math.floor(d.price*(1-title.discount));
      if(user.balance<price) return i.reply({content:"💸",ephemeral:true});
      user.balance-=price;
      user.inventory[k]=(user.inventory[k]||0)+1;
      await db.collection("users").updateOne({id:user.id},{ $set:user });
      return i.reply({content:`🛒 Куплено ${d.name}`,ephemeral:true});
    }

    if(i.customId.startsWith("drink:")){
      const k=i.customId.split(":")[1];
      if(!user.inventory[k]) return i.reply({content:"❌",ephemeral:true});
      const cd=cdLeft(user,"drink",title);
      if(cd>0&&!admin) return i.reply({content:`⏳ ${cd} сек`,ephemeral:true});

      let gain=DRINKS[k].value;
      if(CURRENT_EVENT==="double_drinks") gain*=2;
      if(Math.random()<0.15) gain++;
      if(CURRENT_EVENT==="hardcore"&&Math.random()<0.2) gain=0;

      user.inventory[k]--;
      user.drinks+=gain;
      user.balance+=gain*10;

      const nt=titleByDrinks(user.drinks);
      if(nt.name!==user.title){
        user.title=nt.name;
        await syncMemberRole(i.member, nt.name);
        await log(`🏆 <@${user.id}> апнул **${nt.name}**`);
      }

      if(!admin) await setCd(user,"drink",title);
      await db.collection("users").updateOne({id:user.id},{ $set:user });

      return i.reply({content:`🍾 ${DRINKS[k].name} → +${gain}`,ephemeral:true});
    }
  }
});

client.login(TOKEN);
