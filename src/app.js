import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import htm from "htm";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";

const html = htm.bind(React.createElement);

const initialMarkdown = "";

marked.setOptions({
  breaks: true,
  gfm: true,
});

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

  if (marks.some((mark) => mark.type === "strike")) {
    text = `~~${text}~~`;
  }

  return text;
}

function serializeInline(nodes = []) {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return serializeTextNode(node);
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
      childBlocks.push(
        `${indent}${marker}${serializeNode(child, depth + 1).trim()}`,
      );
    }
  }

  return childBlocks.join("\n");
}

function serializeNode(node, depth = 0) {
  switch (node.type) {
    case "doc":
      return (
        (node.content || [])
          .map((child) => serializeNode(child, depth))
          .join("")
          .trimEnd() + "\n"
      );
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

function VisualEditor({ markdown, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    autofocus: true,
    editorProps: {
      attributes: {
        class: "editor-content",
      },
    },
    content: marked.parse(markdown),
    onUpdate: ({ editor: currentEditor }) => {
      onChange(serializeDocument(currentEditor.getJSON()));
    },
    immediatelyRender: false,
  });

  return html`
    <div class="editor-scroll">
      <${EditorContent} editor=${editor} />
    </div>
  `;
}

function App() {
  const [markdown, setMarkdown] = useState(initialMarkdown);

  return html`
    <main class="app-shell">
      <section class="editor-frame">
        <${VisualEditor} markdown=${markdown} onChange=${setMarkdown} />
      </section>
    </main>
  `;
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing root element");
}

createRoot(rootElement).render(html`<${App} />`);
