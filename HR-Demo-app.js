// ---- Embedded sample HR knowledge base (from data/sample_kb/*.md) ----
const KB = [
  {doc:"company_hr_handbook.md", title:"Annual Leave", text:"Full-time employees receive 20 days of paid annual leave per calendar year. Leave requests should normally be submitted through the HR portal at least 5 working days before the planned leave date. Manager approval is required. Unused leave may be carried forward up to 5 days into the next calendar year and must be used by March 31 unless HR grants an exception."},
  {doc:"company_hr_handbook.md", title:"Sick Leave", text:"Employees may take up to 10 paid sick days per calendar year. For absences longer than 2 consecutive working days, HR may request appropriate medical documentation. Employees should notify their manager as early as possible on the first day of absence."},
  {doc:"company_hr_handbook.md", title:"Remote Work Policy", text:"Eligible employees may work remotely up to 2 days per week with manager approval. Employees must remain reachable during agreed working hours, use company-approved collaboration tools, and protect confidential information. Remote work is not a substitute for dependent-care arrangements during working hours."},
  {doc:"company_hr_handbook.md", title:"Working Hours and Attendance", text:"Standard working hours are 9:00 AM to 6:00 PM, Monday through Friday, with a 1-hour meal break. Teams may use approved flexible schedules if business coverage is maintained. Repeated unapproved absence or lateness should be discussed with the manager and may be escalated to HR."},
  {doc:"company_hr_handbook.md", title:"Payroll", text:"Monthly salary is normally paid on the final business day of each month. Employees should review their payslip in the HR portal. Payroll discrepancies should be reported to Payroll Support within 5 business days of receiving the payslip."},
  {doc:"company_hr_handbook.md", title:"Benefits", text:"Eligible full-time employees receive the company medical plan, life insurance coverage, and access to the employee assistance program. Enrollment changes outside the annual enrollment window require a qualifying life event and supporting documentation."},
  {doc:"company_hr_handbook.md", title:"Code of Conduct", text:"Employees are expected to maintain a respectful, professional, and harassment-free workplace. Discrimination, retaliation, bullying, or harassment should be reported to a manager, HR, or the confidential ethics channel. Retaliation against employees who raise concerns in good faith is prohibited."},
  {doc:"hr_operations_runbook.md", title:"New Employee Onboarding", text:"HR should confirm the signed offer, identity and payroll documentation, manager assignment, start date, and required policy acknowledgements before the employee begins. On the first day, provide access to the HR portal, benefits information, mandatory training, and the employee handbook."},
  {doc:"hr_operations_runbook.md", title:"Leave Request Support", text:"If an employee cannot submit leave through the HR portal, first verify that the employee has an active profile and sufficient leave balance. If the portal is unavailable, record the request by email and ask the manager to confirm approval. HR should update the HR system after service is restored."},
  {doc:"hr_operations_runbook.md", title:"Payroll Issue Priority", text:"P1: multiple employees are missing salary or there is a major payroll processing failure. P2: an individual employee has not received salary. P3: incorrect allowance, deduction, tax, or benefits line item. P4: general payslip or payroll information request."},
  {doc:"hr_operations_runbook.md", title:"Employee Record Changes", text:"Changes to legal name, bank details, emergency contact, or home address must be submitted through the HR portal with required supporting documents where applicable. Bank-detail changes should be verified before the next payroll cutoff."},
  {doc:"hr_operations_runbook.md", title:"Offboarding", text:"For a planned departure, HR should confirm the final working day, manager handover, return of company assets, benefit termination timing, final payroll inputs, and required exit documentation. Access-removal requests should be coordinated with IT and the manager according to the employee's final working day."},
];

const STOPWORDS = new Set(["the","a","an","is","are","of","to","for","in","on","and","or","what","how","many","do","does","did","we","our","i","my","please","tell","me","about","can","you"]);

function tokenize(s){
  return s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w && !STOPWORDS.has(w));
}

function scoreDoc(qTokens, doc){
  const dTokens = tokenize(doc.title + " " + doc.text);
  const dSet = new Set(dTokens);
  let hits = 0;
  qTokens.forEach(t=>{ if(dSet.has(t)) hits++; });
  return hits / Math.max(3, qTokens.length);
}

function retrieve(question){
  const qTokens = tokenize(question);
  const scored = KB.map(d=>({...d, score: scoreDoc(qTokens, d)}));
  scored.sort((a,b)=>b.score-a.score);
  return scored;
}

function isGreeting(q){
  return /^(hi|hello|hey|thanks|thank you|good (morning|afternoon|evening))\b/i.test(q.trim());
}

// crude signal that a question is asking about something external/current (not in a small internal handbook)
function looksExternal(q){
  return /(latest|current|public holiday|government|law|regulation|news|today|this year|2025|2026)/i.test(q);
}

const chat = document.getElementById('chat');
const form = document.getElementById('chatForm');
const question = document.getElementById('question');
const trace = document.getElementById('trace');
const sourceUsed = document.getElementById('sourceUsed');
const flowSteps = document.querySelectorAll('.flow-step');

