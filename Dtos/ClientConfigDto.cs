using WarGame.Models;

namespace WarGame.Dtos;

// The part of the game config a player is allowed to know, from their point of view.
public record ClientConfigDto(
    List<TankConfig> PlayerTanks,
    List<TankConfig> EnemyTanks,
    List<SceneConfig> Hexes,
    List<SceneConfig> Sites,
    int DriveRange,
    int VisibilityRange,
    int FireRange,
    Vector Center)
{
    public static ClientConfigDto FromGameConfig(GameConfig config, bool forPlayer1) => new(
        forPlayer1 ? config.TanksP1 : config.TanksP2,
        forPlayer1 ? config.TanksP2 : config.TanksP1,
        config.Hexes,
        config.Sites,
        config.DriveRange,
        config.VisibilityRange,
        config.FireRange,
        config.Center);
}
