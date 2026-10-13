// SVG builders. Inputs are numbers and fixed labels only, so string templates are safe here.
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const f=n=>Math.round(n*10)/10;
export function weightChart(weights,goal,now=Date.now(),days=90){
 const W=340,H=170,L=34,R=10,T=10,B=24,from=now-days*864e5;
 const pts=weights.map(w=>({x:new Date(w.date+'T12:00').getTime(),y:w.kg})).filter(p=>p.x>=from);
 if(!pts.length)return `<p class="muted chart-empty">Log your weight to see the trend.</p>`;
 const ys=[...pts.map(p=>p.y),...(goal===null?[]:[goal])],lo=Math.floor(Math.min(...ys)-1),hi=Math.ceil(Math.max(...ys)+1);
 const X=x=>L+(x-from)/(now-from)*(W-L-R),Y=y=>T+(hi-y)/(hi-lo)*(H-T-B);
 const line=pts.map((p,i)=>`${i?'L':'M'}${f(X(p.x))},${f(Y(p.y))}`).join('');
 const area=`${line}L${f(X(pts.at(-1).x))},${H-B}L${f(X(pts[0].x))},${H-B}Z`;
 const ticks=[lo,(lo+hi)/2,hi].map(v=>`<text x="${L-6}" y="${f(Y(v)+4)}" text-anchor="end">${f(v)}</text><line x1="${L}" x2="${W-R}" y1="${f(Y(v))}" y2="${f(Y(v))}" class="grid"/>`).join('');
 const months=[];for(let d=new Date(from);d.getTime()<=now;d.setDate(d.getDate()+1))if(d.getDate()===1)months.push(`<text x="${f(X(d.getTime()))}" y="${H-6}" text-anchor="middle">${MONTHS[d.getMonth()]}</text>`);
 const last=pts.at(-1);
 const goalLine=goal===null?'':`<line x1="${L}" x2="${W-R}" y1="${f(Y(goal))}" y2="${f(Y(goal))}" class="goal"/><text x="${W-R}" y="${f(Y(goal)-5)}" text-anchor="end" class="goal-label">${goal}</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Body weight over the last ${days} days, latest ${last.y} kg${goal===null?'':`, goal ${goal} kg`}"><defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lime)" stop-opacity=".35"/><stop offset="1" stop-color="var(--lime)" stop-opacity="0"/></linearGradient></defs>${ticks}${months.join('')}<path d="${area}" fill="url(#wg)"/><path d="${line}" class="line"/>${goalLine}<circle cx="${f(X(last.x))}" cy="${f(Y(last.y))}" r="4.5" class="dot"/></svg>`;
}
export function heatmapSvg(grid){
 const S=11,G=3,W=grid.length*(S+G)+12,top=14;
 const labels=grid.map((week,i)=>{const d=new Date(week[0].date+'T12:00');return d.getDate()<=7?`<text x="${i*(S+G)}" y="10">${MONTHS[d.getMonth()]}</text>`:'';}).join('');
 const cells=grid.map((week,i)=>week.map((c,j)=>`<rect x="${i*(S+G)}" y="${top+j*(S+G)}" width="${S}" height="${S}" rx="2.5" class="l${c.level}"><title>${c.date}: ${c.minutes} min</title></rect>`).join('')).join('');
 return `<svg viewBox="0 0 ${W} ${top+7*(S+G)}" class="heatmap" role="img" aria-label="Training time per day over the last ${grid.length} weeks">${labels}${cells}</svg>`;
}
// Front and back figures; regions carry data-group so shading follows set counts.
const FRONT=`<circle cx="50" cy="16" r="11"/><rect x="45" y="26" width="10" height="7" rx="3"/>
<path d="M27 36 Q50 30 73 36 L76 50 L72 92 L28 92 L24 50Z"/>
<path data-group="chest" d="M30 39 Q40 35 49 38 L49 54 Q39 58 30 52Z"/><path data-group="chest" d="M51 38 Q60 35 70 39 L70 52 Q61 58 51 54Z"/>
<path data-group="core" d="M38 58 H62 L60 90 H40Z"/><path data-group="core" d="M31 56 L37 58 L39 90 L31 88Z"/><path data-group="core" d="M69 56 L63 58 L61 90 L69 88Z"/>
<path data-group="arms" d="M24 38 L15 44 L9 80 L5 108 L12 109 L18 82 L27 52Z"/><path data-group="arms" d="M76 38 L85 44 L91 80 L95 108 L88 109 L82 82 L73 52Z"/><path data-group="shoulders" d="M27 35 Q16 35 14 46 L21 49 Q24 42 30 40Z"/><path data-group="shoulders" d="M73 35 Q84 35 86 46 L79 49 Q76 42 70 40Z"/>
<path data-group="legs" d="M30 94 H49 L47 140 H33Z"/><path data-group="legs" d="M51 94 H70 L67 140 H53Z"/>
<path data-group="legs" d="M33 144 H46 L44 182 H36Z"/><path data-group="legs" d="M54 144 H67 L64 182 H56Z"/>`;
const BACK=`<circle cx="50" cy="16" r="11"/><rect x="45" y="26" width="10" height="7" rx="3"/>
<path d="M27 36 Q50 30 73 36 L76 50 L72 92 L28 92 L24 50Z"/>
<path data-group="back" d="M31 39 Q50 33 69 39 L66 58 Q50 64 34 58Z"/>
<path data-group="core" d="M40 62 H60 L60 90 H40Z"/>
<path data-group="arms" d="M24 38 L15 44 L9 80 L5 108 L12 109 L18 82 L27 52Z"/><path data-group="arms" d="M76 38 L85 44 L91 80 L95 108 L88 109 L82 82 L73 52Z"/><path data-group="shoulders" d="M27 35 Q16 35 14 46 L21 49 Q24 42 30 40Z"/><path data-group="shoulders" d="M73 35 Q84 35 86 46 L79 49 Q76 42 70 40Z"/>
<path data-group="legs" d="M29 92 H49 V112 Q38 116 29 110Z"/><path data-group="legs" d="M51 92 H71 V110 Q62 116 51 112Z"/>
<path data-group="legs" d="M31 115 H48 L47 140 H33Z"/><path data-group="legs" d="M52 115 H69 L67 140 H53Z"/>
<path data-group="legs" d="M33 144 H46 L44 182 H36Z"/><path data-group="legs" d="M54 144 H67 L64 182 H56Z"/>`;
export function bodyFigure(sets){
 const max=Math.max(1,...Object.values(sets)),label=Object.entries(sets).map(([g,n])=>`${g} ${n} sets`).join(', ');
 const svg=body=>`<svg viewBox="0 0 100 190" class="body-svg" aria-hidden="true">${body.replace(/data-group="(\w+)"/g,(_,g)=>`data-group="${g}" style="--level:${f(sets[g]/max)}" class="${sets[g]?'worked':''}"`)}</svg>`;
 return `<div class="body-map" role="img" aria-label="Muscle balance: ${label}"><figure>${svg(FRONT)}<figcaption>Front</figcaption></figure><figure>${svg(BACK)}<figcaption>Back</figcaption></figure></div>`;
}
