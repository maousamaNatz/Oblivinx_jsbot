class Combat {
  static calculateDamage(attacker, defender, skill = null) {
    let damage = attacker.stats.attack - (defender.stats.defense * 0.5);
    
    if (skill) {
      damage *= skill.multiplier;
    }

    // Critical hit calculation
    if (Math.random() < attacker.stats.criticalRate / 100) {
      damage *= 1.5;
    }

    // Dodge calculation
    if (Math.random() < defender.stats.dodgeRate / 100) {
      return 0;
    }

    return Math.max(1, Math.floor(damage));
  }

  static isHit(attacker, defender) {
    const hitChance = attacker.stats.accuracy - defender.stats.dodgeRate;
    return Math.random() * 100 < hitChance;
  }

  static calculateExpReward(attacker, defender) {
    const levelDiff = defender.level - attacker.level;
    const baseExp = defender.level * 10;
    return Math.max(1, Math.floor(baseExp * (1 + levelDiff * 0.1)));
  }
}

module.exports = Combat;