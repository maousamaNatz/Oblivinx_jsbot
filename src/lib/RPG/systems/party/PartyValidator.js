class PartyValidator {
  validateJoinRequest(party, player) {
    this._validatePartySize(party);
    this._validateLevelRequirements(party, player);
    this._validateNotInParty(player);
  }

  _validatePartySize(party) {
    if (party.members.size >= party.settings.maxSize) {
      throw new Error('Party is full');
    }
  }

  _validateLevelRequirements(party, player) {
    if (player.level < party.settings.minLevel) {
      throw new Error(`Required minimum level: ${party.settings.minLevel}`);
    }
    
    if (player.level > party.settings.maxLevel) {
      throw new Error(`Required maximum level: ${party.settings.maxLevel}`);
    }
  }

  _validateNotInParty(player) {
    if (player.partyId) {
      throw new Error('Player is already in a party');
    }
  }
}

module.exports = PartyValidator;