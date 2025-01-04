const Logger = require('../../utils/Logger');
const PartyValidator = require('./PartyValidator');
const PartyConfig = require('./PartyConfig');

class PartySystem {
  constructor(engine) {
    this.engine = engine;
    this.parties = new Map();
    this.validator = new PartyValidator();
  }

  createParty(leaderId, settings = {}) {
    const leader = this.engine.players.get(leaderId);
    if (!leader) throw new Error('Leader not found');

    const party = {
      id: `party_${Date.now()}`,
      leader: leaderId,
      members: new Map([[leaderId, { role: 'LEADER', joinedAt: Date.now() }]]),
      settings: {
        minLevel: settings.minLevel || leader.level - PartyConfig.MAX_LEVEL_GAP,
        maxLevel: settings.maxLevel || leader.level + PartyConfig.MAX_LEVEL_GAP,
        maxSize: settings.maxSize || PartyConfig.DEFAULT_MAX_SIZE,
        roles: new Map()
      },
      createdAt: Date.now()
    };

    this.parties.set(party.id, party);
    Logger.info(`Party created by ${leaderId}`);
    return party;
  }

  joinParty(partyId, playerId) {
    const party = this.parties.get(partyId);
    const player = this.engine.players.get(playerId);

    if (!party || !player) throw new Error('Party or player not found');

    this.validator.validateJoinRequest(party, player);
    
    party.members.set(playerId, {
      role: 'MEMBER',
      joinedAt: Date.now()
    });

    Logger.info(`Player ${playerId} joined party ${partyId}`);
    return true;
  }

  leaveParty(partyId, playerId) {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');

    if (playerId === party.leader) {
      this._disbandOrTransferLeadership(party);
    } else {
      party.members.delete(playerId);
    }

    Logger.info(`Player ${playerId} left party ${partyId}`);
    return true;
  }

  setRole(partyId, targetId, role) {
    const party = this.parties.get(partyId);
    if (!party) throw new Error('Party not found');

    const member = party.members.get(targetId);
    if (!member) throw new Error('Member not found');

    member.role = role;
    Logger.info(`Role ${role} assigned to ${targetId} in party ${partyId}`);
    return true;
  }

  _disbandOrTransferLeadership(party) {
    const members = Array.from(party.members.entries())
      .filter(([id]) => id !== party.leader);

    if (members.length === 0) {
      this.parties.delete(party.id);
      Logger.info(`Party ${party.id} disbanded`);
    } else {
      const newLeader = members[0][0];
      party.leader = newLeader;
      party.members.get(newLeader).role = 'LEADER';
      Logger.info(`Leadership transferred to ${newLeader} in party ${party.id}`);
    }
  }
}

module.exports = PartySystem;