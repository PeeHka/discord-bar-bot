const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const { MongoClient } = require("mongodb");

// ===== ENV =====
const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  BOT_OWNER_ID,
  MONGO_URI
} = process.env;

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ===== MONGO =====
const mongo = new MongoClient(MONGO_URI);
let db;

// ===== DB HELPERS =====
async function getUser(id) {
  const col = db.collection("users");
  let u = await col.findOne({ id });
  if (!u) {
    u = { id, balance: 0 };
    await col.insertOne(u);
  }
  return u;
}

async function isBotAdmin(id) {
  if (id === BOT_OWNER_ID) return true;
  const a = await db.collection("admins").findOne({ id });
  return !!a;
}

async function addAdmin(id) {
  await db.collection("admins").updateOne(
    { id },
    { $set: { id } },
    { upsert: true }
  );
}

async function removeAdmin(id) {
  await db.collection("admins").deleteOne({ id });
}

// ===== READY =====
client.once("ready", async () => {
  await mongo.connect();
  db = mongo.db("barbot");
  console.log("🍃 MongoDB подключена");
  console.log("🍻 Бар-бот запущен");
});

// ===== INTERACTIONS =====
client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand()) return;
  await i.deferReply({ ephemeral: true });

  const name = i.commandName;

  try {
    // ===== HELP =====
    if (name === "help") {
      return i.editReply(
        `📖 **Команды бота**

💰 /баланс  
🍺 /выпить  
🎰 /казино  
🎲 /кости  
🏆 /топ  

😄 /шутка  
🎱 /шар  
🍺 /напиться  

Админка скрыта 😎`
      );
    }

    // ===== ECONOMY =====
    if (name === "баланс") {
      const u = await getUser(i.user.id);
      return i.editReply(`💰 Баланс: **${u.balance} 🍺**`);
    }

    if (name === "выпить") {
      const drinks = {
        пиво: [1, 3],
        виски: [2, 5],
        водка: [3, 6],
        самогон: [-3, 8]
      };
      const d = i.options.getString("напиток") || "пиво";
      if (!drinks[d]) return i.editReply("❌ Такого напитка нет.");

      const [min, max] = drinks[d];
      const gain = Math.floor(Math.random() * (max - min + 1)) + min;

      const u = await getUser(i.user.id);
      u.balance = Math.max(0, u.balance + gain);

      await db.collection("users").updateOne(
        { id: u.id },
        { $set: { balance: u.balance } }
      );

      return i.editReply(`🍺 ${d} → **${gain} 🍺**`);
    }

    if (name === "казино") {
      const bet = i.options.getInteger("ставка");
      const u = await getUser(i.user.id);
      if (bet <= 0 || bet > u.balance)
        return i.editReply("❌ Ставка некорректна.");

      const win = Math.random() < 0.5;
      u.balance += win ? bet : -bet;

      await db.collection("users").updateOne(
        { id: u.id },
        { $set: { balance: u.balance } }
      );

      return i.editReply(win ? `🎰 WIN +${bet}` : `💀 LOSE -${bet}`);
    }

    if (name === "кости") {
      const bet = i.options.getInteger("ставка");
      const u = await getUser(i.user.id);
      if (bet <= 0 || bet > u.balance)
        return i.editReply("❌ Ставка некорректна.");

      const you = Math.ceil(Math.random() * 6);
      const bot = Math.ceil(Math.random() * 6);
      let res = 0;
      if (you > bot) res = bet;
      else if (you < bot) res = -bet;

      u.balance += res;
      await db.collection("users").updateOne(
        { id: u.id },
        { $set: { balance: u.balance } }
      );

      return i.editReply(`🎲 Ты: ${you} | Бот: ${bot} → **${res} 🍺**`);
    }

    if (name === "топ") {
      const top = await db.collection("users")
        .find().sort({ balance: -1 }).limit(5).toArray();

      if (!top.length) return i.editReply("Пусто.");

      return i.editReply(
        top.map((u, i) =>
          `**${i + 1}.** <@${u.id}> — ${u.balance} 🍺`
        ).join("\n")
      );
    }

    // ===== FUN =====
    if (name === "шутка") {
      const jokes = [
        "Бармен не судит. Бармен наливает.",
        "Пей ответственно. Но это не точно.",
        "Алкоголь — враг. Но врагов надо знать в лицо."
      ];
      return i.editReply(jokes[Math.floor(Math.random() * jokes.length)]);
    }

    if (name === "шар") {
      const answers = [
        "Да",
        "Нет",
        "Спроси позже",
        "Определённо",
        "Лучше не надо"
      ];
      return i.editReply(`🎱 ${answers[Math.floor(Math.random() * answers.length)]}`);
    }

    if (name === "напиться") {
      return i.editReply("🥴 Ты уже напился. Иди домой.");
    }

    // ===== ADMIN ADD / DELETE (ONLY OWNER) =====
    if (name === "admin_add") {
      if (i.user.id !== BOT_OWNER_ID)
        return i.editReply("❌ Только овнер.");

      const user = i.options.getUser("пользователь");
      await addAdmin(user.id);
      return i.editReply(`✅ ${user.tag} теперь админ бота`);
    }

    if (name === "admin_delete") {
      if (i.user.id !== BOT_OWNER_ID)
        return i.editReply("❌ Только овнер.");

      const user = i.options.getUser("пользователь");
      await removeAdmin(user.id);
      return i.editReply(`🗑️ ${user.tag} удалён из админов`);
    }

    // ===== ROLE / PERMS (ADMINS) =====
    if (
      ["роль_выдать", "роль_забрать", "права_дать", "права_забрать"].includes(name)
      && !(await isBotAdmin(i.user.id))
    ) {
      return i.editReply("❌ Нет доступа.");
    }

    if (name === "роль_выдать") {
      const m = i.options.getMember("пользователь");
      const r = i.options.getRole("роль");
      await m.roles.add(r);
      return i.editReply("✅ Роль выдана");
    }

    if (name === "роль_забрать") {
      const m = i.options.getMember("пользователь");
      const r = i.options.getRole("роль");
      await m.roles.remove(r);
      return i.editReply("✅ Роль забрана");
    }

    if (name === "права_дать" || name === "права_забрать") {
      const role = i.options.getRole("роль");
      const perm = i.options.getString("право");
      if (!PermissionFlagsBits[perm])
        return i.editReply("❌ Нет такого права.");

      const newPerms =
        name === "права_дать"
          ? role.permissions.add(PermissionFlagsBits[perm])
          : role.permissions.remove(PermissionFlagsBits[perm]);

      await role.setPermissions(newPerms);
      return i.editReply("✅ Права обновлены");
    }

  } catch (e) {
    console.error(e);
    return i.editReply("❌ Ошибка.");
  }
});

client.login(TOKEN);
