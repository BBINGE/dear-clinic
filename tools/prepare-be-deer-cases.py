"""Create publication-safe BE DEER case images from paired source folders.

The source tree is intentionally treated as opaque: no source folder or file name
is copied to the public output. The full identity/header band is covered before
the image is resized, encoded without metadata, and given a neutral case number.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


def redact_and_export(source: Path, destination: Path) -> None:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")

    width, height = image.size
    draw = ImageDraw.Draw(image)
    draw.rectangle(
        (
            round(width * 0.018),
            round(height * 0.064),
            round(width * 0.982),
            round(height * 0.172),
        ),
        fill=(248, 248, 246),
    )

    if width > 1200:
        resized_height = round(height * (1200 / width))
        image = image.resize((1200, resized_height), Image.Resampling.LANCZOS)

    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=80, method=6, exif=b"")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()

    case_folders = sorted(path for path in args.source.iterdir() if path.is_dir())
    if len(case_folders) != 17:
        raise SystemExit(f"Expected 17 case folders, found {len(case_folders)}")

    for case_number, folder in enumerate(case_folders, start=1):
        images = sorted(
            path for path in folder.iterdir() if path.suffix.lower() in {".jpg", ".jpeg"}
        )
        if len(images) != 2:
            raise SystemExit(f"Case {case_number:02d} does not contain exactly two JPG files")

        for source, stage in zip(images, ("before", "after"), strict=True):
            redact_and_export(
                source,
                args.destination / f"case-{case_number:02d}-{stage}.webp",
            )


if __name__ == "__main__":
    main()
