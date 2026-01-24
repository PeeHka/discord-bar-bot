const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const { MongoClient } = require("mongodb");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const { TOKEN, MONGO_URI, BOT_OWNER_ID } = process.env;

/* ================= Mongo ================= */
let db;
const admins = new Set([BOT_OWNER_ID]);

/* ================= COOLDOWNS ================= */
const COOLDOWNS = {
  выпить: 30_000,
  казино: 60_000,
  кости: 45_000
};

/* ================= TITLES ================= */
const TITLES = [
  { name: "👶 Новичок", role: "Новичок", need: 0, cdBonus: 0, shopDiscount: 0, color: 0x95a5a6 },
  { name: "🍺 Завсегдатай", role: "Завсегдатай", need: 50, cdBonus: 5_000, shopDiscount: 0.05, color: 0x2ecc71 },
  { name: "🥃 Алкаш", role: "Алкаш", need: 200, cdBonus: 10_000, shopDiscount: 0.10, color: 0x3498db },
  { name: "☠ Легенда бара", role: "Легенда бара", need: 600, cdBonus: 20_000, shopDiscount: 0.20, color: 0x9b59b6 },
  { name: "👑 Король бара", role: "Король бара", need: 1500, cdBonus: Infinity, shopDiscount: 0.30, color: 0xf1c40f }
];

/* ================= SHOP ================= */
const SHOP = {
  пиво: { price: 0, min: 1, max: 1, unlock: 0 },
  виски: { price: 120, min: 5, max: 5, unlock: 80 },
  водка: { price: 300, min: 12, max: 12, unlock: 250 },
  самогон: { price: 700, min: -20, max: 40, unlock: 600 },
  абсент: { price: 1500, min: 30, max: 80, unlock: 1200 }
};

/* ================= HELPERS ================= */
const isOwner = (id) => id === BOT_OWNER_ID;
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

/* ================= ROLES ================= */
async function ensureTitleRoles(guild) {
  if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;

  for (const t of TITLES) {
    let role = guild.roles.cache.find(r => r.name === t.role);
    if (!role) {
      await guild.roles.create({
        name: t.role,
        color: t.color,
        reason: "Титул бара"
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

/* ================= COOLDOWN ================= */
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

/* ================= READY ================= */
client.once("ready", async () => {
  console.log("🍃 MongoDB подключена");
  console.log("🍻 Бар-бот запущен");

  // загрузка админов
  const list = await db.collection("admins").find().toArray();
  list.forEach(a => admins.add(a.id));

  for (const g of client.guilds.cache.values()) {
    await ensureTitleRoles(g);
  }
});

/* ================= COMMANDS ================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const name = interaction.commandName;

  /* ===== ADMIN MANAGEMENT (OWNER ONLY) ===== */
  if (["admin_add", "admin_delete"].includes(name)) {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ content: "❌ Только овнер.", ephemeral: true });
    }

    const user = interaction.options.getUser("пользователь");

    if (name === "admin_add") {
      admins.add(user.id);
      await db.collection("admins").updateOne(
        { id: user.id },
        { $set: { id: user.id } },
        { upsert: true }
      );
      return interaction.reply({ content: `✅ ${user.tag} теперь админ`, ephemeral: true });
    }

    if (name === "admin_delete") {
      admins.delete(user.id);
      await db.collection("admins").deleteOne({ id: user.id });
      return interaction.reply({ content: `🗑 ${user.tag} удалён из админов`, ephemeral: true });
    }
  }

  /* ===== MONEY (OWNER ONLY) ===== */
  if (["money_give", "money_take", "money_reset"].includes(name)) {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ content: "❌ Только овнер.", ephemeral: true });
    }

    const user = interaction.options.getUser("пользователь");
    const amount = interaction.options.getInteger("количество") || 0;
    const target = await getUser(user.id);

    if (name === "money_give") {
      await db.collection("users").updateOne(
        { id: user.id },
        { $inc: { drinks: amount } }
      );
      return interaction.reply({ content: `➕ ${amount} 🍺 выдано`, ephemeral: true });
    }

    if (name === "money_take") {
      const newBal = Math.max(0, target.drinks - amount);
      await db.collection("users").updateOne(
        { id: user.id },
        { $set: { drinks: newBal } }
      );
      return interaction.reply({ content: `➖ ${amount} 🍺 забрано`, ephemeral: true });
    }

    if (name === "money_reset") {
      await db.collection("users").updateOne(
        { id: user.id },
        { $set: { drinks: 0 } }
      );
      return interaction.reply({ content: "♻ Баланс сброшен", ephemeral: true });
    }
  }

  /* ===== BASIC COMMANDS ===== */
  if (name === "help") {
    return interaction.reply(
`🍺 Команды:
/баланс /выпить /казино /кости
/магазин /купить /титул /топ`
    );
  }

  if (name === "баланс") {
    const u = await getUser(interaction.user.id);
    return interaction.reply(`💰 ${u.drinks} 🍺`);
  }

  if (name === "выпить") {
    const u = await getUser(interaction.user.id);
    if (!(await checkCooldown(u, "выпить", interaction))) return;

    await db.collection("users").updateOne(
      { id: u.id },
      { $inc: { drinks: 1 } }
    );

    const nu = await getUser(u.id);
    await updateTitle(interaction.member, nu, interaction.channel);
    return interaction.reply("🥃 +1 🍺");
  }

  if (name === "казино") {
    const u = await getUser(interaction.user.id);
    if (!(await checkCooldown(u, "казино", interaction))) return;

    const win = Math.random() < 0.45;
    const amount = Math.floor(Math.random() * 6) + 2;
    const delta = win ? amount : -Math.min(amount, u.drinks);

    await db.collection("users").updateOne(
      { id: u.id },
      { $inc: { drinks: delta } }
    );

    const nu = await getUser(u.id);
    await updateTitle(interaction.member, nu, interaction.channel);

    return interaction.reply(win ? `🎰 WIN +${amount}` : `💸 LOSE ${-delta}`);
  }

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

    return interaction.reply(`🎲 Ты ${you} | Бармен ${bot} → ${delta} 🍺`);
  }

  if (name === "магазин") {
    const u = await getUser(interaction.user.id);
    const t = getTitle(u);

    let text = "🛒 Магазин\n\n";
    for (const [k, v] of Object.entries(SHOP)) {
      if (u.drinks < v.unlock) continue;
      const price = Math.floor(v.price * (1 - t.shopDiscount));
      text += `${k} — ${price} 🍺\n`;
    }
    return interaction.reply(text);
  }

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
      `🍻 ${drink}\nЦена: ${price}\nЭффект: ${gain}\nБаланс: ${newBal}`
    );
  }

  if (name === "титул") {
    const u = await getUser(interaction.user.id);
    const t = getTitle(u);
    return interaction.reply(
      `🏷 ${t.name}\n🍺 ${u.drinks}\n🎁 Скидка ${t.shopDiscount * 100}%`
    );
  }

  if (name === "топ") {
    const users = await db.collection("users")
      .find().sort({ drinks: -1 }).limit(10).toArray();

    let text = "🏆 Топ\n\n";
    for (let i = 0; i < users.length; i++) {
      const t = getTitle(users[i]);
      text += `${i + 1}. ${t.name} | <@${users[i].id}> — ${users[i].drinks} 🍺\n`;
    }
    return interaction.reply(text);
  }
});

/* ================= START ================= */
(async () => {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  db = mongo.db("barbot");
  await client.login(TOKEN);
})();
