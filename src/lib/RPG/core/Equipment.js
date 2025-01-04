class Equipment {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.slot = data.slot;
    this.level = data.level || 1;
    this.rarity = data.rarity || 'COMMON';
    this.stats = data.stats || {};
    this.requirements = data.requirements || {};
    this.durability = data.durability || 100;
    this.maxDurability = data.maxDurability || 100;
    this.enchantments = data.enchantments || [];
    this.sockets = data.sockets || [];
    this.set = data.set || null;
  }

  repair(amount) {
    this.durability = Math.min(this.maxDurability, this.durability + amount);
    return this.durability;
  }

  addEnchantment(enchantment) {
    if (this.enchantments.length >= 3) {
      throw new Error('Maximum enchantments reached');
    }
    this.enchantments.push(enchantment);
  }

  addSocket(gem) {
    if (this.sockets.length >= 3) {
      throw new Error('Maximum sockets reached');
    }
    this.sockets.push(gem);
  }

  calculateStats() {
    let totalStats = { ...this.stats };

    // Add enchantment stats
    this.enchantments.forEach(enchant => {
      Object.entries(enchant.stats).forEach(([stat, value]) => {
        totalStats[stat] = (totalStats[stat] || 0) + value;
      });
    });

    // Add socket stats
    this.sockets.forEach(socket => {
      Object.entries(socket.stats).forEach(([stat, value]) => {
        totalStats[stat] = (totalStats[stat] || 0) + value;
      });
    });

    // Apply durability penalty
    const durabilityMultiplier = this.durability / this.maxDurability;
    Object.keys(totalStats).forEach(stat => {
      totalStats[stat] = Math.floor(totalStats[stat] * durabilityMultiplier);
    });

    return totalStats;
  }
}