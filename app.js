/* ===== Config ===== */
const SHEET_ID = '1taeplqlRJGmUUCkMzvc2wzhCvcmkzGnvjbLDrYxPFqg';
const SHEET_TAB = 'Gaps';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

/* Columns are mapped by HEADER NAME (case/spacing/bracket-insensitive), never by position.
   key -> accepted header aliases. Reordering or inserting columns in the sheet is safe. */
const COLUMNS = {
  id:['id'], date:['date reported','date'], reporter:['reported by','reporter'], journey:['journey'], screen:['screen'],
  issue:['issue'], platform:['platform'], suggestion:['suggested improvement','suggestion'], severity:['severity'],
  theme:['theme','mode'], mediaStatus:['media status','screenshot/video'], media:['media links','media','screenshots'],
  status:['status'], owner:['owner'], slack:['slack link','slack'], notes:['notes']
};
const OPTS = { platform:['Android','iOS','Both'], severity:['Critical','High','Medium','Low'], theme:['Light','Dark','Both'],
  mediaStatus:['Attached','Not required'], status:['Open','In Progress','Fixed',"Won't Fix"] };
const FILTERS = [['journey','fJourney','All journeys'],['screen','fScreen','All screens'],['platform','fPlatform','All platforms'],
  ['severity','fSev','All severities'],['theme','fTheme','All themes'],['status','fStatus','All statuses']];

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const safeUrl = u => /^https?:\/\//i.test(u||'') ? u : '';
const normHead = h => String(h||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/[^a-z0-9/]+/g,' ').trim();

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
const thumb = url => { const id=driveId(url); return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : safeUrl(url); };
function normalize(v, opts){ const t=String(v||'').trim().toLowerCase(); return opts.find(o=>o.toLowerCase()===t) || String(v||'').trim(); }
function normPlatform(v){ const t=String(v||'').trim().toLowerCase();
  if(/both|android.*(ios|apple)|(ios|apple).*android/.test(t)) return 'Both';
  if(/ios|apple|iphone/.test(t)) return 'iOS'; if(/android/.test(t)) return 'Android'; return String(v||'').trim(); }

/* Media Links: one per line (commas/whitespace also accepted). A line may carry a label, e.g. "video: <url>". */
function parseMedia(cell){
  return String(cell||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean).flatMap(line=>{
    const urls=line.match(/https?:\/\/[^\s,]+/g)||[];
    const lineVideo=/video/i.test(line.replace(/https?:\/\/\S+/g,''));
    return urls.map(url=>({url, video: lineVideo || /video/i.test(url) || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url) || (urls.length===1 && /\.(mp4|mov|m4v|webm)\b/i.test(line))}));
  });
}

function toGaps(rows){
  if(!rows.length) return [];
  const head=rows[0].map(normHead);
  const idx={}; for(const [k,al] of Object.entries(COLUMNS)) idx[k]=head.findIndex(h=>al.includes(h));
  if(idx.id<0 && idx.issue<0) throw new Error('Header row not recognised (expected columns such as "ID", "Issue")');
  return rows.slice(1).filter(r=>r.some(c=>String(c).trim())).map(r=>{
    const g={}; for(const k in COLUMNS) g[k]=idx[k]>=0?String(r[idx[k]]??'').trim():'';
    g.platform=normPlatform(g.platform);
    for(const k of ['severity','theme','mediaStatus','status']) g[k]=normalize(g[k],OPTS[k]);
    g.mediaList=parseMedia(g.media);
    return g;
  });
}

let ALL=[];

$('#sheetLink').href=SHEET_URL;

function summary(list){
  const c=(k,v)=>list.filter(g=>g[k]===v).length;
  const stats=[['Total',list.length,''],['Open',c('status','Open'),'open'],['In Progress',c('status','In Progress'),''],['Fixed',c('status','Fixed'),''],
    ['Critical',c('severity','Critical'),'crit'],['High',c('severity','High'),'high'],['Medium',c('severity','Medium'),'med'],['Low',c('severity','Low'),'low'],
    ['Android',c('platform','Android'),''],['iOS',c('platform','iOS'),''],['Both OS',c('platform','Both'),'']];
  $('#summary').innerHTML=stats.map(([l,n,cl])=>`<div class="stat ${cl}"><b>${n}</b><span>${l}</span></div>`).join('');
}

