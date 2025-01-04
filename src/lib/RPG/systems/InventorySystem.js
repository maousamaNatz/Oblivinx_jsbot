const Logger = require('../utils/Logger');

class InventorySystem {
  constructor(engine) {
    this.engine = engine;
    this.maxSlots = 50;
  }

  async addItem(player, item, quantity = 1) {
    if (player.inventory.items.length >= this.maxSlots) {
      throw new Error('Inventory is full');
    }

    player.inventory.items.push({
      ...item,
      quantity,
      acquiredAt: new Date().toISOString()
    });

    Logger.info(`Item added to ${player.id}'s inventory: ${item.name}`);
    return true;
  }

  async removeItem(player, itemId, quantity = 1) {
    const index = player.inventory.items.findIndex(item => item.id === itemId);
    if (index === -1) {
      throw new Error('Item not found');
    }

    const item = player.inventory.items[index];
    if (item.quantity < quantity) {
      throw new Error('Insufficient quantity');
    }

    item.quantity -= quantity;
    if (item.quantity <= 0) {
      player.inventory.items.splice(index, 1);
    }

    return true;
  }
}

module.exports = InventorySystem;