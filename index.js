import {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import { MongoClient } from "mongodb";
import "dotenv/config";

/* ===================== CLIENT ===================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

/* ===================== MONGO ===================== */
const mongo = new MongoClient(process.env.MONGO_URI);
await mongo.connect();
const db = mongo.db("bar_bot");

const usersCol = db.collection("users");
const configCol = db.collection("config");

console.log("🍃 MongoDB подключена");

/* ===================== CONST ===================== */
const OWNER_ID = process.env.BOT_OWNER_ID;

/* титулы */
const TITLES = [
  { name: "Новичок", need: 0, color: "#95a5a6", bonus: 1, cdMul: 1 },
  { name: "Завсегдатай", need: 20, color: "#3498db", bonus: 1.1, cdMul: 0.9 },
  { name: "Алкаш", need: 50, color: "#9b59b6", bonus: 1.2, cdMul: 0.8 },
  { name: "Бармен", need: 100, color: "#e67e22", bonus: 1.3, cdMul: 0.7 },
  { name: "Легенда", need: 200, color: "#e74c3c", bonus: 1.5, cdMul: 0.5 }
];

/* напитки */
const DRINKS = {
  beer: { name: "Пиво", price: 10, add: 1 },
  whiskey: { name: "Виски", price: 40, add: 2 },
  vodka: { name: "Водка", price: 70, add: 3 }
};

/* кулдауны (сек) */
const BASE_COOLDOWNS = {
  drink: 60,
  casino: 90,
  dice: 60
};

/* ===================== HELPERS ===================== */
async function getUser(id) {
  let u = await usersCol.findOne({ id });
  if (!u) {
    u = {
      id,
      money: 20,
      drinks: 0,
      inventory: { beer: 1 },
      title: "Новичок",
      cooldowns: {}
    };
    await usersCol.insertOne(u);
  }
  return u;
}

function getTitle(drinks) {
  return [...TITLES].reverse().find(t => drinks >= t.need);
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function checkCooldown(user, key, mul = 1) {
  const last = user.cooldowns?.[key] || 0;
  return now() - last >= BASE_COOLDOWNS[key] * mul;
}

async function setCooldown(userId, key) {
  await usersCol.updateOne(
    { id: userId },
    { $set: { [`cooldowns.${key}`]: now() } }
  );
}

/* ===================== READY ===================== */
client.once(Events.ClientReady, () => {
  console.log(`🍻 Бар-бот запущен как ${client.user.tag}`);
});

/* ===================== INTERACTIONS ===================== */
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand() && !i.isButton()) return;

  /* ========== SLASH COMMANDS ========== */
  if (i.isChatInputCommand()) {
    const u = await getUser(i.user.id);
    const title = getTitle(u.drinks);

    /* ---------- БАЛАНС ---------- */
    if (i.commandName === "баланс") {
      return i.reply(
        `🍺 Выпито: **${u.drinks}**\n💰 Деньги: **${u.money}**\n🏷️ Титул: **${u.title}**`
      );
    }

    /* ---------- ТОП ---------- */
    if (i.commandName === "топ") {
      const list = await usersCol.find().sort({ drinks: -1 }).limit(10).toArray();
      let text = "🏆 **Топ алкашей**\n\n";
      list.forEach((x, idx) => {
        text += `${idx + 1}. <@${x.id}> — ${x.drinks} 🍺 (${x.title})\n`;
      });
      return i.reply(text);
    }

    /* ---------- МАГАЗИН ---------- */
    if (i.commandName === "магазин") {
      let text = "🛒 **Бар-магазин**\n\n";
      for (const k in DRINKS) {
        const d = DRINKS[k];
        text += `🍾 **${d.name}** — ${d.price}💰 (+${d.add})\n`;
      }
      return i.reply(text);
    }

    /* ---------- КУПИТЬ ---------- */
    if (i.commandName === "купить") {
      const item = i.options.getString("товар");
      if (!DRINKS[item]) return i.reply("❌ Нет такого напитка");

      if (u.money < DRINKS[item].price)
        return i.reply("💸 Не хватает денег");

      await usersCol.updateOne(
        { id: u.id },
        {
          $inc: { money: -DRINKS[item].price },
          $inc: { [`inventory.${item}`]: 1 }
        }
      );
      return i.reply(`🛒 Куплено: **${DRINKS[item].name}**`);
    }

    /* ---------- ВЫПИТЬ ---------- */
    if (i.commandName === "выпить") {
      const item = i.options.getString("напиток");
      if (!u.inventory?.[item])
        return i.reply("❌ У тебя нет этого напитка");

      const cdMul = title.cdMul;
      if (!checkCooldown(u, "drink", cdMul))
        return i.reply("⏳ Ты уже бухал, подожди");

      let add = DRINKS[item].add;
      let msg = `🍻 Ты выпил **${DRINKS[item].name}** (+${add})`;

      if (Math.random() < 0.15) {
        add += 1;
        msg += "\n🎰 **БОНУС!** +1 🍺";
      }
      if (Math.random() < 0.05) msg += "\n🤢 Тебе хуёво…";
      if (Math.random() < 0.02) msg += "\n💀 Ты отрубился";

      const newDrinks = u.drinks + add;
      const newTitle = getTitle(newDrinks);

      await usersCol.updateOne(
        { id: u.id },
        {
          $inc: { drinks: add, [`inventory.${item}`]: -1 },
          $set: { title: newTitle.name }
        }
      );

      await setCooldown(u.id, "drink");

      if (newTitle.name !== u.title) {
        msg += `\n🏆 **Новый титул:** ${newTitle.name}`;
      }

      return i.reply(msg);
    }

    /* ---------- КАЗИНО ---------- */
    if (i.commandName === "казино") {
      if (!checkCooldown(u, "casino")) return i.reply("⏳ КД");
      const bet = i.options.getInteger("ставка");
      if (bet <= 0 || bet > u.money) return i.reply("❌ Ставка неверна");

      const win = Math.random() < 0.45;
      const diff = win ? bet : -bet;

      await usersCol.updateOne({ id: u.id }, { $inc: { money: diff } });
      await setCooldown(u.id, "casino");

      return i.reply(win ? `🎰 Ты выиграл ${bet}💰` : `💀 Ты проиграл ${bet}💰`);
    }

    /* ---------- КОСТИ ---------- */
    if (i.commandName === "кости") {
      if (!checkCooldown(u, "dice")) return i.reply("⏳ КД");
      const a = Math.ceil(Math.random() * 6);
      const b = Math.ceil(Math.random() * 6);
      await setCooldown(u.id, "dice");
      return i.reply(`🎲 Ты: ${a} | Бот: ${b} — ${a > b ? "ПОБЕДА" : "ПРОЁБ"}`);
    }

    /* ---------- ОВНЕР ---------- */
    if (["admin_add","admin_del","money_add","money_del","reset_all"].includes(i.commandName)) {
      if (i.user.id !== OWNER_ID) return i.reply({ content:"❌ Только овнер", ephemeral:true });

      if (i.commandName === "reset_all") {
        await usersCol.updateMany({}, {
          $set: { drinks:0, money:20, title:"Новичок", inventory:{ beer:1 }, cooldowns:{} }
        });
        return i.reply("♻️ Вся статистика сброшена");
      }
    }
  }
});

/* ===================== LOGIN ===================== */
client.login(process.env.TOKEN);
