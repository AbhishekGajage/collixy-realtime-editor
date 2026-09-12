// components/CodeEditor.jsx
import { useRef, useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import LanguageSelector from "./LanguageSelector";
import { CODE_SNIPPETS, LANGUAGE_VERSIONS, LANGUAGE_NAMES } from "../constants";
import Output from "./Output";

const CodeEditor = () => {
  const editorRef = useRef(null);
  const [value, setValue] = useState("");
  const [language, setLanguage] = useState("javascript");

  useEffect(() => {
    setValue(CODE_SNIPPETS[language]);
  }, [language]);

  const onMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const onSelect = (selectedLanguage) => {
    setLanguage(selectedLanguage);
  };

  return (
    <div className="w-full h-full">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start h-full">
        {/* Left Side - Editor */}
        <div className="w-full lg:w-1/2 lg:flex-1 flex flex-col h-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <LanguageSelector language={language} onSelect={onSelect} />
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-blue-400">
                {LANGUAGE_NAMES[language]}
              </span>
              <span className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded">
                v{LANGUAGE_VERSIONS[language]}
              </span>
            </div>
          </div>
          <div className="flex-1 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
            <Editor
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                lineNumbers: "on",
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                },
              }}
              height="100%"
              theme="vs-dark"
              language={language}
              onMount={onMount}
              value={value}
              onChange={(value) => setValue(value || "")}
            />
          </div>
        </div>

        {/* Right Side - Output */}
        <div className="w-full lg:w-1/2 lg:flex-1 flex flex-col h-full">
          <Output editorRef={editorRef} language={language} />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;