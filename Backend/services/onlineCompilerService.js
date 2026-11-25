const axios = require('axios');

const API_URL = 'https://api.onlinecompiler.io/api/run-code-sync/';

// Supported language to compiler identifier mapping
const LANGUAGE_COMPILER_MAP = {
  python: 'python-3.14',
  py: 'python-3.14',
  cpp: 'g++-15',
  'c++': 'g++-15',
  c: 'gcc-15',
  java: 'openjdk-25',
  javascript: 'nodejs-24',
  js: 'nodejs-24',
  node: 'nodejs-24',
};

// Starter templates for Monaco Editor
const LANGUAGE_TEMPLATES = {
  python: `# Python 3.14
import sys

def solve():
    # Read all inputs from stdin
    lines = sys.stdin.read().splitlines()
    if not lines:
        return
    # Process solution
    print("CodeArena")

if __name__ == '__main__':
    solve()
`,
  cpp: `// C++ (g++ 15)
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Read input and solve
    return 0;
}
`,
  c: `// C (gcc 15)
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // Read input and solve
    return 0;
}
`,
  java: `// Java (OpenJDK 25)
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        // Read input and solve
    }
}
`,
  javascript: `// JavaScript (Node.js 24)
const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    // Process input
}

solve();
`,
};

/**
 * Standard text normalization:
 * - Convert CRLF to LF
 * - Trim trailing whitespace on each line
 * - Trim trailing empty lines
 */
function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Tokenize and strip interactive prompts, labels, and brackets
 * E.g.: "Enter array size:\nIndices: 0, 1\nNumbers: 2, 7" -> ["0", "1", "2", "7"]
 */
function cleanTokens(str) {
  if (typeof str !== 'string' || !str) return [];
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    // Remove lines that are interactive user prompts (common with student code)
    .filter(line => !/^\s*(enter|input|please|type|insert|give)\b/i.test(line.trim()))
    .join('\n')
    // Remove common label prefixes like "Numbers:", "Result:", "Output:", "Answer:", "Indices:", "Pair:"
    .replace(/\b(numbers|result|output|answer|indices|pair|sum)\s*:\s*/gi, ' ')
    // Remove brackets and commas
    .replace(/[\[\],]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Robust competitive programming output matcher:
 * Handles:
 * 1. Exact string matches (ignoring trailing whitespace)
 * 2. Token-by-token equality (flexible spaces, newlines, tabs)
 * 3. Case-insensitive keywords (e.g. YES/yes, VALID/valid, NONE/none)
 * 4. Boolean aliases (TRUE -> YES, FALSE -> NO)
 * 5. Prompt filtering (stripping "Enter array size:" etc.)
 * 6. Label stripping ("Numbers: 2, 7" -> "2 7")
 * 7. Trailing tokens match (if student printed debug logs before final answer)
 */
function compareOutput(actual, expected) {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  // 1. Direct exact match
  if (normActual === normExpected) return true;

  // 2. Direct case-insensitive match
  if (normActual.toUpperCase() === normExpected.toUpperCase()) return true;

  // 3. Token-based match
  const actTokens = cleanTokens(actual);
  const expTokens = cleanTokens(expected);

  if (actTokens.length > 0 && expTokens.length > 0) {
    if (actTokens.join(' ') === expTokens.join(' ')) return true;

    // Case-insensitive token match
    if (actTokens.map(t => t.toUpperCase()).join(' ') === expTokens.map(t => t.toUpperCase()).join(' ')) {
      return true;
    }

    // Boolean keyword normalization
    const mapKeyword = (t) => {
      const u = t.toUpperCase();
      if (u === 'TRUE') return 'YES';
      if (u === 'FALSE') return 'NO';
      return u;
    };

    if (actTokens.map(mapKeyword).join(' ') === expTokens.map(mapKeyword).join(' ')) {
      return true;
    }

    // Trailing tokens match (when debug statements or extra prints precede the answer)
    if (actTokens.length >= expTokens.length) {
      const trailingAct = actTokens.slice(-expTokens.length);
      if (trailingAct.map(t => t.toUpperCase()).join(' ') === expTokens.map(t => t.toUpperCase()).join(' ')) {
        return true;
      }
      if (trailingAct.map(mapKeyword).join(' ') === expTokens.map(mapKeyword).join(' ')) {
        return true;
      }
    }
  }

  // 4. Special phrase equivalence for NONE / NO PAIR FOUND
  if (normExpected.toUpperCase() === 'NONE') {
    const rawUpper = (actual || '').toUpperCase();
    if (rawUpper.includes('NONE') || rawUpper.includes('NO PAIR') || rawUpper.includes('NOT FOUND')) {
      return true;
    }
  }

  return false;
}

/**
 * Execute code on OnlineCompiler.io
 */
async function executeCode(compiler, code, input = '', timeLimitSec = 10) {
  const apiKey = process.env.ONLINECOMPILER_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      status: 'error',
      exitCode: 500,
      output: '',
      error: 'ONLINECOMPILER_API_KEY environment variable is not configured.',
      executionTime: 0,
      isProviderError: true,
    };
  }

  try {
    const response = await axios.post(
      API_URL,
      {
        compiler,
        code,
        input: input ?? '',
      },
      {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: Math.max(15000, (timeLimitSec + 5) * 1000),
      }
    );

    const data = response.data;
    const executionTime = data.time ? parseFloat(data.time) : 0;
    const output = data.output || '';
    const error = data.error || '';
    const exitCode = typeof data.exit_code === 'number' ? data.exit_code : (data.status === 'success' ? 0 : 1);

    return {
      success: data.status === 'success' && exitCode === 0,
      status: data.status,
      exitCode,
      output,
      error,
      executionTime,
      memory: data.memory,
      raw: data,
    };
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return {
        success: false,
        status: 'timeout',
        exitCode: 124,
        output: '',
        error: 'Execution timed out beyond service threshold.',
        executionTime: timeLimitSec,
        isTimeout: true,
      };
    }

    return {
      success: false,
      status: 'error',
      exitCode: 500,
      output: '',
      error: err.response?.data?.error || err.message || 'Execution provider error',
      executionTime: 0,
      isProviderError: true,
    };
  }
}

/**
 * Classify verdict from run result
 */
function classifyVerdict(runResult, expectedOutput, timeLimitSec = 2.0) {
  if (runResult.isTimeout || (runResult.executionTime && runResult.executionTime > timeLimitSec)) {
    return 'TIME_LIMIT_EXCEEDED';
  }

  if (runResult.exitCode !== 0) {
    const errText = (runResult.error || '').toLowerCase();
    // Check if error is compilation
    const isCompileError =
      errText.includes('error: ') ||
      errText.includes('syntaxerror') ||
      errText.includes('javac') ||
      errText.includes('cannot find symbol') ||
      errText.includes('compilation failed') ||
      errText.includes('was not declared in this scope') ||
      (runResult.executionTime === 0 && errText.length > 0);

    return isCompileError ? 'COMPILATION_ERROR' : 'RUNTIME_ERROR';
  }

  // Compare output using our robust matcher
  if (compareOutput(runResult.output, expectedOutput)) {
    return 'ACCEPTED';
  } else {
    return 'WRONG_ANSWER';
  }
}

module.exports = {
  LANGUAGE_COMPILER_MAP,
  LANGUAGE_TEMPLATES,
  normalizeOutput,
  cleanTokens,
  compareOutput,
  executeCode,
  classifyVerdict,
};
