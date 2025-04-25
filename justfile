install:
    pnpm install
build: install
    pnpm run build
start:
    pnpm run start:api
dev:
    pnpm dev
test: build
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
    # check if core folder exists
    if [ ! -d "../core" ]; then
        echo "core folder not found"
        exit 1
    fi
    typeshare --lang=typescript --output-file=packages/types/src/primitives.ts --config-file=../core/typeshare.toml ../core/crates/primitives 1>/dev/null 2>&1
