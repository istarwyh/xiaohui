#!/usr/bin/env python3
"""Check the English sharing journey against a generated Quartz site."""

import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.anchors = []
        self.links = []
        self.ids = set()
        self.lang = None
        self.h1_count = 0
        self.diagram_count = 0
        self.text = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "code" and "mermaid" in attrs.get("class", "").split():
            self.diagram_count += 1
        if tag == "h1":
            self.h1_count += 1
        if tag == "a" and "href" in attrs:
            self.anchors.append(attrs)
        if tag == "link":
            self.links.append(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])

    def handle_data(self, data):
        self.text.append(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-dir", default="public")
    site = Path(parser.parse_args().site_dir).resolve()
    origin = "https://xiaohui.cool"
    routes = [
        "/",
        "/en/",
        "/en/program/practices/reliable-agent-systems",
        "/en/program/llm/insurance-report-production",
        "/en/program/llm/deep-research-context-engineering",
    ]

    def local_file(url):
        path = unquote(urlparse(url).path).lstrip("/")
        bare = site / path
        candidates = [bare, site / (path.rstrip("/") + ".html"), bare / "index.html"]
        return next((p for p in candidates if p.is_file()), None)

    checked_links = 0
    for route in routes:
        url = origin + route
        target = local_file(url)
        assert target, f"Missing page: {route}"
        page = Page(target)
        assert page.h1_count == 1, f"Expected one page heading: {route}"
        canonical = next(x["href"] for x in page.links if x.get("rel") == "canonical")
        assert canonical == url, f"Unexpected canonical: {canonical}"
        if route.startswith("/en/"):
            assert page.lang == "en", f"Wrong document language: {route}"
            alternates = {x.get("hreflang"): x.get("href") for x in page.links if x.get("hreflang")}
            assert alternates.get("en") == url, f"Missing self alternate: {route}"
            assert local_file(alternates["zh-CN"]), f"Missing Chinese source: {route}"
        for link in page.anchors:
            href = urljoin(url, link["href"])
            parsed = urlparse(href)
            if parsed.scheme not in ("http", "https") or parsed.netloc != "xiaohui.cool":
                continue
            assert not parsed.path.startswith("/en/en/"), f"Repeated language prefix: {href}"
            assert local_file(href), f"Broken local link on {route}: {href}"
            checked_links += 1
        if route == "/":
            assert any(urljoin(url, x["href"]) == origin + "/en/" for x in page.anchors)
        if route == "/en/":
            featured = [x for x in page.anchors if "home-featured-item" in x.get("class", "").split()]
            feed = [x for x in page.anchors if "feed-card-title" in x.get("class", "").split()]
            assert len(featured) == 6 and len(feed) >= 3
            expected = {
                "/en/program/practices/reliable-agent-systems",
                "/en/program/llm/insurance-report-production",
                "/en/program/llm/deep-research-context-engineering",
            }
            assert {urlparse(urljoin(url, x["href"])).path for x in feed[:3]} == expected
            assert "Recently updated first" in " ".join(page.text)
            text = " ".join(page.text)
            assert "此文件夹" not in text, "English homepage includes generated folder listing"
        if route.startswith("/en/program/"):
            assert page.diagram_count > 0, f"Missing architecture diagram: {route}"
            assert any(
                "internal" in x.get("class", "").split()
                and "/en/program/" in urljoin(url, x["href"])
                and urljoin(url, x["href"]) != url
                for x in page.anchors
            ), f"Missing onward English reading: {route}"
    print(f"English sharing checks passed: {len(routes)} pages, {checked_links} local links.")


if __name__ == "__main__":
    main()
