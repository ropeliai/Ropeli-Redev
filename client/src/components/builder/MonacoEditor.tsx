import Editor from "@monaco-editor/react";

function getLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    tsx: "typescript",
    ts: "typescript",
    jsx: "javascript",
    js: "javascript",
    json: "json",
    css: "css",
    md: "markdown",
    html: "html",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
  };
  return map[ext] || "javascript";
}

export { getLanguage };

export default function MonacoEditor({
  value,
  onChange,
  filePath = "",
}: {
  value: string;
  onChange: (v: string) => void;
  filePath?: string;
}) {
  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={getLanguage(filePath)}
      value={value}
      onChange={(v) => onChange(v || "")}
      onMount={(editor, monaco) => {
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: true,
        });
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: true,
        });
        monaco.editor.setModelMarkers(editor.getModel()!, "owner", []);
      }}
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        suggest: { enabled: true },
        quickSuggestions: { other: true, comments: false, strings: false },
        minimap: { enabled: false },
        wordWrap: "on",
        automaticLayout: true,
        scrollBeyondLastLine: false,
        lineNumbers: "on",
        renderLineHighlight: "line",
        tabSize: 2,
        padding: { top: 12 },
      }}
    />
  );
}
