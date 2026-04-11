using WarGame.Dtos;
using WarGame.Services;

namespace WarGame.Game;

public enum RoomStatus
{
    WaitingForPlayers,
    Running,
    Closed,
}

// One match between two players.
public class GameRoom
{
    // Both players' connections call into the same room at the same time.
    // This lock lets only one of them in at a time (it works with await, unlike "lock").
    private readonly SemaphoreSlim _lock = new(1, 1);

    private readonly IGameConfigFactory _configFactory;
    private readonly Action<string> _onClosed;

    private RoomStatus _status = RoomStatus.WaitingForPlayers;
    private PlayerConnection? _player1;
    private PlayerConnection? _player2;
    private GameState? _game;

    // null = that player hasn't sent their turn yet.
    private List<TankActionDto>? _actionsP1;
    private List<TankActionDto>? _actionsP2;

    public GameRoom(string code, IGameConfigFactory configFactory, Action<string> onClosed)
    {
        Code = code;
        _configFactory = configFactory;
        _onClosed = onClosed;
    }

    public string Code { get; }

    // Returns false when the room can't be joined (full or finished).
    public async Task<bool> TryJoinAsync(PlayerConnection player)
    {
        await _lock.WaitAsync();
        try
        {
            if (_status != RoomStatus.WaitingForPlayers)
            {
                return false;
            }

            player.Room = this;
            await player.SendAsync(new RoomJoinedMessageDto());

            if (_player1 == null)
            {
                _player1 = player;
                return true;
            }

            // Second player arrived: start the game.
            _player2 = player;
            var config = _configFactory.Create();
            _game = new GameState(config);
            _status = RoomStatus.Running;

            await _player1.SendAsync(new StartGameMessageDto(ClientConfigDto.FromGameConfig(config, forPlayer1: true)));
            await _player2.SendAsync(new StartGameMessageDto(ClientConfigDto.FromGameConfig(config, forPlayer1: false)));
            return true;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task SubmitTurnAsync(PlayerConnection player, List<TankActionDto> actions)
    {
        await _lock.WaitAsync();
        try
        {
            if (_status != RoomStatus.Running || _game == null)
            {
                return;
            }

            if (player == _player1)
            {
                _actionsP1 = actions;
            }
            else if (player == _player2)
            {
                _actionsP2 = actions;
            }

            // Wait until both players have sent their turn.
            if (_actionsP1 == null || _actionsP2 == null)
            {
                return;
            }

            var (resultsP1, resultsP2) = _game.ResolveActions(_actionsP1, _actionsP2);
            _actionsP1 = null;
            _actionsP2 = null;

            await _player1!.SendAsync(new TurnResultsMessageDto(resultsP1));
            await _player2!.SendAsync(new TurnResultsMessageDto(resultsP2));
        }
        finally
        {
            _lock.Release();
        }
    }
}
