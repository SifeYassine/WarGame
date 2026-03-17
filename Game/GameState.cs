using WarGame.Dtos;
using WarGame.Models;

namespace WarGame.Game;

// The rules of the game.
// Each room creates its own GameState with "new"; it is not a DI service.
public class GameState
{
    // One player's point of view while a turn is resolved:
    // their tanks, and the results that will be sent to them.
    private record Side(Dictionary<int, Tank> Tanks, List<TurnResultDto> Results);

    private readonly GameConfig _config;
    private readonly Dictionary<int, Tank> _tanksP1 = new();
    private readonly Dictionary<int, Tank> _tanksP2 = new();
    private readonly Dictionary<Vector, Hex> _hexes = new();

    private bool _turnP1; // starts false: player 2 acts first on turn 1, as in the Go version
    private int _turn = 1;

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

    // Plays one turn and returns what each player gets to see.
    public (List<TurnResultDto> ForPlayer1, List<TurnResultDto> ForPlayer2) ResolveActions(
        List<TankActionDto> actionsP1, List<TankActionDto> actionsP2)
    {
        var p1 = new Side(_tanksP1, new List<TurnResultDto>());
        var p2 = new Side(_tanksP2, new List<TurnResultDto>());

        // The players take turns acting first.
        if (_turnP1)
        {
            ResolvePlayer(actionsP1, p1, p2);
            ResolvePlayer(actionsP2, p2, p1);
        }
        else
        {
            ResolvePlayer(actionsP2, p2, p1);
            ResolvePlayer(actionsP1, p1, p2);
        }

        _turnP1 = !_turnP1;
        foreach (var tank in _tanksP1.Values.Concat(_tanksP2.Values))
        {
            tank.Exercised = false;
        }
        _turn++;

        return (p1.Results, p2.Results);
    }

    private void ResolvePlayer(List<TankActionDto> actions, Side player, Side enemy)
    {
        foreach (var action in actions)
        {
            // Each living tank may do one thing per turn.
            if (!player.Tanks.TryGetValue(action.Id, out var tank) || tank.Exercised || tank.Destroyed)
            {
                continue;
            }
            tank.Exercised = true;

            switch (action.Type)
            {
                case TankActionType.Move:
                    ResolveMove(action.Path ?? [], tank, player, enemy);
                    break;
            }
        }
    }

    private void ResolveMove(List<Vector> requestedPath, Tank tank, Side player, Side enemy)
    {
        var path = ValidPath(requestedPath, tank);
        if (path.Count < 2)
        {
            return;
        }

        ReportTankAction(new Move2ResultDto(tank.Id, path[0], path[1], true), tank, player, enemy);

        // Walk the path one hex at a time; visibility can change at every step.
        for (int i = 0; i < path.Count - 2; i++)
        {
            tank.Position = path[i + 1];
            ReportTankAction(new Move3ResultDto(tank.Id, path[i], path[i + 1], path[i + 2]), tank, player, enemy);
        }

        int last = path.Count - 1;
        tank.Position = path[last];
        ReportTankAction(new Move2ResultDto(tank.Id, path[last - 1], path[last], false), tank, player, enemy);
    }

    // The owner always sees what their tank does; the enemy only if the tank is visible.
    private static void ReportTankAction(TurnResultDto result, Tank tank, Side player, Side enemy)
    {
        player.Results.Add(result);
        if (tank.Visible)
        {
            enemy.Results.Add(result);
        }
    }

    private Tank? FindTankAt(Vector position) =>
        _tanksP1.Values.Concat(_tanksP2.Values).FirstOrDefault(t => !t.Destroyed && t.Position == position);

    private bool IsTraversable(Vector position) =>
        _hexes.TryGetValue(position, out var hex) && hex.Traversable && FindTankAt(position) == null;

    // Keeps the longest valid beginning of the requested path.
    private List<Vector> ValidPath(List<Vector> path, Tank tank)
    {
        var valid = new List<Vector>();
        if (path.Count < 2 || path.Count > _config.DriveRange + 1 || path[0] != tank.Position)
        {
            return valid;
        }

        for (int i = 1; i < path.Count; i++)
        {
            var step = path[i];
            bool ok = IsTraversable(step)
                && step != tank.Position
                && !valid.Contains(step)
                && step.Sub(path[i - 1]).IsUnit();
            if (!ok)
            {
                break;
            }

            if (i == 1)
            {
                valid.Add(path[0]);
            }
            valid.Add(step);
        }
        return valid;
    }
}
