const { Client, GatewayIntentBits, InteractionType } = require("discord.js");
const { connectDB, db } = require("./database/mongo");
const { TOKEN, OWNER_ID } = require("./config/env");
const { parse } = require("./parser/roleParser");
const { execute } = require("./admin/roleEngine");
const { buildConfirm } = require("./security/confirmation");
const { restore } = require("./panic/rolePanic");
const log = require("./logs/logger");

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready",()=>console.log("👑 GOD MODE v6 STAGE1"));

let pending = null;

client.on("messageCreate", async message=>{

  if(message.author.bot) return;

  if(message.content === "!panic" && message.author.id===OWNER_ID){
    const ok = await restore(message.guild, db());
    return message.reply(ok ? "🔁 Откат выполнен." : "Нет бэкапа.");
  }

  if(!message.content.startsWith("!do ")) return;
  if(message.author.id !== OWNER_ID) return message.reply("Нет доступа.");

  const action = parse(message.content.slice(4));
  if(!action) return message.reply("Не понял команду.");

  if(action.dangerous){
    pending = { action, message };
    return message.reply({
      content: "⚠ Подтвердить действие?",
      components:[ buildConfirm() ]
    });
  }

  const result = await execute(action, message, db());
  await log(client, message.content);
  message.reply(result);
});

client.on("interactionCreate", async interaction=>{
  if(interaction.type !== InteractionType.MessageComponent) return;
  if(!pending) return;

  if(interaction.customId === "confirm_yes"){
    const result = await execute(pending.action, pending.message, db());
    await interaction.update({ content:"✅ "+result, components:[] });
    pending = null;
  }

  if(interaction.customId === "confirm_no"){
    await interaction.update({ content:"❌ Отменено.", components:[] });
    pending = null;
  }
});

(async()=>{
  await connectDB();
  await client.login(TOKEN);
})();
