const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const { MongoClient } = require("mongodb");

/* ================= CLIENT ================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* ================= ENV ================= */
const {
  TOKEN,
  MONGO_URI,
  BOT_OWNER_ID,
  LOG_CHANNEL_ID
} = process.env;

let db;

/* ================= BASE COOLDOWNS (ms) ================= */
let BASE_COOLDOWNS = {
  drink: 60000,
  casino: 45000,
  dice: 30000
};

/* ================= TITLES ================= */
const TITLES = [
  { name: "Новичок", min: 0, color: 0x95a5a6, shop: 0, casino: 0, cdReduce: 0 },
  { name: "Завсегдатай", min: 50, color: 0x2ecc71, shop: 0.05, casino: 0.05, cdReduce: 5000 },
  { name: "Алкаш", min: 200, color: 0x3498db, shop: 0.1, casino: 0.1, cdReduce: 10000 },
  { name: "Легенда бара", min: 600, color: 0x9b59b6, shop: 0.2, casino: 0.2, cdReduce: 20000 },
  { name: "Король бара", min: 1500, color: 0xf1c40f, shop: 0.3, casino: 0.3, cdReduce: Infinity }
];

const getTitle = d => [...TITLES].reverse().find(t => d >= t.min);

/* ================= DRINKS ================= */
const DRINKS = {
  beer: { name: "Пиво 🍺", base: 1 },
  whiskey: { name: "Виски 🥃", base: 2 },
  vodka: { name: "Водка 🍸", base: 3 }
};

/* ================= SHOP ================= */
const SHOP = {
  beer: 50,
  whiskey: 300,
  vodka: 600
};

/* ================= NPC BARTENDER ================= */
const NPC = {
  drink: ["Бармен: «За здоровье!» 🍻", "Бармен: «Хорош пошло» 😏"],
  bonus: ["Бармен: «Фартовый сегодня!» 🎰"],
  puke: ["Бармен: «Эй, не мешай…» 🤢"],
  sleep: ["Бармен: «Уносим тело» 💀"],
  event: ["Бармен: «Сегодня гуляем!» 🎉"]
};
const say = a => a[Math.floor(Math.random() * a.length)];

/* ================= EVENTS ================= */
const EVENTS = [
  { name: "Счастливый час", type: "drink", mult: 2 },
  { name: "Алко-ночь", type: "casino", mult: 1.5 }
];

/* ================= HELPERS ================= */
async function log(msg) {
  if (!LOG_CHANNEL_ID) return;
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (ch) ch.send(msg);
}

async function getUser(id) {
  const col = db.collection("users");
  let u = await col.findOne({ id });

  if (!u) {
    u = {
      id,
      drinks: 0,
      balance: 0,
      title: "Новичок",
      inventory: { beer: 1 },
      cooldowns: {}
    };
    await col.insertOne(u);
  }

  if (!u.title) {
    u.title = "Новичок";
    await col.updateOne({ id }, { $set: { title: "Новичок" } });
  }

  return u;
}

function getCooldownLeft(user, key, title, eventActive) {
  if (title.cdReduce === Infinity) return 0;
  if (eventActive) return 0;

  const base = BASE_COOLDOWNS[key];
  const reduce = title.cdReduce || 0;
  const realCd = Math.max(0, base - reduce);

  const last = user.cooldowns?.[key] || 0;
  const passed = Date.now() - last;

  return Math.max(0, realCd - passed);
}

async function setCooldown(user, key) {
  await db.collection("users").updateOne(
    { id: user.id },
    { $set: { [`cooldowns.${key}`]: Date.now() } }
  );
}

/* ================= EVENTS LOGIC ================= */
async function getEvent() {
  const ev = await db.collection("events").findOne({ active: true });
  if (!ev) return null;
  if (Date.now() > ev.until) {
    await db.collection("events").deleteMany({});
    await log(`⏹ Ивент **${ev.name}** закончился`);
    return null;
  }
  return ev;
}

