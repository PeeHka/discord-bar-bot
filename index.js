import { Client, GatewayIntentBits } from "discord.js";
import mongoose from "mongoose";

import User from "./models/User.js";
import Shop from "./models/Shop.js";
import Title from "./models/Title.js";
import Config from "./models/Config.js";
import Admin from "./models/Admin.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

await mongoose.connect(process.env.MONGO);

// ───────── HELPERS ─────────

function antiFarm(user) {
  const now = Date.now();
  user.lastActions = user.lastActions.filter(t => now - t < 60000);
  user.lastActions.push(now);
  return user.lastActions.length <= 5;
}

async function isAdmin(userId, ownerId) {
  if (userId === ownerId) return true;
  return await Admin.findOne({ userId });
}

async function checkTitle(member, user) {
  const titles = await Title.find().sort({ drinks: -1 });
  const newTitle = titles.find(t => user.totalDrinks >= t.drinks);
  if (!newTitle || user.title === newTitle.name) return;

  if (user.title) {
    const old = titles.find(t => t.name === user.title);
    if (old?.roleId) {
      const r = member.guild.roles.cache.get(old.roleId);
      if (r) await member.roles.remove(r).catch(() => {});
    }
  }

  if (!newTitle.roleId) {
    const role = await member.guild.roles.create({
      name: newTitle.name,
      color: "Random"
    });
    newTitle.roleId = role.id;
    await newTitle.save();
  }

  const role = member.guild.roles.cache.get(newTitle.roleId);
  if (role) await member.roles.add(role).catch(() => {});

  user.title = newTitle.name;
  await user.save();
}

// ───────── READY ─────────

client.once("ready", async () => {
  console.log(`🍺 Бар-бот запущен: ${client.user.tag}`);

  if (!await Config.findOne()) {
    await Config.create({ ownerId: process.env.OWNER_ID });
  }

  if (await Shop.countDocuments() === 0) {
    await Shop.insertMany([
      { id: "beer", name: "Пиво", price: 0, min: 10, max: 15 },
      { id: "wine", name: "Вино", price: 200, min: 25, max: 35 },
      { id: "vodka", name: "Водка", price: 500, min: 40, max: 60 },
      { id: "whiskey", name: "Виски", price: 1200, min: 80, max: 120 }
    ]);
  }

  if (await Title.countDocuments() === 0) {
    await Title.insertMany([
      { name: "🍼 Алкопадаван", drinks: 0 },
      { name: "🍺 Завсегдатай", drinks: 100 },
      { name: "🥃 Барный демон", drinks: 500 },
      { name: "👑 Легенда бара", drinks: 2000 }
    ]);
  }
});

// ───────── INTERACTIONS ─────────

