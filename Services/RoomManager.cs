using WarGame.Game;

namespace WarGame.Services;

// Keeps track of all open rooms.
// Registered as a singleton: one instance shared by every connection.
public class RoomManager : IRoomManager
{
    private readonly Dictionary<string, GameRoom> _rooms = new();
    private readonly object _lock = new();
    private readonly IGameConfigFactory _configFactory;
    private readonly ILogger<RoomManager> _logger;

    public RoomManager(IGameConfigFactory configFactory, ILogger<RoomManager> logger)
    {
        _configFactory = configFactory;
        _logger = logger;
    }

    public GameRoom GetOrCreateRoom(string code)
    {
        // Many players can connect at the same time, so only one thread
        // at a time may touch the dictionary.
        lock (_lock)
        {
            if (!_rooms.TryGetValue(code, out var room))
            {
                room = new GameRoom(code, _configFactory, RemoveRoom);
                _rooms[code] = room;
                _logger.LogInformation("Room {Code} created", code);
            }
            return room;
        }
    }

    // Called by a room when its game is over.
    private void RemoveRoom(string code)
    {
        lock (_lock)
        {
            _rooms.Remove(code);
        }
        _logger.LogInformation("Room {Code} closed", code);
    }
}
