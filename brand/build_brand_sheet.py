"""Author CropOtter's editable brand board using the installed Tesseract schema."""
from pathlib import Path
import json
import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).parent
WORK = ROOT / '.tesseract-work'
ASSETS = ROOT / 'assets'
W, H = 2400, 4000
COLORS = {
    'indigo': '#243A79', 'paper': '#F6F1E7', 'orange': '#D85C32',
    'kraft': '#CDB693', 'ink': '#23262E', 'rule': '#CFC9BC',
    'white': '#FFFFFF', 'muted': '#626776', 'mist': '#E8EAF1',
}
FONTS = {
    'display': ('Barlow Condensed', 'Bold', ASSETS / 'BarlowCondensed-Bold.ttf'),
    'body': ('DM Sans', 'Regular', ASSETS / 'DMSans-Regular-static.ttf'),
    'bold': ('DM Sans', 'Bold', ASSETS / 'DMSans-Bold-static.ttf'),
    'mono': ('IBM Plex Mono', 'Regular', ASSETS / 'IBMPlexMono-Regular.ttf'),
    'mark': ('Bungee', 'Regular', ASSETS / 'Bungee-Regular.ttf'),
}
font_cache = {k: TTFont(v[2]) for k,v in FONTS.items()}
layers = []
uid = 0
section = 'Canvas'
text_boxes = []

def rgba(color):
    color = COLORS.get(color, color).lstrip('#')
    return [int(color[i:i+2],16)/255 for i in (0,2,4)] + [1]

def transform(x=0,y=0,scale=(100,100),rotation=0,opacity=100):
    return dict(anchorPoint=[0,0],position=[x,y],scale=list(scale),rotation=rotation,opacity=opacity)

def base(kind,name,x=0,y=0,**kwargs):
    global uid
    uid += 1
    return dict(type=kind,id=uid,name=f'{section} / {name}',blendMode='normal',
        activeRange=dict(start=0,duration=3000),transform=transform(x,y,**kwargs))

def rect(x,y,w,h,color='paper',stroke=None,sw=1,r=0,name='Rectangle',opacity=100):
    layer=base('Rect',name,x,y,opacity=opacity)
    layer['rect']=dict(position=[0,0],size=[w,h],fillColor=rgba(color),roundness=r)
    if stroke:
        layer['rect'].update(strokeEnabled=True,strokeColor=rgba(stroke),strokeWidth=sw)
    layers.append(layer)
    return layer

def line(x,y,w,color='rule',h=2):
    return rect(x,y,w,h,color,name='Rule')

def text_width(s,size,font='body'):
    f=font_cache[font]; cmap=f.getBestCmap(); hm=f['hmtx'].metrics
    return sum(hm[cmap.get(ord(c),'.notdef')][0] for c in s)*size/f['head'].unitsPerEm

def txt(s,x,top,size=28,font='body',color='ink',align='left',leading=None,fit=None,name=None,opacity=100):
    family,style,_=FONTS[font]
    f=font_cache[font]
    cap=getattr(f['OS/2'],'sCapHeight',f['hhea'].ascent*.72)/f['head'].unitsPerEm
    widths=[text_width(t,size,font) for t in s.split('\n')]
    if fit and max(widths)>fit:
        size *= fit/max(widths)
        widths=[text_width(t,size,font) for t in s.split('\n')]
    leading=leading or size*1.22
    layer=base('Text',name or s.replace('\n',' / ')[:70],x,top+size*cap,opacity=opacity)
    layer['sourceText']=dict(text=s,fontFamily=family,fontStyle=style,fontSize=size,
        fillColor=rgba(color),strokeWidth=0,justification=align,leading=leading)
    layers.append(layer)
    text_boxes.append(dict(text=s,x=x,top=top,size=size,width=max(widths),align=align))
    return layer

def brackets(x,y,w,h,color='indigo',arm=30,thick=6):
    for xx,yy,sx,sy in [(x,y,1,1),(x+w,y,-1,1),(x,y+h,1,-1),(x+w,y+h,-1,-1)]:
        rect(xx if sx>0 else xx-arm, yy if sy>0 else yy-thick, arm,thick,color,name='Crop corner horizontal')
        rect(xx if sx>0 else xx-thick, yy if sy>0 else yy-arm, thick,arm,color,name='Crop corner vertical')

