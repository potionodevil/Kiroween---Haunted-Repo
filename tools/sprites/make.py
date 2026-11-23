from PIL import Image
import os, json

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "apps", "web", "public", "sprites")
os.makedirs(OUT, exist_ok=True)

PAL = {
    ".": None,
    "W": (243, 236, 221, 255),  # ghost white
    "w": (194, 182, 207, 255),  # ghost shade
    "K": (22, 14, 34, 255),     # outline / eyes
    "O": (242, 181, 68, 255),   # orange glow
    "G": (159, 214, 168, 255),  # zombie skin
    "g": (111, 168, 120, 255),  # zombie shade
    "B": (69, 52, 94, 255),     # zombie clothes
    "b": (51, 36, 74, 255),     # clothes shade
    "R": (200, 70, 70, 255),    # wound
    "P": (127, 214, 201, 255),  # bat
    "p": (82, 160, 150, 255),  # bat shade
    # added for the seven new creatures
    "S": (112, 82, 164, 255),   # spider / possessed purple
    "s": (78, 56, 120, 255),    # purple shade
    "L": (205, 194, 228, 255),  # banshee lavender
    "l": (160, 148, 192, 255),  # lavender shade
    "E": (232, 222, 192, 255),  # bone
    "e": (178, 166, 132, 255),  # bone shade
    "T": (206, 186, 140, 255),  # mummy wrap
    "t": (160, 140, 100, 255),  # wrap shade
    "C": (150, 40, 52, 255),    # cape lining red
    "J": (120, 96, 168, 255),   # spider legs
}

def frame(rows):
    h = len(rows); w = max(len(r) for r in rows)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if PAL.get(c):
                im.putpixel((x, y), PAL[c])
    return im

# ---------- GHOST 16x16, 4 frames (float + wavy hem) ----------
ghost_top = [
"................",
".....KKKKKK.....",
"....KWWWWWWK....",
"...KWWWWWWWWK...",
"..KWWWWWWWWWWK..",
"..KWWKKWWKKWWK..",
"..KWWKKWWKKWWK..",
"..KWWWWWWWWWWK..",
"..KWWWWKKWWWWK..",
"..KWWWWKKWWWwK..",
"..KWWWWWWWWWwK..",
"..KWWWWWWWWWwK..",
]
hems = [
["..KWWWWWWWWwwK..", "..KWKWWKWWKwwK..", "..K.KKK.KKK.KK..", "................"],
["..KWWWWWWWWwwK..", "..KWWKWWKWWKwK..", "..KK.KKK.KKK.K..", "................"],
["..KWWWWWWWWwwK..", "..KWKWWKWWKwwK..", "..K.KKK.KKK.KK..", "................"],
["..KWWWWWWWWwwK..", "..KKWWKWWKWWwK..", "...KK.KKK.KKKK..", "................"],
]
offsets = [0, -1, -2, -1]
ghost_frames = []
for hem, dy in zip(hems, offsets):
    rows = ghost_top + hem
    base = frame(rows)
    f = Image.new("RGBA", (16, 18), (0, 0, 0, 0))
    f.paste(base, (0, 2 + dy), base)
    ghost_frames.append(f)

# ---------- ZOMBIE 16x20 side view walking right, 4 frames ----------
zbody = [
"................",
".....KKKKK......",
"....KGGGGGK.....",
"....KGGKGGGK....",
"....KGGKGGGK....",
"....KgGGGRGK....",
"....KgGGGGGK....",
".....KKgKKK.....",
"....KBBBBBKKKKK.",
"....KBBBBBGGGGGK",
"....KBbBBBKKKKK.",
"....KBbBBBK.....",
"....KBbBBBK.....",
".....KBBBK......",
]
zlegs = [
["....KbK.KbK.....", "...KbK...KbK....", "...KbK...KbK....", "..KKKK...KKKK..."[:16], "................"],
[".....KbKbK......", ".....KbKbK......", ".....KbKbK......", "....KKKKKKK.....", "................"],
["....KbK.KbK.....", "....KbK..KbK....", "...KbK...KbK....", "...KKKK...KKKK.."[:16], "................"],
[".....KbKbK......", ".....KbKbK......", "....KbK.KbK.....", "....KKK.KKKK....", "................"],
]
zbob = [0, -1, 0, -1]
zombie_frames = []
for legs, dy in zip(zlegs, zbob):
    rows = zbody + legs
    base = frame(rows)
    f = Image.new("RGBA", (16, 20), (0, 0, 0, 0))
    f.paste(base, (0, 1 + dy), base)
    zombie_frames.append(f)

