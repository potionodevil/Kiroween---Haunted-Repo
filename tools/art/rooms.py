"""Pixel-art hallway, wallpaper tile and séance table in the mansion palette."""
from PIL import Image, ImageDraw
import random, math, os
random.seed(7)
OUT = "/home/claude/art/out"; os.makedirs(OUT, exist_ok=True)
S = 6
C = dict(
    bg=(22, 14, 34), wall=(44, 30, 64), wall2=(38, 25, 56), pat=(54, 38, 78), trim=(78, 60, 104),
    wood=(48, 30, 40), wood2=(60, 38, 48), wood3=(38, 24, 32), dark=(18, 11, 28),
    lit=(242, 181, 68), lit2=(247, 205, 122), litd=(196, 132, 40), glow=(98, 66, 52),
    bone=(243, 236, 221), bone2=(200, 192, 176), teal=(127, 214, 201), teal2=(70, 140, 132), teal3=(40, 86, 82),
    gold=(170, 124, 54), stone=(70, 60, 88), cloth=(64, 30, 54), cloth2=(84, 40, 70), beige=(196, 182, 150), beige2=(150, 136, 110),
)
def px(d, im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: d.point((x, y), fill=c)
def rect(d, x0, y0, x1, y1, c): d.rectangle([x0, y0, x1, y1], fill=c)

def damask(d, im, x0, y0, x1, y1):
    for y in range(y0, y1):
        for x in range(x0, x1):
            u, v = (x - x0) % 16, (y - y0) % 16
            if (abs(u - 8) + abs(v - 8) == 5) or (u == 8 and 5 < v < 11) or (v == 8 and 5 < u < 11):
                px(d, im, x, y, C["pat"])
            elif (u, v) in ((0, 0), (1, 1), (15, 15)):
                px(d, im, x, y, C["pat"])

def candle(d, im, x, y, glow=True):
    if glow:
        for gy in range(y - 10, y + 6):
            for gx in range(x - 9, x + 10):
                r = math.hypot(gx - x, gy - (y - 3))
                if r < 9 and (gx + gy) % (2 if r < 5 else 3) == 0 and im.getpixel((gx, gy))[:3] not in (C["lit"], C["lit2"]):
                    px(d, im, gx, gy, C["glow"])
    rect(d, x - 3, y + 4, x + 3, y + 5, C["gold"]); rect(d, x - 1, y - 1, x + 1, y + 4, C["bone"])
    px(d, im, x, y - 2, C["dark"]); rect(d, x - 1, y - 5, x + 1, y - 3, C["lit"]); px(d, im, x, y - 6, C["lit2"]); px(d, im, x, y - 3, C["lit2"])

# ---------------- hallway 320x120 ----------------
W, H = 320, 120
im = Image.new("RGBA", (W, H), C["wall"]); d = ImageDraw.Draw(im)
damask(d, im, 0, 0, W, 78)
rect(d, 0, 70, W, 72, C["trim"]); rect(d, 0, 73, W, 78, C["wall2"])
for x in range(0, W, 10): rect(d, x, 73, x, 78, C["trim"])  # wainscot
rect(d, 0, 78, W, 80, C["trim"])
for y in range(80, H):  # floorboards
    for x in range(W):
        c = C["wood"] if ((y - 80) // 5) % 2 == 0 else C["wood2"]
        if (x + ((y - 80) // 5) * 23) % 37 == 0: c = C["wood3"]
        if (y - 80) % 5 == 4: c = C["wood3"]
        px(d, im, x, y, c)
for x in range(0, W, 2): px(d, im, x, 81, C["dark"])
# doors
for dx in (40, 150, 260):
    rect(d, dx - 2, 24, dx + 22, 78, C["trim"])
    d.ellipse([dx - 2, 14, dx + 22, 36], fill=C["trim"])
    rect(d, dx, 26, dx + 20, 78, C["dark"]); d.ellipse([dx, 16, dx + 20, 36], fill=C["dark"])
    px(d, im, dx + 16, 54, C["gold"])
# portrait between doors
pxl = 98
rect(d, pxl - 2, 18, pxl + 20, 46, C["gold"]); rect(d, pxl, 20, pxl + 18, 44, C["litd"]); rect(d, pxl + 1, 21, pxl + 17, 43, (120, 80, 44))
rect(d, pxl + 6, 26, pxl + 12, 40, C["wood3"]); rect(d, pxl + 5, 32, pxl + 13, 34, C["wood3"])  # empty chair
rect(d, 208, 22, 228, 44, C["gold"]); rect(d, 210, 24, 226, 42, C["teal3"]); d.ellipse([214, 27, 222, 37], fill=C["teal2"]); px(d, im, 216, 31, C["dark"]); px(d, im, 220, 31, C["dark"])
# sconces
for sx in (20, 128, 190, 300): candle(d, im, sx, 40)
# cobwebs
for i in range(8): px(d, im, i, 7 - i, C["bone2"]); px(d, im, i, 0, C["bone2"]); px(d, im, 0, i, C["bone2"])
for i in range(8): px(d, im, W - 1 - i, 7 - i, C["bone2"]); px(d, im, W - 1 - i, 0, C["bone2"]); px(d, im, W - 1, i, C["bone2"])
# rug
rect(d, 0, 96, W, 104, C["cloth"]); rect(d, 0, 97, W, 97, C["cloth2"]); rect(d, 0, 103, W, 103, C["cloth2"])
for x in range(0, W, 6): px(d, im, x, 100, C["lit"] if x % 12 == 0 else C["cloth2"])
im.resize((W * S, H * S), Image.NEAREST).save(f"{OUT}/hall.png", optimize=True)

# ---------------- wallpaper tile 32x32 ----------------
t = Image.new("RGBA", (32, 32), (28, 18, 41)); td = ImageDraw.Draw(t)
for y in range(32):
    for x in range(32):
        u, v = x % 16, y % 16
        if abs(u - 8) + abs(v - 8) == 5: td.point((x, y), fill=(36, 24, 52))
        if (u, v) == (8, 8): td.point((x, y), fill=(44, 30, 62))
t.resize((32 * 4, 32 * 4), Image.NEAREST).save(f"{OUT}/wallpaper.png", optimize=True)

# ---------------- séance table 200x100 ----------------
W, H = 200, 100
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
# table cloth ellipse
d.ellipse([10, 52, 190, 98], fill=C["cloth"]); d.ellipse([12, 52, 188, 92], fill=C["cloth2"])
for x in range(14, 186, 4):
    yy = 72 + int(20 * math.sqrt(max(0, 1 - ((x - 100) / 88) ** 2)))
    px(d, im, x, yy, C["lit"] if x % 8 == 0 else C["cloth"])
# light pool dither
for y in range(54, 92):
    for x in range(20, 180):
        r = math.hypot((x - 100) / 1.9, y - 70)
        if r < 22 and (x + y) % 2 == 0 and im.getpixel((x, y))[3]: px(d, im, x, y, (110, 58, 76))
# crt terminal left
rect(d, 34, 30, 74, 66, C["beige2"]); rect(d, 32, 28, 72, 64, C["beige"]); rect(d, 36, 32, 68, 56, C["dark"])
for i, ln in enumerate((20, 14, 24, 10, 18)):
    rect(d, 39, 35 + i * 4, 39 + ln, 35 + i * 4, C["teal"] if i != 3 else C["lit"])
rect(d, 44, 60, 60, 61, C["beige2"]); rect(d, 38, 66, 70, 69, C["beige2"]); px(d, im, 66, 60, C["teal"])
# crystal ball center
cx, cy, r = 112, 44, 16
for gy in range(cy - 28, cy + 26):
    for gx in range(cx - 30, cx + 31):
        rr = math.hypot(gx - cx, gy - cy)
        if r + 2 < rr < r + 13 and (gx + gy) % (2 if rr < r + 7 else 3) == 0 and not im.getpixel((gx, gy))[3]:
            px(d, im, gx, gy, (40, 86, 82, 255))
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=C["teal2"]); d.ellipse([cx - r + 2, cy - r + 2, cx + r - 3, cy + r - 3], fill=C["teal"])
d.ellipse([cx - 9, cy - 11, cx - 3, cy - 5], fill=C["bone"]); px(d, im, cx + 6, cy + 6, C["bone"])
rect(d, cx - 10, cy + 15, cx + 10, cy + 19, C["gold"]); rect(d, cx - 13, cy + 19, cx + 13, cy + 21, (130, 92, 40))
# candles
for x, y in ((90, 66), (140, 62), (162, 70)): candle(d, im, x, y, glow=False)
# cards
for i, (x, y) in enumerate(((150, 80), (160, 82), (170, 79))):
    rect(d, x, y, x + 7, y + 10, C["bone"]); rect(d, x + 1, y + 1, x + 6, y + 9, C["cloth"] if i != 1 else C["teal3"]); px(d, im, x + 3, y + 5, C["lit"])
# bell
d.ellipse([78, 78, 88, 88], fill=C["gold"]); rect(d, 82, 74, 84, 78, C["gold"]); rect(d, 77, 86, 89, 88, (130, 92, 40))
im.resize((W * S, H * S), Image.NEAREST).save(f"{OUT}/seance.png", optimize=True)

prev = Image.new("RGBA", (320 * 3, 120 * 3 + 100 * 3 + 10), C["bg"])
prev.alpha_composite(Image.open(f"{OUT}/hall.png").resize((960, 360), Image.NEAREST), (0, 0))
prev.alpha_composite(Image.open(f"{OUT}/seance.png").resize((600, 300), Image.NEAREST), (180, 370))
prev.save("/home/claude/art/preview_rooms.png"); print("ok")
