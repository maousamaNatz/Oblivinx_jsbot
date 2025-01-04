class DungeonGenerator {
  generateRooms(level, difficulty) {
    const roomCount = this._calculateRoomCount(level);
    const rooms = [];

    for (let i = 0; i < roomCount; i++) {
      rooms.push(new DungeonRoom(
        this._selectRoomType(i, roomCount),
        level,
        difficulty
      ));
    }

    return this._connectRooms(rooms);
  }

  _calculateRoomCount(level) {
    return Math.min(3 + Math.floor(level / 5), 10);
  }

  _selectRoomType(index, totalRooms) {
    if (index === 0) return 'entrance';
    if (index === totalRooms - 1) return 'boss';
    
    const types = ['combat', 'puzzle', 'treasure'];
    return types[Math.floor(Math.random() * types.length)];
  }

  _connectRooms(rooms) {
    rooms.forEach((room, index) => {
      room.connections = {
        north: index < rooms.length - 1 ? rooms[index + 1].id : null,
        south: index > 0 ? rooms[index - 1].id : null
      };
    });

    return rooms;
  }
}

module.exports = DungeonGenerator;