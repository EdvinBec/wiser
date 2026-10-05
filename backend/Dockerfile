# =========================
# Build
# =========================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build

WORKDIR /src

# restore
COPY ["backend/*.csproj", "Backend/"]
WORKDIR /src/Backend
RUN dotnet restore

# build + publish
COPY ["backend/", "Backend/"]
WORKDIR /src/Backend
RUN dotnet publish "backend.csproj" -c Release -o /app/publish

# =========================
# Runtime
# =========================
# No browser and no Chromium system libraries: timetables used to be scraped with Playwright and
# are now read over plain HTTP from the published Wise web layer. That removed a browser download
# from the build and roughly eighteen apt packages from this image.
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
ENV ASPNETCORE_HTTP_PORTS=5013
WORKDIR /app
EXPOSE 5013

COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "backend.dll"]
