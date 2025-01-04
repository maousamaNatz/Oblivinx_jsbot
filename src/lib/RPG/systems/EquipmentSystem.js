const Equipment = require('../core/Equipment');
const Logger = require('../utils/Logger');

class EquipmentSystem {
  constructor(engine) {
    this.engine = engine;
    this.slots = [
      'HEAD', 'NECK', 'SHOULDERS', 'CHEST', 'BACK',
      'WRISTS', 'HANDS', 'WAIST', 'LEGS', 'FEET',
      'MAIN_HAND', 'OFF_HAND', 'RING1', 'RING2'
    ];
  }

  equipItem(player, itemId) {
    const item = player.inventory.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error('Item not found in inventory');
    }

    if (!(item instanceof Equipment)) {
      throw new Error('Item is not equipment');
    }

    // Check requirements
    this._checkRequirements(player, item);

    // Unequip existing item in the slot
    if (player.equipment[item.slot]) {
      this.unequipItem(player, item.slot);
    }

    // Remove from inventory and equip
    player.inventory.items = player.inventory.items.filter(i => i.id !== itemId);
    player.equipment[item.slot] = item;

    // Recalculate stats
    this._updatePlayerStats(player);

    Logger.info(`Player ${player.id} equipped ${item.name}`);
    return true;
  }

  unequipItem(player, slot) {
    const item = player.equipment[slot];
    if (!item) {
      throw new Error('No item equipped in slot');
    }

    if (player.inventory.items.length >= player.inventory.maxSize) {
      throw new Error('Inventory is full');
    }

    delete player.equipment[slot];
    player.inventory.items.push(item);

    // Recalculate stats
    this._updatePlayerStats(player);

    Logger.info(`Player ${player.id} unequipped ${item.name}`);
    return true;
  }

  _checkRequirements(player, item) {
    Object.entries(item.requirements).forEach(([stat, value]) => {
      if ((player.stats[stat] || 0) < value) {
        throw new Error(`Requirement not met: ${stat} ${value}`);
      }
    });
  }

  _updatePlayerStats(player) {
    // Reset to base stats
    player.stats = { ...player.baseStats };

    // Add equipment stats
    Object.values(player.equipment).forEach(item => {
      const stats = item.calculateStats();
      Object.entries(stats).forEach(([stat, value]) => {
        player.stats[stat] = (player.stats[stat] || 0) + value;
      });
    });

    // Apply set bonuses
    this._applySetBonuses(player);
  }

  _applySetBonuses(player) {
    const setItems = new Map();
    
    // Count items per set
    Object.values(player.equipment).forEach(item => {
      if (item.set) {
        setItems.set(item.set, (setItems.get(item.set) || 0) + 1);
      }
    });

    // Apply bonuses based on number of set items equipped
    setItems.forEach((count, setName) => {
      const setData = this.engine.gameData.sets[setName];
      if (setData) {
        Object.entries(setData.bonuses).forEach(([pieces, stats]) => {
          if (count >= parseInt(pieces)) {
            Object.entries(stats).forEach(([stat, value]) => {
              player.stats[stat] = (player.stats[stat] || 0) + value;
            });
          }
        });
      }
    });
  }
}