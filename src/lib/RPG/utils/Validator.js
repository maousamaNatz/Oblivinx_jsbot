class Validator {
  static validateLevel(level, required) {
    if (level < required) {
      throw new Error(`Required level: ${required}, Current level: ${level}`);
    }
  }

  static validateGold(current, required) {
    if (current < required) {
      throw new Error(`Insufficient gold. Need: ${required}, Have: ${current}`);
    }
  }

  static validateInventorySpace(current, max) {
    if (current >= max) {
      throw new Error(`Inventory full. Capacity: ${max}`);
    }
  }
}

module.exports = Validator;