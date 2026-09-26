import React, {useEffect, useState} from 'react';
import {LanguageSwitch, LangProvider, locale, t, useLang} from './i18n';
import {createRoot} from 'react-dom/client';
import {can, type Role} from '@bwuzuri/shared';
import {api} from './api';
import {Act, Btn, Icon, Modal, ReasonModal} from './ui';
import './style.css';

type User = {id?: number; fullName: string; role: Role; churchId?: number | null};
const sid = () => crypto.randomUUID();
const roleLabel: Record<Role, string> = {REGIONAL_LEADER: 'Intara', CHURCH: 'Itorero', SECTION: 'Igihande', GROUP: 'Itsinda'};
const roleHelp: Record<Role, string> = {
  REGIONAL_LEADER: 'Urebere amatorero yose.',
  CHURCH: 'Wandika abizera, imisanzu, n’ibikoresho by’itorero ryawe. Uyobora n’abakoresha baryo.',
  SECTION: 'Wandika abizera bo mu gihande cyawe. Ntushobora kwandika imisanzu.',
  GROUP: 'Wandika abizera n’imibare y’Ishuri ryo ku Isabato.'
};
const pageLabel: Record<string, string> = {
  Ahabanza: 'Ahabanza',
  Abizera: 'Abizera',
  Imisanzu: 'Imisanzu',
  Amafaranga: 'Amafaranga asohoka',
  Ibikoresho: 'Ibikoresho',
  Ishuri: 'Ishuri ryo ku Isabato',
  Raporo: 'Raporo',
  Konti: 'Abakoresha'
};

function Bones({count = 5, kind = 'row'}: {count?: number; kind?: 'row' | 'card'}) {
  return <div className="bones" aria-busy="true" aria-label={t("Tegereza amakuru")}>{Array.from({length: count}, (_, index) => <span className={`bone ${kind}`} key={index} />)}</div>;
}

function pagesFor(role: Role) {
  const pages = ['Ahabanza'];
  if (can.memberCreate(role) || role === 'REGIONAL_LEADER') pages.push('Abizera');
  if (can.contributionsCreate(role)) pages.push('Imisanzu');
  if (can.churchFinanceEdit(role)) pages.push('Amafaranga', 'Ibikoresho');
  if (can.sabbathSchoolCreate(role) || role === 'REGIONAL_LEADER' || role === 'CHURCH' || role === 'SECTION') pages.push('Ishuri');
  if (role === 'REGIONAL_LEADER' || role === 'CHURCH') pages.push('Konti');
  pages.push('Raporo');
  return pages;
}

function Login({done}: {done: (user: User) => void}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login() {
    if (!navigator.onLine) return setError('Nta internet. Huza ukomeze.');
    if (!username.trim() || !password) return setError('Username na password birakenewe.');
    try {
      setBusy(true); setError('');
      const result = await api('/auth/login', {method: 'POST', body: JSON.stringify({username: username.trim(), password})});
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      done(result.user);
    } catch (e: any) { setError(e.message || 'Login yanze.'); } finally { setBusy(false); }
  }
  return (
    <main className="app login">
      <header className="sabbath-band"><img src="/brand/sda-symbol-white.svg" alt={t("Ikimenyetso cy'Itorero ry'Abadiventisiti b'Umunsi wa Karindwi")} /></header>
      <LanguageSwitch />
      <p className="identity"><small>Intara ya Bwuzuri</small><strong>SYSTEM Y’INTARA YA BWUZURI</strong></p>
      <label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></label>
      <label>Password<span className="secret"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" className="eye" aria-pressed={showPassword} aria-label={showPassword ? t("Hisha ijambobanga") : t("Erekana ijambobanga")} onClick={() => setShowPassword(value => !value)}><Icon name={showPassword ? 'eye-off' : 'eye'} /></button></span></label>
      <button className="primary with-ico" disabled={busy} onClick={login}><Icon name="login" />{busy ? t("Tegereza...") : t("Injira")}</button>
      {error && <p className="bad">{t(error)}</p>}
    </main>
  );
}

