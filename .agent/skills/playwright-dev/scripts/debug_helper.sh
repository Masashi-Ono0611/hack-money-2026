#!/bin/bash
# Debug helper for Playwright tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

show_help() {
    cat << EOF
🔍 Playwright Debug Helper

Usage: $0 [command] [options]

Commands:
    debug <test>        Run test in debug mode with Playwright Inspector
    headed <test>       Run test in headed mode (visible browser)
    trace <test>        Run test and open trace viewer
    codegen <url>       Launch Codegen to record interactions
    inspector           Launch Playwright Inspector standalone
    doctor              Run diagnostics

Options:
    --browser <name>    Specify browser: chromium, firefox, webkit (default: chromium)
    --timeout <ms>      Set timeout in milliseconds (default: 30000)

Examples:
    $0 debug tests/login.spec.ts
    $0 headed tests/checkout.spec.ts --browser firefox
    $0 trace tests/api.spec.ts
    $0 codegen https://example.com
EOF
}

debug_test() {
    local test_file=$1
    local browser=${2:-chromium}

    echo -e "${GREEN}🔍 Running test in debug mode...${NC}"
    echo -e "${YELLOW}Playwright Inspector will open automatically${NC}"
    echo ""

    PWDEBUG=1 npx playwright test "$test_file" --project="$browser"
}

headed_test() {
    local test_file=$1
    local browser=${2:-chromium}

    echo -e "${GREEN}👁️  Running test in headed mode...${NC}"
    echo ""

    npx playwright test "$test_file" --headed --project="$browser"
}

trace_test() {
    local test_file=$1
    local browser=${2:-chromium}

    echo -e "${GREEN}📹 Running test with tracing...${NC}"
    echo ""

    npx playwright test "$test_file" --trace on --project="$browser"

    echo ""
    echo -e "${GREEN}✅ Test completed. Opening trace viewer...${NC}"

    # Find the most recent trace file
    TRACE_FILE=$(find test-results -name "trace.zip" -type f -print0 | xargs -0 ls -t | head -n 1)

    if [ -n "$TRACE_FILE" ]; then
        npx playwright show-trace "$TRACE_FILE"
    else
        echo -e "${YELLOW}⚠️  No trace file found. Opening trace viewer without file...${NC}"
        npx playwright show-trace
    fi
}

run_codegen() {
    local url=${1:-""}

    echo -e "${GREEN}🎬 Launching Playwright Codegen...${NC}"
    echo -e "${YELLOW}Interact with the browser to generate test code${NC}"
    echo ""

    if [ -z "$url" ]; then
        npx playwright codegen
    else
        npx playwright codegen "$url"
    fi
}

launch_inspector() {
    echo -e "${GREEN}🔍 Launching Playwright Inspector...${NC}"
    echo ""

    npx playwright open
}

run_doctor() {
    echo -e "${GREEN}🏥 Running Playwright diagnostics...${NC}"
    echo ""

    echo "📦 Checking Playwright installation..."
    npx playwright --version

    echo ""
    echo "🌐 Checking installed browsers..."
    npx playwright install --dry-run

    echo ""
    echo "⚙️  Checking configuration..."
    if [ -f "playwright.config.ts" ]; then
        echo -e "${GREEN}✅ playwright.config.ts found${NC}"
    elif [ -f "playwright.config.js" ]; then
        echo -e "${GREEN}✅ playwright.config.js found${NC}"
    else
        echo -e "${RED}❌ No playwright.config found${NC}"
    fi

    echo ""
    echo "📁 Checking test directory..."
    if [ -d "tests" ]; then
        test_count=$(find tests -name "*.spec.ts" -o -name "*.spec.js" | wc -l)
        echo -e "${GREEN}✅ Found $test_count test files${NC}"
    else
        echo -e "${YELLOW}⚠️  No tests directory found${NC}"
    fi

    echo ""
    echo "📊 Running a quick test to verify setup..."
    npx playwright test --list 2>&1 | head -n 10

    echo ""
    echo -e "${GREEN}✅ Diagnostics complete${NC}"
}

# Main script logic
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

COMMAND=$1
shift

# Parse options
BROWSER="chromium"
TIMEOUT="30000"

while [[ $# -gt 0 ]]; do
    case $1 in
        --browser)
            BROWSER="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            TEST_FILE="$1"
            shift
            ;;
    esac
done

# Execute command
case $COMMAND in
    debug)
        if [ -z "$TEST_FILE" ]; then
            echo -e "${RED}❌ Error: Test file required${NC}"
            show_help
            exit 1
        fi
        debug_test "$TEST_FILE" "$BROWSER"
        ;;
    headed)
        if [ -z "$TEST_FILE" ]; then
            echo -e "${RED}❌ Error: Test file required${NC}"
            show_help
            exit 1
        fi
        headed_test "$TEST_FILE" "$BROWSER"
        ;;
    trace)
        if [ -z "$TEST_FILE" ]; then
            echo -e "${RED}❌ Error: Test file required${NC}"
            show_help
            exit 1
        fi
        trace_test "$TEST_FILE" "$BROWSER"
        ;;
    codegen)
        run_codegen "$TEST_FILE"
        ;;
    inspector)
        launch_inspector
        ;;
    doctor)
        run_doctor
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac
