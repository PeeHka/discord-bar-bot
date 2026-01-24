const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const { MongoClient } = require("mongodb");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const {
  TOKEN,
  MONGO_URI,
  BOT_OWNER_ID,
  LOG_CHANNEL_ID
} = process.env;

let db;

/* ===== TITLES ===== */
const TITLES = [
  { name: "Новичок", min: 0, color: 0x95a5a6, shop: 0, casino: 0, cd: 0 },
  { name: "Завсегдатай", min: 50, color: 0x2ecc71, shop: 0.05, casino: 0.05, cd: 5000 },
  { name: "Алкаш", min: 200, color: 0x3498db, shop: 0.1, casino: 0.1, cd: 10000 },
  { name: "Легенда бара", min: 600, color: 0x9b59b6, shop: 0.2, casino: 0.2, cd: 20000 },
  { name: "Король бара", min: 1500, color: 0xf1c40f, shop: 0.3, casino: 0.3, cd: Infinity }
];

const SHOP = {
  пиво: { price: 0, min: 1, max: 1 },
  виски: { price: 120, min: 4, max: 6 },
  водка: { price: 300, min: 8, max: 14 },
  самогон: { price: 700, min: -20, max: 40 },
  абсент: { price: 1500, min: 30, max: 80 }
};

const BASE_CD = {
  выпить: 60000,
  казино: 60000,
  кости: 45000
};

/* ===== HELPERS ===== */
const getTitle = d => [...TITLES].reverse().find(t => d >= t.min);

async function getUser(id) {
  const col = db.collection("users");
  let u = await col.findOne({ id });

  // если юзера нет — создаём
  if (!u) {
    u = {
      id,
      drinks: 0,
      cooldowns: {},
      title: "Новичок"
    };
    await col.insertOne(u);
    return u;
  }

  // 🔥 ФИКС СТАРЫХ ПОЛЬЗОВАТЕЛЕЙ (ВОТ ИМЕННО ЭТОГО НЕ ХВАТАЛО)
  if (!u.title) {
    u.title = "Новичок";
    await col.updateOne(
      { id },
      { $set: { title: "Новичок" } }
    );
  }

  return u;
}

async function isAdmin(id) {
  if (id === BOT_OWNER_ID) return true;
  const a = await db.collection("admins").findOne({ id });
  return !!a;
}

