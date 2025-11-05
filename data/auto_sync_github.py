import os
import subprocess
from datetime import datetime

# --- CONFIGURATION ---
REPO_DIR = r"C:\WORK FOLDER\websites\realestate-portal"  # your repo path
COMMIT_MESSAGE = f"Auto-sync at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
BRANCH = "main"  # or 'master' if your repo uses that

# --- FUNCTIONS ---

def run_cmd(command):
    """Run a system command and return output."""
    result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=REPO_DIR)
    if result.returncode == 0:
        print(f"✅ {command}\n{result.stdout}")
    else:
        print(f"❌ {command}\n{result.stderr}")
    return result.returncode == 0

def git_sync():
    print("🔄 Starting GitHub sync process...\n")

    # Step 1: Check if repo initialized
    if not os.path.exists(os.path.join(REPO_DIR, ".git")):
        print("⚠️ Not a git repository. Please run `git init` manually once.")
        return

    # Step 2: Git add all changes
    run_cmd("git add .")

    # Step 3: Commit changes
    run_cmd(f'git commit -m "{COMMIT_MESSAGE}"')

    # Step 4: Pull latest (avoid conflicts)
    run_cmd(f"git pull origin {BRANCH} --rebase")

    # Step 5: Push changes
    run_cmd(f"git push origin {BRANCH}")

    print("\n✅ GitHub repository successfully synchronized!")

if __name__ == "__main__":
    git_sync()
