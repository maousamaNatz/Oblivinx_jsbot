class Item {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.rarity = data.rarity || 'COMMON';
    this.level = data.level || 1;
    this.stats = data.stats || {};
    this.durability = data.durability || 100;
    this.stackable = data.stackable || false;
    this.maxStack = data.maxStack || 1;
  }

  static createFromTemplate(template, modifications = {}) {
    return new Item({
      ...template,
      ...modifications,
      stats: { ...template.stats, ...modifications.stats }
    });
  }

  calculateValue() {
    const rarityMultiplier = {
      COMMON: 1,
      UNCOMMON: 2,
      RARE: 5,
      EPIC: 10,
      LEGENDARY: 25
    };

    let baseValue = this.level * 10;
    baseValue *= rarityMultiplier[this.rarity] || 1;
    
    return Math.floor(baseValue * (this.durability / 100));
  }
}

module.exports = Item;