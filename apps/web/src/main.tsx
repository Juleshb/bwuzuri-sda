import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api} from './lib/api';
import './style.css';
import {watchConnectivity} from './lib/runtime';
import {syncNow} from './lib/sync';
import {isOfflineTrusted, queueWrite, refreshDeviceTrust} from './lib/offline';
import {Act, Btn, ConfirmModal, Icon, Modal, ReasonModal, type IconName} from './ui';

type Role = 'REGIONAL_LEADER' | 'CHURCH' | 'SECTION' | 'GROUP';
type User = {id?: number; fullName: string; role: Role; username?: string; churchId?: number | null};
type PageId = 'Dashboard' | 'Churches' | 'Contributions' | 'Budgets' | 'Ishuri ryo ku Isabato' | 'Expenses' | 'Assets' | 'Reports' | 'Users' | 'Devices';

const sid = () => crypto.randomUUID();
const roleLabel: Record<Role, string> = {REGIONAL_LEADER: 'Intara', CHURCH: 'Itorero', SECTION: 'Igihande', GROUP: 'Itsinda'};
const pages: Record<Role, PageId[]> = {
  REGIONAL_LEADER: ['Dashboard', 'Churches', 'Users', 'Budgets', 'Ishuri ryo ku Isabato', 'Expenses', 'Assets', 'Reports', 'Devices'],
  CHURCH: ['Dashboard', 'Churches', 'Users', 'Contributions', 'Budgets', 'Ishuri ryo ku Isabato', 'Expenses', 'Assets', 'Reports'],
  SECTION: ['Dashboard', 'Churches', 'Budgets', 'Ishuri ryo ku Isabato', 'Reports'],
  GROUP: ['Dashboard', 'Churches', 'Budgets', 'Ishuri ryo ku Isabato', 'Reports']
};
const nav: Record<PageId, {title: string; hint: string; about: string; icon: IconName}> = {
  Dashboard: {icon: 'home', title: 'Ahabanza', hint: 'Incamake', about: 'Imibare y’itorero, abizera, imisanzu, n’ingengo iri mu rwego rwawe.'},
  Churches: {icon: 'church', title: 'Amatorero', hint: 'Urwego n’abizera', about: 'Amatorero, ibihande, n’amatsinda. Abizera bandikwa mu itsinda.'},
  Contributions: {icon: 'coins', title: 'Imisanzu', hint: 'Amafaranga yinjiye', about: 'Itorero ni ryo ryonyine ryandika imisanzu. Amafaranga y’umwizera agaragara ku Itorero no ku Intara.'},
  Budgets: {icon: 'budget', title: 'Ingengo y’imari', hint: 'Intego n’ibyagezweho', about: 'Intara ikora period, imigendekere, n’intego. Abandi babona ibyagezweho mu rwego rwabo.'},
  'Ishuri ryo ku Isabato': {icon: 'book', title: 'Ishuri ryo ku Isabato', hint: 'Imibare y’itsinda', about: 'Itsinda ryandika imibare. Ibindi rwego rubona igiteranyo.'},
  Expenses: {icon: 'coins', title: 'Amafaranga asohoka', hint: 'Dépenses', about: 'Itorero ryandika ayo yasohoye. Ushobora kubihagarika niba byanditswe nabi.'},
  Assets: {icon: 'box', title: 'Ibikoresho', hint: 'Assets', about: 'Itorero ribika ibikoresho byaryo: umubare, agaciro, umurinzi, n’aho biri.'},
  Reports: {icon: 'chart', title: 'Raporo', hint: 'Abizera na budget', about: 'Raporo zikurikiza uburenganzira. Igihande n’Itsinda ntibibona amafaranga y’umwizera umwe.'},
  Users: {icon: 'user', title: 'Abakoresha', hint: 'Konti z’urwego', about: 'Intara iyobora konti zose. Itorero riyobora konti z’itorero ryaryo, ibihande, n’amatsinda byaryo.'},
  Devices: {icon: 'device', title: 'Devices offline', hint: 'Kwemera', about: 'Emeza ibikoresho bishobora gukora nta internet.'}
};
const statusLabel: Record<string, string> = {Draft: 'Igishushanyo', Active: 'Irimo gukora', Completed: 'Irangiye', Archived: 'Yabitswe'};