# ---------- BAT 20x12, 4 frames (flap) ----------
bat = [
[  # wings up
"..K..............K..",
".KPK............KPK.",
".KPPK..........KPPK.",
"..KPPK..K..K..KPPK..",
"...KPPK.KKKK.KPPK...",
"....KPPKPPPPKPPK....",
".....KPPPOPOPPK.....",
"......KPPPPPPK......",
".......KpPPpK.......",
"........KKKK........",
"....................",
"....................",
],
[  # wings mid
"....................",
"....................",
"........K..K........",
"........KKKK........",
".KKKK..KPPPPK..KKKK.",
"KPPPPKKPPPPPPKKPPPPK",
".KpPPPPPPOPOPPPPPpK.",
"..KKpPPPPPPPPPPpKK..",
"....KKKpPPPPpKKK....",
".......KKKKKK.......",
"....................",
"....................",
],
[  # wings down
"....................",
"....................",
"........K..K........",
"........KKKK........",
".......KPPPPK.......",
"......KPPPPPPK......",
".....KPPPOPOPPK.....",
"....KPPKPPPPKPPK....",
"...KPPK.KpPK.KPPK...",
"..KPPK...KK...KPPK..",
".KPPK..........KPPK.",
"..KK............KK..",
],
None,
]
bat[3] = bat[1]
bat_frames = [frame(r) for r in bat]


def build(top, variants, offsets, size, pad_top=1):
    """top rows + one of `variants` (bottom rows) per frame, shifted by dy, on a fixed canvas."""
    w, h = size
    out = []
    for i, dy in enumerate(offsets):
        rows = top + variants[i % len(variants)]
        base = frame(rows)
        f = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        f.paste(base, (0, pad_top + dy), base)
        out.append(f)
    return out


# ---------- VAMPIRE 16x18: pale face, red eyes, cape with red lining ----------
vamp_top = [
"......KKKK......",
".....KbbbbK.....",
"....KbbbbbbK....",
"....KbWWWWbK....",
"....KWWWWWWK....",
"....KWRWWRWK....",
"....KWWWWWWK....",
"....KWWKKWWK....",
".....KWEEWK.....",
"..KKKKBBBBKKKK..",
".KCBBBBBBBBBBCK.",
"KCBBBBBBBBBBBBCK",
"KCBBBbBBBBbBBBCK",
]
vamp_bottom = [
["KCBBBbBBBBbBBBCK", "KCCBBBBBBBBBBCCK", ".KKKKKKKKKKKKKK.", ".....KbK.KbK....", ".....KKK.KKK...."],
["KCBBBbBBBBbBBBCK", ".KCCBBBBBBBBCCK.", "..KKKKKKKKKKKK..", ".....KbK.KbK....", "....KKK...KKK..."],
]
vampire_frames = build(vamp_top, vamp_bottom, [0, -1, 0, -1], (16, 19))

# ---------- SPIDER 20x12: purple body, orange eyes, 8 legs ----------
spider_a = [
"....................",
".J......JJJJ......J.",
"..J....KSSSSK....J..",
"...J..KSSSSSSK..J...",
"JJ..JKSSSSSSSSKJ..JJ",
"..JKsKSSOSSOSSKsKJ..",
"....JKSSSSSSSSKJ....",
"..JKsKSSSSSSSSKsKJ..",
"JJ...KsKSSSSKsK...JJ",
"....J...JJJJ...J....",
"...J............J...",
"....................",
]
spider_b = [
"....................",
"J.......JJJJ.......J",
".J.....KSSSSK.....J.",
"..JJ..KSSSSSSK..JJ..",
"....JKSSSSSSSSKJ....",
".JJKsKSSOSSOSSKsKJJ.",
"J...JKSSSSSSSSKJ...J",
"...KsKSSSSSSSSKsK...",
"..J..KsKSSSSKsK..J..",
".J....J.JJJJ.J....J.",
"J..................J",
"....................",
]
spider_frames = [frame(spider_a), frame(spider_b), frame(spider_a), frame(spider_b)]

