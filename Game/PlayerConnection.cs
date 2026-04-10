using System.Net.WebSockets;
using System.Text.Json;
using WarGame.Dtos;

namespace WarGame.Game;

// Wraps one browser's WebSocket: turns JSON text into DTOs and back.
public class PlayerConnection
{
    // "Web" defaults = camelCase property names and case-insensitive reading,
    // so C# "RoomCode" matches JSON "roomCode".
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly WebSocket _socket;

    // A WebSocket allows only one send at a time; this lock makes callers wait their turn.
    private readonly SemaphoreSlim _sendLock = new(1, 1);

    public PlayerConnection(WebSocket socket)
    {
        _socket = socket;
    }

    public async Task SendAsync(ServerMessageDto message)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(message, JsonOptions);

        await _sendLock.WaitAsync();
        try
        {
            if (_socket.State == WebSocketState.Open)
            {
                await _socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
        catch (WebSocketException)
        {
            // The browser is gone; the receive loop will notice and clean up.
        }
        finally
        {
            _sendLock.Release();
        }
    }

    // Waits for the next message. Returns null when the connection is closed
    // or the message isn't valid JSON.
    public async Task<ClientMessageDto?> ReceiveAsync()
    {
        var buffer = new byte[4096];
        using var stream = new MemoryStream();

        // A big message may arrive in several pieces.
        while (true)
        {
            WebSocketReceiveResult result;
            try
            {
                result = await _socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }
            catch (WebSocketException)
            {
                return null;
            }

            if (result.MessageType != WebSocketMessageType.Text)
            {
                return null;
            }

            stream.Write(buffer, 0, result.Count);
            if (result.EndOfMessage)
            {
                break;
            }
        }

        try
        {
            return JsonSerializer.Deserialize<ClientMessageDto>(stream.ToArray(), JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public async Task CloseAsync()
    {
        await _sendLock.WaitAsync();
        try
        {
            if (_socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
            {
                await _socket.CloseAsync(WebSocketCloseStatus.NormalClosure, null, CancellationToken.None);
            }
        }
        catch (WebSocketException)
        {
        }
        finally
        {
            _sendLock.Release();
        }
    }
}
