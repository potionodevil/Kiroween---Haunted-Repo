"""Seven more 4-frame creature sprite sheets in the Haunted Repo palette."""
from PIL import Image
import os, json
OUT = "/home/claude/sprites/out"; os.makedirs(OUT, exist_ok=True)
S = 6
PAL = {
    ".": None, "K": (22, 14, 34), "W": (243, 236, 221), "w": (194, 182, 207), "O": (242, 181, 68), "o": (196, 132, 40),
    "R": (200, 70, 74), "r": (130, 40, 52), "P": (69, 52, 94), "p": (51, 36, 74), "C": (34, 22, 50),
    "T": (127, 214, 201), "t": (82, 160, 150), "B": (214, 200, 168), "b": (160, 146, 116), "L": (194, 182, 207), "l": (150, 136, 170),
    "G": (242, 181, 68), "V": (110, 80, 150), "v": (80, 56, 112),
}
def img(rows, w=None, h=None):
    w = w or max(len(r) for r in rows); h = h or len(rows)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if PAL.get(c): im.putpixel((x, y), PAL[c] + (255,))
    return im
def shift(im, dy=0, dx=0, size=None):
    size = size or im.size
    out = Image.new("RGBA", size, (0, 0, 0, 0)); out.paste(im, (dx, dy), im); return out
def sheet(frames, name):
    w, h = frames[0].size
    s = Image.new("RGBA", (w * 4, h), (0, 0, 0, 0))
    for i, f in enumerate(frames): s.paste(f, (i * w, 0), f)
    s.resize((s.width * S, s.height * S), Image.NEAREST).save(f"{OUT}/{name}_sheet.png")
    s.save(f"{OUT}/{name}_sheet_1x.png")
    return {"frame_w": w * S, "frame_h": h * S, "sheet": f"{name}_sheet.png"}

meta = {}

# ---------- VAMPIRE 18x20, cape flap + bob ----------
head = [
"......KKKKK.......",
".....KpppppK......",
"....KpWWWWWpK.....",
"....KWWWWWWWK.....",
"....KWRWWWRWK.....",
"....KWWWWWWWK.....",
"....KWWKKKWWK.....",
".....KWWVWWK......",
]
capes = [
["...KKrPPPPPPrKK...", "..KrrPPPPPPPrrK...", "..KrPPPPPPPPPrK...", ".KrrPPPPPPPPPrrK..", ".KrPPPPPPPPPPPrK..", ".KrPPPPPPPPPPPrK..", "KrrPPPPPPPPPPPrrK.", "KKKKPPKKKKPPKKKKK.", "....KK....KK......", "....KK....KK......", "...KKK...KKK......", ".................."],
["..KKrPPPPPPPrKK...", ".KrrPPPPPPPPPrrK..", ".KrPPPPPPPPPPPrK..", "KrrPPPPPPPPPPPrrK.", "KrPPPPPPPPPPPPPrK.", "KrPPPPPPPPPPPPPrK.", "KrPPPPPPPPPPPPPrK.", "KKKKKPPKKKKPPKKKK.", ".....KK....KK.....", ".....KK....KK.....", "....KKK...KKK.....", ".................."],
]
vf = []
for i in range(4):
    body = head + capes[i % 2]
    vf.append(shift(img(body, 18, 20), dy=[0, -1, 0, 1][i] if i != 3 else 0, size=(18, 21)))
meta["vampire"] = sheet(vf, "vampire")

# ---------- SPIDER 20x12, walking legs ----------
sp_body = [
"........KKKK........",
".......KVVVVK.......",
"......KVVvVVVK......",
"......KVvVVVVK......",
"......KVVVVvVK......",
".......KVVVVK.......",
"......KVOVVOVK......",
"......KVVVVVVK......",
".......KVKKVK.......",
]
legsA = [(5, 3, 1, 1), (5, 5, 0, 7), (14, 3, 18, 1), (14, 5, 19, 7), (6, 7, 2, 10), (13, 7, 17, 10), (7, 8, 5, 11), (12, 8, 14, 11)]
legsB = [(5, 3, 0, 2), (5, 5, 1, 8), (14, 3, 19, 2), (14, 5, 18, 8), (6, 7, 3, 11), (13, 7, 16, 11), (7, 8, 4, 10), (12, 8, 15, 10)]
def draw_legs(im, legs):
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    for x0, y0, x1, y1 in legs:
        mx, my = (x0 + x1) // 2, min(y0, y1) - 1 if y1 < y0 else (y0 + y1) // 2
        d.line([(x0, y0), (mx, my), (x1, y1)], fill=PAL["v"] + (255,))
spf = []
for i in range(4):
    base = Image.new("RGBA", (20, 12), (0, 0, 0, 0))
    draw_legs(base, legsA if i % 2 == 0 else legsB)
    b = img(sp_body, 20, 12); base.paste(b, (0, 0 if i % 2 == 0 else -1 + 1), b)
    spf.append(base)
meta["spider"] = sheet(spf, "spider")

# ---------- POLTERGEIST 18x18, swirling tail ----------
pg_top = [
"......KKKKKK......",
".....KTTTTTTK.....",
"....KTTTTTTTTK....",
"...KTTKKTTKKTTK...",
"...KTTWKTTWKTTK...",
"...KTTTTTTTTTTK...",
"...KTTTKKKKTTTK...",
"...KTTTKTTKTTTK...",
"....KTTTTTTTTK....",
]
pg_tails = [
[".....KTTTTTTK.....", "......KTTTTK......", ".......KTTTK......", "........KTTK......", ".........KTK......", "..........KK......", "......KK..........", ".....K..K........."],
[".....KTTTTTTK.....", "......KTTTTK......", "......KTTTK.......", "......KTTK........", "......KTK.........", "......KK..........", "...........KK.....", "..........K..K...."],
]
pf = []
for i in range(4):
    im = img(pg_top + pg_tails[i % 2], 18, 18)
    if i in (1, 3):  # flying plates around
        for x, y in ((1, 2), (16, 6)): im.putpixel((x, y), PAL["W"] + (255,)); im.putpixel((x + 1 if x < 17 else x - 1, y), PAL["w"] + (255,))
    pf.append(shift(im, dy=[0, -1, -2, -1][i], size=(18, 19)))
