import json
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


SOURCE_URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage"
WINNER_GROUPS = ("A", "B", "D", "E", "G", "I", "K", "L")


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self.table = None
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.table = []
        elif self.table is not None and tag == "tr":
            self.row = []
        elif self.row is not None and tag in ("td", "th"):
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if self.row:
                self.table.append(self.row)
            self.row = None
        elif tag == "table" and self.table is not None:
            self.tables.append(self.table)
            self.table = None


request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "RoadTo26Fixture/1.0"})
parser = TableParser()
with urllib.request.urlopen(request) as response:
    parser.feed(response.read().decode())

table = next(table for table in parser.tables if len(table) == 496)
combinations = {}
for row in table[1:]:
    qualified_groups = "".join(value for value in row[1:13] if value in "ABCDEFGHIJKL")
    assignments = [value.removeprefix("3") for value in row[-8:]]
    combinations[qualified_groups] = dict(zip(WINNER_GROUPS, assignments))

if len(combinations) != 495:
    raise RuntimeError(f"Expected 495 combinations, found {len(combinations)}")

output = Path(__file__).resolve().parents[1] / "third-place-combinations.js"
payload = json.dumps(combinations, ensure_ascii=True, separators=(",", ":"), sort_keys=True)
output.write_text(
    "// Generated from FIFA World Cup 2026 Regulations, Annex C.\n"
    f"window.thirdPlaceCombinations={payload};\n",
    encoding="ascii",
)
