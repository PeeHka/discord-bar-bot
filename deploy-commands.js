
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = [
  new SlashCommandBuilder()
    .setName('giverole')
    .setDescription('Give a role')
    .addUserOption(option =>
      option.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(option =>
      option.setName('role').setDescription('Role').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role')
    .addUserOption(option =>
      option.setName('user').setDescription('User').setRequired(true))
    .addRoleOption(option =>
      option.setName('role').setDescription('Role').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages')
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Deploying slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands deployed.');
  } catch (error) {
    console.error(error);
  }
})();