def stamp(x,y,width,color=None):
    layer=base('Image','Textured primary stamp',x,y,scale=(width/1457*100,width/1457*100))
    layer['source']=dict(assetId='cropotter-stamp',fit='contain')
    if color:
        rr,gg,bb,_=rgba(color)
        layer['effects']=[dict(id=100000+uid,effect=dict(type='tintTritone',amount=100,
            blackR=rr,blackG=gg,blackB=bb,whiteR=rr,whiteG=gg,whiteB=bb))]
    layers.append(layer)
    return layer

def clean_stamp(x,y,w,color='indigo'):
    h=w*.655
    rect(x,y,w,h,'paper',stroke=color,sw=w*.022,r=w*.022,name='Clean stamp perimeter')['rect']['fillEnabled']=False
    brackets(x+w*.052,y+h*.075,w*.896,h*.85,color,arm=w*.055,thick=w*.015)
    inset=w*.13
    # The two editable lines are fitted optically to the same width.
    for string,top in [('CROP',y+h*.105),('OTTER',y+h*.515)]:
        f=font_cache['mark']; cap=f['OS/2'].sCapHeight/f['head'].unitsPerEm
        fs=h*.33/cap
        layer=txt(string,x+inset,top,fs,'mark',color)
        natural=text_width(string,fs,'mark')
        layer['transform']['scale']=[(w-2*inset)/natural*100,100]
    return h

def monogram(x,y,size,color='indigo',bg='paper'):
    rect(x,y,size,size,bg,r=size*.07,name='Compact icon tile')
    brackets(x+size*.09,y+size*.09,size*.82,size*.82,color,arm=size*.18,thick=size*.055)
    txt('CO',x+size/2,y+size*.36,size*.37,'mark',color,align='center',fit=size*.7,name='CO monogram')

def section_title(y,num,title,note=''):
    txt(num,120,y,24,'mono','orange')
    txt(title,190,y-3,34,'display','indigo')
    if note:
        txt(note,2280,y+2,21,'mono','muted',align='right')
    line(120,y+49,2160)

def demo_label(x,y,w,h):
    rect(x,y,w,h,'white',stroke='rule',sw=1,name='Unbranded sample 4 by 6 label')
    m=w*.075
    txt('SAMPLE LABEL',x+m,y+m,w*.068,'mono','ink',fit=w-2*m)
    line(x+m,y+h*.145,w-2*m,'ink',2)
    txt('SHIP TO',x+m,y+h*.185,w*.056,'mono')
    for i,ww in enumerate([.62,.7,.48]):
        rect(x+m,y+h*(.24+i*.037),w*ww,h*.013,'rule',name='Fictional address placeholder')
    line(x+m,y+h*.39,w-2*m,'ink',2)
    txt('4 × 6',x+m,y+h*.43,w*.16,'display','ink')
    txt('DEMO / PREVIEW',x+m,y+h*.58,w*.052,'mono','muted')
    # Decorative bars only, explicitly demo; not claimed to encode any data.
    cur=x+m
    for i in range(39):
        bw=w*(.004 if i%3 else .009)
        rect(cur,y+h*.68,bw,h*.17,'ink',name='Demo barcode illustration')
        cur+=bw+w*.009
    txt('0000  DEMO  0000',x+m,y+h*.9,w*.05,'mono','ink',fit=w-2*m)

def button(label,x,y,w,h=52,variant='primary',font_size=22):
    bg,fg=('indigo','white') if variant=='primary' else ('paper','indigo')
    rect(x,y,w,h,bg,stroke='indigo',sw=2,r=6,name=f'{label} button')
    txt(label,x+w/2,y+(h-font_size*.72)/2,font_size,'bold',fg,align='center',fit=w-24)

