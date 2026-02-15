import random
import discord
from discord.ext import commands
from discord import app_commands

from database import users, get_user
from utils.embeds import success, money

class Economy(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="balance")
    async def balance(self, interaction: discord.Interaction):
        user = await get_user(interaction.user.id)
        await interaction.response.send_message(embed=money(user["wallet"]))

    @app_commands.command(name="work")
    async def work(self, interaction: discord.Interaction):
        amount = random.randint(50, 150)
        await users.update_one(
            {"user_id": interaction.user.id},
            {"$inc": {"wallet": amount, "total_earned": amount}}
        )
        await interaction.response.send_message(embed=success("Работа", f"+{amount}$"))

async def setup(bot):
    await bot.add_cog(Economy(bot))
