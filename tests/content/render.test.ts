import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/lib/content/render";

describe("renderMarkdown", () => {
  it("renders ordinary Markdown", async () => {
    const html = await renderMarkdown("Hola **mundo**");

    expect(html).toContain("<strong>mundo</strong>");
  });

  it("keeps the paragraph structure", async () => {
    const html = await renderMarkdown("Uno\n\nDos");

    expect(html).toContain("<p>Uno</p>");
    expect(html).toContain("<p>Dos</p>");
  });

  it("discards raw HTML instead of passing it through", async () => {
    const html = await renderMarkdown("Hola <script>alert(1)</script>");

    // The tags are dropped. The text that sat between them survives as inert
    // text content, which is harmless and keeps the prose intact.
    expect(html).not.toContain("<script");
    expect(html).not.toContain("</script");
    expect(html).toBe("<p>Hola alert(1)</p>");
  });

  it("strips a script element written as raw HTML", async () => {
    const html = await renderMarkdown("<script>steal()</script>");

    expect(html).not.toContain("<script");
    expect(html).not.toContain("steal()");
  });

  it("strips event handler attributes", async () => {
    const html = await renderMarkdown('<div onclick="steal()">hola</div>');

    expect(html).not.toContain("onclick");
    expect(html).not.toContain("steal()");
  });

  it("neutralises javascript: links", async () => {
    const html = await renderMarkdown("[click](javascript:alert(1))");

    expect(html).not.toContain("javascript:");
  });

  it("keeps ordinary links", async () => {
    const html = await renderMarkdown("[sitio](https://example.com)");

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders lists and quotes", async () => {
    const html = await renderMarkdown("- uno\n- dos\n\n> cita");

    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
    expect(html).toContain("<blockquote>");
  });

  it("renders emphasis and headings", async () => {
    const html = await renderMarkdown("## Título\n\n*énfasis*");

    expect(html).toContain("<h2>");
    expect(html).toContain("<em>énfasis</em>");
  });

  it("returns an empty string for empty input", async () => {
    expect(await renderMarkdown("")).toBe("");
  });
});
