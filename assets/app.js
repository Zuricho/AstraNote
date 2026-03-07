import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1";
import htm from "https://esm.sh/htm@3.1.1";
import {
  Mathematics,
  createMathMigrateTransaction,
  mathMigrationRegex,
} from "https://esm.sh/@tiptap/extension-mathematics@3.17.1?deps=react@18.3.1,react-dom@18.3.1";
import {
  EditorContent,
  useEditor,
} from "https://esm.sh/@tiptap/react@3.17.1?deps=react@18.3.1,react-dom@18.3.1";
import StarterKit from "https://esm.sh/@tiptap/starter-kit@3.17.1";
import Placeholder from "https://esm.sh/@tiptap/extension-placeholder@3.17.1";
import { marked } from "https://esm.sh/marked@17.0.1";

const html = htm.bind(React.createElement);

const VIEW = {
  visual: "visual",
  markdown: "markdown",
};

const initialMarkdown = `# AstraNote

This editor keeps one **Markdown string** as the source of truth.

## Editing modes

- **Visual** mode uses TipTap for WYSIWYG editing
- **Markdown** mode gives direct source editing

> The app converts Markdown to HTML for TipTap, then converts TipTap HTML back into Markdown.
`;

marked.setOptions({
  breaks: true,
  gfm: true,
});

function downloadMarkdown(markdown) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "astranote.md";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function wrapSelection(textarea, value, onChange, prefix, suffix = prefix) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const nextValue =
    value.slice(0, start) + prefix + selected + suffix + value.slice(end);
  onChange(nextValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + prefix.length, end + prefix.length);
  });
}

function prefixSelection(textarea, value, onChange, prefix) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const block = value.slice(lineStart, end);
  const nextBlock = block
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
  const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(end);
  onChange(nextValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineStart + nextBlock.length);
  });
}

function wrapBlockSelection(textarea, value, onChange, prefix, suffix) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end).trim() || "x^2";
  const nextValue =
    value.slice(0, start) + `${prefix}\n${selected}\n${suffix}` + value.slice(end);
  onChange(nextValue);
  requestAnimationFrame(() => {
    textarea.focus();
  });
}

function escapeMarkdownText(value) {
  return value.replace(/\\/g, "\\\\");
}

function serializeTextNode(node) {
  let text = escapeMarkdownText(node.text || "");
  const marks = node.marks || [];
  const hasCode = marks.some((mark) => mark.type === "code");

  if (hasCode) {
    return `\`${text}\``;
  }

  if (marks.some((mark) => mark.type === "bold")) {
    text = `**${text}**`;
  }

  if (marks.some((mark) => mark.type === "italic")) {
    text = `*${text}*`;
  }

  return text;
}

function serializeInline(nodes = []) {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return serializeTextNode(node);
        case "inlineMath":
          return `$${node.attrs?.latex || ""}$`;
        case "hardBreak":
          return "  \n";
        default:
          return "";
      }
    })
    .join("");
}

function indentBlock(text, prefix) {
  return text
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : prefix.trimEnd()))
    .join("\n");
}

function serializeListItem(node, depth, ordered, index) {
  const marker = ordered ? `${index + 1}. ` : "- ";
  const indent = "  ".repeat(depth);
  const childBlocks = [];

  for (const child of node.content || []) {
    if (child.type === "paragraph") {
      childBlocks.push(`${indent}${marker}${serializeInline(child.content)}`);
    } else if (child.type === "bulletList") {
      childBlocks.push(serializeNode(child, depth + 1).trimEnd());
    } else if (child.type === "orderedList") {
      childBlocks.push(serializeNode(child, depth + 1).trimEnd());
    } else {
      childBlocks.push(`${indent}${marker}${serializeNode(child, depth + 1).trim()}`);
    }
  }

  return childBlocks.join("\n");
}

