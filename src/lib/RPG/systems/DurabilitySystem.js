const Logger = require('../utils/Logger');

class DurabilitySystem {
  constructor(engine) {
    this.engine = engine;
  }

  damageEquipment(player, combatIntensity = 1) {
    Object.values(player.equipment).forEach(item => {
      if (item) {
        const damage = this._calculateDurabilityDamage(combatIntensity);
        item.durability = Math.max(0, item.durability - damage);
        
        if (item.durability === 0) {
          Logger.info(`${item.name} has broken!`);
          this._applyBrokenItemPenalties(player, item);
        }
      }
    });
  }

  repairItem(player, itemId, amount) {
    const item = player.inventory.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    const repairCost = this._calculateRepairCost(item);
    if (player.gold < repairCost) {
      throw new Error('Insufficient gold for repair');
    }

    player.gold -= repairCost;
    item.durability = Math.min(item.maxDurability, item.durability + amount);
    return item.durability;
  }

  _calculateDurabilityDamage(combatIntensity) {
    return Math.random() * combatIntensity;
  }

  _calculateRepairCost(item) {
    const durabilityLost = item.maxDurability - item.durability;
    const baseRepairCost = item.basePrice * 0.1;
    return Math.ceil(baseRepairCost * (durabilityLost / item.maxDurability));
  }

  _applyBrokenItemPenalties(player, item) {
    // Broken items provide no stats
    player._recalculateStats();
  }
}

module.exports = DurabilitySystem;