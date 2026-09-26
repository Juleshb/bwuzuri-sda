import React, {useEffect, useState} from 'react';
import {LanguageSwitch, LangProvider, locale, t, useLang} from './i18n';
import {createRoot} from 'react-dom/client';
import {api} from './lib/api';
import './style.css';
import {watchConnectivity} from './lib/runtime';
import {syncNow} from './lib/sync';
import {isOfflineTrusted, queueWrite, refreshDeviceTrust} from './lib/offline';
import {Act, Btn, ConfirmModal, Icon, Modal, ReasonModal, type IconName} from './ui';

type Role = 'REGIONAL_LEADER' | 'CHURCH' | 'SECTION' | 'GROUP';
type User = {id?: number; fullName: string; role: Role; username?: string; churchId?: number | null; sectionId?: number | null};
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
  Churches: {icon: 'church', title: 'Amatorero', hint: 'Urwego n’abizera', about: 'Itorero ryandika umwizera mu gihande cyose, Igihande mu itsinda ryose ryaryo, Itsinda mu itsinda ryaryo gusa.'},
  Contributions: {icon: 'coins', title: 'Imisanzu', hint: 'Amafaranga yinjiye', about: 'Itorero ni ryo ryonyine ryandika imisanzu. Amafaranga y’umwizera agaragara ku Itorero no ku Intara.'},
  Budgets: {icon: 'budget', title: 'Ingengo y’imari', hint: 'Intego n’ibyagezweho', about: 'Intara ikora period, imigendekere, n’intego. Abandi babona ibyagezweho mu rwego rwabo.'},
  'Ishuri ryo ku Isabato': {icon: 'book', title: 'Ishuri ryo ku Isabato', hint: 'Imibare na kwitabira', about: 'Itsinda ryandika imibare na kwitabira. Ibindi rwego rubona raporo.'},
  Expenses: {icon: 'coins', title: 'Amafaranga asohoka', hint: 'Dépenses', about: 'Itorero ryandika ayo yasohoye. Ushobora kubihagarika niba byanditswe nabi.'},
  Assets: {icon: 'box', title: 'Ibikoresho', hint: 'Assets', about: 'Itorero ribika ibikoresho byaryo: umubare, agaciro, umurinzi, n’aho biri.'},
  Reports: {icon: 'chart', title: 'Raporo', hint: 'Abizera na budget', about: 'Raporo zikurikiza uburenganzira. Igihande n’Itsinda ntibibona amafaranga y’umwizera umwe.'},
  Users: {icon: 'user', title: 'Abakoresha', hint: 'Konti z’urwego', about: 'Intara iyobora konti zose. Itorero riyobora konti z’itorero ryaryo, ibihande, n’amatsinda byaryo.'},
  Devices: {icon: 'device', title: 'Devices offline', hint: 'Kwemera', about: 'Emeza ibikoresho bishobora gukora nta internet.'}
};
const statusLabel: Record<string, string> = {Draft: 'Igishushanyo', Active: 'Irimo gukora', Completed: 'Irangiye', Archived: 'Yabitswe'};
function navTitle(role: Role, id: PageId) {
  if (id === 'Churches') return role === 'REGIONAL_LEADER' ? 'Amatorero' : 'Itorero';
  return nav[id].title;
}

