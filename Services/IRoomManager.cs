using WarGame.Game;

namespace WarGame.Services;

public interface IRoomManager
{
    // Returns the room with this code, creating it if it doesn't exist yet.
    GameRoom GetOrCreateRoom(string code);
}
