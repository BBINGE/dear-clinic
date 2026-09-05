"""Manual, non-generative cutout and reference-mark compositing (user approved).

Inputs: first standing draft (1184x1328), original pain cover (1448x1086).
Usage: python tools/prepare-disoongi-launcher.py DRAFT REFERENCE OUTPUT.png
Only the forehead marks and exterior background are changed before tight cropping.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

draft_path, reference_path, output_path = map(Path, sys.argv[1:4])
draft = Image.open(draft_path).convert('RGB')
reference = Image.open(reference_path).convert('RGB')
assert draft.size == (1184, 1328)
assert reference.size == (1448, 1086)
pixels = np.asarray(draft).astype(np.int16)

# Only neutral light pixels connected to the image border are background.
# Closed brown outlines protect the white shirt and cream facial areas.
neutral = ((pixels.max(axis=2) - pixels.min(axis=2)) < 22) & (pixels.min(axis=2) > 170)
flood = Image.fromarray(np.where(neutral, 255, 0).astype('uint8')).copy()
ImageDraw.floodfill(flood, (0, 0), 128, thresh=0)
exterior = np.asarray(flood) == 128
alpha = Image.fromarray(np.where(exterior, 0, 255).astype('uint8'))

# Remove only the old four marks using adjacent forehead texture, feathered.
old_box = (500, 352, 680, 500)
old = np.asarray(draft.crop(old_box)).astype(np.int16)
def select_marks(binary, seeds):
    connected = Image.fromarray(np.uint8(binary) * 255).copy()
    for seed in seeds:
        assert connected.getpixel(seed) == 255
        ImageDraw.floodfill(connected, seed, 128, thresh=0)
    return np.asarray(connected) == 128

old_white = select_marks((old[:, :, 2] > 216) & ((old[:, :, 0] - old[:, :, 2]) < 30),
                        [(82, 38), (28, 77), (145, 74), (91, 108)])
erase = Image.fromarray((old_white * 255).astype('uint8'))
erase = erase.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2))
texture_pixels = old.copy()
paint_mask = np.asarray(erase) > 0
for y in range(old.shape[0]):
    xs = np.flatnonzero(paint_mask[y])
    if not len(xs):
        continue
    splits = np.split(xs, np.flatnonzero(np.diff(xs) > 1) + 1)
    for run in splits:
        left, right = max(0, run[0]-1), min(old.shape[1]-1, run[-1]+1)
        for x in run:
            ratio = (x-left)/max(1, right-left)
            texture_pixels[y, x] = old[y, left]*(1-ratio)+old[y, right]*ratio
texture = Image.fromarray(texture_pixels.astype('uint8'))
draft.paste(texture, old_box[:2], erase)

# Preserve actual source silhouettes instead of drawing or generating a D.
mark_box = (675, 278, 830, 401)
mark = reference.crop(mark_box)
rgb = np.asarray(mark).astype(np.float32)
# White pigment has much less red-blue difference than the peach forehead.
matte = np.clip((45 - (rgb[:, :, 0] - rgb[:, :, 2])) / 21, 0, 1)
matte[rgb[:, :, 2] < 210] = 0
selected = select_marks(matte > .5, [(80, 30), (27, 56), (128, 64), (72, 88)])
region = np.asarray(Image.fromarray(np.uint8(selected)*255).filter(ImageFilter.MaxFilter(3))) > 0
matte[~region] = 0
mark_alpha = Image.fromarray(np.uint8(matte * 255))
mark.putalpha(mark_alpha)
draft = draft.convert('RGBA')
draft.alpha_composite(mark, (512, 366))
draft.putalpha(alpha)

# Confirm unchanged body pixels; transparent exterior may change only alpha.
assert np.array_equal(np.asarray(draft)[520:, :, :3], pixels[520:].astype('uint8'))
box = alpha.getbbox()
box = (max(0, box[0]-12), max(0, box[1]-12), min(1184, box[2]+12), min(1328, box[3]+12))
result = draft.crop(box)
output_path.parent.mkdir(parents=True, exist_ok=True)
result.save(output_path, optimize=True)
web = result.copy()
web.thumbnail((600, 600), Image.Resampling.LANCZOS)
web.save(output_path.with_suffix('.webp'), lossless=True, method=6)
assert result.mode == 'RGBA' and result.getchannel('A').getextrema() == (0, 255)
print({'size': result.size, 'web_size': web.size, 'transparent_pixels': int(exterior.sum()), 'body_pixels_preserved': True})