function money(value: unknown) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : `${n.toLocaleString(locale())} RWF`;
}
function when(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(locale(), {dateStyle: 'medium'});
}
function day(value: unknown) {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
function Bones({count = 6, kind = 'row'}: {count?: number; kind?: 'row' | 'card' | 'panel'}) {
  return <div className="bones" aria-busy="true" aria-label={t("Tegereza amakuru")}>{Array.from({length: count}, (_, index) => <span className={`bone ${kind}`} key={index} />)}</div>;
}
function Note({text}: {text: string}) {
  if (!text) return null;
  const ok = /neza|yemewe|bwakuweho|Byabitswe|Bibitswe/i.test(text);
  return <p className={ok ? 'note ok' : 'note bad'}>{t(text)}</p>;
}
function Table({columns, rows, empty, loading}: {columns: Array<{key: string; label: string; render?: (row: any) => React.ReactNode}>; rows: any[]; empty: string; loading?: boolean}) {
  const [q, setQ] = useState('');
  const shown = rows.filter(row => JSON.stringify(row).toLowerCase().includes(q.trim().toLowerCase()));
  if (loading) return <Bones count={6} />;
  return (
    <div>
      <div className="toolbar">
        <label className="search"><Icon name="search" /><input placeholder={t("Shakisha muri iyi lisiti")} value={q} onChange={e => setQ(e.target.value)} /></label>
        <span className="muted">{shown.length} / {rows.length}</span>
      </div>
      {!shown.length ? <div className="empty">{rows.length ? t("Nta gisubizo kihuye n’isho shakisha.") : t(empty)}</div> : (
        <div className="tableWrap"><table><thead><tr>{columns.map(c => <th key={c.key}>{t(c.label)}</th>)}</tr></thead>
          <tbody>{shown.map((row, i) => <tr key={row.id || i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>)}</tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}

function LookupEditor({title, hint, path, rows, reload, loading}: {title: string; hint: string; path: string; rows: any[]; reload: () => void; loading?: boolean}) {
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
      setMsg(row.isActive === false ? t("Byasubijwe neza.") : t("Byahagaritswe neza."));
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
      <Table loading={loading} empty={t("Nta bwoko buraboneka.")} rows={rows} columns={[
        {key: 'name', label: t("Izina")},
        {key: 'isActive', label: t("Akora"), render: r => r.isActive === false ? t("Oya") : t("Yego")},
        {key: 'action', label: '', render: r => <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setEditId(r.id); setName(r.name); setMsg(''); setOpen(true); }} /><Act icon={r.isActive === false ? 'undo' : 'ban'} tone={r.isActive === false ? 'edit' : 'danger'} label={r.isActive === false ? t("Subiza") : t("Hagarika")} onClick={() => toggle(r)} /></span>}
      ]} />
      <Modal open={open} title={editId ? t("Hindura: {title}", {title: t(title)}) : t(title)} hint={t("Izina rigomba kuba irihariye.")} onClose={close}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <label>{t("Izina")}<input value={name} onChange={e => setName(e.target.value)} autoFocus /></label>
          <Note text={open ? msg : ''} />
          <div className="actions">
            <Btn icon="save" type="submit">{editId ? t("Bika impinduka") : t("Ongeramo")}</Btn>
            <Btn icon="x" tone="secondary" onClick={close}>{t("Reka")}</Btn>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function Login({done}: {done: (user: User) => void}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <img src="/brand/sda-symbol-white.svg" alt={t("Ikimenyetso cy'Itorero ry'Abadiventisiti b'Umunsi wa Karindwi")} />
      </section>
      <section className="gate-card">
        <LanguageSwitch />
        <form onSubmit={e => { e.preventDefault(); if (!busy) login(); }}>
          <p className="entity"><small>Intara ya Bwuzuri</small><strong>SYSTEM Y’INTARA YA BWUZURI</strong></p>
          <h2>{t("Injira")}</h2>
          <p className="muted">{t("Koresha konti yawe. Ubona gusa ibiri mu rwego rwawe.")}</p>
          <label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label>Password<span className="secret"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" className="eye" aria-pressed={showPassword} aria-label={showPassword ? t("Hisha ijambobanga") : t("Erekana ijambobanga")} onClick={() => setShowPassword(value => !value)}><Icon name={showPassword ? 'eye-off' : 'eye'} /></button></span></label>
          <button className="primary with-ico" disabled={busy}><Icon name="login" />{busy ? t("Tegereza...") : t("Injira")}</button>
          <Note text={error} />
        </form>
      </section>
    </div>
  );
}

function countOf(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString(locale()) : '—';
}
function Bars({items, format}: {items: Array<{label: string; value: number; tone?: 'forest' | 'gold'}>; format?: (value: number) => string}) {
  const max = Math.max(1, ...items.map(item => item.value));
  if (!items.length) return <p className="muted">{t("Nta mibare iraboneka.")}</p>;
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
  const today = new Date().toLocaleDateString(locale(), {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  const pretty = (value: unknown) => { const text = day(value); if (!text) return ''; const d = new Date(`${text}T00:00:00`); return Number.isNaN(d.getTime()) ? text : d.toLocaleDateString(locale(), {day: 'numeric', month: 'long', year: 'numeric'}); };
  const period = budget && pretty(budget.startDate) && pretty(budget.endDate) ? `${pretty(budget.startDate)} – ${pretty(budget.endDate)}` : '';
  return (
    <section className="dash">
      <header className="dash-hero">
        <div>
          <h2>{t("Murakaza neza, {name}", {name: user.fullName})}</h2>
          <p className="dash-date">{t(roleLabel[user.role])} · {today}</p>
        </div>
      </header>
      {error && <Note text={error} />}
      {!info && !error && (
        <>
          <div className="kpi-grid"><Bones count={4} kind="card" /></div>
          <div className={seesFinance ? 'kpi-grid money' : 'kpi-grid money solo'}><Bones count={seesFinance ? 3 : 1} kind="card" /></div>
          <div className="dash-charts"><Bones count={seesFinance ? 2 : 1} kind="panel" /></div>
        </>
      )}
      {info && <div className="kpi-grid">
        <Kpi icon="church" label={t(user.role === 'REGIONAL_LEADER' ? 'Amatorero' : 'Itorero')} value={countOf(churches.length)} note={t("Mu rwego rwawe")} />
        <Kpi icon="home" label={t("Ibihande")} value={countOf(sections)} note={t("Bikora")} />
        <Kpi icon="book" label={t("Amatsinda")} value={countOf(groups)} note={t("Bikora")} />
        <Kpi icon="chart" label={t("Abizera")} value={countOf(activeMembers)} note={t("{n} bahagaritswe", {n: countOf(inactiveMembers)})} />
      </div>}
      {info && <div className={seesFinance ? 'kpi-grid money' : 'kpi-grid money solo'}>
        <Kpi tone="lead" icon="coins" label={t("Imisanzu")} value={info.summary ? money(info.summary.totalContributed) : '—'} note={info.summary ? t("{n} inyandiko", {n: countOf(info.summary.contributionEntries)}) : t("Igiteranyo")} />
        {seesFinance && <Kpi tone="gold" icon="budget" label={t("Yasohotse")} value={money(expenseTotal)} note={t("{n} inyandiko", {n: countOf(info.expenses.length)})} />}
        {seesFinance && <Kpi icon="box" label={t("Ibikoresho")} value={countOf(info.assets.length)} note={t("Agaciro {amount}", {amount: money(assetValue)})} />}
      </div>}
      {info && <>
      <div className="dash-charts">
        <article className="dash-panel">
          <h3>{t("Abizera ku matorero")}</h3>
          <Bars items={churchRows.map((row: any) => ({label: row.name, value: row.active, tone: 'forest' as const}))} />
        </article>
        {seesFinance && (
          <article className="dash-panel">
            <h3>{t("Imisanzu na yasohotse")}</h3>
            <Bars format={value => money(value)} items={[
              {label: t("Imisanzu"), value: Number(info.summary?.totalContributed || 0), tone: 'gold'},
              {label: t("Yasohotse"), value: expenseTotal, tone: 'forest'}
            ]} />
          </article>
        )}
      </div>
      <div className="dash-panels">
        <article className="dash-panel">
          <h3>{t("Imibare y’amatorero")}</h3>
          {!churchRows.length ? <p className="muted">{t("Nta torero riri muri ubu burenganzira.")}</p> : (
            <div className="church-board">
              <div className="church-line head"><span>{t("Itorero")}</span><span>{t("Ibihande")}</span><span>{t("Amatsinda")}</span><span>{t("Abizera")}</span><span>{t("Bahagaritswe")}</span></div>
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
            <h3>{t("Ingengo y’imari")}</h3>
            {!budget ? <p className="muted">{t("Nta ngengo iraboneka.")}</p> : (
              <>
                <div className="dash-budget-head"><strong>{budget.name}</strong><span className="status">{t(statusLabel[budget.status] || budget.status)}</span></div>
                {period && <p className="muted">{period}</p>}
                {(budget.metrics || []).length ? <Bars format={value => `${value.toLocaleString(locale(), {maximumFractionDigits: 1})}%`} items={(budget.metrics as any[]).map(metric => ({label: metric.name, value: Math.max(0, Number(metric.percentage) || 0), tone: 'gold' as const}))} /> : <p className="muted">{t("Iyi ngengo nta gipimo ifite.")}</p>}
              </>
            )}
          </article>
          <article className="dash-panel">
            <h3>{t("Ishuri ryo ku Isabato")}</h3>
            {!info.sabbath?.entryCount ? <p className="muted">{t("Nta mibare yanditswe.")}</p> : (
              <>
                <p className="muted">{t("{n} inyandiko", {n: countOf(info.sabbath.entryCount)})}</p>
                {sabbathTotals.length ? <Bars items={sabbathTotals.map(([name, value]) => ({label: name, value: Number(value) || 0}))} /> : <p className="muted">{t("Inyandiko ntizifite imibare.")}</p>}
              </>
            )}
          </article>
        </div>
      </div>
      </>}
    </section>
  );
}

function Churches({user, rows, refresh, loading}: {user: User; rows: any[]; refresh: () => void; loading?: boolean}) {
  const [churches, setChurches] = useState<any[]>([]);
  const [form, setForm] = useState<any>({orgKind: 'church'});
  const [sheet, setSheet] = useState<null | 'org' | 'member'>(null);
  const [msg, setMsg] = useState('');
  const [treeTick, setTreeTick] = useState(0);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [treeReady, setTreeReady] = useState(false);
  const [removeMember, setRemoveMember] = useState<any>(null);
  const regional = user.role === 'REGIONAL_LEADER';
  useEffect(() => {
    let live = true;
    setTreeReady(false);
    api(regional ? '/churches?all=1' : '/churches').then(rows => { if (live) setChurches(rows); }).catch((e: any) => { if (live) setMsg(e.message); }).finally(() => { if (live) setTreeReady(true); });
    return () => { live = false; };
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
  const listed = churches.filter(church => church.name.toLowerCase().includes(query.trim().toLowerCase()));
  const groupIdsOf = (church: any) => new Set((church?.sections || []).flatMap((section: any) => (section.groups || []).map((group: any) => group.id)));
  const inChurch = (church: any, row: any) => row.group?.section?.churchId === church.id || groupIdsOf(church).has(row.groupId) || groupIdsOf(church).has(row.group?.id);
  const people = selected ? rows.filter(row => inChurch(selected, row)) : [];
  const sectionOptions = activeTree.flatMap(c => (c.sections || []).map((s: any) => ({id: s.id, label: `${c.name} · ${s.name}`})));
  const canAdd = user.role === 'CHURCH' || user.role === 'SECTION' || user.role === 'GROUP';
  const memberSections = user.role === 'CHURCH'
    ? (selectedActive?.sections || []).filter((section: any) => String(section.id) === String(form.sectionId))
    : activeTree.flatMap(church => church.sections || []);
  const memberGroupOptions = memberSections.flatMap((section: any) => (section.groups || []).filter((group: any) => group.isActive !== false).map((group: any) => ({
    id: group.id,
    label: user.role === 'CHURCH' ? group.name : `${section.name} · ${group.name}`
  })));
  const ownGroupName = activeTree.flatMap(church => (church.sections || []).flatMap((section: any) => (section.groups || []).map((group: any) => group.name))).join(', ');
  const memberHint = user.role === 'CHURCH'
    ? 'Itorero ryandika umwizera mu gihande cyose, mu itsinda iryo ari ryo ryose.'
    : user.role === 'SECTION'
      ? 'Igihande ryandika umwizera mu itsinda ryose ryaryo.'
      : 'Itsinda ryandika umwizera mu itsinda ryaryo gusa.';
  function openMember(sectionId?: number, groupId?: number) {
    setMsg('');
    setForm((current: any) => ({...current, memberId: undefined, fullName: '', phoneNumber: '', sectionId: sectionId || '', groupId: groupId || ''}));
    setSheet('member');
  }
  async function saveMember() {
    if (!String(form.fullName || '').trim()) return setMsg('Amazina y’umwizera arakenewe.');
    if (user.role === 'CHURCH' && !form.sectionId) return setMsg('Hitamo igihande.');
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
      setMsg(row.isActive === false ? t("Umwizera yasubijwe neza.") : t("Umwizera yahagaritswe neza."));
      refresh();
    } catch (e: any) { setMsg(e.message); }
  }
  async function deleteMember() {
    if (!removeMember) return;
    try {
      await api(`/members/${removeMember.id}`, {method: 'DELETE'});
      setMsg('Umwizera yasibwe neza.');
      setRemoveMember(null);
      refresh();
    } catch (e: any) { setMsg(e.message); setRemoveMember(null); }
  }
  async function saveOrg() {
    const name = String(form.orgName || '').trim();
    const kind = user.role === 'CHURCH' ? 'section' : user.role === 'SECTION' ? 'group' : (form.orgKind || 'church');
    const churchId = user.role === 'CHURCH' ? Number(user.churchId || selected?.id) : Number(form.orgChurchId);
    const sectionId = user.role === 'SECTION'
      ? Number(user.sectionId || activeTree.flatMap(church => church.sections || []).find((section: any) => section.isActive !== false)?.id)
      : Number(form.orgSectionId);
    if (!name) return setMsg('Izina rirakenewe.');
    if (kind === 'section' && !churchId) return setMsg('Hitamo itorero.');
    if (kind === 'group' && !sectionId) return setMsg('Hitamo igihande.');
    const path = kind === 'church' ? '/churches' : kind === 'section' ? '/sections' : '/groups';
    const body = kind === 'church' ? {name} : kind === 'section' ? {name, churchId} : {name, sectionId};
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
      if (!form.orgId && (regional || user.role === 'CHURCH') && (accountUser || accountPass || accountName)) {
        if (!accountName || !/^[a-z0-9._-]{3,40}$/.test(accountUser) || accountPass.length < 8) {
          accountNote = 'Urwego rwabitswe. Konti ntiyabitswe: andika amazina, username, n’ijambobanga rifite nibura inyuguti 8.';
        } else {
          const sectionRow = churches.flatMap((church: any) => (church.sections || []).map((section: any) => ({...section, churchId: church.id}))).find((section: any) => section.id === sectionId);
          const scope = kind === 'church'
            ? {role: 'CHURCH', churchId: saved.id, sectionId: null, groupId: null}
            : kind === 'section'
              ? {role: 'SECTION', churchId, sectionId: saved.id, groupId: null}
              : {role: 'GROUP', churchId: sectionRow?.churchId, sectionId, groupId: saved.id};
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
      setMsg(row.isActive === false ? t("Byasubijwe neza.") : t("Byahagaritswe neza."));
      setTreeTick(n => n + 1);
    } catch (e: any) { setMsg(e.message); }
  }
  function editOrg(kind: 'church' | 'section' | 'group', row: any, churchId?: number, sectionId?: number) {
    setMsg('');
    setForm((f: any) => ({...f, orgKind: kind, orgId: row.id, orgName: row.name, orgChurchId: churchId || '', orgSectionId: sectionId || ''}));
    setSheet('org');
  }
  function openOrg(kind: 'section' | 'group', churchId?: number, sectionId?: number) {
    setMsg('');
    setForm((f: any) => ({...f, orgId: undefined, orgName: '', orgKind: kind, orgChurchId: churchId || '', orgSectionId: sectionId || '', accountFullName: '', accountUsername: '', accountPassword: ''}));
    setSheet('org');
  }
  return (
    <div className="stack">
      <div className="church-pick">
        <div className="pick-pane">
          <div className="pick-tools">
            <label className="search"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("Shakisha itorero")} /></label>
            {regional && <Btn icon="plus" onClick={() => { setMsg(''); setForm((f: any) => ({...f, orgId: undefined, orgName: '', orgKind: 'church'})); setSheet('org'); }}>{t("Itorero")}</Btn>}
          </div>
          <div className="pick-list" role="listbox" aria-label={t(user.role === 'REGIONAL_LEADER' ? "Amatorero" : "Itorero")}>
            {!treeReady && <Bones count={5} />}
            {listed.map(church => {
              const sections = church.sections || [];
              const groups = sections.reduce((n: number, section: any) => n + (section.groups?.length || 0), 0);
              const believers = rows.filter(row => row.isActive !== false && inChurch(church, row)).length;
              return (
                <button key={church.id} type="button" role="option" aria-selected={church.id === pickedId} className={church.id === pickedId ? 'pick-item on' : 'pick-item'} onClick={() => setPickedId(church.id)}>
                  <strong>{church.name}</strong>
                  <small>{t("{sections} ibihande · {groups} amatsinda · {believers} abizera", {sections: sections.length, groups, believers})}</small>
                  {church.isActive === false && <span className="status">{t("Yahagaritswe")}</span>}
                </button>
              );
            })}
            {treeReady && !listed.length && <p className="muted">{t("Nta torero ribonetse.")}</p>}
          </div>
        </div>
        <section className="pick-detail">
          {!treeReady ? <Bones count={3} kind="panel" /> : !selected ? <p className="muted">{t("Hitamo itorero.")}</p> : (
            <>
              <header className="pick-head">
                <div>
                  <small>{t("Itorero")}</small>
                  <h3>{selected.name}</h3>
                  <p className="muted">{t("{sections} ibihande · {people} abizera bakora", {sections: (selected.sections || []).length, people: people.filter(row => row.isActive !== false).length})}</p>
                </div>
                <div className="row-actions">
                  {regional && <Act icon="pencil" label={t("Hindura")} onClick={() => editOrg('church', selected)} />}
                  {regional && <Act icon={selected.isActive === false ? 'undo' : 'ban'} tone={selected.isActive === false ? 'edit' : 'danger'} label={selected.isActive === false ? t("Subiza") : t("Hagarika")} onClick={() => toggleOrg('church', selected)} />}
                  {(regional || (user.role === 'CHURCH' && selected.isActive !== false)) && <Btn icon="plus" onClick={() => openOrg('section', selected.id)}>{t("Igihande")}</Btn>}
                  {canAdd && <Btn icon="plus" onClick={() => openMember()}>{t("Umwizera")}</Btn>}
                </div>
              </header>
              {selected.isActive === false && <p className="note">{t("Iri torero ryahagaritswe.")}</p>}
              {(selected.sections || []).length ? (selected.sections || []).map((section: any) => (
                <article className="section-card" key={section.id}>
                  <div className="org-row">
                    <div className="org-name"><small>{t("Igihande")}</small><strong>{section.name}</strong>{section.isActive === false && <span className="status">{t("Yahagaritswe")}</span>}</div>
                    {(regional || ((user.role === 'CHURCH' || user.role === 'SECTION') && section.isActive !== false)) && <span className="row-actions">
                      {user.role === 'CHURCH' && section.isActive !== false && <Btn icon="plus" tone="secondary" onClick={() => openMember(section.id)}>{t("Umwizera")}</Btn>}
                      {(regional || (user.role === 'SECTION' && section.isActive !== false)) && <Btn icon="plus" tone="secondary" onClick={() => openOrg('group', selected.id, section.id)}>{t("Itsinda")}</Btn>}
                      {regional && <Act icon="pencil" label={t("Hindura")} onClick={() => editOrg('section', section, selected.id)} />}
                      {regional && <Act icon={section.isActive === false ? 'undo' : 'ban'} tone={section.isActive === false ? 'edit' : 'danger'} label={section.isActive === false ? t("Subiza") : t("Hagarika")} onClick={() => toggleOrg('section', section)} />}
                    </span>}
                  </div>
                  {(section.groups || []).length ? (section.groups || []).map((group: any) => (
                    <div className="group-line" key={group.id}>
                      <div className="org-name"><small>{t("Itsinda")}</small><span>{group.name}</span>{group.isActive === false && <span className="status">{t("Yahagaritswe")}</span>}</div>
                      {(canAdd || regional) && <span className="row-actions">
                        {canAdd && group.isActive !== false && section.isActive !== false && <Btn icon="plus" tone="secondary" onClick={() => openMember(section.id, group.id)}>{t("Umwizera")}</Btn>}
                        {regional && <Act icon="pencil" label={t("Hindura")} onClick={() => editOrg('group', group, selected.id, section.id)} />}
                        {regional && <Act icon={group.isActive === false ? 'undo' : 'ban'} tone={group.isActive === false ? 'edit' : 'danger'} label={group.isActive === false ? t("Subiza") : t("Hagarika")} onClick={() => toggleOrg('group', group)} />}
                      </span>}
                    </div>
                  )) : <p className="muted">{t("Nta tsinda.")}</p>}
                </article>
              )) : <p className="muted">{t("Iri torero nta gihande rigifite.")}</p>}
              {!canAdd && <p className="muted">{t("Intara ireba abizera kandi ishobora kubasiba. Kwiyandikisha no guhindura bikorwa n’Itorero, Igihande, cyangwa Itsinda.")}</p>}
              <Note text={sheet ? '' : msg} />
              {loading || !treeReady ? <Bones count={4} /> : <Table empty={t("Nta mwizera wanditswe muri iri torero.")} rows={people} columns={[
          {key: 'fullName', label: t("Amazina")},
          {key: 'phoneNumber', label: t("Telefoni"), render: r => r.phoneNumber || '—'},
          {key: 'section', label: t("Igihande"), render: r => r.group?.section?.name || '—'},
          {key: 'group', label: t("Itsinda"), render: r => r.group?.name || '—'},
          {key: 'isActive', label: t("Akora"), render: r => r.isActive === false ? t("Oya") : t("Yego")},
          {key: 'action', label: '', render: r => (canAdd || regional) ? <span className="row-actions">{canAdd && <Act icon="pencil" label={t("Hindura")} onClick={() => { setMsg(''); setForm((f: any) => ({...f, memberId: r.id, fullName: r.fullName, phoneNumber: r.phoneNumber || '', sectionId: r.group?.section?.id || r.group?.sectionId || '', groupId: r.groupId || r.group?.id || ''})); setSheet('member'); }} />}{canAdd && <Act icon={r.isActive === false ? 'undo' : 'ban'} tone={r.isActive === false ? 'edit' : 'danger'} label={r.isActive === false ? t("Subiza") : t("Hagarika")} onClick={() => toggleMember(r)} />}{regional && <Act icon="trash" tone="danger" label={t("Siba")} onClick={() => { setMsg(''); setRemoveMember(r); }} />}</span> : null}
        ]} />}
            </>
          )}
        </section>
      </div>
      <Modal open={sheet === 'org'} title={form.orgId ? t("Hindura urwego") : t("Ongeramo urwego")} hint={t(user.role === 'CHURCH' ? "Igihande rishya mu itorero ryawe." : user.role === 'SECTION' ? "Itsinda rishya mu gihande cyawe." : "Hitamo niba ari itorero, igihande, cyangwa itsinda.")} onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); saveOrg(); }}>
          {regional && <label>{t("Ubwoko")}<select value={form.orgKind || 'church'} onChange={e => setForm({...form, orgKind: e.target.value, orgId: undefined})}><option value="church">{t("Itorero")}</option><option value="section">{t("Igihande")}</option><option value="group">{t("Itsinda")}</option></select></label>}
          {regional && form.orgKind === 'section' && <label>{t("Itorero")}<select value={form.orgChurchId || ''} onChange={e => setForm({...form, orgChurchId: e.target.value})}><option value="">{t("Hitamo")}</option>{activeTree.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          {regional && form.orgKind === 'group' && <label>{t("Igihande")}<select value={form.orgSectionId || ''} onChange={e => setForm({...form, orgSectionId: e.target.value})}><option value="">{t("Hitamo")}</option>{sectionOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>}
          <label>{t("Izina")}<input value={form.orgName || ''} onChange={e => setForm({...form, orgName: e.target.value})} autoFocus /></label>
          {!form.orgId && (regional || user.role === 'CHURCH') && <>
            <p className="muted">Konti iyobora iri {form.orgKind === 'group' ? 'tsinda' : form.orgKind === 'section' ? 'gihande' : 'torero'}. Siga ubusa niba utayishaka ubu.</p>
            <label>{t("Amazina y’ukoresha")}<input value={form.accountFullName || ''} onChange={e => setForm({...form, accountFullName: e.target.value})} /></label>
            <div className="form-row">
              <label>Username<input value={form.accountUsername || ''} onChange={e => setForm({...form, accountUsername: e.target.value})} autoComplete="off" /></label>
              <label>{t("Ijambobanga")}<input type="password" value={form.accountPassword || ''} onChange={e => setForm({...form, accountPassword: e.target.value})} autoComplete="new-password" /></label>
            </div>
          </>}
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.orgId ? t("Bika impinduka") : t("Ongeramo")}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>{t("Reka")}</Btn>
          </div>
        </form>
      </Modal>
      <Modal open={sheet === 'member'} title={form.memberId ? t("Hindura umwizera") : t("Ongeramo umwizera")} hint={t(memberHint)} onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); saveMember(); }}>
          <p className="muted">{t("Telefoni, niba uyandika, igomba kuba iyihariye.")}</p>
          <div className="form-row">
            <label>{t("Amazina yose")}<input value={form.fullName || ''} onChange={e => setForm({...form, fullName: e.target.value})} autoFocus /></label>
            <label>{t("Telefoni")}<input value={form.phoneNumber || ''} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="+250..." /></label>
          </div>
          {user.role === 'CHURCH' && <label>{t("Igihande")}<select value={form.sectionId || ''} onChange={e => setForm({...form, sectionId: e.target.value, groupId: ''})}><option value="">{t("Hitamo")}</option>{(selectedActive?.sections || []).map((section: any) => <option key={section.id} value={section.id}>{section.name}</option>)}</select></label>}
          {user.role !== 'GROUP' && <label>{t("Itsinda")}<select value={form.groupId || ''} onChange={e => setForm({...form, groupId: e.target.value})}><option value="">{t("Hitamo")}</option>{memberGroupOptions.map((group: {id: number; label: string}) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>}
          {user.role === 'GROUP' && <p className="muted">{t("Uyu mwizera agera mu itsinda ryawe: {name}.", {name: ownGroupName || t("Itsinda")})}</p>}
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.memberId ? t("Bika impinduka") : t("Bika umwizera")}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>{t("Reka")}</Btn>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={removeMember != null} title={t("Siba umwizera")} hint={t("Uyu mwizera azasibwa burundu. Imisanzu ye igumaho.")} confirm={t("Siba")} danger onClose={() => setRemoveMember(null)} onConfirm={deleteMember} />
    </div>
  );
}

function Contributions({rows, refresh, loading}: {rows: any[]; refresh: () => void; loading?: boolean}) {
  const [meta, setMeta] = useState<any>({members: [], types: []});
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [metaReady, setMetaReady] = useState(false);
  useEffect(() => {
    let live = true;
    setMetaReady(false);
    Promise.all([api('/members'), api('/contribution-types')]).then(([members, types]) => { if (live) setMeta({members, types}); }).catch((e: any) => { if (live) setMsg(e.message); }).finally(() => { if (live) setMetaReady(true); });
    return () => { live = false; };
  }, []);
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
      <div className="page-tools"><Btn icon="plus" onClick={() => { setMsg(''); setForm({}); setOpen(true); }}>{t("Imisanzu")}</Btn></div>
      <Note text={open || reasonFor ? '' : msg} />
      <Table loading={loading || !metaReady} empty={t("Nta misanzu yanditswe.")} rows={rows} columns={[
        {key: 'who', label: t("Umwizera"), render: r => r.member?.fullName || 'Rusange'},
        {key: 'type', label: t("Ubwoko"), render: r => r.contributionType?.name || '—'},
        {key: 'amountRwf', label: t("Amafaranga"), render: r => r.amountRwf == null ? 'Yatanzwe' : money(r.amountRwf)},
        {key: 'receivedAt', label: t("Itariki"), render: r => when(r.receivedAt)},
        {key: 'action', label: '', render: r => <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setMsg(''); setForm({id: r.id, memberId: r.memberId || '', contributionTypeId: r.contributionTypeId, amountRwf: r.amountRwf}); setOpen(true); }} /><Act icon="ban" tone="danger" label={t("Hagarika")} onClick={() => setReasonFor(r)} /></span>}
      ]} />
      <Modal open={open} title={form.id ? t("Hindura imisanzu") : t("Andika imisanzu")} hint={t("Rusange ni amafaranga atari ay’umuntu umwe.")} onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="form-row">
            <label>{t("Umwizera")}<select value={form.memberId || ''} onChange={e => setForm({...form, memberId: e.target.value})}><option value="">{t("Rusange / nta muntu umwe")}</option>{meta.members.map((m: any) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select></label>
            <label>{t("Ubwoko")}<select value={form.contributionTypeId || ''} onChange={e => setForm({...form, contributionTypeId: e.target.value})}><option value="">{t("Hitamo")}</option>{meta.types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          </div>
          <label>{t("Amafaranga (RWF)")}<input type="number" min="1" value={form.amountRwf || ''} onChange={e => setForm({...form, amountRwf: e.target.value})} autoFocus /></label>
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.id ? t("Bika impinduka") : t("Bika imisanzu")}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>{t("Reka")}</Btn>
          </div>
        </form>
      </Modal>
      <ReasonModal open={!!reasonFor} title={t("Hagarika imisanzu")} onClose={() => setReasonFor(null)} onConfirm={cancel} />
    </section>
  );
}

function Expenses({user, rows, refresh, loading}: {user: User; rows: any[]; refresh: () => void; loading?: boolean}) {
  const [types, setTypes] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [typeTick, setTypeTick] = useState(0);
  const [typesReady, setTypesReady] = useState(false);
  const regional = user.role === 'REGIONAL_LEADER';
  useEffect(() => {
    let live = true;
    setTypesReady(false);
    api(regional ? '/expenses/types?all=1' : '/expenses/types').then(rows => { if (live) setTypes(rows); }).catch((e: any) => { if (live) setMsg(e.message); }).finally(() => { if (live) setTypesReady(true); });
    return () => { live = false; };
  }, [regional, typeTick]);
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
      {regional && <LookupEditor loading={!typesReady} title={t("Ubwoko bw’amafaranga asohoka")} hint={t("Intara ni yo yongeramo, ihindura, kandi ihagarika ubwoko. Itorero rikoresha ubwoko bukora gusa.")} path="/expenses/types" rows={types} reload={() => setTypeTick(n => n + 1)} />}
      {user.role === 'CHURCH' && <div className="page-tools"><Btn icon="plus" onClick={() => { setMsg(''); setForm({}); setOpen(true); }}>{t("Amafaranga yasohotse")}</Btn></div>}
      {user.role !== 'CHURCH' && <p className="muted">{t("Urebere amafaranga yasohotse mu rwego rwawe. Kwiyandika no guhindura bikorwa n’Itorero ryayanditse.")}</p>}
      <Note text={open || reasonFor ? '' : msg} />
      <Table loading={loading} empty={t("Nta mafaranga asohoka yanditswe.")} rows={rows} columns={[
        {key: 'paidOn', label: t("Itariki"), render: r => when(r.paidOn)},
        {key: 'type', label: t("Ubwoko"), render: r => typeName(r.expenseTypeId)},
        {key: 'description', label: t("Ibisobanuro")},
        {key: 'amountRwf', label: t("Amafaranga"), render: r => money(r.amountRwf)},
        {key: 'payee', label: t("Uwahawe"), render: r => r.payee || '—'},
        {key: 'action', label: '', render: r => user.role === 'CHURCH' ? <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setMsg(''); setForm({id: r.id, expenseTypeId: r.expenseTypeId, amountRwf: r.amountRwf, description: r.description, payee: r.payee || '', reference: r.reference || '', paidOn: day(r.paidOn)}); setOpen(true); }} /><Act icon="ban" tone="danger" label={t("Hagarika")} onClick={() => setReasonFor(r.id)} /></span> : null}
      ]} />
      <Modal open={open} title={form.id ? t("Hindura amafaranga yasohotse") : t("Andika amafaranga yasohotse")} onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="form-row">
            <label>{t("Ubwoko")}<select value={form.expenseTypeId || ''} onChange={e => setForm({...form, expenseTypeId: e.target.value})}><option value="">{t("Hitamo")}</option>{activeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label>{t("Amafaranga (RWF)")}<input type="number" min="1" value={form.amountRwf || ''} onChange={e => setForm({...form, amountRwf: e.target.value})} /></label>
          </div>
          <label>{t("Ibisobanuro")}<textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></label>
          <div className="form-row">
            <label>{t("Uwahawe")}<input value={form.payee || ''} onChange={e => setForm({...form, payee: e.target.value})} /></label>
            <label>{t("Referansi")}<input value={form.reference || ''} onChange={e => setForm({...form, reference: e.target.value})} /></label>
          </div>
          <label>{t("Itariki yo kwishyura")}<input type="date" value={form.paidOn || ''} onChange={e => setForm({...form, paidOn: e.target.value})} /></label>
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.id ? t("Bika impinduka") : t("Bika")}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>{t("Reka")}</Btn>
          </div>
        </form>
      </Modal>
      <ReasonModal open={reasonFor != null} title={t("Hagarika amafaranga yasohotse")} onClose={() => setReasonFor(null)} onConfirm={cancel} />
    </section>
  );
}

function Assets({user, rows, refresh, loading}: {user: User; rows: any[]; refresh: () => void; loading?: boolean}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [catTick, setCatTick] = useState(0);
  const [categoriesReady, setCategoriesReady] = useState(false);
  const regional = user.role === 'REGIONAL_LEADER';
  useEffect(() => {
    let live = true;
    setCategoriesReady(false);
    api(regional ? '/assets/categories?all=1' : '/assets/categories').then(rows => { if (live) setCategories(rows); }).catch((e: any) => { if (live) setMsg(e.message); }).finally(() => { if (live) setCategoriesReady(true); });
    return () => { live = false; };
  }, [regional, catTick]);
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
      {regional && <LookupEditor loading={!categoriesReady} title={t("Ibyiciro by’ibikoresho")} hint={t("Intara ni yo yongeramo, ihindura, kandi ihagarika icyiciro. Itorero rikoresha ibyiciro bikora gusa.")} path="/assets/categories" rows={categories} reload={() => setCatTick(n => n + 1)} />}
      {user.role === 'CHURCH' && <div className="page-tools"><Btn icon="plus" onClick={() => { setMsg(''); setForm({}); setOpen(true); }}>{t("Igikoresho")}</Btn></div>}
      <Note text={open || archiveId != null ? '' : msg} />
      <Table loading={loading} empty={t("Nta bikoresho byanditswe.")} rows={rows} columns={[
        {key: 'name', label: t("Izina")},
        {key: 'category', label: t("Icyiciro"), render: r => categoryName(r.assetCategoryId)},
        {key: 'quantity', label: t("Umubare")},
        {key: 'valueRwf', label: 'Agaciro', render: r => r.valueRwf == null ? '—' : money(r.valueRwf)},
        {key: 'location', label: t("Aho kiri"), render: r => r.location || '—'},
        {key: 'custodian', label: t("Umurinzi"), render: r => r.custodian || '—'},
        {key: 'action', label: '', render: r => user.role === 'CHURCH' ? <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setMsg(''); setForm({id: r.id, assetCategoryId: r.assetCategoryId, name: r.name, quantity: r.quantity, valueRwf: r.valueRwf ?? '', location: r.location || '', custodian: r.custodian || '', condition: r.condition || '', notes: r.notes || ''}); setOpen(true); }} /><Act icon="archive" tone="danger" label={t("Bika")} onClick={() => setArchiveId(r.id)} /></span> : null}
      ]} />
      <Modal open={open} title={form.id ? t("Hindura igikoresho") : t("Andika igikoresho")} onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="form-row">
            <label>{t("Icyiciro")}<select value={form.assetCategoryId || ''} onChange={e => setForm({...form, assetCategoryId: e.target.value})}><option value="">{t("Hitamo")}</option>{activeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>{t("Izina")}<input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></label>
          </div>
          <div className="form-row">
            <label>{t("Umubare")}<input type="number" min="0" value={form.quantity || ''} onChange={e => setForm({...form, quantity: e.target.value})} /></label>
            <label>{t("Agaciro (RWF)")}<input type="number" min="0" value={form.valueRwf || ''} onChange={e => setForm({...form, valueRwf: e.target.value})} /></label>
          </div>
          <div className="form-row">
            <label>{t("Aho kiri")}<input value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} /></label>
            <label>{t("Umurinzi")}<input value={form.custodian || ''} onChange={e => setForm({...form, custodian: e.target.value})} /></label>
          </div>
          <label>{t("Imiterere")}<input value={form.condition || ''} onChange={e => setForm({...form, condition: e.target.value})} /></label>
          <label>{t("Andi makuru")}<textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></label>
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.id ? t("Bika impinduka") : t("Bika igikoresho")}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>{t("Reka")}</Btn>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={archiveId != null} title="Gushyira igikoresho mu bubiko" hint="Ntikigaragara muri lisiti ikora." confirm={t("Bika")} danger onClose={() => setArchiveId(null)} onConfirm={archive} />
    </section>
  );
}

