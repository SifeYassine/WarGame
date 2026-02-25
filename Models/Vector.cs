namespace WarGame.Models;

// A cell (or a direction) on the hex grid, in axial coordinates.
// A "record struct" compares by value: two Vectors with the same X and Y
// are equal, which is what lets us use Vector as a Dictionary key.
public readonly record struct Vector(int X, int Y)
{
    public static readonly Vector Zero = new(0, 0);

    public Vector Add(Vector other) => new(X + other.X, Y + other.Y);

    public Vector Sub(Vector other) => new(X - other.X, Y - other.Y);

    // Number of hex steps between two cells.
    public int DistanceTo(Vector other)
    {
        var diff = Sub(other);
        return Math.Max(Math.Abs(diff.X), Math.Max(Math.Abs(diff.Y), Math.Abs(diff.X + diff.Y)));
    }

    // True when the vector points to a neighbouring cell.
    public bool IsUnit() => DistanceTo(Zero) == 1;
}