function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const [user, setUser] = useState<User | null>(() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } });
  const [page, setPage] = useState('Ahabanza');
  const [rows, setRows] = useState<any[]>([]);
  const [churches, setChurches] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({members: [], types: [], expenseTypes: [], assetCategories: []});
  const [summary, setSummary] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [homeReady, setHomeReady] = useState(false);
  const [listReady, setListReady] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false); const expired = () => setUser(null);
    window.addEventListener('online', on); window.addEventListener('offline', off); window.addEventListener('bwuzuri:session-expired', expired);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener('bwuzuri:session-expired', expired); };
  }, []);

  useEffect(() => {
    if (!user || !online) { setHomeReady(true); return; }
    let live = true;
    setHomeReady(false);
    Promise.all([
      api('/churches').then(value => { if (live) setChurches(value); }).catch(() => { if (live) setChurches([]); }),
      api('/reports/summary').then(value => { if (live) setSummary(value); }).catch(() => { if (live) setSummary(null); })
    ]).finally(() => { if (live) setHomeReady(true); });
    return () => { live = false; };
  }, [user, online, tick]);

  useEffect(() => {
    if (!user || !online) return;
    const path = page === 'Abizera' ? '/members' : page === 'Imisanzu' ? '/contributions' : page === 'Amafaranga' ? '/expenses' : page === 'Ibikoresho' ? '/assets' : page === 'Ishuri' ? '/sabbath-school' : page === 'Raporo' ? '/reports/believers' : null;
    if (!path) { setRows([]); setListReady(true); return; }
    let live = true;
    setListReady(false);
    setRows([]);
    const jobs: Promise<unknown>[] = [
      api(path).then(data => { if (live) setRows(Array.isArray(data) ? data : (data?.rows || [])); }).catch((e: any) => { if (live) setMessage(e.message); })
    ];
    if (page === 'Imisanzu') jobs.push(Promise.all([api('/members'), api('/contribution-types')]).then(([members, types]) => { if (live) setMeta((m: any) => ({...m, members, types})); }).catch(() => undefined));
    if (page === 'Amafaranga') jobs.push(api('/expenses/types').then(expenseTypes => { if (live) setMeta((m: any) => ({...m, expenseTypes})); }).catch(() => undefined));
    if (page === 'Ibikoresho') jobs.push(api('/assets/categories').then(assetCategories => { if (live) setMeta((m: any) => ({...m, assetCategories})); }).catch(() => undefined));
    Promise.all(jobs).finally(() => { if (live) setListReady(true); });
    return () => { live = false; };
  }, [user, page, online, tick]);

  if (!user) return <Login done={setUser} />;
  const pages = pagesFor(user.role);
  const groups = churches.flatMap(c => (c.sections || []).flatMap((s: any) => (s.groups || []).map((g: any) => ({id: g.id, label: `${c.name} · ${s.name} · ${g.name}`}))));

  async function save(path: string, body?: any, method = 'POST') {
    if (!online) return setMessage('Nta internet. Ntibyabitswe.');
    try {
      setMessage('');
      await api(path, {method, ...(body === undefined ? {} : {body: JSON.stringify(body)})});
      setMessage('Byabitswe.');
      setForm({});
      setOpen(false);
      setReasonFor(null);
      setTick(n => n + 1);
    } catch (e: any) { setMessage(e.message); }
  }

  return (
    <div className="app">
      <header className="sabbath-band"><img src="/brand/sda-symbol-white.svg" alt={t("Ikimenyetso cy'Itorero ry'Abadiventisiti b'Umunsi wa Karindwi")} /></header>
      <p className="identity"><small>Intara ya Bwuzuri</small><strong>{user.fullName}</strong><span>{t(roleLabel[user.role])}{online ? '' : t(" · Nta internet")}</span></p>
      <LanguageSwitch />
      <h1>{t(pageLabel[page] || page)}</h1>
      <p className="muted">{t(roleHelp[user.role])}</p>
      {message && <p className={message.includes('Byabitswe') ? 'ok' : 'bad'}>{t(message)}</p>}

      {page === 'Ahabanza' && (
        <section>
          {!homeReady ? (
            <>
              <div className="m-stats"><Bones count={5} kind="card" /></div>
              <Bones count={3} />
            </>
          ) : (
            <>
              <div className="m-stats">
                <article><span className="kpi-mark"><Icon name="church" /></span><span>{t("Amatorero")}</span><b>{churches.length}</b><small>{t("Mu rwego rwawe")}</small></article>
                <article><span className="kpi-mark"><Icon name="home" /></span><span>{t("Ibihande")}</span><b>{churches.reduce((n: number, c: any) => n + (c.sections?.length || 0), 0)}</b><small>{t("Bikora")}</small></article>
                <article><span className="kpi-mark"><Icon name="book" /></span><span>{t("Amatsinda")}</span><b>{churches.reduce((n: number, c: any) => n + (c.sections || []).reduce((m: number, s: any) => m + (s.groups?.length || 0), 0), 0)}</b><small>{t("Akora")}</small></article>
                <article><span className="kpi-mark"><Icon name="chart" /></span><span>{t("Abizera")}</span><b>{summary?.memberCount ?? '—'}</b><small>{t("Bakora")}</small></article>
                <article className="lead"><span className="kpi-mark"><Icon name="coins" /></span><span>{t("Imisanzu")}</span><b>{summary ? `${Number(summary.totalContributed).toLocaleString(locale())} RWF` : '—'}</b><small>{summary ? t('{n} inyandiko', {n: summary.contributionEntries}) : t("Igiteranyo")}</small></article>
              </div>
              {churches.map(church => <div className="church" key={church.id}><strong>{church.name}</strong><ul>{(church.sections || []).map((s: any) => <li key={s.id}>{s.name}: {(s.groups || []).map((g: any) => g.name).join(', ') || t("nta tsinda")}</li>)}</ul></div>)}
            </>
          )}
          <Btn icon="logout" tone="secondary" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null); }}>{t("Sohoka")}</Btn>
        </section>
      )}

      {page === 'Abizera' && can.memberCreate(user.role) && <Btn icon="plus" onClick={() => { setForm({}); setOpen(true); }}>{t("Umwizera")}</Btn>}
      <Modal open={open && page === 'Abizera'} title={form.id ? t("Hindura umwizera") : t("Ongeramo umwizera")} onClose={() => setOpen(false)}>
        <p className="muted">{t("Telefoni, niba uyandika, igomba kuba iyihariye.")}</p>
        <label>{t("Amazina")}<input value={form.fullName || ''} onChange={e => setForm({...form, fullName: e.target.value})} /></label>
        <label>{t("Telefoni")}<input value={form.phoneNumber || ''} onChange={e => setForm({...form, phoneNumber: e.target.value})} placeholder="+250..." /></label>
        {user.role !== 'GROUP' && <label>{t("Itsinda")}<select value={form.groupId || ''} onChange={e => setForm({...form, groupId: e.target.value})}><option value="">{t("Hitamo")}</option>{groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>}
        <Btn icon="save" disabled={!online} onClick={() => {
          if (!String(form.fullName || '').trim()) return setMessage('Amazina arakenewe.');
          const body = {fullName: String(form.fullName).trim(), phoneNumber: String(form.phoneNumber || '').trim(), groupId: form.groupId, isActive: true};
          if (form.id) save(`/members/${form.id}`, body, 'PATCH');
          else save('/members', {...body, submissionId: sid()});
        }}>{form.id ? t("Bika impinduka") : t("Bika umwizera")}</Btn>
      </Modal>
      {page === 'Abizera' && user.role === 'REGIONAL_LEADER' && <p className="muted">{t("Intara ireba abizera. Kwiyandikisha bikorwa ku Itorero, Igihande, cyangwa Itsinda.")}</p>}

      {page === 'Imisanzu' && <Btn icon="plus" onClick={() => { setForm({}); setOpen(true); }}>{t("Imisanzu")}</Btn>}
      <Modal open={open && page === 'Imisanzu'} title={form.id ? t("Hindura imisanzu") : t("Andika imisanzu")} onClose={() => setOpen(false)}>
        <p className="muted">{t("Rusange ni amafaranga atari ay’umwizera umwe.")}</p>
        <label>{t("Umwizera")}<select value={form.memberId || ''} onChange={e => setForm({...form, memberId: e.target.value})}><option value="">{t("Rusange")}</option>{(meta.members || []).map((m: any) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select></label>
        <label>{t("Ubwoko")}<select value={form.contributionTypeId || ''} onChange={e => setForm({...form, contributionTypeId: e.target.value})}><option value="">{t("Hitamo")}</option>{(meta.types || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>{t("Amafaranga (RWF)")}<input type="number" value={form.amountRwf || ''} onChange={e => setForm({...form, amountRwf: e.target.value})} /></label>
        <Btn icon="save" disabled={!online} onClick={() => {
          const body = {memberId: form.memberId || null, contributionTypeId: Number(form.contributionTypeId), amountRwf: Number(form.amountRwf)};
          if (form.id) save(`/contributions/${form.id}`, body, 'PATCH');
          else save('/contributions', {...body, submissionId: sid()});
        }}>{form.id ? t("Bika impinduka") : t("Bika imisanzu")}</Btn>
      </Modal>

      {page === 'Amafaranga' && <Btn icon="plus" onClick={() => { setForm({}); setOpen(true); }}>{t("Amafaranga")}</Btn>}
      <Modal open={open && page === 'Amafaranga'} title={form.id ? t("Hindura amafaranga") : t("Andika amafaranga")} onClose={() => setOpen(false)}>
        <label>{t("Ubwoko")}<select value={form.expenseTypeId || ''} onChange={e => setForm({...form, expenseTypeId: e.target.value})}><option value="">{t("Hitamo")}</option>{(meta.expenseTypes || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>{t("Amafaranga (RWF)")}<input type="number" value={form.amountRwf || ''} onChange={e => setForm({...form, amountRwf: e.target.value})} /></label>
        <label>{t("Ibisobanuro")}<textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} /></label>
        <label>{t("Uwahawe")}<input value={form.payee || ''} onChange={e => setForm({...form, payee: e.target.value})} /></label>
        <Btn icon="save" disabled={!online} onClick={() => {
          const body = {expenseTypeId: Number(form.expenseTypeId), amountRwf: Number(form.amountRwf), description: String(form.description || '').trim(), payee: form.payee || ''};
          if (form.id) save(`/expenses/${form.id}`, body, 'PATCH');
          else save('/expenses', {...body, submissionId: sid()});
        }}>{form.id ? t("Bika impinduka") : t("Bika")}</Btn>
      </Modal>

      {page === 'Ibikoresho' && <Btn icon="plus" onClick={() => { setForm({}); setOpen(true); }}>{t("Igikoresho")}</Btn>}
      <Modal open={open && page === 'Ibikoresho'} title={form.id ? t("Hindura igikoresho") : t("Andika igikoresho")} onClose={() => setOpen(false)}>
        <label>{t("Icyiciro")}<select value={form.assetCategoryId || ''} onChange={e => setForm({...form, assetCategoryId: e.target.value})}><option value="">{t("Hitamo")}</option>{(meta.assetCategories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>{t("Izina")}<input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} /></label>
        <label>{t("Umubare")}<input type="number" value={form.quantity || ''} onChange={e => setForm({...form, quantity: e.target.value})} /></label>
        <label>{t("Aho kiri")}<input value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} /></label>
        <label>{t("Umurinzi")}<input value={form.custodian || ''} onChange={e => setForm({...form, custodian: e.target.value})} /></label>
        <Btn icon="save" disabled={!online} onClick={() => {
          const body = {assetCategoryId: Number(form.assetCategoryId), name: String(form.name || '').trim(), quantity: Number(form.quantity), location: form.location || '', custodian: form.custodian || ''};
          if (form.id) save(`/assets/${form.id}`, body, 'PATCH');
          else save('/assets', {...body, submissionId: sid()});
        }}>{form.id ? t("Bika impinduka") : t("Bika igikoresho")}</Btn>
      </Modal>

      {page === 'Ishuri' && can.sabbathSchoolCreate(user.role) && <Btn icon="plus" onClick={() => { setForm({}); setOpen(true); }}>{t("Imibare")}</Btn>}
      <Modal open={open && page === 'Ishuri'} title={form.id ? t("Hindura imibare") : t("Andika imibare")} onClose={() => setOpen(false)}>
        <p className="muted">{form.id ? t("Umurongo umwe ni izina: umubare.") : t("Urugero: Abari 40.")}</p>
        {!form.id && <label>{t("Igipimo")}<input value={form.statName || ''} onChange={e => setForm({...form, statName: e.target.value})} /></label>}
        {!form.id && <label>{t("Umubare")}<input type="number" value={form.statValue || ''} onChange={e => setForm({...form, statValue: e.target.value})} /></label>}
        {form.id && <label>{t("Imibare (izina: umubare)")}<textarea value={form.payloadText || ''} onChange={e => setForm({...form, payloadText: e.target.value})} /></label>}
        <Btn icon="save" disabled={!online} onClick={() => {
          const payload = form.id
            ? Object.fromEntries(String(form.payloadText || '').split('\n').map((line: string) => line.split(':')).filter((p: string[]) => p[0] && p.length > 1).map((p: string[]) => [p[0].trim(), Number(p.slice(1).join(':').trim())]))
            : {[String(form.statName || '').trim()]: Number(form.statValue)};
          if (form.id) save(`/sabbath-school/${form.id}`, {payload}, 'PATCH');
          else save('/sabbath-school', {payload, submissionId: sid()});
        }}>{form.id ? t("Bika impinduka") : t("Bika imibare")}</Btn>
      </Modal>
      {page === 'Ishuri' && !can.sabbathSchoolCreate(user.role) && <p className="muted">{t("Urebere imibare. Kwiyandika bikorwa n’Itsinda gusa.")}</p>}

      {page === 'Raporo' && <p className="muted">{t("Abizera bari mu rwego rwawe, n’uko batanze. Igihande n’Itsinda ntibibona amafaranga y’umuntu umwe.")}</p>}
      {page === 'Konti' && <Konti online={online} regional={user.role === 'REGIONAL_LEADER'} selfId={user.id} homeChurchId={user.churchId} />}

      {page !== 'Ahabanza' && page !== 'Konti' && !listReady && <Bones count={6} />}
      {page !== 'Ahabanza' && page !== 'Konti' && listReady && rows.slice(0, 30).map((row, index) => (
        <div className="row" key={row.id || row.memberId || index}>
          <span>{row.fullName || row.name || row.description || row.member?.fullName || (row.payloadJson ? Object.entries(row.payloadJson).map(([k, v]) => `${k}: ${v}`).join(' · ') : t("Inyandiko"))}</span>
          <span className="muted">{row.amountRwf != null ? `${Number(row.amountRwf).toLocaleString(locale())} RWF` : row.phoneNumber || row.group?.name || row.status || row.quantity || ''}</span>
          {page === 'Abizera' && can.memberCreate(user.role) && <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setForm({id: row.id, fullName: row.fullName, phoneNumber: row.phoneNumber || '', groupId: row.groupId || row.group?.id || ''}); setOpen(true); }} /><Act icon={row.isActive === false ? 'undo' : 'ban'} label={row.isActive === false ? t("Subiza") : t("Hagarika")} onClick={() => save(`/members/${row.id}/active`, {isActive: row.isActive === false}, 'POST')} /></span>}
          {page === 'Imisanzu' && <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setForm({id: row.id, memberId: row.memberId || '', contributionTypeId: row.contributionTypeId, amountRwf: row.amountRwf}); setOpen(true); }} /><Act icon="ban" label={t("Hagarika")} onClick={() => setReasonFor(`/contributions/${row.id}/cancel`)} /></span>}
          {page === 'Amafaranga' && <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setForm({id: row.id, expenseTypeId: row.expenseTypeId, amountRwf: row.amountRwf, description: row.description, payee: row.payee || ''}); setOpen(true); }} /><Act icon="ban" label={t("Hagarika")} onClick={() => setReasonFor(`/expenses/${row.id}/cancel`)} /></span>}
          {page === 'Ibikoresho' && <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setForm({id: row.id, assetCategoryId: row.assetCategoryId, name: row.name, quantity: row.quantity, location: row.location || '', custodian: row.custodian || ''}); setOpen(true); }} /><Act icon="archive" label={t("Bika")} onClick={() => { if (window.confirm(t("Gushyira iki gikoresho mu bubiko?"))) save(`/assets/${row.id}/archive`, {}, 'POST'); }} /></span>}
          {page === 'Ishuri' && can.sabbathSchoolCreate(user.role) && <span className="row-actions"><Act icon="pencil" label={t("Hindura")} onClick={() => { setForm({id: row.id, payloadText: Object.entries(row.payloadJson || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}); setOpen(true); }} /><Act icon="trash" label={t("Siba")} onClick={() => { if (window.confirm(t("Siba iyi mibare?"))) save(`/sabbath-school/${row.id}`, undefined, 'DELETE'); }} /></span>}
        </div>
      ))}
      {page !== 'Ahabanza' && page !== 'Konti' && listReady && !rows.length && <p className="muted">{t("Nta makuru araboneka muri iki gice.")}</p>}

      <nav>{pages.map(item => <button key={item} className={page === item ? 'active' : ''} onClick={() => { setPage(item); setMessage(''); setOpen(false); setForm({}); }}>{t(pageLabel[item] || item)}</button>)}</nav>
      <ReasonModal open={!!reasonFor} title={t("Hagarika inyandiko")} onClose={() => setReasonFor(null)} onConfirm={reason => { if (reasonFor) save(reasonFor, {reason}, 'POST'); }} />
    </div>
  );
}