function serializeNode(node, depth = 0) {
  switch (node.type) {
    case "doc":
      return (node.content || []).map((child) => serializeNode(child, depth)).join("").trimEnd() + "\n";
    case "paragraph":
      return `${serializeInline(node.content)}\n\n`;
    case "heading":
      return `${"#".repeat(node.attrs?.level || 1)} ${serializeInline(node.content)}\n\n`;
    case "blockquote": {
      const body = (node.content || [])
        .map((child) => serializeNode(child, depth).trim())
        .filter(Boolean)
        .join("\n\n");
      return `${indentBlock(body, "> ")}\n\n`;
    }
    case "bulletList":
      return `${(node.content || [])
        .map((child, index) => serializeListItem(child, depth, false, index))
        .join("\n")}\n\n`;
    case "orderedList":
      return `${(node.content || [])
        .map((child, index) => serializeListItem(child, depth, true, index))
        .join("\n")}\n\n`;
    case "codeBlock": {
      const language = node.attrs?.language ? node.attrs.language : "";
      const text = (node.content || []).map((child) => child.text || "").join("");
      return `\`\`\`${language}\n${text}\n\`\`\`\n\n`;
    }
    case "horizontalRule":
      return `---\n\n`;
    default:
      return "";
  }
}

function serializeDocument(json) {
  return serializeNode(json).replace(/\n{3,}/g, "\n\n").trimEnd();
}

function extractTableOfContents(markdown) {
  return markdown
    .split("\n")
    .map((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);

      if (!match) {
        return null;
      }

      return {
        level: match[1].length,
        title: match[2].trim(),
      };
    })
    .filter(Boolean);
}

function migrateMath(editor) {
  if (!editor) return;
  const transaction = createMathMigrateTransaction(
    editor,
    editor.state.tr,
    mathMigrationRegex,
  );

  if (transaction.docChanged) {
    editor.view.dispatch(transaction);
    return true;
  }

  return false;
}

function migrateMultilineBlockMath(editor) {
  return false;
}

function getLatexInput(defaultValue, label) {
  const value = window.prompt(label, defaultValue);
  return value === null ? null : value.trim();
}

function IconButton({ title, onClick, children }) {
  return html`
    <button
      type="button"
      title=${title}
      onClick=${onClick}
      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-clay/40 hover:text-clay dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-clay/50 dark:hover:text-orange-200"
    >
      ${children}
    </button>
  `;
}

function ModeToggle({ view, setView }) {
  const base =
    "rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none";
  const active =
    "bg-ink text-white shadow-sm dark:bg-slate-100 dark:text-slate-900";
  const idle =
    "text-slate-600 hover:text-ink dark:text-slate-300 dark:hover:text-white";

  return html`
    <div className="inline-flex rounded-full border border-slate-200 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-900/70">
      <button
        type="button"
        className=${`${base} ${view === VIEW.visual ? active : idle}`}
        onClick=${() => setView(VIEW.visual)}
      >
        Visual
      </button>
      <button
        type="button"
        className=${`${base} ${view === VIEW.markdown ? active : idle}`}
        onClick=${() => setView(VIEW.markdown)}
      >
        Markdown
      </button>
    </div>
  `;
}