# Canvas and mailroom index.
rect(0,0,W,H,'paper',name='Warm paper background')
section='Header'
txt('CROPOTTER / BRAND SYSTEM',120,65,24,'mono','indigo')
txt('04 — THE MAILROOM STAMP    /    V1.0',2280,65,22,'mono','indigo',align='right')
line(120,115,2160,'indigo',3)

# Hero.
section='Hero'
stamp(55,110,1130)
txt('PRIMARY MARK / INDIGO INK',155,890,22,'mono','muted')
txt('FORMAT / CROP / DOWNLOAD',1240,218,23,'mono','orange')
txt('YOUR LABELS.\nREADY TO GO.',1240,288,155,'display','indigo',leading=155,fit=1030)
txt('Turn shipping PDFs into tidy 4 × 6 labels.\nUpload a file or paste a link. Download. Done.',1240,650,30,'body','ink',leading=45,fit=1030)
rect(1240,795,280,58,'orange',r=4,name='Brand positioning tab')
txt('LESS FUSS. MORE SEND.',1380,813,23,'display','white',align='center')
txt('Practical. Assured. A little tactile.',1240,884,24,'body','muted')

# Logo family.
section='Logo family'
section_title(965,'01','THE LOGO FAMILY','ONE MARK. A FEW GOOD WAYS TO USE IT.')
cards=[120,852,1584]
rect(cards[0],1045,696,340,'indigo',r=8,name='Reversed logo panel')
stamp(cards[0]+88,1005,520,'paper')
rect(cards[1],1045,696,340,'mist',r=8,name='Clean logo panel')
clean_stamp(cards[1]+145,1090,406,'indigo')
rect(cards[2],1045,696,340,'kraft',r=8,name='Compact icon panel')
monogram(cards[2]+233,1100,230,'indigo','paper')
txt('REVERSED / DARK SURFACES',120,1410,22,'mono','indigo')
txt('CLEAN STAMP / SMALLER USES',852,1410,22,'mono','indigo')
txt('CO ICON / TABS & AVATARS',1584,1410,22,'mono','indigo')

# Color tokens.
section='Color palette'
section_title(1500,'02','INK, PAPER & A POSTAL ACCENT','PAPER LEADS. INDIGO ANCHORS. ORANGE HIGHLIGHTS.')
swatches=[('indigo','INDIGO INK','Primary / brand'),('paper','WARM PAPER','Background'),('orange','POSTAL ORANGE','Accents / emphasis'),('kraft','PARCEL KRAFT','Supporting texture'),('ink','CARBON','Text / utility')]
for i,(key,label,role) in enumerate(swatches):
    x=120+i*440
    rect(x,1580,400,150,key,stroke='rule' if key=='paper' else None,sw=2,name=f'{label} swatch')
    txt(label,x,1755,24,'display','indigo')
    txt(COLORS[key].upper(),x,1796,23,'mono','ink')
    txt(role,x,1834,22,'body','muted')

# Type specimens.
section='Typography'
section_title(1935,'03','TYPE WITH PURPOSE','CONDENSED HEADLINES. CLEAR EVERYDAY COPY.')
txt('MAKE ROOM\nFOR THE LABEL.',120,2030,92,'display','indigo',leading=94,fit=665)
txt('BARLOW CONDENSED / BOLD',120,2260,22,'mono','indigo')
txt('Headlines & campaign copy',120,2300,25,'body','muted')
txt('Aa Bb Cc\n1234567890',875,2034,65,'body','ink',leading=88,fit=650)
txt('DM SANS / REGULAR + BOLD',875,2260,22,'mono','indigo')
txt('Body copy, buttons & navigation',875,2300,25,'body','muted',fit=630)
txt('PDF → 4 × 6\nREADY / 01',1630,2050,49,'mono','indigo',leading=84,fit=650)
txt('IBM PLEX MONO / REGULAR',1630,2260,22,'mono','indigo')
txt('Formats, steps & status details',1630,2300,25,'body','muted')

