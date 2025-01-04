const Logger = require('../utils/Logger');

class EnchantmentSystem {
  constructor(engine) {
    this.engine = engine;
  }

  async enchantItem(player, itemId, enchantmentId) {
    const item = player.inventory.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');
    
    if (item.enchantments.length >= item.maxEnchantments) {
      throw new Error('Maximum enchantments reached');
    }

    const enchantment = this.engine.gameData.enchantments[enchantmentId];
    if (!enchantment) throw new Error('Enchantment not found');

    // Check player level requirement
    if (player.level < enchantment.requiredLevel) {
      throw new Error(`Required level: ${enchantment.requiredLevel}`);
    }

    // Success chance based on player's enchanting skill
    const successChance = this._calculateSuccessChance(player, enchantment);
    const success = Math.random() <= successChance;

    if (success) {
      item.enchantments.push({
        id: enchantmentId,
        power: this._calculateEnchantmentPower(player),
        appliedAt: new Date().toISOString()
      });
      
      player.gainCraftingExp('enchanting', enchantment.expReward);
      return { success: true, message: 'Enchantment successful' };
    }

    return { success: false, message: 'Enchantment failed' };
  }

  _calculateSuccessChance(player, enchantment) {
    const baseChance = 0.5;
    const skillBonus = player.crafting.enchanting.level * 0.02;
    return Math.min(0.95, baseChance + skillBonus);
  }

  _calculateEnchantmentPower(player) {
    const baseMultiplier = 1.0;
    const skillBonus = player.crafting.enchanting.level * 0.05;
    return baseMultiplier + skillBonus;
  }
}

module.exports = EnchantmentSystem;