function Konti({online, regional, selfId, homeChurchId}: {online: boolean; regional: boolean; selfId?: number; homeChurchId?: number | null}) {
  const [rows, setRows] = useState<any[]>([]);
  const [churches, setChurches] = useState<any[]>([]);
  const [form, setForm] = useState<any>({role: 'CHURCH', churchId: homeChurchId || ''});
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [ready, setReady] = useState(false);
  const load = () => {
    setReady(false);
    return Promise.all([api('/users'), api('/churches?all=1')]).then(([users, tree]) => { setRows(users); setChurches(tree); }).catch((e: any) => setMsg(e.message)).finally(() => setReady(true));
  };
  useEffect(() => { load(); }, []);
  const sections = churches.flatMap((church: any) => (church.sections || []).filter((section: any) => section.isActive !== false).map((section: any) => ({id: section.id, label: `${church.name} · ${section.name}`})));
  const groups = churches.flatMap((church: any) => (church.sections || []).flatMap((section: any) => (section.groups || []).filter((group: any) => group.isActive !== false).map((group: any) => ({id: group.id, label: `${church.name} · ${section.name} · ${group.name}`}))));
  async function save() {
    if (!online) return setMsg('Nta internet. Ntibyabitswe.');
    const churchId = form.role === 'CHURCH' && !regional ? (homeChurchId || churches[0]?.id || null) : (form.churchId || null);
    const body: any = {fullName: form.fullName, username: form.username, role: form.role, churchId, sectionId: form.sectionId || null, groupId: form.groupId || null};
    if (form.password) body.password = form.password;
    try {
      setMsg('');
      if (form.id) await api(`/users/${form.id}`, {method: 'PATCH', body: JSON.stringify(body)});
      else await api('/users', {method: 'POST', body: JSON.stringify(body)});
      setMsg('Byabitswe.');
      setOpen(false);
      setForm({role: 'CHURCH', churchId: homeChurchId || ''});
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  return (
    <section>
      <Btn icon="plus" disabled={!online} onClick={() => { setForm({role: 'CHURCH', churchId: homeChurchId || ''}); setOpen(true); }}>{t("Ukoresha")}</Btn>
      {msg && <p className={msg.includes('Byabitswe') ? 'ok' : 'bad'}>{msg}</p>}
      {!ready ? <Bones count={5} /> : rows.map(row => (
        <div className="row" key={row.id}>
          <span>{row.fullName} · {row.username}<br /><span className="muted">{t(roleLabel[row.role as Role])}{row.isActive === false ? t(" · yahagaritswe") : ''}</span></span>
          <span className="row-actions">
            <Act icon="pencil" label={t("Hindura")} onClick={() => { setForm({id: row.id, fullName: row.fullName, username: row.username, role: row.role, churchId: row.churchId || '', sectionId: row.sectionId || '', groupId: row.groupId || ''}); setOpen(true); }} />
            {row.id !== selfId && <Act icon={row.isActive === false ? 'undo' : 'ban'} label={row.isActive === false ? t("Subiza") : t("Hagarika")} onClick={() => api(`/users/${row.id}`, {method: 'PATCH', body: JSON.stringify({isActive: row.isActive === false})}).then(() => load()).catch((e: any) => setMsg(e.message))} />}
          </span>
        </div>
      ))}
      <Modal open={open} title={form.id ? t("Hindura ukoresha") : t("Ongeramo ukoresha")} onClose={() => setOpen(false)}>
        <label>{t("Amazina")}<input value={form.fullName || ''} onChange={e => setForm({...form, fullName: e.target.value})} /></label>
        <label>Username<input value={form.username || ''} onChange={e => setForm({...form, username: e.target.value})} autoComplete="off" /></label>
        <label>{t("Ijambobanga")}<input type="password" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})} placeholder={form.id ? t("Siga ubusa niba udahindura") : ''} autoComplete="new-password" /></label>
        <label>{t("Urwego")}<select value={form.role || 'CHURCH'} onChange={e => setForm({...form, role: e.target.value, churchId: regional ? '' : (homeChurchId || ''), sectionId: '', groupId: ''})}><option value="CHURCH">{t("Itorero")}</option><option value="SECTION">{t("Igihande")}</option><option value="GROUP">{t("Itsinda")}</option>{regional && <option value="REGIONAL_LEADER">{t("Intara")}</option>}</select></label>
        {form.role === 'CHURCH' && regional && <label>{t("Itorero")}<select value={form.churchId || ''} onChange={e => setForm({...form, churchId: e.target.value})}><option value="">{t("Hitamo")}</option>{churches.filter((church: any) => church.isActive !== false).map((church: any) => <option key={church.id} value={church.id}>{church.name}</option>)}</select></label>}
        {form.role === 'CHURCH' && !regional && <p className="muted">{churches[0]?.name || 'Itorero ryawe'}</p>}
        {form.role === 'SECTION' && <label>{t("Igihande")}<select value={form.sectionId || ''} onChange={e => setForm({...form, sectionId: e.target.value})}><option value="">{t("Hitamo")}</option>{sections.map(section => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>}
        {form.role === 'GROUP' && <label>{t("Itsinda")}<select value={form.groupId || ''} onChange={e => setForm({...form, groupId: e.target.value})}><option value="">{t("Hitamo")}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>}
        <Btn icon="save" disabled={!online} onClick={save}>{form.id ? t("Bika impinduka") : t("Bika ukoresha")}</Btn>
      </Modal>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(<LangProvider><App /></LangProvider>);
