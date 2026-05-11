using System.Net.WebSockets;
using WarGame.Dtos;
using WarGame.Game;

namespace WarGame.Services;

// Runs one player's connection from connect to disconnect.
public class GameWebSocketHandler
{
    private readonly IRoomManager _roomManager;
    private readonly ILogger<GameWebSocketHandler> _logger;

    public GameWebSocketHandler(IRoomManager roomManager, ILogger<GameWebSocketHandler> logger)
    {
        _roomManager = roomManager;
        _logger = logger;
    }

    public async Task HandleAsync(WebSocket socket)
    {
        var player = new PlayerConnection(socket);
        _logger.LogInformation("Player connected");

        try
        {
            // Read messages until the browser disconnects.
            while (true)
            {
                var message = await player.ReceiveAsync();
                if (message == null)
                {
                    break;
                }
                await HandleMessageAsync(player, message);
            }
        }
        finally
        {
            // Closing the tab in the middle of a game counts as quitting.
            if (player.Room != null)
            {
                await player.Room.LeaveAsync(player);
            }
            await player.CloseAsync();
            _logger.LogInformation("Player disconnected");
        }
    }

    private async Task HandleMessageAsync(PlayerConnection player, ClientMessageDto message)
    {
        switch (message.Type)
        {
            case ClientMessageType.JoinRoom:
                if (player.Room != null)
                {
                    _logger.LogWarning("JoinRoom ignored: player is already in a room");
                    return;
                }
                var room = _roomManager.GetOrCreateRoom(message.RoomCode ?? "");
                if (!await room.TryJoinAsync(player))
                {
                    // Room is full or already finished.
                    await player.SendAsync(new RoomDisconnectedMessageDto());
                }
                break;

            case ClientMessageType.SendTurn:
                if (player.Room == null)
                {
                    _logger.LogWarning("SendTurn ignored: player is not in a room");
                    return;
                }
                await player.Room.SubmitTurnAsync(player, message.Actions ?? []);
                break;

            case ClientMessageType.QuitRoom:
                if (player.Room != null)
                {
                    await player.Room.LeaveAsync(player);
                }
                break;
        }
    }
}