# ---------- POLTERGEIST 16x18: angry teal spirit with flying debris ----------
polt_top = [
".....KKKKKK.....",
"....KPPPPPPK....",
"...KPPPPPPPPK...",
"..KPPKKPPKKPPK..",
"..KPPPKPPKPPPK..",
"..KPPKKPPKKPPK..",
"..KPPPPPPPPPPK..",
"..KPPKKKKKKPPK..",
"..KPPKPPPPKPPK..",
"...KPPPPPPPPK...",
"....KPPPPPPK....",
]
polt_bottom = [
[".....KPPPPK.....", "......KPPK......", ".......KPK......", "........K.......", "................", "................"],
[".....KPPPPK.....", "......KPPK......", "......KPK.......", ".......K........", "................", "................"],
[".....KPPPPK.....", "......KPPK......", ".......KPK......", "........KK......", "................", "................"],
[".....KPPPPK.....", "......KPPK......", "......KPK.......", "......K.........", "................", "................"],
]
poltergeist_frames = build(polt_top, polt_bottom, [0, -1, -2, -1], (18, 19), pad_top=2)
# debris pixels that hop around the head
for i, f in enumerate(poltergeist_frames):
    spots = [[(0, 1), (16, 5)], [(1, 0), (17, 3)], [(0, 3), (16, 1)], [(1, 5), (17, 6)]][i]
    for (x, y) in spots:
        f.putpixel((x, y), PAL["W"]); f.putpixel((x, y + 1), PAL["w"])

# ---------- POSSESSED 16x16: a screen with a face and loose cables ----------
poss_top = [
"................",
"..KKKKKKKKKKKK..",
"..KSSSSSSSSSSK..",
"..KSKKKKKKKKSK..",
"..KSKOOKKOOKSK..",
"..KSKKKKKKKKSK..",
"..KSKKOOOOKKSK..",
"..KSKKKKKKKKSK..",
"..KSSSSSSSSSSK..",
"..KKKKKsKKKKKK..",
]
poss_bottom = [
["....s.s.s.s.....", "...s..s..s..s...", "...s.s...s.s....", "..s..s..s...s...", "..s...s.s....s..", "................"],
["....s.s.s.s.....", "...s..s..s..s...", "....s.s..s..s...", "...s..s...s..s..", "..s...s...s...s.", "................"],
]
possessed_frames = build(poss_top, poss_bottom, [0, 0, -1, 0], (16, 17))
# blink on frame 3
for x in (5, 6, 9, 10):
    possessed_frames[3].putpixel((x, 5), PAL["K"])