async function checkCooldown(user, cmd, title, admin) {
  if (admin || title.cd === Infinity) return 0;
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

async function log(msg) {
  if (!LOG_CHANNEL_ID) return;
  const ch = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (ch) ch.send(msg);
}

/* ===== ROLES ===== */
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

/* ===== READY ===== */
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

/* ===== COMMANDS ===== */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  const u = await getUser(i.user.id);
  const title = getTitle(u.drinks);
  const admin = await isAdmin(i.user.id);
  const owner = i.user.id === BOT_OWNER_ID;

  /* BASIC */
  if (i.commandName === "баланс")
    return i.reply(`💰 ${u.drinks} 🍺 | ${title.name}`);

  if (i.commandName === "выпить") {
    const cd = await checkCooldown(u, "выпить", title, admin);
    if (cd) return i.reply({ content:`⏳ ${cd} сек`, ephemeral:true });
    u.drinks++;
    await db.collection("users").updateOne({ id:u.id },{ $inc:{ drinks:1 }});
    await updateRole(i.member, u);
    return i.reply("🍺 +1");
  }

  if (i.commandName === "казино") {
    const bet = i.options.getInteger("ставка");
    if (bet > u.drinks) return i.reply("❌ Мало 🍺");
    const cd = await checkCooldown(u,"казино",title,admin);
    if (cd) return i.reply({ content:`⏳ ${cd} сек`, ephemeral:true });

    const win = Math.random() < (0.45 + title.casino);
    const delta = win ? Math.floor(bet * 1.5) : -bet;

    u.drinks = Math.max(0, u.drinks + delta);
    await db.collection("users").updateOne({ id:u.id },{ $set:{ drinks:u.drinks }});
    await updateRole(i.member, u);
    return i.reply(win ? `🎰 WIN +${delta}` : `💸 LOSE ${-delta}`);
  }

  if (i.commandName === "кости") {
    const bet = i.options.getInteger("ставка");
    if (bet > u.drinks) return i.reply("❌ Мало 🍺");
    const cd = await checkCooldown(u,"кости",title,admin);
    if (cd) return i.reply({ content:`⏳ ${cd} сек`, ephemeral:true });

    const you = Math.ceil(Math.random()*6);
    const bot = Math.ceil(Math.random()*6);
    let delta = 0;
    if (you > bot) delta = bet + Math.floor(bet * title.casino);
    if (you < bot) delta = -bet;

    u.drinks = Math.max(0, u.drinks + delta);
    await db.collection("users").updateOne({ id:u.id },{ $set:{ drinks:u.drinks }});
    await updateRole(i.member, u);
    return i.reply(`🎲 Ты ${you} | Бар ${bot} → ${delta} 🍺`);
  }

  if (i.commandName === "магазин") {
    let txt="🛒 Магазин:\n";
    for (const [k,v] of Object.entries(SHOP)) {
      txt+=`${k} — ${Math.floor(v.price*(1-title.shop))} 🍺\n`;
    }
    return i.reply(txt);
  }

  if (i.commandName === "купить") {
    const item = i.options.getString("товар");
    const d = SHOP[item];
    if (!d) return i.reply("❌ Нет такого");
    const price = Math.floor(d.price*(1-title.shop));
    if (u.drinks < price) return i.reply("❌ Мало 🍺");

    const gain = Math.floor(Math.random()*(d.max-d.min+1))+d.min;
    u.drinks = Math.max(0,u.drinks-price+gain);

    await db.collection("users").updateOne({ id:u.id },{ $set:{ drinks:u.drinks }});
    await updateRole(i.member,u);
    return i.reply(`🍻 ${item}: ${gain} → ${u.drinks}`);
  }

 if (i.commandName === "топ") {
  const col = db.collection("users");

  const list = await col
    .find({})
    .sort({ drinks: -1 })
    .limit(10)
    .toArray();

  let t = "🏆 **Топ алкашей**\n\n";

  for (let index = 0; index < list.length; index++) {
    const x = list[index];

    // 🔥 ФИКС undefined
    if (typeof x.drinks !== "number") {
      x.drinks = 0;
      await col.updateOne(
        { id: x.id },
        { $set: { drinks: 0 } }
      );
    }

    if (!x.title) {
      x.title = "Новичок";
      await col.updateOne(
        { id: x.id },
        { $set: { title: "Новичок" } }
      );
    }

    t += `${index + 1}. <@${x.id}> — **${x.drinks} 🍺** (${x.title})\n`;
  }

  return i.reply({ content: t });
}

  if (i.commandName === "help")
    return i.reply("/баланс /выпить /казино /кости /магазин /купить /топ");

  /* OWNER ONLY */
  if (!owner) return;

  if (i.commandName === "admin_add") {
    const user=i.options.getUser("пользователь");
    await db.collection("admins").updateOne({ id:user.id },{ $set:{ id:user.id }},{ upsert:true });
    return i.reply(`✅ Админ добавлен: <@${user.id}>`);
  }

  if (i.commandName === "admin_delete") {
    const user=i.options.getUser("пользователь");
    await db.collection("admins").deleteOne({ id:user.id });
    return i.reply(`❌ Админ удалён: <@${user.id}>`);
  }

  if (i.commandName === "money_give") {
    const user=i.options.getUser("пользователь");
    const a=i.options.getInteger("количество");
    await getUser(user.id);
    await db.collection("users").updateOne({ id:user.id },{ $inc:{ drinks:a }});
    return i.reply(`➕ ${a} 🍺 <@${user.id}>`);
  }

  if (i.commandName === "money_take") {
    const user=i.options.getUser("пользователь");
    const a=i.options.getInteger("количество");
    await db.collection("users").updateOne({ id:user.id },{ $inc:{ drinks:-a }});
    return i.reply(`➖ ${a} 🍺 у <@${user.id}>`);
  }

  if (i.commandName === "money_reset") {
    const user=i.options.getUser("пользователь");
    await db.collection("users").updateOne({ id:user.id },{ $set:{ drinks:0 }});
    return i.reply(`♻ Баланс сброшен: <@${user.id}>`);
  }
});

client.login(TOKEN);
