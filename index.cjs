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

/* ===== ENV ===== */
const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const OWNER_ID = process.env.BOT_OWNER_ID;
const GUILD_ID = process.env.GUILD_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

/* ===== MONGO ===== */
const mongo = new MongoClient(MONGO_URI);
let db;

/* ===== НАПИТКИ ===== */
const DRINKS = {
  beer: {
    name: "🍺 Пиво",
    price: 0,          // стартовое
    value: 1,          // +1 выпито
    money: 5,          // МАЛО денег
    unlock: 0
  },

  whiskey: {
    name: "🥃 Виски",
    price: 150,
    value: 2,
    money: 25,         // В 5 раз выгоднее пива
    unlock: 10
  },

  vodka: {
    name: "🍸 Водка",
    price: 300,
    value: 3,
    money: 50,
    unlock: 25
  },

  rum: {
    name: "🍹 Ром",
    price: 600,
    value: 4,
    money: 90,
    unlock: 50
  },

  absinthe: {
    name: "💀 Абсент",
    price: 1200,
    value: 6,
    money: 160,
    unlock: 100
  }
};

/* ===== ТИТУЛЫ ===== */
const TITLES = [
  {name:"Новичок",need:0,bonus:0,discount:0,cdReduce:0,color:0x9e9e9e},
  {name:"Пьяница",need:10,bonus:0.05,discount:0.05,cdReduce:5,color:0x2ecc71},
  {name:"Алкаш",need:30,bonus:0.10,discount:0.10,cdReduce:10,color:0xf1c40f},
  {name:"Бармен",need:60,bonus:0.15,discount:0.15,cdReduce:20,color:0xe67e22},
  {name:"Легенда бара",need:120,bonus:0.25,discount:0.25,cdReduce:9999,color:0xe74c3c}
];

let BASE_CD = { drink:30, casino:60, dice:45 };
let CURRENT_EVENT = null;

const now = () => Math.floor(Date.now()/1000);

/* ===== HELPERS ===== */
async function log(msg){
  if(!LOG_CHANNEL_ID) return;
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);
  if(ch) ch.send(msg);
}
function titleByDrinks(d){ return [...TITLES].reverse().find(t=>d>=t.need); }

async function getUser(id){
  const col=db.collection("users");
  let u=await col.findOne({id});
  if(!u){
    u={id,balance:50,drinks:0,title:"Новичок",inventory:{beer:3},cooldowns:{}};
    await col.insertOne(u);
  }
  u.inventory ||= {beer:3};
  u.cooldowns ||= {};
  return u;
}

async function isAdmin(id){
  if(id===OWNER_ID) return true;
  return !!await db.collection("admins").findOne({id});
}

function cdLeft(u,k,t){
  if(CURRENT_EVENT==="no_cooldown") return 0;
  const real=Math.max(0,BASE_CD[k]-t.cdReduce);
  return Math.max(0,(u.cooldowns[k]||0)-now());
}
async function setCd(u,k,t){
  u.cooldowns[k]=now()+Math.max(0,BASE_CD[k]-t.cdReduce);
  await db.collection("users").updateOne({id:u.id},{ $set:{cooldowns:u.cooldowns}});
}

