const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");
const { MongoClient } = require("mongodb");

// ===== ENV =====
const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;
const PREFIX = "!";

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ===== MONGO =====
const mongo = new MongoClient(MONGO_URI);
let users;

async function initMongo() {
  await mongo.connect();
  const db = mongo.db("barbot");
  users = db.collection("users");
  console.log("🍃 MongoDB подключена");
}

async function getUser(id) {
  let user = await users.findOne({ id });
  if (!user) {
    user = { id, balance: 0, earned: [] };
    await users.insertOne(user);
  }
  return user;
}

// ===== АНТИНАКРУТКА =====
async function canEarn(id, amount) {
  const user = await getUser(id);
  const now = Date.now();

  const earned = user.earned
    .filter(e => now - e.time < 10 * 60 * 1000)
    .slice(-20);

  const total = earned.reduce((s, e) => s + e.amount, 0);
  if (total + amount > 50) return false;

  earned.push({ amount, time: now });

  await users.updateOne(
    { id },
    { $set: { earned } }
  );

  return true;
}

// ===== LOGS =====
function log(guild, title, text, color = 0xf1c40f) {
  if (!LOG_CHANNEL_ID) return;
  const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!ch) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(text)
        .setColor(color)
        .setTimestamp()
    ]
  });
}

// ===== COOLDOWN =====
const cooldown = new Set();
function onCooldown(id) {
  if (cooldown.has(id)) return true;
  cooldown.add(id);
  setTimeout(() => cooldown.delete(id), 3000);
  return false;
}

// ===== BOT OWNER CHECK =====
function isBotOwner(m) {
  return m.author.id === BOT_OWNER_ID;
}

// ===== DRINKS =====
const drinks = {
  пиво: [1, 3],
  водка: [3, 6],
  виски: [2, 5],
  ром: [2, 4],
  самогон: [-3, 8]
};

// ===== READY =====
client.once("ready", () => {
  console.log("🍻 Бар-бот запущен");
  client.user.setActivity("наливает 🍺");
});

// ===== COMMANDS =====
client.on("messageCreate", async (m) => {
  if (m.author.bot || !m.content.startsWith(PREFIX)) return;
  if (onCooldown(m.author.id)) return;

  const args = m.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // 🍹 ВЫПИТЬ
  if (cmd === "выпить") {
    const name = args[0] || Object.keys(drinks)[Math.floor(Math.random() * Object.keys(drinks).length)];
    if (!drinks[name]) return m.reply("Такого пойла нет 🍺");

    const [min, max] = drinks[name];
    const gain = Math.floor(Math.random() * (max - min + 1)) + min;

    if (gain > 0 && !(await canEarn(m.author.id, gain))) {
      log(m.guild, "🛑 Антинакрутка", `👤 ${m.author.tag}\nПопытка +${gain} 🍺`, 0xe74c3c);
      return m.reply("🛑 Притормози.");
    }

    await users.updateOne(
      { id: m.author.id },
      { $inc: { balance: gain } },
      { upsert: true }
    );

    const user = await getUser(m.author.id);
    if (user.balance < 0)
      await users.updateOne({ id: m.author.id }, { $set: { balance: 0 } });

    m.reply(`🍹 ${name} → **${gain} 🍺**`);
  }

  // 💰 БАЛАНС
  if (cmd === "баланс") {
    const user = await getUser(m.author.id);
    return m.reply(`💰 У тебя **${user.balance} 🍺**`);
  }

  // 🎡 РУЛЕТКА
  if (cmd === "рулетка") {
    const bet = parseInt(args[0]);
    const user = await getUser(m.author.id);

    if (!bet || bet <= 0 || bet > user.balance)
      return m.reply("Ставка говно.");

    const win = Math.random() < 0.5;
    await users.updateOne(
      { id: m.author.id },
      { $inc: { balance: win ? bet : -bet } }
    );

    m.reply(win ? `🎡 WIN → +${bet} 🍺` : `💀 LOSE → -${bet} 🍺`);
  }

  // 🎲 КОСТИ
  if (cmd === "кости") {
    const bet = parseInt(args[0]);
    const user = await getUser(m.author.id);

    if (!bet || bet <= 0 || bet > user.balance)
      return m.reply("Ставка хуйня.");

    const you = Math.floor(Math.random() * 6) + 1;
    const bot = Math.floor(Math.random() * 6) + 1;

    let diff = 0;
    if (you > bot) diff = bet;
    else if (you < bot) diff = -bet;

    await users.updateOne(
      { id: m.author.id },
      { $inc: { balance: diff } }
    );

    m.reply(`🎲 Ты ${you} | Бармен ${bot} → **${diff} 🍺**`);
  }

  // 🏆 ТОП
  if (cmd === "топ") {
    const top = await users.find().sort({ balance: -1 }).limit(5).toArray();
    let text = "";

    for (let i = 0; i < top.length; i++) {
      let name = "Удалённый";
      try {
        const usr = await client.users.fetch(top[i].id);
        name = usr.username;
      } catch {}
      text += `**${i + 1}.** ${name} — ${top[i].balance} 🍺\n`;
    }

    m.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 Топ алкашей")
          .setDescription(text || "Пусто")
          .setColor(0xf1c40f)
      ]
    });
  }

  // 🎭 РОЛИ (ТОЛЬКО СОЗДАТЕЛЬ БОТА)
  if (cmd === "права") {
  if (!isBotOwner(m.author.id))
    return m.reply("❌ Только создатель бота.");

  const action = args[0]; // дать / забрать
  const role = m.mentions.roles.first();

  // ищем право — ВСЕГДА капсом
  const perm = args.find(a => a === a.toUpperCase());

  if (!action || !role || !perm)
    return m.reply("Используй: `!права дать|забрать @роль PERMISSION`");

  if (!PermissionsBitField.Flags[perm])
    return m.reply(`❌ Такого права не существует: ${perm}`);

  const perms = new PermissionsBitField(role.permissions);

  if (action === "дать") {
    perms.add(PermissionsBitField.Flags[perm]);
  } else if (action === "забрать") {
    perms.remove(PermissionsBitField.Flags[perm]);
  } else {
    return m.reply("❌ Действие: дать / забрать");
  }

  await role.setPermissions(perms);
  return m.reply(`✅ Право **${perm}** ${action} роли **${role.name}**`);
  }

  // 🛡️ ПРАВА РОЛЕЙ (ТОЛЬКО СОЗДАТЕЛЬ БОТА)
  if (cmd === "права") {
    if (!isBotOwner(m)) return m.reply("❌ Только создатель бота.");

    const action = args[0];
    const role = m.mentions.roles.first();
    const perm = args[2];

    if (!action || !role || !perm)
      return m.reply("Используй: `!права дать|забрать @role PERMISSION`");

    if (!PermissionsBitField.Flags[perm])
      return m.reply("❌ Такого права не существует.");

    const perms = new PermissionsBitField(role.permissions);

    if (action === "дать") perms.add(PermissionsBitField.Flags[perm]);
    else if (action === "забрать") perms.remove(PermissionsBitField.Flags[perm]);
    else return m.reply("❌ Действие: дать / забрать");

    await role.setPermissions(perms);
    return m.reply(`✅ Право **${perm}** ${action} роли **${role.name}**`);
  }
});

// ===== START =====
(async () => {
  await initMongo();
  await client.login(TOKEN);
})();
