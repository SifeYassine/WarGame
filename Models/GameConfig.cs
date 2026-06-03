namespace WarGame.Models;

public record TankConfig(int Id, Vector P);

public record SceneConfig(Vector P, int Variant);

// Everything needed to set up one match.
public class GameConfig
{
    public List<TankConfig> TanksP1 { get; init; } = [];
    public List<TankConfig> TanksP2 { get; init; } = [];
    public List<SceneConfig> Hexes { get; init; } = [];
    public List<SceneConfig> Sites { get; init; } = [];
    public int DriveRange { get; init; }
    public int VisibilityRange { get; init; }
    public int FireRange { get; init; }
    public Vector Center { get; init; }

    // The map starts shrinking on turn ShrinkAfter, then every ShrinkInterval turns.
    public int ShrinkAfter { get; init; }
    public int ShrinkInterval { get; init; }
    public int Radius { get; init; }
}
