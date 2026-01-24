import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
} from "discord.js";
import { MongoClient } from "mongodb";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const {
  TOKEN,
  MONGO_URI,
  BOT_OWNER_ID,
  GUILD_ID,
  LOG_CHANNEL_ID
} = process.env;

/* ================= MONGO ================= */
const mongo = new MongoClient(MONGO_URI);
await mongo.connect();
const db = mongo.db("barbot");

console.log("🍃 MongoDB подключена");

/* ================= ТИТУЛЫ =================
 bonus: % бонус к наградам
 discount: % скидка в магазине
 cdReduce: снижение КД (сек)
*/
const TITLES = [
  { name: "Новичок", need: 0,   color: 0x9e9e9e, bonus: 0,    discount: 0,    cdReduce: 0 },
  { name: "Любитель", need: 10, color: 0x2ecc71, bonus: 0.05, discount: 0.05, cdReduce: 5 },
  { name: "Пьяница", need: 30,  color: 0xf1c40f, bonus: 0.1,  discount: 0.1,  cdReduce: 10 },
  { name: "Алкаш", need: 60,    color: 0xe67e22, bonus: 0.15, discount: 0.15, cdReduce: 20 },
  { name: "Легенда бара", need: 120, color: 0xe74c3c, bonus: 0.25, discount: 0.25, cdReduce: 9999 }
];

/* ================= МАГАЗИН ================= */
const SHOP = {
  beer:     { name: "🍺 Пиво",     price: 100,  value: 1, unlock: 0 },
  cider:   { name: "🍻 Сидр",     price: 250,  value: 1, unlock: 5 },
  whiskey: { name: "🥃 Виски",    price: 600,  value: 2, unlock: 10 },
  rum:     { name: "🍹 Ром",      price: 900,  value: 2, unlock: 20 },
  vodka:   { name: "🍸 Водка",    price: 1200, value: 3, unlock: 30 },
  absinthe:{ name: "💀 Абсент",   price: 2500, value: 5, unlock: 60 }
};

/* ================= КУЛДАУНЫ (сек) ================= */
let BASE_CD = {
  drink: 60,
  casino: 90,
  dice: 45
};

/* ================= УТИЛИТЫ ================= */
const now = () => Math.floor(Date.now() / 1000);

function getTitle(drinks) {
  return [...TITLES].reverse().find(t => drinks >= t.need);
}

async function log(msg) {
  if (!LOG_CHANNEL_ID) return;
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);
  if (ch) ch.send(msg);
}

async function getUser(id) {
  const col = db.collection("users");
  let u = await col.findOne({ id });
  if (!u) {
    u = {
      id,
      balance: 0,
      drinks: 0,
      title: "Новичок",
      inventory: { beer: 1 },
      cooldowns: {}
    };
    await col.insertOne(u);
  }
  if (!u.cooldowns) u.cooldowns = {};
  return u;
}

/* ================= РОЛИ ПО ТИТУЛАМ ================= */
async function ensureRoles(guild) {
  if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;
  for (const t of TITLES) {
    if (!guild.roles.cache.find(r => r.name === t.name)) {
      await guild.roles.create({
        name: t.name,
        color: t.color,
        reason: "Авто-роль по титулу"
      });
    }
  }
}

async function updateMemberRole(member, titleName) {
  const roles = member.guild.roles.cache;
  const target = roles.find(r => r.name === titleName);
  if (!target) return;

  for (const t of TITLES) {
    const r = roles.find(x => x.name === t.name);
    if (r && member.roles.cache.has(r.id) && r.id !== target.id) {
      await member.roles.remove(r).catch(()=>{});
    }
  }
  if (!member.roles.cache.has(target.id)) {
    await member.roles.add(target).catch(()=>{});
  }
}

/* ================= READY ================= */
client.once("ready", async () => {
  console.log("🍻 Бар-бот запущен");
  const guild = await client.guilds.fetch(GUILD_ID).catch(()=>null);
  if (guild) await ensureRoles(guild);
});

