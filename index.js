
import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot started as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'No permission.', ephemeral: true });
  }

  if (interaction.commandName === 'giverole') {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(user.id);
    await member.roles.add(role);
    await interaction.reply(`Role ${role.name} given to ${user.tag}`);
  }

  if (interaction.commandName === 'removerole') {
    const user = interaction.options.getUser('user');
    const role = interaction.options.getRole('role');
    const member = await interaction.guild.members.fetch(user.id);
    await member.roles.remove(role);
    await interaction.reply(`Role ${role.name} removed from ${user.tag}`);
  }

  if (interaction.commandName === 'clear') {
    const amount = interaction.options.getInteger('amount');
    await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({ content: `Deleted ${amount} messages`, ephemeral: true });
  }
});

client.login(process.env.TOKEN);
