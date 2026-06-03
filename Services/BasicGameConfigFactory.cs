using WarGame.Models;

namespace WarGame.Services;

// The single hard-coded map.
public class BasicGameConfigFactory : IGameConfigFactory
{
    public GameConfig Create()
    {
        var center = new Vector(2, 1);

        var hexes = new List<SceneConfig>
        {
            new(new Vector(1, -2), 2),
            new(new Vector(2, -2), 1),
            new(new Vector(-2, -1), 2),
            new(new Vector(-1, -1), 2),
            new(new Vector(0, -1), 2),
            new(new Vector(-2, 0), 0),
            new(new Vector(0, 0), 0),
            new(new Vector(1, 0), 1),
            new(new Vector(-2, 1), 0),
            new(new Vector(-1, 1), 0),
            new(new Vector(0, 1), 0),
            new(new Vector(1, 1), 1),
            new(new Vector(-2, 2), 0),
            new(new Vector(-1, 2), 0),
        };

        return new GameConfig
        {
            TanksP1 = [new(1, new Vector(0, 0)), new(2, new Vector(2, -2))],
            TanksP2 = [new(3, new Vector(-2, -1)), new(4, new Vector(0, 1))],
            Hexes = hexes,
            Sites = [new(new Vector(1, 0), 8), new(new Vector(-1, 2), 6)],
            DriveRange = 5,
            VisibilityRange = 2,
            FireRange = 3,
            Center = center,
            ShrinkAfter = 2,
            ShrinkInterval = 3,
            // The radius is the distance from the center to the farthest hex.
            Radius = hexes.Max(h => h.P.DistanceTo(center)),
        };
    }
}