client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  console.log("⚡ Slash:", i.commandName);

  await i.deferReply().catch(() => {});

  let user = await User.findOne({ userId: i.user.id });
  if (!user) user = await User.create({ userId: i.user.id });

  const config = await Config.findOne();

  // 🍺 DRINK
  if (i.commandName === "drink") {
    if (!antiFarm(user))
      return i.editReply("🚫 Слишком часто, сбавь обороты");

    if (Date.now() < user.cooldowns.drink)
      return i.editReply("⏳ Ты ещё не протрезвел");

    const item = await Shop.findOne({ id: user.inventory[0] });
    const profit = Math.floor(
      (Math.random() * (item.max - item.min) + item.min) *
      (config.event.active ? config.event.multiplier : 1)
    );

    user.balance += profit;
    user.totalDrinks++;
    user.cooldowns.drink = Date.now() + config.cooldowns.drink * 1000;
    await user.save();

    await checkTitle(i.member, user);

    return i.editReply(`🍺 ${item.name} → **+${profit}💰**`);
  }

  // 🛒 SHOP
  if (i.commandName === "shop") {
    const sub = i.options.getSubcommand();

    if (sub === "list") {
      const items = await Shop.find();
      return i.editReply(
        items.map(x => `**${x.id}** — ${x.name} (${x.price}💰)`).join("\n")
      );
    }

    if (sub === "buy") {
      const id = i.options.getString("item");
      const item = await Shop.findOne({ id });

      if (!item) return i.editReply("❌ Такого товара нет");
      if (user.balance < item.price)
        return i.editReply("💸 Не хватает денег");

      if (!user.inventory.includes(id))
        user.inventory.push(id);

      user.balance -= item.price;
      await user.save();

      return i.editReply(`🛒 Куплено: **${item.name}**`);
    }
  }

  // 🎒 INVENTORY
  if (i.commandName === "inventory") {
    return i.editReply(`🎒 Инвентарь: ${user.inventory.join(", ")}`);
  }

  // 🎲 DICE
  if (i.commandName === "dice") {
    const bet = i.options.getInteger("bet");

    if (bet <= 0 || user.balance < bet)
      return i.editReply("❌ Неверная ставка");

    const u = Math.ceil(Math.random() * 6);
    const b = Math.ceil(Math.random() * 6);

    user.balance += u > b ? bet : -bet;
    await user.save();

    return i.editReply(`🎲 ${u} : ${b}`);
  }

  // 🎰 CASINO
  if (i.commandName === "casino") {
    const bet = i.options.getInteger("bet");

    if (bet <= 0 || user.balance < bet)
      return i.editReply("❌ Неверная ставка");

    const r = Math.random();
    const mult = r < 0.5 ? 0 : r < 0.8 ? 1.5 : r < 0.95 ? 2 : 5;
    const delta = Math.floor(bet * mult) - bet;

    user.balance += delta;
    await user.save();

    return i.editReply(`🎰 Множитель **x${mult}**`);
  }

  // 🏆 TOP
  if (i.commandName === "top") {
    const type = i.options.getString("type");
    const list = await User.find()
      .sort(type === "money" ? { balance: -1 } : { totalDrinks: -1 })
      .limit(10);

    return i.editReply(
      list.map((u, i) => `${i + 1}. <@${u.userId}>`).join("\n")
    );
  }

  // 🛡️ ADMIN
  if (i.commandName === "admin") {
    if (!await isAdmin(i.user.id, config.ownerId))
      return i.editReply("❌ Нет прав");

    const sub = i.options.getSubcommand();

    if (sub === "give") {
      const targetUser = i.options.getUser("user");
      const amount = i.options.getInteger("amount");

      let target = await User.findOne({ userId: targetUser.id });
      if (!target) target = await User.create({ userId: targetUser.id });

      target.balance += amount;
      await target.save();

      return i.editReply(`💰 Выдано ${amount} → ${targetUser.tag}`);
    }

    if (sub === "add" && i.user.id === config.ownerId) {
      const u = i.options.getUser("user");
      await Admin.create({ userId: u.id });
      return i.editReply(`✅ ${u.tag} теперь админ`);
    }

    if (sub === "remove" && i.user.id === config.ownerId) {
      const u = i.options.getUser("user");
      await Admin.deleteOne({ userId: u.id });
      return i.editReply(`❌ ${u.tag} снят с админов`);
    }
  }

  // 👑 OWNER
  if (i.commandName === "owner") {
    if (i.user.id !== config.ownerId)
      return i.editReply("❌ Только овнер");

    const sub = i.options.getSubcommand();

    if (sub === "reset") {
      await User.deleteMany();
      return i.editReply("🔄 Вся статистика сброшена");
    }

    if (sub === "event") {
      config.event.active = i.options.getBoolean("state");
      await config.save();
      return i.editReply(`🎉 Ивент: ${config.event.active}`);
    }
  }

  // FALLBACK (чтобы НИКОГДА не молчал)
  return i.editReply("⚠️ Команда есть, но логика не найдена");
});

client.login(process.env.TOKEN);
