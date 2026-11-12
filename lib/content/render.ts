import type { Element, Root } from "hast";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/**
 * Server-side Markdown rendering.
 *
 * The pipeline deliberately drops raw HTML *before* sanitising, so a content
 * file cannot inject markup that the sanitiser then has to reason about.
 * `rehype-sanitize` runs afterwards as an independent second line of defence.
 *
 * These functions are free of any environment access so they can be unit
 * tested in isolation.
 */

/**
 * The allow-list of tags and attributes the rendered letter may contain.
 *
 * It extends the sanitiser's default schema with the two attributes we add
 * ourselves to external links.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.["a"] ?? []), "target", "rel"],
    code: [...(defaultSchema.attributes?.["code"] ?? []), "className"],
    span: [...(defaultSchema.attributes?.["span"] ?? []), "className"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "span",
    "del",
    "hr",
  ],
};

/** Add safe `target`/`rel` attributes to links that leave the site. */
function hardenExternalLinks() {
  return (tree: Root): void => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "a") {
        return;
      }

      const href = node.properties?.["href"];

      if (typeof href !== "string" || !href.startsWith("http")) {
        return;
      }

      node.properties = {
        ...node.properties,
        target: "_blank",
        // `rel` is a space-separated list in hast.
        rel: ["noopener", "noreferrer"],
      };
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize, sanitizeSchema)
  .use(hardenExternalLinks)
  .use(rehypeStringify);

/**
 * Convert Markdown to sanitized HTML.
 *
 * The result is safe to inject with `dangerouslySetInnerHTML`.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await processor.process(markdown);
  return String(file);
}

/**
 * Convert Markdown to sanitized HTML, split into top-level blocks.
 *
 * One HTML string per top-level block, so the letter can be revealed block by
 * block without any client-side parsing.
 */
export async function renderMarkdownBlocks(markdown: string): Promise<string[]> {
  const tree = await processor.run(processor.parse(markdown));

  const blocks: Root[] = [];
  let current: Root = { type: "root", children: [] };

  for (const child of tree.children) {
    if (child.type === "text" && child.value.trim() === "") {
      // Whitespace between blocks carries no meaning.
      continue;
    }

    if (child.type === "element") {
      if (current.children.length > 0) {
        blocks.push(current);
        current = { type: "root", children: [] };
      }
    }

    current.children.push(child);
  }

  if (current.children.length > 0) {
    blocks.push(current);
  }

  return blocks.map((block) => processor.stringify(block));
}
