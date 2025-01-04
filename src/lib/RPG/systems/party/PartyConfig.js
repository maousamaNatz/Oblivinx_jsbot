const PartyConfig = {
  // Party size limits
  DEFAULT_MAX_SIZE: 6,
  MIN_PARTY_SIZE: 2,
  
  // Level restrictions
  MAX_LEVEL_GAP: 10,
  MIN_LEVEL_GAP: 5,
  
  // Roles
  ROLES: {
    LEADER: 'LEADER',
    TANK: 'TANK',
    HEALER: 'HEALER',
    DPS: 'DPS',
    SUPPORT: 'SUPPORT'
  },
  
  // Experience sharing
  SHARED_EXP_RANGE: 50, // units
  SHARED_EXP_BONUS: 0.2, // 20% bonus for party members
  
  // Loot rules
  LOOT_RULES: {
    FREE_FOR_ALL: 'FREE_FOR_ALL',
    ROUND_ROBIN: 'ROUND_ROBIN',
    LEADER_DISTRIBUTE: 'LEADER_DISTRIBUTE'
  }
};

module.exports = PartyConfig;