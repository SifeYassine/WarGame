namespace WarGame.Models;

public class Tank
{
    public Tank(int id, Vector position)
    {
        Id = id;
        Position = position;
    }

    public int Id { get; }
    public Vector Position { get; set; }

    // Already moved or fired this turn.
    public bool Exercised { get; set; }

    // Currently visible to the opponent.
    public bool Visible { get; set; }

    public bool Destroyed { get; set; }

    // The opponent has already been told about this wreck.
    public bool Seen { get; set; }
}
