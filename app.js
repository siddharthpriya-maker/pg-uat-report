/* ===== Config ===== */
const SHEET_ID = '1taeplqlRJGmUUCkMzvc2wzhCvcmkzGnvjbLDrYxPFqg';
const SHEET_TAB = 'Gaps';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const FIELDS = ['id','screen','component','theme','expected','actual','severity','owner','status','figmaLink','figmaShot','liveShot','notes'];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const safeUrl = u => /^https?:\/\//i.test(u||'') ? u : '';

/* RFC4180-ish CSV parser: quotes, escaped quotes, commas & newlines inside fields */
function parseCSV(text){
  const rows=[]; let row=[], f='', q=false;
  text = text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"') q=true;
    else if(c===','){ row.push(f); f=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=''; }
    else f+=c;
  }
  if(f!==''||row.length){ row.push(f); rows.push(row); }
  return rows;
}

function driveId(url){
  if(!url) return '';
  const m = url.match(/\/file\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/) || url.match(/\/d\/([\w-]{20,})/);
  return m ? m[1] : '';
}
const thumb = url => { const id=driveId(url); return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1600` : safeUrl(url); };

function normalize(v, opts){ const t=String(v||'').trim().toLowerCase(); return opts.find(o=>o.toLowerCase()===t) || String(v||'').trim(); }

function toGaps(rows){
  if(!rows.length) return [];
  const body = /^\s*id\s*$/i.test(rows[0][0]||'') ? rows.slice(1) : rows;
  return body.filter(r => r.some(c => String(c).trim())).map(r => {
    const g={}; FIELDS.forEach((k,i)=>g[k]=String(r[i]??'').trim());
    g.theme=normalize(g.theme,['Light','Dark']);
    g.severity=normalize(g.severity,['High','Medium','Low']);
    g.status=normalize(g.status,['Open','In Progress','Fixed',"Won't Fix"]);
    return g;
  });
}

const DEMO = [
 ['PG-001','Payment Checkout','Primary CTA button','Light','Height 48px, radius 12px, #00BAF2 fill, 16/600 label','Height 44px, radius 8px, label 15/500','High','Ananya','Open','https://www.figma.com/','','','Affects all checkout variants.'],
 ['PG-002','Payment Checkout','Primary CTA button','Dark','#00BAF2 on #0D1320, contrast ≥ 4.5:1','Button uses light-mode navy, contrast 2.9:1','High','Ananya','In Progress','https://www.figma.com/','','','Token not mapped for dark theme.'],
 ['PG-003','Saved Cards','Card tile shadow','Light','Elevation 2 (0 2 8 rgba(0,0,0,.08))','No shadow, 1px border instead','Low','Rahul','Fixed','https://www.figma.com/','','',''],
 ['PG-004','UPI Intent','App icons grid','Dark','4-column grid, 16px gutter','3-column grid, icons clipped on 360px width','Medium','Meera','Open','','','','Repro on Pixel 6a, "small" font.'],
 ['PG-005','Payment Success','Lottie + amount text','Dark','Amount 28/700 #FFFFFF','Amount rendered #13203A (invisible on dark)','High','Rahul',"Won't Fix",'https://www.figma.com/','','','Deferred to v2 redesign.'],
 ['PG-006','Net Banking','Bank search field','Light','Placeholder "Search for your bank", 14/400','Placeholder "Search", 12/400','Low','Meera','Open','https://www.figma.com/','','','']
].map(r=>r);

let ALL=[], isDemo=new URLSearchParams(location.search).get('demo')==='1';

/* ===== Theme ===== */
$('#themeBtn').onclick=()=>{ const t=document.documentElement.dataset.theme==='dark'?'light':'dark'; document.documentElement.dataset.theme=t; try{localStorage.setItem('pgTheme',t)}catch(e){} };
$('#sheetLink').href=SHEET_URL;

/* ===== Render ===== */
function summary(list){
  const c=(k,v)=>list.filter(g=>g[k]===v).length;
  const stats=[['Total',list.length,''],['Open',c('status','Open'),'open'],['In Progress',c('status','In Progress'),''],['Fixed',c('status','Fixed'),''],
    ['High',c('severity','High'),'high'],['Medium',c('severity','Medium'),'med'],['Low',c('severity','Low'),'low'],['Light',c('theme','Light'),''],['Dark',c('theme','Dark'),'']];
  $('#summary').innerHTML=stats.map(([l,n,cl])=>`<div class="stat ${cl}"><b>${n}</b><span>${l}</span></div>`).join('');
}

function shot(url,label){
  const src=thumb(url), full=safeUrl(url)||src;
  const ph=`<div class="ph"><i>🖼</i>${esc(label)} screenshot<br>${url?'could not load':'not provided'}</div>`;
  if(!src) return `<div class="shot">${ph}</div>`;
  return `<a class="shot" href="${esc(full)}" target="_blank" rel="noopener" title="Open full image"><img loading="lazy" referrerpolicy="no-referrer" alt="${esc(label)} screenshot" src="${esc(src)}" onerror="this.outerHTML=this.parentNode.dataset.ph"></a>`.replace('class="shot"',`class="shot" data-ph="${esc(ph)}"`);
}

function card(g){
  const fl=safeUrl(g.figmaLink);
  return `<article class="card sev-${slug(g.severity)}">
  <div class="card-h"><h2><small>${esc(g.id)}</small>${esc(g.component||'—')}</h2>
   <div class="badges"><span class="badge b-${slug(g.severity)}">${esc(g.severity||'—')}</span><span class="badge b-${slug(g.status)}">${esc(g.status||'—')}</span><span class="badge b-${slug(g.theme)}">${esc(g.theme||'—')}</span></div></div>
  <div class="meta">${esc(g.screen||'—')} · Owner: ${esc(g.owner||'Unassigned')}</div>
  <div class="cmp">
   <div class="col"><h4>Figma (expected)</h4>${shot(g.figmaShot,'Figma')}<p>${esc(g.expected)}</p></div>
   <div class="col"><h4>Live (actual)</h4>${shot(g.liveShot,'Live')}<p>${esc(g.actual)}</p></div>
  </div>
  ${g.notes?`<div class="notes"><b>Notes:</b> ${esc(g.notes)}</div>`:''}
  <div class="links">${fl?`<a href="${esc(fl)}" target="_blank" rel="noopener">Open Figma frame ↗</a>`:''}<a href="${SHEET_URL}" target="_blank" rel="noopener">Comment / edit in sheet ↗</a></div>
 </article>`;
}

const SEV={High:0,Medium:1,Low:2}, ST={Open:0,'In Progress':1,Fixed:2,"Won't Fix":3};
function render(){
  const q=$('#q').value.trim().toLowerCase(), th=$('#fTheme').value, sv=$('#fSev').value, st=$('#fStatus').value, sc=$('#fScreen').value, so=$('#sort').value;
  let l=ALL.filter(g=>(!th||g.theme===th)&&(!sv||g.severity===sv)&&(!st||g.status===st)&&(!sc||g.screen===sc)&&(!q||Object.values(g).join(' ').toLowerCase().includes(q)));
  const cmp={sev:(a,b)=>(SEV[a.severity]??9)-(SEV[b.severity]??9)||(ST[a.status]??9)-(ST[b.status]??9),
    id:(a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}), status:(a,b)=>(ST[a.status]??9)-(ST[b.status]??9),
    screen:(a,b)=>a.screen.localeCompare(b.screen), owner:(a,b)=>a.owner.localeCompare(b.owner)}[so];
  l.sort((a,b)=>cmp(a,b)||a.id.localeCompare(b.id,undefined,{numeric:true}));
  summary(l);
  $('#count').textContent=`${l.length} of ${ALL.length} gaps`;
  $('#list').innerHTML=l.length?l.map(card).join(''):'<div class="empty">No gaps match the current filters.</div>';
}

function init(gaps){
  ALL=gaps;
  const screens=[...new Set(gaps.map(g=>g.screen).filter(Boolean))].sort();
  $('#fScreen').innerHTML='<option value="">All screens</option>'+screens.map(s=>`<option>${esc(s)}</option>`).join('');
  ['#q','#fTheme','#fSev','#fStatus','#fScreen','#sort'].forEach(s=>$(s).addEventListener('input',render));
  render();
}

function showError(detail){
  const e=$('#errorBox'); e.hidden=false;
  e.innerHTML=`<h3>Couldn’t load gap data from the Google Sheet</h3>
  This page reads the sheet directly from your browser, so it only works when:
  <ol><li>The Google Sheet is shared as <b>“Anyone with the link – Viewer”</b> and has a tab named <b>${esc(SHEET_TAB)}</b>.</li>
  <li>The Figma and Live screenshot Drive folders are shared as <b>“Anyone with the link – Viewer”</b> (otherwise images show placeholders).</li></ol>
  <p>Preview the layout with <a href="?demo=1">example data (?demo=1)</a>. <small>Details: ${esc(detail)}</small></p>`;
  $('#list').innerHTML=''; $('#summary').innerHTML='';
}

async function load(){
  if(isDemo){ $('#demoBanner').hidden=false; return init(toGaps(DEMO)); }
  try{
    const r=await fetch(CSV_URL,{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const txt=await r.text();
    if(/^\s*<(!doctype|html)/i.test(txt)) throw new Error('Received a Google sign-in page instead of CSV (sheet is private)');
    const gaps=toGaps(parseCSV(txt));
    if(!gaps.length) throw new Error('Sheet loaded but contains no gap rows');
    init(gaps);
  }catch(err){ showError(err.message||String(err)); }
}
load();