/* ===== ROLES ===== */
async function ensureRoles(guild){
  if(!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;
  for(const t of TITLES){
    if(!guild.roles.cache.find(r=>r.name===t.name)){
      await guild.roles.create({name:t.name,color:t.color,reason:"Титул"});
    }
  }
}
async function syncMemberRole(member,title){
  const roles=member.guild.roles.cache;
  const target=roles.find(r=>r.name===title);
  if(!target) return;
  for(const t of TITLES){
    const r=roles.find(x=>x.name===t.name);
    if(r && member.roles.cache.has(r.id) && r.id!==target.id){
      await member.roles.remove(r).catch(()=>{});
    }
  }
  if(!member.roles.cache.has(target.id)){
    await member.roles.add(target).catch(()=>{});
  }
}

/* ===== READY ===== */
client.once("ready",async()=>{
  await mongo.connect();
  db=mongo.db("barbot");
  console.log("🍃 MongoDB подключена");
  console.log("🍻 Бар-бот запущен");
  const g=await client.guilds.fetch(GUILD_ID).catch(()=>null);
  if(g) await ensureRoles(g);
});

/* ===== INTERACTIONS ===== */
client.on("interactionCreate",async i=>{
  if(!i.isChatInputCommand() && !i.isButton()) return;

  /* ---- SLASH ---- */
  if(i.isChatInputCommand()){
    const u=await getUser(i.user.id);
    const title=titleByDrinks(u.drinks);
    const admin=await isAdmin(i.user.id);

    if(i.commandName==="баланс"){
      return i.reply(`🍺 ${u.drinks} | 💰 ${u.balance} | 🏷 ${u.title}`);
    }

    if(i.commandName==="магазин"){
      const emb=new EmbedBuilder().setTitle("🛒 Магазин");
      const row=new ActionRowBuilder();
      for(const k in DRINKS){
        const d=DRINKS[k];
        if(u.drinks<d.unlock) continue;
        emb.addFields({name:d.name,value:`${d.price} 🍺 | +${d.value}`,inline:true});
        row.addComponents(new ButtonBuilder().setCustomId(`buy:${k}`).setLabel(`Купить ${d.name}`).setStyle(ButtonStyle.Primary));
      }
      return i.reply({embeds:[emb],components:[row]});
    }

    if(i.commandName==="выпить"){
      const k=i.options.getString("напиток")||"beer";
      if(!u.inventory[k]) return i.reply("❌ Нет напитка");
      const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`drink:${k}`).setLabel("Выпить").setStyle(ButtonStyle.Success)
      );
      return i.reply({content:`Выпить ${DRINKS[k].name}?`,components:[row],ephemeral:true});
    }

    if(i.commandName==="казино"){
      const bet=i.options.getInteger("ставка");
      if(bet<=0||u.balance<bet) return i.reply("❌ Ставка неверна");
      const cd=cdLeft(u,"casino",title);
      if(cd>0&&!admin) return i.reply(`⏳ ${cd} сек`);
      const win=Math.random()<(0.45+title.bonus);
      u.balance+=win?bet:-bet;
      if(!admin) await setCd(u,"casino",title);
      await db.collection("users").updateOne({id:u.id},{ $set:u });
      return i.reply(win?`🎰 WIN +${bet}`:`💀 LOSE ${bet}`);
    }

    if(i.commandName==="кости"){
      const cd=cdLeft(u,"dice",title);
      if(cd>0&&!admin) return i.reply(`⏳ ${cd} сек`);
      const a=Math.ceil(Math.random()*6),b=Math.ceil(Math.random()*6);
      if(a>b) u.balance+=5;
      if(a<b) u.balance-=5;
      if(!admin) await setCd(u,"dice",title);
      await db.collection("users").updateOne({id:u.id},{ $set:u });
      return i.reply(`🎲 ${a} vs ${b}`);
    }

    if(i.commandName==="топ"){
      const list=await db.collection("users").find().sort({drinks:-1}).limit(10).toArray();
      let t="🏆 Топ\n\n";
      list.forEach((x,i2)=>t+=`${i2+1}. <@${x.id}> — ${x.drinks} (${x.title})\n`);
      return i.reply(t);
    }

    /* ===== OWNER ONLY ===== */
    if(i.user.id!==OWNER_ID) return;

    if(i.commandName==="money_add"){
      const user=i.options.getUser("пользователь");
      const sum=i.options.getInteger("сумма");
      await db.collection("users").updateOne({id:user.id},{ $inc:{balance:sum} });
      return i.reply(`💰 Выдано ${sum}`);
    }

    if(i.commandName==="money_take"){
      const user=i.options.getUser("пользователь");
      const sum=i.options.getInteger("сумма");
      await db.collection("users").updateOne({id:user.id},{ $inc:{balance:-sum} });
      return i.reply(`💸 Забрано ${sum}`);
    }

    if(i.commandName==="reset_user"){
      const user=i.options.getUser("пользователь");
      await db.collection("users").updateOne(
        {id:user.id},
        {$set:{balance:50,drinks:0,title:"Новичок",inventory:{beer:3},cooldowns:{}}}
      );
      return i.reply("♻ Пользователь сброшен");
    }

    if(i.commandName==="reset_all"){
      await db.collection("users").updateMany({},{
        $set:{balance:50,drinks:0,title:"Новичок",inventory:{beer:3},cooldowns:{}}
      });
      return i.reply("💣 ВСЯ СТАТИСТИКА СБРОШЕНА");
    }
  }

  /* ---- BUTTONS ---- */
  if(i.isButton()){
    const u=await getUser(i.user.id);
    const title=titleByDrinks(u.drinks);
    const admin=await isAdmin(i.user.id);

    if(i.customId.startsWith("buy:")){
      const k=i.customId.split(":")[1];
      if(u.balance<DRINKS[k].price) return i.reply({content:"💸",ephemeral:true});
      u.balance-=DRINKS[k].price;
      u.inventory[k]=(u.inventory[k]||0)+1;
      await db.collection("users").updateOne({id:u.id},{ $set:u });
      return i.reply({content:`🛒 Куплено ${DRINKS[k].name}`,ephemeral:true});
    }

    if(i.customId.startsWith("drink:")){
      const k=i.customId.split(":")[1];
      if(!u.inventory[k]) return i.reply({content:"❌",ephemeral:true});
      const cd=cdLeft(u,"drink",title);
      if(cd>0&&!admin) return i.reply({content:`⏳ ${cd} сек`,ephemeral:true});

      let gain=DRINKS[k].value;
      if(Math.random()<0.15) gain++;
      u.inventory[k]--;
      u.drinks+=gain;
      u.balance += DRINKS[k].money;

      const nt=titleByDrinks(u.drinks);
      if(nt.name!==u.title){
        u.title=nt.name;
        await syncMemberRole(i.member,nt.name);
        await log(`🏆 <@${u.id}> апнул **${nt.name}**`);
      }

      if(!admin) await setCd(u,"drink",title);
      await db.collection("users").updateOne({id:u.id},{ $set:u });

      return i.reply({content:`🍾 ${DRINKS[k].name} → +${gain}`,ephemeral:true});
    }
  }
});

client.login(TOKEN);
