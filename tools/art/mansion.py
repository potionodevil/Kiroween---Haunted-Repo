"""Layered pixel-art haunted mansion scene, 320x180 base, upscaled x6."""
from PIL import Image, ImageDraw
import random, math, json, os

W, H, S = 320, 180, 6
OUT = "/home/claude/art/out"; os.makedirs(OUT, exist_ok=True)
random.seed(13)

C = dict(
    sky0=(22, 14, 34), sky1=(30, 19, 46), sky2=(40, 26, 60), sky3=(52, 36, 76),
    far=(34, 22, 52), far2=(28, 18, 44),
    wall=(44, 30, 64), wall2=(36, 24, 54), wall3=(58, 42, 82), trim=(78, 60, 104),
    roof=(30, 20, 46), roof2=(40, 28, 60), roofhi=(62, 46, 88),
    lit=(242, 181, 68), lit2=(247, 205, 122), litd=(196, 132, 40), glow=(120, 80, 50),
    dark=(18, 11, 28), bone=(243, 236, 221), bone2=(200, 192, 176),
    teal=(127, 214, 201), teal2=(70, 140, 132), green=(110, 150, 100),
    ground=(26, 17, 38), ground2=(34, 23, 48), iron=(14, 9, 22), stone=(70, 60, 88), stone2=(52, 44, 68),
    pumpkin=(214, 112, 40), pumpkin2=(160, 76, 26),
)

def layer(): return Image.new("RGBA", (W, H), (0, 0, 0, 0))
def px(d, x, y, c):
    if 0 <= x < W and 0 <= y < H: d.point((x, y), fill=c)
def rect(d, x0, y0, x1, y1, c): d.rectangle([x0, y0, x1, y1], fill=c)
def dither_rect(d, x0, y0, x1, y1, c, every=2, off=0):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x + y + off) % every == 0: px(d, x, y, c)

# ---------------- L0 sky ----------------
sky = layer(); d = ImageDraw.Draw(sky)
bands = [(0, C["sky0"]), (60, C["sky1"]), (105, C["sky2"]), (140, C["sky3"])]
for i, (y0, col) in enumerate(bands):
    y1 = bands[i + 1][0] if i + 1 < len(bands) else H
    rect(d, 0, y0, W, y1, col)
    if i + 1 < len(bands):  # dithered seam
        dither_rect(d, 0, y1 - 4, W, y1 - 1, bands[i + 1][1], 2)
        dither_rect(d, 0, y1 - 8, W, y1 - 5, bands[i + 1][1], 4)
for _ in range(90):
    x, y = random.randrange(W), random.randrange(110)
    if x < 150 and y > 20 and random.random() < .85: continue
    c = C["bone"] if random.random() < .25 else C["bone2"]
    px(d, x, y, c)
    if random.random() < .08:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): px(d, x + dx, y + dy, C["sky3"])
mx, my, mr = 262, 34, 17
for r, col, ev in ((mr + 10, C["sky2"], 3), (mr + 6, C["sky3"], 2)):
    for y in range(my - r, my + r + 1):
        for x in range(mx - r, mx + r + 1):
            if (x - mx) ** 2 + (y - my) ** 2 <= r * r and (x + y) % ev == 0: px(d, x, y, col)
d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=C["bone"])
d.ellipse([mx - mr + 3, my - mr + 2, mx + mr, my + mr], fill=(232, 224, 206))
for cx, cy, cr in ((mx - 5, my - 4, 3), (mx + 6, my + 3, 4), (mx - 2, my + 8, 2), (mx + 8, my - 8, 2)):
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=C["bone2"])
# bats
for bx, by in ((214, 26), (232, 16), (196, 42)):
    for dx, dy in ((0, 0), (0, 1), (-1, -1), (-2, -2), (-3, -2), (-4, -1), (-5, 0), (-3, -1), (1, -1), (2, -2), (3, -2), (4, -1), (5, 0), (3, -1)): px(d, bx + dx, by + dy, C["dark"])