function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function formatText(s=''){return escapeHtml(s).replace(/\n/g,'<br>');}

function addMessage(role, text, source='', citations=[]){
  const wrap=document.createElement('div'); wrap.className=`message ${role}`;
  const citeHtml=citations.length?`<div class="citations"><strong>Sources</strong><br>${citations.map(c=>escapeHtml(c)).join('<br>')}</div>`:'';
  wrap.innerHTML=`<div class="avatar">${role==='user'?'':'HR'}</div><div class="bubble">${formatText(text)}${source?`<div class="answer-source">Source: ${escapeHtml(source)}</div>`:''}${citeHtml}</div>`;
  chat.appendChild(wrap); chat.scrollTop=chat.scrollHeight;
}

function renderTrace(items){
  trace.innerHTML = items.length ? items.map(x=>`<div class="trace-item">${escapeHtml(x)}</div>`).join('') : '<div class="empty">No trace.</div>';
}

function highlightStep(n){
  flowSteps.forEach(el=>el.classList.toggle('active', Number(el.dataset.step) <= n));
}

function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function askAgent(q){
  addMessage('user', q);
  question.value = '';
  const btn = form.querySelector('button');
  btn.disabled = true;
  sourceUsed.textContent = 'Running…';
  let traceLines = [];
  renderTrace(['Running LangGraph workflow...']);
  highlightStep(0);

  await wait(350);

  if (isGreeting(q)) {
    traceLines.push('1. Routed as: direct (greeting / casual chat)');
    highlightStep(1); renderTrace(traceLines);
    await wait(400);
    addMessage('assistant', "Hello! Ask me anything about company HR policy — leave, payroll, remote work, onboarding, benefits and more.", 'Direct response');
    sourceUsed.textContent = 'Direct (no KB lookup)';
    btn.disabled = false;
    return;
  }

  traceLines.push('1. Routed as: HR / policy question');
  highlightStep(1); renderTrace([...traceLines]);
  await wait(350);

  const results = retrieve(q);
  const top = results[0];
  traceLines.push(`2. Retrieved ${results.filter(r=>r.score>0).length} candidate chunk(s) from private KB (Pinecone)`);
  highlightStep(2); renderTrace([...traceLines]);
  await wait(400);

  const sufficient = top && top.score >= 0.34 && !looksExternal(q);
  traceLines.push(`3. Evidence grade: ${sufficient ? 'Sufficient' : 'Weak'} (top match "${top.title}", score ${(top.score).toFixed(2)})`);
  highlightStep(3); renderTrace([...traceLines]);
  await wait(400);

  if (sufficient) {
    traceLines.push('4. Web fallback: not needed');
    highlightStep(4); renderTrace([...traceLines]);
    await wait(300);
    traceLines.push('5. Query rewrite: skipped (private evidence was strong)');
    highlightStep(5); renderTrace([...traceLines]);
    await wait(300);
    traceLines.push('6. Answer grounded in private HR knowledge base');
    highlightStep(6); renderTrace([...traceLines]);
    await wait(300);
    addMessage('assistant', top.text, 'Private HR Knowledge Base (Pinecone)', [`${top.doc} — "${top.title}"`]);
    sourceUsed.textContent = 'Private KB';
  } else {
    traceLines.push('4. Web fallback: triggered (private evidence weak or question needs current external info)');
    highlightStep(4); renderTrace([...traceLines]);
    await wait(450);
    traceLines.push('5. Rewriting query for web search and retrying...');
    highlightStep(5); renderTrace([...traceLines]);
    await wait(450);
    traceLines.push('6. Answer generated from external search — flagged for HR validation');
    highlightStep(6); renderTrace([...traceLines]);
    await wait(300);
    const closest = top && top.score > 0 ? ` The closest internal reference is "${top.title}", but it does not fully answer this.` : '';
    addMessage(
      'assistant',
      `This looks like it needs current external information rather than internal company policy.${closest}\n\nIn the production build, this step calls Tavily web search and asks the LLM to answer only from that fresh evidence — flagged below as external so HR can validate it before it's treated as official guidance.`,
      'External / Web search (needs HR validation)',
      []
    );
    sourceUsed.textContent = 'External (unverified)';
  }
  btn.disabled = false;
}

form.addEventListener('submit', e=>{ e.preventDefault(); const q=question.value.trim(); if(q) askAgent(q); });
document.querySelectorAll('.example').forEach(b=>b.addEventListener('click', ()=>askAgent(b.textContent.trim())));

const modal = document.getElementById('uploadModal');
document.getElementById('openUpload').onclick = ()=>modal.classList.remove('hidden');
document.getElementById('closeUpload').onclick = ()=>modal.classList.add('hidden');
document.getElementById('uploadBtn').onclick = async ()=>{
  const file = document.getElementById('fileInput').files[0];
  const status = document.getElementById('uploadStatus');
  if(!file){ status.textContent = 'Choose a file first.'; return; }
  status.textContent = 'Indexing document...';
  await wait(700);
  status.textContent = `Demo mode: "${file.name}" would be chunked and embedded into Pinecone in the full backend (see app/services/ingestion.py).`;
};
