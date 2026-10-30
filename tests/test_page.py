"""Page tests: index.html structure, asset wiring, and the JS renderer.

The renderer (assets/app.js) is a plain ES module whose pure functions are
exercised directly by a Node harness (tests/js/renderer.test.mjs). That keeps
the whole suite offline: no browser is launched, no network is touched.
"""

import re
import shutil
import subprocess
from html.parser import HTMLParser

import pytest

from helpers import (
    APP_JS_PATH,
    DATA_PATH,
    DATA_URL,
    INDEX_PATH,
    ROOT,
    STYLES_PATH,
    load_data,
)


class PageParser(HTMLParser):
    VOID = {
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "source", "track", "wbr",
    }

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.stack = []
        self.unclosed = []
        self.script_srcs = []
        self.hrefs = []
        self.lang = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.lang = attrs.get("lang", self.lang)
        if tag not in self.VOID:
            self.stack.append(tag)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "script" and "src" in attrs:
            self.script_srcs.append((attrs.get("type"), attrs["src"]))
        if tag == "link" and "href" in attrs:
            self.hrefs.append(attrs["href"])

    def handle_startendtag(self, tag, attrs):
        if "id" in dict(attrs):
            self.ids.add(attrs["id"])

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            self.unclosed.append(tag)


@pytest.fixture(scope="module")
def html():
    return INDEX_PATH.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def parsed(html):
    parser = PageParser()
    parser.feed(html)
    parser.close()
    return parser


@pytest.fixture(scope="module")
def data():
    return load_data()


def test_doctype_and_lang(html, parsed):
    assert html.lstrip().lower().startswith("<!doctype html>")
    assert parsed.lang == "en", "html tag must carry lang=\"en\""


def test_html_tags_balanced(parsed):
    assert not parsed.unclosed, f"badly nested tags: {parsed.unclosed}"
    assert not parsed.stack, f"never closed: {parsed.stack}"


def test_required_control_ids(parsed):
    required = {"search", "category", "sort", "count", "cards", "data-meta"}
    missing = sorted(required - parsed.ids)
    assert not missing, f"index.html is missing ids: {missing}"


def test_assets_exist_and_are_linked(parsed, html):
    assert APP_JS_PATH.is_file(), "assets/app.js is missing"
    assert STYLES_PATH.is_file(), "assets/styles.css is missing"
    assert ("module", "assets/app.js") in parsed.script_srcs, (
        "index.html must load assets/app.js as an ES module"
    )
    assert "assets/styles.css" in parsed.hrefs


def test_app_js_fetches_data_file(html):
    assert f'"{DATA_URL}"' in APP_JS_PATH.read_text(encoding="utf-8"), (
        f"assets/app.js must fetch {DATA_URL}"
    )
    assert DATA_PATH.is_file()


def test_credit_present(html):
    assert "Asdale Dynamics, LLC" in html, "page must credit Asdale Dynamics, LLC"


# --- renderer tests (run through Node, no browser) --------------------------


@pytest.fixture(scope="module")
def node():
    node_bin = shutil.which("node")
    if node_bin is None:  # pragma: no cover - depends on environment
        pytest.skip("Node.js not installed; renderer tests skipped")
    return node_bin


@pytest.fixture()
def run_renderer(node):
    def run():
        proc = subprocess.run(
            [node, "tests/js/renderer.test.mjs"],
            capture_output=True,
            text=True,
            cwd=ROOT,
        )
        return proc

    return run


def test_renderer_suite_passes(run_renderer):
    proc = run_renderer()
    assert proc.returncode == 0, (
        f"renderer tests failed in Node\nstdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
    )
    assert "PASS" in proc.stdout, proc.stdout


def test_app_js_hooks_match_page_ids(parsed):
    """Every element id the JS wiring touches must exist on the page."""
    js = APP_JS_PATH.read_text(encoding="utf-8")
    hooked = set(re.findall(r"getElementById\(\s*\"([\w-]+)\"\s*\)", js))
    missing = sorted(hooked - parsed.ids)
    assert not missing, f"JS expects ids missing from index.html: {missing}"
    assert hooked, "renderer should wire up at least one element id"
