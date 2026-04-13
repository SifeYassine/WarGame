using WarGame.Services;

var builder = WebApplication.CreateBuilder(args);

// Register services in the DI container.
// Singleton = one shared instance for the whole app (all rooms live in one RoomManager).
builder.Services.AddSingleton<IGameConfigFactory, BasicGameConfigFactory>();
builder.Services.AddSingleton<IRoomManager, RoomManager>();

var app = builder.Build();

app.UseDefaultFiles(); // "/" serves wwwroot/index.html
app.UseStaticFiles();  // serves everything else in wwwroot (js, css, assets)

app.Run("http://localhost:8000");
