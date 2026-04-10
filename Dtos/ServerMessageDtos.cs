using System.Text.Json.Serialization;
using WarGame.Models;

namespace WarGame.Dtos;

public enum ServerMessageType
{
    StartGame = 1,
    TurnResults = 2,
    RoomJoined = 3,
    RoomDisconnected = 4,
    GameFinished = 5,
}

// Every message the server sends to the browser.
[JsonDerivedType(typeof(StartGameMessageDto))]
[JsonDerivedType(typeof(TurnResultsMessageDto))]
[JsonDerivedType(typeof(RoomJoinedMessageDto))]
[JsonDerivedType(typeof(RoomDisconnectedMessageDto))]
[JsonDerivedType(typeof(GameFinishedMessageDto))]
public abstract record ServerMessageDto(ServerMessageType Type);

public record StartGameMessageDto(ClientConfigDto Config)
    : ServerMessageDto(ServerMessageType.StartGame);

public record TurnResultsMessageDto(List<TurnResultDto> TurnResults)
    : ServerMessageDto(ServerMessageType.TurnResults);

public record RoomJoinedMessageDto()
    : ServerMessageDto(ServerMessageType.RoomJoined);

public record RoomDisconnectedMessageDto()
    : ServerMessageDto(ServerMessageType.RoomDisconnected);

public record GameFinishedMessageDto(GameResult Result)
    : ServerMessageDto(ServerMessageType.GameFinished);
