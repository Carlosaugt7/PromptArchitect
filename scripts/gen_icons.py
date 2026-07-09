"""
Gera os ícones PNG do PromptArchitect sem dependências externas.
Cria um ícone roxo com gradiente e o símbolo "P>" em branco.
"""
import struct, zlib, math, os

def write_png(filename, width, height, pixels_rgba):
    """Escreve um arquivo PNG a partir de lista de tuplas (r,g,b,a)."""
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b""
    for y in range(height):
        raw += b"\x00"
        for x in range(width):
            r, g, b, a = pixels_rgba[y * width + x]
            raw += bytes([r, g, b, a])

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(filename, "wb") as f:
        f.write(png)

def clamp(v): return max(0, min(255, int(v)))

def lerp(a, b, t): return a + (b - a) * t

def rounded_rect_mask(x, y, w, h, r):
    """Retorna True se o pixel (x,y) está dentro do rect arredondado."""
    if x < 0 or y < 0 or x >= w or y >= h:
        return False
    cx = w / 2; cy = h / 2
    dx = abs(x - cx) - (w / 2 - r)
    dy = abs(y - cy) - (h / 2 - r)
    if dx > 0 and dy > 0:
        return math.sqrt(dx*dx + dy*dy) <= r
    return True

def dist_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.sqrt((px-ax)**2 + (py-ay)**2)
    t = max(0, min(1, ((px-ax)*dx + (py-ay)*dy) / (dx*dx+dy*dy)))
    return math.sqrt((px - ax - t*dx)**2 + (py - ay - t*dy)**2)

def make_icon(size):
    pixels = []
    half = size / 2
    r_corner = size * 0.22  # border-radius proporcional

    # Cores do gradiente (roxo escuro → roxo médio)
    c1 = (92, 38, 211)   # #5c26d3
    c2 = (139, 58, 226)  # #8b3ae2

    # Escala de referência (512px)
    S = size / 512.0

    for y in range(size):
        row = []
        for x in range(size):
            # Máscara rounded rect
            in_bg = rounded_rect_mask(x, y, size, size, r_corner)
            if not in_bg:
                row.append((0, 0, 0, 0))
                continue

            # Gradiente de fundo diagonal
            t = (x / size + y / size) / 2
            bg_r = clamp(lerp(c1[0], c2[0], t))
            bg_g = clamp(lerp(c1[1], c2[1], t))
            bg_b = clamp(lerp(c1[2], c2[2], t))

            # Overlay branco suave no topo
            overlay_a = max(0, (1 - y / size) * 0.08)
            bg_r = clamp(bg_r + 255 * overlay_a)
            bg_g = clamp(bg_g + 255 * overlay_a)
            bg_b = clamp(bg_b + 255 * overlay_a)

            pr = bg_r; pg = bg_g; pb = bg_b; pa = 255

            # ── Desenhar letra P ──────────────────────────────────────────
            # Stem vertical: x=196..226, y=168..320
            stem_x1, stem_x2 = int(196*S), int(226*S)
            stem_y1, stem_y2 = int(168*S), int(320*S)
            in_stem = stem_x1 <= x < stem_x2 and stem_y1 <= y < stem_y2

            # Bowl do P: semicírculo centrado em (226,210), raio ext=86, raio int=56
            bowl_cx, bowl_cy = int(226*S), int(210*S)
            bowl_r_outer = 82 * S
            bowl_r_inner = 56 * S
            dx_b = x - bowl_cx; dy_b = y - bowl_cy
            d_bowl = math.sqrt(dx_b*dx_b + dy_b*dy_b)
            in_bowl = (bowl_r_inner <= d_bowl <= bowl_r_outer) and dx_b >= -4*S and y <= int(252*S)

            if in_stem or in_bowl:
                # Cor branca com leve transparência
                alpha = 0.96
                pr = clamp(pr * (1-alpha) + 255 * alpha)
                pg = clamp(pg * (1-alpha) + 255 * alpha)
                pb = clamp(pb * (1-alpha) + 255 * alpha)

            # ── Símbolo > (maior que) ao lado ────────────────────────────
            # Vértice do > em (304, 256), abre para direita
            gt_tip_x, gt_tip_y = int(304*S), int(256*S)
            gt_top_x, gt_top_y = int(260*S), int(192*S)
            gt_bot_x, gt_bot_y = int(260*S), int(320*S)
            stroke_w = 18 * S

            d1 = dist_to_segment(x, y, gt_top_x, gt_top_y, gt_tip_x, gt_tip_y)
            d2 = dist_to_segment(x, y, gt_bot_x, gt_bot_y, gt_tip_x, gt_tip_y)
            in_gt = (d1 <= stroke_w or d2 <= stroke_w)

            if in_gt:
                # Semi-transparência para o >
                alpha = 0.72
                pr = clamp(pr * (1-alpha) + 255 * alpha)
                pg = clamp(pg * (1-alpha) + 255 * alpha)
                pb = clamp(pb * (1-alpha) + 255 * alpha)

            # ── Underscore cursor ─────────────────────────────────────────
            uc_x1, uc_x2 = int(260*S), int(356*S)
            uc_y1, uc_y2 = int(308*S), int(330*S)
            in_uc = uc_x1 <= x < uc_x2 and uc_y1 <= y < uc_y2

            if in_uc:
                alpha = 0.88
                pr = clamp(pr * (1-alpha) + 255 * alpha)
                pg = clamp(pg * (1-alpha) + 255 * alpha)
                pb = clamp(pb * (1-alpha) + 255 * alpha)

            # ── Estrela sparkle canto superior direito ────────────────────
            star_cx, star_cy = int(360*S), int(152*S)
            star_r = 30 * S
            dx_s = x - star_cx; dy_s = y - star_cy
            # 4-pointed star via sdf aproximado
            ax_ = abs(dx_s); ay_ = abs(dy_s)
            # Área da estrela: cruzamento de dois retângulos rotacionados
            in_star = (ax_ <= star_r * 0.28 and ay_ <= star_r) or \
                      (ax_ <= star_r and ay_ <= star_r * 0.28) or \
                      (ax_ + ay_ <= star_r * 0.72)

            if in_star:
                alpha = 0.85
                pr = clamp(pr * (1-alpha) + 255 * alpha)
                pg = clamp(pg * (1-alpha) + 255 * alpha)
                pb = clamp(pb * (1-alpha) + 255 * alpha)

            row.append((pr, pg, pb, pa))
        pixels.extend(row)
    return pixels

os.makedirs("public/icons", exist_ok=True)

for size in [512, 192, 32]:
    px = make_icon(size)
    out = f"public/icons/icon-{size}.png"
    write_png(out, size, size, px)
    print(f"Generated {out}")

# Copia 512 para substituir o existente
import shutil
shutil.copy("public/icons/icon-512.png", "public/icons/icon-512.png")
print("Done!")
