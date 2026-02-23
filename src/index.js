const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const OpenAI = require("openai");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const { connectDB, memory } = require("./database");
const { TOKEN, GROQ_API_KEY, HF_API_KEY } = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openai = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

client.once("ready", () => {
  console.log("🤖 Ultimate AI Bot Online");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "reset") {
    await memory().deleteOne({ userId: interaction.user.id });
    return interaction.reply("🧠 Память очищена.");
  }

  if (interaction.commandName === "role") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return interaction.reply({ content: "❌ Нет прав", ephemeral: true });

    const user = interaction.options.getMember("user");
    const role = interaction.options.getRole("role");
    const action = interaction.options.getString("action");

    if (action === "add") await user.roles.add(role);
    if (action === "remove") await user.roles.remove(role);

    return interaction.reply("✅ Готово.");
  }

  if (interaction.commandName === "image") {

    const prompt = interaction.options.getString("prompt");

    await interaction.deferReply();

    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );

    const buffer = await response.arrayBuffer();

    await interaction.editReply({
      files: [{ attachment: Buffer.from(buffer), name: "image.png" }]
    });
  }
});

client.on("messageCreate", async message => {

  if (message.author.bot) return;

  const isChannel = message.channel.name === "ai-chat";
  const isPrefix = message.content.startsWith("!ai ");
  const isMention = message.mentions.has(client.user);

  if (!isChannel && !isPrefix && !isMention) return;

  const userId = message.author.id;

  let convo = await memory().findOne({ userId });

  if (!convo) {
    convo = {
      userId,
      messages: [
        { role: "system", content: "Ты живой, дерзкий Discord ассистент." }
      ]
    };
  }

  let userMessage = message.content;

  if (isPrefix) userMessage = message.content.slice(4);
  if (isMention) userMessage = userMessage.replace(/<@!?\d+>/, "").trim();

  convo.messages.push({ role: "user", content: userMessage });

  if (convo.messages.length > 20) convo.messages.splice(1, 2);

  try {

    const response = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: convo.messages
    });

    const reply = response.choices[0].message.content;

    convo.messages.push({ role: "assistant", content: reply });

    await memory().updateOne(
      { userId },
      { $set: { messages: convo.messages } },
      { upsert: true }
    );

    message.reply(reply);

  } catch (err) {
    console.error(err);
    message.reply("ИИ временно недоступен.");
  }

});

(async () => {
  await connectDB();
  await client.login(TOKEN);
})();
