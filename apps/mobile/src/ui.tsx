import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

export type IconName = 'plus' | 'pencil' | 'ban' | 'undo' | 'trash' | 'check' | 'x' | 'save' | 'archive' | 'logout' | 'login' | 'home' | 'church' | 'coins' | 'book' | 'chart';

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
      {name === 'save' && <path {...common} d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />}
      {name === 'archive' && <path {...common} d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />}
      {name === 'logout' && <path {...common} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />}
      {name === 'login' && <path {...common} d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />}
      {name === 'home' && <path {...common} d="M3 11 12 3l9 8M5 10v10h14V10" />}
      {name === 'church' && <path {...common} d="M12 3v4M10 5h4M4 21V10l8-5 8 5v11M9 21v-5h6v5" />}
      {name === 'coins' && <><ellipse {...common} cx="12" cy="6" rx="8" ry="3" /><path {...common} d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>}
      {name === 'book' && <path {...common} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z" />}
      {name === 'chart' && <path {...common} d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />}
    </svg>
  );
}

export function Btn({icon, children, tone = 'primary', ...rest}: {icon?: IconName; tone?: 'primary' | 'secondary' | 'danger'} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${tone} with-ico`} type="button" {...rest}>{icon && <Icon name={icon} />}{children}</button>;
}

export function Act({icon, label, onClick}: {icon: IconName; label: string; onClick: () => void}) {
  return <button className="act" type="button" aria-label={label} title={label} onClick={onClick}><Icon name={icon} /></button>;
}

export function Modal({open, title, onClose, children}: {open: boolean; title: string; onClose: () => void; children: React.ReactNode}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>
        <header className="modal-head"><h2>{title}</h2><button className="act" type="button" aria-label="Funga" onClick={onClose}><Icon name="x" /></button></header>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ReasonModal({open, title, onClose, onConfirm}: {open: boolean; title: string; onClose: () => void; onConfirm: (reason: string) => void}) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <label>Impamvu<textarea value={reason} onChange={event => setReason(event.target.value)} /></label>
      <Btn icon="ban" tone="danger" onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}>Hagarika</Btn>
      <Btn icon="x" tone="secondary" onClick={onClose}>Reka</Btn>
    </Modal>
  );
}
