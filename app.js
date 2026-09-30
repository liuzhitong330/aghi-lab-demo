(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (v, n = 2) => v == null ? 'not estimable' : v.toLocaleString('en-US', {maximumFractionDigits:n, minimumFractionDigits:n});
  function svgNode(tag, attrs = {}, text = '') {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text) node.textContent = text;
    return node;
  }
  const label = (svg, x, y, text, attrs = {}) => svg.append(svgNode('text', {x, y, ...attrs}, text));
  function line(svg, x1, y1, x2, y2, cls) { svg.append(svgNode('line', {x1,y1,x2,y2,class:cls})); }
  function tableRows(tableId, rows) {
    const body = $(tableId).querySelector('tbody'); body.replaceChildren();
    rows.forEach(values => { const tr = document.createElement('tr'); values.forEach(value => {const td = document.createElement('td'); td.textContent = value; tr.append(td);}); body.append(tr); });
  }
  function options(id, rows, selected) {
    $(id).replaceChildren(...rows.map(([value, text]) => {const o = document.createElement('option');o.value=value;o.textContent=text;return o;}));
    $(id).value = selected;
  }
  const statusText = {
    observed:'numeric', deceased:'deceased', censor:'censor',
    previously_deceased_blank:'blank; earlier deceased', previously_censored_blank:'blank; earlier censor', missing_unspecified:'blank; unspecified'
  };
  const meaning = {'1':'endpoint', '0':'end of study', '0*':'non-tumor endpoint'};

  window.AghiData.then(([data, audit]) => {
    const groups = data.groups;
    const groupOptions = groups.map(g => [g.id, g.label]);
    options('bli-group', groupOptions, 'rli_tmz');
    options('survival-group', groupOptions, 'rli_tmz');
    options('bli-day', data.bli.times.map(t=>[String(t), `Day ${t}`]), '26');
    options('horizon', data.survival.horizons.map(t=>[String(t), `${t} days${t === 60 ? ' (default)' : ''}`]), '60');
    let reviewRows = [];

    function drawBli() {
      const group = $('bli-group').value, day = Number($('bli-day').value);
      const g = groups.find(g=>g.id===group);
      const series = data.bli.series.filter(s=>s.group===group);
      const summaries = data.bli.summaries.filter(s=>s.group===group);
      const selected = summaries.find(s=>s.time===day);
      const svg = $('hero-viz'); svg.replaceChildren();
      const values = data.bli.records.filter(r=>r.fold_from_day3 != null).map(r=>Math.log10(r.fold_from_day3));
      // Fixed across groups, so switching treatment never rescales the apparent effect.
      const lo = Math.floor(Math.min(0, ...values)), hi = Math.ceil(Math.max(0,...values));
      const x = t=>58+(t-3)/23*516, y = v=>260-(Math.log10(v)-lo)/(hi-lo)*228;
      label(svg,58,18, 'BLI / day-3 baseline (log scale)');
      for(let p=lo;p<=hi;p++) {line(svg,58,y(10**p),574,y(10**p),'grid');label(svg,48,y(10**p)+4,10**p<1?String(10**p):`${(10**p).toLocaleString()}×`,{'text-anchor':'end'});}
      line(svg,58,32,58,260,'axis'); line(svg,58,260,574,260,'axis');
      data.bli.times.forEach(t=>{label(svg,x(t),282,String(t),{'text-anchor':'middle'});const s=summaries.find(s=>s.time===t);label(svg,x(t),300,`n=${s.observed_n}`,{'text-anchor':'middle'});});
      label(svg,316,318,'Days after implantation · observed denominator below',{'text-anchor':'middle'});
      line(svg,x(day),32,x(day),260,'axis');
      for(const s of series) {
        let path='', active=false;
        for(const r of s.observations) {
          if(r.fold_from_day3 == null) {active=false;continue;}
          path += `${active?'L':'M'}${x(r.time)},${y(r.fold_from_day3)} `; active=true;
          const point=svgNode('circle',{cx:x(r.time),cy:y(r.fold_from_day3),r:r.time===day?3.5:2,fill:'#888'});
          point.append(svgNode('title',{},`${r.source_cell}: day ${r.time}, ${fmt(r.fold_from_day3)}×, ${r.radiance} ph/sec/ROI`));svg.append(point);
        }
        svg.append(svgNode('path',{d:path,class:'individual'}));
      }
      let path='',active=false;
      for(const s of summaries) {if(s.median_fold == null){active=false;continue;}path+=`${active?'L':'M'}${x(s.time)},${y(s.median_fold)} `;active=true;}
      svg.append(svgNode('path',{d:path,class:'main-line'}));
      if(selected.median_fold != null) svg.append(svgNode('circle',{cx:x(day),cy:y(selected.median_fold),r:5,fill:'#1f7a8c'}));
      $('metric-one').textContent=`${selected.observed_n} / ${selected.baseline_n}`;
      $('metric-two').textContent=selected.median_fold == null?'not estimable':`${fmt(selected.median_fold)}×`;
      $('metric-three').textContent=selected.missing_n;
      const missing=Object.entries(selected.missing_status_counts).map(([k,n])=>`${n} ${statusText[k]}`).join('; ');
      $('bli-readout').textContent = `${g.label}, day ${day}: ${selected.observed_n} of ${selected.baseline_n} baseline series have measurements. `+
        (selected.missing_n ? `Review ${selected.missing_n} unobserved records (${missing}). The median describes only the observed subset; reconcile these records before claiming a cohort-wide response.` : `No series is missing at this time point. Preserve the full denominator and still check acquisition/ROI consistency before interpreting the signal.`)+
        ` Day ${data.bli.qc.last_common_complete_day} is the last sampled day with complete observations in all four groups.`;
      svg.setAttribute('aria-label',`${g.label} BLI trajectories: day ${day}, ${selected.observed_n}/${selected.baseline_n} observed, median ${fmt(selected.median_fold)} fold. Fixed logarithmic axis across groups.`);
      reviewRows=series.map(s=>s.observations.find(r=>r.time===day));
      tableRows('bli-table', reviewRows.map(r=>[r.source_cell, r.radiance == null?'—':r.radiance.toExponential(3), r.fold_from_day3 == null?'—':fmt(r.fold_from_day3),statusText[r.status]]));
    }

    function drawEndpoint() {
      const group=$('survival-group').value, tau=Number($('horizon').value), mode=$('endpoint-mode').value;
      const alternative=mode==='paper_compatible'?'composite_endpoint':'paper_compatible';
      const records=data.survival.records.filter(r=>r.group===group);
      const current=data.survival.modes[mode].rmst.find(r=>r.group===group&&r.horizon===tau);
      const other=data.survival.modes[alternative].rmst.find(r=>r.group===group&&r.horizon===tau);
      const svg=$('endpoint-viz');svg.replaceChildren();
      const x=t=>58+t/tau*516,y=s=>255-s*218;
      label(svg,58,18,'Estimated fraction without selected endpoint');
      [0,.25,.5,.75,1].forEach(s=>{line(svg,58,y(s),574,y(s),'grid');label(svg,48,y(s)+4,`${s*100}%`,{'text-anchor':'end'});});
      line(svg,58,37,58,255,'axis');line(svg,58,255,574,255,'axis');
      [0,.25,.5,.75,1].forEach(f=>{const t=tau*f;label(svg,x(t),278,fmt(t,t%1?1:0),{'text-anchor':'middle'});const n=records.filter(r=>r.time>=t).length;label(svg,x(t),296,`n=${n}`,{'text-anchor':'middle'});});
      label(svg,316,315,'Days after implantation · risk set before time below',{'text-anchor':'middle'});
      for(const m of [alternative,mode]) {
        const points=data.survival.modes[m].curves[group];
        let path=`M${x(0)},${y(1)}`,s=1;
        for(const p of points.slice(1)) { if(p.time>tau)break;path+=`H${x(p.time)}V${y(p.survival)}`;s=p.survival; }
        const last=points.at(-1); const end=last.survival===0?tau:Math.min(tau,last.time);
        path+=`H${x(end)}`;
        svg.append(svgNode('path',{d:path,class:m===mode?'main-line':'alternative'}));
        if(m===mode) for(const p of points.filter(p=>p.time<=tau&&p.censored>0)) {
          const mark=svgNode('path',{d:`M${x(p.time)-4},${y(p.survival)}h8M${x(p.time)},${y(p.survival)-4}v8`,stroke:'#1f7a8c','stroke-width':1.8});
          mark.append(svgNode('title',{},`Day ${p.time}: ${p.censored} censored; risk set ${p.at_risk}; ${p.events} events`));svg.append(mark);
        }
      }
      const nonTumor=records.filter(r=>r.source_code==='0*').length;
      const within=records.filter(r=>r.source_code==='0*'&&r.time<=tau).length;
      const action=within ? `Keep non-tumor endpoints visible and prespecify both tumor-directed and tolerability outcomes for the next cohort.` : `The definitions have not diverged by this horizon; retain endpoint reasons so later follow-up remains interpretable.`;
      const short=mode==='paper_compatible'?'Paper-compatible':'Composite';
      $('endpoint-readout').textContent=`${short} restricted mean event-free time to day ${tau}: ${fmt(current.rmst_days)} days; alternative: ${fmt(other.rmst_days)} days. ${nonTumor}/${records.length} records have non-tumor endpoints (${within} by this horizon). ${current.at_risk_before_horizon} animals remain in the risk set immediately before day ${tau}. ${action} `+
        `Leave-one-record-out range: ${fmt(current.loo_min_days)}–${fmt(current.loo_max_days)} days (${current.loo_supported}/${current.loo_total} deletions estimable; influence check, not a confidence interval).`;
      svg.setAttribute('aria-label',`${short} versus alternative for ${groups.find(g=>g.id===group).label}; horizon ${tau} days; restricted means ${fmt(current.rmst_days)} and ${fmt(other.rmst_days)} days.`);
      tableRows('endpoint-summary',groups.map(g=>{const p=data.survival.modes.paper_compatible.rmst.find(r=>r.group===g.id&&r.horizon===tau).rmst_days;const c=data.survival.modes.composite_endpoint.rmst.find(r=>r.group===g.id&&r.horizon===tau).rmst_days;return[g.label,fmt(p),fmt(c),p==null||c==null?'—':fmt(p-c)];}));
      tableRows('endpoint-records',records.map(r=>[`${r.time_cell} / ${r.status_cell}`,r.time,r.source_code,meaning[r.source_code]]));
    }
    ['bli-group','bli-day'].forEach(id=>$(id).addEventListener('change',drawBli));
    ['survival-group','horizon','endpoint-mode'].forEach(id=>$(id).addEventListener('change',drawEndpoint));
    $('export-review').addEventListener('click',()=>{
      const fields=['series_id','group','time','source_sheet','source_cell','raw_value','status','radiance','baseline_radiance','fold_from_day3'];
      const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
      const csv=[fields.map(quote).join(','),...reviewRows.map(r=>fields.map(k=>quote(r[k])).join(','))].join('\r\n');
      const url=URL.createObjectURL(new Blob([csv+'\r\n'],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`aghi-${$('bli-group').value}-day-${$('bli-day').value}-review.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    const checks = audit.findings;
    $('caf-audit').replaceChildren();
    const intro=document.createElement('p');
    intro.textContent=`${checks.length} checks derived from ${audit.reviewed_files.length} reviewed files at commit ${audit.commit.slice(0,7)}. The parsed split uses ${audit.split.train_fraction*100}% of feature rows for training, stratified by class, without a group argument.`;
    $('caf-audit').append(intro);
    for(const id of ['split_unit','pairing','complete_case']) {
      const finding=checks.find(f=>f.id===id), p=document.createElement('p'), a=document.createElement('a');
      p.textContent=finding.next_action+' ';a.href=finding.evidence[0];a.textContent='Source code';p.append(a);$('caf-audit').append(p);
    }
    drawBli();drawEndpoint();
  }).catch(error=>{
    console.error(error);
    ['bli-readout','endpoint-readout'].forEach(id=>$(id).textContent='The data could not be loaded. Please reload this public page; no values have been substituted.');
  });
})();
