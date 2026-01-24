const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const { MongoClient } = require("mongodb");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const { TOKEN, MONGO_URI, BOT_OWNER_ID } = process.env;

/* ===================== Mongo ===================== */
let db;
const admins = new Set([BOT_OWNER_ID]);

/* ===================== COOLDOWNS ===================== */
const COOLDOWNS = {
  выпить: 30_000,
  казино: 60_000,
  кости: 45_000
};

/* ===================== TITLES ===================== */
const TITLES = [
  { name: "👶 Новичок", role: "Новичок", need: 0, cdBonus: 0, shopDiscount: 0, color: 0x95a5a6 },
  { name: "🍺 Завсегдатай", role: "Завсегдатай", need: 50, cdBonus: 5_000, shopDiscount: 0.05, color: 0x2ecc71 },
  { name: "🥃 Алкаш", role: "Алкаш", need: 200, cdBonus: 10_000, shopDiscount: 0.10, color: 0x3498db },
  { name: "☠ Легенда бара", role: "Легенда бара", need: 600, cdBonus: 20_000, shopDiscount: 0.20, color: 0x9b59b6 },
  { name: "👑 Король бара", role: "Король бара", need: 1500, cdBonus: Infinity, shopDiscount: 0.30, color: 0xf1c40f }
];

/* ===================== SHOP ===================== */
const SHOP = {
  пиво: { price: 0, min: 1, max: 1, unlock: 0, desc: "Бесплатно" },
  виски: { price: 120, min: 5, max: 5, unlock: 80, desc: "Медленно, но уверенно" },
  водка: { price: 300, min: 12, max: 12, unlock: 250, desc: "Серьёзный ап" },
  самогон: { price: 700, min: -20, max: 40, unlock: 600, desc: "Русская рулетка" },
  абсент: { price: 1500, min: 30, max: 80, unlock: 1200, desc: "Конец здравого смысла" }
};

/* ===================== HELPERS ===================== */
const isAdmin = (id) => admins.has(id);

function getTitle(user) {
  let t = TITLES[0];
  for (const title of TITLES) {
    if (user.drinks >= title.need) t = title;
  }
  return t;
}

async function getUser(id) {
  const col = db.collection("users");
  let u = await col.findOne({ id });

  if (!u) {
    u = {
      id,
      drinks: 0,
      cooldowns: { выпить: 0, казино: 0, кости: 0 },
      lastTitle: "Новичок"
    };
    await col.insertOne(u);
  }

  if (!u.cooldowns) {
    u.cooldowns = { выпить: 0, казино: 0, кости: 0 };
  }

  return u;
}

/* ===================== ROLES ===================== */
async function ensureTitleRoles(guild) {
  if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

  for (const t of TITLES) {
    let role = guild.roles.cache.find(r => r.name === t.role);
    if (!role) {
      await guild.roles.create({
        name: t.role,
        color: t.color,
        reason: "Авто-роль титула"
      });
    }
  }
}

async function updateTitle(member, user, channel) {
  const newTitle = getTitle(user);

  if (user.lastTitle !== newTitle.role) {
    await db.collection("users").updateOne(
      { id: user.id },
      { $set: { lastTitle: newTitle.role } }
    );

    if (channel) {
      channel.send(`🎉 <@${user.id}> стал **${newTitle.name}**!`);
    }
  }

  const roles = member.guild.roles.cache;
  const newRole = roles.find(r => r.name === newTitle.role);
  if (!newRole) return;

  for (const t of TITLES) {
    const r = roles.find(x => x.name === t.role);
    if (r && member.roles.cache.has(r.id) && r.id !== newRole.id) {
      await member.roles.remove(r).catch(() => {});
    }
  }

  if (!member.roles.cache.has(newRole.id)) {
    await member.roles.add(newRole).catch(() => {});
  }
}

/* ===================== COOLDOWN ===================== */
async function checkCooldown(user, command, interaction) {
  if (isAdmin(interaction.user.id)) return true;

  const title = getTitle(user);
  if (title.cdBonus === Infinity) return true;

  const now = Date.now();
  const last = user.cooldowns[command] || 0;
  const cd = Math.max(0, COOLDOWNS[command] - title.cdBonus);

  if (now - last < cd) {
    const left = Math.ceil((cd - (now - last)) / 1000);
    await interaction.reply({ content: `⏳ Подожди ${left} сек.`, ephemeral: true });
    return false;
  }

  await db.collection("users").updateOne(
    { id: user.id },
    { $set: { [`cooldowns.${command}`]: now } }
  );

  return true;
}

/* ===================== READY ===================== */
client.once("ready", async () => {
  console.log("🍻 Бар-бот запущен");
  for (const g of client.guilds.cache.values()) {
    await ensureTitleRoles(g);
  }
});

