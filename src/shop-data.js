module.exports = {

categories: {
  consumables: "🍺 Расходники",
  protection: "🛡 Защита",
  casino: "🎰 Казино"
},

items: {

  beer_box: {
    name: "Ящик пива",
    price: 50,
    category: "consumables",
    description: "Дает 20-60 🍺",
    type: "consumable"
  },

  shield: {
    name: "Щит",
    price: 150,
    category: "protection",
    description: "Спасает от проигрыша",
    type: "consumable"
  },

  lucky_coin: {
    name: "Счастливая монета",
    price: 200,
    category: "casino",
    description: "+10% к выигрышу",
    type: "passive"
  }

}

};
