using WarGame.Services;

var builder = WebApplication.CreateBuilder(args);

// Register services in the DI container.
// Singleton = one shared instance for the whole app (all rooms live in one RoomManager).
builder.Services.AddSingleton<IGameConfigFactory, BasicGameConfigFactory>();
builder.Services.AddSingleton<IRoomManager, RoomManager>();
builder.Services.AddSingleton<GameWebSocketHandler>();

var app = builder.Build();

app.UseDefaultFiles(); // "/" serves wwwroot/index.html
app.UseStaticFiles();  // serves everything else in wwwroot (js, css, assets)
app.UseWebSockets();

// The browser connects to ws://localhost:8000/ws
app.Map("/ws", async (HttpContext context, GameWebSocketHandler handler) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    await handler.HandleAsync(socket);
});

app.Run("http://localhost:8000");
