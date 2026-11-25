require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

async function main() {
  console.log('--- Starting CodeArena Database Seeding ---');

  // 1. Seed Administrator
  const adminUsername = 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is required to seed the administrator account.');
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findFirst({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        teamName: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`[Seed] Admin created: username: ${admin.username}`);
  } else {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`[Seed] Admin credentials updated for username: ${adminUsername}`);
  }

  // 2. Seed Default Active Competition
  let comp = await prisma.competition.findFirst();
  if (!comp) {
    const now = new Date();
    const duration = 120; // 2 hours
    const endTime = new Date(now.getTime() + duration * 60 * 1000);

    comp = await prisma.competition.create({
      data: {
        name: 'CodeSprint 2026 - College Championship',
        description: 'Annual inter-college programming showdown. Solve problems, score points, and lead the board!',
        duration,
        startTime: now,
        endTime,
        status: 'ACTIVE',
      },
    });
    console.log(`[Seed] Competition created: ${comp.name} (Status: ACTIVE, Duration: ${duration}m)`);
  } else {
    console.log(`[Seed] Competition exists: ${comp.name} (Status: ${comp.status})`);
  }

  // 3. Seed Standard Programming Problems with Sample & Hidden Test Cases
  const problemCount = await prisma.problem.count();
  if (problemCount === 0) {
    const problemsData = [
      {
        title: 'Two Sum Target',
        difficulty: 'EASY',
        points: 100,
        order: 1,
        timeLimit: 2.0,
        memoryLimit: 256,
        description: `Given a list of integers and a target sum, determine whether there exist two distinct elements in the list whose sum equals the target.

### Example:
Input:
\`\`\`text
5
2 7 11 15 3
9
\`\`\`
Output:
\`\`\`text
2 7
\`\`\`
`,
        inputFormat: 'First line contains integer N (2 <= N <= 10^5).\nSecond line contains N space-separated integers.\nThird line contains the target sum T.',
        outputFormat: 'Print the two numbers in ascending order separated by a space if a valid pair exists. If multiple pairs exist, print the pair containing the smallest number. If no pair exists, print "NONE".',
        constraints: '2 <= N <= 10^5\n-10^9 <= nums[i] <= 10^9\n-10^9 <= T <= 10^9',
        testCases: [
          // Sample test cases
          { input: '5\n2 7 11 15 3\n9', expectedOutput: '2 7', isHidden: false, order: 1 },
          { input: '4\n3 2 4 1\n6', expectedOutput: '2 4', isHidden: false, order: 2 },
          // Hidden test cases
          { input: '3\n3 3 1\n6', expectedOutput: '3 3', isHidden: true, order: 3 },
          { input: '5\n1 2 3 4 5\n10', expectedOutput: 'NONE', isHidden: true, order: 4 },
          { input: '6\n-5 10 2 -3 8 0\n-8', expectedOutput: '-5 -3', isHidden: true, order: 5 },
        ],
      },
      {
        title: 'Palindrome Sentence',
        difficulty: 'EASY',
        points: 100,
        order: 2,
        timeLimit: 2.0,
        memoryLimit: 256,
        description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`YES\` if it is a palindrome, or \`NO\` otherwise.

### Example:
Input:
\`\`\`text
A man, a plan, a canal: Panama
\`\`\`
Output:
\`\`\`text
YES
\`\`\`
`,
        inputFormat: 'A single line containing the string s.',
        outputFormat: 'Print "YES" if the sentence is a palindrome, otherwise print "NO".',
        constraints: '1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.',
        testCases: [
          // Sample test cases
          { input: 'A man, a plan, a canal: Panama', expectedOutput: 'YES', isHidden: false, order: 1 },
          { input: 'race a car', expectedOutput: 'NO', isHidden: false, order: 2 },
          // Hidden test cases
          { input: ' ', expectedOutput: 'YES', isHidden: true, order: 3 },
          { input: '0P', expectedOutput: 'NO', isHidden: true, order: 4 },
          { input: 'Was it a car or a cat I saw?', expectedOutput: 'YES', isHidden: true, order: 5 },
          { input: 'No lemon, no melon', expectedOutput: 'YES', isHidden: true, order: 6 },
        ],
      },
      {
        title: 'Reverse Words in a String',
        difficulty: 'MEDIUM',
        points: 200,
        order: 3,
        timeLimit: 2.0,
        memoryLimit: 256,
        description: `Given an input string \`s\`, reverse the order of the words.

A **word** is defined as a sequence of non-space characters. The words in \`s\` will be separated by at least one space.

Return a string of the words in reverse order concatenated by a single space.
Note that \`s\` may contain leading or trailing spaces or multiple spaces between two words. The returned string should only have a single space separating the words. Do not include any extra spaces.

### Example:
Input:
\`\`\`text
the sky is blue
\`\`\`
Output:
\`\`\`text
blue is sky the
\`\`\`
`,
        inputFormat: 'A single line containing the string s.',
        outputFormat: 'Print the string with words in reversed order separated by a single space.',
        constraints: '1 <= s.length <= 10^4\ns contains English letters (upper-case and lower-case), digits, and spaces \' \'.',
        testCases: [
          // Sample test cases
          { input: 'the sky is blue', expectedOutput: 'blue is sky the', isHidden: false, order: 1 },
          { input: '  hello world  ', expectedOutput: 'world hello', isHidden: false, order: 2 },
          // Hidden test cases
          { input: 'a good   example', expectedOutput: 'example good a', isHidden: true, order: 3 },
          { input: 'CodeArena', expectedOutput: 'CodeArena', isHidden: true, order: 4 },
          { input: '   Bob    Loves  Alice   ', expectedOutput: 'Alice Loves Bob', isHidden: true, order: 5 },
        ],
      },
      {
        title: 'Valid Parentheses',
        difficulty: 'MEDIUM',
        points: 200,
        order: 4,
        timeLimit: 2.0,
        memoryLimit: 256,
        description: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example:
Input:
\`\`\`text
()[]{}
\`\`\`
Output:
\`\`\`text
VALID
\`\`\`
`,
        inputFormat: 'A single line containing the string s composed of bracket characters.',
        outputFormat: 'Print "VALID" if the string is valid, or "INVALID" otherwise.',
        constraints: '1 <= s.length <= 10^5\ns consists of parentheses only \'()[]{}\'.',
        testCases: [
          // Sample test cases
          { input: '()', expectedOutput: 'VALID', isHidden: false, order: 1 },
          { input: '()[]{}', expectedOutput: 'VALID', isHidden: false, order: 2 },
          { input: '(]', expectedOutput: 'INVALID', isHidden: false, order: 3 },
          // Hidden test cases
          { input: '([)]', expectedOutput: 'INVALID', isHidden: true, order: 4 },
          { input: '{[]}', expectedOutput: 'VALID', isHidden: true, order: 5 },
          { input: '(((({{{{[[[[((()))]]]]}}}}))))', expectedOutput: 'VALID', isHidden: true, order: 6 },
          { input: '[[[[', expectedOutput: 'INVALID', isHidden: true, order: 7 },
        ],
      },
      {
        title: 'Maximum Subarray Sum',
        difficulty: 'HARD',
        points: 300,
        order: 5,
        timeLimit: 2.0,
        memoryLimit: 256,
        description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

A **subarray** is a contiguous non-empty sequence of elements within an array.

### Example:
Input:
\`\`\`text
9
-2 1 -3 4 -1 2 1 -5 4
\`\`\`
Output:
\`\`\`text
6
\`\`\`
Explanation: The subarray [4, -1, 2, 1] has the largest sum 6.
`,
        inputFormat: 'First line contains integer N (1 <= N <= 10^5).\nSecond line contains N space-separated integers.',
        outputFormat: 'Print the maximum subarray sum as a single integer.',
        constraints: '1 <= N <= 10^5\n-10^4 <= nums[i] <= 10^4',
        testCases: [
          // Sample test cases
          { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false, order: 1 },
          { input: '1\n1', expectedOutput: '1', isHidden: false, order: 2 },
          { input: '5\n5 4 -1 7 8', expectedOutput: '23', isHidden: false, order: 3 },
          // Hidden test cases
          { input: '5\n-5 -2 -8 -1 -4', expectedOutput: '-1', isHidden: true, order: 4 },
          { input: '6\n-10 20 -5 15 -30 25', expectedOutput: '30', isHidden: true, order: 5 },
          { input: '8\n10 -2 3 -4 5 -1 2 -3', expectedOutput: '13', isHidden: true, order: 6 },
        ],
      },
    ];

    for (const prob of problemsData) {
      const { testCases, ...pData } = prob;
      const createdProb = await prisma.problem.create({
        data: {
          ...pData,
          competitionId: comp.id,
          testCases: {
            create: testCases,
          },
        },
      });
      console.log(`[Seed] Created problem: "${createdProb.title}" (${createdProb.difficulty}, ${createdProb.points} pts) with ${testCases.length} test cases`);
    }
  } else {
    console.log(`[Seed] ${problemCount} problems already exist in database.`);
  }

  console.log('--- CodeArena Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