# ---------- BANSHEE 18x18: hooded lavender wraith, screaming, sound waves ----------
banshee_top = [
"......KKKKKK......",
".....KLLLLLLK.....",
"....KLLWWWWLLK....",
"....KLWKWWKWLK....",
"....KLWWWWWWLK....",
"....KLWWKKWWLK....",
"...KLLWWKKWWLLK...",
"...KLLLWWWWLLLLK..",
"..KLLLLLLLLLLlLK..",
"..KLlLLLLLLLLlLK..",
"..KLlLLLLLLLLllK..",
"..KLLLLLLLLLLLLK..",
"..KLLlLLLLLlLLLK..",
]
banshee_bottom = [
["...KLLKLLLKLLLK...", "...K.KK.KKK.KK....", ".................."],
["...KLLLKLLLKLLK...", "....KK.KKK.KK.K...", ".................."],
]
banshee_frames = build(banshee_top, banshee_bottom, [0, -1, 0, 1], (20, 18))
for i, f in enumerate(banshee_frames):
    # sound wave arcs next to the mouth, growing per frame
    r = [1, 2, 3, 2][i]
    for k in range(r):
        x = 16 + k
        for y in (4 + k // 2, 7 - k // 2):
            if 0 <= y < 18 and x < 20:
                f.putpixel((x, y + 1), PAL["P"])

# ---------- SKELETON 12x20: bones, walking ----------
skel_top = [
"...KKKKK....",
"..KEEEEEK...",
"..KEKEKEK...",
"..KEEEEEK...",
"...KEKEK....",
"....KEK.....",
"..KKEEEKK...",
".KE.KEK.EK..",
".KE.EEE.EK..",
"..K.KEK.K...",
"....EEE.....",
"....KEK.....",
"...KEEEK....",
]
skel_bottom = [
["...KE.EK....", "...KE.EK....", "...KE.EK....", "...KE.EK....", "..KEE.EEK...", "..KKK.KKK..."],
["...KE.EK....", "...KE..EK...", "..KE...EK...", "..KE...EK...", ".KEE...EEK..", ".KKK...KKK.."],
]
skeleton_frames = build(skel_top, skel_bottom, [0, 0, 0, 0], (12, 20), pad_top=1)

# ---------- MUMMY 16x20: wrapped, arms forward, orange eyes ----------
mummy_top = [
".....KKKKK......",
"....KTTtTTK.....",
"....KtOTOtK.....",
"....KTTTTtK.....",
"....KtTTtTK.....",
".....KTTTK......",
"....KTtTTTKKKKK.",
"....KTTtTTTTtTTK",
"....KtTTTtKKKKK.",
"....KTTtTTK.....",
"....KTtTTtK.....",
"....KTTTtTK.....",
".....KTtTK......",
]
mummy_bottom = [
[".....KTKTK......", "....KTK.KTK.....", "....KtK.KtK.....", "....KTK.KTK.....", "...KKKK.KKKK....", "................"],
[".....KTKTK......", ".....KTKTK......", ".....KtKtK......", ".....KTKTK......", "....KKKKKKK.....", "................"],
]
mummy_frames = build(mummy_top, mummy_bottom, [0, -1, 0, -1], (16, 20))

def sheet(frames, name, scale):
    w, h = frames[0].size
    s = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        s.paste(f, (i * w, 0), f)
    s.save(f"{OUT}/{name}_sheet_1x.png")
    big = s.resize((s.width * scale, s.height * scale), Image.NEAREST)
    big.save(f"{OUT}/{name}_sheet.png")
    for i, f in enumerate(frames):
        f.resize((w * scale, h * scale), Image.NEAREST).save(f"{OUT}/{name}_{i}.png")
    return {"frame_w": w * scale, "frame_h": h * scale, "frames": len(frames), "sheet": f"{name}_sheet.png"}

meta = {
    "ghost": sheet(ghost_frames, "ghost", 6),
    "zombie": sheet(zombie_frames, "zombie", 6),
    "bat": sheet(bat_frames, "bat", 6),
    "vampire": sheet(vampire_frames, "vampire", 6),
    "spider": sheet(spider_frames, "spider", 6),
    "poltergeist": sheet(poltergeist_frames, "poltergeist", 6),
    "possessed": sheet(possessed_frames, "possessed", 6),
    "banshee": sheet(banshee_frames, "banshee", 6),
    "skeleton": sheet(skeleton_frames, "skeleton", 6),
    "mummy": sheet(mummy_frames, "mummy", 6),
}
json.dump(meta, open(f"{OUT}/sprites.json", "w"), indent=2)

# preview: one sheet per row at 4x
names = list(meta.keys())
prev = Image.new("RGBA", (420, 30 + 100 * len(names)), (22, 14, 34, 255))
for row, n in enumerate(names):
    s = Image.open(f"{OUT}/{n}_sheet_1x.png")
    s = s.resize((s.width * 4, s.height * 4), Image.NEAREST)
    prev.paste(s, (15, 15 + row * 100), s)
prev.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview.png"))
print(meta)