const VisualEditor = forwardRef(function VisualEditor(
  { markdown, onChange },
  ref,
) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Mathematics.configure({
        inlineOptions: {
          onClick: (node, pos) => {
            const latex = getLatexInput(
              node.attrs.latex || "",
              "Edit inline LaTeX",
            );
            if (latex !== null) {
              editor.chain().setNodeSelection(pos).updateInlineMath({ latex }).focus().run();
            }
          },
        },
        katexOptions: {
          throwOnError: false,
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing your note...",
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[55vh] px-1 focus:outline-none dark:prose-invert prose-headings:font-semibold prose-p:leading-7 prose-blockquote:border-l-clay prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-300 prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.9em] prose-code:text-clay prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-slate-800/80 dark:prose-code:text-orange-200 prose-pre:rounded-[1.5rem] prose-pre:bg-slate-950 prose-pre:px-5 prose-pre:py-4 prose-pre:text-slate-100 dark:prose-pre:bg-black prose-pre:shadow-lg prose-pre:before:content-none prose-pre:after:content-none prose-pre:overflow-x-auto prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:text-inherit prose-pre:code:rounded-none",
      },
    },
    content: marked.parse(markdown),
    onCreate: ({ editor: currentEditor }) => {
      if (migrateMultilineBlockMath(currentEditor)) {
        return;
      }
      migrateMath(currentEditor);
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (migrateMultilineBlockMath(currentEditor)) {
        return;
      }
      if (migrateMath(currentEditor)) {
        return;
      }
      onChange(serializeDocument(currentEditor.getJSON()));
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const editorMarkdown = serializeDocument(editor.getJSON()).trim();
    if (editorMarkdown !== markdown.trim() && !editor.isFocused) {
      editor.commands.setContent(marked.parse(markdown), false);
      migrateMath(editor);
    }
  }, [editor, markdown]);

  useImperativeHandle(
    ref,
    () => ({
      execute(action) {
        if (!editor) return;
        const chain = editor.chain().focus();
        switch (action) {
          case "undo":
            chain.undo().run();
            break;
          case "redo":
            chain.redo().run();
            break;
          case "bold":
            chain.toggleBold().run();
            break;
          case "italic":
            chain.toggleItalic().run();
            break;
          case "code":
            chain.toggleCode().run();
            break;
          case "blockquote":
            chain.toggleBlockquote().run();
            break;
          case "bulletList":
            chain.toggleBulletList().run();
            break;
          case "orderedList":
            chain.toggleOrderedList().run();
            break;
          case "inlineMath": {
            const { from, to } = editor.state.selection;
            const selected = editor.state.doc.textBetween(from, to, " ");
            const latex = getLatexInput(selected || "x^2", "Inline LaTeX");
            if (latex) {
              editor.commands.insertInlineMath({ latex });
            }
            break;
          }
          default:
            break;
        }
      },
    }),
    [editor],
  );

  return html`
    <div className="editor-scroll h-full overflow-y-auto px-6 py-6 sm:px-10">
      <${EditorContent} editor=${editor} />
    </div>
  `;
});

const MarkdownEditor = forwardRef(function MarkdownEditor(
  { markdown, onChange },
  ref,
) {
  const textareaRef = useRef(null);

  useImperativeHandle(ref, () => ({
    execute(action) {
      const textarea = textareaRef.current;
      switch (action) {
        case "bold":
          wrapSelection(textarea, markdown, onChange, "**");
          break;
        case "italic":
          wrapSelection(textarea, markdown, onChange, "*");
          break;
        case "code":
          wrapSelection(textarea, markdown, onChange, "`");
          break;
        case "blockquote":
          prefixSelection(textarea, markdown, onChange, "> ");
          break;
        case "bulletList":
          prefixSelection(textarea, markdown, onChange, "- ");
          break;
        case "orderedList":
          prefixSelection(textarea, markdown, onChange, "1. ");
          break;
        case "inlineMath":
          wrapSelection(textarea, markdown, onChange, "$");
          break;
        default:
          break;
      }
    },
  }));

  return html`
    <div className="h-full p-4 sm:p-6">
      <textarea
        ref=${textareaRef}
        value=${markdown}
        onChange=${(event) => onChange(event.target.value)}
        spellCheck="false"
        className="editor-scroll h-full min-h-[55vh] w-full resize-none rounded-[2rem] border border-slate-200 bg-[#fffdf9] p-6 font-mono text-sm leading-7 text-slate-800 outline-none ring-0 transition focus:border-clay/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      ></textarea>
    </div>
  `;
});

