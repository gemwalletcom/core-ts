list:
    just --list

install:
    pnpm install

build:
    pnpm run build

start:
    pnpm run start:api

dev:
    pnpm dev

test:
    pnpm run test

clean:
    pnpm run clean
    rm -rf packages/swapper/dist packages/swapper/tsconfig.tsbuildinfo
    rm -rf packages/types/dist packages/types/tsconfig.tsbuildinfo

docker-build:
    docker build -t core-ts:test .

docker-run:
    docker rm -f test-container || true
    docker run -d --rm --name test-container -p 3000:3000 core-ts:test

generate:
    #!/bin/bash
    set -euo pipefail
    if [ ! -d "../core" ]; then
        echo "core folder not found"
        exit 1
    fi

    TMP_DIR="$(mktemp -d)"
    cleanup() {
        rm -rf "${TMP_DIR}"
    }
    trap cleanup EXIT

    (cd ../core && cargo run --package generate --bin generate web "${TMP_DIR}" 1>/dev/null)

    OUTPUT_DIR="packages/types/src/primitives"
    rm -f packages/types/src/primitives.ts
    python3 scripts/prepare_typeshare.py "${TMP_DIR}" "${OUTPUT_DIR}"
