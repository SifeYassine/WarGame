namespace WarGame.Models;

public class Hex
{
    public Hex(Vector position)
    {
        Position = position;
    }

    public Vector Position { get; }

    // False when a site (building) stands on the hex.
    public bool Traversable { get; set; } = true;
}
