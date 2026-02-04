#!/bin/bash
# CI/CD optimized Playwright test runner

set -e

# Default configuration
BROWSER="${BROWSER:-chromium}"
WORKERS="${WORKERS:-2}"
RETRIES="${RETRIES:-2}"
REPORTER="${REPORTER:-html,json}"
SHARD="${SHARD:-}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

show_help() {
    cat << EOF
🚀 Playwright CI Test Runner

Usage: $0 [options]

Environment Variables:
    BROWSER         Browser to test (chromium, firefox, webkit) [default: chromium]
    WORKERS         Number of parallel workers [default: 2]
    RETRIES         Number of retries on failure [default: 2]
    REPORTER        Reporter format (html, json, junit, etc.) [default: html,json]
    SHARD           Shard tests (e.g., "1/3" for shard 1 of 3)

Options:
    --shard <n/total>   Run only a shard of tests
    --grep <pattern>    Run tests matching pattern
    --update-snapshots  Update visual snapshots
    --help              Show this help message

Examples:
    # Run all tests
    $0

    # Run with specific browser
    BROWSER=firefox $0

    # Run sharded tests (for parallel CI jobs)
    $0 --shard 1/3
    $0 --shard 2/3
    $0 --shard 3/3

    # Run tests matching pattern
    $0 --grep "login"

    # Update snapshots
    $0 --update-snapshots
EOF
}

# Parse arguments
UPDATE_SNAPSHOTS=false
GREP_PATTERN=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --shard)
            if [[ ! $2 =~ ^[0-9]+/[0-9]+$ ]]; then
                echo -e "${RED}❌ Invalid shard format: $2${NC}"
                echo -e "${YELLOW}Expected format: n/total (e.g., 1/3)${NC}"
                exit 1
            fi
            SHARD="$2"
            shift 2
            ;;
        --grep)
            if [ -z "$2" ]; then
                echo -e "${RED}❌ --grep requires a pattern${NC}"
                exit 1
            fi
            GREP_PATTERN="$2"
            shift 2
            ;;
        --update-snapshots)
            UPDATE_SNAPSHOTS=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🎭 Starting Playwright CI Test Runner${NC}"
echo ""
echo "Configuration:"
echo "  Browser: $BROWSER"
echo "  Workers: $WORKERS"
echo "  Retries: $RETRIES"
echo "  Reporter: $REPORTER"
[ -n "$SHARD" ] && echo "  Shard: $SHARD"
[ -n "$GREP_PATTERN" ] && echo "  Grep: $GREP_PATTERN"
echo ""

# Install browsers if not present (idempotent)
echo -e "${YELLOW}📦 Ensuring browsers are installed...${NC}"
npx playwright install --with-deps "$BROWSER" || {
    echo -e "${YELLOW}⚠️  Browser installation failed, continuing anyway...${NC}"
}

# Build test command
CMD="npx playwright test"
CMD="$CMD --project=$BROWSER"
CMD="$CMD --workers=$WORKERS"
CMD="$CMD --retries=$RETRIES"

# Add reporter flags
IFS=',' read -ra REPORTERS <<< "$REPORTER"
for rep in "${REPORTERS[@]}"; do
    case $rep in
        html)
            CMD="$CMD --reporter=html"
            ;;
        json)
            CMD="$CMD --reporter=json"
            ;;
        junit)
            CMD="$CMD --reporter=junit"
            ;;
        list)
            CMD="$CMD --reporter=list"
            ;;
        dot)
            CMD="$CMD --reporter=dot"
            ;;
        *)
            CMD="$CMD --reporter=$rep"
            ;;
    esac
done

# Add optional flags
[ -n "$SHARD" ] && CMD="$CMD --shard=$SHARD"
[ -n "$GREP_PATTERN" ] && CMD="$CMD --grep=\"$GREP_PATTERN\""
[ "$UPDATE_SNAPSHOTS" = true ] && CMD="$CMD --update-snapshots"

echo -e "${GREEN}🚀 Running tests...${NC}"
echo "Command: $CMD"
echo ""

# Run tests
if eval "$CMD"; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    EXIT_CODE=0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    EXIT_CODE=1
fi

# Generate artifacts summary
echo ""
echo -e "${YELLOW}📊 Test Artifacts:${NC}"

if [ -d "playwright-report" ]; then
    echo "  📄 HTML Report: playwright-report/index.html"
fi

if [ -f "test-results.json" ]; then
    echo "  📋 JSON Results: test-results.json"
fi

if [ -d "test-results" ]; then
    FAILURE_COUNT=$(find test-results -name "trace.zip" 2>/dev/null | wc -l)
    if [ "$FAILURE_COUNT" -gt 0 ]; then
        echo "  🎬 Traces: $FAILURE_COUNT traces in test-results/"
    fi

    SCREENSHOT_COUNT=$(find test-results -name "*.png" 2>/dev/null | wc -l)
    if [ "$SCREENSHOT_COUNT" -gt 0 ]; then
        echo "  📸 Screenshots: $SCREENSHOT_COUNT screenshots in test-results/"
    fi
fi

echo ""
echo -e "${GREEN}✨ Test run complete${NC}"

exit $EXIT_CODE
