import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  Send, 
  RotateCcw, 
  ChevronLeft, 
  Clock, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Terminal, 
  FileCode, 
  Copy, 
  Check, 
  History, 
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';
import api from '../services/api';
import Timer from '../components/Timer';

const SUPPORTED_LANGUAGES = [
  { id: 'python', label: 'Python 3.14', monaco: 'python' },
  { id: 'cpp', label: 'C++ (g++ 15)', monaco: 'cpp' },
  { id: 'c', label: 'C (gcc 15)', monaco: 'c' },
  { id: 'java', label: 'Java 25 (OpenJDK)', monaco: 'java' },
  { id: 'javascript', label: 'JavaScript (Node.js 24)', monaco: 'javascript' },
];

export default function ProblemPage() {
  const { id } = useParams();

  const [problem, setProblem] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [sourceCode, setSourceCode] = useState('');
  const [codeByLang, setCodeByLang] = useState({});
  const [customInput, setCustomInput] = useState('');
  const [activeLeftTab, setActiveLeftTab] = useState('description'); // 'description' or 'submissions'
  const [activeBottomTab, setActiveBottomTab] = useState('input'); // 'input', 'run_output', 'verdict'
  
  // Execution states
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch problem details and past submissions
  const fetchProblemData = async () => {
    try {
      const [probRes, subRes] = await Promise.all([
        api.get(`/problems/${id}`),
        api.get(`/submissions/my?problemId=${id}`),
      ]);

      if (probRes.data?.success) {
        const prob = probRes.data.data;
        setProblem(prob);

        // Pre-fill initial language templates
        if (prob.starterTemplates) {
          setCodeByLang(prob.starterTemplates);
          setSourceCode(prob.starterTemplates['python'] || '');
        }

        // Set default custom input to first sample test case
        if (prob.sampleTestCases && prob.sampleTestCases.length > 0) {
          setCustomInput(prob.sampleTestCases[0].input || '');
        }
      }

      if (subRes.data?.success) {
        setSubmissions(subRes.data.data);
      }
    } catch (err) {
      setErrorMsg('Failed to load problem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblemData();
  }, [id]);

  // Handle language switch
  const handleLanguageChange = (newLang) => {
    // Save current code to cache
    setCodeByLang((prev) => ({
      ...prev,
      [selectedLanguage]: sourceCode,
    }));

    setSelectedLanguage(newLang);
    setSourceCode(codeByLang[newLang] || problem?.starterTemplates?.[newLang] || '');
  };

  // Reset code to boilerplate
  const handleResetCode = () => {
    if (window.confirm('Reset code to default template? Any unsaved edits will be lost.')) {
      const template = problem?.starterTemplates?.[selectedLanguage] || '';
      setSourceCode(template);
      setCodeByLang((prev) => ({
        ...prev,
        [selectedLanguage]: template,
      }));
    }
  };

  // Copy sample test case to custom input or clipboard
  const handleCopyInput = (input, index) => {
    setCustomInput(input);
    setActiveBottomTab('input');
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  // Run Code against Custom Input
  const handleRun = async () => {
    if (!sourceCode.trim()) {
      alert('Please enter your solution before running.');
      return;
    }

    setRunning(true);
    setRunResult(null);
    setActiveBottomTab('run_output');

    try {
      const res = await api.post('/submissions/run', {
        sourceCode,
        language: selectedLanguage,
        customInput,
        problemId: id,
      });

      if (res.data?.success) {
        setRunResult(res.data.data);
      }
    } catch (err) {
      setRunResult({
        status: 'error',
        error: err.response?.data?.message || err.message || 'Execution failed',
        exitCode: 1,
      });
    } finally {
      setRunning(false);
    }
  };

  // Submit Solution for Official Evaluation
  const handleSubmit = async () => {
    if (!sourceCode.trim()) {
      alert('Please enter your solution before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    setActiveBottomTab('verdict');

    try {
      const res = await api.post('/submissions/submit', {
        sourceCode,
        language: selectedLanguage,
        problemId: id,
      });

      if (res.data?.success) {
        const result = res.data.data;
        setSubmitResult(result);

        // If ACCEPTED, shoot celebratory confetti!
        if (result.status === 'ACCEPTED') {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
          });

          // Refresh problem solve status
          setProblem((prev) => ({ ...prev, isSolved: true }));
        }

        // Refresh submissions tab list
        const subRes = await api.get(`/submissions/my?problemId=${id}`);
        if (subRes.data?.success) {
          setSubmissions(subRes.data.data);
        }
      }
    } catch (err) {
      setSubmitResult({
        status: 'ERROR',
        compilerOutput: err.response?.data?.message || err.message || 'Submission failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-mono">Loading code environment...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950">
        <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Problem Not Found</h3>
          <p className="text-xs text-slate-400 mt-1">This challenge may have been removed or updated.</p>
          <Link to="/" className="inline-block mt-4 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-semibold text-white">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentMonacoLang = SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage)?.monaco || 'python';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="flex items-center space-x-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <span className="text-slate-700">|</span>
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <span>{problem.order ? `${problem.order}. ` : ''}{problem.title}</span>
            {problem.isSolved && (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Solved</span>
              </span>
            )}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <Timer compact />

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={running || submitting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 disabled:opacity-50 transition-all"
          >
            {running ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            )}
            <span>Run</span>
          </button>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={running || submitting}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Submit</span>
          </button>
        </div>
      </div>

      {/* Split Screen Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Panel: Problem Statement / Submissions */}
        <div className="lg:col-span-5 flex flex-col border-r border-slate-800 bg-slate-900/40 overflow-hidden">
          {/* Left Panel Navigation Tabs */}
          <div className="flex items-center space-x-2 px-4 pt-3 border-b border-slate-800 bg-slate-900/80">
            <button
              onClick={() => setActiveLeftTab('description')}
              className={`flex items-center space-x-1.5 pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeLeftTab === 'description'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Description</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('submissions')}
              className={`flex items-center space-x-1.5 pb-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeLeftTab === 'submissions'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Submissions ({submissions.length})</span>
            </button>
          </div>

          {/* Left Panel Content */}
          <div className="flex-1 overflow-y-auto p-5 text-sm space-y-6">
            {activeLeftTab === 'description' ? (
              <>
                {/* Meta header */}
                <div className="space-y-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      problem.difficulty === 'EASY'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : problem.difficulty === 'MEDIUM'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {problem.difficulty}
                    </span>
                    <span className="flex items-center space-x-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                      <Zap className="w-3 h-3" />
                      <span>{problem.points} points</span>
                    </span>
                    <span className="flex items-center space-x-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{problem.timeLimit || 2.0}s limit</span>
                    </span>
                  </div>
                </div>

                {/* Problem Description Markdown */}
                <div className="space-y-4 text-slate-300 leading-relaxed text-xs sm:text-sm">
                  <div className="whitespace-pre-wrap font-sans">{problem.description}</div>

                  {/* Input Format */}
                  {problem.inputFormat && (
                    <div className="space-y-1 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Input Format</h4>
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                        {problem.inputFormat}
                      </div>
                    </div>
                  )}

                  {/* Output Format */}
                  {problem.outputFormat && (
                    <div className="space-y-1 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Output Format</h4>
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 whitespace-pre-wrap">
                        {problem.outputFormat}
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  {problem.constraints && (
                    <div className="space-y-1 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Constraints</h4>
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 font-mono text-xs text-indigo-300 whitespace-pre-wrap">
                        {problem.constraints}
                      </div>
                    </div>
                  )}

                  {/* Sample Test Cases */}
                  {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
                    <div className="space-y-4 pt-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Sample Test Cases</h4>
                      {problem.sampleTestCases.map((tc, idx) => (
                        <div key={tc.id || idx} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                            <span>Sample {idx + 1}</span>
                            <button
                              onClick={() => handleCopyInput(tc.input, idx)}
                              className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 text-[10px]">Loaded in input!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">Load to Custom Input</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="p-3 space-y-2 font-mono text-xs">
                            <div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold">Input:</div>
                              <pre className="text-slate-200 whitespace-pre-wrap bg-slate-900/60 p-2 rounded-lg mt-0.5">{tc.input}</pre>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500 uppercase font-bold">Expected Output:</div>
                              <pre className="text-emerald-400 whitespace-pre-wrap bg-slate-900/60 p-2 rounded-lg mt-0.5">{tc.expectedOutput}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Submissions History Tab */
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Past Submissions for this problem</h4>
                {submissions.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-500">
                    No submissions made yet for this problem.
                  </div>
                ) : (
                  submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sub.status === 'ACCEPTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {sub.status}
                          </span>
                          <span className="text-slate-400 uppercase text-[11px]">{sub.language}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {sub.passedTestCases} / {sub.totalTestCases} cases passed • {sub.executionTime ? `${sub.executionTime.toFixed(3)}s` : '-'}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 text-right font-sans">
                        {new Date(sub.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Code Editor & Output Console */}
        <div className="lg:col-span-7 flex flex-col bg-slate-950 overflow-hidden">
          {/* Editor Header Bar */}
          <div className="h-10 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
            {/* Language Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-slate-950 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Editor Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetCode}
                title="Reset code to starter template"
                className="flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Monaco Code Editor */}
          <div className="flex-1 relative overflow-hidden min-h-[300px]">
            <Editor
              height="100%"
              language={currentMonacoLang}
              value={sourceCode}
              onChange={(value) => setSourceCode(value || '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', 'Consolas', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                lineNumbersMinChars: 3,
                tabSize: 4,
              }}
            />
          </div>

          {/* Bottom Console Drawer */}
          <div className="h-60 border-t border-slate-800 bg-slate-900 flex flex-col flex-shrink-0">
            {/* Console Tabs */}
            <div className="h-9 px-4 bg-slate-950 border-b border-slate-800 flex items-center space-x-3 text-xs font-bold">
              <button
                onClick={() => setActiveBottomTab('input')}
                className={`pb-1 border-b-2 transition-colors ${
                  activeBottomTab === 'input'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Custom Input
              </button>
              <button
                onClick={() => setActiveBottomTab('run_output')}
                className={`flex items-center space-x-1 pb-1 border-b-2 transition-colors ${
                  activeBottomTab === 'run_output'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Run Output</span>
                {runResult && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
              <button
                onClick={() => setActiveBottomTab('verdict')}
                className={`flex items-center space-x-1 pb-1 border-b-2 transition-colors ${
                  activeBottomTab === 'verdict'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Verdict & Test Cases</span>
                {submitResult && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </button>
            </div>

            {/* Console Content */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
              {activeBottomTab === 'input' && (
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter test inputs passed to stdin..."
                  className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none font-mono text-xs"
                />
              )}

              {activeBottomTab === 'run_output' && (
                <div className="space-y-3">
                  {running ? (
                    <div className="flex items-center space-x-2 text-indigo-400 py-4">
                      <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                      <span>Executing code on OnlineCompiler sandbox...</span>
                    </div>
                  ) : runResult ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center space-x-4 text-[11px] text-slate-400 pb-2 border-b border-slate-800">
                        <span>Status: <strong className={runResult.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>{runResult.exitCode === 0 ? 'Success' : 'Error'}</strong></span>
                        <span>Exit Code: <strong>{runResult.exitCode}</strong></span>
                        {runResult.executionTime !== undefined && (
                          <span>Execution Time: <strong>{runResult.executionTime}s</strong></span>
                        )}
                      </div>

                      {/* Sample Test Case Match Banner */}
                      {runResult.sampleMatch && (
                        <div className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2.5 ${
                          runResult.sampleMatch.isMatch
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        }`}>
                          {runResult.sampleMatch.isMatch ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <span className="font-bold">
                              {runResult.sampleMatch.isMatch
                                ? 'Sample Test Case: Passed! Output matches expected output.'
                                : `Sample Output Mismatch. Expected: "${runResult.sampleMatch.expectedOutput}"`}
                            </span>
                          </div>
                        </div>
                      )}

                      {runResult.output && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-500">Standard Output:</div>
                          <pre className="text-emerald-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 whitespace-pre-wrap mt-1">
                            {runResult.output}
                          </pre>
                        </div>
                      )}

                      {runResult.error && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-rose-500">Standard Error / Compilation Diagnostic:</div>
                          <pre className="text-rose-400 bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/50 whitespace-pre-wrap mt-1">
                            {runResult.error}
                          </pre>
                        </div>
                      )}

                      {!runResult.output && !runResult.error && (
                        <div className="text-slate-500 italic">Program executed with no standard output.</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic py-4">
                      Click the "Run" button above to test your code against custom input.
                    </div>
                  )}
                </div>
              )}

              {activeBottomTab === 'verdict' && (
                <div className="space-y-3">
                  {submitting ? (
                    <div className="flex items-center space-x-2 text-indigo-400 py-4">
                      <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                      <span>Evaluating all test cases in sandbox (calculating score & penalty)...</span>
                    </div>
                  ) : submitResult ? (
                    <div className="space-y-3">
                      {/* Verdict Banner */}
                      <div className={`p-4 rounded-xl border flex items-center justify-between ${
                        submitResult.status === 'ACCEPTED'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : submitResult.status === 'PARTIALLY_ACCEPTED'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : submitResult.status === 'WRONG_ANSWER'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : submitResult.status === 'TIME_LIMIT_EXCEEDED'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                      }`}>
                        <div className="flex items-center space-x-3">
                          {submitResult.status === 'ACCEPTED' ? (
                            <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0" />
                          ) : submitResult.status === 'PARTIALLY_ACCEPTED' ? (
                            <Zap className="w-7 h-7 text-amber-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-7 h-7 text-rose-400 flex-shrink-0" />
                          )}
                          <div>
                            <div className="text-base font-extrabold tracking-wide font-sans">
                              {submitResult.status === 'PARTIALLY_ACCEPTED' ? 'PARTIALLY ACCEPTED' : submitResult.status}
                            </div>
                            <div className="text-xs opacity-90">
                              {submitResult.status === 'ACCEPTED'
                                ? `All test cases passed! +${submitResult.earnedPoints} points earned!`
                                : submitResult.earnedPoints > 0
                                ? `Passed ${submitResult.passedTestCases} of ${submitResult.totalTestCases} cases (+${submitResult.earnedPoints} pts earned for successful cases!)`
                                : '0 test cases passed. Review your solution logic.'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {submitResult.passedTestCases} / {submitResult.totalTestCases}
                          </div>
                          <div className="text-[10px] uppercase font-bold opacity-75">
                            {submitResult.earnedPoints} / {submitResult.maxProblemPoints || 100} pts
                          </div>
                        </div>
                      </div>

                      {/* Individual Test Cases Evaluation Breakdown */}
                      {submitResult.caseResults && submitResult.caseResults.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400">
                            Test Cases Evaluation Breakdown ({submitResult.passedTestCases}/{submitResult.totalTestCases} passed):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {submitResult.caseResults.map((tc, idx) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                                  tc.status === 'ACCEPTED'
                                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  {tc.status === 'ACCEPTED' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                  )}
                                  <div>
                                    <div className="font-semibold text-[11px]">
                                      Test Case #{tc.order || idx + 1} {tc.isHidden ? '(Hidden)' : '(Sample)'}
                                    </div>
                                    {!tc.isHidden && tc.status !== 'ACCEPTED' && tc.expectedOutput && (
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        Exp: "{tc.expectedOutput}"
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                                  tc.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {tc.status === 'ACCEPTED' ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {submitResult.compilerOutput && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-500">Compiler / Runtime Diagnostic:</div>
                          <pre className="text-rose-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 whitespace-pre-wrap mt-1">
                            {submitResult.compilerOutput}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic py-4">
                      Click the "Submit" button above to evaluate your solution against all competition test cases. Every passed test case awards points!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