/* ================= SLASH ================= */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;
  const user = await getUser(i.user.id);
  const title = getTitle(user.drinks);

  /* ---------- КУЛДАУН ---------- */
  function hasCd(key) {
    const reduce = title.cdReduce || 0;
    const realCd = Math.max(0, BASE_CD[key] - reduce);
    const until = user.cooldowns[key] || 0;
    return until > now() ? Math.ceil(until - now()) : 0;
  }

  async function setCd(key) {
    const reduce = title.cdReduce || 0;
    const realCd = Math.max(0, BASE_CD[key] - reduce);
    user.cooldowns[key] = now() + realCd;
    await db.collection("users").updateOne(
      { id: user.id },
      { $set: { cooldowns: user.cooldowns } }
    );
  }

  /* ===== /выпить ===== */
  if (i.commandName === "выпить") {
    const key = i.options.getString("напиток") || "beer";
    const item = SHOP[key];
    if (!item) return i.reply({ content:"❌ Нет такого напитка", ephemeral:true });
    if (user.drinks < item.unlock)
      return i.reply({ content:"🔒 Напиток ещё не открыт", ephemeral:true });

    const cd = hasCd("drink");
    if (cd) return i.reply({ content:`⏳ Подожди ${cd} сек`, ephemeral:true });

    if (!user.inventory[key] || user.inventory[key] <= 0)
      return i.reply({ content:"❌ У тебя его нет", ephemeral:true });

    user.inventory[key]--;
    let gain = item.value;

    // бонус от титула
    gain = Math.ceil(gain * (1 + title.bonus));

    // шансы
    if (Math.random() < 0.15) gain += 1;
    if (Math.random() < 0.05) gain = 0;

    user.drinks += gain;
    user.balance += gain * 50;

    const newTitle = getTitle(user.drinks);
    if (newTitle.name !== user.title) {
      user.title = newTitle.name;
      await log(`🏆 <@${user.id}> получил титул **${newTitle.name}**`);
      await updateMemberRole(i.member, newTitle.name);
    }

    await setCd("drink");
    await db.collection("users").updateOne({ id:user.id },{ $set:user });

    return i.reply(`🍾 ${item.name} → **+${gain} 🍺**`);
  }

  /* ===== /магазин ===== */
  if (i.commandName === "магазин") {
    let t = "🛒 **Магазин**\n\n";
    for (const k in SHOP) {
      const d = SHOP[k];
      if (user.drinks >= d.unlock) {
        const price = Math.floor(d.price * (1 - title.discount));
        t += `${d.name} — ${price}💰\n`;
      }
    }
    return i.reply(t);
  }

  /* ===== /купить ===== */
  if (i.commandName === "купить") {
    const key = i.options.getString("предмет");
    const d = SHOP[key];
    if (!d) return i.reply("❌ Нет такого");
    if (user.drinks < d.unlock) return i.reply("🔒 Не открыт");
    const price = Math.floor(d.price * (1 - title.discount));
    if (user.balance < price) return i.reply("💸 Мало денег");

    user.balance -= price;
    user.inventory[key] = (user.inventory[key] || 0) + 1;

    await db.collection("users").updateOne({ id:user.id },{ $set:user });
    return i.reply(`🛒 Куплено: ${d.name}`);
  }

  /* ===== /казино ===== */
  if (i.commandName === "казино") {
    const cd = hasCd("casino");
    if (cd) return i.reply(`⏳ Подожди ${cd} сек`);
    const win = Math.random() < (0.45 + title.bonus);
    const amount = Math.floor((Math.random()*500+100) * (1+title.bonus));
    user.balance += win ? amount : -amount;
    await setCd("casino");
    await db.collection("users").updateOne({ id:user.id },{ $set:user });
    return i.reply(win ? `🎰 WIN +${amount}` : `💸 LOSE ${amount}`);
  }

  /* ===== /кости ===== */
  if (i.commandName === "кости") {
    const cd = hasCd("dice");
    if (cd) return i.reply(`⏳ Подожди ${cd} сек`);
    const roll = Math.ceil(Math.random()*6);
    const gain = roll * 20;
    user.balance += gain;
    await setCd("dice");
    await db.collection("users").updateOne({ id:user.id },{ $set:user });
    return i.reply(`🎲 Выпало ${roll} → +${gain}💰`);
  }

  /* ===== /топ ===== */
  if (i.commandName === "топ") {
    const list = await db.collection("users").find().sort({drinks:-1}).limit(10).toArray();
    let t = "🏆 **Топ алкашей**\n\n";
    list.forEach((x,i2)=> t+=`${i2+1}. <@${x.id}> — ${x.drinks} 🍺 (${x.title})\n`);
    return i.reply(t);
  }

  /* ===== /reset_all (ОВНЕР) ===== */
  if (i.commandName === "reset_all") {
    if (i.user.id !== BOT_OWNER_ID)
      return i.reply({ content:"❌ Только овнер", ephemeral:true });

    await db.collection("users").updateMany({},{
      $set:{
        balance:0,
        drinks:0,
        title:"Новичок",
        inventory:{ beer:1 },
        cooldowns:{}
      }
    });
    return i.reply("♻ Вся статистика сброшена");
  }
});

client.login(TOKEN);
