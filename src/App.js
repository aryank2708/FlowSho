import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ── Inject keyframe animation once ──────────────────────────
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; }
  .react-flow__node { transition: opacity 0.3s ease !important; }
  .react-flow__edge-path { transition: stroke 0.4s ease, stroke-width 0.4s ease; }
  .react-flow__edge.animated .react-flow__edge-path {
    stroke-dasharray: 10 5;
    animation: flowDash 0.5s linear infinite;
  }
  @keyframes flowDash { to { stroke-dashoffset: -30; } }
  @keyframes nodePulse {
    0%   { box-shadow: 0 0 0 0 var(--pulse-color, #6366f180); }
    60%  { box-shadow: 0 0 0 10px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  .node-active { animation: nodePulse 1s ease infinite; }
  @keyframes progress { from { width: 0%; } to { width: 100%; } }
  @keyframes fadeSlideUp { from { opacity:0; transform:translateY(8px) translateX(-50%); } to { opacity:1; transform:translateY(0) translateX(-50%); } }
  @keyframes cardFadeIn { from { opacity:0; transform:translateY(6px) translateX(-50%); } to { opacity:1; transform:translateY(0) translateX(-50%); } }
`;
if (!document.head.querySelector('#flowsho-styles')) {
  style.id = 'flowsho-styles';
  document.head.appendChild(style);
}

// ── Pastel palette (exhaustive + fuzzy fallback) ────────────
const NODE_META = {
  // Webhooks & triggers
  'n8n-nodes-base.webhook':                      { label: 'Webhook',        icon: '🌐', accent: '#6d5fcd', bg: '#f0eeff', border: '#c4bdf7' },
  'n8n-nodes-base.respondToWebhook':             { label: 'Respond',        icon: '↩️', accent: '#c48b06', bg: '#fffbeb', border: '#fde68a' },
  '@n8n/n8n-nodes-langchain.chatTrigger':        { label: 'Chat Trigger',   icon: '💬', accent: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  'n8n-nodes-base.scheduleTrigger':              { label: 'Schedule',       icon: '🕐', accent: '#475569', bg: '#f8fafc', border: '#cbd5e1' },
  'n8n-nodes-base.manualTrigger':                { label: 'Manual',         icon: '▶️', accent: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
  // AI & LLM
  'n8n-nodes-base.openAi':                       { label: 'OpenAI',         icon: '🤖', accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  '@n8n/n8n-nodes-langchain.openAi':             { label: 'OpenAI',         icon: '🤖', accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  '@n8n/n8n-nodes-langchain.lmOpenAi':           { label: 'OpenAI LM',      icon: '🤖', accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  '@n8n/n8n-nodes-langchain.agent':              { label: 'AI Agent',       icon: '🧠', accent: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  '@n8n/n8n-nodes-langchain.chainLlm':           { label: 'LLM Chain',      icon: '⛓️', accent: '#5b21b6', bg: '#f5f3ff', border: '#ddd6fe' },
  // Databases
  'n8n-nodes-base.supabase':                     { label: 'Supabase',       icon: '🗄️', accent: '#2a9d6e', bg: '#ecfdf5', border: '#a7f3d0' },
  'n8n-nodes-base.airtable':                     { label: 'Airtable',       icon: '📊', accent: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  'n8n-nodes-base.postgres':                     { label: 'Postgres',       icon: '🐘', accent: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  'n8n-nodes-base.mysql':                        { label: 'MySQL',          icon: '🗃️', accent: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  'n8n-nodes-base.mongoDb':                      { label: 'MongoDB',        icon: '🍃', accent: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  // Google
  'n8n-nodes-base.googleSheets':                 { label: 'Google Sheets',  icon: '📋', accent: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  'n8n-nodes-base.googleSheetsTool':             { label: 'Sheets Tool',    icon: '📋', accent: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  'n8n-nodes-base.googleDrive':                  { label: 'Google Drive',   icon: '📁', accent: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  'n8n-nodes-base.gmail':                        { label: 'Gmail',          icon: '📧', accent: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  // Email & comms
  'n8n-nodes-base.sendEmail':                    { label: 'Send Email',     icon: '📨', accent: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  'n8n-nodes-base.slack':                        { label: 'Slack',          icon: '💬', accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  // HTTP & code
  'n8n-nodes-base.httpRequest':                  { label: 'HTTP',           icon: '🔗', accent: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  'n8n-nodes-base.code':                         { label: 'Code',           icon: '💻', accent: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' },
  // Logic
  'n8n-nodes-base.switch':                       { label: 'Switch',         icon: '🔀', accent: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' },
  'n8n-nodes-base.if':                           { label: 'If',             icon: '❓', accent: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
  'n8n-nodes-base.set':                          { label: 'Set',            icon: '✏️', accent: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
  'n8n-nodes-base.merge':                        { label: 'Merge',          icon: '⑂',  accent: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff' },
  'n8n-nodes-base.splitInBatches':               { label: 'Split Batches',  icon: '⚡', accent: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  'n8n-nodes-base.wait':                         { label: 'Wait',           icon: '⏳', accent: '#475569', bg: '#f8fafc', border: '#cbd5e1' },
  'n8n-nodes-base.noOp':                         { label: 'No Op',          icon: '⬜', accent: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
  default:                                       { label: 'Node',           icon: '⚙️', accent: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
};

// Fuzzy match: try exact → strip namespace prefix → keyword scan
function getMeta(type = '') {
  if (NODE_META[type]) return NODE_META[type];
  // Try just the last segment, e.g. "@n8n/n8n-nodes-langchain.openAi" → "openAi"
  const seg = type.split('.').pop()?.toLowerCase() || '';
  const found = Object.entries(NODE_META).find(([k]) => k !== 'default' && k.split('.').pop()?.toLowerCase() === seg);
  if (found) return found[1];
  // Keyword fallback
  if (seg.includes('gmail') || seg.includes('email'))    return NODE_META['n8n-nodes-base.gmail'];
  if (seg.includes('sheet') || seg.includes('google'))   return NODE_META['n8n-nodes-base.googleSheets'];
  if (seg.includes('openai') || seg.includes('openAi'))  return NODE_META['n8n-nodes-base.openAi'];
  if (seg.includes('slack'))                             return NODE_META['n8n-nodes-base.slack'];
  if (seg.includes('airtable'))                          return NODE_META['n8n-nodes-base.airtable'];
  if (seg.includes('supabase'))                          return NODE_META['n8n-nodes-base.supabase'];
  if (seg.includes('webhook') || seg.includes('trigger')) return NODE_META['n8n-nodes-base.webhook'];
  if (seg.includes('code') || seg.includes('script'))    return NODE_META['n8n-nodes-base.code'];
  if (seg.includes('switch') || seg.includes('router'))  return NODE_META['n8n-nodes-base.switch'];
  if (seg.includes('split') || seg.includes('batch'))    return NODE_META['n8n-nodes-base.splitInBatches'];
  if (seg.includes('merge'))                             return NODE_META['n8n-nodes-base.merge'];
  if (seg.includes('http') || seg.includes('request'))   return NODE_META['n8n-nodes-base.httpRequest'];
  if (seg.includes('agent') || seg.includes('llm') || seg.includes('chain')) return NODE_META['@n8n/n8n-nodes-langchain.agent'];
  return NODE_META.default;
}

// ── Topological DAG layout ───────────────────────────────────
function computeLayout(workflowNodes, connections) {
  const NODE_W = 230;
  const NODE_H = 76;
  const COL_GAP = 320;
  const ROW_GAP = 180;

  const nameToIdx = {};
  workflowNodes.forEach((n, i) => { nameToIdx[n.name] = i; });

  const children = workflowNodes.map(() => []);
  const indegree = new Array(workflowNodes.length).fill(0);

  Object.entries(connections).forEach(([src, out]) => {
    out.main?.forEach(targets => {
      targets.forEach(t => {
        const si = nameToIdx[src];
        const ti = nameToIdx[t.node];
        if (si !== undefined && ti !== undefined) {
          children[si].push(ti);
          indegree[ti]++;
        }
      });
    });
  });

  // BFS depth assignment — use a visited set so each node is enqueued at most once
  const depth = new Array(workflowNodes.length).fill(-1);
  const queue = [];
  const enqueued = new Set();
  workflowNodes.forEach((_, i) => {
    if (indegree[i] === 0) { depth[i] = 0; queue.push(i); enqueued.add(i); }
  });
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    children[cur].forEach(child => {
      const newDepth = depth[cur] + 1;
      if (depth[child] < newDepth) depth[child] = newDepth;
      if (!enqueued.has(child)) { queue.push(child); enqueued.add(child); }
    });
  }
  // Nodes not reachable from any root (isolated / in cycles) get depth 0
  workflowNodes.forEach((_, i) => { if (depth[i] < 0) depth[i] = 0; });

  // Group by column
  const cols = {};
  depth.forEach((d, i) => { (cols[d] = cols[d] || []).push(i); });

  const positions = new Array(workflowNodes.length);
  Object.entries(cols).forEach(([col, indices]) => {
    const x = parseInt(col, 10) * (NODE_W + COL_GAP) + 80;
    const totalH = indices.length * NODE_H + (indices.length - 1) * ROW_GAP;
    indices.forEach((ni, row) => {
      positions[ni] = { x, y: row * (NODE_H + ROW_GAP) - totalH / 2 + 300 };
    });
  });

  return positions;
}

// ── Node label (static JSX, built once) ─────────────────────
function buildNodeLabel(node, meta) {
  const shortName = node.name.replace(/^[^-–]+-\s*/, '').trim() || node.name;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 2px', width: '100%' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: meta.accent + '18', border: `1.5px solid ${meta.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
      }}>
        {meta.icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
          {meta.label}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
          {shortName}
        </div>
      </div>
    </div>
  );
}

// ── Parse workflow → stable base RF nodes & edges ────────────
function buildGraph(workflow) {
  const nameToId = {};
  workflow.nodes.forEach(n => { nameToId[n.name] = n.id; });
  const positions = computeLayout(workflow.nodes, workflow.connections);

  const nodes = workflow.nodes.map((node, i) => {
    const meta = getMeta(node.type);
    return {
      id: node.id,
      position: positions[i] || { x: i * 340 + 80, y: 300 },
      data: { label: buildNodeLabel(node, meta), raw: node, meta },
      style: {
        background: meta.bg,
        border: `1.5px solid ${meta.border}`,
        borderLeft: `4px solid ${meta.accent}`,
        borderRadius: 12,
        padding: '10px 14px',
        width: 230,
        // NO transform, NO boxShadow here — controlled via overlay div
      },
    };
  });

  const edges = [];
  let ei = 0;
  Object.entries(workflow.connections || {}).forEach(([src, out]) => {
    if (!out || !out.main) return;
    out.main.forEach(targets => {
      if (!Array.isArray(targets)) return;
      targets.forEach(t => {
        const srcId = nameToId[src];
        const tgtId = nameToId[t?.node];
        // Skip edges where either endpoint is unknown — prevents ReactFlow crash
        if (!srcId || !tgtId) return;
        edges.push({
          id: `e${ei++}`,
          source: srcId,
          target: tgtId,
          animated: false,
          style: { stroke: '#d1d5db', strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color: '#d1d5db' },
        });
      });
    });
  });

  return { nodes, edges };
}

// ── Human-readable output per node type ──────────────────────
const INDIAN_NAMES = ['Rahul Sharma', 'Priya Mehta', 'Arjun Patel', 'Ananya Gupta', 'Vikram Singh', 'Deepika Nair'];
const INDIAN_COMPANIES = ['StartupIN', 'TechVista Solutions', 'CloudNine Labs', 'PayRight Finance', 'GrowthBox', 'NexGen Infotech'];
const INDIAN_EMAILS = ['rahul@startupin.co', 'priya@techvista.in', 'arjun@cloudnine.io', 'ananya@payright.in', 'vikram@growthbox.co'];

function getHumanOutput(node) {
  const t = (node.type || '').toLowerCase();
  const name = node.name || '';
  const nameL = name.toLowerCase();
  const lead = INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)];
  const company = INDIAN_COMPANIES[Math.floor(Math.random() * INDIAN_COMPANIES.length)];
  const email = INDIAN_EMAILS[Math.floor(Math.random() * INDIAN_EMAILS.length)];
  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Webhook / triggers
  if (t.includes('webhook') || t.includes('trigger')) {
    if (nameL.includes('click') || nameL.includes('track'))
      return { headline: 'Link Clicked', story: `A visitor just clicked your email link. Their ID is lead_291 and they came from your March campaign.`, json: '{ "id": "lead_291", "email": "' + email + '", "source": "email_campaign", "timestamp": "' + now.toISOString() + '" }' };
    if (nameL.includes('chat') || nameL.includes('message'))
      return { headline: 'New Message Received', story: `A new chat message just came in. The automation is now processing the incoming request and preparing a response.`, json: '{ "message": "Hi, I want to know more about welUp benefits", "from": "whatsapp", "phone": "+91 97177 79639" }' };
    return { headline: 'Workflow Triggered', story: `The workflow was triggered at ${time}. Incoming data is being routed to the next step for processing.`, json: '{ "triggered_at": "' + now.toISOString() + '", "source": "webhook", "id": "evt_' + Math.random().toString(36).substr(2,6) + '" }' };
  }

  // Supabase
  if (t.includes('supabase')) {
    if (nameL.includes('create') || nameL.includes('insert'))
      return { headline: 'Record Created', story: `New row added to the database. Campaign tracking entry created for ${lead} with all engagement fields initialised.`, json: '{ "id": 4782, "lead": "' + lead + '", "campaign": "march_2026", "status": "active", "created_at": "' + now.toISOString() + '" }' };
    return { headline: 'Database Updated', story: `We recorded this event in your database. ${lead.split(' ')[0]}'s record is now marked as engaged, updated at ${time} today.`, json: '{ "clicked": true, "clicked_at": "' + now.toISOString() + '", "lead": "' + lead + '", "status": "engaged" }' };
  }

  // Respond to webhook
  if (t.includes('respondtowebhook') || (t.includes('respond') && nameL.includes('redirect')))
    return { headline: 'Visitor Redirected', story: `The visitor is being sent to WhatsApp to start a conversation with your sales team. This happens instantly — zero manual work.`, json: '301 Redirect → wa.me/919717779639?text=Hi, I want to know more about welUp' };

  // OpenAI / AI
  if (t.includes('openai') || t.includes('langchain') || t.includes('agent') || t.includes('llm')) {
    if (nameL.includes('email') || nameL.includes('message') || nameL.includes('model'))
      return { headline: 'AI Generated Content', story: `AI analysed ${lead.split(' ')[0]}'s company profile at ${company} and wrote a personalised email recommending the Startup plan based on their industry.`, json: '{ "chosen_template": "Script 2", "subject": "' + lead.split(' ')[0] + ', quick question about ' + company + '", "ai_pain_point": "rising attrition from poor health benefits" }' };
    if (nameL.includes('score') || nameL.includes('qualif'))
      return { headline: 'Lead Scored', story: `AI evaluated the lead and assigned a score of 87/100. ${lead} at ${company} is classified as a hot prospect — ready for sales outreach.`, json: '{ "lead": "' + lead + '", "score": 87, "tier": "hot", "recommended_action": "immediate_outreach" }' };
    return { headline: 'AI Processing Complete', story: `AI processed the request and generated a response. The model analysed the input data and returned structured output for the next step.`, json: '{ "model": "gpt-4o-mini", "tokens_used": 847, "output": "Recommended template: Script B (SaaS founders)" }' };
  }

  // Gmail / Email
  if (t.includes('gmail') || t.includes('sendemail') || t.includes('email')) {
    return { headline: 'Email Sent', story: `Email sent to ${email} with subject: "Quick question about your team's health cover." Personalised for ${lead} at ${company}.`, json: 'To: ' + email + ' · Subject: "Quick question about your team" · Status: Delivered' };
  }

  // Airtable
  if (t.includes('airtable')) {
    if (nameL.includes('update'))
      return { headline: 'CRM Updated', story: `${lead}'s outreach status has been updated to "Sent" in your CRM. This keeps your pipeline up-to-date automatically.`, json: '{ "id": "rec_8xK2m", "Outreach Status": "Sent", "Last Updated": "' + now.toISOString() + '" }' };
    return { headline: 'Record Created in CRM', story: `New lead added to your CRM: ${lead} from ${company}, status set to Contacted. The sales team can now follow up.`, json: '{ "Lead": "' + lead + '", "Company": "' + company + '", "Status": "Contacted" }' };
  }

  // Google Sheets
  if (t.includes('sheet') || t.includes('google')) {
    if (nameL.includes('get') || nameL.includes('read') || nameL.includes('list'))
      return { headline: 'Data Retrieved', story: `Pulled lead records from your Google Sheet. Found 24 contacts marked as "Ready" for outreach, starting with ${lead} at ${company}.`, json: '{ "rows_found": 24, "first": "' + lead + '", "company": "' + company + '", "status": "Ready" }' };
    return { headline: 'Sheet Updated', story: `Updated the spreadsheet with the latest campaign results. ${lead}'s row now shows the email was sent and delivery was confirmed.`, json: '{ "row_updated": true, "lead": "' + lead + '", "status": "Email Sent" }' };
  }

  // HTTP Request
  if (t.includes('httprequest') || t.includes('http'))
    return { headline: 'API Call Complete', story: `External API responded with 200 OK. ${company}'s profile data has been enriched with industry and team size information.`, json: '200 OK · { "enriched": true, "industry": "SaaS", "team_size": 85, "funding": "Series A" }' };

  // Code
  if (t.includes('code')) {
    if (nameL.includes('tracking') || nameL.includes('id'))
      return { headline: 'Tracking IDs Generated', story: `Unique tracking IDs created for this email campaign. Open-tracking pixel and click-tracking link are now embedded and ready.`, json: '{ "uniqueId": "1742789' + Math.floor(Math.random()*999) + '-k3m9x", "pixelUrl": "https://n8n.yourdomain.com/webhook/track-open?id=...", "clickUrl": "...track-click" }' };
    if (nameL.includes('template') || nameL.includes('suggest'))
      return { headline: 'Template Selected', story: `Analysed ${lead}'s title and industry keywords. Script 2 (Growth Signal) is the best match — it highlights scaling benefits.`, json: '{ "suggestedTemplate": "Script 2", "reason": "Keywords contain: hiring, expansion", "lead": "' + lead + '" }' };
    if (nameL.includes('assign') || nameL.includes('gmail'))
      return { headline: 'Sender Assigned', story: `Load-balanced across 6 Gmail accounts. This email will be sent from outreach3@welup.in to maintain deliverability.`, json: '{ "senderIndex": 2, "account": "outreach3@welup.in", "daily_quota_remaining": 47 }' };
    if (nameL.includes('build') || nameL.includes('email'))
      return { headline: 'Email Composed', story: `Custom email built for ${lead} at ${company}. Uses the growth-signal template with a personalised pain point and testimonial.`, json: '{ "template": "Script 2", "subject": "' + lead.split(' ')[0] + ' — quick question", "has_testimonial": true, "cta": "WhatsApp" }' };
    return { headline: 'Code Executed', story: `Custom logic ran successfully. Data has been transformed and prepared for the next step in the workflow.`, json: '{ "output": "processed", "items": 1, "execution_time": "12ms" }' };
  }

  // Switch
  if (t.includes('switch'))
    return { headline: 'Route Selected', story: `The router checked sender assignment and matched condition 3. This email is now routed to Gmail account #3 for sending.`, json: 'Condition matched → Output 3 (outreach3@welup.in)' };

  // If
  if (t.includes('if'))
    return { headline: 'Condition Evaluated', story: `The condition was checked and returned TRUE. Data is flowing through the main branch to continue the process.`, json: 'Result: TRUE → main branch (lead score > 70)' };

  // Set
  if (t.includes('set'))
    return { headline: 'Fields Updated', story: `Campaign fields have been set: priority is marked high, and the March 2026 campaign tag has been applied.`, json: '{ "campaign_id": "march_2026", "priority": "high", "batch": 3 }' };

  // Split in batches
  if (t.includes('split') || t.includes('batch'))
    return { headline: 'Processing Batch', story: `Processing leads one at a time to stay within rate limits. Currently on batch item ${Math.floor(Math.random() * 12) + 1} of 24.`, json: '{ "batch_size": 1, "current_item": 7, "total": 24 }' };

  // Merge
  if (t.includes('merge'))
    return { headline: 'Data Merged', story: `Results from multiple branches have been combined into a single dataset. All paths are now reunified for the final step.`, json: '{ "merged_items": 3, "strategy": "combine" }' };

  // Wait
  if (t.includes('wait'))
    return { headline: 'Waiting', story: `Paused for 24 hours before the next follow-up. This gives the lead time to respond before sending a reminder.`, json: '{ "wait_duration": "24h", "resume_at": "2026-03-25T' + time + '" }' };

  // Slack
  if (t.includes('slack'))
    return { headline: 'Slack Notification Sent', story: `Sales team has been notified on #leads channel: "🔥 Hot lead: ${lead} from ${company} just engaged with your campaign."`, json: '{ "channel": "#leads", "message": "Hot lead: ' + lead + '", "status": "delivered" }' };

  // Default
  return { headline: 'Step Complete', story: `This step finished processing successfully. Data has been passed to the next node in the workflow.`, json: '{ "status": "success", "timestamp": "' + now.toISOString() + '" }' };
}

