#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

REQUIRED_FILES = [
    Path("Chain.ts"),
    Path("SwapProvider.ts"),
    Path("swap/Approval.ts"),
    Path("swap/Mod.ts"),
]

IMPORT_PATCHES = {
    Path("swap/Approval.ts"): 'import { SwapProvider } from "../SwapProvider";\n\n',
    Path("swap/Mod.ts"): 'import { QuoteAsset } from "./Approval";\n\n',
}

TEMPLATE_DIR = Path(__file__).parent / "templates"
INDEX_TEMPLATE = TEMPLATE_DIR / "primitives_index.ts"

def copy_required_files(source_root: Path, target_root: Path) -> None:
    primitives_root = source_root / "primitives"
    if not primitives_root.exists():
        raise FileNotFoundError(f"Generated primitives directory not found at {primitives_root}")

    if target_root.exists():
        shutil.rmtree(target_root)
    target_root.mkdir(parents=True)

    for relative_path in REQUIRED_FILES:
        source = primitives_root / relative_path
        if not source.exists():
            raise FileNotFoundError(f"Expected generated file missing: {source}")
        destination = target_root / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        apply_import_patch(destination, IMPORT_PATCHES.get(relative_path))

    index_path = target_root / "index.ts"
    index_path.write_text(INDEX_TEMPLATE.read_text())


def apply_import_patch(file_path: Path, patch: str | None) -> None:
    if not patch:
        return

    content = file_path.read_text()
    if patch.strip() in content:
        return

    marker = "*/\n\n"
    if marker in content:
        content = content.replace(marker, marker + patch, 1)
    else:
        content = patch + content
    file_path.write_text(content)
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    copy_required_files(args.source_dir, args.output_dir)


if __name__ == "__main__":
    main()