# Graphic language and verbal language.
section='Visual and verbal language'
section_title(2405,'04','THE SUPPORTING LANGUAGE','BORROW FROM THE MAILROOM. KEEP IT USEFUL.')
brackets(180,2515,240,150,'indigo',arm=44,thick=9)
txt('4 × 6',300,2559,51,'mono','indigo',align='center')
txt('CROP CORNERS',120,2710,23,'display','indigo')
txt('Frame previews, steps and important details.',120,2751,23,'body','muted',fit=655)
for i in range(10):
    x=875+i*61
    rect(x,2520,27,125,'indigo' if i%2==0 else 'orange',name='Postal stripe motif')
txt('POSTAL RHYTHM',875,2710,23,'display','indigo')
txt('Rules, label tabs and small hits of orange.',875,2751,23,'body','muted',fit=640)
txt('“Drop your PDF here.”\n“Looking good.”\n“Your label is ready.”',1630,2505,31,'bold','indigo',leading=52,fit=650)
txt('PLAIN, HELPFUL & WARM',1630,2710,23,'display','indigo')
txt('Short instructions. Clear next steps.',1630,2751,23,'body','muted')

# Brand in use. This is a static website concept, not an implementation.
section='Brand applications'
section_title(2860,'05','FROM THE WEBSITE TO THE WORKBENCH','APPLICATION CONCEPTS / FIRST RELEASE')
rect(120,2940,1400,650,'white',stroke='rule',sw=2,r=8,name='Static website concept')
rect(120,2940,1400,46,'mist',r=8,name='Browser toolbar')
for i,c in enumerate(['orange','kraft','indigo']):
    rect(142+i*24,2956,12,12,c,r=6,name='Browser chrome dot')
txt('cropotter.com',820,2954,16,'mono','muted',align='center')
txt('CROPOTTER',175,3018,30,'mark','indigo',fit=330)
txt('How it works',1458,3026,19,'body','indigo',align='right')
line(175,3070,1290,'rule',1)
txt('A LABEL. A LINK.\nA PERFECT FIT.',175,3115,78,'display','indigo',leading=78,fit=680)
txt('Format your shipping label. Download it. Get on with it.',175,3301,21,'body','muted',fit=680)
rect(175,3353,640,121,'paper',stroke='rule',sw=2,r=6,name='Upload PDF drop zone')
brackets(198,3375,594,77,'indigo',arm=16,thick=3)
txt('Drop your PDF here',495,3379,27,'bold','indigo',align='center')
txt('or choose a file',495,3421,20,'body','muted',align='center')
rect(175,3494,470,54,'white',stroke='rule',sw=2,r=5,name='Paste a PDF URL field')
txt('Or paste a PDF link…',193,3512,20,'body','muted')
button('Convert',665,3494,150,54,font_size=21)
demo_label(900,3120,220,330)
txt('4 × 6 IN',1170,3130,23,'mono','indigo')
txt('Your label\nis ready.',1170,3190,35,'bold','indigo',leading=42,fit=300)
button('Download PDF',1170,3310,290,55,font_size=20)
button('Download PNG',1170,3382,290,55,variant='secondary',font_size=20)
txt('STATIC WEBSITE CONCEPT',120,3620,21,'mono','muted')

# Flat parcel/sticker example; no shipping data or added marks on output labels.
rect(1584,2940,696,650,'kraft',r=8,name='Parcel application backdrop')
line(1584,3000,696,'paper',24)
line(1584,3036,696,'paper',5)
stamp(1652,3020,560)
rect(1690,3410,485,115,'paper',r=3,name='Brand sticker')
txt('LOOKS GOOD. SEND IT.',1932,3447,46,'display','indigo',align='center',fit=425)
txt('STICKER / PARCEL DETAIL',1584,3620,21,'mono','muted')

