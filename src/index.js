const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const OpenAI = require("openai");
const { connectDB, memory } = require("./database");
const { TOKEN, GROQ_API_KEY } = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Groq uses OpenAI-compatible API
const openai = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

client.once("ready", () => {
  console.log("🤖 Admin AI Groq Bot Online");
});

// Slash commands
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const name = interaction.commandName;

  if (name === "reset") {
    await memory().deleteOne({ userId: interaction.user.id });
    return interaction.reply("🧠 Память очищена.");
  }

  if (name === "role") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return interaction.reply({ content: "❌ Нет прав", ephemeral: true });

    const user = interaction.options.getMember("user");
    const role = interaction.options.getRole("role");
    const action = interaction.options.getString("action");

    if (action === "add") {
      await user.roles.add(role);
      return interaction.reply("✅ Роль выдана");
    }

    if (action === "remove") {
      await user.roles.remove(role);
      return interaction.reply("✅ Роль забрана");
    }
  }
});

// AI with Mongo memory
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const userId = message.author.id;

  let convo = await memory().findOne({ userId });

  if (!convo) {
    convo = {
      userId,
      messages: [
        {
          role: "system",
          content: "Ты живой, немного дерзкий Discord-ассистент. Отвечай как человек."
        }
      ]
    };
  }

  const userMessage = message.content.replace(/<@!?\d+>/, "").trim();

  convo.messages.push({ role: "user", content: userMessage });

  if (convo.messages.length > 20) {
    convo.messages.splice(1, 2);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "llama3-70b-8192",
      messages: convo.messages
    });

    const reply = response.choices[0].message.content;

    convo.messages.push({ role: "assistant", content: reply });

    await memory().updateOne(
      { userId },
      { $set: { messages: convo.messages } },
      { upsert: true }
    );

    await message.reply(reply);

  } catch (err) {
    console.error(err);
    message.reply("ИИ временно недоступен.");
  }
});

(async () => {
  await connectDB();
  await client.login(TOKEN);
})();
