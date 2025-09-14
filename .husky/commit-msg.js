const { execSync } = require('child_process');
const fs = require('fs');

const commitMsgFile = process.argv[2];
const commitMsg = fs.readFileSync(commitMsgFile, 'utf8').trim();

if (commitMsg.startsWith('Merge')) {
  process.exit(0);
}

const branch = execSync('git rev-parse --abbrev-ref HEAD', {
  encoding: 'utf8',
}).trim();

const mainBranches = ['main', 'master', 'develop', 'development'];
if (mainBranches.includes(branch)) {
  console.log('✅ Main branch - no issue key required');
  process.exit(0);
}

const issueKeyMatch = branch.match(/([A-Z]+-\d+)/);

if (!issueKeyMatch) {
  console.log(
    'ℹ️  No Jira issue key found in branch name - proceeding without prefix',
  );
  process.exit(0);
}

const issueKey = issueKeyMatch[1];

if (commitMsg.startsWith(`${issueKey}:`)) {
  console.log('✅ Issue key already present');
  process.exit(0);
}

const newCommitMsg = `${issueKey}: ${commitMsg}`;
fs.writeFileSync(commitMsgFile, newCommitMsg);

console.log(`✅ Added ${issueKey} to commit message`);
