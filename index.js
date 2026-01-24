const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const { MongoClient } = require("mongodb");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const {
  TOKEN,
  MONGO_URI,
  LOG_CHANNEL_ID
} = process.env;

let db;

// ===== TITLES =====
const TITLES = [
  { name: "Новичок", min: 0, color: 0x95a5a6, shop: 0, casino: 0, cd: 0 },
  { name: "Завсегдатай", min: 50, color: 0x2ecc71, shop: 0.05, casino: 0.05, cd: 5000 },
  { name: "Алкаш", min: 200, color: 0x3498db, shop: 0.1, casino: 0.1, cd: 10000 },
  { name: "Легенда бара", min: 600, color: 0x9b59b6, shop: 0.2, casino: 0.2, cd: 20000 },
  { name: "Король бара", min: 1500, color: 0xf1c40f, shop: 0.3, casino: 0.3, cd: Infinity }
];

// ===== SHOP =====
const SHOP = {
  пиво: { price: 0, min: 1, max: 1 },
  виски: { price: 120, min: 4, max: 6 },
  водка: { price: 300, min: 8, max: 14 },
  самогон: { price: 700, min: -20, max: 40 },
  абсент: { price: 1500, min: 30, max: 80 }
};

// ===== COOLDOWNS =====
const BASE_CD = {
  выпить: 60000,
  казино: 60000,
  кости: 45000
};

// ===== HELPERS =====
const getTitle = d => [...TITLES].reverse().find(t => d >= t.min);

async function getUser(id) {
  const col = db.collection("users");
  let u = await col.findOne({ id });
  if (!u) {
    u = { id, drinks: 0, cooldowns: {}, title: "Новичок" };
    await col.insertOne(u);
  }
  return u;
}

async function checkCooldown(user, cmd, title) {
  const last = user.cooldowns?.[cmd] || 0;
  const cd = Math.max(0, BASE_CD[cmd] - title.cd);
  if (Date.now() - last < cd) {
    return Math.ceil((cd - (Date.now() - last)) / 1000);
  }
  await db.collection("users").updateOne(
    { id: user.id },
    { $set: { [`cooldowns.${cmd}`]: Date.now() } }
  );
  return 0;
}

async function log(text) {
  if (!LOG_CHANNEL_ID) return;
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (ch) ch.send(text);
}

// ===== ROLES =====
async function ensureRoles(guild) {
  if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles))
    return;

  for (const t of TITLES) {
    if (!guild.roles.cache.find(r => r.name === t.name)) {
      await guild.roles.create({
        name: t.name,
        color: t.color,
        reason: "Титул бара"
      });
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
    if (r && member.roles.cache.has(r.id) && r.id !== newRole.id) {
      await member.roles.remove(r).catch(() => {});
    }
  }
  if (!member.roles.cache.has(newRole.id))
    await member.roles.add(newRole).catch(() => {});
}

// ===== READY =====
client.once("ready", async () => {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  db = mongo.db("barbot");

  console.log("🍃 MongoDB подключена");
  console.log("🍻 Бар-бот запущен");

  for (const g of client.guilds.cache.values()) {
    await ensureRoles(g);
  }
});

// ===== COMMANDS =====
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;

  const u = await getUser(i.user.id);
  const title = getTitle(u.drinks);

  if (i.commandName === "баланс")
    return i.reply(`💰 ${u.drinks} 🍺 | ${title.name}`);

  if (i.commandName === "выпить") {
    const cd = await checkCooldown(u, "выпить", title);
    if (cd) return i.reply({ content: `⏳ ${cd} сек`, ephemeral: true });

    u.drinks += 1;
    await db.collection("users").updateOne(
      { id: u.id },
      { $inc: { drinks: 1 } }
    );
    await updateRole(i.member, u);
    return i.reply("🍺 Ты выпил пиво (+1)");
  }

  if (i.commandName === "казино") {
    const bet = i.options.getInteger("ставка");
    if (bet <= 0 || bet > u.drinks) return i.reply("❌ Неверная ставка");

    const cd = await checkCooldown(u, "казино", title);
    if (cd) return i.reply({ content: `⏳ ${cd} сек`, ephemeral: true });

    const chance = 0.45 + title.casino;
    const win = Math.random() < chance;
    const delta = win ? Math.floor(bet * 1.5) : -bet;

    u.drinks = Math.max(0, u.drinks + delta);
    await db.collection("users").updateOne(
      { id: u.id },
      { $set: { drinks: u.drinks } }
    );

    await updateRole(i.member, u);
    return i.reply(win ? `🎰 WIN +${delta}` : `💸 LOSE ${-delta}`);
  }

  if (i.commandName === "кости") {
    const bet = i.options.getInteger("ставка");
    if (bet <= 0 || bet > u.drinks) return i.reply("❌ Неверная ставка");

    const cd = await checkCooldown(u, "кости", title);
    if (cd) return i.reply({ content: `⏳ ${cd} сек`, ephemeral: true });

    const you = Math.ceil(Math.random() * 6);
    const bot = Math.ceil(Math.random() * 6);
    let delta = 0;
    if (you > bot) delta = bet + Math.floor(bet * title.casino);
    if (you < bot) delta = -bet;

    u.drinks = Math.max(0, u.drinks + delta);
    await db.collection("users").updateOne(
      { id: u.id },
      { $set: { drinks: u.drinks } }
    );

    await updateRole(i.member, u);
    return i.reply(`🎲 Ты ${you} | Бар ${bot} → ${delta} 🍺`);
  }

  if (i.commandName === "магазин") {
    let txt = "🛒 Магазин:\n";
    for (const [k, v] of Object.entries(SHOP)) {
      const price = Math.floor(v.price * (1 - title.shop));
      txt += `${k} — ${price} 🍺\n`;
    }
    return i.reply(txt);
  }

  if (i.commandName === "купить") {
    const item = i.options.getString("товар");
    const d = SHOP[item];
    if (!d) return i.reply("❌ Нет такого");
    const price = Math.floor(d.price * (1 - title.shop));
    if (u.drinks < price) return i.reply("❌ Не хватает 🍺");

    const gain = Math.floor(Math.random() * (d.max - d.min + 1)) + d.min;
    u.drinks = Math.max(0, u.drinks - price + gain);

    await db.collection("users").updateOne(
      { id: u.id },
      { $set: { drinks: u.drinks } }
    );

    await updateRole(i.member, u);
    return i.reply(`🍻 ${item}: ${gain} → баланс ${u.drinks}`);
  }

  if (i.commandName === "топ") {
    const list = await db.collection("users")
      .find().sort({ drinks: -1 }).limit(10).toArray();

    let txt = "🏆 Топ:\n\n";
    list.forEach((x, n) =>
      txt += `${n + 1}. <@${x.id}> — ${x.drinks} 🍺 (${x.title})\n`
    );
    return i.reply(txt);
  }

  if (i.commandName === "help") {
    return i.reply(
`/баланс
/выпить
/казино
/кости
/магазин
/купить
/топ`
    );
  }
});

client.login(TOKEN);