// ── Detail Panel ─────────────────────────────────────────────
function DetailPanel({ node, fakeOutput, onClose }) {
  if (!node) return null;
  const meta = getMeta(node.type);
  return (
    <div style={{
      position: 'absolute', top: 56, right: 0, bottom: 0, width: 296,
      background: '#fff', borderLeft: '1px solid #e5e7eb',
      zIndex: 30, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: meta.bg, borderLeft: `4px solid ${meta.accent}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{node.name}</div>
            <div style={{ fontSize: 10, color: meta.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 1 }}>{meta.label}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <FieldLabel>Type</FieldLabel>
          <div style={{ display: 'inline-block', marginTop: 5, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: meta.accent, fontFamily: 'monospace' }}>{node.type}</div>
        </div>
        <div>
          <FieldLabel>Parameters</FieldLabel>
          <pre style={{ margin: '6px 0 0', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#374151', fontFamily: 'monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 160, overflowY: 'auto' }}>
            {JSON.stringify(node.parameters || {}, null, 2)}
          </pre>
        </div>
        {fakeOutput && (
          <div>
            <FieldLabel>Simulated Output</FieldLabel>
            <div style={{ marginTop: 6, background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: meta.accent, marginBottom: 4 }}>{fakeOutput.headline}</div>
              <div style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.6 }}>{fakeOutput.story}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginTop: 6, borderTop: '1px solid ' + meta.border, paddingTop: 6 }}>{fakeOutput.json}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</div>;
}

// ── Animated edge helper ─────────────────────────────────────
// Active edge: thick + brightly colored + animated dash (data flowing)
// Done edge: medium grey, no animation
// Default edge: thin light grey
function styleEdges(baseEdges, activeNodeId, completedIds, nodes) {
  return baseEdges.map(e => {
    const srcNode = nodes.find(n => n.id === e.source);
    const isActive = srcNode && srcNode.id === activeNodeId;
    const isDone = completedIds.includes(e.source);
    const meta = srcNode?.data?.meta;
    const accent = meta?.accent || '#6366f1';
    return {
      ...e,
      animated: isActive,
      style: {
        stroke: isActive ? accent : isDone ? '#a5b4fc' : '#d1d5db',
        strokeWidth: isActive ? 3.5 : isDone ? 2 : 1.5,
        filter: isActive ? `drop-shadow(0 0 4px ${accent}80)` : 'none',
        transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
      },
      markerEnd: {
        type: 'arrowclosed',
        color: isActive ? accent : isDone ? '#a5b4fc' : '#d1d5db',
        width: isActive ? 22 : 16,
        height: isActive ? 22 : 16,
      },
    };
  });
}

// ── Node state overlay (not CSS transform, just style props) ─
function applyNodeStates(baseNodes, activeNodeId, completedIds, isRunning, selectedId) {
  return baseNodes.map(node => {
    const isActive = node.id === activeNodeId;
    const isDone = completedIds.includes(node.id);
    const isSelected = node.id === selectedId;
    const meta = node.data.meta;

    let border = node.style.border;
    let borderLeft = node.style.borderLeft;
    let boxShadow = 'none';
    let opacity = 1;
    let background = node.style.background;

    if (isActive) {
      border = `2px solid ${meta.accent}`;
      borderLeft = `4px solid ${meta.accent}`;
      boxShadow = `0 0 0 3px ${meta.accent}40, 0 8px 24px ${meta.accent}30`;
      background = meta.bg;
    } else if (isDone) {
      border = `1.5px solid ${meta.accent}88`;
      borderLeft = `4px solid ${meta.accent}88`;
      boxShadow = `0 2px 8px ${meta.accent}20`;
    } else if (isSelected) {
      border = `2px solid ${meta.accent}`;
      borderLeft = `4px solid ${meta.accent}`;
      boxShadow = `0 0 0 2px ${meta.accent}30`;
    } else if (isRunning) {
      opacity = 0.3;
    }

    return {
      ...node,
      style: {
        ...node.style,
        border,
        borderLeft,
        boxShadow,
        opacity,
        background,
        transition: 'all 0.3s ease',
      },
    };
  });
}

// ── Flow execution order — BFS across ALL branches ──────────
// Visits every reachable node in breadth-first order so Switch/If fan-out nodes
// (e.g. 6 Gmail senders) all animate instead of just the first one.
function getExecutionOrder(workflow) {
  const nameToNode = {};
  workflow.nodes.forEach(n => { nameToNode[n.name] = n; });

  // Build adjacency: name → list of child names (all branches, all outputs)
  const children = {};
  workflow.nodes.forEach(n => { children[n.name] = []; });
  Object.entries(workflow.connections || {}).forEach(([src, out]) => {
    out.main?.forEach(targets => {
      if (!Array.isArray(targets)) return;
      targets.forEach(t => {
        if (t?.node && children[src] !== undefined) {
          children[src].push(t.node);
        }
      });
    });
  });

  // Find roots: nodes that are never a target
  const allTargets = new Set();
  Object.values(workflow.connections || {}).forEach(out => {
    out.main?.forEach(targets => {
      if (Array.isArray(targets)) targets.forEach(t => { if (t?.node) allTargets.add(t.node); });
    });
  });
  const roots = workflow.nodes.filter(n => !allTargets.has(n.name));
  const startNames = roots.length > 0 ? roots.map(n => n.name) : [workflow.nodes[0]?.name];

  // BFS
  const visited = new Set();
  const queue = [];
  startNames.forEach(name => { if (name && !visited.has(name)) { visited.add(name); queue.push(name); } });
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    (children[cur] || []).forEach(child => {
      if (!visited.has(child)) { visited.add(child); queue.push(child); }
    });
  }

  // Any nodes not reachable (isolated / in cycles) go at the end
  const ordered = queue.map(name => nameToNode[name]).filter(Boolean);
  workflow.nodes.forEach(n => { if (!visited.has(n.name)) ordered.push(n); });
  return ordered;
}

// ── Inner canvas (has access to useReactFlow) ────────────────
function FlowCanvas({ workflow, onReset }) {
  const { fitView } = useReactFlow();
  const hasFit = useRef(false);

  // Build stable base graph once per workflow
  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => buildGraph(workflow),
    [workflow]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);

  const [activeNodeId, setActiveNodeId] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [fakeData, setFakeData] = useState(null);
  const [isDone, setIsDone] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [runLog, setRunLog] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  const idToRaw = {};
  workflow.nodes.forEach(n => { idToRaw[n.id] = n; });

  // Update visual states reactively
  useEffect(() => {
    setNodes(applyNodeStates(baseNodes, activeNodeId, completedIds, isRunning, selectedNode?.id));
    setEdges(styleEdges(baseEdges, activeNodeId, completedIds, baseNodes));
  }, [activeNodeId, completedIds, isRunning, selectedNode, baseNodes, baseEdges]); // eslint-disable-line

  const onInit = useCallback(() => {
    if (!hasFit.current) {
      hasFit.current = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fitView({ padding: 0.25, duration: 600 });
      }));
    }
  }, [fitView]);

  // ── Keyboard shortcuts: Space = Run Demo, R = Reset ──
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); if (!isRunning) runDemo(); }
      if (e.key === 'r' || e.key === 'R') onReset();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line

  async function runDemo() {
    if (isRunning) return;
    setIsRunning(true);
    setCompletedIds([]);
    setActiveNodeId(null);
    setFakeData(null);
    setIsDone(false);
    setSelectedNode(null);

    const order = getExecutionOrder(workflow);
    const log = [];
    for (const node of order) {
      setActiveNodeId(node.id);
      const output = getHumanOutput(node);
      log.push({ node, output });
      setFakeData({ ...output, _key: node.id + Date.now() });
      setShowJson(false);
      await new Promise(r => setTimeout(r, 3000));
      setCompletedIds(prev => [...prev, node.id]);
    }
    setActiveNodeId(null);
    setIsRunning(false);
    setIsDone(true);
    setRunLog(log);
    setShowSummary(true);
    launchConfetti();
  }

  const handleNodeClick = useCallback((_, rfNode) => {
    const raw = idToRaw[rfNode.id];
    if (raw) setSelectedNode(raw);
  }, []); // eslint-disable-line

  function handleShare() {
    try {
      // Use TextEncoder → Uint8Array → base64 to safely handle large JSON & Unicode
      const json = JSON.stringify(workflow);
      const bytes = new TextEncoder().encode(json);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const enc = btoa(binary);
      const url = `${window.location.origin}${window.location.pathname}?w=${enc}`;
      navigator.clipboard.writeText(url)
        .then(() => { setCopyMsg('Link copied to clipboard'); setTimeout(() => setCopyMsg(''), 2200); })
        .catch(() => { setCopyMsg('Failed to copy'); setTimeout(() => setCopyMsg(''), 2200); });
    } catch { setCopyMsg('Failed to copy'); setTimeout(() => setCopyMsg(''), 2200); }
  }

  const panelOpen = selectedNode !== null;

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f8fafc', position: 'relative' }}>

      {/* ── Header ────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, height: 56,
        padding: '0 20px', background: '#fff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px' }}>
            Flow<span style={{ color: '#6366f1' }}>Sho</span>
          </div>
          <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
              {workflow.name || 'Untitled Workflow'}
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500, marginTop: 1 }}>
              {workflow.nodes.length} node{workflow.nodes.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleShare} style={{
            padding: '7px 14px', background: '#fff', color: '#374151',
            border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
            cursor: 'pointer', minWidth: 88, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}>
            ⎋ Share
          </button>
          <button onClick={runDemo} disabled={isRunning} style={{
            padding: '7px 18px',
            background: isRunning ? '#f3f4f6' : '#6366f1',
            color: isRunning ? '#9ca3af' : '#fff',
            border: isRunning ? '1px solid #e5e7eb' : 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            boxShadow: isRunning ? 'none' : '0 2px 8px #6366f140',
          }}>
            {isRunning ? '⏳ Running…' : isDone ? '↺ Run Again' : '▶ Run Demo'}
          </button>
          <button onClick={onReset} style={{
            padding: '7px 12px', background: '#fff', color: '#6b7280',
            border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer',
          }}>← New</button>
        </div>
      </div>

      {/* ── Execution progress bar ─────────────────────── */}
      {isRunning && (
        <div style={{ position: 'absolute', top: 56, left: 0, right: 0, zIndex: 9, height: 3, background: '#f3f4f6' }}>
          <div style={{
            height: '100%',
            width: `${(completedIds.length / workflow.nodes.length) * 100}%`,
            background: 'linear-gradient(90deg, #6366f1, #a5b4fc)',
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}

      {/* ── Live output card (human-readable) ──────────── */}
      {fakeData && (
        <div key={fakeData._key} style={{
          position: 'absolute', bottom: 20, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20, background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 14, padding: '16px 22px', minWidth: 360, maxWidth: 480,
          boxShadow: '0 8px 30px rgba(0,0,0,0.10)',
          marginRight: panelOpen ? 148 : 0,
          animation: 'cardFadeIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isDone ? '#16a34a' : '#6366f1',
                boxShadow: isDone ? '0 0 0 3px #dcfce7' : '0 0 0 3px #e0e7ff',
              }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: isDone ? '#16a34a' : '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isDone ? 'Workflow Complete' : 'Live Output'}
              </div>
            </div>
            <button
              onClick={() => setShowJson(j => !j)}
              style={{
                fontSize: 10, fontWeight: 600, color: '#9ca3af', cursor: 'pointer',
                background: showJson ? '#f3f4f6' : 'none', border: '1px solid #e5e7eb',
                borderRadius: 6, padding: '3px 8px',
              }}
            >{showJson ? '← Story' : 'Show JSON'}</button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{fakeData.headline}</div>
          {showJson ? (
            <div style={{ fontSize: 11.5, color: '#4b5563', fontFamily: "'Fira Code', monospace", background: '#f9fafb', padding: '8px 11px', borderRadius: 8, lineHeight: 1.7, border: '1px solid #f3f4f6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {fakeData.json}
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.65 }}>
              {fakeData.story}
            </div>
          )}
        </div>
      )}

      {/* ── Step indicator during run ──────────────────── */}
      {isRunning && activeNodeId && (() => {
        const activeRaw = idToRaw[activeNodeId];
        const meta = activeRaw ? getMeta(activeRaw.type) : null;
        const stepNum = completedIds.length + 1;
        return (
          <div style={{
            position: 'absolute', top: 68, left: '50%', transform: 'translateX(-50%)',
            zIndex: 20, background: meta?.bg || '#f5f3ff',
            border: `1px solid ${meta?.border || '#ddd6fe'}`,
            borderRadius: 20, padding: '5px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <span style={{ fontSize: 13 }}>{meta?.icon || '⚙️'}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: meta?.accent || '#6366f1' }}>
              Step {stepNum} of {workflow.nodes.length} · {activeRaw?.name || ''}
            </span>
          </div>
        );
      })()}

      {/* ── Canvas ────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 56, left: 0,
        right: panelOpen ? 296 : 0,
        bottom: 0, transition: 'right 0.3s ease',
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.05}
          maxZoom={2.5}
          nodesDraggable
          nodesConnectable={false}
          elevateNodesOnSelect={false}
        >
          <MiniMap
            style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10 }}
            nodeColor={n => n.data?.meta?.accent || '#6b7280'}
            maskColor="rgba(0,0,0,0.03)"
          />
          <Controls style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 10, border: '1px solid #e5e7eb' }} />
          <Background color="#e5e7eb" gap={22} size={1} />
        </ReactFlow>
      </div>

      {/* ── Detail panel ──────────────────────────────── */}
      {panelOpen && (
        <DetailPanel
          node={selectedNode}
          fakeOutput={getHumanOutput(selectedNode)}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* ── Run Summary Modal ─────────────────────────── */}
      {showSummary && runLog.length > 0 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowSummary(false)}>
          <div style={{
            background: '#fff', borderRadius: 18, width: 520, maxWidth: '92vw',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: '20px 22px 16px', borderBottom: '1px solid #f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>
                  Workflow Complete
                </div>
                <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2 }}>
                  {runLog.length} step{runLog.length !== 1 ? 's' : ''} ran in this demo
                </div>
              </div>
              <button onClick={() => setShowSummary(false)} style={{
                background: '#f3f4f6', border: 'none', borderRadius: 8,
                padding: '6px 10px', fontSize: 13, color: '#6b7280', cursor: 'pointer', fontWeight: 600,
              }}>✕ Close</button>
            </div>
            {/* Steps list */}
            <div style={{ overflowY: 'auto', padding: '12px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {runLog.map(({ node, output }, i) => {
                const meta = getMeta(node.type);
                return (
                  <div key={node.id} style={{
                    display: 'flex', gap: 12, padding: '12px 14px',
                    background: meta.bg, border: `1px solid ${meta.border}`,
                    borderLeft: `4px solid ${meta.accent}`, borderRadius: 10,
                  }}>
                    <div style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{meta.icon}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: meta.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          Step {i + 1} · {meta.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{output.headline}</div>
                      <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6 }}>{output.story}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notification ────────────────────────── */}
      {copyMsg && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, background: '#111827', color: '#fff',
          borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          ✓ {copyMsg}
        </div>
      )}
    </div>
  );
}

// ── Example Workflows (hardcoded for instant try) ──────────
const EXAMPLE_WORKFLOWS = [
  {
    title: 'welUp Outreach System',
    desc: 'Airtable → AI personalise → 6 Gmail senders → Supabase tracking',
    icon: '🚀',
    accent: '#6366f1',
    data: {
      name: 'welUp Outreach System',
      nodes: [
        { id: 'w1',  name: 'Airtable: Get Lead List',       type: 'n8n-nodes-base.airtable',                   position: [0,    200] },
        { id: 'w2',  name: 'Split In Batches',               type: 'n8n-nodes-base.splitInBatches',             position: [250,  200] },
        { id: 'w3',  name: 'Generate Tracking IDs',          type: 'n8n-nodes-base.code',                       position: [500,  200] },
        { id: 'w4',  name: 'Suggest Email Template',         type: 'n8n-nodes-base.code',                       position: [750,  200] },
        { id: 'w5',  name: 'OpenAI: Personalise Email',      type: '@n8n/n8n-nodes-langchain.openAi',           position: [1000, 200] },
        { id: 'w6',  name: 'Build Email Body',               type: 'n8n-nodes-base.code',                       position: [1250, 200] },
        { id: 'w7',  name: 'Assign Gmail Account',           type: 'n8n-nodes-base.code',                       position: [1500, 200] },
        { id: 'w8',  name: 'Switch: Route to Sender',        type: 'n8n-nodes-base.switch',                     position: [1750, 200] },
        { id: 'w9',  name: 'Gmail: outreach1@welup.in',      type: 'n8n-nodes-base.gmail',                      position: [2000, 0]   },
        { id: 'w10', name: 'Gmail: outreach2@welup.in',      type: 'n8n-nodes-base.gmail',                      position: [2000, 80]  },
        { id: 'w11', name: 'Gmail: outreach3@welup.in',      type: 'n8n-nodes-base.gmail',                      position: [2000, 160] },
        { id: 'w12', name: 'Gmail: outreach4@welup.in',      type: 'n8n-nodes-base.gmail',                      position: [2000, 240] },
        { id: 'w13', name: 'Gmail: outreach5@welup.in',      type: 'n8n-nodes-base.gmail',                      position: [2000, 320] },
        { id: 'w14', name: 'Gmail: outreach6@welup.in',      type: 'n8n-nodes-base.gmail',                      position: [2000, 400] },
        { id: 'w15', name: 'Supabase: Record Sent Email',    type: 'n8n-nodes-base.supabase',                   position: [2250, 200] },
      ],
      connections: {
        'Airtable: Get Lead List':    { main: [[{ node: 'Split In Batches',           type: 'main', index: 0 }]] },
        'Split In Batches':           { main: [[{ node: 'Generate Tracking IDs',      type: 'main', index: 0 }]] },
        'Generate Tracking IDs':      { main: [[{ node: 'Suggest Email Template',     type: 'main', index: 0 }]] },
        'Suggest Email Template':     { main: [[{ node: 'OpenAI: Personalise Email',  type: 'main', index: 0 }]] },
        'OpenAI: Personalise Email':  { main: [[{ node: 'Build Email Body',           type: 'main', index: 0 }]] },
        'Build Email Body':           { main: [[{ node: 'Assign Gmail Account',       type: 'main', index: 0 }]] },
        'Assign Gmail Account':       { main: [[{ node: 'Switch: Route to Sender',   type: 'main', index: 0 }]] },
        'Switch: Route to Sender':    { main: [
          [{ node: 'Gmail: outreach1@welup.in', type: 'main', index: 0 }],
          [{ node: 'Gmail: outreach2@welup.in', type: 'main', index: 0 }],
          [{ node: 'Gmail: outreach3@welup.in', type: 'main', index: 0 }],
          [{ node: 'Gmail: outreach4@welup.in', type: 'main', index: 0 }],
          [{ node: 'Gmail: outreach5@welup.in', type: 'main', index: 0 }],
          [{ node: 'Gmail: outreach6@welup.in', type: 'main', index: 0 }],
        ]},
        'Gmail: outreach1@welup.in':  { main: [[{ node: 'Supabase: Record Sent Email', type: 'main', index: 0 }]] },
        'Gmail: outreach2@welup.in':  { main: [[{ node: 'Supabase: Record Sent Email', type: 'main', index: 0 }]] },
        'Gmail: outreach3@welup.in':  { main: [[{ node: 'Supabase: Record Sent Email', type: 'main', index: 0 }]] },
        'Gmail: outreach4@welup.in':  { main: [[{ node: 'Supabase: Record Sent Email', type: 'main', index: 0 }]] },
        'Gmail: outreach5@welup.in':  { main: [[{ node: 'Supabase: Record Sent Email', type: 'main', index: 0 }]] },
        'Gmail: outreach6@welup.in':  { main: [[{ node: 'Supabase: Record Sent Email', type: 'main', index: 0 }]] },
      },
    },
  },
  {
    title: 'Lead Qualifier Bot',
    desc: 'Webhook → enrich → AI score → Supabase + Slack alert',
    icon: '🧠',
    accent: '#7c3aed',
    data: {
      name: 'Lead Qualifier Bot',
      nodes: [
        { id: 'lq1', name: 'Webhook: New Lead',          type: 'n8n-nodes-base.webhook',                  position: [0,    200] },
        { id: 'lq2', name: 'HTTP: Enrich from Apollo',   type: 'n8n-nodes-base.httpRequest',              position: [280,  200] },
        { id: 'lq3', name: 'OpenAI: Score Lead',         type: '@n8n/n8n-nodes-langchain.openAi',         position: [560,  200] },
        { id: 'lq4', name: 'If: Score > 70',             type: 'n8n-nodes-base.if',                       position: [840,  200] },
        { id: 'lq5', name: 'Supabase: Save Hot Lead',    type: 'n8n-nodes-base.supabase',                 position: [1120, 80]  },
        { id: 'lq6', name: 'Slack: Notify Sales Team',   type: 'n8n-nodes-base.slack',                    position: [1120, 320] },
      ],
      connections: {
        'Webhook: New Lead':        { main: [[{ node: 'HTTP: Enrich from Apollo', type: 'main', index: 0 }]] },
        'HTTP: Enrich from Apollo': { main: [[{ node: 'OpenAI: Score Lead',       type: 'main', index: 0 }]] },
        'OpenAI: Score Lead':       { main: [[{ node: 'If: Score > 70',           type: 'main', index: 0 }]] },
        'If: Score > 70':           { main: [
          [{ node: 'Supabase: Save Hot Lead',  type: 'main', index: 0 }],
          [{ node: 'Slack: Notify Sales Team', type: 'main', index: 0 }],
        ]},
      },
    },
  },
  {
    title: 'WhatsApp Follow-up',
    desc: 'Link click → AI message → WhatsApp API → 24h reminder',
    icon: '💬',
    accent: '#2a9d6e',
    data: {
      name: 'WhatsApp Follow-up System',
      nodes: [
        { id: 'wa1', name: 'Webhook: Link Clicked',      type: 'n8n-nodes-base.webhook',                  position: [0,    200] },
        { id: 'wa2', name: 'Supabase: Get Lead Data',    type: 'n8n-nodes-base.supabase',                 position: [280,  200] },
        { id: 'wa3', name: 'If: Already Messaged?',      type: 'n8n-nodes-base.if',                       position: [560,  200] },
        { id: 'wa4', name: 'OpenAI: Write Follow-up',    type: '@n8n/n8n-nodes-langchain.openAi',         position: [840,  200] },
        { id: 'wa5', name: 'HTTP: Send WhatsApp Msg',    type: 'n8n-nodes-base.httpRequest',              position: [1120, 200] },
        { id: 'wa6', name: 'Wait: 24 Hours',             type: 'n8n-nodes-base.wait',                     position: [1400, 200] },
        { id: 'wa7', name: 'HTTP: Send Reminder',        type: 'n8n-nodes-base.httpRequest',              position: [1680, 200] },
      ],
      connections: {
        'Webhook: Link Clicked':    { main: [[{ node: 'Supabase: Get Lead Data', type: 'main', index: 0 }]] },
        'Supabase: Get Lead Data':  { main: [[{ node: 'If: Already Messaged?',  type: 'main', index: 0 }]] },
        'If: Already Messaged?':    { main: [[{ node: 'OpenAI: Write Follow-up', type: 'main', index: 0 }]] },
        'OpenAI: Write Follow-up':  { main: [[{ node: 'HTTP: Send WhatsApp Msg', type: 'main', index: 0 }]] },
        'HTTP: Send WhatsApp Msg':  { main: [[{ node: 'Wait: 24 Hours',          type: 'main', index: 0 }]] },
        'Wait: 24 Hours':           { main: [[{ node: 'HTTP: Send Reminder',     type: 'main', index: 0 }]] },
      },
    },
  },
];

// ── Cluster colours for multi-workflow panels ───────────────
const CLUSTER_COLORS = [
  { accent: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { accent: '#2a9d6e', bg: '#ecfdf5', border: '#a7f3d0' },
  { accent: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { accent: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  { accent: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  { accent: '#be185d', bg: '#fdf2f8', border: '#fbcfe8' },
];

// ── Built-in multi-workflow example (with real cross-workflow URL matching) ──
const MULTI_WORKFLOW_EXAMPLE = {
  title: 'Full Lead Gen System',
  desc: '3 linked workflows: click tracking → AI qualify → personalised outreach',
  icon: '🔗',
  workflows: [
    {
      name: 'Click Tracker',
      nodes: [
        { id: 'ct1', name: 'Webhook: Track Click',       type: 'n8n-nodes-base.webhook',         parameters: { path: 'track-click' },                                           position: [0,   200] },
        { id: 'ct2', name: 'Supabase: Log Click Event',  type: 'n8n-nodes-base.supabase',                                                                                       position: [300, 200] },
        { id: 'ct3', name: 'HTTP: Trigger Qualifier',    type: 'n8n-nodes-base.httpRequest',     parameters: { url: 'https://n8n.welup.in/webhook/qualify-lead' },               position: [600, 200] },
        { id: 'ct4', name: 'Respond: Redirect to WA',   type: 'n8n-nodes-base.respondToWebhook',                                                                               position: [900, 200] },
      ],
      connections: {
        'Webhook: Track Click':      { main: [[{ node: 'Supabase: Log Click Event', type: 'main', index: 0 }]] },
        'Supabase: Log Click Event': { main: [[{ node: 'HTTP: Trigger Qualifier',   type: 'main', index: 0 }]] },
        'HTTP: Trigger Qualifier':   { main: [[{ node: 'Respond: Redirect to WA',  type: 'main', index: 0 }]] },
      },
    },
    {
      name: 'Lead Qualifier',
      nodes: [
        { id: 'lqr1', name: 'Webhook: Qualify Lead',      type: 'n8n-nodes-base.webhook',        parameters: { path: 'qualify-lead' },                                          position: [0,    200] },
        { id: 'lqr2', name: 'HTTP: Enrich from Apollo',   type: 'n8n-nodes-base.httpRequest',                                                                                   position: [280,  200] },
        { id: 'lqr3', name: 'OpenAI: Score Lead',         type: '@n8n/n8n-nodes-langchain.openAi',                                                                              position: [560,  200] },
        { id: 'lqr4', name: 'If: Score > 70',             type: 'n8n-nodes-base.if',                                                                                            position: [840,  200] },
        { id: 'lqr5', name: 'HTTP: Trigger Outreach',     type: 'n8n-nodes-base.httpRequest',    parameters: { url: 'https://n8n.welup.in/webhook/send-email' },                position: [1120, 80]  },
        { id: 'lqr6', name: 'Supabase: Mark Cold Lead',   type: 'n8n-nodes-base.supabase',                                                                                      position: [1120, 320] },
      ],
      connections: {
        'Webhook: Qualify Lead':    { main: [[{ node: 'HTTP: Enrich from Apollo', type: 'main', index: 0 }]] },
        'HTTP: Enrich from Apollo': { main: [[{ node: 'OpenAI: Score Lead',       type: 'main', index: 0 }]] },
        'OpenAI: Score Lead':       { main: [[{ node: 'If: Score > 70',           type: 'main', index: 0 }]] },
        'If: Score > 70':           { main: [
          [{ node: 'HTTP: Trigger Outreach',   type: 'main', index: 0 }],
          [{ node: 'Supabase: Mark Cold Lead', type: 'main', index: 0 }],
        ]},
      },
    },
    {
      name: 'Email Outreach',
      nodes: [
        { id: 'eo1', name: 'Webhook: Send Email',       type: 'n8n-nodes-base.webhook',          parameters: { path: 'send-email' },                                            position: [0,   200] },
        { id: 'eo2', name: 'OpenAI: Write Email',       type: '@n8n/n8n-nodes-langchain.openAi',                                                                                position: [280, 200] },
        { id: 'eo3', name: 'Build Email Body',          type: 'n8n-nodes-base.code',                                                                                            position: [560, 200] },
        { id: 'eo4', name: 'Gmail: Send Email',         type: 'n8n-nodes-base.gmail',                                                                                           position: [840, 200] },
        { id: 'eo5', name: 'Supabase: Record Sent',     type: 'n8n-nodes-base.supabase',                                                                                        position: [1120, 200] },
      ],
      connections: {
        'Webhook: Send Email': { main: [[{ node: 'OpenAI: Write Email', type: 'main', index: 0 }]] },
        'OpenAI: Write Email': { main: [[{ node: 'Build Email Body',    type: 'main', index: 0 }]] },
        'Build Email Body':    { main: [[{ node: 'Gmail: Send Email',   type: 'main', index: 0 }]] },
        'Gmail: Send Email':   { main: [[{ node: 'Supabase: Record Sent', type: 'main', index: 0 }]] },
      },
    },
  ],
};

// ── Cross-workflow webhook detection ─────────────────────────
function detectCrossWorkflowConnections(workflows) {
  const connections = [];
  workflows.forEach((srcWf, si) => {
    srcWf.nodes.forEach(node => {
      if (!node.type.includes('httpRequest')) return;
      const url = node.parameters?.url || '';
      workflows.forEach((tgtWf, ti) => {
        if (si === ti) return;
        tgtWf.nodes.forEach(tgtNode => {
          if (!tgtNode.type.includes('webhook')) return;
          const path = tgtNode.parameters?.path || '';
          if (path.length > 0 && url.includes(path)) {
            connections.push({ sourceWorkflowIndex: si, sourceNodeId: node.id, targetWorkflowIndex: ti, targetNodeId: tgtNode.id, path, label: `→ calls ${tgtWf.name}` });
          }
        });
      });
    });
  });
  return connections;
}

// ── Time saved lookup per node type ──────────────────────────
const TIME_SAVED = {
  gmail:        { label: 'Email writing & sending',  minutes: 4, icon: '📧' },
  sendemail:    { label: 'Email writing & sending',  minutes: 4, icon: '📧' },
  supabase:     { label: 'Database update',          minutes: 1, icon: '🗄️' },
  postgres:     { label: 'Database update',          minutes: 1, icon: '🗄️' },
  airtable:     { label: 'CRM update',               minutes: 2, icon: '📊' },
  openai:       { label: 'AI lead processing',       minutes: 3, icon: '🤖' },
  langchain:    { label: 'AI lead processing',       minutes: 3, icon: '🤖' },
  slack:        { label: 'Team notification',        minutes: 1, icon: '💬' },
  httprequest:  { label: 'API integration',          minutes: 2, icon: '🔗' },
  code:         { label: 'Data transformation',      minutes: 2, icon: '💻' },
  googlesheets: { label: 'Spreadsheet update',       minutes: 1, icon: '📋' },
};

// ── Confetti 🎉 ───────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const COLORS = ['#6366f1','#7c3aed','#2a9d6e','#f59e0b','#ec4899','#06b6d4','#ef4444'];
  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width, y: -14,
    vx: (Math.random() - 0.5) * 5, vy: Math.random() * 3 + 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 9 + 4, rot: Math.random() * 360, rotV: (Math.random() - 0.5) * 7,
  }));
  let raf;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.rot += p.rotV;
      if (p.y < canvas.height + 20) alive = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (alive) raf = requestAnimationFrame(tick);
    else { try { document.body.removeChild(canvas); } catch {} }
  };
  tick();
  setTimeout(() => { cancelAnimationFrame(raf); try { document.body.removeChild(canvas); } catch {} }, 5000);
}

// ── Intelligence Summary Panel ────────────────────────────────
function IntelligencePanel({ workflows, wfLogs, crossConns, onClose, onRunAgain }) {
  const [summary, setSummary] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [fetchingAI, setFetchingAI] = useState(false);

  const totalNodes = workflows.reduce((s, wf) => s + wf.nodes.length, 0);
  const estRuntime = ((totalNodes * 1.4) / 60).toFixed(1);

  // Aggregate time savings — deduplicate by label so openai + langchain merge
  const savingsMap = {};
  workflows.forEach(wf => {
    wf.nodes.forEach(node => {
      const t = (node.type || '').toLowerCase();
      const key = Object.keys(TIME_SAVED).find(k => t.includes(k));
      if (key) {
        const entry = TIME_SAVED[key];
        const labelKey = entry.label; // use label as dedup key
        if (!savingsMap[labelKey]) savingsMap[labelKey] = { ...entry, count: 0 };
        savingsMap[labelKey].count++;
      }
    });
  });
  const savings = Object.values(savingsMap).filter(s => s.count > 0);
  const totalMin = savings.reduce((s, x) => s + x.minutes * x.count, 0);

  async function fetchSummary(key) {
    setFetchingAI(true);
    setSummary('');
    try {
      const nodeNames = workflows.flatMap(w => w.nodes.map(n => n.name)).join(', ');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 160,
          messages: [
            { role: 'system', content: 'You explain automation workflows in plain English for non-technical business owners. Be specific, concise, and focus on business outcomes. 2-3 sentences max.' },
            { role: 'user', content: `What does this automation system do? Node names: ${nodeNames}` },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) {
        setSummary(`API error: ${data.error.message}`);
      } else {
        setSummary(data.choices?.[0]?.message?.content || 'Could not generate summary.');
      }
    } catch (err) {
      setSummary('Could not connect to OpenAI. Check your API key and try again.');
    }
    setFetchingAI(false);
  }

  useEffect(() => {
    const k = localStorage.getItem('openai_key');
    if (k) fetchSummary(k);
    else setSummary('');
  }, []); // eslint-disable-line

  return (
    <div style={{ position: 'fixed', inset: 0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(6px)' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, maxWidth:520, width:'92%', boxShadow:'0 28px 80px rgba(0,0,0,0.22)', maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#16a34a', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>✅ System Complete</div>
            <div style={{ fontSize:21, fontWeight:900, color:'#111827', letterSpacing:'-0.5px' }}>{workflows.length > 1 ? 'Multi-Workflow System' : (workflows[0]?.name || 'Workflow')}</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'#9ca3af',fontSize:22,cursor:'pointer',lineHeight:1,padding:4 }}>✕</button>
        </div>

        {/* AI Summary */}
        <div style={{ background:'#f9fafb', borderRadius:12, padding:'14px 16px', marginBottom:20, border:'1px solid #f3f4f6' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>What this does</div>
          {fetchingAI ? (
            <div style={{ fontSize:13, color:'#9ca3af', fontStyle:'italic' }}>✨ Generating AI summary…</div>
          ) : summary ? (
            <div style={{ fontSize:13.5, color:'#374151', lineHeight:1.7 }}>{summary}</div>
          ) : (
            <div style={{ fontSize:13, color:'#9ca3af' }}>Add your OpenAI API key to generate an AI summary of this automation.</div>
          )}
          <div style={{ marginTop:10 }}>
            {!showKeyInput ? (
              <button onClick={() => setShowKeyInput(true)} style={{ fontSize:11, color:'#6366f1', background:'none', border:'1px solid #c7d2fe', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:600 }}>+ Add OpenAI API Key</button>
            ) : (
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <input type="password" placeholder="sk-..." value={apiKey} onChange={e => setApiKey(e.target.value)}
                  style={{ flex:1, padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:12, fontFamily:'monospace', outline:'none' }} />
                <button onClick={() => { localStorage.setItem('openai_key', apiKey); setShowKeyInput(false); fetchSummary(apiKey); }}
                  style={{ padding:'6px 14px', background:'#6366f1', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer' }}>Generate</button>
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:20 }}>
          {[
            { label:'Workflows', value: workflows.length },
            { label:'Total Nodes', value: totalNodes },
            { label:'Est. Runtime', value: `~${estRuntime}m` },
            { label:'Time Saved', value: `~${totalMin}m` },
          ].map(s => (
            <div key={s.label} style={{ background:'#f9fafb', borderRadius:10, padding:'12px 8px', textAlign:'center', border:'1px solid #f3f4f6' }}>
              <div style={{ fontSize:22, fontWeight:900, color:'#6366f1', letterSpacing:'-0.5px' }}>{s.value}</div>
              <div style={{ fontSize:10, color:'#9ca3af', fontWeight:600, marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Time saved breakdown */}
        {savings.length > 0 && (
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Time Saved Breakdown</div>
            {savings.map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom: i < savings.length-1 ? '1px solid #f3f4f6':'none' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14 }}>{s.icon}</span>
                  <span style={{ fontSize:13, color:'#374151' }}>{s.label}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:'#16a34a' }}>→ {s.minutes * s.count} min saved</span>
              </div>
            ))}
          </div>
        )}

        {/* Step-by-step summary per workflow */}
        {wfLogs && wfLogs.some(log => log.length > 0) && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>What Happened</div>
            {workflows.map((wf, wfIdx) => {
              const log = wfLogs[wfIdx] || [];
              if (log.length === 0) return null;
              const cc = CLUSTER_COLORS[wfIdx % CLUSTER_COLORS.length];
              const isMain = wfIdx === 0;
              // Find which workflow triggered this one
              const triggerConn = crossConns?.find(c => c.targetWorkflowIndex === wfIdx);
              const triggeredBy = triggerConn ? workflows[triggerConn.sourceWorkflowIndex]?.name : null;
              return (
                <div key={wfIdx} style={{ marginBottom: 14 }}>
                  {/* Workflow header */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:800, color: isMain ? '#6366f1' : cc.accent }}>
                      {isMain ? '⭐ MAIN' : '↳ SUB'}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#111827' }}>{wf.name}</span>
                    {triggeredBy && (
                      <span style={{ fontSize:10, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:20, padding:'1px 8px', fontWeight:600 }}>
                        triggered by {triggeredBy}
                      </span>
                    )}
                  </div>
                  {/* Steps */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, paddingLeft:14, borderLeft:`2px solid ${cc.accent}30` }}>
                    {log.map(({ node, output }) => {
                      const meta = getMeta(node.type);
                      return (
                        <div key={node.id} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                          <span style={{ fontSize:12, flexShrink:0, marginTop:1 }}>{meta.icon}</span>
                          <div>
                            <span style={{ fontSize:11.5, fontWeight:700, color:'#111827' }}>{output.headline}</span>
                            <span style={{ fontSize:11, color:'#9ca3af', marginLeft:6 }}>· {node.name}</span>
                            <div style={{ fontSize:11, color:'#6b7280', lineHeight:1.5, marginTop:1 }}>{output.story}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onRunAgain} style={{ flex:1, padding:'12px', background:'#6366f1', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 8px #6366f140' }}>↺ Run Again</button>
          <button onClick={onClose} style={{ flex:1, padding:'12px', background:'#f9fafb', color:'#374151', border:'1px solid #e5e7eb', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>Continue Exploring</button>
        </div>
      </div>
    </div>
  );
}

// ── Mini canvas inner ─────────────────────────────────────────
function MiniFlowInner({ workflow, color, runTrigger, onComplete, onNodeActivate }) {
  const { fitView } = useReactFlow();
  const hasFit = useRef(false);
  const runningRef = useRef(false);

  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => buildGraph(workflow), [workflow]);
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);

  const [activeNodeId, setActiveNodeId] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  const [isRunning, setIsRunning]       = useState(false);
  const [fakeData, setFakeData]         = useState(null);
  const [isDone, setIsDone]             = useState(false);

  const idToRaw = {};
  workflow.nodes.forEach(n => { idToRaw[n.id] = n; });

  useEffect(() => {
    setNodes(applyNodeStates(baseNodes, activeNodeId, completedIds, isRunning, null));
    setEdges(styleEdges(baseEdges, activeNodeId, completedIds, baseNodes));
  }, [activeNodeId, completedIds, isRunning, baseNodes, baseEdges]); // eslint-disable-line

  const onInit = useCallback(() => {
    if (!hasFit.current) {
      hasFit.current = true;
      requestAnimationFrame(() => requestAnimationFrame(() => { fitView({ padding: 0.2, duration: 500 }); }));
    }
  }, [fitView]);

  useEffect(() => {
    if (runTrigger === 0) return;
    startRun();
  }, [runTrigger]); // eslint-disable-line

  async function startRun() {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true); setCompletedIds([]); setActiveNodeId(null); setFakeData(null); setIsDone(false);
    const order = getExecutionOrder(workflow);
    const log = [];
    for (const node of order) {
      setActiveNodeId(node.id);
      const output = getHumanOutput(node);
      log.push({ node, output });
      setFakeData({ ...output, _key: node.id + Date.now() });
      if (onNodeActivate) onNodeActivate(node.id);
      await new Promise(r => setTimeout(r, 2500));
      setCompletedIds(prev => [...prev, node.id]);
    }
    setActiveNodeId(null); setIsRunning(false); setIsDone(true);
    runningRef.current = false;
    if (onComplete) onComplete(log);
  }

  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:5, height:3, background:'#f3f4f6' }}>
        <div style={{ height:'100%', width:(isRunning||isDone)?`${(completedIds.length/workflow.nodes.length)*100}%`:'0%', background:`linear-gradient(90deg,${color.accent},${color.accent}88)`, transition:'width 0.4s ease' }} />
      </div>
      {isRunning && activeNodeId && (() => {
        const raw = idToRaw[activeNodeId]; const meta = raw ? getMeta(raw.type) : null;
        return (
          <div style={{ position:'absolute', top:10, left:'50%', transform:'translateX(-50%)', zIndex:10, background:meta?.bg||color.bg, border:`1px solid ${meta?.border||color.border}`, borderRadius:20, padding:'4px 12px', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(0,0,0,0.08)', whiteSpace:'nowrap' }}>
            <span style={{ fontSize:11 }}>{meta?.icon||'⚙️'}</span>
            <span style={{ fontSize:11, fontWeight:600, color:meta?.accent||color.accent }}>{completedIds.length+1}/{workflow.nodes.length} · {raw?.name||''}</span>
          </div>
        );
      })()}
      {fakeData && (
        <div style={{ position:'absolute', bottom:12, left:12, right:12, zIndex:10, background:'#fff', border:`1px solid ${color.border}`, borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:isDone?'#16a34a':color.accent, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{isDone?'✓ Complete':'● Live Output'}</div>
          <div style={{ fontSize:12.5, fontWeight:700, color:'#111827', marginBottom:3 }}>{fakeData.headline}</div>
          <div style={{ fontSize:11.5, color:'#6b7280', lineHeight:1.5 }}>{fakeData.story}</div>
        </div>
      )}
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onInit={onInit} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.05} maxZoom={2.5}
        nodesDraggable nodesConnectable={false} elevateNodesOnSelect={false}>
        <Controls style={{ boxShadow:'0 1px 4px rgba(0,0,0,0.08)', borderRadius:8, border:'1px solid #e5e7eb' }} showInteractive={false} />
        <Background color="#e5e7eb" gap={22} size={1} />
      </ReactFlow>
    </div>
  );
}

// ── Multi-Workflow Canvas — Main + Sub hierarchy layout ─────────────────────
function MultiFlowCanvas({ workflows, onReset }) {
  const [runTriggers, setRunTriggers] = useState(() => workflows.map(() => 0));
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isRunningIndividual, setIsRunningIndividual] = useState(() => workflows.map(() => false));
  const [transitionCard, setTransitionCard] = useState(null);
  const [activeWfIndex, setActiveWfIndex] = useState(null);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [wfLogs, setWfLogs] = useState(() => workflows.map(() => []));
  const completionResolvers = useRef({});
  const triggeredSubflows = useRef(new Set()); // avoid double-triggering

  const mainWf = workflows[0];
  const subWfs = workflows.slice(1);
  const mainColor = CLUSTER_COLORS[0];

  const crossConns = useMemo(() => detectCrossWorkflowConnections(workflows), [workflows]); // eslint-disable-line

  function notifyComplete(idx, log) {
    setWfLogs(prev => { const n = [...prev]; n[idx] = log || []; return n; });
    setIsRunningIndividual(prev => { const n = [...prev]; n[idx] = false; return n; });
    if (completionResolvers.current[idx]) {
      completionResolvers.current[idx]();
      delete completionResolvers.current[idx];
    }
  }
  function waitForWorkflow(idx) {
    return new Promise(resolve => { completionResolvers.current[idx] = resolve; });
  }

  // Called by MiniFlowInner when a node activates — check for cross-workflow triggers
  function handleNodeActivate(wfIndex, nodeId) {
    if (!isRunningAll) return;
    const conns = crossConns.filter(c => c.sourceWorkflowIndex === wfIndex && c.sourceNodeId === nodeId);
    conns.forEach(conn => {
      const targetIdx = conn.targetWorkflowIndex;
      if (triggeredSubflows.current.has(targetIdx)) return;
      triggeredSubflows.current.add(targetIdx);
      // Show transition card, then auto-start target workflow
      setTransitionCard({ from: workflows[wfIndex].name, to: workflows[targetIdx].name, path: conn.path });
      setTimeout(() => {
        setTransitionCard(null);
        setActiveWfIndex(targetIdx);
        setRunTriggers(prev => { const n = [...prev]; n[targetIdx] = n[targetIdx] + 1; return n; });
      }, 1600);
    });
  }

  // Run a single workflow independently
  function runSingle(idx) {
    if (isRunningAll || isRunningIndividual[idx]) return;
    setIsRunningIndividual(prev => { const n = [...prev]; n[idx] = true; return n; });
    setActiveWfIndex(idx);
    setRunTriggers(prev => { const n = [...prev]; n[idx] = n[idx] + 1; return n; });
  }

  async function runFullSystem() {
    if (isRunningAll) return;
    triggeredSubflows.current = new Set();
    setIsRunningAll(true); setShowIntelligence(false); setTransitionCard(null);
    setActiveWfIndex(0);
    setRunTriggers(prev => { const n = [...prev]; n[0] = n[0] + 1; return n; });
    // Wait for ALL workflows to complete (they may be triggered mid-run via handleNodeActivate)
    await waitForWorkflow(0);
    // If any subflows weren't auto-triggered (no cross-connections found), run them sequentially
    for (let i = 1; i < workflows.length; i++) {
      if (!triggeredSubflows.current.has(i)) {
        setTransitionCard({ from: workflows[i - 1].name, to: workflows[i].name, path: '' });
        await new Promise(r => setTimeout(r, 1200));
        setTransitionCard(null);
        setActiveWfIndex(i);
        setRunTriggers(prev => { const n = [...prev]; n[i] = n[i] + 1; return n; });
        await waitForWorkflow(i);
      }
    }
    // Wait for any auto-triggered subflows to complete
    const pending = Array.from(triggeredSubflows.current);
    await Promise.all(pending.map(idx => completionResolvers.current[idx] ? waitForWorkflow(idx) : Promise.resolve()));
    setActiveWfIndex(null); setIsRunningAll(false);
    launchConfetti();
    setTimeout(() => setShowIntelligence(true), 800);
  }

  function handleRunAgain() { setShowIntelligence(false); setTimeout(runFullSystem, 200); }

  const isMainActive = activeWfIndex === 0;

  return (
    <div style={{ width:'100vw', height:'100vh', background:'#f8fafc', display:'flex', flexDirection:'column' }}>

      {/* ── Header ── */}
      <div style={{ height:56, padding:'0 16px', background:'#fff', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', flexShrink:0, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:17, fontWeight:900, color:'#111827', letterSpacing:'-0.5px' }}>Flow<span style={{ color:'#6366f1' }}>Sho</span></div>
          <div style={{ width:1, height:20, background:'#e5e7eb' }} />
          {/* Main badge */}
          <div style={{ display:'flex', alignItems:'center', gap:6, background: isMainActive ? '#6366f1' : '#eef2ff', border:'1px solid #c7d2fe', borderRadius:20, padding:'3px 12px', transition:'all 0.3s' }}>
            <span style={{ fontSize:12 }}>⭐</span>
            <span style={{ fontSize:12, fontWeight:700, color: isMainActive ? '#fff' : '#4f46e5' }}>{mainWf.name}</span>
            <span style={{ fontSize:10, color: isMainActive ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>· {mainWf.nodes.length}n</span>
          </div>
          {/* Sub badges */}
          {subWfs.map((wf, i) => {
            const cc = CLUSTER_COLORS[(i + 1) % CLUSTER_COLORS.length];
            const isActive = activeWfIndex === i + 1;
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:5, background: isActive ? cc.accent : cc.bg, border:`1px solid ${cc.border}`, borderRadius:20, padding:'3px 10px', transition:'all 0.3s' }}>
                <span style={{ fontSize:10, color: isActive ? 'rgba(255,255,255,0.8)' : '#9ca3af' }}>↳</span>
                <span style={{ fontSize:11.5, fontWeight:600, color: isActive ? '#fff' : cc.accent }}>{wf.name}</span>
                <span style={{ fontSize:10, color: isActive ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>· {wf.nodes.length}n</span>
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {crossConns.length > 0 && (
            <div style={{ fontSize:11, color:'#7c3aed', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:20, padding:'3px 10px', fontWeight:600 }}>
              🔗 {crossConns.length} connection{crossConns.length > 1 ? 's' : ''} detected
            </div>
          )}
          <button onClick={runFullSystem} disabled={isRunningAll} style={{ padding:'7px 18px', background:isRunningAll?'#f3f4f6':'#6366f1', color:isRunningAll?'#9ca3af':'#fff', border:isRunningAll?'1px solid #e5e7eb':'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:isRunningAll?'not-allowed':'pointer', boxShadow:isRunningAll?'none':'0 2px 8px #6366f140' }}>
            {isRunningAll ? '⏳ Running…' : '▶ Run Full System Demo'}
          </button>
          <button onClick={onReset} style={{ padding:'7px 12px', background:'#fff', color:'#6b7280', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, cursor:'pointer' }}>← New</button>
        </div>
      </div>

      {/* ── MAIN WORKFLOW — top 58% ── */}
      <div style={{
        flex: subWfs.length > 0 ? '0 0 58%' : '1',
        position:'relative', overflow:'hidden',
        borderBottom: subWfs.length > 0 ? '3px solid #e5e7eb' : 'none',
        outline: isMainActive ? '2px solid #6366f1' : 'none',
        transition: 'outline 0.3s ease',
      }}>
        {/* Main label bar */}
        <div style={{ position:'absolute', top:8, left:12, zIndex:10, display:'flex', alignItems:'center', gap:8, pointerEvents:'none' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.95)', border:'1.5px solid #c7d2fe', borderRadius:20, padding:'4px 12px', boxShadow:'0 2px 8px rgba(99,102,241,0.12)' }}>
            <span style={{ fontSize:13 }}>⭐</span>
            <span style={{ fontSize:12, fontWeight:800, color:'#4f46e5' }}>MAIN WORKFLOW</span>
            <span style={{ fontSize:11, color:'#374151', fontWeight:600 }}>— {mainWf.name}</span>
            <span style={{ fontSize:10, color:'#9ca3af' }}>· {mainWf.nodes.length} nodes</span>
          </div>
        </div>
        {/* Per-workflow run button */}
        <div style={{ position:'absolute', top:8, right:12, zIndex:10 }}>
          <button
            onClick={() => runSingle(0)}
            disabled={isRunningAll || isRunningIndividual[0]}
            style={{ padding:'4px 12px', background: isRunningIndividual[0] ? '#f3f4f6' : '#6366f1', color: isRunningIndividual[0] ? '#9ca3af' : '#fff', border:'none', borderRadius:20, fontSize:11, fontWeight:700, cursor: isRunningIndividual[0] ? 'not-allowed' : 'pointer', boxShadow: isRunningIndividual[0] ? 'none' : '0 2px 8px #6366f130' }}
          >{isRunningIndividual[0] ? '⏳' : '▶ Run'}</button>
        </div>
        <ReactFlowProvider>
          <MiniFlowInner workflow={mainWf} color={mainColor} runTrigger={runTriggers[0]} onComplete={(log) => notifyComplete(0, log)} onNodeActivate={(nodeId) => handleNodeActivate(0, nodeId)} />
        </ReactFlowProvider>
      </div>

      {/* ── SUB-WORKFLOWS — bottom strip ── */}
      {subWfs.length > 0 && (
        <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
          {/* Left label */}
          <div style={{ width:28, flexShrink:0, background:'#f9fafb', borderRight:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:9, fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.12em', writingMode:'vertical-lr', transform:'rotate(180deg)' }}>Sub-Workflows</span>
          </div>
          {/* Sub panels */}
          {subWfs.map((wf, i) => {
            const cc = CLUSTER_COLORS[(i + 1) % CLUSTER_COLORS.length];
            const isActive = activeWfIndex === i + 1;
            return (
              <div key={i} style={{
                flex:1, position:'relative', overflow:'hidden',
                borderRight: i < subWfs.length - 1 ? `1px solid ${cc.accent}22` : 'none',
                outline: isActive ? `2px solid ${cc.accent}` : 'none',
                transition: 'outline 0.3s ease',
              }}>
                {/* Sub label */}
                <div style={{ position:'absolute', top:6, left:8, zIndex:10, pointerEvents:'none' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.95)', border:`1px solid ${cc.border}`, borderRadius:20, padding:'3px 10px' }}>
                    <span style={{ fontSize:10, color:cc.accent, fontWeight:700 }}>↑ triggered by main</span>
                    <span style={{ fontSize:10, color:'#374151', fontWeight:600 }}>· {wf.name}</span>
                  </div>
                </div>
                {/* Per-workflow run button */}
                <div style={{ position:'absolute', top:6, right:8, zIndex:10 }}>
                  <button
                    onClick={() => runSingle(i + 1)}
                    disabled={isRunningAll || isRunningIndividual[i + 1]}
                    style={{ padding:'3px 10px', background: isRunningIndividual[i + 1] ? '#f3f4f6' : cc.accent, color: isRunningIndividual[i + 1] ? '#9ca3af' : '#fff', border:'none', borderRadius:20, fontSize:10, fontWeight:700, cursor: isRunningIndividual[i + 1] ? 'not-allowed' : 'pointer' }}
                  >{isRunningIndividual[i + 1] ? '⏳' : '▶ Run'}</button>
                </div>
                <ReactFlowProvider>
                  <MiniFlowInner workflow={wf} color={cc} runTrigger={runTriggers[i + 1]} onComplete={(log) => notifyComplete(i + 1, log)} onNodeActivate={(nodeId) => handleNodeActivate(i + 1, nodeId)} />
                </ReactFlowProvider>
              </div>
            );
          })}
        </div>
      )}

      {/* Transition card */}
      {transitionCard && (
        <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:150, background:'#fff', borderRadius:16, padding:'22px 28px', boxShadow:'0 16px 60px rgba(0,0,0,0.22)', border:'2px solid #7c3aed', minWidth:320, textAlign:'center' }}>
          <div style={{ fontSize:24, marginBottom:10 }}>🔗</div>
          <div style={{ fontSize:12, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Triggering Sub-Workflow</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#111827', marginBottom:4 }}>{transitionCard.from}</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginBottom:4 }}>↓ calls <code style={{ background:'#f5f3ff', padding:'2px 6px', borderRadius:4, color:'#7c3aed' }}>/{transitionCard.path}</code></div>
          <div style={{ fontSize:14, fontWeight:700, color:'#6366f1' }}>▶ {transitionCard.to}</div>
          <div style={{ marginTop:12, height:3, background:'#f3f4f6', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#7c3aed,#6366f1)', width:'100%', animation:'progress 1.6s linear forwards' }} />
          </div>
        </div>
      )}

      {showIntelligence && (
        <IntelligencePanel workflows={workflows} wfLogs={wfLogs} crossConns={crossConns} onClose={() => setShowIntelligence(false)} onRunAgain={handleRunAgain} />
      )}
    </div>
  );
}



// ── Landing / Paste Screen ───────────────────────────────────
function PasteScreen({ onLoad, onLoadMulti }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [multiMode, setMultiMode] = useState(false);
  const [multiWorkflows, setMultiWorkflows] = useState([null, null]);
  const [mainSlotIdx, setMainSlotIdx] = useState(0); // which slot is the main workflow
  const multiFileRefs = useRef([]);

  useEffect(() => {
    try {
      const enc = new URLSearchParams(window.location.search).get('w');
      if (enc) {
        // Reverse of TextEncoder encoding used in handleShare
        const binary = atob(enc);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const d = JSON.parse(new TextDecoder().decode(bytes));
        if (d.nodes && d.connections) onLoad(d);
      }
    } catch { }
  }, [onLoad]);

  function parseAndLoad(json) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.nodes || !parsed.connections) {
        setError('Invalid n8n workflow JSON — needs nodes + connections fields.');
        return;
      }
      setError('');
      onLoad(parsed);
    } catch {
      setError('Invalid JSON — please check and try again.');
    }
  }

  function handleGenerate() { parseAndLoad(text); }

  function handleMultiFile(idx, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.nodes && parsed.connections) {
          setMultiWorkflows(prev => { const n = [...prev]; n[idx] = parsed; return n; });
          setError('');
        } else { setError('File does not contain valid n8n workflow.'); }
      } catch { setError('Invalid JSON file.'); }
    };
    reader.readAsText(file);
  }

  function addSlot() {
    if (multiWorkflows.length < 6) setMultiWorkflows(prev => [...prev, null]);
  }

  function removeSlot(idx) {
    if (multiWorkflows.length > 2) setMultiWorkflows(prev => prev.filter((_, i) => i !== idx));
  }

  function launchMulti() {
    const loaded = multiWorkflows
      .map((wf, i) => ({ wf, i }))
      .filter(s => s.wf !== null);
    if (loaded.length < 2) { setError('Upload at least 2 workflows.'); return; }
    setError('');
    // Put the marked main workflow first
    const mainEntry = loaded.find(s => s.i === mainSlotIdx) || loaded[0];
    const others = loaded.filter(s => s.i !== mainEntry.i);
    onLoadMulti([mainEntry.wf, ...others.map(s => s.wf)]);
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setError('Please upload a .json file.'); return;
    }
    const reader = new FileReader();
    reader.onload = e => parseAndLoad(e.target.result);
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#f8fafc',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {/* Grid bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Demo nodes preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, position: 'relative' }}>
        {[
          { label: 'Webhook', icon: '🌐', accent: '#6d5fcd', bg: '#f0eeff', border: '#c4bdf7' },
          { label: 'Supabase', icon: '🗄️', accent: '#2a9d6e', bg: '#ecfdf5', border: '#a7f3d0' },
          { label: 'Respond', icon: '↩️', accent: '#c48b06', bg: '#fffbeb', border: '#fde68a' },
        ].map((n, i) => (
          <React.Fragment key={n.label}>
            <div style={{
              background: n.bg, border: `1.5px solid ${n.border}`,
              borderLeft: `4px solid ${n.accent}`, borderRadius: 10,
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: n.accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{n.label}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#111827', marginTop: 1 }}>Click Tracker</div>
              </div>
            </div>
            {i < 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#d1d5db' }}>
                <div style={{ width: 24, height: 2, background: '#d1d5db' }} />
                <svg width="8" height="8" viewBox="0 0 8 8"><path d="M0 4h8M5 1l3 3-3 3" stroke="#d1d5db" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative' }}>
        <div style={{ fontSize: 40, fontWeight: 900, color: '#111827', letterSpacing: '-1.5px', lineHeight: 1 }}>
          Flow<span style={{ color: '#6366f1' }}>Sho</span>
        </div>
        <div style={{ fontSize: 14.5, color: '#6b7280', marginTop: 10, maxWidth: 420, lineHeight: 1.6 }}>
          Turning your n8n workflow into a live and animated demo in seconds.
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginTop: 18, justifyContent: 'center', background: '#f3f4f6', borderRadius: 10, padding: 3, width: 'fit-content', margin: '18px auto 0' }}>
          <button onClick={() => setMultiMode(false)} style={{
            padding: '7px 18px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: !multiMode ? '#fff' : 'transparent',
            color: !multiMode ? '#111827' : '#9ca3af',
            boxShadow: !multiMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>Single Workflow</button>
          <button onClick={() => setMultiMode(true)} style={{
            padding: '7px 18px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: multiMode ? '#fff' : 'transparent',
            color: multiMode ? '#6d28d9' : '#9ca3af',
            boxShadow: multiMode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>🔗 Multi-Workflow</button>
        </div>
      </div>

      {/* ── Multi-Workflow Mode ── */}
      {multiMode ? (
        <div style={{ width: '100%', maxWidth: 580, background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>Upload interconnected workflows</div>
          {multiWorkflows.map((wf, idx) => {
            const cc = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
            return (
              <div key={idx} style={{
                border: mainSlotIdx === idx
                  ? '2px solid #6366f1'
                  : `1.5px solid ${wf ? cc.accent : '#e5e7eb'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                display: 'flex', alignItems: 'center', gap: 10,
                background: mainSlotIdx === idx ? '#eef2ff' : wf ? cc.bg : '#f9fafb',
                transition: 'all 0.15s',
              }}>
                {/* Star — mark as main */}
                <button
                  onClick={() => setMainSlotIdx(idx)}
                  title="Set as main workflow"
                  style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, padding:'0 2px', opacity: mainSlotIdx === idx ? 1 : 0.25, flexShrink:0, transition:'opacity 0.15s' }}
                >⭐</button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: wf ? 2 : 0 }}>
                    {mainSlotIdx === idx && (
                      <span style={{ fontSize:9, fontWeight:800, color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.08em', background:'#e0e7ff', borderRadius:4, padding:'1px 5px' }}>MAIN</span>
                    )}
                    {wf ? (
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#111827' }}>{wf.name || `Workflow ${idx + 1}`}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>Workflow {idx + 1} — not uploaded</span>
                    )}
                  </div>
                  {wf && <div style={{ fontSize: 10, color: '#9ca3af' }}>{wf.nodes.length} nodes</div>}
                </div>

                <input
                  ref={el => multiFileRefs.current[idx] = el}
                  type="file" accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={e => handleMultiFile(idx, e.target.files[0])}
                />
                <button
                  onClick={() => multiFileRefs.current[idx]?.click()}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6,
                    background: wf ? '#f3f4f6' : cc.accent + '15', color: wf ? '#6b7280' : cc.accent,
                    border: `1px solid ${wf ? '#e5e7eb' : cc.border}`, cursor: 'pointer', flexShrink:0,
                  }}
                >{wf ? 'Replace' : 'Upload'}</button>
                {multiWorkflows.length > 2 && (
                  <button onClick={() => removeSlot(idx)} style={{
                    background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 16, padding: '0 4px',
                  }}>✕</button>
                )}
              </div>
            );
          })}
          {multiWorkflows.length < 6 && (
            <button onClick={addSlot} style={{
              width: '100%', padding: '8px', background: '#f9fafb', border: '1.5px dashed #d1d5db',
              borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#9ca3af', cursor: 'pointer', marginBottom: 14,
            }}>+ Add Workflow</button>
          )}
          {error && (
            <div style={{ fontSize: 12.5, color: '#dc2626', marginTop: 8, background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: 8 }}>
              ⚠ {error}
            </div>
          )}
          <button
            onClick={launchMulti}
            disabled={multiWorkflows.filter(Boolean).length < 2}
            style={{
              marginTop: 8, width: '100%', padding: '13px 0',
              background: multiWorkflows.filter(Boolean).length >= 2 ? '#6d28d9' : '#e5e7eb',
              color: multiWorkflows.filter(Boolean).length >= 2 ? '#fff' : '#9ca3af',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: multiWorkflows.filter(Boolean).length >= 2 ? 'pointer' : 'not-allowed',
              boxShadow: multiWorkflows.filter(Boolean).length >= 2 ? '0 2px 12px #7c3aed40' : 'none',
              transition: 'all 0.15s',
            }}
          >🔗 Launch Multi-Workflow Demo →</button>
        </div>
      ) : (
      <div style={{ width: '100%', maxWidth: 580, background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb', position: 'relative' }}>
        {/* File upload drop zone */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        <div
          onClick={() => fileInputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#6366f1' : '#d1d5db'}`,
            borderRadius: 10, padding: '18px 14px', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            background: dragOver ? '#eef2ff' : '#f9fafb',
            transition: 'all 0.15s',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: '#eef2ff', border: '1.5px solid #c7d2fe',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>📂</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Upload workflow JSON</div>
            <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>Click to browse or drag & drop your n8n .json file</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 500 }}>or paste JSON</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={'Paste your n8n workflow JSON here…'}
          style={{
            width: '100%', height: 160, background: '#f9fafb', color: '#111827',
            border: '1px solid #e5e7eb', borderRadius: 10, padding: 14,
            fontSize: 12, fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
            resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; }}
          onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
        />
        {error && (
          <div style={{ fontSize: 12.5, color: '#dc2626', marginTop: 8, background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: 8 }}>
            ⚠ {error}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={!text.trim()}
          style={{
            marginTop: 14, width: '100%', padding: '13px 0',
            background: text.trim() ? '#6366f1' : '#e5e7eb',
            color: text.trim() ? '#fff' : '#9ca3af',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            boxShadow: text.trim() ? '0 2px 12px #6366f140' : 'none',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { if (text.trim()) e.currentTarget.style.background = '#4f46e5'; }}
          onMouseOut={e => { if (text.trim()) e.currentTarget.style.background = '#6366f1'; }}
        >
          Generate Demo →
        </button>
      </div>
      )}

      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 16 }}>
        Works with any n8n workflow · No signup · No backend
      </div>

      {/* ── Example Workflows ───────────────────────── */}
      <div style={{ marginTop: 28, width: '100%', maxWidth: 580, position: 'relative' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, textAlign: 'center' }}>Or try an example</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {EXAMPLE_WORKFLOWS.filter(ex => ex.title !== 'welUp Outreach System').map(ex => (
            <button
              key={ex.title}
              onClick={() => onLoad(ex.data)}
              style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
                padding: '14px 12px', cursor: 'pointer', textAlign: 'left',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = ex.accent; e.currentTarget.style.boxShadow = `0 4px 16px ${ex.accent}20`; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
            >
              <span style={{ fontSize: 20 }}>{ex.icon}</span>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827' }}>{ex.title}</div>
              <div style={{ fontSize: 10.5, color: '#9ca3af', lineHeight: 1.4 }}>{ex.desc}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: ex.accent, marginTop: 2 }}>▶ Try it →</div>
            </button>
          ))}
        </div>

        {/* Multi-workflow example */}
        <button
          onClick={() => onLoadMulti(MULTI_WORKFLOW_EXAMPLE.workflows)}
          style={{
            width: '100%', marginTop: 10, background: '#faf5ff', border: '1.5px solid #ddd6fe',
            borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 4px 16px #7c3aed20'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#ddd6fe'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
        >
          <span style={{ fontSize: 22 }}>{MULTI_WORKFLOW_EXAMPLE.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827' }}>{MULTI_WORKFLOW_EXAMPLE.title}</div>
            <div style={{ fontSize: 10.5, color: '#9ca3af', lineHeight: 1.4 }}>{MULTI_WORKFLOW_EXAMPLE.desc}</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#6d28d9' }}>▶ Try it →</div>
        </button>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────
export default function App() {
  const [workflow, setWorkflow]           = useState(null);
  const [multiWorkflows, setMultiWorkflows] = useState(null);

  // Dynamic tab title
  useEffect(() => {
    if (workflow)       document.title = `${workflow.name || 'Workflow'} — FlowSho`;
    else if (multiWorkflows) document.title = `Multi-Workflow (${multiWorkflows.length}) — FlowSho`;
    else                document.title = 'FlowSho — n8n Workflow Visualizer';
  }, [workflow, multiWorkflows]);

  if (multiWorkflows) return <MultiFlowCanvas workflows={multiWorkflows} onReset={() => setMultiWorkflows(null)} />;

  if (workflow) return (
    <ReactFlowProvider>
      <FlowCanvas workflow={workflow} onReset={() => setWorkflow(null)} />
    </ReactFlowProvider>
  );

  return <PasteScreen onLoad={setWorkflow} onLoadMulti={setMultiWorkflows} />;
}