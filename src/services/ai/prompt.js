export const LANGUAGE_CONFIGS = {
  javascript: {
    displayName: 'JavaScript (Node.js)',
    functionSignature: '(payload) => result',
    signaturePattern: /^\(payload\)\s*=>/,
    forbiddenTokens: ['require', 'import', 'eval', 'Function', 'process', 'global', 'globalThis', 'setTimeout', 'setInterval', 'fetch', 'XMLHttpRequest'],
    constraints: [
      'Do NOT use: require, import, eval, Function, process, global, fetch, setTimeout, setInterval, or XMLHttpRequest.',
      'Use only pure computation with built-in JavaScript — no side effects, no I/O.'
    ],
    example: "(payload) => ({ id: payload.id, amount: payload.data?.amount ?? 0 })"
  },
  python: {
    displayName: 'Python 3',
    functionSignature: 'def transform(payload: dict) -> dict',
    signaturePattern: /^def\s+transform\s*\(/,
    forbiddenTokens: ['__import__', 'subprocess', 'socket', 'urllib', 'requests'],
    constraints: [
      'Do NOT use import statements, os, sys, subprocess, open, eval, exec, __import__, socket, urllib, or any I/O.',
      'Use only pure computation with built-in Python functions — no imports allowed.'
    ],
    example: "def transform(payload):\n    return {\"id\": payload.get(\"id\"), \"amount\": payload.get(\"data\", {}).get(\"amount\", 0)}"
  },
  php: {
    displayName: 'PHP 8',
    functionSignature: 'function transform(array $payload): array',
    signaturePattern: /^function\s+transform\s*\(/,
    forbiddenTokens: ['exec', 'shell_exec', 'system', 'passthru', 'popen', 'proc_open', 'file_get_contents', 'curl_init', 'fopen', 'eval'],
    constraints: [
      'Do NOT use: exec, shell_exec, system, passthru, eval, file_get_contents, curl, fopen, or any I/O.',
      'Use only pure computation with built-in PHP functions.'
    ],
    example: "function transform(array $payload): array {\n    return [\"id\" => $payload[\"id\"] ?? null, \"amount\" => $payload[\"data\"][\"amount\"] ?? 0];\n}"
  },
  java: {
    displayName: 'Java (jshell)',
    functionSignature: 'Map<String,Object> transform(Map<String,Object> payload)',
    signaturePattern: /Map\s*<\s*String\s*,\s*Object\s*>\s+transform\s*\(/,
    forbiddenTokens: ['Runtime', 'ProcessBuilder', 'System.exit', 'Thread(', 'ClassLoader', 'Reflection'],
    constraints: [
      'Do NOT use: Runtime, ProcessBuilder, System.exit, File, InputStream, Thread, Reflection, or any I/O.',
      'Do NOT include import statements — java.util.* is pre-imported.',
      'Use Map<String,Object>, List<Object>, String, Long, Double, Boolean, null for all data types.',
      'Nested objects from the payload will be Map<String,Object>; cast accordingly.'
    ],
    example: "Map<String,Object> transform(Map<String,Object> payload) {\n    Map<String,Object> result = new LinkedHashMap<>();\n    result.put(\"id\", payload.get(\"id\"));\n    Object data = payload.get(\"data\");\n    if (data instanceof Map) result.put(\"amount\", ((Map<?,?>)data).get(\"amount\"));\n    return result;\n}"
  },
  csharp: {
    displayName: 'C# (.NET via dotnet-script)',
    functionSignature: 'public static JObject Transform(JObject payload)',
    signaturePattern: /\w+\s+Transform\s*\(/,
    forbiddenTokens: ['Process.', 'File.', 'Stream', 'Socket', 'Thread(', 'Assembly', 'Reflection'],
    constraints: [
      'Do NOT use: Process, File, Stream, Socket, Thread, Reflection, Assembly, or any I/O.',
      'Use Newtonsoft.Json types: JObject, JArray, JToken — they are pre-imported.',
      'Access payload values like: payload["key"]?.Value<string>() or payload["key"]?.ToObject<JObject>()'
    ],
    example: "public static JObject Transform(JObject payload) {\n    return new JObject {\n        [\"id\"] = payload[\"id\"]?.ToString(),\n        [\"amount\"] = payload[\"data\"]?[\"amount\"]?.Value<int>() ?? 0\n    };\n}"
  },
  go: {
    displayName: 'Go',
    functionSignature: 'func transform(payload map[string]interface{}) map[string]interface{}',
    signaturePattern: /^func\s+transform\s*\(/m,
    forbiddenTokens: ['os.', 'exec.', 'net.', 'http.', 'io.', 'syscall.', 'unsafe.'],
    constraints: [
      'Do NOT use: os, exec, net, http, io, bufio, syscall, unsafe, or goroutines.',
      'Do NOT include "package main" — it is provided by the scaffold.',
      'You MAY include import declarations if needed (e.g. import "strings"). They will be merged.',
      'Available without import: encoding/json, fmt, strings, strconv, math.'
    ],
    example: "func transform(payload map[string]interface{}) map[string]interface{} {\n    result := make(map[string]interface{})\n    result[\"id\"] = payload[\"id\"]\n    if data, ok := payload[\"data\"].(map[string]interface{}); ok {\n        result[\"amount\"] = data[\"amount\"]\n    }\n    return result\n}"
  },
  ruby: {
    displayName: 'Ruby',
    functionSignature: 'def transform(payload)',
    signaturePattern: /^def\s+transform\s*\(/,
    forbiddenTokens: ['require', 'load', 'system', 'exec', 'eval', 'Kernel', 'IO.', 'File.', 'Net::'],
    constraints: [
      'Do NOT use: require, load, system, exec, eval, backtick, %x, IO, File, Net::HTTP, Socket, Thread, or any I/O.',
      'Use only pure computation with built-in Ruby methods.'
    ],
    example: "def transform(payload)\n  {\n    \"id\" => payload[\"id\"],\n    \"amount\" => payload.dig(\"data\", \"amount\") || 0\n  }\nend"
  },
  cpp: {
    displayName: 'C++17 (nlohmann/json)',
    functionSignature: 'nlohmann::json transform(const nlohmann::json& payload)',
    signaturePattern: /nlohmann::json\s+transform\s*\(/,
    forbiddenTokens: ['system(', 'popen', 'fork(', 'exec(', 'fopen', 'fstream', 'socket(', 'thread('],
    constraints: [
      'Do NOT use: system, popen, fork, exec, fopen, fstream, socket, thread, or any I/O.',
      'Do NOT include #include directives — they are pre-provided by the scaffold.',
      'All headers available: <string>, <vector>, <map>, <algorithm>, <cmath>, <sstream>, nlohmann/json.hpp.',
      'Use nlohmann::json for all data types — it handles objects, arrays, strings, numbers automatically.'
    ],
    example: "nlohmann::json transform(const nlohmann::json& payload) {\n    nlohmann::json result;\n    result[\"id\"] = payload.value(\"id\", \"\");\n    if (payload.contains(\"data\")) result[\"amount\"] = payload[\"data\"].value(\"amount\", 0);\n    return result;\n}"
  }
};

/**
 * Build a language-aware system prompt for the AI model.
 * @param {string} language - one of the LANGUAGE_CONFIGS keys
 */
export function buildSystemPrompt(language = 'javascript') {
  const lang = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.javascript;
  return `You generate production-safe ${lang.displayName} data transformation functions. Return ONLY the function code — no explanation, no markdown fences, no surrounding code.`;
}

/**
 * Build the user prompt describing the schema and desired output.
 * @param {{ source: object, schemaShape: object }} opts
 */
export function buildUserPrompt({ source, schemaShape }) {
  const language = source.outputLanguage || 'javascript';
  const lang = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS.javascript;
  return [
    `Generate a ${lang.displayName} function with exactly this signature:`,
    `  ${lang.functionSignature}`,
    '',
    'Constraints:',
    ...lang.constraints.map((c) => `  - ${c}`),
    '  - The function must be deterministic and tolerate missing or null fields.',
    '  - The payload schema below shows keys and value types only — never real values.',
    '',
    `Operator output description: ${source.outputDescription}`,
    '',
    'Payload schema:',
    JSON.stringify(schemaShape, null, 2),
    '',
    'Example of the expected function shape:',
    lang.example
  ].join('\n');
}
