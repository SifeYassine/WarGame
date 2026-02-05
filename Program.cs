var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseDefaultFiles(); // "/" serves wwwroot/index.html
app.UseStaticFiles();  // serves everything else in wwwroot (js, css, assets)

app.Run("http://localhost:8000");
