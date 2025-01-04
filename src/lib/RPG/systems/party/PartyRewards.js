class PartyRewards {
  static calculateSharedExperience(baseExp, partyMembers, levelRange) {
    const memberCount = partyMembers.size;
    if (memberCount <= 1) return baseExp;

    // Calculate party bonus
    const partyBonus = 1 + (memberCount * 0.1); // 10% per additional member
    
    // Calculate level difference penalty
    const levels = Array.from(partyMembers.values()).map(m => m.level);
    const levelDiff = Math.max(...levels) - Math.min(...levels);
    const levelPenalty = Math.max(0.5, 1 - (levelDiff / levelRange));

    return Math.floor(baseExp * partyBonus * levelPenalty);
  }

  static distributeLoot(item, party, rule) {
    switch (rule) {
      case 'ROUND_ROBIN':
        return this._roundRobinDistribution(item, party);
      case 'LEADER_DISTRIBUTE':
        return this._leaderDistribution(item, party);
      case 'FREE_FOR_ALL':
      default:
        return this._freeForAllDistribution(item, party);
    }
  }

  static _roundRobinDistribution(item, party) {
    const members = Array.from(party.members.values());
    const nextIndex = (party.lastLootIndex || 0) % members.length;
    party.lastLootIndex = nextIndex + 1;
    return members[nextIndex];
  }

  static _leaderDistribution(item, party) {
    return party.leader;
  }

  static _freeForAllDistribution(item, party) {
    return null; // All members can roll for the item
  }
}

module.exports = PartyRewards;