function money(value: unknown) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : `${n.toLocaleString('fr-RW')} RWF`;
}
function when(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('fr-RW', {dateStyle: 'medium'});
}
function day(value: unknown) {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
function groupsOf(churches: any[]) {
  return churches.flatMap(church => (church.sections || []).flatMap((section: any) => (section.groups || []).map((group: any) => ({
    id: group.id,
    label: `${church.name} · ${section.name} · ${group.name}`
  }))));
}
function Note({text}: {text: string}) {
  if (!text) return null;
  const ok = /neza|yemewe|bwakuweho|Byabitswe|Bibitswe/i.test(text);
  return <p className={ok ? 'note ok' : 'note bad'}>{text}</p>;
}
function Table({columns, rows, empty}: {columns: Array<{key: string; label: string; render?: (row: any) => React.ReactNode}>; rows: any[]; empty: string}) {
  const [q, setQ] = useState('');
  const shown = rows.filter(row => JSON.stringify(row).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <div className="toolbar">
        <label className="search"><Icon name="search" /><input placeholder="Shakisha muri iyi lisiti" value={q} onChange={e => setQ(e.target.value)} /></label>
        <span className="muted">{shown.length} / {rows.length}</span>
      </div>
      {!shown.length ? <div className="empty">{rows.length ? 'Nta gisubizo kihuye n’isho shakisha.' : empty}</div> : (
        <div className="tableWrap"><table><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>{shown.map((row, i) => <tr key={row.id || i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>)}</tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}

function LookupEditor({title, hint, path, rows, reload}: {title: string; hint: string; path: string; rows: any[]; reload: () => void}) {
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  function close() { setOpen(false); setEditId(null); setName(''); }
  async function save() {
    if (!name.trim()) return setMsg('Izina rirakenewe.');
    try {
      setMsg('');
      if (editId) await api(`${path}/${editId}`, {method: 'PATCH', body: JSON.stringify({name: name.trim()})});
      else await api(path, {method: 'POST', body: JSON.stringify({name: name.trim()})});
      close(); setMsg('Byabitswe neza.'); reload();
    } catch (e: any) { setMsg(e.message); }
  }
  async function toggle(row: any) {
    try {
      await api(`${path}/${row.id}/active`, {method: 'POST', body: JSON.stringify({isActive: row.isActive === false})});
      setMsg(row.isActive === false ? 'Byasubijwe neza.' : 'Byahagaritswe neza.');
      reload();
    } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section style={{marginBottom: 14}}>
      <div className="page-tools">
        <Btn icon="plus" onClick={() => { setEditId(null); setName(''); setMsg(''); setOpen(true); }}>{title}</Btn>
      </div>
      <p className="muted">{hint}</p>
      <Note text={msg} />
      <Table empty="Nta bwoko buraboneka." rows={rows} columns={[
        {key: 'name', label: 'Izina'},
        {key: 'isActive', label: 'Akora', render: r => r.isActive === false ? 'Oya' : 'Yego'},
        {key: 'action', label: '', render: r => <span className="row-actions"><Act icon="pencil" label="Hindura" onClick={() => { setEditId(r.id); setName(r.name); setMsg(''); setOpen(true); }} /><Act icon={r.isActive === false ? 'undo' : 'ban'} tone={r.isActive === false ? 'edit' : 'danger'} label={r.isActive === false ? 'Subiza' : 'Hagarika'} onClick={() => toggle(r)} /></span>}
      ]} />
      <Modal open={open} title={editId ? `Hindura: ${title}` : title} hint="Izina rigomba kuba irihariye." onClose={close}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <label>Izina<input value={name} onChange={e => setName(e.target.value)} autoFocus /></label>
          <Note text={open ? msg : ''} />
          <div className="actions">
            <Btn icon="save" type="submit">{editId ? 'Bika impinduka' : 'Ongeramo'}</Btn>
            <Btn icon="x" tone="secondary" onClick={close}>Reka</Btn>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function Login({done}: {done: (user: User) => void}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login() {
    if (!username.trim() || !password) return setError('Andika username na password.');
    try {
      setBusy(true); setError('');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8080/api') + '/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: username.trim(), password})});
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.token) throw Error(body.message || 'Login yanze. Reba username na password.');
      localStorage.setItem('token', body.token);
      localStorage.setItem('user', JSON.stringify(body.user));
      await refreshDeviceTrust(api).catch(() => false);
      done(body.user);
    } catch (e: any) { setError(e.message || 'Ntibishobotse kwinjira.'); } finally { setBusy(false); }
  }
  return (
    <div className="gate">
      <section className="gate-sabbath">
        <img src="/brand/sda-symbol-white.svg" alt="Ikimenyetso cy'Itorero ry'Abadiventisiti b'Umunsi wa Karindwi" />
      </section>
      <section className="gate-card">
        <form onSubmit={e => { e.preventDefault(); if (!busy) login(); }}>
          <p className="entity"><small>Intara ya Bwuzuri</small><strong>SYSTEM Y’INTARA YA BWUZURI</strong></p>
          <h2>Injira</h2>
          <p className="muted">Koresha konti yawe. Ubona gusa ibiri mu rwego rwawe.</p>
          <label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <button className="primary with-ico" disabled={busy}><Icon name="login" />{busy ? 'Tegereza...' : 'Injira'}</button>
          <Note text={error} />
        </form>
      </section>
    </div>
  );
}

function countOf(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('fr-RW') : '—';
}
function Bars({items, format}: {items: Array<{label: string; value: number; tone?: 'forest' | 'gold'}>; format?: (value: number) => string}) {
  const max = Math.max(1, ...items.map(item => item.value));
  if (!items.length) return <p className="muted">Nta mibare iraboneka.</p>;
  return (
    <div className="bars">
      {items.map(item => (
        <div className="bar-row" key={item.label}>
          <span className="bar-label" title={item.label}>{item.label}</span>
          <div className="bar-track" role="img" aria-label={`${item.label}: ${format ? format(item.value) : countOf(item.value)}`}>
            <span className={item.tone === 'gold' ? 'bar-fill gold' : 'bar-fill'} style={{width: `${(item.value / max) * 100}%`}} />
          </div>
          <b>{format ? format(item.value) : countOf(item.value)}</b>
        </div>
      ))}
    </div>
  );
}
function Kpi({icon, label, value, note, tone = 'denim'}: {icon: IconName; label: string; value: string; note: string; tone?: 'denim' | 'gold' | 'lead'}) {
  return (
    <article className={`kpi ${tone}`}>
      <span className="kpi-mark"><Icon name={icon} /></span>
      <div className="kpi-copy">
        <span>{label}</span>
        <b>{value}</b>
        <small>{note}</small>
      </div>
    </article>
  );
}
function Dashboard({user}: {user: User}) {
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const seesFinance = user.role === 'REGIONAL_LEADER' || user.role === 'CHURCH';
  useEffect(() => {
    const optional = (path: string) => api(path).catch(() => null);
    Promise.all([
      api('/churches'),
      optional('/members'),
      optional('/reports/summary'),
      optional('/budgets'),
      optional('/sabbath-school/summary'),
      seesFinance ? optional('/expenses') : Promise.resolve(null),
      seesFinance ? optional('/assets') : Promise.resolve(null)
    ]).then(([churches, members, summary, budgets, sabbath, expenses, assets]) => {
      setInfo({
        churches: Array.isArray(churches) ? churches : [],
        members: Array.isArray(members) ? members : [],
        summary,
        budgets: Array.isArray(budgets) ? budgets : [],
        sabbath,
        expenses: Array.isArray(expenses) ? expenses : [],
        assets: Array.isArray(assets) ? assets : []
      });
    }).catch((e: any) => setError(e.message));
  }, [seesFinance]);
  const churches = info?.churches || [];
  const members = info?.members || [];
  const sections = churches.reduce((n: number, church: any) => n + (church.sections?.length || 0), 0);
  const groups = churches.reduce((n: number, church: any) => n + (church.sections || []).reduce((m: number, section: any) => m + (section.groups?.length || 0), 0), 0);
  const activeMembers = info?.summary?.memberCount ?? members.filter((member: any) => member.isActive !== false).length;
  const inactiveMembers = members.filter((member: any) => member.isActive === false).length;
  const churchRows = churches.map((church: any) => {
    const churchGroups = (church.sections || []).flatMap((section: any) => section.groups || []);
    const ids = new Set(churchGroups.map((group: any) => group.id));
    const people = members.filter((member: any) => ids.has(member.groupId) || ids.has(member.group?.id));
    return {
      id: church.id,
      name: church.name,
      sections: (church.sections || []).length,
      groups: churchGroups.length,
      active: people.filter((member: any) => member.isActive !== false).length,
      inactive: people.filter((member: any) => member.isActive === false).length
    };
  });
  const expenseTotal = (info?.expenses || []).reduce((sum: number, row: any) => sum + Number(row.amountRwf || 0), 0);
  const assetValue = (info?.assets || []).reduce((sum: number, row: any) => sum + Number(row.valueRwf || 0), 0);
  const budget = (info?.budgets || []).find((row: any) => row.status === 'Active') || info?.budgets?.[0];
  const sabbathTotals = Object.entries(info?.sabbath?.totals || {});
  const today = new Date().toLocaleDateString('fr-RW', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  const pretty = (value: unknown) => { const text = day(value); if (!text) return ''; const d = new Date(`${text}T00:00:00`); return Number.isNaN(d.getTime()) ? text : d.toLocaleDateString('fr-RW', {day: 'numeric', month: 'long', year: 'numeric'}); };
  const period = budget && pretty(budget.startDate) && pretty(budget.endDate) ? `${pretty(budget.startDate)} – ${pretty(budget.endDate)}` : '';
  return (
    <section className="dash">
      <header className="dash-hero">
        <div>
          <h2>Murakaza neza, {user.fullName}</h2>
          <p className="dash-date">{roleLabel[user.role]} · {today}</p>
        </div>
      </header>
      {error && <Note text={error} />}
      <div className="kpi-grid">
        <Kpi icon="church" label="Amatorero" value={info ? countOf(churches.length) : '…'} note="Mu rwego rwawe" />
        <Kpi icon="home" label="Ibihande" value={info ? countOf(sections) : '…'} note="Bikora" />
        <Kpi icon="book" label="Amatsinda" value={info ? countOf(groups) : '…'} note="Bikora" />
        <Kpi icon="chart" label="Abizera" value={info ? countOf(activeMembers) : '…'} note={info ? `${countOf(inactiveMembers)} bahagaritswe` : 'Bakora'} />
      </div>
      <div className={seesFinance ? 'kpi-grid money' : 'kpi-grid money solo'}>
        <Kpi tone="lead" icon="coins" label="Imisanzu" value={info?.summary ? money(info.summary.totalContributed) : '…'} note={info?.summary ? `${countOf(info.summary.contributionEntries)} inyandiko` : 'Igiteranyo'} />
        {seesFinance && <Kpi tone="gold" icon="budget" label="Yasohotse" value={info ? money(expenseTotal) : '…'} note={info ? `${countOf(info.expenses.length)} inyandiko` : 'Amafaranga asohoka'} />}
        {seesFinance && <Kpi icon="box" label="Ibikoresho" value={info ? countOf(info.assets.length) : '…'} note={info ? `Agaciro ${money(assetValue)}` : 'Bikora'} />}
      </div>
      <div className="dash-charts">
        <article className="dash-panel">
          <h3>Abizera ku matorero</h3>
          {!info ? <p className="muted">Tegereza…</p> : <Bars items={churchRows.map((row: any) => ({label: row.name, value: row.active, tone: 'forest' as const}))} />}
        </article>
        {seesFinance && (
          <article className="dash-panel">
            <h3>Imisanzu na yasohotse</h3>
            {!info ? <p className="muted">Tegereza…</p> : <Bars format={value => money(value)} items={[
              {label: 'Imisanzu', value: Number(info.summary?.totalContributed || 0), tone: 'gold'},
              {label: 'Yasohotse', value: expenseTotal, tone: 'forest'}
            ]} />}
          </article>
        )}
      </div>
      <div className="dash-panels">
        <article className="dash-panel">
          <h3>Imibare y’amatorero</h3>
          {!info ? <p className="muted">Tegereza imibare…</p> : !churchRows.length ? <p className="muted">Nta torero riri muri ubu burenganzira.</p> : (
            <div className="church-board">
              <div className="church-line head"><span>Itorero</span><span>Ibihande</span><span>Amatsinda</span><span>Abizera</span><span>Bahagaritswe</span></div>
              {churchRows.map((row: any) => (
                <div className="church-line" key={row.id}>
                  <strong>{row.name}</strong>
                  <span>{countOf(row.sections)}</span>
                  <span>{countOf(row.groups)}</span>
                  <span>{countOf(row.active)}</span>
                  <span>{countOf(row.inactive)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
        <div className="dash-side">
          <article className="dash-panel">
            <h3>Ingengo y’imari</h3>
            {!info ? <p className="muted">Tegereza…</p> : !budget ? <p className="muted">Nta ngengo iraboneka.</p> : (
              <>
                <div className="dash-budget-head"><strong>{budget.name}</strong><span className="status">{statusLabel[budget.status] || budget.status}</span></div>
                {period && <p className="muted">{period}</p>}
                {(budget.metrics || []).length ? <Bars format={value => `${value.toLocaleString('fr-RW', {maximumFractionDigits: 1})}%`} items={(budget.metrics as any[]).map(metric => ({label: metric.name, value: Math.max(0, Number(metric.percentage) || 0), tone: 'gold' as const}))} /> : <p className="muted">Iyi ngengo nta gipimo ifite.</p>}
              </>
            )}
          </article>
          <article className="dash-panel">
            <h3>Ishuri ryo ku Isabato</h3>
            {!info ? <p className="muted">Tegereza…</p> : !info.sabbath?.entryCount ? <p className="muted">Nta mibare yanditswe.</p> : (
              <>
                <p className="muted">{countOf(info.sabbath.entryCount)} inyandiko</p>
                {sabbathTotals.length ? <Bars items={sabbathTotals.map(([name, value]) => ({label: name, value: Number(value) || 0}))} /> : <p className="muted">Inyandiko ntizifite imibare.</p>}
              </>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}

function Churches({user, rows, refresh}: {user: User; rows: any[]; refresh: () => void}) {
  const [churches, setChurches] = useState<any[]>([]);
  const [form, setForm] = useState<any>({orgKind: 'church'});
  const [sheet, setSheet] = useState<null | 'org' | 'member'>(null);
  const [msg, setMsg] = useState('');
  const [treeTick, setTreeTick] = useState(0);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const regional = user.role === 'REGIONAL_LEADER';
  useEffect(() => {
    api(regional ? '/churches?all=1' : '/churches').then(setChurches).catch((e: any) => setMsg(e.message));
  }, [regional, treeTick]);
  const activeTree = churches.filter(c => c.isActive !== false).map(c => ({
    ...c,
    sections: (c.sections || []).filter((s: any) => s.isActive !== false).map((s: any) => ({...s, groups: (s.groups || []).filter((g: any) => g.isActive !== false)}))
  }));
  useEffect(() => {
    if (!churches.length) return;
    if (pickedId != null && churches.some(church => church.id === pickedId)) return;
    const first = churches.find(church => church.isActive !== false) || churches[0];
    setPickedId(first.id);
  }, [churches, pickedId]);
  const selected = churches.find(church => church.id === pickedId) || null;
  const selectedActive = activeTree.find(church => church.id === pickedId);
  const options = groupsOf(selectedActive ? [selectedActive] : activeTree);
  const listed = churches.filter(church => church.name.toLowerCase().includes(query.trim().toLowerCase()));
  const groupIdsOf = (church: any) => new Set((church?.sections || []).flatMap((section: any) => (section.groups || []).map((group: any) => group.id)));
  const inChurch = (church: any, row: any) => row.group?.section?.churchId === church.id || groupIdsOf(church).has(row.groupId) || groupIdsOf(church).has(row.group?.id);
  const people = selected ? rows.filter(row => inChurch(selected, row)) : [];
  const sectionOptions = activeTree.flatMap(c => (c.sections || []).map((s: any) => ({id: s.id, label: `${c.name} · ${s.name}`})));
  const canAdd = user.role === 'CHURCH' || user.role === 'SECTION' || user.role === 'GROUP';
  async function saveMember() {
    if (!String(form.fullName || '').trim()) return setMsg('Amazina y’umwizera arakenewe.');
    if (user.role !== 'GROUP' && !form.groupId) return setMsg('Hitamo itsinda umwizera agomba kuba arimo.');
    try {
      setMsg('');
      const body: any = {fullName: String(form.fullName).trim(), phoneNumber: String(form.phoneNumber || '').trim(), groupId: form.groupId, isActive: true};
      if (form.memberId) {
        await api(`/members/${form.memberId}`, {method: 'PATCH', body: JSON.stringify(body)});
        setMsg('Umwizera yahinduwe neza.');
      } else {
        body.submissionId = sid();
        if (!navigator.onLine) { queueWrite('/members', 'POST', body); setMsg('Bibitswe kuri iyi device; bizoherezwa internet igarutse.'); setForm((f: any) => ({...f, memberId: undefined, fullName: '', phoneNumber: '', groupId: ''})); return; }
        await api('/members', {method: 'POST', body: JSON.stringify(body)});
        setMsg('Umwizera yabitswe neza.');
      }
      setForm((f: any) => ({...f, memberId: undefined, fullName: '', phoneNumber: '', groupId: ''}));
      setSheet(null);
      refresh();
    } catch (e: any) { setMsg(e.message); }
  }
  async function toggleMember(row: any) {
    try {
      await api(`/members/${row.id}/active`, {method: 'POST', body: JSON.stringify({isActive: row.isActive === false})});
      setMsg(row.isActive === false ? 'Umwizera yasubijwe neza.' : 'Umwizera yahagaritswe neza.');
      refresh();
    } catch (e: any) { setMsg(e.message); }
  }
  async function saveOrg() {
    const name = String(form.orgName || '').trim();
    const kind = form.orgKind || 'church';
    if (!name) return setMsg('Izina rirakenewe.');
    if (kind === 'section' && !form.orgChurchId) return setMsg('Hitamo itorero.');
    if (kind === 'group' && !form.orgSectionId) return setMsg('Hitamo igihande.');
    const path = kind === 'church' ? '/churches' : kind === 'section' ? '/sections' : '/groups';
    const body = kind === 'church' ? {name} : kind === 'section' ? {name, churchId: Number(form.orgChurchId)} : {name, sectionId: Number(form.orgSectionId)};
    try {
      setMsg('');
      const saved = form.orgId
        ? await api(`${path}/${form.orgId}`, {method: 'PATCH', body: JSON.stringify({name})})
        : await api(path, {method: 'POST', body: JSON.stringify(body)});
      if (kind === 'church' && saved?.id) setPickedId(saved.id);
      const accountUser = String(form.accountUsername || '').trim().toLowerCase();
      const accountPass = String(form.accountPassword || '');
      const accountName = String(form.accountFullName || '').trim();
      let accountNote = '';
      if (!form.orgId && (accountUser || accountPass || accountName)) {
        if (!accountName || !/^[a-z0-9._-]{3,40}$/.test(accountUser) || accountPass.length < 8) {
          accountNote = 'Urwego rwabitswe. Konti ntiyabitswe: andika amazina, username, n’ijambobanga rifite nibura inyuguti 8.';
        } else {
          const sectionRow = churches.flatMap((church: any) => (church.sections || []).map((section: any) => ({...section, churchId: church.id}))).find((section: any) => section.id === Number(form.orgSectionId));
          const scope = kind === 'church'
            ? {role: 'CHURCH', churchId: saved.id, sectionId: null, groupId: null}
            : kind === 'section'
              ? {role: 'SECTION', churchId: Number(form.orgChurchId), sectionId: saved.id, groupId: null}
              : {role: 'GROUP', churchId: sectionRow?.churchId, sectionId: Number(form.orgSectionId), groupId: saved.id};
          try {
            await api('/users', {method: 'POST', body: JSON.stringify({username: accountUser, password: accountPass, fullName: accountName, ...scope})});
            accountNote = 'Urwego n’ukoresha baryo byabitswe neza.';
          } catch (error: any) {
            accountNote = `Urwego rwabitswe, ariko konti ntiyabitswe. ${error.message || ''}`;
          }
        }
      }
      setMsg(accountNote || 'Urwego rwabitswe neza.');
      setForm((f: any) => ({...f, orgId: undefined, orgName: '', accountFullName: '', accountUsername: '', accountPassword: ''}));
      setSheet(null);
      setTreeTick(n => n + 1);
    } catch (e: any) { setMsg(e.message); }
  }
  async function toggleOrg(kind: 'church' | 'section' | 'group', row: any) {
    const path = kind === 'church' ? '/churches' : kind === 'section' ? '/sections' : '/groups';
    try {
      await api(`${path}/${row.id}/active`, {method: 'POST', body: JSON.stringify({isActive: row.isActive === false})});
      setMsg(row.isActive === false ? 'Byasubijwe neza.' : 'Byahagaritswe neza.');
      setTreeTick(n => n + 1);
    } catch (e: any) { setMsg(e.message); }
  }
  function editOrg(kind: 'church' | 'section' | 'group', row: any, churchId?: number, sectionId?: number) {
    setMsg('');
    setForm((f: any) => ({...f, orgKind: kind, orgId: row.id, orgName: row.name, orgChurchId: churchId || '', orgSectionId: sectionId || ''}));
    setSheet('org');
  }
  return (
    <div className="stack">
      <div className="church-pick">
        <div className="pick-pane">
          <div className="pick-tools">
            <label className="search"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Shakisha itorero" /></label>
            {regional && <Btn icon="plus" onClick={() => { setMsg(''); setForm((f: any) => ({...f, orgId: undefined, orgName: '', orgKind: 'church'})); setSheet('org'); }}>Itorero</Btn>}
          </div>
          <div className="pick-list" role="listbox" aria-label="Amatorero">
            {listed.map(church => {
              const sections = church.sections || [];
              const groups = sections.reduce((n: number, section: any) => n + (section.groups?.length || 0), 0);
              const believers = rows.filter(row => row.isActive !== false && inChurch(church, row)).length;
              return (
                <button key={church.id} type="button" role="option" aria-selected={church.id === pickedId} className={church.id === pickedId ? 'pick-item on' : 'pick-item'} onClick={() => setPickedId(church.id)}>
                  <strong>{church.name}</strong>
                  <small>{sections.length} ibihande · {groups} amatsinda · {believers} abizera</small>
                  {church.isActive === false && <span className="status">Yahagaritswe</span>}
                </button>
              );
            })}
            {!listed.length && <p className="muted">Nta torero ribonetse.</p>}
          </div>
        </div>
        <section className="pick-detail">
          {!selected ? <p className="muted">Hitamo itorero.</p> : (
            <>
              <header className="pick-head">
                <div>
                  <small>Itorero</small>
                  <h3>{selected.name}</h3>
                  <p className="muted">{(selected.sections || []).length} ibihande · {people.filter(row => row.isActive !== false).length} abizera bakora</p>
                </div>
                <div className="row-actions">
                  {regional && <Act icon="pencil" label="Hindura" onClick={() => editOrg('church', selected)} />}
                  {regional && <Act icon={selected.isActive === false ? 'undo' : 'ban'} tone={selected.isActive === false ? 'edit' : 'danger'} label={selected.isActive === false ? 'Subiza' : 'Hagarika'} onClick={() => toggleOrg('church', selected)} />}
                  {regional && <Btn icon="plus" onClick={() => { setMsg(''); setForm((f: any) => ({...f, orgId: undefined, orgName: '', orgKind: 'section', orgChurchId: selected.id})); setSheet('org'); }}>Igihande</Btn>}
                  {canAdd && <Btn icon="plus" onClick={() => { setMsg(''); setForm((f: any) => ({...f, memberId: undefined, fullName: '', phoneNumber: '', groupId: ''})); setSheet('member'); }}>Umwizera</Btn>}
                </div>
              </header>
              {selected.isActive === false && <p className="note">Iri torero ryahagaritswe.</p>}
              {(selected.sections || []).length ? (selected.sections || []).map((section: any) => (
                <article className="section-card" key={section.id}>
                  <div className="org-row">
                    <div className="org-name"><small>Igihande</small><strong>{section.name}</strong>{section.isActive === false && <span className="status">Yahagaritswe</span>}</div>
                    {regional && <span className="row-actions">
                      <Btn icon="plus" tone="secondary" onClick={() => { setMsg(''); setForm((f: any) => ({...f, orgId: undefined, orgName: '', orgKind: 'group', orgSectionId: section.id})); setSheet('org'); }}>Itsinda</Btn>
                      <Act icon="pencil" label="Hindura" onClick={() => editOrg('section', section, selected.id)} />
                      <Act icon={section.isActive === false ? 'undo' : 'ban'} tone={section.isActive === false ? 'edit' : 'danger'} label={section.isActive === false ? 'Subiza' : 'Hagarika'} onClick={() => toggleOrg('section', section)} />
                    </span>}
                  </div>
                  {(section.groups || []).length ? (section.groups || []).map((group: any) => (
                    <div className="group-line" key={group.id}>
                      <div className="org-name"><small>Itsinda</small><span>{group.name}</span>{group.isActive === false && <span className="status">Yahagaritswe</span>}</div>
                      {regional && <span className="row-actions"><Act icon="pencil" label="Hindura" onClick={() => editOrg('group', group, selected.id, section.id)} /><Act icon={group.isActive === false ? 'undo' : 'ban'} tone={group.isActive === false ? 'edit' : 'danger'} label={group.isActive === false ? 'Subiza' : 'Hagarika'} onClick={() => toggleOrg('group', group)} /></span>}
                    </div>
                  )) : <p className="muted">Nta tsinda.</p>}
                </article>
              )) : <p className="muted">Iri torero nta gihande rigifite.</p>}
              {!canAdd && <p className="muted">Intara ireba abizera. Kwiyandikisha no guhindura bikorwa n’Itorero, Igihande, cyangwa Itsinda.</p>}
              <Note text={sheet ? '' : msg} />
              <Table empty="Nta mwizera wanditswe muri iri torero." rows={people} columns={[
          {key: 'fullName', label: 'Amazina'},
          {key: 'phoneNumber', label: 'Telefoni', render: r => r.phoneNumber || '—'},
          {key: 'section', label: 'Igihande', render: r => r.group?.section?.name || '—'},
          {key: 'group', label: 'Itsinda', render: r => r.group?.name || '—'},
          {key: 'isActive', label: 'Akora', render: r => r.isActive === false ? 'Oya' : 'Yego'},
          {key: 'action', label: '', render: r => canAdd ? <span className="row-actions"><Act icon="pencil" label="Hindura" onClick={() => { setMsg(''); setForm((f: any) => ({...f, memberId: r.id, fullName: r.fullName, phoneNumber: r.phoneNumber || '', groupId: r.groupId || r.group?.id || ''})); setSheet('member'); }} /><Act icon={r.isActive === false ? 'undo' : 'ban'} tone={r.isActive === false ? 'edit' : 'danger'} label={r.isActive === false ? 'Subiza' : 'Hagarika'} onClick={() => toggleMember(r)} /></span> : null}
        ]} />
            </>
          )}
        </section>
      </div>
      <Modal open={sheet === 'org'} title={form.orgId ? 'Hindura urwego' : 'Ongeramo urwego'} hint="Hitamo niba ari itorero, igihande, cyangwa itsinda." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); saveOrg(); }}>
          <label>Ubwoko<select value={form.orgKind || 'church'} onChange={e => setForm({...form, orgKind: e.target.value, orgId: undefined})}><option value="church">Itorero</option><option value="section">Igihande</option><option value="group">Itsinda</option></select></label>
          {form.orgKind === 'section' && <label>Itorero<select value={form.orgChurchId || ''} onChange={e => setForm({...form, orgChurchId: e.target.value})}><option value="">Hitamo</option>{activeTree.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {form.orgKind === 'group' && <label>Igihande<select value={form.orgSectionId || ''} onChange={e => setForm({...form, orgSectionId: e.target.value})}><option value="">Hitamo</option>{sectionOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}
          <label>Izina<input value={form.orgName || ''} onChange={e => setForm({...form, orgName: e.target.value})} autoFocus /></label>
          {!form.orgId && <>
            <p className="muted">Konti iyobora iri {form.orgKind === 'group' ? 'tsinda' : form.orgKind === 'section' ? 'gihande' : 'torero'}. Siga ubusa niba utayishaka ubu.</p>
            <label>Amazina y’ukoresha<input value={form.accountFullName || ''} onChange={e => setForm({...form, accountFullName: e.target.value})} /></label>
            <div className="form-row">
              <label>Username<input value={form.accountUsername || ''} onChange={e => setForm({...form, accountUsername: e.target.value})} autoComplete="off" /></label>
              <label>Ijambobanga<input type="password" value={form.accountPassword || ''} onChange={e => setForm({...form, accountPassword: e.target.value})} autoComplete="new-password" /></label>
            </div>
          </>}
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.orgId ? 'Bika impinduka' : 'Ongeramo'}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>Reka</Btn>
          </div>
        </form>
      </Modal>
      <Modal open={sheet === 'member'} title={form.memberId ? 'Hindura umwizera' : 'Ongeramo umwizera'} hint="Telefoni, niba uyandika, igomba kuba iyihariye." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); saveMember(); }}>
          <div className="form-row">
            <label>Amazina yose<input value={form.fullName || ''} onChange={e => setForm({...form, fullName: e.target.value})} autoFocus /></label>
            <label>Telefoni<input value={form.phoneNumber || ''} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="+250..." /></label>
          </div>
          {user.role !== 'GROUP' && <label>Itsinda<select value={form.groupId || ''} onChange={e => setForm({...form, groupId: e.target.value})}><option value="">Hitamo</option>{options.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>}
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.memberId ? 'Bika impinduka' : 'Bika umwizera'}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>Reka</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Contributions({rows, refresh}: {rows: any[]; refresh: () => void}) {
  const [meta, setMeta] = useState<any>({members: [], types: []});
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<any>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { Promise.all([api('/members'), api('/contribution-types')]).then(([members, types]) => setMeta({members, types})).catch((e: any) => setMsg(e.message)); }, []);
  async function save() {
    if (!form.contributionTypeId) return setMsg('Hitamo ubwoko bw’imisanzu, nk’Itithe cyangwa Ingoboka.');
    if (!(Number(form.amountRwf) > 0)) return setMsg('Andika amafaranga arenga 0.');
    try {
      setMsg('');
      const body: any = {memberId: form.memberId || null, contributionTypeId: Number(form.contributionTypeId), amountRwf: Number(form.amountRwf)};
      if (form.id) {
        await api(`/contributions/${form.id}`, {method: 'PATCH', body: JSON.stringify(body)});
        setMsg('Imisanzu yahinduwe neza.');
      } else {
        body.submissionId = sid();
        if (!navigator.onLine) { queueWrite('/contributions', 'POST', body); setMsg('Bibitswe kuri iyi device; bizoherezwa internet igarutse.'); setForm({}); return; }
        await api('/contributions', {method: 'POST', body: JSON.stringify(body)});
        setMsg('Imisanzu yabitswe neza.');
      }
      setForm({}); setOpen(false); refresh();
    } catch (e: any) { setMsg(e.message); }
  }
  async function cancel(reason: string) {
    if (!reasonFor) return;
    try { await api(`/contributions/${reasonFor.id}/cancel`, {method: 'POST', body: JSON.stringify({reason})}); setMsg('Imisanzu yahagaritswe neza.'); setReasonFor(null); setForm({}); setOpen(false); refresh(); } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section>
      <div className="page-tools"><Btn icon="plus" onClick={() => { setMsg(''); setForm({}); setOpen(true); }}>Imisanzu</Btn></div>
      <Note text={open || reasonFor ? '' : msg} />
      <Table empty="Nta misanzu yanditswe." rows={rows} columns={[
        {key: 'who', label: 'Umwizera', render: r => r.member?.fullName || 'Rusange'},
        {key: 'type', label: 'Ubwoko', render: r => r.contributionType?.name || '—'},
        {key: 'amountRwf', label: 'Amafaranga', render: r => r.amountRwf == null ? 'Yatanzwe' : money(r.amountRwf)},
        {key: 'receivedAt', label: 'Itariki', render: r => when(r.receivedAt)},
        {key: 'action', label: '', render: r => <span className="row-actions"><Act icon="pencil" label="Hindura" onClick={() => { setMsg(''); setForm({id: r.id, memberId: r.memberId || '', contributionTypeId: r.contributionTypeId, amountRwf: r.amountRwf}); setOpen(true); }} /><Act icon="ban" tone="danger" label="Hagarika" onClick={() => setReasonFor(r)} /></span>}
      ]} />
      <Modal open={open} title={form.id ? 'Hindura imisanzu' : 'Andika imisanzu'} hint="Rusange ni amafaranga atari ay’umuntu umwe." onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="form-row">
            <label>Umwizera<select value={form.memberId || ''} onChange={e => setForm({...form, memberId: e.target.value})}><option value="">Rusange / nta muntu umwe</option>{meta.members.map((m: any) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select></label>
            <label>Ubwoko<select value={form.contributionTypeId || ''} onChange={e => setForm({...form, contributionTypeId: e.target.value})}><option value="">Hitamo</option>{meta.types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          </div>
          <label>Amafaranga (RWF)<input type="number" min="1" value={form.amountRwf || ''} onChange={e => setForm({...form, amountRwf: e.target.value})} autoFocus /></label>
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.id ? 'Bika impinduka' : 'Bika imisanzu'}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>Reka</Btn>
          </div>
        </form>
      </Modal>
      <ReasonModal open={!!reasonFor} title="Hagarika imisanzu" onClose={() => setReasonFor(null)} onConfirm={cancel} />
    </section>
  );
}

function Expenses({user, rows, refresh}: {user: User; rows: any[]; refresh: () => void}) {
  const [types, setTypes] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [typeTick, setTypeTick] = useState(0);
  const regional = user.role === 'REGIONAL_LEADER';
  useEffect(() => { api(regional ? '/expenses/types?all=1' : '/expenses/types').then(setTypes).catch((e: any) => setMsg(e.message)); }, [regional, typeTick]);
  const activeTypes = types.filter(t => t.isActive !== false);
  const typeName = (id: number) => types.find(t => t.id === id)?.name || '—';
  async function save() {
    if (!form.expenseTypeId) return setMsg('Hitamo ubwoko bw’amafaranga asohoka.');
    if (!(Number(form.amountRwf) > 0)) return setMsg('Andika amafaranga arenga 0.');
    if (!String(form.description || '').trim()) return setMsg('Sobanura icyo amafaranga yakoreshejwe.');
    try {
      setMsg('');
      const body: any = {expenseTypeId: Number(form.expenseTypeId), amountRwf: Number(form.amountRwf), description: String(form.description).trim(), payee: String(form.payee || '').trim(), reference: String(form.reference || '').trim(), paidOn: form.paidOn || undefined};
      if (form.id) {
        await api(`/expenses/${form.id}`, {method: 'PATCH', body: JSON.stringify(body)});
        setMsg('Byahinduwe neza.');
      } else {
        body.submissionId = sid();
        if (!navigator.onLine) { queueWrite('/expenses', 'POST', body); setMsg('Bibitswe kuri iyi device; bizoherezwa internet igarutse.'); setForm({}); return; }
        await api('/expenses', {method: 'POST', body: JSON.stringify(body)});
        setMsg('Byabitswe neza.');
      }
      setForm({}); setOpen(false); refresh();
    } catch (e: any) { setMsg(e.message); }
  }
  async function cancel(reason: string) {
    if (!reasonFor) return;
    try { await api(`/expenses/${reasonFor}/cancel`, {method: 'POST', body: JSON.stringify({reason})}); setMsg('Nyandiko yahagaritswe neza.'); setReasonFor(null); refresh(); } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section>
      {regional && <LookupEditor title="Ubwoko bw’amafaranga asohoka" hint="Intara ni yo yongeramo, ihindura, kandi ihagarika ubwoko. Itorero rikoresha ubwoko bukora gusa." path="/expenses/types" rows={types} reload={() => setTypeTick(n => n + 1)} />}
      {user.role === 'CHURCH' && <div className="page-tools"><Btn icon="plus" onClick={() => { setMsg(''); setForm({}); setOpen(true); }}>Amafaranga yasohotse</Btn></div>}
      {user.role !== 'CHURCH' && <p className="muted">Urebere amafaranga yasohotse mu rwego rwawe. Kwiyandika no guhindura bikorwa n’Itorero ryayanditse.</p>}
      <Note text={open || reasonFor ? '' : msg} />
      <Table empty="Nta mafaranga asohoka yanditswe." rows={rows} columns={[
        {key: 'paidOn', label: 'Itariki', render: r => when(r.paidOn)},
        {key: 'type', label: 'Ubwoko', render: r => typeName(r.expenseTypeId)},
        {key: 'description', label: 'Ibisobanuro'},
        {key: 'amountRwf', label: 'Amafaranga', render: r => money(r.amountRwf)},
        {key: 'payee', label: 'Uwahawe', render: r => r.payee || '—'},
        {key: 'action', label: '', render: r => user.role === 'CHURCH' ? <span className="row-actions"><Act icon="pencil" label="Hindura" onClick={() => { setMsg(''); setForm({id: r.id, expenseTypeId: r.expenseTypeId, amountRwf: r.amountRwf, description: r.description, payee: r.payee || '', reference: r.reference || '', paidOn: day(r.paidOn)}); setOpen(true); }} /><Act icon="ban" tone="danger" label="Hagarika" onClick={() => setReasonFor(r.id)} /></span> : null}
      ]} />
      <Modal open={open} title={form.id ? 'Hindura amafaranga yasohotse' : 'Andika amafaranga yasohotse'} onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="form-row">
            <label>Ubwoko<select value={form.expenseTypeId || ''} onChange={e => setForm({...form, expenseTypeId: e.target.value})}><option value="">Hitamo</option>{activeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label>Amafaranga (RWF)<input type="number" min="1" value={form.amountRwf || ''} onChange={e => setForm({...form, amountRwf: e.target.value})} /></label>
          </div>
          <label>Ibisobanuro<textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></label>
          <div className="form-row">
            <label>Uwahawe<input value={form.payee || ''} onChange={e => setForm({...form, payee: e.target.value})} /></label>
            <label>Referansi<input value={form.reference || ''} onChange={e => setForm({...form, reference: e.target.value})} /></label>
          </div>
          <label>Itariki yo kwishyura<input type="date" value={form.paidOn || ''} onChange={e => setForm({...form, paidOn: e.target.value})} /></label>
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.id ? 'Bika impinduka' : 'Bika'}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>Reka</Btn>
          </div>
        </form>
      </Modal>
      <ReasonModal open={reasonFor != null} title="Hagarika amafaranga yasohotse" onClose={() => setReasonFor(null)} onConfirm={cancel} />
    </section>
  );
}

function Assets({user, rows, refresh}: {user: User; rows: any[]; refresh: () => void}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [catTick, setCatTick] = useState(0);
  const regional = user.role === 'REGIONAL_LEADER';
  useEffect(() => { api(regional ? '/assets/categories?all=1' : '/assets/categories').then(setCategories).catch((e: any) => setMsg(e.message)); }, [regional, catTick]);
  const activeCategories = categories.filter(c => c.isActive !== false);
  const categoryName = (id: number) => categories.find(c => c.id === id)?.name || '—';
  async function save() {
    if (!form.assetCategoryId) return setMsg('Hitamo icyiciro cy’ikoresho.');
    if (!String(form.name || '').trim()) return setMsg('Andika izina ry’ikoresho.');
    if (form.quantity === '' || Number(form.quantity) < 0) return setMsg('Andika umubare uri 0 cyangwa urenga.');
    try {
      setMsg('');
      const body: any = {assetCategoryId: Number(form.assetCategoryId), name: String(form.name).trim(), quantity: Number(form.quantity), valueRwf: form.valueRwf === '' || form.valueRwf == null ? null : Number(form.valueRwf), location: form.location || '', custodian: form.custodian || '', condition: form.condition || '', notes: form.notes || ''};
      if (form.id) {
        await api(`/assets/${form.id}`, {method: 'PATCH', body: JSON.stringify(body)});
        setMsg('Igikoresho cyahinduwe neza.');
      } else {
        body.submissionId = sid();
        if (!navigator.onLine) { queueWrite('/assets', 'POST', body); setMsg('Bibitswe kuri iyi device; bizoherezwa internet igarutse.'); setForm({}); return; }
        await api('/assets', {method: 'POST', body: JSON.stringify(body)});
        setMsg('Igikoresho cyabitswe neza.');
      }
      setForm({}); setOpen(false); refresh();
    } catch (e: any) { setMsg(e.message); }
  }
  async function archive() {
    if (archiveId == null) return;
    try { await api(`/assets/${archiveId}/archive`, {method: 'POST', body: '{}'}); setMsg('Cyashyizwe mu bubiko neza.'); setArchiveId(null); refresh(); } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section>
      {regional && <LookupEditor title="Ibyiciro by’ibikoresho" hint="Intara ni yo yongeramo, ihindura, kandi ihagarika icyiciro. Itorero rikoresha ibyiciro bikora gusa." path="/assets/categories" rows={categories} reload={() => setCatTick(n => n + 1)} />}
      {user.role === 'CHURCH' && <div className="page-tools"><Btn icon="plus" onClick={() => { setMsg(''); setForm({}); setOpen(true); }}>Igikoresho</Btn></div>}
      <Note text={open || archiveId != null ? '' : msg} />
      <Table empty="Nta bikoresho byanditswe." rows={rows} columns={[
        {key: 'name', label: 'Izina'},
        {key: 'category', label: 'Icyiciro', render: r => categoryName(r.assetCategoryId)},
        {key: 'quantity', label: 'Umubare'},
        {key: 'valueRwf', label: 'Agaciro', render: r => r.valueRwf == null ? '—' : money(r.valueRwf)},
        {key: 'location', label: 'Aho kiri', render: r => r.location || '—'},
        {key: 'custodian', label: 'Umurinzi', render: r => r.custodian || '—'},
        {key: 'action', label: '', render: r => user.role === 'CHURCH' ? <span className="row-actions"><Act icon="pencil" label="Hindura" onClick={() => { setMsg(''); setForm({id: r.id, assetCategoryId: r.assetCategoryId, name: r.name, quantity: r.quantity, valueRwf: r.valueRwf ?? '', location: r.location || '', custodian: r.custodian || '', condition: r.condition || '', notes: r.notes || ''}); setOpen(true); }} /><Act icon="archive" tone="danger" label="Bika" onClick={() => setArchiveId(r.id)} /></span> : null}
      ]} />
      <Modal open={open} title={form.id ? 'Hindura igikoresho' : 'Andika igikoresho'} onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="form-row">
            <label>Icyiciro<select value={form.assetCategoryId || ''} onChange={e => setForm({...form, assetCategoryId: e.target.value})}><option value="">Hitamo</option>{activeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Izina<input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></label>
          </div>
          <div className="form-row">
            <label>Umubare<input type="number" min="0" value={form.quantity || ''} onChange={e => setForm({...form, quantity: e.target.value})} /></label>
            <label>Agaciro (RWF)<input type="number" min="0" value={form.valueRwf || ''} onChange={e => setForm({...form, valueRwf: e.target.value})} /></label>
          </div>
          <div className="form-row">
            <label>Aho kiri<input value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} /></label>
            <label>Umurinzi<input value={form.custodian || ''} onChange={e => setForm({...form, custodian: e.target.value})} /></label>
          </div>
          <label>Imiterere<input value={form.condition || ''} onChange={e => setForm({...form, condition: e.target.value})} /></label>
          <label>Andi makuru<textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></label>
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.id ? 'Bika impinduka' : 'Bika igikoresho'}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>Reka</Btn>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={archiveId != null} title="Gushyira igikoresho mu bubiko" hint="Ntikigaragara muri lisiti ikora." confirm="Bika" danger onClose={() => setArchiveId(null)} onConfirm={archive} />
    </section>
  );
}

function Sabbath({user, rows, refresh}: {user: User; rows: any[]; refresh: () => void}) {
  const [stats, setStats] = useState<Array<{name: string; value: string}>>([{name: 'Abari', value: ''}, {name: 'Abasuye', value: ''}]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api('/sabbath-school/summary').then(setSummary).catch(() => setSummary(null)); }, [rows]);
  async function save() {
    const payload = Object.fromEntries(stats.filter(s => s.name.trim() && s.value !== '').map(s => [s.name.trim(), Number(s.value)]));
    if (!Object.keys(payload).length) return setMsg('Andikamo nibura igipimo kimwe gifite umubare.');
    try {
      setMsg('');
      if (editingId) {
        await api(`/sabbath-school/${editingId}`, {method: 'PATCH', body: JSON.stringify({payload})});
        setMsg('Imibare yahinduwe neza.');
        setEditingId(null);
        setOpen(false);
      } else {
        const body = {payload, submissionId: sid()};
        if (!navigator.onLine) { queueWrite('/sabbath-school', 'POST', body); setMsg('Bibitswe kuri iyi device; bizoherezwa internet igarutse.'); return; }
        await api('/sabbath-school', {method: 'POST', body: JSON.stringify(body)});
        setMsg('Imibare yabitswe neza.');
        setOpen(false);
      }
      refresh();
    } catch (e: any) { setMsg(e.message); }
  }
  async function remove() {
    if (removeId == null) return;
    try { await api(`/sabbath-school/${removeId}`, {method: 'DELETE'}); setMsg('Imibare yasibwe neza.'); if (editingId === removeId) { setEditingId(null); setOpen(false); } setRemoveId(null); refresh(); } catch (e: any) { setMsg(e.message); }
  }
  function edit(row: any) {
    const payload = row.payloadJson && typeof row.payloadJson === 'object' ? row.payloadJson : {};
    const next = Object.entries(payload).map(([name, value]) => ({name, value: String(value)}));
    setStats(next.length ? next : [{name: '', value: ''}]);
    setEditingId(row.id);
    setMsg('');
    setOpen(true);
  }
  return (
    <section>
      {summary && <div className="cards" style={{marginBottom: 14}}><div className="stat"><span>Inyandiko</span><b>{summary.entryCount}</b></div>{Object.entries(summary.totals || {}).map(([k, v]) => <div className="stat" key={k}><span>{k}</span><b>{String(v)}</b></div>)}</div>}
      {user.role === 'GROUP' ? <div className="page-tools"><Btn icon="plus" onClick={() => { setEditingId(null); setStats([{name: 'Abari', value: ''}, {name: 'Abasuye', value: ''}]); setMsg(''); setOpen(true); }}>Imibare y’uyu munsi</Btn></div> : <p className="muted">Urebere igiteranyo. Kwiyandika bikorwa n’Itsinda gusa.</p>}
      <Note text={open || removeId != null ? '' : msg} />
      <Table empty="Nta mibare y’Ishuri ryo ku Isabato iraboneka." rows={rows} columns={[
        {key: 'entryDateUtc', label: 'Itariki', render: r => when(r.entryDateUtc)},
        {key: 'payload', label: 'Imibare', render: r => r.payloadJson && typeof r.payloadJson === 'object' ? Object.entries(r.payloadJson).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'},
        {key: 'action', label: '', render: r => user.role === 'GROUP' ? <span className="row-actions"><Act icon="pencil" label="Hindura" onClick={() => edit(r)} /><Act icon="trash" tone="danger" label="Siba" onClick={() => setRemoveId(r.id)} /></span> : null}
      ]} />
      <Modal open={open} title={editingId ? 'Hindura imibare' : 'Andika imibare y’uyu munsi'} hint="Urugero: Abari, Abasuye, Abitabiriye." onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          {stats.map((s, i) => (
            <div className="form-row" key={i}>
              <label>Igipimo<input value={s.name} onChange={e => setStats(stats.map((x, n) => n === i ? {...x, name: e.target.value} : x))} /></label>
              <label>Umubare<input type="number" min="0" value={s.value} onChange={e => setStats(stats.map((x, n) => n === i ? {...x, value: e.target.value} : x))} /></label>
            </div>
          ))}
          <div className="actions">
            <Btn icon="plus" tone="secondary" onClick={() => setStats([...stats, {name: '', value: ''}])}>Igipimo</Btn>
            {stats.length > 1 && <Btn icon="trash" tone="secondary" onClick={() => setStats(stats.slice(0, -1))}>Kuramo</Btn>}
          </div>
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{editingId ? 'Bika impinduka' : 'Bika imibare'}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>Reka</Btn>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={removeId != null} title="Siba imibare" hint="Iyi nyandiko y’Ishuri ryo ku Isabato izasibwa burundu." confirm="Siba" danger onClose={() => setRemoveId(null)} onConfirm={remove} />
    </section>
  );
}

function Budgets({user}: {user: User}) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [churches, setChurches] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState<any>({level: 'church'});
  const [sheet, setSheet] = useState<null | 'period' | 'edit' | 'metric' | 'alloc' | 'achieve'>(null);
  const [confirm, setConfirm] = useState<null | 'budget' | {metricId: number}>(null);
  const [msg, setMsg] = useState('');
  const load = () => Promise.all([api('/budgets'), api('/churches'), api(user.role === 'REGIONAL_LEADER' ? '/contribution-types?all=1' : '/contribution-types'), api('/members')]).then(([b, c, t, m]) => { setBudgets(b); setChurches(c); setTypes(t); setMembers(m); }).catch((e: any) => setMsg(e.message));
  useEffect(() => { load(); }, []);
  const selected = budgets.find(b => b.id === Number(form.budgetId)) || budgets[0];
  const metrics = selected?.metrics || [];
  const metric = metrics.find((m: any) => m.id === Number(form.metricId)) || metrics[0];
  const level = form.level || 'church';
  const entities = level === 'church' ? churches : level === 'section' ? churches.flatMap((c: any) => c.sections || []) : level === 'group' ? churches.flatMap((c: any) => (c.sections || []).flatMap((s: any) => s.groups || [])) : members;
  async function call(path: string, method: string, body?: any) {
    try { await api(path, {method, ...(body === undefined ? {} : {body: JSON.stringify(body)})}); setMsg('Byabitswe neza.'); setSheet(null); setConfirm(null); await load(); return true; } catch (e: any) { setMsg(e.message); return false; }
  }
  const rows = budgets.flatMap(b => (b.metrics || []).map((m: any) => ({id: `${b.id}-${m.id}`, period: b.name, status: statusLabel[b.status] || b.status, metric: m.name, target: m.target, achievement: m.achievement, percentage: `${m.percentage}%`, remaining: m.remaining})));
  return (
    <section>
      <p className="muted">Igishushanyo ni ho Intego zihinduka. Iyo period igizwe irimo gukora, intego zihagarara. Hanyuma igira irangiye, ikabikwa. Igishushanyo gusa ni cyo gishobora guhindurwa cyangwa gusibwa.</p>
      {user.role === 'REGIONAL_LEADER' && <LookupEditor title="Ubwoko bw’imisanzu" hint="Ubu bwoko ni bwo buhuzwa n’ingengo y’imari n’imisanzu. Ubwoko bwahagaritswe ntibugaragara ku Itorero." path="/contribution-types" rows={types} reload={load} />}
      {user.role === 'REGIONAL_LEADER' && (
        <div className="page-tools">
          <Btn icon="plus" onClick={() => { setMsg(''); setSheet('period'); }}>Period</Btn>
          {selected?.status === 'Draft' && <Btn icon="plus" tone="secondary" onClick={() => { setMsg(''); setForm((f: any) => ({...f, metricEditId: undefined, metricName: '', unit: '', targetQuantity: '', unitPriceRwf: '', contributionTypeId: ''})); setSheet('metric'); }}>Igipimo</Btn>}
          {selected?.status === 'Draft' && metrics.length > 0 && <Btn icon="filter" tone="secondary" onClick={() => { setMsg(''); setSheet('alloc'); }}>Intego</Btn>}
        </div>
      )}
      {user.role === 'REGIONAL_LEADER' && selected && (
        <>
          <div className="panel">
            <h3>{selected.name} · <span className="status">{statusLabel[selected.status] || selected.status}</span></h3>
            <p className="muted">Igihe: {when(selected.startDate)} – {when(selected.endDate)}</p>
            <label>Period<select value={form.budgetId || selected.id} onChange={e => setForm({...form, budgetId: e.target.value, metricId: ''})}>{budgets.map(b => <option key={b.id} value={b.id}>{b.name} — {statusLabel[b.status] || b.status}</option>)}</select></label>
            <div className="actions" style={{marginTop: 10}}>
              {selected.status === 'Draft' && <Btn icon="pencil" tone="secondary" onClick={() => { setForm((f: any) => ({...f, periodName: selected.name, periodStart: day(selected.startDate), periodEnd: day(selected.endDate)})); setSheet('edit'); }}>Hindura</Btn>}
              {selected.status === 'Draft' && <Btn icon="trash" tone="danger" onClick={() => setConfirm('budget')}>Siba</Btn>}
              {selected.status === 'Draft' && <Btn icon="check" onClick={() => call(`/budgets/${selected.id}/status`, 'PATCH', {status: 'Active'})}>Yemeze ikore</Btn>}
              {selected.status === 'Active' && <Btn icon="check" onClick={() => call(`/budgets/${selected.id}/status`, 'PATCH', {status: 'Completed'})}>Rangiza</Btn>}
              {selected.status === 'Completed' && <Btn icon="archive" onClick={() => call(`/budgets/${selected.id}/status`, 'PATCH', {status: 'Archived'})}>Bika</Btn>}
              {selected.status === 'Archived' && <span className="muted">Iyi period yabitswe. Nta gikorwa gisigaye.</span>}
            </div>
          </div>
          {selected.status === 'Draft' && metrics.length > 0 && <Table empty="" rows={metrics} columns={[
            {key: 'name', label: 'Izina'},
            {key: 'unit', label: 'Ingero'},
            {key: 'targetQuantity', label: 'Intego', render: m => String(m.targetQuantity)},
            {key: 'action', label: '', render: m => <span className="row-actions"><Act icon="pencil" label="Hindura" onClick={() => { setForm((f: any) => ({...f, metricEditId: m.id, metricName: m.name, unit: m.unit, targetQuantity: m.targetQuantity, unitPriceRwf: m.unitPriceRwf || '', contributionTypeId: m.contributionTypeId || ''})); setSheet('metric'); }} /><Act icon="trash" tone="danger" label="Siba" onClick={() => setConfirm({metricId: m.id})} /></span>}
          ]} />}
        </>
      )}
      {user.role !== 'REGIONAL_LEADER' && <p>Urebere intego n’ibyagezweho. Guhindura period n’intego bikorwa n’Intara gusa.</p>}
      {metrics.some((m: any) => !m.contributionTypeId) && <div className="page-tools"><Btn icon="plus" tone="secondary" onClick={() => setSheet('achieve')}>Ibyagezweho bitari amafaranga</Btn></div>}
      <Note text={sheet || confirm ? '' : msg} />
      <Modal open={sheet === 'period'} title="Kora period nshya" hint="Urugero: Ingengo 2026. Itariki irangira ntishobora kubanziriza itangira." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); if (!String(form.name || '').trim()) return setMsg('Izina rya period rirakenewe.'); if (!form.startDate || !form.endDate) return setMsg('Hitamo itariki y’itangira n’irangira.'); if (form.endDate < form.startDate) return setMsg('Itariki irangira ntishobora kubanziriza itangira.'); call('/budgets', 'POST', {name: String(form.name).trim(), startDate: form.startDate, endDate: form.endDate, submissionId: sid()}); }}>
          <label>Izina<input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></label>
          <div className="form-row">
            <label>Itangiriro<input type="date" value={form.startDate || ''} onChange={e => setForm({...form, startDate: e.target.value})} /></label>
            <label>Irangira<input type="date" value={form.endDate || ''} onChange={e => setForm({...form, endDate: e.target.value})} /></label>
          </div>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">Kora period</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>Reka</Btn></div>
        </form>
      </Modal>
      <Modal open={sheet === 'edit' && !!selected} title="Hindura period" hint="Ibi bikora gusa ku gishushanyo." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); const name = String(form.periodName || '').trim(); if (!name || !form.periodStart || !form.periodEnd || form.periodEnd < form.periodStart) return setMsg('Izina n’itariki zikwiye.'); call(`/budgets/${selected.id}`, 'PATCH', {name, startDate: form.periodStart, endDate: form.periodEnd}); }}>
          <label>Izina<input value={form.periodName || ''} onChange={e => setForm({...form, periodName: e.target.value})} autoFocus /></label>
          <div className="form-row">
            <label>Itangiriro<input type="date" value={form.periodStart || ''} onChange={e => setForm({...form, periodStart: e.target.value})} /></label>
            <label>Irangira<input type="date" value={form.periodEnd || ''} onChange={e => setForm({...form, periodEnd: e.target.value})} /></label>
          </div>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">Bika impinduka</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>Reka</Btn></div>
        </form>
      </Modal>
      <Modal open={sheet === 'metric' && !!selected} title={form.metricEditId ? 'Hindura igipimo' : 'Ongeramo igipimo'} hint="Iyo uhuza igipimo n’ubwoko bw’imisanzu, ibyagezweho biva mu misanzu." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); if (!String(form.metricName || '').trim()) return setMsg('Izina ry’igipimo rirakenewe.'); const body = {name: String(form.metricName).trim(), unit: form.unit || 'RWF', targetQuantity: form.targetQuantity || 0, unitPriceRwf: form.unitPriceRwf || null, contributionTypeId: form.contributionTypeId || null}; if (form.metricEditId) call(`/budgets/metrics/${form.metricEditId}`, 'PATCH', body); else call(`/budgets/${selected.id}/metrics`, 'POST', body); }}>
          <div className="form-row">
            <label>Izina<input value={form.metricName || ''} onChange={e => setForm({...form, metricName: e.target.value})} autoFocus /></label>
            <label>Ingero<input value={form.unit || ''} onChange={e => setForm({...form, unit: e.target.value})} placeholder="RWF, abantu, ..." /></label>
          </div>
          <div className="form-row">
            <label>Intego<input type="number" min="0" value={form.targetQuantity || ''} onChange={e => setForm({...form, targetQuantity: e.target.value})} /></label>
            <label>Igiciro c’igice (RWF)<input type="number" min="0" value={form.unitPriceRwf || ''} onChange={e => setForm({...form, unitPriceRwf: e.target.value})} /></label>
          </div>
          <label>Ubwoko bw’imisanzu, niba bihuye<select value={form.contributionTypeId || ''} onChange={e => setForm({...form, contributionTypeId: e.target.value})}><option value="">Nta misanzu — ibarwa intoki</option>{types.filter(t => t.isActive !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">{form.metricEditId ? 'Bika impinduka' : 'Bika igipimo'}</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>Reka</Btn></div>
        </form>
      </Modal>
      <Modal open={sheet === 'alloc' && !!selected} title="Tanga intego" onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); if (!metric) return setMsg('Hitamo igipimo.'); if (!form.entityId) return setMsg('Hitamo aho intego igana.'); if (form.allocTarget === '' || Number(form.allocTarget) < 0) return setMsg('Andika intego iri 0 cyangwa irenga.'); const item: any = {id: Number(form.entityId), target: form.allocTarget || 0}; if (level === 'member') item.groupId = members.find((m: any) => m.id === Number(form.entityId))?.groupId; call(`/budgets/metrics/${metric.id}/allocations`, 'PUT', {church: level === 'church' ? [item] : [], section: level === 'section' ? [item] : [], group: level === 'group' ? [item] : [], member: level === 'member' ? [item] : []}); }}>
          <div className="form-row">
            <label>Igipimo<select value={form.metricId || metric?.id || ''} onChange={e => setForm({...form, metricId: e.target.value})}>{metrics.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            <label>Urwego<select value={level} onChange={e => setForm({...form, level: e.target.value, entityId: ''})}><option value="church">Itorero</option><option value="section">Igihande</option><option value="group">Itsinda</option><option value="member">Umwizera</option></select></label>
          </div>
          <div className="form-row">
            <label>Aho igana<select value={form.entityId || ''} onChange={e => setForm({...form, entityId: e.target.value})}><option value="">Hitamo</option>{entities.map((x: any) => <option key={x.id} value={x.id}>{x.fullName || x.name}</option>)}</select></label>
            <label>Intego<input type="number" min="0" value={form.allocTarget || ''} onChange={e => setForm({...form, allocTarget: e.target.value})} /></label>
          </div>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">Bika intego</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>Reka</Btn></div>
        </form>
      </Modal>
      <Modal open={sheet === 'achieve' && !!metric} title="Ibyagezweho bitari amafaranga" hint="Ibi bibarwa intoki. Imisanzu ibarwa yonyine." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); const chosen = metrics.find((m: any) => m.id === Number(form.metricId)) || metrics.find((m: any) => !m.contributionTypeId); if (!chosen) return setMsg('Hitamo igipimo.'); call(`/budgets/metrics/${chosen.id}/achievement`, 'POST', {quantity: form.achievementQty || 0, ...(user.role === 'REGIONAL_LEADER' ? {churchId: form.achievementChurchId} : {})}); }}>
          <label>Igipimo<select value={form.metricId || metrics.find((m: any) => !m.contributionTypeId)?.id || ''} onChange={e => setForm({...form, metricId: e.target.value})}>{metrics.filter((m: any) => !m.contributionTypeId).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          {user.role === 'REGIONAL_LEADER' && <label>Itorero<select value={form.achievementChurchId || ''} onChange={e => setForm({...form, achievementChurchId: e.target.value})}><option value="">Hitamo</option>{churches.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          <label>Umubare<input type="number" min="0" value={form.achievementQty || ''} onChange={e => setForm({...form, achievementQty: e.target.value})} /></label>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">Bika ibyagezweho</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>Reka</Btn></div>
        </form>
      </Modal>
      <ConfirmModal open={confirm === 'budget'} title="Siba igishushanyo" hint="Period n’ibipimo byayo bizasibwa burundu." confirm="Siba" danger onClose={() => setConfirm(null)} onConfirm={() => selected && call(`/budgets/${selected.id}`, 'DELETE')} />
      <ConfirmModal open={!!confirm && confirm !== 'budget'} title="Siba igipimo" hint="Iki gipimo n’intego zacyo bizasibwa." confirm="Siba" danger onClose={() => setConfirm(null)} onConfirm={() => confirm && confirm !== 'budget' && call(`/budgets/metrics/${confirm.metricId}`, 'DELETE')} />
      <div style={{marginTop: 14}}>
        <Table empty="Nta ngengo y’imari iraboneka. Intara ni yo ikora period." rows={rows} columns={[
          {key: 'period', label: 'Period'}, {key: 'status', label: 'Imimerere'}, {key: 'metric', label: 'Igipimo'},
          {key: 'target', label: 'Intego'}, {key: 'achievement', label: 'Ibyagezweho'}, {key: 'percentage', label: 'Ijanisha'}, {key: 'remaining', label: 'Asigaye'}
        ]} />
      </div>
    </section>
  );
}

function Reports({user}: {user: User}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [typeId, setTypeId] = useState('');
  const [budgetId, setBudgetId] = useState('');
  const [types, setTypes] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [kind, setKind] = useState<'believers' | 'budget' | ''>('');
  const [summary, setSummary] = useState<any>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { Promise.all([api('/contribution-types'), api('/budgets')]).then(([t, b]) => { setTypes(t); setBudgets(b); if (b[0]) setBudgetId(String(b[0].id)); }).catch((e: any) => setMsg(e.message)); }, []);
  async function loadBelievers() {
    if (start && end && end < start) return setMsg('Itariki ya nyuma ntishobora kubanziriza iya mbere.');
    const q = new URLSearchParams(); if (start) q.set('start', start); if (end) q.set('end', end); if (typeId) q.set('contributionTypeId', typeId);
    try { const [s, b] = await Promise.all([api('/reports/summary?' + q), api('/reports/believers?' + q)]); setSummary(s); setRows(b.rows || []); setKind('believers'); setMsg(''); } catch (e: any) { setMsg(e.message); }
  }
  async function loadBudget() {
    if (!budgetId) return setMsg('Hitamo period ya budget.');
    try { const x = await api('/reports/budget-performance?budgetId=' + budgetId); setSummary({budget: x.budget}); setRows(x.rows || []); setKind('budget'); setMsg(''); } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section>
      <div className="panel">
        <h3>Hitamo raporo</h3>
        <p className="muted">{user.role === 'SECTION' || user.role === 'GROUP' ? 'Ubona niba umwizera yatanze, utabonana amafaranga ye.' : 'Ubona amafaranga y’abizera bari mu rwego rwawe.'}</p>
        <div className="form">
          <div className="form-row">
            <label>Kuva<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
            <label>Kugeza<input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
          </div>
          <label>Ubwoko bw’imisanzu<select value={typeId} onChange={e => setTypeId(e.target.value)}><option value="">Byose</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <Btn icon="chart" onClick={loadBelievers}>Raporo y’abizera</Btn>
          <label>Period ya budget<select value={budgetId} onChange={e => setBudgetId(e.target.value)}><option value="">Hitamo</option>{budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <Btn icon="budget" onClick={loadBudget}>Imikorere ya budget</Btn>
          <Note text={msg} />
        </div>
      </div>
      {summary && (
        <div className="cards" style={{margin: '14px 0'}}>
          {'memberCount' in summary && <div className="stat"><span>Abizera</span><b>{summary.memberCount}</b></div>}
          {'contributionEntries' in summary && <div className="stat"><span>Inyandiko z’imisanzu</span><b>{summary.contributionEntries}</b></div>}
          {'totalContributed' in summary && <div className="stat"><span>Igiteranyo</span><b>{money(summary.totalContributed)}</b></div>}
          {summary.budget && <div className="stat"><span>Budget</span><b style={{fontSize: 22}}>{summary.budget.name}</b></div>}
        </div>
      )}
      {kind === 'believers' && <Table empty="Nta bizera bahuye n’iyi raporo." rows={rows} columns={[
        {key: 'fullName', label: 'Amazina'}, {key: 'church', label: 'Itorero'}, {key: 'section', label: 'Igihande'}, {key: 'group', label: 'Itsinda'},
        {key: 'status', label: 'Yatanze'}, {key: 'amountRwf', label: 'Amafaranga', render: r => r.amountRwf == null ? 'Ibanga' : money(r.amountRwf)}
      ]} />}
      {kind === 'budget' && <Table empty="Nta gipimo kiri muri iyi budget." rows={rows} columns={Object.keys(rows[0] || {metric: '', target: '', achievement: ''}).filter(k => !['id', 'budgetMetricId'].includes(k)).slice(0, 8).map(k => ({key: k, label: k}))} />}
    </section>
  );
}

function placeOf(row: any) {
  if (row.role === 'REGIONAL_LEADER') return 'Intara';
  if (row.role === 'CHURCH') return row.church?.name || '—';
  if (row.role === 'SECTION') return [row.church?.name, row.section?.name].filter(Boolean).join(' · ') || '—';
  return [row.church?.name, row.section?.name, row.group?.name].filter(Boolean).join(' · ') || '—';
}
function Accounts({selfId, regional, homeChurchId}: {selfId?: number; regional: boolean; homeChurchId?: number | null}) {
  const [rows, setRows] = useState<any[]>([]);
  const [churches, setChurches] = useState<any[]>([]);
  const [form, setForm] = useState<any>({role: 'CHURCH', churchId: homeChurchId || ''});
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('');
  const load = () => Promise.all([api('/users'), api('/churches?all=1')]).then(([users, tree]) => { setRows(users); setChurches(tree); }).catch((e: any) => setMsg(e.message));
  useEffect(() => { load(); }, []);
  const sections = churches.flatMap((church: any) => (church.sections || []).filter((section: any) => section.isActive !== false).map((section: any) => ({...section, churchId: church.id, label: `${church.name} · ${section.name}`})));
  const groups = sections.flatMap((section: any) => (section.groups || []).filter((group: any) => group.isActive !== false).map((group: any) => ({...group, sectionId: section.id, churchId: section.churchId, label: `${section.label} · ${group.name}`})));
  const shown = rows.filter(row => `${row.fullName} ${row.username} ${placeOf(row)}`.toLowerCase().includes(query.trim().toLowerCase()));
  async function save() {
    const churchId = form.role === 'CHURCH' && !regional ? (homeChurchId || churches[0]?.id || null) : (form.churchId || null);
    const body: any = {fullName: form.fullName, username: form.username, role: form.role, churchId, sectionId: form.sectionId || null, groupId: form.groupId || null};
    if (form.password) body.password = form.password;
    try {
      setMsg('');
      if (form.id) await api(`/users/${form.id}`, {method: 'PATCH', body: JSON.stringify(body)});
      else await api('/users', {method: 'POST', body: JSON.stringify(body)});
      setMsg(form.id ? 'Ukoresha yahinduwe neza.' : 'Ukoresha yabitswe neza.');
      setOpen(false);
      setForm({role: 'CHURCH', churchId: homeChurchId || ''});
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  async function toggle(row: any) {
    try {
      await api(`/users/${row.id}`, {method: 'PATCH', body: JSON.stringify({isActive: row.isActive === false})});
      setMsg(row.isActive === false ? 'Ukoresha yasubijwe neza.' : 'Ukoresha yahagaritswe neza.');
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section>
      <div className="page-tools">
        <label className="search"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Shakisha ukoresha" /></label>
        <Btn icon="plus" onClick={() => { setMsg(''); setForm({role: 'CHURCH', churchId: homeChurchId || ''}); setOpen(true); }}>Ukoresha</Btn>
      </div>
      <Note text={open ? '' : msg} />
      <Table empty="Nta mukoresha abonetse." rows={shown} columns={[
        {key: 'fullName', label: 'Amazina'},
        {key: 'username', label: 'Username'},
        {key: 'role', label: 'Urwego', render: row => roleLabel[row.role as Role] || row.role},
        {key: 'place', label: 'Aho ayobora', render: placeOf},
        {key: 'isActive', label: 'Akora', render: row => row.isActive === false ? 'Oya' : 'Yego'},
        {key: 'action', label: '', render: row => <span className="row-actions">
          <Act icon="pencil" label="Hindura" onClick={() => { setMsg(''); setForm({id: row.id, fullName: row.fullName, username: row.username, role: row.role, churchId: row.churchId || '', sectionId: row.sectionId || '', groupId: row.groupId || '', password: ''}); setOpen(true); }} />
          {row.id !== selfId && <Act icon={row.isActive === false ? 'undo' : 'ban'} tone={row.isActive === false ? 'edit' : 'danger'} label={row.isActive === false ? 'Subiza' : 'Hagarika'} onClick={() => toggle(row)} />}
        </span>}
      ]} />
      <Modal open={open} title={form.id ? 'Hindura ukoresha' : 'Ongeramo ukoresha'} hint={regional ? 'Itorero, igihande, n’itsinda bigomba kuba bifite ukoresha uyobora ayo makuru.' : 'Ushobora guha konti abayobora itorero ryawe, igihande, n’itsinda.'} onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="form-row">
            <label>Amazina<input value={form.fullName || ''} onChange={e => setForm({...form, fullName: e.target.value})} autoFocus /></label>
            <label>Username<input value={form.username || ''} onChange={e => setForm({...form, username: e.target.value})} autoComplete="off" /></label>
          </div>
          <label>Ijambobanga<input type="password" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} autoComplete="new-password" placeholder={form.id ? 'Siga ubusa niba udahindura' : ''} /></label>
          <label>Urwego<select value={form.role || 'CHURCH'} onChange={e => setForm({...form, role: e.target.value, churchId: regional ? '' : (homeChurchId || ''), sectionId: '', groupId: ''})}>
            <option value="CHURCH">Itorero</option>
            <option value="SECTION">Igihande</option>
            <option value="GROUP">Itsinda</option>
            {regional && <option value="REGIONAL_LEADER">Intara</option>}
          </select></label>
          {form.role === 'CHURCH' && regional && <label>Itorero<select value={form.churchId || ''} onChange={e => setForm({...form, churchId: e.target.value})}><option value="">Hitamo</option>{churches.filter((church: any) => church.isActive !== false).map((church: any) => <option key={church.id} value={church.id}>{church.name}</option>)}</select></label>}
          {form.role === 'CHURCH' && !regional && <p className="muted">{churches[0]?.name || 'Itorero ryawe'}</p>}
          {form.role === 'SECTION' && <label>Igihande<select value={form.sectionId || ''} onChange={e => setForm({...form, sectionId: e.target.value})}><option value="">Hitamo</option>{sections.map((section: any) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>}
          {form.role === 'GROUP' && <label>Itsinda<select value={form.groupId || ''} onChange={e => setForm({...form, groupId: e.target.value})}><option value="">Hitamo</option>{groups.map((group: any) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>}
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.id ? 'Bika impinduka' : 'Bika ukoresha'}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>Reka</Btn>
          </div>
        </form>
      </Modal>
    </section>
  );
}
function Devices() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const load = () => api('/devices').then(setRows).catch((e: any) => setMsg(e.message));
  useEffect(() => { load(); }, []);
  async function act(id: number, action: 'approve' | 'revoke') {
    try { await api(`/devices/${id}/${action}`, {method: 'POST', body: '{}'}); setMsg(action === 'approve' ? 'Device yemewe. Ishobora kubika ibikorwa offline.' : 'Uburenganzira bwa device bwakuweho.'); load(); } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section>
      <p className="muted">Emeza ibikoresho byemewe gukora nta internet. Ibitaramezwa bishobora kwinjira gusa iyo internet iriho.</p>
      <Note text={msg} />
      <Table empty="Nta device yasabye gukora offline. Iyo Web cyangwa Desktop iwinjira, igaragara hano." rows={rows} columns={[
        {key: 'user', label: 'Ukoresha', render: d => d.user?.fullName || d.user?.username || '—'},
        {key: 'role', label: 'Urwego', render: d => roleLabel[d.user?.role as Role] || d.user?.role || '—'},
        {key: 'label', label: 'Device', render: d => d.label || d.deviceId},
        {key: 'status', label: 'Imimerere', render: d => d.isApproved && !d.revokedAt ? 'Yemewe' : d.revokedAt ? 'Yakuweho' : 'Itegereje'},
        {key: 'seen', label: 'Yaherukaga', render: d => when(d.lastSeenAt)},
        {key: 'action', label: '', render: d => d.isApproved && !d.revokedAt ? <Act icon="ban" tone="danger" label="Kuraho" onClick={() => act(d.id, 'revoke')} /> : <Btn icon="check" onClick={() => act(d.id, 'approve')}>Emeza</Btn>}
      ]} />
    </section>
  );
}

function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const [sync, setSync] = useState('');
  const [trusted, setTrusted] = useState(isOfflineTrusted());
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } });
  const [page, setPage] = useState<PageId>('Dashboard');
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const stop = watchConnectivity(on => {
      setOnline(on);
      if (!on) return;
      syncNow().then(() => { setSync('Byoherejwe'); setTrusted(isOfflineTrusted()); }).catch(() => setSync('Bitegereje'));
    });
    return stop;
  }, []);
  useEffect(() => { const expired = () => setUser(null); window.addEventListener('bwuzuri:session-expired', expired); return () => window.removeEventListener('bwuzuri:session-expired', expired); }, []);
  useEffect(() => {
    if (!user) return;
    const path = page === 'Churches' ? '/members' : page === 'Contributions' ? '/contributions' : page === 'Ishuri ryo ku Isabato' ? '/sabbath-school' : page === 'Expenses' ? '/expenses' : page === 'Assets' ? '/assets' : null;
    if (!path) { setData([]); return; }
    api(path).then(x => { setData(Array.isArray(x) ? x : []); setError(''); }).catch((e: any) => { setData([]); setError(e.message); });
  }, [page, user, tick]);
  const allowed = user ? pages[user.role] : [];
  const current = nav[allowed.includes(page) ? page : 'Dashboard'];
  useEffect(() => { document.title = `${current.title} · Intara ya Bwuzuri`; }, [current.title]);
  const refresh = () => setTick(n => n + 1);
  if (!user) return <Login done={setUser} />;
  return (
    <div className="shell">
      <div className="sabbath">
        <img src="/brand/sda-symbol-white.svg" alt="Ikimenyetso cy'Itorero ry'Abadiventisiti b'Umunsi wa Karindwi" />
      </div>
      <aside>
        <div className="brand"><small>Intara ya Bwuzuri</small><strong>Bwuzuri</strong></div>
        <nav>{allowed.map(id => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon name={nav[id].icon} /><span className="nav-copy">{nav[id].title}<small>{nav[id].hint}</small></span></button>)}</nav>
        <div className="who"><strong>{user.fullName}</strong><span>{roleLabel[user.role]}</span><button className="with-ico" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }}><Icon name="logout" />Sohoka</button></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="pills">
            <span className={online ? 'pill' : 'pill warn'}>{online ? 'Online' : 'Offline'}</span>
            <span className="pill">{trusted ? 'Offline yemewe' : 'Offline itarakemererwa'}</span>
            {sync && <span className="pill">{sync}</span>}
          </div>
        </header>
        <main>
          <div className="page-head"><div><h1>{current.title}</h1><p>{current.about}</p></div></div>
          {error && <Note text={error} />}
          {page === 'Dashboard' && <Dashboard user={user} />}
          {page === 'Churches' && <Churches user={user} rows={data} refresh={refresh} />}
          {page === 'Contributions' && <Contributions rows={data} refresh={refresh} />}
          {page === 'Budgets' && <Budgets user={user} />}
          {page === 'Ishuri ryo ku Isabato' && <Sabbath user={user} rows={data} refresh={refresh} />}
          {page === 'Expenses' && <Expenses user={user} rows={data} refresh={refresh} />}
          {page === 'Assets' && <Assets user={user} rows={data} refresh={refresh} />}
          {page === 'Reports' && <Reports user={user} />}
          {page === 'Users' && <Accounts selfId={user.id} regional={user.role === 'REGIONAL_LEADER'} homeChurchId={user.churchId} />}
          {page === 'Devices' && <Devices />}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
