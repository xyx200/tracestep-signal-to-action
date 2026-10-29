/* TraceStep extraction engine. Original code; MIT. No model or network calls. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TraceEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.0';
  const verbs = 'send|share|draft|review|confirm|prepare|publish|update|schedule|book|test|fix|check|create|write|contact|collect|upload|finish|approve|resolve|request|assign|compare|deliver|investigate|add|remove|submit|call|email|verify';
  const verbStart = new RegExp('^(?:please\\s+)?(?:' + verbs + ')\\b', 'i');
  const namedWill = new RegExp('^([A-Z][\\p{L}\\p{N} ._\\-]{0,38}?)\\s+(?:will|to|must|needs? to)\\s+((?:' + verbs + ')\\b.*)$', 'u');
  function normalize(text) { return String(text).toLowerCase().replace(/[.,;!?]/g, '').replace(/\s+/g, ' ').trim(); }
  function dateOnly(date) { return date.toISOString().slice(0, 10); }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const d = new Date(value + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && dateOnly(d) === value;
  }
  function shiftDate(anchor, offset) {
    const d = new Date(anchor + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + offset); return dateOnly(d);
  }
  function extractDue(text, anchor) {
    const explicit = text.match(/\b(?:due|by|before|on)\s*:?\s*(\d{4}-\d{2}-\d{2})\b/i);
    if (explicit) return { due: validDate(explicit[1]) ? explicit[1] : '', dueRaw: explicit[1], dueNote: validDate(explicit[1]) ? 'Explicit date in source' : 'Invalid date; confirm manually' };
    const relative = text.match(/\b(?:due|by|before|on)?\s*(today|tomorrow)\b/i);
    if (relative) return { due: validDate(anchor) ? shiftDate(anchor, /^tomorrow$/i.test(relative[1]) ? 1 : 0) : '', dueRaw: relative[1], dueNote: validDate(anchor) ? 'Relative to the source date you supplied' : 'Relative date needs a source date' };
    const ambiguous = text.match(/\b(?:due|by|before|on)\s*:?\s*((?:next |this )?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|next week|EOD|end of (?:day|week)|\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)/i);
    return { due: '', dueRaw: ambiguous ? ambiguous[1] : '', dueNote: ambiguous ? 'Ambiguous date; confirm manually' : 'No date stated' };
  }
  function parseLine(raw, source, index) {
    let text = raw.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, '');
    if (!text || /^#{1,6}\s|^\/\//.test(text)) return null;
    const completed = /^\[x\]/i.test(text) || /^(?:done|completed)\s*:/i.test(text);
    if (completed) return null;
    const reason = [];
    let explicit = /^(?:\[ \]|action(?: item)?\s*:|todo\s*:|task\s*:)/i.test(text);
    text = text.replace(/^(?:\[ \]\s*|action(?: item)?\s*:\s*|todo\s*:\s*|task\s*:\s*)/i, '');
    if (/^(?:decision|context|note|question|idea|maybe|consider)\s*:/i.test(text)) return null;
    if (/^(?:do not|don't|never|no need to)\b/i.test(text)) return null;
    let owner = '';
    const ownerTag = text.match(/(?:^|[|;])\s*Owner\s*:\s*([^|;]+)/i);
    if (ownerTag) owner = ownerTag[1].trim();
    const named = text.match(namedWill);
    const attributed = text.match(/^@([\p{L}\p{N}_.-]+)\s*:?\s+(.+)$/u);
    if (named) { owner = owner || (/^(?:I|We|You|They|Someone|Anyone|Somebody)$/i.test(named[1]) ? '' : named[1].trim()); text = named[2]; reason.push(owner ? 'Named commitment' : 'Commitment with unclear owner'); }
    else if (attributed && (explicit || verbStart.test(attributed[2]))) { owner = owner || attributed[1]; text = attributed[2]; reason.push('@owner action'); }
    else if (explicit) reason.push('Explicit action marker');
    else if (verbStart.test(text)) reason.push('Action verb at start of line');
    else return null;
    if (/^(?:tbd|unknown|unassigned|none|n\/a|\?)$/i.test(owner)) owner = '';
    const due = extractDue(raw, source.date);
    const blocked = /\b(?:blocked(?:\s+by|\s*:)?|waiting (?:on|for)|depends on)\b/i.test(raw);
    const priority = /\b(?:urgent|critical|p0|p1)\b|\[high\]|\bpriority\s*:\s*high\b/i.test(raw) ? 'high' : 'normal';
    let title = text.replace(/(?:^|[|;])\s*(?:Owner|Due|Priority)\s*:[^|;]+/gi, '').replace(/\s*[|;]\s*$/, '').trim();
    if (!title) return null;
    return {
      id: '', title, owner, due: due.due, dueRaw: due.dueRaw, dueNote: due.dueNote,
      priority, blocked, status: 'suggested', reasons: reason,
      evidence: [{ sourceId: source.id, sourceTitle: source.title, line: index + 1, quote: raw, date: source.date || '' }]
    };
  }
  function extract(sources) {
    if (sources.length > 20 || sources.some(s => String(s.text || '').length > 100000) || sources.reduce((n,s)=>n+String(s.text||'').length,0)>300000) throw new Error('Use at most 20 sources, 100,000 characters per source and 300,000 characters total.');
    const actions = [], seen = new Map(); let lines = 0, nonEmptyLines = 0;
    for (const source of sources) {
      String(source.text || '').split(/\r?\n/).forEach((line, index) => {
        lines++; if (line.trim()) nonEmptyLines++;
        const item = parseLine(line, source, index);
        if (!item) return;
        const key = normalize(item.title) + '|' + normalize(item.owner) + '|' + item.due + '|' + normalize(item.dueRaw);
        if (seen.has(key)) {
          if (seen.get(key).evidence.length >= 100) throw new Error('An action has more than 100 repeated source lines. Split the notes into smaller workspaces.');
          const prior = seen.get(key); prior.evidence.push(...item.evidence);
          prior.blocked ||= item.blocked; if (item.priority === 'high') prior.priority = 'high';
          prior.reasons = [...new Set([...prior.reasons, ...item.reasons])];
        } else { if (actions.length >= 1000) throw new Error('More than 1,000 candidates found. Split the notes into smaller workspaces.'); item.id = 'action-' + (actions.length + 1); seen.set(key, item); actions.push(item); }
      });
    }
    return { actions, stats: { sources: sources.length, lines, nonEmptyLines, evidenceLinks: actions.reduce((n, a) => n + a.evidence.length, 0) } };
  }
  function gaps(item) {
    const list = [];
    if (!item.owner.trim()) list.push('Owner missing');
    if (!item.due) list.push(item.dueRaw ? 'Confirm date: ' + item.dueRaw : 'Date missing');
    if (item.blocked) list.push('Blocked');
    return list;
  }
  function rank(actions, today) {
    return [...actions].filter(a => a.status !== 'dismissed' && a.status !== 'done').sort((a, b) => {
      const score = x => (x.blocked ? -100 : 0) + (x.status === 'accepted' ? 1000 : 0) + (x.owner ? 10 : 0) + (x.due ? 10 : 0) + (x.priority === 'high' ? 20 : 0) + (x.due && x.due < today ? 40 : 0);
      return score(b) - score(a) || (a.due || '9999').localeCompare(b.due || '9999') || a.id.localeCompare(b.id);
    });
  }
  function nextStep(actions, today) {
    const ordered = rank(actions, today);
    const ready = ordered.find(a => a.status === 'accepted' && !a.blocked && a.owner && a.due);
    if (ready) return { kind: 'ready', action: ready, label: 'Your next confirmed step', explanation: 'Confirmed, assigned and unblocked. Priority and due date determine the order.' };
    if (ordered.length) return { kind: 'review', action: ordered[0], label: 'Review before you act', explanation: 'Confirm a suggestion and resolve its missing fields before treating it as a plan.' };
    return { kind: 'empty', action: null, label: 'A clear place to start', explanation: 'Add notes, find action candidates, then confirm the steps that matter.' };
  }
  function escapeMarkdown(value) { return String(value).replace(/([\\`*_{}\[\]<>#|])/g, '\\$1').replace(/\r?\n/g, ' '); }
  function toMarkdown(project) {
    const out = ['# TraceStep action plan', '', 'Generated with local, deterministic rules. Review suggestions against their sources.', '', `Reference date: ${project.referenceDate || 'not set'}`, ''];
    for (const a of project.actions.filter(a => a.status !== 'dismissed')) {
      out.push(`- [${a.status === 'done' ? 'x' : ' '}] **${escapeMarkdown(a.title)}**`, `  - Status: ${a.status}; owner: ${escapeMarkdown(a.owner || 'unassigned')}; due: ${a.due || 'unconfirmed'}; priority: ${a.priority}${a.blocked ? '; BLOCKED' : ''}`);
      if (gaps(a).length) out.push('  - Review: ' + gaps(a).map(escapeMarkdown).join('; '));
      for (const e of a.evidence) out.push(`  - Source: ${escapeMarkdown(e.sourceTitle)}, line ${e.line}: “${escapeMarkdown(e.quote)}”`);
      out.push('');
    }
    return out.join('\n');
  }
  function validateProject(value) {
    if (!value || value.format !== 'tracestep' || value.version !== 1 || !Array.isArray(value.sources) || !Array.isArray(value.actions)) throw new Error('This is not a TraceStep v1 workspace.');
    if (value.sources.length > 20 || value.actions.length > 1000) throw new Error('Workspace is too large.');
    const clean = { format: 'tracestep', version: 1, referenceDate: validDate(value.referenceDate) ? value.referenceDate : '', sources: [], actions: [] };
    const string = (v, n) => { if (typeof v !== 'string' || v.length > n) throw new Error('Workspace has an invalid text field.'); return v; };
    const sourceIds = new Set(), actionIds = new Set(), sourceLines = new Map(); let chars = 0;
    for (const s of value.sources) {
      const source = { id: string(s.id, 100), title: string(s.title, 160), date: s.date && validDate(s.date) ? s.date : '', text: string(s.text, 100000) };
      if (!source.id || sourceIds.has(source.id)) throw new Error('Source IDs must be unique.');
      sourceIds.add(source.id); chars += source.text.length; clean.sources.push(source); sourceLines.set(source.id,source.text.split(/\r?\n/));
    }
    if (chars > 300000) throw new Error('Workspace exceeds 300,000 source characters.');
    for (const a of value.actions) {
      if (!['suggested','accepted','done','dismissed'].includes(a.status) || !['high','normal'].includes(a.priority) || !Array.isArray(a.evidence) || a.evidence.length < 1 || a.evidence.length > 100) throw new Error('Invalid action fields.');
      const item = { id: string(a.id, 100), title: string(a.title, 100000), owner: string(a.owner, 160), due: a.due && validDate(a.due) ? a.due : '', dueRaw: string(a.dueRaw || '', 160), dueNote: string(a.dueNote || '', 300), priority: a.priority, blocked: !!a.blocked, status: a.status, reasons: Array.isArray(a.reasons) ? a.reasons.slice(0, 10).map(x => string(x, 200)) : [], evidence: [] };
      if (!item.id || actionIds.has(item.id)) throw new Error('Action IDs must be unique.'); actionIds.add(item.id);
      for (const e of a.evidence) {
        const source = clean.sources.find(s => s.id === e.sourceId);
        if (!source || !Number.isInteger(e.line) || e.line < 1 || sourceLines.get(source.id)[e.line - 1] !== e.quote) throw new Error('Evidence no longer matches its source line.');
        item.evidence.push({sourceId: source.id, sourceTitle: source.title, date: source.date, line: e.line, quote: e.quote});
      }
      clean.actions.push(item);
    }
    return clean;
  }
  return { VERSION, extract, extractDue, validDate, gaps, rank, nextStep, toMarkdown, validateProject };
});
