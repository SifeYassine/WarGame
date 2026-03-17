namespace WarGame.Models;

// The numbers must match the TypeScript enums in web/src.

public enum TankActionType
{
    Move = 1,
    Fire = 2,
}

public enum GameResult
{
    Win = 1,
    Draw = 2,
    Lose = 3,
}

public enum TurnResultType
{
    Move2 = 1,
    Move3 = 2,
    Fire = 3,
    Explosion = 4,
    Destroyed = 5,
    Visible = 6,
    Shrink = 7,
}
