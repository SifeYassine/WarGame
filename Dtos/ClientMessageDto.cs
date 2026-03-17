using WarGame.Models;

namespace WarGame.Dtos;

public enum ClientMessageType
{
    JoinRoom = 1,
    SendTurn = 2,
    QuitRoom = 3,
}

// One JSON message sent by the browser. Which fields are filled depends on Type.
public class ClientMessageDto
{
    public ClientMessageType Type { get; set; }
    public string? RoomCode { get; set; }
    public List<TankActionDto>? Actions { get; set; }
}

public class TankActionDto
{
    public TankActionType Type { get; set; }
    public int Id { get; set; }

    // Used by Fire actions.
    public Vector Dir { get; set; }

    // Used by Move actions.
    public List<Vector>? Path { get; set; }
}