meta["poltergeist"] = sheet(pf, "poltergeist")

# ---------- SKELETON 16x20, walk ----------
sk_top = [
".....KKKKK......",
"....KBBBBBK.....",
"....KBKBKBK.....",
"....KBBBBBK.....",
".....KBKBK......",
"......KBK.......",
"....KKBBBKK.....",
"...KB.KBK.BK....",
"...KB.BBB.BK....",
"...K..KBK..K....",
"......BBB.......",
".....KBKBK......",
"......KBK.......",
]
sk_legs = [
[".....KB.BK......", "....KB...BK.....", "....KB...BK.....", "...KBK...KBK....", "................"],
[".....KBBK.......", ".....KBBK.......", ".....KBKBK......", "....KBK.KBK.....", "................"],
]
skf = [shift(img(sk_top + sk_legs[i % 2], 16, 19), dy=[0, -1, 0, -1][i], size=(16, 20)) for i in range(4)]
meta["skeleton"] = sheet(skf, "skeleton")

# ---------- MUMMY 18x20, arms forward, walk ----------
mu_top = [
"......KKKKK.......",
".....KBBbBBK......",
".....KbBBBbK......",
".....KBKBKBK......",
".....KBOBOBK......",
".....KbBBBbK......",
"......KBBBK.......",
"....KKBbBBKKKKKK..",
"....KBBBbBBBBbBBK.",
"....KbBBBBKKKKKK..",
"....KBBbBBK.......",
"....KBbBBbK.......",
"....KBBBbBK.......",
]
mu_legs = [
["....KBbK.KbK......", "....KBBK.KBK......", "...KBBK...KBK.....", "...KKKK...KKK.....", ".................."],
[".....KBbKbK.......", ".....KBBKBK.......", ".....KBKBBK.......", "....KKKKKKK.......", ".................."],
]
muf = [shift(img(mu_top + mu_legs[i % 2], 18, 18), dy=[1, 0, 1, 0][i], size=(18, 20)) for i in range(4)]
meta["mummy"] = sheet(muf, "mummy")

# ---------- POSSESSED 18x18, haunted robot head with tendrils ----------
po_top = [
"..K............K..",
"..KK..........KK..",
"...KKKKKKKKKKKK...",
"...KVVVVVVVVVVK...",
"...KVKKKKKKKKVK...",
"...KVK{e}K{e}KKVK...".replace("{e}", "E"),
"...KVKKKKKKKKVK...",
"...KVKKOOOOKKVK...",
"...KVKKKKKKKKVK...",
"...KVVVVVVVVVVK...",
"...KKKKKKKKKKKK...",
"......KvvvvK......",
]
po_tent = [
[".....V.V..V.V.....", "....V..V..V..V....", "....V...V.V...V...", "...V....V..V..V...", "...V...V....V.....", ".................."],
[".....V.V..V.V.....", ".....V.V..V..V....", "....V..V...V..V...", "....V...V..V...V..", ".....V..V...V.....", ".................."],
]
pof = []
for i in range(4):
    rows = [r.replace("E", "T" if i in (0, 2) else "O") for r in po_top] + po_tent[i % 2]
    pof.append(shift(img(rows, 18, 18), dy=[0, -1, -2, -1][i], size=(18, 19)))
meta["possessed"] = sheet(pof, "possessed")

# ---------- BANSHEE 20x20, wailing with sound waves ----------
ba = [
"......KKKKKKK.......",
".....KLLLLLLLK......",
"....KLLLWWWLLLK.....",
"....KLLWWWWWLLK.....",
"....KLLWKWKWLLK.....",
"....KLLWWWWWLLK.....",
"....KLLWWKWWLLK.....",
"....KLLLWKWLLLLK....",
"...KLLLLLLLLLLLK....",
"...KLLlLLLLLlLLK....",
"..KLLLlLLLLLlLLLK...",
"..KLLLLLLLLLLLLLK...",
"..KLLlLLLLLLLlLLK...",
"...KLLLLLLLLLLLK....",
"...KLlKLLlLLKlLK....",
"....KK.KLK.KK.KK....",
".......KK...........",
]
bf = []
for i in range(4):
    im = img(ba, 20, 20)
    r = 1 + i  # waves
    for k in range(r):
        x = 15 + k + 1
        for y in (5, 6, 7) if k % 2 == 0 else (4, 8):
            if x < 20: im.putpixel((x, y), PAL["T"] + (255,))
    bf.append(shift(im, dy=[0, -1, 0, -1][i], size=(20, 20)))
meta["banshee"] = sheet(bf, "banshee")

json.dump(meta, open(f"{OUT}/sprites2.json", "w"), indent=2)
prev = Image.new("RGBA", (1200, 260), (22, 14, 34, 255)); x = 10; y = 10
for n in ["vampire", "spider", "poltergeist", "skeleton", "mummy", "possessed", "banshee"]:
    s = Image.open(f"{OUT}/{n}_sheet_1x.png"); s = s.resize((s.width * 3, s.height * 3), Image.NEAREST)
    if x + s.width > 1190: x = 10; y += 130
    prev.paste(s, (x, y), s); x += s.width + 20
prev.save("/home/claude/sprites/preview2.png"); print(json.dumps(meta))