/* ===================== COMMANDS ===================== */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const name = interaction.commandName;

  /* HELP */
  if (name === "help") {
    return interaction.reply(
`🍺 **Команды бара**
/баланс
/выпить
/казино
/кости
/магазин
/купить
/титул
/топ`
    );
  }

  /* BALANCE */
  if (name === "баланс") {
    const u = await getUser(interaction.user.id);
    return interaction.reply(`💰 У тебя **${u.drinks} 🍺**`);
  }

  /* ВЫПИТЬ */
  if (name === "выпить") {
    const u = await getUser(interaction.user.id);
    if (!(await checkCooldown(u, "выпить", interaction))) return;

    await db.collection("users").updateOne(
      { id: u.id },
      { $inc: { drinks: 1 } }
    );

    const nu = await getUser(u.id);
    await updateTitle(interaction.member, nu, interaction.channel);

    return interaction.reply("🥃 Ты выпил и получил **+1 🍺**");
  }

  /* КАЗИНО */
  if (name === "казино") {
    const u = await getUser(interaction.user.id);
    if (!(await checkCooldown(u, "казино", interaction))) return;

    const amount = Math.floor(Math.random() * 6) + 2;
    const win = Math.random() < 0.45;
    const delta = win ? amount : -Math.min(amount, u.drinks);

    await db.collection("users").updateOne(
      { id: u.id },
      { $inc: { drinks: delta } }
    );

    const nu = await getUser(u.id);
    await updateTitle(interaction.member, nu, interaction.channel);

    return interaction.reply(
      win ? `🎰 WIN **+${amount} 🍺**` : `💸 LOSE **${-delta} 🍺**`
    );
  }

  /* КОСТИ */
  if (name === "кости") {
    const u = await getUser(interaction.user.id);
    if (!(await checkCooldown(u, "кости", interaction))) return;

    const you = Math.ceil(Math.random() * 6);
    const bot = Math.ceil(Math.random() * 6);
    let delta = 0;
    if (you > bot) delta = 2;
    if (you < bot) delta = -2;

    await db.collection("users").updateOne(
      { id: u.id },
      { $inc: { drinks: delta } }
    );

    const nu = await getUser(u.id);
    await updateTitle(interaction.member, nu, interaction.channel);

    return interaction.reply(
      `🎲 Ты: ${you} | Бармен: ${bot}\nРезультат: **${delta >= 0 ? "+" : ""}${delta} 🍺**`
    );
  }

  /* МАГАЗИН */
  if (name === "магазин") {
    const u = await getUser(interaction.user.id);
    const t = getTitle(u);

    let text = "🛒 **Магазин бара**\n\n";
    for (const [k, v] of Object.entries(SHOP)) {
      if (u.drinks < v.unlock) continue;
      const price = Math.floor(v.price * (1 - t.shopDiscount));
      text += `🍺 **${k}** — ${price} 🍺\n`;
    }
    return interaction.reply(text);
  }

  /* КУПИТЬ */
  if (name === "купить") {
    const drink = interaction.options.getString("напиток");
    const item = SHOP[drink];
    const u = await getUser(interaction.user.id);
    const t = getTitle(u);

    if (!item) return interaction.reply({ content: "❌ Нет такого", ephemeral: true });

    const price = Math.floor(item.price * (1 - t.shopDiscount));
    if (u.drinks < price)
      return interaction.reply({ content: "❌ Не хватает 🍺", ephemeral: true });

    const gain = Math.floor(Math.random() * (item.max - item.min + 1)) + item.min;
    const newBal = Math.max(0, u.drinks - price + gain);

    await db.collection("users").updateOne(
      { id: u.id },
      { $set: { drinks: newBal } }
    );

    const nu = await getUser(u.id);
    await updateTitle(interaction.member, nu, interaction.channel);

    return interaction.reply(
      `🍻 **${drink}**\nЦена: ${price}\nЭффект: ${gain}\nБаланс: **${newBal} 🍺**`
    );
  }

  /* ТИТУЛ */
  if (name === "титул") {
    const u = await getUser(interaction.user.id);
    const t = getTitle(u);
    return interaction.reply(
      `🏷 **${t.name}**\n🍺 Напито: ${u.drinks}\n🎁 Скидка магазина: ${t.shopDiscount * 100}%`
    );
  }

  /* ТОП */
  if (name === "топ") {
    const users = await db.collection("users")
      .find().sort({ drinks: -1 }).limit(10).toArray();

    let text = "🏆 **Топ бара**\n\n";
    for (let i = 0; i < users.length; i++) {
      const t = getTitle(users[i]);
      text += `${i + 1}. ${t.name} | <@${users[i].id}> — ${users[i].drinks} 🍺\n`;
    }
    return interaction.reply(text);
  }
});

/* ===================== START ===================== */
(async () => {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  db = mongo.db("barbot");
  await client.login(TOKEN);
})();