# Practical usage rules and footer.
section='Usage rules'
section_title(3720,'06','A FEW RULES THAT KEEP IT TOGETHER')
txt('GIVE IT ROOM',120,3818,26,'display','indigo')
txt('Leave at least 1/8 of the mark’s height\nclear on every side. Keep its proportions.',120,3862,23,'body','ink',leading=32,fit=665)
txt('KEEP SMALL USES CLEAN',875,3818,26,'display','indigo')
txt('Use the clean stamp below 180 px wide.\nMinimum: stamp 120 px; CO icon 24 px.',875,3862,23,'body','ink',leading=32,fit=650)
txt('PROTECT THE LABEL',1630,3818,26,'display','indigo')
txt('Use brand artwork around the workspace.\nKeep it off exported labels and barcodes.',1630,3862,23,'body','ink',leading=32,fit=650)
line(120,3950,2160,'indigo',2)
txt('CROPOTTER.COM',120,3970,17,'mono','indigo')
txt('IDENTITY DIRECTION 04 / BRAND SHEET V1',2280,3970,17,'mono','indigo',align='right')

doc=json.loads((WORK/'layout.json').read_text())
doc['dimensions']={'width':W,'height':H}
doc['duration']=3
doc['composition']['layers']=list(reversed(layers))
doc['composition']['name']='CropOtter / Mailroom Stamp Brand System'
(WORK/'layout.json').write_text(json.dumps(doc,indent=2))
(WORK/'text-inventory.json').write_text(json.dumps(text_boxes,indent=2))
(ROOT/'brand-tokens.json').write_text(json.dumps({
    'name':'CropOtter','domain':'cropotter.com','direction':'04 — The Mailroom Stamp',
    'colors':COLORS,'typography':{'display':'Barlow Condensed Bold','body':'DM Sans Regular / Bold','utility':'IBM Plex Mono Regular','cleanLogoCompanion':'Bungee Regular'},
    'voice':['Plain','Helpful','Warm'],
    'clearSpace':{'minimumMarkHeightFraction':.125},
    'minimumWidthPx':{'fullStamp':120,'compactIcon':24},
    'texturedStampMinimumWidthPx':180,
    'brandArtworkOnExportedShippingLabels':False,
    'websiteMockup':'Static visual concept; not a working site',
},indent=2))

# Portable vector companions with outlined Bungee lettering.
f=font_cache['mark']; gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
def outlined_word(word,x,y,w,height):
    width=sum(f['hmtx'].metrics[cmap[ord(ch)]][0] for ch in word)
    cap=f['OS/2'].sCapHeight
    parts=[]; cur=0
    for ch in word:
        g=gs[cmap[ord(ch)]]; pen=SVGPathPen(gs); g.draw(pen)
        parts.append(f'<path d="{pen.getCommands()}" transform="translate({cur},0)"/>')
        cur+=f['hmtx'].metrics[cmap[ord(ch)]][0]
    return f'<g transform="translate({x},{y+height}) scale({w/width},{-height/cap})">'+''.join(parts)+'</g>'
def svg_clean(color):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -80 960 684" role="img" aria-label="CropOtter clean stamp"><g fill="{color}" stroke="{color}"><rect x="10" y="10" width="780" height="504" rx="16" fill="none" stroke-width="18"/><path d="M85 102V61h42 M673 61h42v41 M85 422v41h42 M673 463h42v-41" fill="none" stroke-width="12" stroke-linecap="square"/></g><g fill="{color}">{outlined_word('CROP',110,70,580,170)}{outlined_word('OTTER',110,270,580,170)}</g></svg>'''
(ASSETS/'CropOtter-clean-stamp.svg').write_text(svg_clean(COLORS['indigo']))
(ASSETS/'CropOtter-clean-stamp-reverse.svg').write_text(svg_clean(COLORS['paper']))
(ASSETS/'CropOtter-CO-icon.svg').write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="CropOtter CO icon"><rect width="256" height="256" rx="18" fill="{COLORS['paper']}"/><g stroke="{COLORS['indigo']}" stroke-width="14" fill="none"><path d="M24 70V24h46 M186 24h46v46 M24 186v46h46 M186 232h46v-46"/></g><g fill="{COLORS['indigo']}">{outlined_word('CO',44,98,168,72)}</g></svg>''')
print(json.dumps({'canvas':[W,H],'layers':len(layers),'textLayers':len(text_boxes),'files':['brand-tokens.json','assets/CropOtter-clean-stamp.svg','assets/CropOtter-CO-icon.svg']}))