async function startEvent() {
  if (await db.collection("events").findOne({ active: true })) return;
  const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  await db.collection("events").insertOne({
    ...ev,
    active: true,
    until: Date.now() + 20 * 60 * 1000
  });
  await log(`🎉 Ивент **${ev.name}** начался!\n${say(NPC.event)}`);
}

/* ================= ROLES ================= */
async function ensureRoles(guild) {
  if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;
  for (const t of TITLES) {
    if (!guild.roles.cache.find(r => r.name === t.name)) {
      await guild.roles.create({ name: t.name, color: t.color });
    }
  }
}

async function updateRole(member, user) {
  const title = getTitle(user.drinks);

  if (user.title !== title.name) {
    await db.collection("users").updateOne(
      { id: user.id },
      { $set: { title: title.name } }
    );
    await log(`🏆 <@${user.id}> получил титул **${title.name}**`);
  }

  const roles = member.guild.roles.cache;
  const newRole = roles.find(r => r.name === title.name);
  if (!newRole) return;

  for (const t of TITLES) {
    const r = roles.find(x => x.name === t.name);
    if (r && member.roles.cache.has(r.id) && r.id !== newRole.id)
      await member.roles.remove(r).catch(() => {});
  }

  if (!member.roles.cache.has(newRole.id))
    await member.roles.add(newRole).catch(() => {});
}

/* ================= READY ================= */
client.once("ready", async () => {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  db = mongo.db("barbot");

  console.log("🍃 MongoDB подключена");
  console.log("🍻 Бар-бот запущен");

  for (const g of client.guilds.cache.values()) {
    await ensureRoles(g);
  }

  setInterval(startEvent, 30 * 60 * 1000);
});

