const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = "!";
const FILE = "./economy.json";

// ===== ДАННЫЕ =====
let data = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE))
  : {};

function save() {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getUser(id) {
  if (!data[id]) data[id] = { balance: 0, earned: [] };
  return data[id];
}

// ===== АНТИНАКРУТКА =====
function canEarn(id, amount) {
  const u = getUser(id);
  const now = Date.now();

  u.earned = u.earned.filter(e => now - e.time < 10 * 60 * 1000);
  const total = u.earned.reduce((s, e) => s + e.amount, 0);

  if (total + amount > 50) return false;

  u.earned.push({ amount, time: now });
  return true;
}

// ===== ЛОГИ =====
function log(guild, title, text, color = 0xf1c40f) {
  const ch = guild.channels.cache.find(c => c.name === "bar-logs");
  if (!ch) return;

  ch.send({
    embeds: [new EmbedBuilder()
      .setTitle(title)
      .setDescription(text)
      .setColor(color)
      .setTimestamp()
    ]
  });
}

// ===== НАПИТКИ =====
const drinks = {
  пиво: [1, 3],
  водка: [3, 6],
  виски: [2, 5],
  ром: [2, 4],
  самогон: [0, 8]
};

client.once("ready", () => {
  console.log("🍻 Бармен (prefix) запущен");
  client.user.setActivity("наливает 🍺");
});

// ===== COMMANDS =====
client.on("messageCreate", async (m) => {
  if (m.author.bot || !m.content.startsWith(prefix)) return;

  const args = m.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const u = getUser(m.author.id);

  // 🍹 ВЫПИТЬ
  if (cmd === "выпить") {
    const name = args[0] || Object.keys(drinks)[Math.floor(Math.random() * 5)];
    if (!drinks[name]) return m.reply("Такого пойла нет 🍺");

    const [min, max] = drinks[name];
    const gain = Math.floor(Math.random() * (max - min + 1)) + min;

    if (gain > 0 && !canEarn(m.author.id, gain)) {
      log(m.guild, "🛑 Антинакрутка",
        `👤 ${m.author.tag}\nПопытка +${gain} 🍺`, 0xe74c3c);
      return m.reply("🛑 Хватит фармить.");
    }

    u.balance = Math.max(0, u.balance + gain);
    save();

    m.reply(`🍹 ${name} → **${gain} 🍺**`);
    log(m.guild, "🍹 Выпивка", `👤 ${m.author.tag}\n${name} | ${gain}`);
  }

  // 💰 БАЛАНС
  if (cmd === "баланс") {
    return m.reply(`💰 У тебя **${u.balance} 🍺**`);
  }

  // 🎡 РУЛЕТКА
  if (cmd === "рулетка") {
    const bet = parseInt(args[0]);
    if (!bet || bet <= 0 || bet > u.balance)
      return m.reply("Ставка хуйня.");

    const win = Math.random() < 0.5;
    u.balance += win ? bet : -bet;
    save();

    m.reply(win ? `🎡 +${bet} 🍺` : `💀 -${bet} 🍺`);
    log(m.guild, "🎡 Рулетка",
      `👤 ${m.author.tag}\nСтавка ${bet}\n${win ? "WIN" : "LOSE"}`,
      win ? 0x2ecc71 : 0xe74c3c
    );
  }

  // 🎰 СЛОТЫ
  if (cmd === "слоты") {
    const bet = parseInt(args[0]);
    if (!bet || bet <= 0 || bet > u.balance)
      return m.reply("Ставка мимо.");

    const symbols = ["🍒", "🍋", "🍺"];
    const roll = symbols.map(() => symbols[Math.floor(Math.random() * 3)]);

    let result = -bet;
    if (roll[0] === roll[1] && roll[1] === roll[2]) result = bet * 5;
    else if (roll[0] === roll[1] || roll[1] === roll[2]) result = bet * 2;

    u.balance = Math.max(0, u.balance + result);
    save();

    m.reply(`🎰 ${roll.join(" | ")} → **${result} 🍺**`);
  }

  // 🎲 КОСТИ
  if (cmd === "кости") {
    const bet = parseInt(args[0]);
    if (!bet || bet <= 0 || bet > u.balance)
      return m.reply("Ставка говно.");

    const you = Math.floor(Math.random() * 6) + 1;
    const bot = Math.floor(Math.random() * 6) + 1;

    let result = 0;
    if (you > bot) result = bet;
    else if (you < bot) result = -bet;

    u.balance = Math.max(0, u.balance + result);
    save();

    m.reply(`🎲 Ты ${you} | Бармен ${bot} → **${result} 🍺**`);
  }

  // 🏆 ТОП
  if (cmd === "топ") {
    const top = Object.entries(data)
      .sort((a, b) => b[1].balance - a[1].balance)
      .slice(0, 5);

    let text = "";
    for (let i = 0; i < top.length; i++) {
      const usr = await client.users.fetch(top[i][0]);
      text += `**${i + 1}.** ${usr.username} — ${top[i][1].balance} 🍺\n`;
    }

    m.channel.send({
      embeds: [new EmbedBuilder()
        .setTitle("🏆 Топ алкашей")
        .setDescription(text)
        .setColor(0xf1c40f)]
    });
  }
});

client.login(process.env.TOKEN);
