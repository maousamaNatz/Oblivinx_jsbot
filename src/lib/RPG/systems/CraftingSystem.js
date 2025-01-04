const Logger = require('../utils/Logger');

class CraftingSystem {
  constructor(engine) {
    this.engine = engine;
    this.recipes = new Map();
  }

  registerRecipe(recipe) {
    this.recipes.set(recipe.id, recipe);
  }

  async craft(player, recipeId, quantity = 1) {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Check crafting level requirement
    if (player.crafting[recipe.craftType].level < recipe.requiredLevel) {
      throw new Error(`Required ${recipe.craftType} level: ${recipe.requiredLevel}`);
    }

    // Check and consume materials
    for (const [materialId, amount] of Object.entries(recipe.materials)) {
      const playerAmount = player.inventory.materials.get(materialId) || 0;
      if (playerAmount < amount * quantity) {
        throw new Error(`Insufficient ${materialId}`);
      }
    }

    // Consume materials
    for (const [materialId, amount] of Object.entries(recipe.materials)) {
      const newAmount = player.inventory.materials.get(materialId) - (amount * quantity);
      player.inventory.materials.set(materialId, newAmount);
    }

    // Calculate success chance and quality
    const successChance = this._calculateSuccessChance(player, recipe);
    const quality = this._calculateQuality(player, recipe);

    // Attempt crafting
    if (Math.random() > successChance) {
      Logger.info(`Crafting failed for player ${player.id}`);
      return { success: false, message: 'Crafting failed' };
    }

    // Create items
    const items = [];
    for (let i = 0; i < quantity; i++) {
      const item = this._createCraftedItem(recipe, quality);
      items.push(item);
      player.inventory.items.push(item);
    }

    // Grant crafting experience
    const expGained = recipe.baseExp * quantity;
    player.gainCraftingExp(recipe.craftType, expGained);

    Logger.info(`Player ${player.id} crafted ${quantity}x ${recipe.name}`);
    return {
      success: true,
      items,
      quality,
      expGained
    };
  }

  _calculateSuccessChance(player, recipe) {
    const skillDiff = player.crafting[recipe.craftType].level - recipe.requiredLevel;
    return Math.min(0.95, 0.5 + (skillDiff * 0.05));
  }

  _calculateQuality(player, recipe) {
    const skillDiff = player.crafting[recipe.craftType].level - recipe.requiredLevel;
    const baseQuality = 1 + (skillDiff * 0.1);
    return Math.min(2, Math.max(1, baseQuality + (Math.random() * 0.2)));
  }

  _createCraftedItem(recipe, quality) {
    const item = { ...recipe.result };
    
    // Apply quality bonus to item stats
    if (item.stats) {
      Object.keys(item.stats).forEach(stat => {
        item.stats[stat] = Math.floor(item.stats[stat] * quality);
      });
    }

    item.quality = quality;
    item.crafted = true;
    item.craftedBy = player.id;
    item.craftedAt = new Date().toISOString();

    return item;
  }
}

module.exports = CraftingSystem;