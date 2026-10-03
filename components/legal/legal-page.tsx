import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MarkdownLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (href && href.startsWith("/")) {
    // SAFETY: internal links are validated site-relative by the startsWith
    // check above, so this satisfies the typed-routes literal constraint.
    return <Link href={href as never}>{children}</Link>;
  }
  return <a href={href}>{children}</a>;
}

export async function LegalPage({ slug }: { slug: "terms" | "privacy" }) {
  const raw = await readFile(join(process.cwd(), `content/legal/${slug}.md`), "utf-8");
  const { content } = matter(raw);

  return (
    <main className="typeset typeset-docs mx-auto w-full max-w-[37em] flex-1 p-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
        {content}
      </ReactMarkdown>
    </main>
  );
}
