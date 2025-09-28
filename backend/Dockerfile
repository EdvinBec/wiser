# =========================
# Build
# =========================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

# restore
COPY ["backend/*.csproj", "Backend/"]
WORKDIR /src/Backend
RUN dotnet restore

# build
COPY ["backend/", "Backend/"]
WORKDIR /src/Backend
RUN dotnet build "backend.csproj" -c Release -o /app/build

# =========================
# Publish (+ install Playwright browsers into a fixed path)
# =========================
FROM build AS publish
WORKDIR /src/Backend
RUN dotnet publish "backend.csproj" -c Release -o /app/publish

# Install Playwright CLI and download Chromium into /ms-playwright (not user cache)
RUN dotnet tool install --global Microsoft.Playwright.CLI
ENV PATH="$PATH:/root/.dotnet/tools"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN playwright install chromium

# =========================
# Final runtime (ASP.NET + runtime deps + bundled browsers)
# =========================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
ENV ASPNETCORE_HTTP_PORTS=5013
WORKDIR /app
EXPOSE 5013

# OS libraries Chromium/Playwright require on Debian 12 (bookworm)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
    libgtk-3-0 libpangocairo-1.0-0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libatspi2.0-0 libcups2 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# App + preinstalled browsers
COPY --from=publish /app/publish .
COPY --from=publish /ms-playwright /ms-playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

ENTRYPOINT ["dotnet", "backend.dll"]
