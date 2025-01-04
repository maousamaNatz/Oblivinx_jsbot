const Item = require('./Item');
const Logger = require('../utils/Logger');

class Store {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.inventory = new Map();
    this.restockTime = data.restockTime || 3600000; // 1 hour in milliseconds
    this.lastRestockTime = Date.now();
    this.markup = data.markup || 1.5; // Price multiplier for selling items
    this.buybackRate = data.buybackRate || 0.5; // Rate at which store buys items from players
  }

  addItem(item, quantity, basePrice) {
    this.inventory.set(item.id, {
      item,
      quantity,
      basePrice,
      lastRestock: Date.now()
    });
  }

  buyItem(player, itemId, quantity = 1) {
    const itemData = this.inventory.get(itemId);
    if (!itemData || itemData.quantity < quantity) {
      throw new Error('Item not available in sufficient quantity');
    }

    const totalPrice = itemData.basePrice * quantity * this.markup;
    if (player.gold < totalPrice) {
      throw new Error('Insufficient gold');
    }

    player.gold -= totalPrice;
    itemData.quantity -= quantity;
    
    if (itemData.quantity <= 0) {
      this.inventory.delete(itemId);
    }

    return {
      item: itemData.item,
      quantity,
      price: totalPrice
    };
  }

  sellItem(player, item, quantity = 1) {
    const sellPrice = Math.floor(item.calculateValue() * this.buybackRate * quantity);
    player.gold += sellPrice;
    
    // Add sold item to store inventory
    if (this.inventory.has(item.id)) {
      const itemData = this.inventory.get(item.id);
      itemData.quantity += quantity;
    } else {
      this.addItem(item, quantity, Math.floor(sellPrice / this.buybackRate));
    }

    return sellPrice;
  }

  restock() {
    if (Date.now() - this.lastRestockTime < this.restockTime) {
      return false;
    }

    this.inventory.forEach((itemData, itemId) => {
      itemData.quantity = Math.min(itemData.quantity + 5, 20);
    });

    this.lastRestockTime = Date.now();
    Logger.info(`Store ${this.name} restocked`);
    return true;
  }
}