"""Build the repository cover from the approved brand's outlined font glyphs."""
from pathlib import Path
import re
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).parent

def lettering(text, font_file, x, baseline, size, color):
    font = TTFont(ROOT / "assets" / font_file)
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    units, cursor, paths = font["head"].unitsPerEm, 0, []
    for char in text:
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        paths.append(f'<path d="{pen.getCommands()}" transform="translate({cursor} 0)"/>')
        cursor += font["hmtx"].metrics[name][0]
    return f'<g fill="{color}" transform="translate({x} {baseline}) scale({size / units} {-size / units})">{"".join(paths)}</g>'

stamp = (ROOT / "assets/CropOtter-clean-stamp.svg").read_text()
stamp = re.sub(r'^<svg[^>]*>|</svg>$', '', stamp)
stripes = ''.join(f'<path d="M{x} 464h30l-8 12h-30z" fill="{color}"/>' for x, color in ((x, '#243A79' if i % 2 == 0 else '#D85C32') for i, x in enumerate(range(30, 1200, 52))))
art = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480" role="img" aria-labelledby="title desc">
<title id="title">CropOtter — Your labels. Ready to go.</title><desc id="desc">Indigo mailroom stamp on warm paper, with postal orange details. Open-source label formatting.</desc>
<rect width="1200" height="480" rx="16" fill="#F6F1E7"/>
<path d="M42 85V42h43M1115 42h43v43M42 395v43h43M1115 438h43v-43" fill="none" stroke="#243A79" stroke-width="4"/>
<rect x="80" y="86" width="292" height="305" rx="4" fill="#CDB693" opacity=".35" transform="rotate(-5 226 239)"/>
<rect x="88" y="80" width="285" height="305" rx="4" fill="#FFFDF8" stroke="#D6D2C8" transform="rotate(3 230 232)"/>
<g transform="translate(112 147) rotate(-6 110 70) scale(.29)">{stamp}</g>
<path d="M136 323h185" stroke="#243A79" stroke-width="2"/>
<rect x="323" y="347" width="30" height="24" fill="#D85C32"/>
{lettering('A CLEAN CUT. A BETTER SEND-OFF.', 'IBMPlexMono-Regular.ttf', 444, 119, 15, '#A23E21')}
{lettering('CROPOTTER', 'BarlowCondensed-Bold.ttf', 436, 239, 116, '#243A79')}
{lettering('Your labels. Ready to go.', 'DMSans-Bold.ttf', 441, 293, 31, '#243A79')}
{lettering('PDF IN. A PROPER LITTLE FIT OUT.', 'IBMPlexMono-Regular.ttf', 444, 347, 15, '#626776')}
{stripes}</svg>'''
(ROOT / "repo-cover.svg").write_text(art)
