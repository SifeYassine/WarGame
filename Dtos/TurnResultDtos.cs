using System.Text.Json.Serialization;
using WarGame.Models;

namespace WarGame.Dtos;

// One event of a resolved turn, replayed as an animation by the browser.
// [JsonDerivedType] tells the JSON serializer to write the fields of the real
// (derived) type when it serializes a List<TurnResultDto>.
[JsonDerivedType(typeof(Move2ResultDto))]
[JsonDerivedType(typeof(Move3ResultDto))]
[JsonDerivedType(typeof(FireResultDto))]
[JsonDerivedType(typeof(ExplosionResultDto))]
[JsonDerivedType(typeof(DestroyedResultDto))]
[JsonDerivedType(typeof(VisibleResultDto))]
[JsonDerivedType(typeof(ShrinkResultDto))]
public abstract record TurnResultDto(TurnResultType Type);

public record Move2ResultDto(int Id, Vector P1, Vector P2, bool Start)
    : TurnResultDto(TurnResultType.Move2);

public record Move3ResultDto(int Id, Vector P1, Vector P2, Vector P3)
    : TurnResultDto(TurnResultType.Move3);

public record FireResultDto(int Id, Vector Dir)
    : TurnResultDto(TurnResultType.Fire);

public record ExplosionResultDto(Vector P, bool Destroyed, int Id)
    : TurnResultDto(TurnResultType.Explosion);

public record DestroyedResultDto(Vector P, int Id)
    : TurnResultDto(TurnResultType.Destroyed);

public record VisibleResultDto(int Id, Vector P, bool Visible)
    : TurnResultDto(TurnResultType.Visible);

public record ShrinkResultDto(int R, bool Started)
    : TurnResultDto(TurnResultType.Shrink);
