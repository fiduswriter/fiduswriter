#!/bin/bash
#
# Automated dependency check script for Fidus Writer
# This script can be run via cron to check for outdated dependencies
# and optionally send notifications.
#
# Usage:
#   ./check_deps.sh [--update] [--email recipient@example.com]
#
# Options:
#   --update    Automatically update dependencies (use with caution)
#   --email     Send results via email to specified address
#   --slack     Send notification to Slack webhook URL
#
# Example cron entry (check weekly on Monday at 9 AM):
#   0 9 * * 1 cd /path/to/fiduswriter && ./devel/check_deps.sh --email admin@example.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${PROJECT_DIR}/dependency_check.log"
UPDATE_MODE=false
EMAIL_RECIPIENT=""
SLACK_WEBHOOK=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --update)
            UPDATE_MODE=true
            shift
            ;;
        --email)
            EMAIL_RECIPIENT="$2"
            shift 2
            ;;
        --slack)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Function to log messages
log() {
    echo -e "$1" | tee -a "${LOG_FILE}"
}

# Function to send email
send_email() {
    local subject="$1"
    local body="$2"
    
    if [ -n "${EMAIL_RECIPIENT}" ]; then
        if command -v mail &> /dev/null; then
            echo "${body}" | mail -s "${subject}" "${EMAIL_RECIPIENT}"
            log "${GREEN}Email sent to ${EMAIL_RECIPIENT}${NC}"
        else
            log "${YELLOW}Warning: 'mail' command not found. Install mailutils to enable email notifications.${NC}"
        fi
    fi
}

# Function to send Slack notification
send_slack() {
    local message="$1"
    
    if [ -n "${SLACK_WEBHOOK}" ]; then
        if command -v curl &> /dev/null; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"${message}\"}" \
                "${SLACK_WEBHOOK}" 2>&1 > /dev/null
            log "${GREEN}Slack notification sent${NC}"
        else
            log "${YELLOW}Warning: 'curl' command not found. Cannot send Slack notification.${NC}"
        fi
    fi
}

# Change to project directory
cd "${PROJECT_DIR}"

# Clear previous log
> "${LOG_FILE}"

log "=========================================="
log "Fidus Writer Dependency Check"
log "Date: $(date)"
log "=========================================="
log ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    log "${RED}Error: Python 3 is not installed${NC}"
    exit 1
fi

# Check if Django is available
if ! python3 -c "import django" 2>/dev/null; then
    log "${YELLOW}Warning: Django not found in current environment${NC}"
    log "Attempting to use standalone checker..."
    
    # Run standalone checker
    if [ "${UPDATE_MODE}" = true ]; then
        log "${YELLOW}Running dependency update...${NC}"
        python3 "${SCRIPT_DIR}/update_all_deps.py" | tee -a "${LOG_FILE}"
        RESULT=$?
    else
        log "${YELLOW}Checking for outdated dependencies...${NC}"
        # Create a simple check script
        python3 << 'EOF' | tee -a "${LOG_FILE}"
import sys
sys.path.insert(0, 'devel')
from update_all_deps import *

# Count outdated packages
script_dir = Path(__file__).parent if '__file__' in locals() else Path.cwd()
requirements_files = sorted(script_dir.glob('*requirements*.txt'))
package_json5_files = []
for item in script_dir.iterdir():
    if item.is_dir():
        package_file = item / 'package.json5'
        if package_file.exists():
            package_json5_files.append(package_file)

outdated_count = 0

print("\n=== Python Dependencies ===\n")
for req_file in requirements_files:
    packages = parse_requirements_txt(str(req_file))
    for package_name, version_spec, _ in packages:
        if package_name and version_spec and not version_spec.startswith('#'):
            current_match = re.search(r'([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:\.[0-9]+)?)', version_spec)
            if current_match:
                current_version = current_match.group(1)
                latest_version = get_latest_pypi_version(package_name)
                if latest_version and latest_version != current_version:
                    print(f"{req_file.name}: {package_name} {current_version} -> {latest_version}")
                    outdated_count += 1

print("\n=== JavaScript Dependencies ===\n")
for package_file in sorted(package_json5_files):
    data = parse_package_json5(str(package_file))
    if 'dependencies' in data:
        for package_name, version in data['dependencies'].items():
            clean_version = re.sub(r'^[\^~>=<]+', '', str(version))
            latest_version = get_latest_npm_version(package_name)
            if latest_version and latest_version != clean_version:
                print(f"{package_file.parent.name}: {package_name} {version} -> {latest_version}")
                outdated_count += 1

print(f"\nTotal outdated packages: {outdated_count}")
sys.exit(0 if outdated_count == 0 else 1)
EOF
        RESULT=$?
    fi
else
    # Django is available, use management commands
    if [ "${UPDATE_MODE}" = true ]; then
        log "${YELLOW}Running dependency update via Django management command...${NC}"
        python3 manage.py update_dependencies | tee -a "${LOG_FILE}"
        RESULT=$?
    else
        log "${YELLOW}Checking for outdated dependencies via Django management command...${NC}"
        python3 manage.py check_dependencies | tee -a "${LOG_FILE}"
        RESULT=$?
    fi
fi

log ""
log "=========================================="

# Process results
if [ $RESULT -eq 0 ]; then
    log "${GREEN}✓ All dependencies are up to date!${NC}"
    send_email "Fidus Writer: Dependencies Up to Date" "All dependencies are current. No action needed."
    send_slack "✓ Fidus Writer: All dependencies are up to date!"
else
    if [ "${UPDATE_MODE}" = true ]; then
        log "${YELLOW}Dependencies have been updated. Please review and test.${NC}"
        
        # Read log content for email
        LOG_CONTENT=$(cat "${LOG_FILE}")
        send_email "Fidus Writer: Dependencies Updated" "${LOG_CONTENT}"
        send_slack "⚠️ Fidus Writer: Dependencies have been automatically updated. Please review."
    else
        log "${YELLOW}⚠ Outdated dependencies found. Run with --update to update them.${NC}"
        
        # Read log content for email
        LOG_CONTENT=$(cat "${LOG_FILE}")
        send_email "Fidus Writer: Outdated Dependencies Found" "${LOG_CONTENT}"
        send_slack "⚠️ Fidus Writer: Outdated dependencies detected. Please review."
    fi
fi

log ""
log "Log saved to: ${LOG_FILE}"
log "=========================================="

exit $RESULT