type AbsenceMark = {present: '' | 'yes' | 'no'; reason: '' | 'sick' | 'other_church' | 'other'; absenceNote: string};
const absenceLabel: Record<string, string> = {sick: 'Ararwaye', other_church: 'Yagiye mu yindi torero', other: 'Ikindi'};
function blankMark(): AbsenceMark {
  return {present: '', reason: '', absenceNote: ''};
}
function markFromMember(member: any): AbsenceMark {
  if (member.present === true) return {present: 'yes', reason: '', absenceNote: ''};
  if (member.present === false && absenceLabel[member.absenceReason]) return {present: 'no', reason: member.absenceReason, absenceNote: member.absenceNote || ''};
  return blankMark();
}
function absenceText(row: any) {
  if (row.present) return '—';
  const label = absenceLabel[row.absenceReason] ? t(absenceLabel[row.absenceReason]) : '—';
  return row.absenceNote ? `${label}: ${row.absenceNote}` : label;
}
function localDay(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
function Attendance({user}: {user: User}) {
  const writer = user.role === 'GROUP';
  const [date, setDate] = useState(localDay());
  const [from, setFrom] = useState(localDay(-84));
  const [to, setTo] = useState(localDay());
  const [sheet, setSheet] = useState<any>(null);
  const [marks, setMarks] = useState<Record<number, AbsenceMark>>({});
  const [sheetReady, setSheetReady] = useState(!writer);
  const [report, setReport] = useState<any>(null);
  const [reportReady, setReportReady] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!writer) return;
    let live = true;
    setSheetReady(false);
    api(`/sabbath-school/attendance?date=${date}`).then(value => {
      if (!live) return;
      setSheet(value);
      const next: Record<number, AbsenceMark> = {};
      for (const member of value.members || []) next[member.id] = markFromMember(member);
      setMarks(next);
    }).catch((e: any) => { if (live) setMsg(e.message); }).finally(() => { if (live) setSheetReady(true); });
    return () => { live = false; };
  }, [writer, date]);
  useEffect(() => {
    let live = true;
    setReportReady(false);
    api(`/sabbath-school/attendance/report?from=${from}&to=${to}`).then(value => { if (live) setReport(value); }).catch((e: any) => { if (live) setMsg(e.message); }).finally(() => { if (live) setReportReady(true); });
    return () => { live = false; };
  }, [from, to]);
  async function save() {
    const people = sheet?.members || [];
    for (const member of people) {
      const mark = marks[member.id] || blankMark();
      if (!mark.present) return setMsg('Hitamo niba yaje cyangwa ataje.');
      if (mark.present === 'no' && !mark.reason) return setMsg('Hitamo impamvu yo kutaza.');
      if (mark.reason === 'other' && !mark.absenceNote.trim()) return setMsg('Andika impamvu.');
    }
    const body = {date, marks: people.map((member: any) => {
      const mark = marks[member.id] || blankMark();
      const present = mark.present === 'yes';
      return {memberId: member.id, present, absenceReason: present ? null : mark.reason, absenceNote: mark.reason === 'other' ? mark.absenceNote.trim() : null};
    })};
    try {
      setMsg('');
      if (!navigator.onLine) { queueWrite('/sabbath-school/attendance', 'PUT', body); setMsg('Bibitswe kuri iyi device; bizoherezwa internet igarutse.'); return; }
      await api('/sabbath-school/attendance', {method: 'PUT', body: JSON.stringify(body)});
      setMsg('Kwitabira byabitswe neza.');
      setReportReady(false);
      const value = await api(`/sabbath-school/attendance/report?from=${from}&to=${to}`);
      setReport(value);
    } catch (e: any) { setMsg(e.message); } finally { setReportReady(true); }
  }
  const present = report?.present || 0;
  const absent = report?.absent || 0;
  const total = present + absent;
  const groupColumns = [
    {key: 'date', label: t("Itariki")},
    ...(user.role === 'REGIONAL_LEADER' ? [{key: 'church', label: t("Itorero")}] : []),
    ...(user.role === 'REGIONAL_LEADER' || user.role === 'CHURCH' ? [{key: 'section', label: t("Igihande")}] : []),
    ...(user.role === 'GROUP' ? [] : [{key: 'group', label: t("Itsinda")}]),
    {key: 'present', label: t("Abaje")},
    {key: 'absent', label: t("Abatabaye")}
  ];
  const personColumns = [
    {key: 'date', label: t("Itariki")},
    ...(user.role === 'GROUP' ? [] : [{key: 'group', label: t("Itsinda")}]),
    {key: 'fullName', label: t("Umwizera")},
    {key: 'present', label: t("Kwitabira"), render: (row: any) => row.present ? t("Yaritabiriye") : t("Ntiyaritabiriye")},
    {key: 'reason', label: t("Impamvu"), render: (row: any) => absenceText(row)}
  ];
  return (
    <div className="stack">
      {writer ? (
        <form className="attend-sheet" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="attend-head">
            <div>
              <h3>{t("Ifishi yo kwitabira")}</h3>
              <p className="muted">{t("Banza hitamo niba umwizera yaje cyangwa ataje. Ku utaje, hitamo impamvu.")}</p>
            </div>
            <label>{t("Itariki")}<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          </div>
          {!sheetReady ? <Bones count={4} /> : !(sheet?.members || []).length ? <p className="muted">{t("Nta mwizera ukora muri iki tsinda.")}</p> : (sheet.members || []).map((member: any) => {
            const mark = marks[member.id] || blankMark();
            return (
              <div className="attend-row" key={member.id}>
                <strong>{member.fullName}</strong>
                <div className="attend-choice">
                  <button type="button" className="here" aria-pressed={mark.present === 'yes'} onClick={() => setMarks(current => ({...current, [member.id]: {present: 'yes', reason: '', absenceNote: ''}}))}>{t("Abaje")}</button>
                  <button type="button" className="away" aria-pressed={mark.present === 'no'} onClick={() => setMarks(current => ({...current, [member.id]: {...(current[member.id] || blankMark()), present: 'no'}}))}>{t("Abatabaye")}</button>
                </div>
                <div className="attend-extra">
                  {mark.present === 'no' && <label>{t("Impamvu yo kutaza")}<select value={mark.reason} onChange={e => setMarks(current => ({...current, [member.id]: {...(current[member.id] || blankMark()), present: 'no', reason: e.target.value as AbsenceMark['reason'], absenceNote: e.target.value === 'other' ? (current[member.id]?.absenceNote || '') : ''}}))}><option value="">{t("Hitamo")}</option><option value="sick">{t("Ararwaye")}</option><option value="other_church">{t("Yagiye mu yindi torero")}</option><option value="other">{t("Ikindi")}</option></select></label>}
                  {mark.present === 'no' && mark.reason === 'other' && <label>{t("Impamvu")}<input value={mark.absenceNote} onChange={e => setMarks(current => ({...current, [member.id]: {...(current[member.id] || blankMark()), absenceNote: e.target.value}}))} /></label>}
                </div>
              </div>
            );
          })}
          <div className="actions">
            <Btn icon="save" type="submit">{t("Bika ifishi")}</Btn>
          </div>
        </form>
      ) : <p className="muted">{t("Urebere raporo yo kwitabira. Kwiyandika bikorwa n’Itsinda gusa.")}</p>}
      <Note text={msg} />
      <div className="form-row">
        <label>{t("Kuva")}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>{t("Kugeza")}<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      {!reportReady ? <Bones count={3} kind="card" /> : (
        <div className="cards">
          <div className="stat"><span>{t("Abaje")}</span><b>{present}</b></div>
          <div className="stat"><span>{t("Abatabaye")}</span><b>{absent}</b></div>
          <div className="stat"><span>{t("Igiteranyo")}</span><b>{total ? `${Math.round(present * 100 / total)}%` : '—'}</b></div>
        </div>
      )}
      <Table loading={!reportReady} empty={t("Nta kwitabira kwanditswe muri iki gihe.")} rows={report?.groups || []} columns={groupColumns} />
      <h3>{t("Abizera ku isabato")}</h3>
      <Table loading={!reportReady} empty={t("Nta kwitabira kwanditswe muri iki gihe.")} rows={report?.rows || []} columns={personColumns} />
    </div>
  );
}
function Sabbath({user, rows, refresh, loading}: {user: User; rows: any[]; refresh: () => void; loading?: boolean}) {
  const [tab, setTab] = useState<'stats' | 'attendance'>('stats');
  const [stats, setStats] = useState<Array<{name: string; value: string}>>([{name: 'Abari', value: ''}, {name: 'Abasuye', value: ''}]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [summaryReady, setSummaryReady] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let live = true;
    setSummaryReady(false);
    api('/sabbath-school/summary').then(value => { if (live) setSummary(value); }).catch(() => { if (live) setSummary(null); }).finally(() => { if (live) setSummaryReady(true); });
    return () => { live = false; };
  }, [rows]);
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
      <div className="lang tabs" role="tablist">
        <button type="button" className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>{t("Imibare")}</button>
        <button type="button" className={tab === 'attendance' ? 'on' : ''} onClick={() => setTab('attendance')}>{t("Kwitabira")}</button>
      </div>
      {tab === 'attendance' ? <Attendance user={user} /> : <>
      {!summaryReady ? <Bones count={2} kind="card" /> : summary && <div className="cards" style={{marginBottom: 14}}><div className="stat"><span>{t("Inyandiko")}</span><b>{summary.entryCount}</b></div>{Object.entries(summary.totals || {}).map(([k, v]) => <div className="stat" key={k}><span>{k}</span><b>{String(v)}</b></div>)}</div>}
      {user.role === 'GROUP' ? <div className="page-tools"><Btn icon="plus" onClick={() => { setEditingId(null); setStats([{name: 'Abari', value: ''}, {name: 'Abasuye', value: ''}]); setMsg(''); setOpen(true); }}>{t("Imibare y’uyu munsi")}</Btn></div> : <p className="muted">{t("Urebere igiteranyo. Kwiyandika bikorwa n’Itsinda gusa.")}</p>}
      <Note text={open || removeId != null ? '' : msg} />
      <Table loading={loading || !summaryReady} empty={t("Nta mibare y’Ishuri ryo ku Isabato iraboneka.")} rows={rows} columns={[
        {key: 'entryDateUtc', label: t("Itariki"), render: r => when(r.entryDateUtc)},
        {key: 'payload', label: t("Imibare"), render: r => r.payloadJson && typeof r.payloadJson === 'object' ? Object.entries(r.payloadJson).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'},
        {key: 'action', label: '', render: r => user.role === 'GROUP' ? <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => edit(r)} /><Act icon="trash" tone="danger" label={t("Siba")} onClick={() => setRemoveId(r.id)} /></span> : null}
      ]} />
      <Modal open={open} title={editingId ? t("Hindura imibare") : t("Andika imibare y’uyu munsi")} hint={t("Urugero: Abari, Abasuye, Abitabiriye.")} onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          {stats.map((s, i) => (
            <div className="form-row" key={i}>
              <label>{t("Igipimo")}<input value={s.name} onChange={e => setStats(stats.map((x, n) => n === i ? {...x, name: e.target.value} : x))} /></label>
              <label>{t("Umubare")}<input type="number" min="0" value={s.value} onChange={e => setStats(stats.map((x, n) => n === i ? {...x, value: e.target.value} : x))} /></label>
            </div>
          ))}
          <div className="actions">
            <Btn icon="plus" tone="secondary" onClick={() => setStats([...stats, {name: '', value: ''}])}>{t("Igipimo")}</Btn>
            {stats.length > 1 && <Btn icon="trash" tone="secondary" onClick={() => setStats(stats.slice(0, -1))}>{t("Kuramo")}</Btn>}
          </div>
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{editingId ? t("Bika impinduka") : t("Bika imibare")}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>{t("Reka")}</Btn>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={removeId != null} title="Siba imibare" hint={t("Iyi nyandiko y’Ishuri ryo ku Isabato izasibwa burundu.")} confirm={t("Siba")} danger onClose={() => setRemoveId(null)} onConfirm={remove} />
      </>}
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
  const [ready, setReady] = useState(false);
  const load = () => {
    setReady(false);
    return Promise.all([api('/budgets'), api('/churches'), api(user.role === 'REGIONAL_LEADER' ? '/contribution-types?all=1' : '/contribution-types'), api('/members')]).then(([b, c, t, m]) => { setBudgets(b); setChurches(c); setTypes(t); setMembers(m); }).catch((e: any) => setMsg(e.message)).finally(() => setReady(true));
  };
  useEffect(() => { load(); }, []);
  const selected = budgets.find(b => b.id === Number(form.budgetId)) || budgets[0];
  const metrics = selected?.metrics || [];
  const metric = metrics.find((m: any) => m.id === Number(form.metricId)) || metrics[0];
  const level = form.level || 'church';
  const entities = level === 'church' ? churches : level === 'section' ? churches.flatMap((c: any) => c.sections || []) : level === 'group' ? churches.flatMap((c: any) => (c.sections || []).flatMap((s: any) => s.groups || [])) : members;
  async function call(path: string, method: string, body?: any) {
    try { await api(path, {method, ...(body === undefined ? {} : {body: JSON.stringify(body)})}); setMsg('Byabitswe neza.'); setSheet(null); setConfirm(null); await load(); return true; } catch (e: any) { setMsg(e.message); return false; }
  }
  const rows = budgets.flatMap(b => (b.metrics || []).map((m: any) => ({id: `${b.id}-${m.id}`, period: b.name, status: t(statusLabel[b.status] || b.status), metric: m.name, target: m.target, achievement: m.achievement, percentage: `${m.percentage}%`, remaining: m.remaining})));
  return (
    <section>
      <p className="muted">{t("Igishushanyo ni ho Intego zihinduka. Iyo period igizwe irimo gukora, intego zihagarara. Hanyuma igira irangiye, ikabikwa. Igishushanyo gusa ni cyo gishobora guhindurwa cyangwa gusibwa.")}</p>
      {user.role === 'REGIONAL_LEADER' && <LookupEditor loading={!ready} title={t("Ubwoko bw’imisanzu")} hint={t("Ubu bwoko ni bwo buhuzwa n’ingengo y’imari n’imisanzu. Ubwoko bwahagaritswe ntibugaragara ku Itorero.")} path="/contribution-types" rows={types} reload={load} />}
      {user.role === 'REGIONAL_LEADER' && (
        <div className="page-tools">
          <Btn icon="plus" onClick={() => { setMsg(''); setSheet('period'); }}>{t("Period")}</Btn>
          {selected?.status === 'Draft' && <Btn icon="plus" tone="secondary" onClick={() => { setMsg(''); setForm((f: any) => ({...f, metricEditId: undefined, metricName: '', unit: '', targetQuantity: '', unitPriceRwf: '', contributionTypeId: ''})); setSheet('metric'); }}>{t("Igipimo")}</Btn>}
          {selected?.status === 'Draft' && metrics.length > 0 && <Btn icon="filter" tone="secondary" onClick={() => { setMsg(''); setSheet('alloc'); }}>{t("Intego")}</Btn>}
        </div>
      )}
      {user.role === 'REGIONAL_LEADER' && selected && (
        <>
          <div className="panel">
            <h3>{selected.name} · <span className="status">{t(statusLabel[selected.status] || selected.status)}</span></h3>
            <p className="muted">Igihe: {when(selected.startDate)} – {when(selected.endDate)}</p>
            <label>{t("Period")}<select value={form.budgetId || selected.id} onChange={e => setForm({...form, budgetId: e.target.value, metricId: ''})}>{budgets.map(b => <option key={b.id} value={b.id}>{b.name} — {t(statusLabel[b.status] || b.status)}</option>)}</select></label>
            <div className="actions" style={{marginTop: 10}}>
              {selected.status === 'Draft' && <Btn icon="pencil" tone="secondary" onClick={() => { setForm((f: any) => ({...f, periodName: selected.name, periodStart: day(selected.startDate), periodEnd: day(selected.endDate)})); setSheet('edit'); }}>{t("Hindura")}</Btn>}
              {selected.status === 'Draft' && <Btn icon="trash" tone="danger" onClick={() => setConfirm('budget')}>{t("Siba")}</Btn>}
              {selected.status === 'Draft' && <Btn icon="check" onClick={() => call(`/budgets/${selected.id}/status`, 'PATCH', {status: 'Active'})}>{t("Yemeze ikore")}</Btn>}
              {selected.status === 'Active' && <Btn icon="check" onClick={() => call(`/budgets/${selected.id}/status`, 'PATCH', {status: 'Completed'})}>{t("Rangiza")}</Btn>}
              {selected.status === 'Completed' && <Btn icon="archive" onClick={() => call(`/budgets/${selected.id}/status`, 'PATCH', {status: 'Archived'})}>{t("Bika")}</Btn>}
              {selected.status === 'Archived' && <span className="muted">{t("Iyi period yabitswe. Nta gikorwa gisigaye.")}</span>}
            </div>
          </div>
          {selected.status === 'Draft' && metrics.length > 0 && <Table empty="" rows={metrics} columns={[
            {key: 'name', label: t("Izina")},
            {key: 'unit', label: t("Ingero")},
            {key: 'targetQuantity', label: t("Intego"), render: m => String(m.targetQuantity)},
            {key: 'action', label: '', render: m => <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setForm((f: any) => ({...f, metricEditId: m.id, metricName: m.name, unit: m.unit, targetQuantity: m.targetQuantity, unitPriceRwf: m.unitPriceRwf || '', contributionTypeId: m.contributionTypeId || ''})); setSheet('metric'); }} /><Act icon="trash" tone="danger" label={t("Siba")} onClick={() => setConfirm({metricId: m.id})} /></span>}
          ]} />}
        </>
      )}
      {user.role !== 'REGIONAL_LEADER' && <p>{t("Urebere intego n’ibyagezweho. Guhindura period n’intego bikorwa n’Intara gusa.")}</p>}
      {metrics.some((m: any) => !m.contributionTypeId) && <div className="page-tools"><Btn icon="plus" tone="secondary" onClick={() => setSheet('achieve')}>{t("Ibyagezweho bitari amafaranga")}</Btn></div>}
      <Note text={sheet || confirm ? '' : msg} />
      <Modal open={sheet === 'period'} title="Kora period nshya" hint="Urugero: Ingengo 2026. Itariki irangira ntishobora kubanziriza itangira." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); if (!String(form.name || '').trim()) return setMsg('Izina rya period rirakenewe.'); if (!form.startDate || !form.endDate) return setMsg('Hitamo itariki y’itangira n’irangira.'); if (form.endDate < form.startDate) return setMsg('Itariki irangira ntishobora kubanziriza itangira.'); call('/budgets', 'POST', {name: String(form.name).trim(), startDate: form.startDate, endDate: form.endDate, submissionId: sid()}); }}>
          <label>{t("Izina")}<input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} autoFocus /></label>
          <div className="form-row">
            <label>{t("Itangiriro")}<input type="date" value={form.startDate || ''} onChange={e => setForm({...form, startDate: e.target.value})} /></label>
            <label>{t("Irangira")}<input type="date" value={form.endDate || ''} onChange={e => setForm({...form, endDate: e.target.value})} /></label>
          </div>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">{t("Kora period")}</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>{t("Reka")}</Btn></div>
        </form>
      </Modal>
      <Modal open={sheet === 'edit' && !!selected} title={t("Hindura period")} hint="Ibi bikora gusa ku gishushanyo." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); const name = String(form.periodName || '').trim(); if (!name || !form.periodStart || !form.periodEnd || form.periodEnd < form.periodStart) return setMsg('Izina n’itariki zikwiye.'); call(`/budgets/${selected.id}`, 'PATCH', {name, startDate: form.periodStart, endDate: form.periodEnd}); }}>
          <label>{t("Izina")}<input value={form.periodName || ''} onChange={e => setForm({...form, periodName: e.target.value})} autoFocus /></label>
          <div className="form-row">
            <label>{t("Itangiriro")}<input type="date" value={form.periodStart || ''} onChange={e => setForm({...form, periodStart: e.target.value})} /></label>
            <label>{t("Irangira")}<input type="date" value={form.periodEnd || ''} onChange={e => setForm({...form, periodEnd: e.target.value})} /></label>
          </div>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">{t("Bika impinduka")}</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>{t("Reka")}</Btn></div>
        </form>
      </Modal>
      <Modal open={sheet === 'metric' && !!selected} title={form.metricEditId ? t("Hindura igipimo") : t("Ongeramo igipimo")} hint={t("Iyo uhuza igipimo n’ubwoko bw’imisanzu, ibyagezweho biva mu misanzu.")} onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); if (!String(form.metricName || '').trim()) return setMsg('Izina ry’igipimo rirakenewe.'); const body = {name: String(form.metricName).trim(), unit: form.unit || 'RWF', targetQuantity: form.targetQuantity || 0, unitPriceRwf: form.unitPriceRwf || null, contributionTypeId: form.contributionTypeId || null}; if (form.metricEditId) call(`/budgets/metrics/${form.metricEditId}`, 'PATCH', body); else call(`/budgets/${selected.id}/metrics`, 'POST', body); }}>
          <div className="form-row">
            <label>{t("Izina")}<input value={form.metricName || ''} onChange={e => setForm({...form, metricName: e.target.value})} autoFocus /></label>
            <label>{t("Ingero")}<input value={form.unit || ''} onChange={e => setForm({...form, unit: e.target.value})} placeholder="RWF, abantu, ..." /></label>
          </div>
          <div className="form-row">
            <label>{t("Intego")}<input type="number" min="0" value={form.targetQuantity || ''} onChange={e => setForm({...form, targetQuantity: e.target.value})} /></label>
            <label>{t("Igiciro c’igice (RWF)")}<input type="number" min="0" value={form.unitPriceRwf || ''} onChange={e => setForm({...form, unitPriceRwf: e.target.value})} /></label>
          </div>
          <label>{t("Ubwoko bw’imisanzu, niba bihuye")}<select value={form.contributionTypeId || ''} onChange={e => setForm({...form, contributionTypeId: e.target.value})}><option value="">{t("Nta misanzu — ibarwa intoki")}</option>{types.filter(t => t.isActive !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">{form.metricEditId ? t("Bika impinduka") : t("Bika igipimo")}</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>{t("Reka")}</Btn></div>
        </form>
      </Modal>
      <Modal open={sheet === 'alloc' && !!selected} title="Tanga intego" onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); if (!metric) return setMsg('Hitamo igipimo.'); if (!form.entityId) return setMsg('Hitamo aho intego igana.'); if (form.allocTarget === '' || Number(form.allocTarget) < 0) return setMsg('Andika intego iri 0 cyangwa irenga.'); const item: any = {id: Number(form.entityId), target: form.allocTarget || 0}; if (level === 'member') item.groupId = members.find((m: any) => m.id === Number(form.entityId))?.groupId; call(`/budgets/metrics/${metric.id}/allocations`, 'PUT', {church: level === 'church' ? [item] : [], section: level === 'section' ? [item] : [], group: level === 'group' ? [item] : [], member: level === 'member' ? [item] : []}); }}>
          <div className="form-row">
            <label>{t("Igipimo")}<select value={form.metricId || metric?.id || ''} onChange={e => setForm({...form, metricId: e.target.value})}>{metrics.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            <label>{t("Urwego")}<select value={level} onChange={e => setForm({...form, level: e.target.value, entityId: ''})}><option value="church">{t("Itorero")}</option><option value="section">{t("Igihande")}</option><option value="group">{t("Itsinda")}</option><option value="member">{t("Umwizera")}</option></select></label>
          </div>
          <div className="form-row">
            <label>{t("Aho igana")}<select value={form.entityId || ''} onChange={e => setForm({...form, entityId: e.target.value})}><option value="">{t("Hitamo")}</option>{entities.map((x: any) => <option key={x.id} value={x.id}>{x.fullName || x.name}</option>)}</select></label>
            <label>{t("Intego")}<input type="number" min="0" value={form.allocTarget || ''} onChange={e => setForm({...form, allocTarget: e.target.value})} /></label>
          </div>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">{t("Bika intego")}</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>{t("Reka")}</Btn></div>
        </form>
      </Modal>
      <Modal open={sheet === 'achieve' && !!metric} title={t("Ibyagezweho bitari amafaranga")} hint="Ibi bibarwa intoki. Imisanzu ibarwa yonyine." onClose={() => setSheet(null)}>
        <form className="form" onSubmit={event => { event.preventDefault(); const chosen = metrics.find((m: any) => m.id === Number(form.metricId)) || metrics.find((m: any) => !m.contributionTypeId); if (!chosen) return setMsg('Hitamo igipimo.'); call(`/budgets/metrics/${chosen.id}/achievement`, 'POST', {quantity: form.achievementQty || 0, ...(user.role === 'REGIONAL_LEADER' ? {churchId: form.achievementChurchId} : {})}); }}>
          <label>{t("Igipimo")}<select value={form.metricId || metrics.find((m: any) => !m.contributionTypeId)?.id || ''} onChange={e => setForm({...form, metricId: e.target.value})}>{metrics.filter((m: any) => !m.contributionTypeId).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          {user.role === 'REGIONAL_LEADER' && <label>{t("Itorero")}<select value={form.achievementChurchId || ''} onChange={e => setForm({...form, achievementChurchId: e.target.value})}><option value="">{t("Hitamo")}</option>{churches.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          <label>{t("Umubare")}<input type="number" min="0" value={form.achievementQty || ''} onChange={e => setForm({...form, achievementQty: e.target.value})} /></label>
          <Note text={msg} />
          <div className="actions"><Btn icon="save" type="submit">{t("Bika ibyagezweho")}</Btn><Btn icon="x" tone="secondary" onClick={() => setSheet(null)}>{t("Reka")}</Btn></div>
        </form>
      </Modal>
      <ConfirmModal open={confirm === 'budget'} title={t("Siba igishushanyo")} hint={t("Period n’ibipimo byayo bizasibwa burundu.")} confirm={t("Siba")} danger onClose={() => setConfirm(null)} onConfirm={() => selected && call(`/budgets/${selected.id}`, 'DELETE')} />
      <ConfirmModal open={!!confirm && confirm !== 'budget'} title={t("Siba igipimo")} hint={t("Iki gipimo n’intego zacyo bizasibwa.")} confirm={t("Siba")} danger onClose={() => setConfirm(null)} onConfirm={() => confirm && confirm !== 'budget' && call(`/budgets/metrics/${confirm.metricId}`, 'DELETE')} />
      <div style={{marginTop: 14}}>
        <Table loading={!ready} empty={t("Nta ngengo y’imari iraboneka. Intara ni yo ikora period.")} rows={rows} columns={[
          {key: 'period', label: t("Period")}, {key: 'status', label: 'Imimerere'}, {key: 'metric', label: t("Igipimo")},
          {key: 'target', label: t("Intego")}, {key: 'achievement', label: 'Ibyagezweho'}, {key: 'percentage', label: 'Ijanisha'}, {key: 'remaining', label: 'Asigaye'}
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
  const [filtersReady, setFiltersReady] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([api('/contribution-types'), api('/budgets')]).then(([t, b]) => { if (!live) return; setTypes(t); setBudgets(b); if (b[0]) setBudgetId(String(b[0].id)); }).catch((e: any) => { if (live) setMsg(e.message); }).finally(() => { if (live) setFiltersReady(true); });
    return () => { live = false; };
  }, []);
  async function loadBelievers() {
    if (start && end && end < start) return setMsg('Itariki ya nyuma ntishobora kubanziriza iya mbere.');
    const q = new URLSearchParams(); if (start) q.set('start', start); if (end) q.set('end', end); if (typeId) q.set('contributionTypeId', typeId);
    try { setReportLoading(true); const [s, b] = await Promise.all([api('/reports/summary?' + q), api('/reports/believers?' + q)]); setSummary(s); setRows(b.rows || []); setKind('believers'); setMsg(''); } catch (e: any) { setMsg(e.message); } finally { setReportLoading(false); }
  }
  async function loadBudget() {
    if (!budgetId) return setMsg('Hitamo period ya budget.');
    try { setReportLoading(true); const x = await api('/reports/budget-performance?budgetId=' + budgetId); setSummary({budget: x.budget}); setRows(x.rows || []); setKind('budget'); setMsg(''); } catch (e: any) { setMsg(e.message); } finally { setReportLoading(false); }
  }
  return (
    <section>
      {!filtersReady ? <Bones count={4} /> : <div className="panel">
        <h3>{t("Hitamo raporo")}</h3>
        <p className="muted">{user.role === 'SECTION' || user.role === 'GROUP' ? t("Ubona niba umwizera yatanze, utabonana amafaranga ye.") : t("Ubona amafaranga y’abizera bari mu rwego rwawe.")}</p>
        <div className="form">
          <div className="form-row">
            <label>{t("Kuva")}<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
            <label>{t("Kugeza")}<input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
          </div>
          <label>{t("Ubwoko bw’imisanzu")}<select value={typeId} onChange={e => setTypeId(e.target.value)}><option value="">{t("Byose")}</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <Btn icon="chart" onClick={loadBelievers}>{t("Raporo y’abizera")}</Btn>
          <label>{t("Period ya budget")}<select value={budgetId} onChange={e => setBudgetId(e.target.value)}><option value="">{t("Hitamo")}</option>{budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <Btn icon="budget" onClick={loadBudget}>{t("Imikorere ya budget")}</Btn>
          <Note text={msg} />
        </div>
      </div>}
      {reportLoading ? <Bones count={6} /> : summary && (
        <div className="cards" style={{margin: '14px 0'}}>
          {'memberCount' in summary && <div className="stat"><span>{t("Abizera")}</span><b>{summary.memberCount}</b></div>}
          {'contributionEntries' in summary && <div className="stat"><span>{t("Inyandiko z’imisanzu")}</span><b>{summary.contributionEntries}</b></div>}
          {'totalContributed' in summary && <div className="stat"><span>{t("Igiteranyo")}</span><b>{money(summary.totalContributed)}</b></div>}
          {summary.budget && <div className="stat"><span>{t("Budget")}</span><b style={{fontSize: 22}}>{summary.budget.name}</b></div>}
        </div>
      )}
      {!reportLoading && kind === 'believers' && <Table empty={t("Nta bizera bahuye n’iyi raporo.")} rows={rows} columns={[
        {key: 'fullName', label: t("Amazina")}, {key: 'church', label: t("Itorero")}, {key: 'section', label: t("Igihande")}, {key: 'group', label: t("Itsinda")},
        {key: 'status', label: t("Yatanze")}, {key: 'amountRwf', label: t("Amafaranga"), render: r => r.amountRwf == null ? t("Ibanga") : money(r.amountRwf)}
      ]} />}
      {!reportLoading && kind === 'budget' && <Table empty={t("Nta gipimo kiri muri iyi budget.")} rows={rows} columns={Object.keys(rows[0] || {metric: '', target: '', achievement: ''}).filter(k => !['id', 'budgetMetricId'].includes(k)).slice(0, 8).map(k => ({key: k, label: k}))} />}
    </section>
  );
}

function placeOf(row: any) {
  if (row.role === 'REGIONAL_LEADER') return t("Intara");
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
  const [ready, setReady] = useState(false);
  const [removeUser, setRemoveUser] = useState<any>(null);
  const load = () => {
    setReady(false);
    return Promise.all([api('/users'), api('/churches?all=1')]).then(([users, tree]) => { setRows(users); setChurches(tree); }).catch((e: any) => setMsg(e.message)).finally(() => setReady(true));
  };
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
      setMsg(form.id ? t("Ukoresha yahinduwe neza.") : t("Ukoresha yabitswe neza."));
      setOpen(false);
      setForm({role: 'CHURCH', churchId: homeChurchId || ''});
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  async function toggle(row: any) {
    try {
      await api(`/users/${row.id}`, {method: 'PATCH', body: JSON.stringify({isActive: row.isActive === false})});
      setMsg(row.isActive === false ? t("Ukoresha yasubijwe neza.") : t("Ukoresha yahagaritswe neza."));
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  async function removeAccount() {
    if (!removeUser) return;
    try {
      await api(`/users/${removeUser.id}`, {method: 'DELETE'});
      setMsg('Ukoresha yasibwe neza.');
      setRemoveUser(null);
      load();
    } catch (e: any) { setMsg(e.message); setRemoveUser(null); }
  }
  return (
    <section>
      <div className="page-tools">
        <label className="search"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Shakisha ukoresha" /></label>
        <Btn icon="plus" onClick={() => { setMsg(''); setForm({role: 'CHURCH', churchId: homeChurchId || ''}); setOpen(true); }}>{t("Ukoresha")}</Btn>
      </div>
      <Note text={open || removeUser ? '' : msg} />
      <Table loading={!ready} empty={t("Nta mukoresha abonetse.")} rows={shown} columns={[
        {key: 'fullName', label: t("Amazina")},
        {key: 'username', label: 'Username'},
        {key: 'role', label: t("Urwego"), render: row => t(roleLabel[row.role as Role]) || row.role},
        {key: 'place', label: t("Aho ayobora"), render: placeOf},
        {key: 'isActive', label: t("Akora"), render: row => row.isActive === false ? t("Oya") : t("Yego")},
        {key: 'action', label: '', render: row => <span className="row-actions">
          <Act icon="pencil" label={t("Hindura")} onClick={() => { setMsg(''); setForm({id: row.id, fullName: row.fullName, username: row.username, role: row.role, churchId: row.churchId || '', sectionId: row.sectionId || '', groupId: row.groupId || '', password: ''}); setOpen(true); }} />
          {row.id !== selfId && <Act icon={row.isActive === false ? 'undo' : 'ban'} tone={row.isActive === false ? 'edit' : 'danger'} label={row.isActive === false ? t("Subiza") : t("Hagarika")} onClick={() => toggle(row)} />}
          {regional && row.id !== selfId && <Act icon="trash" tone="danger" label={t("Siba")} onClick={() => { setMsg(''); setRemoveUser(row); }} />}
        </span>}
      ]} />
      <Modal open={open} title={form.id ? t("Hindura ukoresha") : t("Ongeramo ukoresha")} hint={regional ? t("Itorero, igihande, n’itsinda bigomba kuba bifite ukoresha uyobora ayo makuru.") : t("Ushobora guha konti abayobora itorero ryawe, igihande, n’itsinda.")} onClose={() => setOpen(false)}>
        <form className="form" onSubmit={event => { event.preventDefault(); save(); }}>
          <div className="form-row">
            <label>{t("Amazina")}<input value={form.fullName || ''} onChange={e => setForm({...form, fullName: e.target.value})} autoFocus /></label>
            <label>Username<input value={form.username || ''} onChange={e => setForm({...form, username: e.target.value})} autoComplete="off" /></label>
          </div>
          <label>{t("Ijambobanga")}<input type="password" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} autoComplete="new-password" placeholder={form.id ? t("Siga ubusa niba udahindura") : ''} /></label>
          <label>{t("Urwego")}<select value={form.role || 'CHURCH'} onChange={e => setForm({...form, role: e.target.value, churchId: regional ? '' : (homeChurchId || ''), sectionId: '', groupId: ''})}>
            <option value="CHURCH">{t("Itorero")}</option>
            <option value="SECTION">{t("Igihande")}</option>
            <option value="GROUP">{t("Itsinda")}</option>
            {regional && <option value="REGIONAL_LEADER">{t("Intara")}</option>}
          </select></label>
          {form.role === 'CHURCH' && regional && <label>{t("Itorero")}<select value={form.churchId || ''} onChange={e => setForm({...form, churchId: e.target.value})}><option value="">{t("Hitamo")}</option>{churches.filter((church: any) => church.isActive !== false).map((church: any) => <option key={church.id} value={church.id}>{church.name}</option>)}</select></label>}
          {form.role === 'CHURCH' && !regional && <p className="muted">{churches[0]?.name || 'Itorero ryawe'}</p>}
          {form.role === 'SECTION' && <label>{t("Igihande")}<select value={form.sectionId || ''} onChange={e => setForm({...form, sectionId: e.target.value})}><option value="">{t("Hitamo")}</option>{sections.map((section: any) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>}
          {form.role === 'GROUP' && <label>{t("Itsinda")}<select value={form.groupId || ''} onChange={e => setForm({...form, groupId: e.target.value})}><option value="">{t("Hitamo")}</option>{groups.map((group: any) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>}
          <Note text={msg} />
          <div className="actions">
            <Btn icon="save" type="submit">{form.id ? t("Bika impinduka") : t("Bika ukoresha")}</Btn>
            <Btn icon="x" tone="secondary" onClick={() => setOpen(false)}>{t("Reka")}</Btn>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={removeUser != null} title={t("Siba ukoresha")} hint={t("Iyi konti izasibwa burundu. Inyandiko yanditse igumaho.")} confirm={t("Siba")} danger onClose={() => setRemoveUser(null)} onConfirm={removeAccount} />
    </section>
  );
}
function Devices() {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [ready, setReady] = useState(false);
  const load = () => {
    setReady(false);
    return api('/devices').then(setRows).catch((e: any) => setMsg(e.message)).finally(() => setReady(true));
  };
  useEffect(() => { load(); }, []);
  async function act(id: number, action: 'approve' | 'revoke') {
    try { await api(`/devices/${id}/${action}`, {method: 'POST', body: '{}'}); setMsg(action === 'approve' ? t("Device yemewe. Ishobora kubika ibikorwa offline.") : t("Uburenganzira bwa device bwakuweho.")); load(); } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section>
      <p className="muted">{t("Emeza ibikoresho byemewe gukora nta internet. Ibitaramezwa bishobora kwinjira gusa iyo internet iriho.")}</p>
      <Note text={msg} />
      <Table loading={!ready} empty={t("Nta device yasabye gukora offline. Iyo Web cyangwa Desktop iwinjira, igaragara hano.")} rows={rows} columns={[
        {key: 'user', label: t("Ukoresha"), render: d => d.user?.fullName || d.user?.username || '—'},
        {key: 'role', label: t("Urwego"), render: d => t(roleLabel[d.user?.role as Role]) || d.user?.role || '—'},
        {key: 'label', label: 'Device', render: d => d.label || d.deviceId},
        {key: 'status', label: 'Imimerere', render: d => d.isApproved && !d.revokedAt ? 'Yemewe' : d.revokedAt ? 'Yakuweho' : 'Itegereje'},
        {key: 'seen', label: 'Yaherukaga', render: d => when(d.lastSeenAt)},
        {key: 'action', label: '', render: d => d.isApproved && !d.revokedAt ? <Act icon="ban" tone="danger" label="Kuraho" onClick={() => act(d.id, 'revoke')} /> : <Btn icon="check" onClick={() => act(d.id, 'approve')}>{t("Emeza")}</Btn>}
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
  const [loading, setLoading] = useState(false);
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
    if (!path) { setData([]); setLoading(false); return; }
    let live = true;
    setLoading(true);
    setData([]);
    api(path).then(x => { if (!live) return; setData(Array.isArray(x) ? x : []); setError(''); }).catch((e: any) => { if (!live) return; setData([]); setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [page, user, tick]);
  const {lang} = useLang();
  const allowed = user ? pages[user.role] : [];
  const shown = allowed.includes(page) ? page : 'Dashboard';
  const current = nav[shown];
  const heading = user ? navTitle(user.role, shown) : current.title;
  useEffect(() => { document.title = `${t(heading)} · Intara ya Bwuzuri`; }, [heading, lang]);
  const refresh = () => setTick(n => n + 1);
  if (!user) return <Login done={setUser} />;
  return (
    <div className="shell">
      <div className="sabbath">
        <img src="/brand/sda-symbol-white.svg" alt={t("Ikimenyetso cy'Itorero ry'Abadiventisiti b'Umunsi wa Karindwi")} />
      </div>
      <aside>
        <div className="brand"><small>Intara ya Bwuzuri</small><strong>Bwuzuri</strong></div>
        <nav>{allowed.map(id => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon name={nav[id].icon} /><span className="nav-copy">{t(navTitle(user.role, id))}<small>{t(nav[id].hint)}</small></span></button>)}</nav>
        <div className="who"><strong>{user.fullName}</strong><span>{t(roleLabel[user.role])}</span><button className="with-ico" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }}><Icon name="logout" />{t("Sohoka")}</button></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="pills">
            <span className={online ? 'pill' : 'pill warn'}>{online ? t("Online") : t("Offline")}</span>
            <span className="pill">{trusted ? t("Offline yemewe") : t("Offline itarakemererwa")}</span>
            {sync && <span className="pill">{t(sync)}</span>}
          </div>
          <LanguageSwitch />
        </header>
        <main>
          <div className="page-head"><div><h1>{t(heading)}</h1><p>{t(current.about)}</p></div></div>
          {error && <Note text={error} />}
          {page === 'Dashboard' && <Dashboard user={user} />}
          {page === 'Churches' && <Churches user={user} rows={data} refresh={refresh} loading={loading} />}
          {page === 'Contributions' && <Contributions rows={data} refresh={refresh} loading={loading} />}
          {page === 'Budgets' && <Budgets user={user} />}
          {page === 'Ishuri ryo ku Isabato' && <Sabbath user={user} rows={data} refresh={refresh} loading={loading} />}
          {page === 'Expenses' && <Expenses user={user} rows={data} refresh={refresh} loading={loading} />}
          {page === 'Assets' && <Assets user={user} rows={data} refresh={refresh} loading={loading} />}
          {page === 'Reports' && <Reports user={user} />}
          {page === 'Users' && <Accounts selfId={user.id} regional={user.role === 'REGIONAL_LEADER'} homeChurchId={user.churchId} />}
          {page === 'Devices' && <Devices />}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<LangProvider><App /></LangProvider>);