function linkTile(m, why){ return `<a class="tile link" href="${esc(m.url)}" target="_blank" rel="noopener"><i>🔗</i>${esc(why)}<br><small>Open in Drive ↗</small></a>`; }
function mediaTile(m){
  const url=safeUrl(m.url); if(!url) return '';
  if(m.video) return `<a class="tile video" href="${esc(url)}" target="_blank" rel="noopener" title="Play video in Drive"><i>▶</i>Video<br><small>Play in Drive ↗</small></a>`;
  const fb=linkTile(m,'Preview unavailable');
  return `<a class="tile img" href="${esc(url)}" target="_blank" rel="noopener" data-fb="${esc(fb)}" title="Open full image"><img loading="lazy" referrerpolicy="no-referrer" alt="Screenshot" src="${esc(thumb(url))}" onerror="this.parentNode.outerHTML=this.parentNode.dataset.fb"></a>`;
}
function gallery(g){
  if(g.mediaStatus==='Not required') return '';
  if(!g.mediaList.length) return g.mediaStatus==='Attached' ? '<div class="nomedia">Media marked “Attached” but no Media Links added yet.</div>' : '';
  return `<div class="gallery">${g.mediaList.map(mediaTile).join('')}</div>`;
}

function card(g){
  const sl=safeUrl(g.slack);
  return `<article class="card sev-${slug(g.severity)}">
  <div class="card-h"><h2><small>${esc(g.id)}</small>${esc(g.issue||'—')}</h2>
   <div class="badges"><span class="badge b-${slug(g.severity)}">${esc(g.severity||'—')}</span><span class="badge b-${slug(g.status)}">${esc(g.status||'—')}</span><span class="badge b-plat">${esc(g.platform||'—')}</span><span class="badge b-${slug(g.theme)}">${esc(g.theme||'—')}</span></div></div>
  <div class="meta">${esc(g.journey||'—')} › ${esc(g.screen||'—')} · Owner: ${esc(g.owner||'Unassigned')}${g.reporter?` · Reported by ${esc(g.reporter)}`:''}${g.date?` · ${esc(g.date)}`:''}</div>
  ${g.suggestion?`<p class="sugg"><b>Suggested improvement:</b> ${esc(g.suggestion)}</p>`:''}
  ${gallery(g)}
  ${g.notes?`<div class="notes"><b>Notes:</b> ${esc(g.notes)}</div>`:''}
  <div class="links">${sl?`<a href="${esc(sl)}" target="_blank" rel="noopener">View Slack message ↗</a>`:''}<a href="${SHEET_URL}" target="_blank" rel="noopener">Edit in sheet ↗</a></div>
 </article>`;
}

const SEV={Critical:0,High:1,Medium:2,Low:3}, ST={Open:0,'In Progress':1,Fixed:2,"Won't Fix":3};
function render(){
  const q=$('#q').value.trim().toLowerCase(), so=$('#sort').value, grp=$('#group').value;
  const f=Object.fromEntries(FILTERS.map(([k,id])=>[k,$('#'+id).value]));
  let l=ALL.filter(g=>FILTERS.every(([k])=>!f[k]||g[k]===f[k]) && (!q||Object.values(g).join(' ').toLowerCase().includes(q)));
  const cmp={sev:(a,b)=>(SEV[a.severity]??9)-(SEV[b.severity]??9)||(ST[a.status]??9)-(ST[b.status]??9),
    id:(a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}), status:(a,b)=>(ST[a.status]??9)-(ST[b.status]??9),
    date:(a,b)=>b.date.localeCompare(a.date), owner:(a,b)=>a.owner.localeCompare(b.owner)}[so];
  l.sort((a,b)=>cmp(a,b)||a.id.localeCompare(b.id,undefined,{numeric:true}));
  summary(l);
  $('#count').textContent=`${l.length} of ${ALL.length} issues`;
  if(!l.length){ $('#list').innerHTML=`<div class="empty">${ALL.length?'No issues match the current filters.':'No issues to show.'}</div>`; return; }
  if(!grp){ $('#list').innerHTML=l.map(card).join(''); return; }
  const groups=new Map(); l.forEach(g=>{ const k=g[grp]||'(none)'; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(g); });
  $('#list').innerHTML=[...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`<h3 class="grp">${esc(k)} <span>${v.length}</span></h3>${v.map(card).join('')}`).join('');
}

function init(gaps){
  ALL=gaps;
  FILTERS.forEach(([k,id,label])=>{
    const vals=[...new Set([...(OPTS[k]||[]).filter(o=>gaps.some(g=>g[k]===o)), ...gaps.map(g=>g[k]).filter(Boolean).sort()])];
    $('#'+id).innerHTML=`<option value="">${label}</option>`+vals.map(v=>`<option>${esc(v)}</option>`).join('');
  });
  ['#q','#sort','#group',...FILTERS.map(f=>'#'+f[1])].forEach(s=>$(s).addEventListener('input',render));
  render();
}

async function load(){
  try{
    const r=await fetch(CSV_URL,{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const txt=await r.text();
    if(/^\s*<(!doctype|html)/i.test(txt)) throw new Error('Received a Google sign-in page instead of CSV (sheet is private)');
    const gaps=toGaps(parseCSV(txt));
    init(gaps);
  }catch(err){ console.error('Failed to load gap data:', err); init([]); }
}
load();
