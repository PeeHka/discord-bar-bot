const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");
const { MongoClient } = require("mongodb");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ====== ENV ======
const {
  TOKEN,
  MONGO_URI,
  BOT_OWNER_ID,
  LOG_CHANNEL_ID
} = process.env;

// ====== ADMINS (хранятся в Mongo) ======
let admins = new Set([BOT_OWNER_ID]);

// ====== Mongo ======
let db;
async function connectMongo() {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  db = mongo.db("barbot");
  console.log("🍃 MongoDB подключена");

  const adminDocs = await db.collection("admins").find().toArray();
  adminDocs.forEach(a => admins.add(a.userId));
}

// ====== HELPERS ======
const isAdmin = (id) => admins.has(id);

// ====== READY ======
client.once("ready", () => {
  console.log("🍻 Бар-бот запущен");
});

// ====== COMMANDS ======
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // ---------- HELP ----------
  if (commandName === "help") {
    return interaction.reply(
`🍺 **Команды бара**
/баланс — твой баланс
/выпить — бухнуть
/кости — бросить кости
/казино — рискнуть
/топ — топ алкашей
/help — это меню`
    );
  }

  // ---------- ECONOMY ----------
  if (commandName === "баланс") {
    const col = db.collection("users");
    let user = await col.findOne({ id: interaction.user.id });
    if (!user) {
      user = { id: interaction.user.id, drinks: 0 };
      await col.insertOne(user);
    }
    return interaction.reply(`🍺 У тебя **${user.drinks}** напитков`);
  }

  if (commandName === "выпить") {
    const col = db.collection("users");
    await col.updateOne(
      { id: interaction.user.id },
      { $inc: { drinks: 1 } },
      { upsert: true }
    );
    return interaction.reply("🥃 Ты выпил. Хорош!");
  }

  if (commandName === "топ") {
    const users = await db.collection("users")
      .find().sort({ drinks: -1 }).limit(10).toArray();

    let text = "🍻 **Топ алкашей**\n\n";
    users.forEach((u, i) => {
      text += `${i + 1}. <@${u.id}> — ${u.drinks} 🍺\n`;
    });

    return interaction.reply(text);
  }

  if (commandName === "кости") {
    const roll = Math.floor(Math.random() * 6) + 1;
    return interaction.reply(`🎲 Выпало **${roll}**`);
  }

  if (commandName === "казино") {
    const win = Math.random() < 0.45;
    return interaction.reply(
      win ? "🎰 Ты выиграл 🍀" : "💸 Ты проиграл"
    );
  }

  // ---------- ROLE COMMANDS (ADMIN ONLY) ----------
  if (["роль_выдать", "роль_забрать"].includes(commandName)) {
    if (!isAdmin(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Только админы бота.",
        ephemeral: true
      });
    }

    const member = interaction.options.getMember("пользователь");
    const role = interaction.options.getRole("роль");

    if (commandName === "роль_выдать") {
      await member.roles.add(role);
      return interaction.reply({
        content: `✅ Роль **${role.name}** выдана`,
        ephemeral: true
      });
    }

    if (commandName === "роль_забрать") {
      await member.roles.remove(role);
      return interaction.reply({
        content: `❌ Роль **${role.name}** забрана`,
        ephemeral: true
      });
    }
  }

  // ---------- ADMIN MANAGE ----------
  if (commandName === "admin_add") {
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({
        content: "❌ Только овнер бота.",
        ephemeral: true
      });
    }

    const user = interaction.options.getUser("пользователь");
    admins.add(user.id);
    await db.collection("admins").updateOne(
      { userId: user.id },
      { $set: { userId: user.id } },
      { upsert: true }
    );

    return interaction.reply({
      content: `✅ <@${user.id}> добавлен в админы`,
      ephemeral: true
    });
  }

  if (commandName === "admin_delete") {
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({
        content: "❌ Только овнер бота.",
        ephemeral: true
      });
    }

    const user = interaction.options.getUser("пользователь");
    admins.delete(user.id);
    await db.collection("admins").deleteOne({ userId: user.id });

    return interaction.reply({
      content: `🗑 <@${user.id}> удалён из админов`,
      ephemeral: true
    });
  }
});

// ====== START ======
(async () => {
  await connectMongo();
  await client.login(TOKEN);
})();
