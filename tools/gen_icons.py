#!/usr/bin/env python3
"""Generate app icons (pure stdlib, no PIL).

Draws a clean "checklist" motif on an iOS-style blue background.
Outputs PNGs into ../icons/.
"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

# Palette
BG_TOP = (0, 122, 255)     # #007aff
BG_BOT = (10, 132, 255)    # #0a84ff
WHITE = (255, 255, 255)
GREEN = (52, 199, 89)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_canvas(size, rounded):
    """Return a size*size RGBA bytearray with vertical gradient bg.
    If rounded, corners are transparent with radius ~ size*0.22."""
    px = bytearray(size * size * 4)
    r = size * 0.22 if rounded else 0
    for y in range(size):
        row_color = lerp(BG_TOP, BG_BOT, y / (size - 1))
        for x in range(size):
            a = 255
            if rounded:
                cx = min(x, size - 1 - x)
                cy = min(y, size - 1 - y)
                if cx < r and cy < r:
                    dx = r - cx
                    dy = r - cy
                    if dx * dx + dy * dy > r * r:
                        a = 0
            i = (y * size + x) * 4
            px[i] = row_color[0]
            px[i + 1] = row_color[1]
            px[i + 2] = row_color[2]
            px[i + 3] = a
    return px


def put(px, size, x, y, color, alpha=255):
    x = int(x)
    y = int(y)
    if 0 <= x < size and 0 <= y < size:
        i = (y * size + x) * 4
        ia = alpha / 255
        for k in range(3):
            px[i + k] = round(color[k] * ia + px[i + k] * (1 - ia))
        px[i + 3] = max(px[i + 3], alpha)


def fill_round_rect(px, size, x0, y0, x1, y1, rad, color):
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            # check each rounded corner region
            ok = True
            if x < x0 + rad and y < y0 + rad:
                ok = (x - (x0 + rad)) ** 2 + (y - (y0 + rad)) ** 2 <= rad * rad
            elif x > x1 - rad and y < y0 + rad:
                ok = (x - (x1 - rad)) ** 2 + (y - (y0 + rad)) ** 2 <= rad * rad
            elif x < x0 + rad and y > y1 - rad:
                ok = (x - (x0 + rad)) ** 2 + (y - (y1 - rad)) ** 2 <= rad * rad
            elif x > x1 - rad and y > y1 - rad:
                ok = (x - (x1 - rad)) ** 2 + (y - (y1 - rad)) ** 2 <= rad * rad
            if ok:
                put(px, size, x, y, color)


def draw_check(px, size, cx, cy, s, color):
    """Draw a checkmark centered roughly at (cx, cy)."""
    thick = max(1, int(s * 0.18))
    for t in range(int(s * 0.5)):
        x = cx - int(s * 0.35) + t
        y = cy + t
        for w in range(thick):
            put(px, size, x, y + w, color)
    for t in range(int(s * 0.9)):
        x = cx - int(s * 0.35) + int(s * 0.5) + t
        y = cy + int(s * 0.5) - t
        for w in range(thick):
            put(px, size, x, y + w, color)


def draw_motif(px, size):
    """Three checklist rows centered on the canvas."""
    box = size * 0.62
    left = (size - box) / 2
    top = (size - box) / 2
    row_h = box / 3
    box_sz = row_h * 0.5
    line_h = max(2, int(box_sz * 0.32))

    for r in range(3):
        cy = top + row_h * r + row_h * 0.5
        bx = left
        fill_round_rect(px, size, bx, cy - box_sz / 2, bx + box_sz, cy + box_sz / 2,
                        box_sz * 0.22, WHITE)
        if r < 2:
            draw_check(px, size, bx + box_sz * 0.5, cy - box_sz * 0.05,
                       box_sz * 0.7, GREEN)
        lx0 = bx + box_sz * 1.5
        lx1 = left + box - (size * 0.02)
        fill_round_rect(px, size, lx0, cy - line_h / 2, lx1, cy + line_h / 2,
                        line_h / 2, WHITE)


def write_png(path, size, px):
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)

    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)  # filter type 0
        raw.extend(px[y * stride:(y + 1) * stride])
    compressed = zlib.compress(bytes(raw), 9)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))


def build(size, rounded, name):
    px = make_canvas(size, rounded)
    draw_motif(px, size)
    write_png(os.path.join(OUT, name), size, px)
    print("wrote", name)


if __name__ == "__main__":
    build(512, True, "icon-512.png")
    build(192, True, "icon-192.png")
    build(180, True, "icon-180.png")
    build(512, False, "icon-maskable-512.png")
