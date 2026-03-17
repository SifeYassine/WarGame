using WarGame.Models;

namespace WarGame.Game;

// The rules of the game.
// Each room creates its own GameState with "new"; it is not a DI service.
public class GameState
{
    private readonly GameConfig _config;
    private readonly Dictionary<int, Tank> _tanksP1 = new();
    private readonly Dictionary<int, Tank> _tanksP2 = new();
    private readonly Dictionary<Vector, Hex> _hexes = new();

    public GameState(GameConfig config)
    {
        _config = config;

        foreach (var hex in config.Hexes)
        {
            _hexes[hex.P] = new Hex(hex.P);
        }
        foreach (var site in config.Sites)
        {
            if (_hexes.TryGetValue(site.P, out var hex))
            {
                hex.Traversable = false;
            }
        }
        foreach (var t in config.TanksP1)
        {
            _tanksP1[t.Id] = new Tank(t.Id, t.P);
        }
        foreach (var t in config.TanksP2)
        {
            _tanksP2[t.Id] = new Tank(t.Id, t.P);
        }

        // Tanks that start within sight of each other are visible from the start.
        foreach (var t1 in _tanksP1.Values)
        {
            foreach (var t2 in _tanksP2.Values)
            {
                if (t1.Position.DistanceTo(t2.Position) <= config.VisibilityRange)
                {
                    t1.Visible = true;
                    t2.Visible = true;
                }
            }
        }
    }

    // Returns null while both players still have tanks.
    public GameOutcome? GetOutcome()
    {
        bool p1Alive = _tanksP1.Values.Any(t => !t.Destroyed);
        bool p2Alive = _tanksP2.Values.Any(t => !t.Destroyed);

        if (p1Alive && p2Alive)
        {
            return null;
        }
        if (!p1Alive && !p2Alive)
        {
            return new GameOutcome(GameResult.Draw, GameResult.Draw);
        }
        return p1Alive
            ? new GameOutcome(GameResult.Win, GameResult.Lose)
            : new GameOutcome(GameResult.Lose, GameResult.Win);
    }
}