/* ================= COMMANDS ================= */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  const u = await getUser(i.user.id);
  const title = getTitle(u.drinks);
  const ev = await getEvent();

  /* ===== ВЫПИТЬ ===== */
  if (i.commandName === "выпить") {
    const drink = i.options.getString("напиток") || "beer";
    if (!DRINKS[drink]) return i.reply("❌ Нет такого напитка");
    if (!u.inventory[drink]) return i.reply("❌ У тебя его нет");

    const cd = getCooldownLeft(u, "drink", title, ev);
    if (cd > 0) return i.reply({ content:`⏳ ${Math.ceil(cd/1000)} сек`, ephemeral:true });

    let gain = DRINKS[drink].base;
    let txt = `🥃 Ты выпил **${DRINKS[drink].name}**\n${say(NPC.drink)}`;

    if (Math.random() < 0.15) { gain++; txt += `\n${say(NPC.bonus)}`; }
    if (Math.random() < 0.10) { gain--; txt += `\n${say(NPC.puke)}`; }
    if (Math.random() < 0.05) { gain = 0; txt += `\n${say(NPC.sleep)}`; }

    if (ev && ev.type === "drink") gain = Math.floor(gain * ev.mult);
    gain = Math.max(0, gain);

    u.inventory[drink]--;

    await db.collection("users").updateOne(
      { id: u.id },
      {
        $set: { inventory: u.inventory },
        $inc: { drinks: gain, balance: gain * 20 }
      }
    );

    await setCooldown(u, "drink");
    await updateRole(i.member, u);

    return i.reply(`${txt}\n➡️ **+${gain} 🍺**`);
  }

  /* ===== МАГАЗИН ===== */
  if (i.commandName === "магазин") {
    let t = "🛒 **Магазин**\n\n";
    for (const k in SHOP) {
      t += `${DRINKS[k].name} — ${Math.floor(SHOP[k] * (1 - title.shop))} 💰\n`;
    }
    return i.reply(t);
  }

  /* ===== КУПИТЬ ===== */
  if (i.commandName === "купить") {
    const item = i.options.getString("товар");
    const price = Math.floor(SHOP[item] * (1 - title.shop));
    if (!SHOP[item]) return i.reply("❌ Нет такого");
    if (u.balance < price) return i.reply("❌ Мало денег");

    u.inventory[item] = (u.inventory[item] || 0) + 1;
    await db.collection("users").updateOne(
      { id: u.id },
      { $inc: { balance: -price }, $set: { inventory: u.inventory } }
    );

    return i.reply(`✅ Куплено: ${DRINKS[item].name}`);
  }

  /* ===== КАЗИНО ===== */
  if (i.commandName === "казино") {
    const bet = i.options.getInteger("ставка");
    if (bet > u.balance) return i.reply("❌ Мало денег");

    const cd = getCooldownLeft(u, "casino", title, ev);
    if (cd > 0) return i.reply({ content:`⏳ ${Math.ceil(cd/1000)} сек`, ephemeral:true });

    const mult = ev && ev.type === "casino" ? ev.mult : 1;
    const win = Math.random() < (0.45 + title.casino);
    const delta = win ? Math.floor(bet * 1.5 * mult) : -bet;

    await db.collection("users").updateOne({ id: u.id }, { $inc: { balance: delta } });
    await setCooldown(u, "casino");

    return i.reply(win ? `🎰 WIN +${delta}` : `💸 LOSE ${-delta}`);
  }

  /* ===== КОСТИ ===== */
  if (i.commandName === "кости") {
    const bet = i.options.getInteger("ставка");
    if (bet > u.balance) return i.reply("❌ Мало денег");

    const cd = getCooldownLeft(u, "dice", title, ev);
    if (cd > 0) return i.reply({ content:`⏳ ${Math.ceil(cd/1000)} сек`, ephemeral:true });

    const you = Math.ceil(Math.random() * 6);
    const bot = Math.ceil(Math.random() * 6);
    const delta = you > bot ? bet : you < bot ? -bet : 0;

    await db.collection("users").updateOne({ id: u.id }, { $inc: { balance: delta } });
    await setCooldown(u, "dice");

    return i.reply(`🎲 Ты ${you} | Бар ${bot} → ${delta}`);
  }

  /* ===== ТОП ===== */
  if (i.commandName === "топ") {
    const col = db.collection("users");
    const list = await col.find().sort({ drinks: -1 }).limit(10).toArray();
    let t = "🏆 **Топ алкашей**\n\n";
    for (let n = 0; n < list.length; n++) {
      const x = list[n];
      if (!x.title) {
        await col.updateOne({ id: x.id }, { $set: { title: "Новичок" } });
        x.title = "Новичок";
      }
      t += `${n + 1}. <@${x.id}> — ${x.drinks} 🍺 (${x.title})\n`;
    }
    return i.reply(t);
  }

  /* ===== SET CD (OWNER) ===== */
  if (i.commandName === "set_cd") {
    if (i.user.id !== BOT_OWNER_ID)
      return i.reply({ content: "❌ Только овнер", ephemeral: true });

    const cmd = i.options.getString("команда");
    const sec = i.options.getInteger("секунды");

    BASE_COOLDOWNS[cmd] = sec * 1000;
    await log(`⏱ Овнер изменил КД: ${cmd} = ${sec} сек`);

    return i.reply(`✅ КД для **${cmd}** теперь **${sec} сек**`);
  }

  /* ===== RESET ALL (OWNER) ===== */
  if (i.commandName === "reset_all") {
    if (i.user.id !== BOT_OWNER_ID)
      return i.reply({ content: "❌ Только овнер", ephemeral: true });

    await db.collection("users").updateMany(
      {},
      {
        $set: {
          drinks: 0,
          balance: 0,
          title: "Новичок",
          inventory: { beer: 1 },
          cooldowns: {}
        }
      }
    );

    await log("♻ **ОВНЕР СБРОСИЛ ВСЮ СТАТИСТИКУ**");
    return i.reply("♻ **Вся статистика и титулы сброшены**");
  }
});

client.login(TOKEN);
