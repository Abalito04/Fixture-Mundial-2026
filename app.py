import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Flask, Response, jsonify, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OPENFOOTBALL_SNAPSHOT = DATA_DIR / "openfootball-worldcup2026.json"
ZAFRONIX_SNAPSHOT = DATA_DIR / "zafronix-tournament2026.json"
ZAFRONIX_TOURNAMENT_2026_URL = "https://api.zafronix.com/fifa/worldcup/v1/tournaments/2026"
API_FOOTBALL_FIXTURES_2026_URL = "https://v3.football.api-sports.io/fixtures"
API_TIMEOUT_SECONDS = 20
API_FOOTBALL_CACHE_SECONDS = int(os.environ.get("API_FOOTBALL_CACHE_SECONDS", "300"))
api_football_cache = {"body": None, "fetched_at": 0.0}

app = Flask(__name__, static_folder=None)


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename):
    allowed_suffixes = {".css", ".js", ".png", ".ico", ".svg", ".json"}
    path = (BASE_DIR / filename).resolve()
    if BASE_DIR not in path.parents and path != BASE_DIR:
        return ("Not found", 404)
    if path.suffix not in allowed_suffixes:
        return ("Not found", 404)
    return send_from_directory(BASE_DIR, filename)


@app.get("/api/openfootball/worldcup2026")
def openfootball_snapshot():
    return json_file(OPENFOOTBALL_SNAPSHOT)


@app.get("/api/api-football/worldcup2026")
def api_football_worldcup2026():
    live_response = fetch_api_football_fixtures()
    if live_response:
        return live_response
    return jsonify({"error": "No se pudo traer API-Football."}), 502


@app.get("/api/zafronix/tournament2026")
def zafronix_snapshot():
    live_response = fetch_zafronix_tournament()
    if live_response:
        return live_response
    return json_file(ZAFRONIX_SNAPSHOT)


@app.get("/health")
def health():
    return jsonify({"ok": True})


def json_file(path, source="local-snapshot"):
    if not path.exists():
        return jsonify({"error": f"No existe {path.name}"}), 404
    return Response(
        path.read_text(encoding="utf-8"),
        mimetype="application/json",
        headers={"X-Data-Source": source},
    )


def fetch_zafronix_tournament():
    api_key = os.environ.get("ZAFRONIX_API_KEY")
    if not api_key:
        return None

    request = Request(
        ZAFRONIX_TOURNAMENT_2026_URL,
        headers={"X-API-Key": api_key},
    )

    try:
        with urlopen(request, timeout=API_TIMEOUT_SECONDS) as response:
            return Response(
                response.read(),
                mimetype="application/json",
                headers={"X-Data-Source": "zafronix-live"},
            )
    except (HTTPError, URLError, TimeoutError, OSError):
        return None


def fetch_api_football_fixtures():
    api_key = os.environ.get("API_FOOTBALL_KEY")
    if not api_key:
        return None

    now = time.time()
    cache_age = now - api_football_cache["fetched_at"]
    if api_football_cache["body"] and cache_age < API_FOOTBALL_CACHE_SECONDS:
        return Response(
            api_football_cache["body"],
            mimetype="application/json",
            headers={
                "X-Data-Source": "api-football-cache",
                "X-Cache-Seconds": str(API_FOOTBALL_CACHE_SECONDS),
            },
        )

    league_id = os.environ.get("API_FOOTBALL_WORLD_CUP_LEAGUE_ID", "1")
    season = os.environ.get("API_FOOTBALL_WORLD_CUP_SEASON", "2026")
    url = f"{API_FOOTBALL_FIXTURES_2026_URL}?league={league_id}&season={season}"
    request = Request(url, headers={"x-apisports-key": api_key})

    try:
        with urlopen(request, timeout=API_TIMEOUT_SECONDS) as response:
            body = response.read()
            api_football_cache["body"] = body
            api_football_cache["fetched_at"] = now
            return Response(
                body,
                mimetype="application/json",
                headers={
                    "X-Data-Source": "api-football-live",
                    "X-Cache-Seconds": str(API_FOOTBALL_CACHE_SECONDS),
                },
            )
    except (HTTPError, URLError, TimeoutError, OSError):
        if api_football_cache["body"]:
            return Response(
                api_football_cache["body"],
                mimetype="application/json",
                headers={
                    "X-Data-Source": "api-football-stale-cache",
                    "X-Cache-Seconds": str(API_FOOTBALL_CACHE_SECONDS),
                },
            )
        return None

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