function App() {
  const [view, setView] = useState(VIEW.visual);
  const [markdown, setMarkdown] = useState(() => {
    return localStorage.getItem("astranote-markdown") || initialMarkdown;
  });
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("astranote-theme") === "dark";
  });
  const editorRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("astranote-markdown", markdown);
  }, [markdown]);

  useEffect(() => {
    localStorage.setItem("astranote-theme", isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const tableOfContents = useMemo(
    () => extractTableOfContents(markdown),
    [markdown],
  );

  const stats = useMemo(() => {
    const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
    return { words, chars: markdown.length };
  }, [markdown]);

  function runAction(action) {
    editorRef.current?.execute(action);
  }

  return html`
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col gap-5">
        <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex h-full flex-col rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-base font-extrabold tracking-tight text-clay">
              ✨ AstraNote
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-[#f5f1e8] p-4 dark:border-slate-700 dark:bg-slate-950/60">
              ${tableOfContents.length > 0
                ? html`<nav className="space-y-1">
                    ${tableOfContents.map(
                      (item) => html`
                        <div
                          className=${`rounded-xl px-3 py-2 text-sm transition ${
                            item.level === 1
                              ? "font-semibold text-ink dark:text-white"
                              : item.level === 2
                                ? "pl-6 text-slate-700 dark:text-slate-200"
                                : "pl-9 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          ${item.title}
                        </div>
                      `,
                    )}
                  </nav>`
                : html`<p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
                    Add headings with <code>#</code>, <code>##</code>, and
                    <code>###</code> to populate the outline.
                  </p>`}
            </div>

            <div className="mt-auto grid gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/60 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Words</span>
                <strong>${stats.words}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Characters</span>
                <strong>${stats.chars}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Mode</span>
                <strong>${view === VIEW.visual ? "Visual" : "Markdown"}</strong>
              </div>
            </div>
          </aside>

          <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-panel backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
            <header className="flex flex-col gap-4 border-b border-slate-200/80 px-4 py-4 dark:border-slate-800 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <${IconButton} title="Undo" onClick=${() => runAction("undo")}><span className="text-lg leading-none">↺</span></${IconButton}>
                <${IconButton} title="Redo" onClick=${() => runAction("redo")}><span className="text-lg leading-none">↻</span></${IconButton}>
                <${IconButton} title="Bold" onClick=${() => runAction("bold")}><strong>B</strong></${IconButton}>
                <${IconButton} title="Italic" onClick=${() => runAction("italic")}><em>I</em></${IconButton}>
                <${IconButton} title="Inline code" onClick=${() => runAction("code")}><span className="font-mono text-sm">${"</>"}</span></${IconButton}>
                <${IconButton} title="Quote" onClick=${() => runAction("blockquote")}>❝</${IconButton}>
                <${IconButton} title="Bulleted list" onClick=${() => runAction("bulletList")}>•</${IconButton}>
                <${IconButton} title="Ordered list" onClick=${() => runAction("orderedList")}>1.</${IconButton}>
                <${IconButton} title="Inline math" onClick=${() => runAction("inlineMath")}><span className="font-serif text-sm">ƒx</span></${IconButton}>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <${ModeToggle} view=${view} setView=${setView} />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick=${() => downloadMarkdown(markdown)}
                    className="rounded-full bg-clay px-4 py-2 text-sm font-medium text-white transition hover:bg-[#a85b3d]"
                  >
                    Download .md
                  </button>
                  <button
                    type="button"
                    onClick=${() => setIsDark((current) => !current)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-pine/40 hover:text-pine dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    ${isDark ? "Light" : "Dark"}
                  </button>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 bg-[#fffdf8] dark:bg-[#121927]">
              ${view === VIEW.visual
                ? html`<${VisualEditor}
                    ref=${editorRef}
                    markdown=${markdown}
                    onChange=${setMarkdown}
                  />`
                : html`<${MarkdownEditor}
                    ref=${editorRef}
                    markdown=${markdown}
                    onChange=${setMarkdown}
                  />`}
            </div>
          </section>
        </section>
      </div>
    </main>
  `;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

createRoot(rootElement).render(html`<${App} />`);
