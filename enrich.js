// ══════════════════════════════════════════════════════════════
// Qualitypedia – OMAC  |  V2 Content Enrichment Layer
// Adds: CPHQ domain alignment, standards references, common
// pitfalls, and self-check quiz questions to every tool.
// Built on top of the verified TOOLS data — never overwrites it.
// ══════════════════════════════════════════════════════════════

// NAHQ CPHQ Content Outline domain alignment, mapped by category.
// (General domain alignment — not tool-specific claims.)
const CPHQ_DOMAIN_MAP = {
  'Basic Quality Tools (7 QC)':        'Domain III · Performance & Process Improvement',
  'Improvement Methodologies':         'Domain III · Performance & Process Improvement',
  'Risk Management & Patient Safety':  'Domain IV · Patient Safety',
  'Statistical & Measurement Tools':   'Domain II · Health Data Analytics',
  'Process Analysis Tools':            'Domain III · Performance & Process Improvement',
  'Lean Tools':                        'Domain III · Performance & Process Improvement',
  'Audit & Compliance Tools':          'Domain I · Organizational Leadership',
  'Strategic & Management Frameworks': 'Domain I · Organizational Leadership',
  'Healthcare-Specific QA/QI':         'Domain IV · Patient Safety',
  'Project & Team Management Tools':   'Domain I · Organizational Leadership',
};

// Pitfall pools — generic, accurate QI-practice cautions, varied per category+type
const PITFALL_POOLS = {
  proactive: [
    'Skipping stakeholder buy-in before rollout, which weakens adoption',
    'Treating the tool as a one-time exercise instead of an ongoing practice',
    'Applying the tool without training frontline staff who will use it daily',
    'Failing to set a baseline, making later improvement hard to prove',
    'Over-engineering the tool for a simple problem, causing staff to abandon it',
  ],
  reactive: [
    'Stopping at the first plausible cause instead of verifying the true root cause',
    'Focusing on blaming an individual rather than examining the system',
    'Not closing the loop — identifying causes but never verifying the fix worked',
    'Investigating in isolation without involving the people who do the work',
    'Failing to communicate findings back to the team, losing the learning value',
  ],
};

const CATEGORY_PITFALL_EXTRA = {
  'Statistical & Measurement Tools': 'Drawing conclusions from too small a sample size',
  'Basic Quality Tools (7 QC)': 'Collecting data without first defining clear operational definitions',
  'Lean Tools': 'Focusing on tools while ignoring the underlying culture change needed',
  'Risk Management & Patient Safety': 'Scoring risk subjectively without a calibrated, multidisciplinary team',
  'Audit & Compliance Tools': 'Auditing for compliance only, without using findings to drive improvement',
  'Strategic & Management Frameworks': 'Setting metrics that are easy to measure rather than what truly matters',
  'Healthcare-Specific QA/QI': 'Implementing without adapting to local workflow realities',
  'Project & Team Management Tools': 'Leaving accountability ambiguous across multiple owners',
  'Process Analysis Tools': 'Mapping the process as it "should" work rather than as it actually works',
  'Improvement Methodologies': 'Rushing to a solution before the problem is clearly defined',
};

function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h); }

function buildPitfalls(t){
  const pool = PITFALL_POOLS[t.type] || PITFALL_POOLS.proactive;
  const h = hashStr(t.id);
  const p1 = pool[h % pool.length];
  const p2 = pool[(h+2) % pool.length];
  const p3 = CATEGORY_PITFALL_EXTRA[t.cat] || 'Losing momentum after the initial launch phase';
  return [...new Set([p1,p2,p3])];
}

// Quiz questions generated directly from each tool's own verified fields —
// guaranteed accurate since every answer is the tool's own recorded data.
function buildQuiz(t, allTools){
  const otherStages = [...new Set(allTools.filter(x=>x.stage!==t.stage).map(x=>x.stage))];
  const otherCats = CATEGORIES.filter(c=>c!==t.cat);
  const h = hashStr(t.id);
  function pick(arr, n, seed){
    const shuffled = [...arr].sort((a,b)=> (hashStr(a+seed) - hashStr(b+seed)));
    return shuffled.slice(0,n);
  }
  const stageDistractors = pick(otherStages, 3, t.id+'s');
  const catDistractors = pick(otherCats, 3, t.id+'c');

  const q1 = {
    q: `Is "${t.name}" a proactive or reactive quality tool?`,
    options: shuffleFixed(['Proactive — used to prevent problems before they occur','Reactive — used to investigate after a problem occurs'], h),
    answerIndex: null, // set below
    explain: t.type==='proactive'
      ? `${t.name} is a proactive tool — it is applied to prevent issues or design quality in before failures happen.`
      : `${t.name} is a reactive tool — it is applied after an event, error, or gap has already occurred.`
  };
  q1.answerIndex = q1.options.findIndex(o=>o.startsWith(t.type==='proactive'?'Proactive':'Reactive'));

  const stageOptions = shuffleFixed([t.stage, ...stageDistractors], h+1);
  const q2 = {
    q: `At which stage is "${t.name}" primarily applied?`,
    options: stageOptions,
    answerIndex: stageOptions.indexOf(t.stage),
    explain: `${t.name} is primarily used during: ${t.stage}.`
  };

  const catOptions = shuffleFixed([t.cat, ...catDistractors], h+2);
  const q3 = {
    q: `"${t.name}" belongs to which category of quality tools?`,
    options: catOptions,
    answerIndex: catOptions.indexOf(t.cat),
    explain: `${t.name} is classified under ${t.cat}.`
  };

  return [q1,q2,q3];
}

function shuffleFixed(arr, seed){
  return [...arr].sort((a,b)=> (hashStr(a+seed) - hashStr(b+seed)));
}

function enrichTools(){
  TOOLS.forEach(t=>{
    t.cphqDomain = CPHQ_DOMAIN_MAP[t.cat] || 'General Quality Management';
    t.pitfalls = buildPitfalls(t);
    t.quiz = buildQuiz(t, TOOLS);
  });
}
