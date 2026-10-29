/* TraceStep interface. Original code; MIT. */
(() => {
  'use strict';
  const E = window.TraceEngine;
  const $ = id => document.getElementById(id);
  const dateLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  let project = { format: 'tracestep', version: 1, referenceDate: dateLocal(), sources: [], actions: [] };
  let selectedSource = '', currentFilter = 'all', nextId = 0, editingId = '', toastTimer;
  const exampleSources = [
    { title: 'Launch sync', date: '2026-10-29', text: '# Product launch — Thursday sync\nDecision: Ship the small pilot before adding a dashboard.\nAction: Review the launch checklist | Owner: Maya | Due: 2026-10-30\nLeo will send the pilot invitation tomorrow.\nTask: Publish the onboarding guide | Owner: Jo | Due: 2026-10-31\nContext: Five volunteers have offered to try the pilot.\nAction: Confirm the accessibility test owner by Friday.\n[x] Archive the old planning board.' },
    { title: 'Pilot feedback', date: '2026-10-29', text: '# Synthetic pilot feedback\nNote: Two volunteers could not find the help link.\nAction: Add a visible help link | Owner: Sam | Due: 2026-10-30 | Priority: high\nTask: Verify keyboard navigation; blocked by the missing staging build.\nIdea: Consider a new analytics dashboard later.\nAction: Review the launch checklist | Owner: Maya | Due: 2026-10-30' },
    { title: 'Team follow-up', date: '2026-10-29', text: '# Synthetic follow-up notes\n@Maya prepare three questions for the pilot debrief by 2026-11-02.\nDecision: Keep analytics out of this pilot.\nTask: Schedule the debrief with volunteers.\nDone: Share the meeting agenda.\nDo not publish volunteer contact details.' }
  ];
  const el = (tag, cls, text) => { const node = document.createElement(tag); if(cls) node.className=cls; if(text !== undefined) node.textContent=text; return node; };
  const toast = message => { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').hidden=false; toastTimer=setTimeout(()=>{$('toast').hidden=true;},4500); };
  function source() { return project.sources.find(s=>s.id===selectedSource); }
  function saveEditor() { const s=source(); if(!s)return; s.title=$('source-title').value.trim() || 'Untitled source'; s.text=$('source-text').value; s.date=$('source-date').value; }
  function addSource(title='Untitled source', text='', date='') {
    if(project.sources.length>=20) { toast('Limit: 20 sources per workspace.'); return; }
    saveEditor(); const s={id:'source-'+Date.now()+'-'+(++nextId),title,text,date}; project.sources.push(s); selectedSource=s.id; renderSources(); return s;
  }
  function renderSources() {
    $('source-tabs').replaceChildren();
    project.sources.forEach((s,i)=>{const b=el('button','source-tab'+(s.id===selectedSource?' selected':''),`${String(i+1).padStart(2,'0')} ${s.title}`);b.title=s.title;b.setAttribute('aria-pressed',String(s.id===selectedSource));b.onclick=()=>{saveEditor();selectedSource=s.id;renderSources();};$('source-tabs').append(b);});
    const s=source(); $('source-title').value=s?.title||''; $('source-text').value=s?.text||''; $('source-date').value=s?.date||'';
    $('source-count').textContent=`${project.sources.length} source${project.sources.length===1?'':'s'}`;
    $('remove-source').disabled=project.sources.length<2 || project.actions.length>0;
    $('remove-source').title=project.actions.length?'Start a new extraction before removing sources to preserve evidence.':'';
    ['source-title','source-text'].forEach(id=>{$(id).readOnly=project.actions.length>0;});
    $('source-date').disabled=project.actions.length>0;
    $('char-count').textContent=project.actions.length?'Sources locked to preserve evidence. Replace plan to edit.':`${(s?.text.length||0).toLocaleString()} characters`;
  }
  function renderPlan() {
    const active=project.actions.filter(a=>a.status!=='dismissed');
    $('stat-actions').textContent=active.length;
    $('stat-ready').textContent=active.filter(a=>a.status==='accepted').length;
    $('stat-review').textContent=active.filter(a=>a.status!=='done'&&E.gaps(a).length>0).length;
    $('stat-evidence').textContent=active.reduce((n,a)=>n+a.evidence.length,0);
    $('export-md').disabled=!project.actions.length;
    const next=E.nextStep(project.actions,project.referenceDate);
    $('next-heading').textContent=next.label;
    $('next-title').textContent=next.action?next.action.title:'Bring a few notes. Leave with a plan you can explain.';
    $('next-explanation').textContent=next.explanation;
    $('next-meta').replaceChildren();
    if(next.action)$('next-meta').append(el('div','next-meta',`${next.action.owner||'Owner to confirm'} · ${next.action.due||'Date to confirm'}${next.action.blocked?' · Blocked':''}`));
    $('next-open').hidden=!next.action;
    $('next-open').textContent=next.kind==='ready'?'Open confirmed step →':'Review this step →';
    $('next-open').onclick=()=>{if(next.action)openDetail(next.action.id);};
    const filtered=project.actions.filter(a=>currentFilter==='all'?a.status!=='dismissed':currentFilter==='review'?a.status!=='done'&&a.status!=='dismissed'&&(a.status==='suggested'||E.gaps(a).length>0):a.status===currentFilter);
    $('actions').replaceChildren();
    if(!filtered.length){const box=el('div','empty');box.append(el('div','empty-symbol','≋'),el('h3','',project.actions.length?'Nothing in this view.':'Your notes have a next chapter.'),el('p','',project.actions.length?'Choose another filter to see the rest of your plan.':'Add a source on the left, or try the example. We’ll surface explicit action candidates and their evidence.'));$('actions').append(box);}
    filtered.forEach(a=>{
      const card=el('article','action-card '+a.status); card.dataset.id=a.id;
      const top=el('div','action-card-top'),titleGroup=el('div','title-group');
      titleGroup.append(el('span','action-number',a.id.replace('action-','').padStart(2,'0')),el('h3','action-title',a.title));
      top.append(titleGroup,el('span','status-badge '+a.status,a.status==='accepted'?'Confirmed':a.status[0].toUpperCase()+a.status.slice(1)));
      const meta=el('div','action-meta');meta.append(el('span','',a.owner||'Unassigned'),el('span','',a.due?'Due '+a.due:'No confirmed date'));if(a.priority==='high')meta.append(el('span','','↑ High priority'));
      card.append(top,meta);
      if(a.status!=='done'){const tags=el('div','gap-tags');E.gaps(a).forEach(g=>tags.append(el('span','gap'+(g==='Blocked'?' blocked':''),g)));card.append(tags);}
      const bottom=el('div','action-bottom');const evidence=el('button','source-button',`↳ ${a.evidence[0].sourceTitle} · L${a.evidence[0].line}${a.evidence.length>1?' +'+(a.evidence.length-1)+' source':''}`); evidence.onclick=()=>openDetail(a.id);
      const review=el('button','review-button',a.status==='suggested'?'Review →':'Edit →');review.setAttribute('aria-label',`Review ${a.title}`);review.onclick=()=>openDetail(a.id);bottom.append(evidence,review);card.append(bottom);$('actions').append(card);
    });
    document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===currentFilter;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
  }
  function extract() {
    saveEditor();
    const charTotal=project.sources.reduce((n,s)=>n+s.text.length,0);
    if(charTotal>300000){toast('Please keep the workspace below 300,000 characters.');return;}
    if(!project.sources.some(s=>s.text.trim())){toast('Add some notes first, or try the example.');return;}
    let result;try{result=E.extract(project.sources);}catch(err){toast(err.message);return;} project.actions=result.actions;currentFilter='all';renderSources();renderPlan();
    toast(`${result.actions.length} candidates found with ${result.stats.evidenceLinks} source links. Review before acting.`);
  }
  function requestExtract() {
    if(project.actions.length){$('rebuild-confirm').hidden=false;return;} extract();
  }
  function makeField(label,id,value,type='text') {const wrap=el('div');const l=el('label','',label);l.htmlFor=id;const input=el(type==='textarea'?'textarea':'input');input.id=id;if(type!=='textarea')input.type=type;input.value=value;wrap.append(l,input);return wrap;}
  function openDetail(id) {
    editingId=id;const a=project.actions.find(a=>a.id===id);if(!a)return;
    $('detail-content').replaceChildren();const form=el('div','detail-form');
    form.append(makeField('Action','edit-title',a.title,'textarea'));
    const grid=el('div','detail-grid');const owner=makeField('Owner','edit-owner',a.owner);owner.querySelector('input').maxLength=160;grid.append(owner);
    const due=makeField('Due date','edit-due',a.due,'date');due.append(el('small','',a.dueNote+(a.dueRaw?` (${a.dueRaw})`:'')));grid.append(due);form.append(grid);
    const pl=el('label','','Priority');pl.htmlFor='edit-priority';const ps=el('select');ps.id='edit-priority';[['normal','Normal'],['high','High']].forEach(([v,t])=>{const o=el('option','',t);o.value=v;ps.append(o);});ps.value=a.priority;form.append(pl,ps);
    const bl=el('label','checkbox-label');const cb=el('input');cb.type='checkbox';cb.id='edit-blocked';cb.checked=a.blocked;bl.append(cb,document.createTextNode('This action is blocked or waiting on something'));form.append(bl);
    const status=el('p','fineprint',`Current status: ${a.status==='accepted'?'confirmed':a.status}. Confirming records your review; missing fields remain visible.`);form.append(status);
    const buttons=el('div','detail-buttons');[['Save edits','secondary',a.status],['Confirm step','primary','accepted'],['Mark done','secondary','done'],[a.status==='dismissed'?'Restore suggestion':'Dismiss','secondary',a.status==='dismissed'?'suggested':'dismissed']].forEach(([t,c,s])=>{const b=el('button',c,t);b.onclick=()=>saveDetail(s);buttons.append(b);});form.append(buttons);$('detail-content').append(form);
    const ev=el('section','evidence-section');ev.append(el('h3','','Evidence, not a guess'),el('p','',`Detected because: ${a.reasons.join('; ') || 'explicit action'}. Original source text stays unchanged when you edit the action.`));
    a.evidence.forEach(e=>{const box=el('div','evidence');box.append(el('strong','',`${e.sourceTitle} · line ${e.line}${e.date?' · '+e.date:''}`),el('blockquote','',e.quote));const s=project.sources.find(s=>s.id===e.sourceId);if(s){const details=el('details');details.append(el('summary','','Show surrounding context'));s.text.split(/\r?\n/).forEach((line,i)=>{if(Math.abs(i+1-e.line)<=2){const row=el('div','source-line'+(i+1===e.line?' selected':''));row.append(el('span','line-no',String(i+1)),el('span','',line||' '));details.append(row);}});box.append(details);}ev.append(box);});$('detail-content').append(ev);
    if(!$('detail-dialog').open)$('detail-dialog').showModal();
  }
  function saveDetail(status) {
    const a=project.actions.find(a=>a.id===editingId);if(!a)return;
    const title=$('edit-title').value.trim();if(!title){toast('Please give the action a title.');$('edit-title').focus();return;}
    a.title=title;a.owner=$('edit-owner').value.trim();a.due=$('edit-due').value;a.priority=$('edit-priority').value;a.blocked=$('edit-blocked').checked;a.status=status;
    $('detail-dialog').close();renderPlan();toast(status==='accepted'?'Step confirmed. Its evidence is preserved.':'Action updated.');
  }
  function download(filename,content,type) {const url=URL.createObjectURL(new Blob([content],{type}));const a=el('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  $('source-text').addEventListener('input',()=>{$('char-count').textContent=`${$('source-text').value.length.toLocaleString()} characters`;});
  $('source-title').addEventListener('change',()=>{saveEditor();renderSources();});
  $('add-source').onclick=()=>{if(project.actions.length){toast('Save your workspace, then replace the plan to add or edit sources.');$('rebuild-confirm').hidden=false;return;}addSource();$('source-title').focus();};
  $('remove-source').onclick=()=>{if(project.sources.length<2||project.actions.length)return;project.sources=project.sources.filter(s=>s.id!==selectedSource);selectedSource=project.sources[0].id;renderSources();};
  $('extract').onclick=requestExtract;
  $('confirm-rebuild').onclick=()=>{project.actions=[];$('rebuild-confirm').hidden=true;renderSources();renderPlan();toast('Plan cleared. Edit your sources, then find next steps again.');};
  $('cancel-rebuild').onclick=()=>{$('rebuild-confirm').hidden=true;};
  $('reference-date').value=project.referenceDate;$('reference-date').onchange=()=>{project.referenceDate=$('reference-date').value;renderPlan();};
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{currentFilter=b.dataset.filter;renderPlan();});
  $('close-detail').onclick=()=>$('detail-dialog').close();
  $('export-md').onclick=()=>{download('tracestep-plan.md',E.toMarkdown(project),'text/markdown;charset=utf-8');toast('Markdown plan exported, including source quotes.');};
  $('save-workspace').onclick=()=>{saveEditor();download('tracestep-workspace.json',JSON.stringify(project,null,2),'application/json');toast('Workspace saved as a local file. It includes all source notes.');};
  $('open-workspace').onclick=()=>{if(project.actions.length||project.sources.some(s=>s.text.trim())||$('source-text').value.trim()){toast('Save your current workspace first. Opening a file will replace this tab’s workspace.');} $('workspace-file').click();};
  $('workspace-file').onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>3*1024*1024)throw new Error('Workspace file must be under 3 MB.');const parsed=E.validateProject(JSON.parse(await file.text()));project=parsed;selectedSource=project.sources[0]?.id||'';if(!project.sources.length)addSource();$('reference-date').value=project.referenceDate;currentFilter='all';$('rebuild-confirm').hidden=true;renderSources();renderPlan();toast('Workspace opened. Source evidence checked.');}catch(err){toast('Could not open workspace: '+err.message);}finally{e.target.value='';}
  };
  $('import-text').onclick=()=>{if(project.actions.length){toast('Replace the plan before adding new sources.');$('rebuild-confirm').hidden=false;return;}$('text-file').click();};
  $('text-file').onchange=async e=>{const files=[...e.target.files];try{for(const file of files){if(!/\.(txt|md)$/i.test(file.name)){toast('Only .txt and .md sources are supported.');continue;}if(file.size>400000){toast(`${file.name}: limit is 400 KB per file.`);continue;}const text=await file.text();if(text.length>100000){toast(`${file.name}: limit is 100,000 characters per source.`);continue;}if(project.sources.reduce((n,s)=>n+s.text.length,0)+text.length>300000){toast('Workspace limit is 300,000 characters.');break;}addSource(file.name.slice(0,160),text);}}catch(err){toast('Import failed: '+err.message);}finally{e.target.value='';}};
  $('load-demo').onclick=()=>{
    saveEditor();if(project.actions.length||project.sources.some(s=>s.text.trim())){toast('Save your work first. Clear the current notes to load the example.');return;}
    project.sources=[];project.actions=[];selectedSource='';exampleSources.forEach(s=>addSource(s.title,s.text,s.date));selectedSource=project.sources[0].id;project.referenceDate='2026-10-29';$('reference-date').value=project.referenceDate;renderSources();extract();toast('Synthetic example loaded: 3 sources. Review a step to see its evidence.');
  };
  addSource('Meeting notes');renderPlan();
})();
