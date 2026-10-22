"""Convert a generated portrait to a high-quality web asset and gallery thumbnail."""
import hashlib
import json
import re
import sys
from pathlib import Path
from PIL import Image

source, key = Path(sys.argv[1]), sys.argv[2]
if not re.fullmatch(r'r[RHCPAEK]-b[RHCPAEK]', key):
    raise ValueError('Invalid battle key')
root = Path(__file__).resolve().parents[1]
out = root / 'dist' / 'assets' / 'battles'
out.mkdir(parents=True, exist_ok=True)
image = Image.open(source).convert('RGB')
w, h = image.size
if not 0.53 < w / h < 0.60:
    raise ValueError(f'Expected 9:16 portrait, got {w}x{h}')
image.save(out / (key + '.webp'), 'WEBP', quality=94, method=6)
thumb = image.copy()
thumb.thumbnail((252, 448))
thumb.save(out / (key + '-thumb.webp'), 'WEBP', quality=82, method=6)
asset = out / (key + '.webp')
print(json.dumps({'key': key, 'width': w, 'height': h, 'bytes': asset.stat().st_size, 'sha256': hashlib.sha256(asset.read_bytes()).hexdigest()}))