# ---------------- L1 far hills + trees ----------------
far = layer(); d = ImageDraw.Draw(far)
pts = [(0, 132)]
for x in range(0, W + 8, 8):
    pts.append((x, 128 - int(8 * math.sin(x / 41) + 5 * math.sin(x / 17))))
pts += [(W, H), (0, H)]
d.polygon(pts, fill=C["far"])
for x in range(4, W, 7):
    base = 128 - int(8 * math.sin(x / 41) + 5 * math.sin(x / 17))
    h = random.randint(6, 14)
    d.polygon([(x - 3, base + 1), (x, base - h), (x + 3, base + 1)], fill=C["far2"])
# distant chapel
rect(d, 40, 108, 54, 126, C["far2"]); d.polygon([(38, 108), (47, 98), (56, 108)], fill=C["far2"])
rect(d, 46, 88, 48, 99, C["far2"]); rect(d, 44, 91, 50, 92, C["far2"]); px(d, 47, 115, C["litd"]); px(d, 47, 116, C["litd"])

# ---------------- L2 mansion ----------------
house = layer(); d = ImageDraw.Draw(house)
def window(x, y, w, h, lit=False, arch=False, ghost=False):
    rect(d, x - 1, y - 1, x + w, y + h, C["trim"])
    body = C["lit"] if lit else C["dark"]
    rect(d, x, y, x + w - 1, y + h - 1, body)
    if lit:
        rect(d, x, y + h - 2, x + w - 1, y + h - 1, C["litd"])
        rect(d, x + 1, y + 1, x + 1, y + 2, C["lit2"])
        for gx in range(x - 2, x + w + 2):  # glow dither on wall
            for gy in range(y - 2, y + h + 3):
                if not (x - 1 <= gx <= x + w and y - 1 <= gy <= y + h) and (gx + gy) % 3 == 0:
                    if house.getpixel((gx, gy))[3] and house.getpixel((gx, gy))[:3] in (C["wall"], C["wall2"], C["wall3"]):
                        px(d, gx, gy, C["glow"])
    if arch:
        for i in range(w):
            px(d, x + i, y - 1, C["trim"])
        px(d, x, y, C["trim"]); px(d, x + w - 1, y, C["trim"])
    mid = x + w // 2
    for yy in range(y, y + h): px(d, mid, yy, C["trim"])
    for xx in range(x, x + w): px(d, xx, y + h // 2, C["trim"])
    if ghost:
        gx, gy = x + 1, y + 1
        for dx, dy in ((1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (3, 1), (0, 2), (1, 2), (2, 2), (3, 2), (0, 3), (2, 3)): px(d, gx + dx, gy + dy, C["teal"])
        px(d, gx + 1, gy + 1, C['dark']); px(d, gx + 2, gy + 1, C['dark'])

def shingles(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if house.getpixel((x, y))[:3] == C["roof"] and ((y - y0) % 3 == 2 or ((x + (y // 3) * 2) % 5 == 0 and (y - y0) % 3 != 2)):
                px(d, x, y, C["roof2"])

# main body
rect(d, 168, 92, 262, 158, C["wall"])
for y in range(92, 159, 4): rect(d, 168, y, 262, y, C["wall2"])  # siding
rect(d, 168, 92, 170, 158, C["wall3"])
# mansard roof main
d.polygon([(162, 92), (174, 66), (256, 66), (268, 92)], fill=C["roof"]); shingles(162, 66, 268, 92)
rect(d, 162, 92, 268, 93, C["trim"]); rect(d, 172, 65, 258, 66, C["roofhi"])
# dormers
for dx in (190, 228):
    rect(d, dx, 72, dx + 12, 88, C["wall2"]); d.polygon([(dx - 2, 72), (dx + 6, 63), (dx + 14, 72)], fill=C["roof2"])
    window(dx + 3, 75, 7, 9, lit=(dx == 228), arch=True)
# crooked chimney
d.polygon([(244, 66), (244, 50), (251, 48), (252, 66)], fill=C["wall2"]); rect(d, 242, 46, 253, 48, C["trim"])
for i, (sx, sy) in enumerate(((248, 42), (250, 37), (247, 32), (251, 27))):
    for dx in range(-1 - i // 2, 2 + i // 2):
        if (dx + i) % 2 == 0: px(d, sx + dx, sy, C["sky3"] if i > 1 else C["trim"])
# left tower
rect(d, 140, 74, 166, 158, C["wall2"]); rect(d, 140, 74, 142, 158, C["wall"])
for y in range(76, 159, 4): rect(d, 140, y, 166, y, (32, 21, 48))
d.polygon([(136, 74), (153, 28), (170, 74)], fill=C["roof"]); shingles(136, 28, 170, 74)
rect(d, 136, 74, 170, 75, C["trim"])
rect(d, 153, 18, 153, 28, C["iron"]); d.polygon([(154, 18), (160, 20), (154, 22)], fill=C["iron"])
window(148, 48, 10, 12, lit=False, arch=True, ghost=True)  # spire window with ghost
window(146, 86, 7, 12, lit=True, arch=True); window(156, 86, 7, 12, lit=False, arch=True)
window(146, 112, 7, 12, lit=False); window(156, 112, 7, 12, lit=True)
# right gable wing
rect(d, 262, 100, 296, 158, C["wall2"]); rect(d, 262, 100, 264, 158, C["wall"])
for y in range(102, 159, 4): rect(d, 262, y, 296, y, (32, 21, 48))
d.polygon([(258, 100), (279, 72), (300, 100)], fill=C["roof"]); shingles(258, 72, 300, 100)
rect(d, 258, 100, 300, 101, C["trim"])
d.ellipse([273, 82, 285, 94], fill=C["trim"]); d.ellipse([275, 84, 283, 92], fill=C["lit"]); px(d, 277, 86, C["lit2"])
window(268, 108, 8, 12); window(283, 108, 8, 12, lit=True); window(268, 130, 8, 12, lit=True); window(283, 130, 8, 12)
# main windows
for i, wx in enumerate((176, 192, 236, 250)):
    window(wx, 100, 8, 14, lit=(i in (1, 3)), arch=True)
for i, wx in enumerate((176, 192, 236, 250)):
    window(wx, 124, 8, 14, lit=(i == 0))
# porch
rect(d, 198, 120, 232, 122, C["trim"]); d.polygon([(194, 120), (215, 108), (236, 120)], fill=C["roof2"])
for cx in (200, 229): rect(d, cx, 122, cx + 1, 152, C["trim"])
# door  (center x=215, y≈141)
DOOR = (209, 128, 221, 152)
rect(d, DOOR[0] - 1, DOOR[1] - 2, DOOR[2] + 1, DOOR[3], C["trim"])
d.ellipse([DOOR[0] - 1, DOOR[1] - 6, DOOR[2] + 1, DOOR[1] + 4], fill=C["trim"])
d.ellipse([DOOR[0], DOOR[1] - 5, DOOR[2], DOOR[1] + 3], fill=C["lit"])
rect(d, DOOR[0], DOOR[1], DOOR[2], DOOR[3], C["lit"])
dither_rect(d, DOOR[0], DOOR[3] - 6, DOOR[2], DOOR[3], C["lit2"], 2)
# steps
rect(d, 205, 153, 225, 154, C["stone"]); rect(d, 202, 155, 228, 156, C["stone2"]); rect(d, 199, 157, 231, 158, C["stone"])
# cobweb on tower corner
for i in range(5): px(d, 167 - i, 93 + i, C["bone2"]); px(d, 167, 93 + i, C["bone2"]); px(d, 167 - i, 93, C["bone2"])

# ---------------- L3 foreground ----------------
fg = layer(); d = ImageDraw.Draw(fg)
rect(d, 0, 158, W, H, C["ground"])
dither_rect(d, 0, 158, W, 161, C["ground2"], 2)
d.polygon([(199, 158), (231, 158), (250, 180), (180, 180)], fill=(40, 30, 54))  # path
dither_rect(d, 182, 166, 248, 179, C["stone2"], 5)
# fence with gate gap
for x in range(0, W, 5):
    if 186 <= x <= 244: continue
    rect(d, x, 154, x, 168, C["iron"]); d.polygon([(x - 1, 154), (x, 151), (x + 1, 154)], fill=C["iron"])
rect(d, 0, 157, 185, 157, C["iron"]); rect(d, 245, 157, W, 157, C["iron"]); rect(d, 0, 165, 185, 165, C["iron"]); rect(d, 245, 165, W, 165, C["iron"])
for gx in (184, 245): rect(d, gx - 1, 146, gx + 1, 170, C["iron"]); d.ellipse([gx - 2, 143, gx + 2, 147], fill=C["iron"])
# tombstones
for tx, th in ((52, 12), (74, 9), (98, 14), (300, 11)):
    rect(d, tx, 168 - th, tx + 8, 172, C["stone"]); d.ellipse([tx, 165 - th, tx + 8, 172 - th], fill=C["stone"])
    rect(d, tx + 2, 172 - th + 3, tx + 6, 172 - th + 3, C["stone2"]); rect(d, tx + 4, 172 - th + 1, tx + 4, 172 - th + 6, C["stone2"])
# dead tree left
def branch(x, y, ang, ln, w):
    if ln < 3: return
    x2, y2 = x + math.cos(ang) * ln, y - math.sin(ang) * ln
    d.line([(x, y), (x2, y2)], fill=C["iron"], width=max(1, w))
    branch(x2, y2, ang + .5 + random.uniform(-.2, .2), ln * .68, w - 1)
    branch(x2, y2, ang - .45 + random.uniform(-.2, .2), ln * .66, w - 1)
branch(30, 172, math.pi / 2 + .18, 30, 4)
# pumpkins
for px0, py0, sz in ((150, 166, 6), (162, 168, 5), (268, 167, 6)):
    d.ellipse([px0, py0, px0 + sz * 2, py0 + sz + 2], fill=C["pumpkin"]); d.ellipse([px0 + 2, py0, px0 + sz * 2 - 2, py0 + sz + 2], outline=C["pumpkin2"])
    px(d, px0 + sz - 2, py0 + 3, C["lit2"]); px(d, px0 + sz + 2, py0 + 3, C["lit2"]); rect(d, px0 + sz - 1, py0 + 5, px0 + sz + 1, py0 + 5, C["lit2"])
    rect(d, px0 + sz, py0 - 2, px0 + sz, py0, C["green"])
# grass tufts
for x in range(0, W, 3):
    if random.random() < .5: px(d, x, 157, C["ground2"]); px(d, x + 1, 156, C["ground2"])

def save(img, name):
    big = img.resize((W * S, H * S), Image.NEAREST); big.save(f"{OUT}/{name}.png", optimize=True)
for img, n in ((sky, "l0_sky"), (far, "l1_far"), (house, "l2_house"), (fg, "l3_front")): save(img, n)
comp = Image.new("RGBA", (W, H), C["sky0"] + (255,))
for img in (sky, far, house, fg): comp.alpha_composite(img)
comp.resize((W * 4, H * 4), Image.NEAREST).save("/home/claude/art/preview.png")
json.dump({"door_center_pct": [(DOOR[0] + DOOR[2]) / 2 / W * 100, (DOOR[1] + DOOR[3]) / 2 / H * 100]}, open(f"{OUT}/meta.json", "w"))
print(open(f"{OUT}/meta.json").read())
