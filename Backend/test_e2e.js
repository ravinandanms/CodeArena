require('dotenv').config();
const axios = require('axios');

if (!process.env.PORT) {
  throw new Error('PORT environment variable is required to run E2E tests.');
}
if (!process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable is required to run E2E tests.');
}

const BASE_URL = `http://localhost:${process.env.PORT}/api`;

async function runTests() {
  console.log('========================================================');
  console.log('🧪 Starting CodeArena End-to-End Comprehensive Test Suite');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('[Step 1] Checking API Health...');
    const healthRes = await axios.get(`${BASE_URL}/health`);
    assert(healthRes.data?.status === 'ok', 'API health check returns status: ok');

    // 2. Admin Login
    console.log('\n[Step 2] Testing Admin Login...');
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD,
    });
    assert(adminLoginRes.data?.success === true, 'Admin login succeeded');
    const adminToken = adminLoginRes.data?.data?.token;
    const adminUser = adminLoginRes.data?.data?.user;
    assert(adminUser?.role === 'ADMIN', 'Admin role verified');

    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // Ensure competition is active with fresh duration
    await axios.post(`${BASE_URL}/competition/admin/start`, {}, adminHeaders);
    console.log('✅ Competition started/refreshed for testing');

    // 3. Dynamic Team Registration
    console.log('\n[Step 3] Testing Dynamic Team Registration...');
    const team1Username = `team_alpha_${Date.now()}`;
    const team1Name = `Alpha Hackers ${Date.now()}`;

    const reg1Res = await axios.post(`${BASE_URL}/auth/register`, {
      teamName: team1Name,
      username: team1Username,
      password: 'password123',
      confirmPassword: 'password123',
    });
    assert(reg1Res.data?.success === true, 'Team 1 dynamically registered');
    const team1Token = reg1Res.data?.data?.token;
    const team1Id = reg1Res.data?.data?.user?.id;
    assert(reg1Res.data?.data?.user?.role === 'TEAM', 'Team 1 assigned TEAM role automatically');

    const team1Headers = { headers: { Authorization: `Bearer ${team1Token}` } };

    // Register Team 2
    const team2Username = `team_beta_${Date.now()}`;
    const team2Name = `Beta Coders ${Date.now()}`;
    const reg2Res = await axios.post(`${BASE_URL}/auth/register`, {
      teamName: team2Name,
      username: team2Username,
      password: 'password123',
      confirmPassword: 'password123',
    });
    assert(reg2Res.data?.success === true, 'Team 2 dynamically registered');
    const team2Token = reg2Res.data?.data?.token;
    const team2Id = reg2Res.data?.data?.user?.id;
    const team2Headers = { headers: { Authorization: `Bearer ${team2Token}` } };

    // Test duplicate username rejection
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        teamName: `Another Name ${Date.now()}`,
        username: team1Username,
        password: 'password123',
        confirmPassword: 'password123',
      });
      assert(false, 'Duplicate username should have been rejected');
    } catch (err) {
      assert(err.response?.status === 409, 'Duplicate username rejected with 409 Conflict');
    }

    // 4. Verify Admin Can See Dynamically Registered Teams
    console.log('\n[Step 4] Checking Dynamic Teams in Admin Management...');
    const adminTeamsRes = await axios.get(`${BASE_URL}/admin/teams`, adminHeaders);
    const allTeams = adminTeamsRes.data?.data || [];
    assert(allTeams.some(t => t.username === team1Username), 'Admin sees dynamically registered Team 1');
    assert(allTeams.some(t => t.username === team2Username), 'Admin sees dynamically registered Team 2');

    // 5. Problems & Hidden Test Case Privacy
    console.log('\n[Step 5] Checking Problems and Test Case Privacy...');
    const problemsRes = await axios.get(`${BASE_URL}/problems`, team1Headers);
    assert(problemsRes.data?.data?.length > 0, 'Fetched problems list for team');
    const problem = problemsRes.data.data[0];

    const problemDetailsRes = await axios.get(`${BASE_URL}/problems/${problem.id}`, team1Headers);
    const sampleCases = problemDetailsRes.data?.data?.sampleTestCases || [];
    assert(sampleCases.length > 0, 'Team receives sample test cases');
    // Ensure NO hidden test cases leaked
    const hasHidden = sampleCases.some(tc => tc.isHidden === true);
    assert(!hasHidden, 'Security check passed: NO hidden test cases sent to team/frontend');

    // 6. Test Run Code (Playground testing with all 5 languages)
    console.log('\n[Step 6] Testing Run Code Across All 5 Supported Languages...');
    // Python
    const runResPy = await axios.post(`${BASE_URL}/submissions/run`, {
      sourceCode: 'import sys\nline = sys.stdin.read().strip()\nprint("CodeArena Echo Python:", line)',
      language: 'python',
      customInput: 'Hello 2026',
    }, team1Headers);
    assert(runResPy.data?.data?.output?.includes('CodeArena Echo Python: Hello 2026'), 'Python (python-3.14) execution verified');

    // C++
    const runResCpp = await axios.post(`${BASE_URL}/submissions/run`, {
      sourceCode: '#include <iostream>\nusing namespace std;\nint main() { cout << "CodeArena C++ OK" << endl; return 0; }',
      language: 'cpp',
      customInput: '',
    }, team1Headers);
    assert(runResCpp.data?.data?.output?.includes('CodeArena C++ OK'), 'C++ (g++-15) execution verified');

    // C
    const runResC = await axios.post(`${BASE_URL}/submissions/run`, {
      sourceCode: '#include <stdio.h>\nint main() { printf("CodeArena C OK\\n"); return 0; }',
      language: 'c',
      customInput: '',
    }, team1Headers);
    assert(runResC.data?.data?.output?.includes('CodeArena C OK'), 'C (gcc-15) execution verified');

    // Java
    const runResJava = await axios.post(`${BASE_URL}/submissions/run`, {
      sourceCode: 'public class Main { public static void main(String[] args) { System.out.println("CodeArena Java OK"); } }',
      language: 'java',
      customInput: '',
    }, team1Headers);
    assert(runResJava.data?.data?.output?.includes('CodeArena Java OK'), 'Java (openjdk-25) execution verified');

    // JavaScript
    const runResJS = await axios.post(`${BASE_URL}/submissions/run`, {
      sourceCode: 'console.log("CodeArena JS OK");',
      language: 'javascript',
      customInput: '',
    }, team1Headers);
    assert(runResJS.data?.data?.output?.includes('CodeArena JS OK'), 'JavaScript (nodejs-24) execution verified');

    // 7. Test Submit Code - Two Sum Target problem
    console.log('\n[Step 7] Testing Submission & Scoring System...');
    // Find "Two Sum Target" problem
    const twoSumProblem = problemsRes.data.data.find(p => p.title === 'Two Sum Target') || problem;

    // A. Submit Partial/Student-style Code with prompt prints (like "Enter array size:\nNumbers: 2, 7")
    const studentPythonCode = `import sys

def solve():
    print("Enter array size:")
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])
    
    seen = set()
    found = []
    for x in nums:
        diff = target - x
        if diff in seen:
            pair = sorted([diff, x])
            found.append(pair)
        seen.add(x)
    
    if not found:
        print("No pair found")
    else:
        found.sort(key=lambda p: (p[0], p[1]))
        print(f"Numbers: {found[0][0]}, {found[0][1]}")

solve()
`;

    const studentSubmitRes = await axios.post(`${BASE_URL}/submissions/submit`, {
      problemId: twoSumProblem.id,
      language: 'python',
      sourceCode: studentPythonCode,
    }, team1Headers);

    assert(studentSubmitRes.data?.data?.status === 'ACCEPTED', 'Student code with input prompts and labels correctly ACCEPTED (fixed!)');
    assert(studentSubmitRes.data?.data?.passedTestCases === 5, 'All 5 test cases passed with intelligent output matching');
    assert(studentSubmitRes.data?.data?.isScoreIncrease === true, 'Score increase awarded points');

    // B. Test Partial Scoring (Code that passes only some test cases)
    const palindromeProblem = problemsRes.data.data.find(p => p.title === 'Palindrome Sentence');
    if (palindromeProblem) {
      // Always outputs YES -> passes 4 out of 6 test cases
      const partialRes = await axios.post(`${BASE_URL}/submissions/submit`, {
        problemId: palindromeProblem.id,
        language: 'python',
        sourceCode: 'print("YES")',
      }, team2Headers);

      assert(partialRes.data?.data?.status === 'PARTIALLY_ACCEPTED', 'Partial solution classified as PARTIALLY_ACCEPTED');
      assert(partialRes.data?.data?.passedTestCases === 4, 'Passed exactly 4/6 test cases');
      assert(partialRes.data?.data?.earnedPoints > 0, `Partial score awarded: +${partialRes.data?.data?.earnedPoints} points for passed cases`);
    }

    // C. Test Penalty Time & Tie-Breaking
    console.log('\n[Step 8] Testing Live Dynamic Leaderboard & Tie-Breaker...');
    const leaderboardRes = await axios.get(`${BASE_URL}/leaderboard`);
    const leaderboard = leaderboardRes.data?.data || [];
    assert(leaderboard.length >= 2, 'Leaderboard includes dynamic registered teams');
    const team1InLeaderboard = leaderboard.find(t => t.username === team1Username);
    assert(team1InLeaderboard?.totalPoints === twoSumProblem.points, `Team 1 on leaderboard with ${twoSumProblem.points} points`);
    assert(typeof team1InLeaderboard?.totalPenaltySeconds === 'number', 'Penalty time calculated in seconds');
    assert(leaderboard[0].totalPoints >= leaderboard[1].totalPoints, 'Leaderboard sorted by total points (with penalty time tie breaker)');

    // 9. Admin Team Management controls
    console.log('\n[Step 9] Testing Admin Team Management Operations...');
    // Edit team
    const editRes = await axios.put(`${BASE_URL}/admin/teams/${team2Id || allTeams[0].id}`, {
      teamName: `Renamed Team ${Date.now()}`,
    }, adminHeaders);
    assert(editRes.data?.success === true, 'Admin successfully updated team name');

    // Reset password
    const resetRes = await axios.put(`${BASE_URL}/admin/teams/${team2Id || allTeams[0].id}/reset-password`, {
      newPassword: 'newsecurepassword123',
    }, adminHeaders);
    assert(resetRes.data?.success === true, 'Admin successfully reset team password');

    // Toggle active status
    const toggleRes = await axios.patch(`${BASE_URL}/admin/teams/${team2Id || allTeams[0].id}/toggle-status`, {}, adminHeaders);
    assert(toggleRes.data?.success === true, 'Admin successfully toggled team active/disabled status');

    console.log('\n========================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('========================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Unexpected error during testing:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();
