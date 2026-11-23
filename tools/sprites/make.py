from PIL import Image
import os, json

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "sprites")
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
}
json.dump(meta, open(f"{OUT}/sprites.json", "w"), indent=2)

# preview
prev = Image.new("RGBA", (900, 200), (22, 14, 34, 255))
x = 20
for n in ["ghost", "zombie", "bat"]:
    s = Image.open(f"{OUT}/{n}_sheet_1x.png")
    s = s.resize((s.width * 3, s.height * 3), Image.NEAREST)
    prev.paste(s, (x, 40), s); x += s.width + 30
prev.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview.png"))
print(meta)
