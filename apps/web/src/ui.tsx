import {t} from './i18n';
import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

export type IconName = 'plus' | 'pencil' | 'ban' | 'undo' | 'trash' | 'check' | 'x' | 'search' | 'logout' | 'save' | 'archive' | 'filter' | 'login' | 'home' | 'church' | 'coins' | 'budget' | 'book' | 'box' | 'chart' | 'device' | 'user' | 'eye' | 'eye-off';

export function Icon({name}: {name: IconName}) {
  const common = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      {name === 'plus' && <path {...common} d="M12 5v14M5 12h14" />}
      {name === 'pencil' && <path {...common} d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />}
      {name === 'ban' && <><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M5.6 5.6 18.4 18.4" /></>}
      {name === 'undo' && <path {...common} d="M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13" />}
      {name === 'trash' && <path {...common} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />}
      {name === 'check' && <path {...common} d="M20 6 9 17 4 12" />}
      {name === 'x' && <path {...common} d="M18 6 6 18M6 6l12 12" />}
      {name === 'search' && <><circle {...common} cx="11" cy="11" r="7" /><path {...common} d="m20 20-3.5-3.5" /></>}
      {name === 'logout' && <path {...common} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />}
      {name === 'login' && <path {...common} d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />}
      {name === 'save' && <path {...common} d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />}
      {name === 'archive' && <path {...common} d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />}
      {name === 'filter' && <path {...common} d="M3 4h18l-7 8v6l-4 2v-8z" />}
      {name === 'home' && <path {...common} d="M3 11 12 3l9 8M5 10v10h14V10" />}
      {name === 'church' && <path {...common} d="M12 3v4M10 5h4M4 21V10l8-5 8 5v11M9 21v-5h6v5" />}
      {name === 'coins' && <><ellipse {...common} cx="12" cy="6" rx="8" ry="3" /><path {...common} d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>}
      {name === 'budget' && <path {...common} d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" />}
      {name === 'book' && <path {...common} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z" />}
      {name === 'box' && <path {...common} d="M21 8 12 3 3 8l9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />}
      {name === 'chart' && <path {...common} d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />}
      {name === 'device' && <path {...common} d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2" />}
      {name === 'user' && <><circle {...common} cx="12" cy="8" r="3" /><path {...common} d="M5 20c1.5-3 3.8-4.5 7-4.5S17.5 17 19 20" /></>}
      {name === 'eye' && <><path {...common} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle {...common} cx="12" cy="12" r="3" /></>}
      {name === 'eye-off' && <><path {...common} d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.2 4.2M6.1 6.1C3.6 7.9 2 12 2 12a18.6 18.6 0 0 0 6.1 6.5" /></>}
    </svg>
  );
}

export function Btn({icon, children, tone = 'primary', ...rest}: {icon?: IconName; tone?: 'primary' | 'secondary' | 'danger'} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = tone === 'primary' ? 'primary with-ico' : tone === 'danger' ? 'danger with-ico' : 'secondary with-ico';
  return <button className={cls} type="button" {...rest}>{icon && <Icon name={icon} />}{children}</button>;
}

export function Act({icon, label, tone = 'edit', onClick}: {icon: IconName; label: string; tone?: 'edit' | 'danger'; onClick: () => void}) {
  return <button className={tone === 'danger' ? 'act danger' : 'act'} type="button" onClick={onClick}><Icon name={icon} />{label}</button>;
}

export function Modal({open, title, hint, onClose, children}: {open: boolean; title: string; hint?: string; onClose: () => void; children: React.ReactNode}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h3 id="modal-title">{title}</h3>
            {hint && <p className="muted">{hint}</p>}
          </div>
          <button className="icon-only" type="button" aria-label={t("Funga")} onClick={onClose}><Icon name="x" /></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ReasonModal({open, title, onClose, onConfirm}: {open: boolean; title: string; onClose: () => void; onConfirm: (reason: string) => void}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setError(''); } }, [open]);
  return (
    <Modal open={open} title={title} hint={t("Andika impamvu. Iyi nyandiko ihagarara, ntisibwa burundu.")} onClose={onClose}>
      <form className="form" onSubmit={event => { event.preventDefault(); if (!reason.trim()) { setError('Impamvu irakenewe.'); return; } onConfirm(reason.trim()); }}>
        <label>{t("Impamvu")}<textarea value={reason} onChange={event => setReason(event.target.value)} autoFocus /></label>
        {error && <p className="note bad">{error}</p>}
        <div className="actions">
          <Btn icon="ban" tone="danger" type="submit">{t("Hagarika")}</Btn>
          <Btn icon="x" tone="secondary" onClick={onClose}>{t("Reka")}</Btn>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmModal({open, title, hint, confirm, danger, onClose, onConfirm}: {open: boolean; title: string; hint: string; confirm: string; danger?: boolean; onClose: () => void; onConfirm: () => void}) {
  return (
    <Modal open={open} title={title} hint={hint} onClose={onClose}>
      <div className="actions">
        <Btn icon={danger ? 'trash' : 'check'} tone={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirm}</Btn>
        <Btn icon="x" tone="secondary" onClick={onClose}>{t("Reka")}</Btn>
      </div>
    </Modal>
  );
}
