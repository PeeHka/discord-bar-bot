import discord
from discord.ext import commands
from discord import app_commands

from database import users, get_user
from data.shop import BUSINESSES
from utils.embeds import success, error

class Business(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="buybusiness")
    async def buybusiness(self, interaction: discord.Interaction, name: str):
        user = await get_user(interaction.user.id)
        if name not in BUSINESSES:
            await interaction.response.send_message(embed=error("Ошибка", "Нет бизнеса"))
            return

        price = BUSINESSES[name]["price"]

        if user["wallet"] < price:
            await interaction.response.send_message(embed=error("Ошибка", "Недостаточно денег"))
            return

        await users.update_one(
            {"user_id": interaction.user.id},
            {"$inc": {"wallet": -price}, "$set": {"business": name}}
        )

        await interaction.response.send_message(embed=success("Куплено", name))

async def setup(bot):
    await bot.add_cog(Business(bot))
