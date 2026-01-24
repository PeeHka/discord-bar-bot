const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");
const { MongoClient } = require("mongodb");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ===== ENV =====
const {
  TOKEN,
  MONGO_URI,
  BOT_OWNER_ID
} = process.env;

// ===== Mongo =====
let db;
const admins = new Set([BOT_OWNER_ID]);

async function connectMongo() {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  db = mongo.db("barbot");
  console.log("🍃 MongoDB подключена");

  const savedAdmins = await db.collection("admins").find().toArray();
  savedAdmins.forEach(a => admins.add(a.userId));
}

// ===== Helpers =====
function isAdmin(id) {
  return admins.has(id);
}

async function getUser(id) {
  const col = db.collection("users");
  let user = await col.findOne({ id });
  if (!user) {
    user = { id, drinks: 0 };
    await col.insertOne(user);
  }
  if (typeof user.drinks !== "number") {
    user.drinks = 0;
    await col.updateOne({ id }, { $set: { drinks: 0 } });
  }
  return user;
}

// ===== Ready =====
client.once("ready", () => {
  console.log("🍻 Бар-бот запущен");
});

// ===== Commands =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const name = interaction.commandName;

  // ===== HELP =====
  if (name === "help") {
    return interaction.reply(
`🍺 **Команды бара**
/баланс — твой баланс
/выпить — выпить напиток
/казино — сыграть в казино
/кости — бросить кости
/топ — топ алкашей`
    );
  }

  // ===== BALANCE =====
  if (name === "баланс") {
    const user = await getUser(interaction.user.id);
    return interaction.reply(`💰 У тебя **${user.drinks} 🍺**`);
  }

  // ===== DRINK =====
  if (name === "выпить") {
    const col = db.collection("users");
    await col.updateOne(
      { id: interaction.user.id },
      { $inc: { drinks: 1 } },
      { upsert: true }
    );
    return interaction.reply("🥃 Ты выпил и получил **+1 🍺**");
  }

  // ===== CASINO =====
  if (name === "казино") {
    const user = await getUser(interaction.user.id);
    const win = Math.random() < 0.45;
    const amount = Math.floor(Math.random() * 5) + 1;

    const col = db.collection("users");

    if (win) {
      await col.updateOne(
        { id: interaction.user.id },
        { $inc: { drinks: amount } }
      );
      return interaction.reply(`🎰 Ты **выиграл +${amount} 🍺**`);
    } else {
      const loss = Math.min(amount, user.drinks);
      await col.updateOne(
        { id: interaction.user.id },
        { $inc: { drinks: -loss } }
      );
      return interaction.reply(`💸 Ты **проиграл -${loss} 🍺**`);
    }
  }

  // ===== DICE =====
  if (name === "кости") {
    const you = Math.floor(Math.random() * 6) + 1;
    const bot = Math.floor(Math.random() * 6) + 1;

    let result = 0;
    if (you > bot) result = 1;
    if (you < bot) result = -1;

    await db.collection("users").updateOne(
      { id: interaction.user.id },
      { $inc: { drinks: result } },
      { upsert: true }
    );

    return interaction.reply(
      `🎲 Ты: **${you}** | Бармен: **${bot}**\nРезультат: **${result >= 0 ? "+" : ""}${result} 🍺**`
    );
  }

  // ===== TOP =====
  if (name === "топ") {
    const users = await db.collection("users")
      .find().sort({ drinks: -1 }).limit(10).toArray();

    let text = "🏆 **Топ алкашей**\n\n";
    users.forEach((u, i) => {
      const drinks = typeof u.drinks === "number" ? u.drinks : 0;
      text += `${i + 1}. <@${u.id}> — ${drinks} 🍺\n`;
    });

    return interaction.reply(text);
  }

  // ===== ROLE COMMANDS =====
  if (["роль_выдать", "роль_забрать"].includes(name)) {
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Нет прав.",
        ephemeral: true
      });
    }

    const member = interaction.options.getMember("пользователь");
    const role = interaction.options.getRole("роль");

    if (name === "роль_выдать") {
      await member.roles.add(role);
      return interaction.reply({
        content: `✅ Роль **${role.name}** выдана`,
        ephemeral: true
      });
    }

    if (name === "роль_забрать") {
      await member.roles.remove(role);
      return interaction.reply({
        content: `❌ Роль **${role.name}** забрана`,
        ephemeral: true
      });
    }
  }

  // ===== ADMIN ADD / DELETE =====
  if (name === "admin_add") {
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({ content: "❌ Только овнер.", ephemeral: true });
    }

    const user = interaction.options.getUser("пользователь");
    admins.add(user.id);
    await db.collection("admins").updateOne(
      { userId: user.id },
      { $set: { userId: user.id } },
      { upsert: true }
    );

    return interaction.reply({ content: "✅ Админ добавлен", ephemeral: true });
  }

  if (name === "admin_delete") {
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({ content: "❌ Только овнер.", ephemeral: true });
    }

    const user = interaction.options.getUser("пользователь");
    admins.delete(user.id);
    await db.collection("admins").deleteOne({ userId: user.id });

    return interaction.reply({ content: "🗑 Админ удалён", ephemeral: true });
  }
});

// ===== START =====
(async () => {
  await connectMongo();
  await client.login(TOKEN);
})();
