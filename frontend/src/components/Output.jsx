// components/Output.jsx
import { useState } from "react";
import { executeCode } from "../services/api";
import { FiPlay, FiAlertCircle, FiCheckCircle, FiClock } from "react-icons/fi";

const Output = ({ editorRef, language }) => {
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [executionTime, setExecutionTime] = useState(null);

  const runCode = async () => {
    if (!editorRef.current) {
      setErrorMessage("Editor not ready. Please wait for the editor to load.");
      return;
    }

    const sourceCode = editorRef.current.getValue();
    if (!sourceCode) {
      setErrorMessage("No code to run. Please write some code first.");
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage("");
      setExecutionTime(null);
      
      const startTime = performance.now();
      const { run: result } = await executeCode(language, sourceCode);
      const endTime = performance.now();
      
      setExecutionTime(Math.round(endTime - startTime));
      
      if (result.stderr) {
        setOutput(result.stderr.split("\n"));
        setIsError(true);
      } else {
        setOutput(result.output.split("\n"));
        setIsError(false);
      }
    } catch (error) {
      console.error("Execution error:", error);
      setIsError(true);
      setOutput([`Error: ${error.message || "Unknown error occurred"}`]);
      setErrorMessage(error.message || "Unable to run code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center">
            <FiAlertCircle className="w-5 h-5 mr-2 text-blue-400" />
            Output
          </h2>
          {output && (
            <span className={`px-2 py-1 text-xs rounded-full ${isError ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
              {isError ? 'Error' : 'Success'}
            </span>
          )}
        </div>
        <button
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isLoading 
              ? 'bg-green-700 cursor-not-allowed' 
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:shadow-lg hover:shadow-green-500/20'
          }`}
          onClick={runCode}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running...</span>
            </>
          ) : (
            <>
              <FiPlay className="w-4 h-4" />
              <span>Run Code</span>
            </>
          )}
        </button>
      </div>

      {/* Execution Info */}
      {(executionTime !== null || errorMessage) && (
        <div className="px-4 py-3 bg-gray-850 border-b border-gray-700">
          {executionTime !== null && (
            <div className="flex items-center space-x-2 text-sm">
              <FiClock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">
                Executed in <span className="font-mono font-bold text-green-400">{executionTime}ms</span>
              </span>
            </div>
          )}
          {errorMessage && (
            <div className="mt-2 flex items-start space-x-2 text-sm">
              <FiAlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-red-300">
                <strong className="font-semibold">Error:</strong> {errorMessage}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Output Content */}
      <div className={`flex-1 overflow-auto font-mono text-sm ${
        isError 
          ? 'bg-red-950/20 text-red-300' 
          : 'bg-gray-900 text-gray-200'
      }`}>
        {output ? (
          <div className="min-h-full">
            {output.map((line, i) => (
              <div 
                key={i} 
                className="flex hover:bg-gray-800/30 border-b border-gray-800/50 last:border-b-0"
              >
                <div className="w-12 flex-shrink-0 text-right py-1.5 pr-3 text-gray-500 select-none border-r border-gray-800">
                  {i + 1}
                </div>
                <div className="flex-1 py-1.5 pl-3 whitespace-pre-wrap break-all">
                  {line || <span className="text-gray-500">(empty line)</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-full flex items-center justify-center">
                  <FiPlay className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Ready to Execute
            </h3>
            <p className="text-gray-400 max-w-md mb-4">
              Click "Run Code" to execute your code and see the output here
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>Real-time execution</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Multiple languages</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                <span>Instant feedback</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-1.5 ${isError ? 'bg-red-500' : 'bg-green-500'}`} />
            Status: {isLoading ? 'Running' : isError ? 'Error' : output ? 'Completed' : 'Ready'}
          </span>
          {output && (
            <span>{output.length} line{output.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>Press Ctrl+Enter to run</span>
          <span className="px-2 py-0.5 bg-gray-700 rounded">?</span>
        </div>
      </div>
    </div>
  );
};

export default Output;