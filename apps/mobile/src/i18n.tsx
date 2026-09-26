import React, {createContext, useContext, useEffect, useState} from 'react';
import {translate, type Lang} from '@bwuzuri/shared';

let current: Lang = typeof localStorage !== 'undefined' && localStorage.getItem('bwuzuri-lang') === 'en' ? 'en' : 'rw';

export function t(text: string, vars?: Record<string, string | number>) {
  return translate(current, text, vars);
}

export function locale() {
  return current === 'en' ? 'en-GB' : 'fr-RW';
}

const LangContext = createContext<{lang: Lang; setLang: (lang: Lang) => void}>({lang: current, setLang: () => undefined});

export function LangProvider({children}: {children: React.ReactNode}) {
  const [lang, setLangState] = useState<Lang>(current);
  current = lang;
  useEffect(() => { document.documentElement.lang = lang === 'en' ? 'en' : 'rw'; }, [lang]);
  function setLang(next: Lang) {
    current = next;
    localStorage.setItem('bwuzuri-lang', next);
    document.documentElement.lang = next === 'en' ? 'en' : 'rw';
    setLangState(next);
  }
  return <LangContext.Provider value={{lang, setLang}}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function LanguageSwitch() {
  const {lang, setLang} = useLang();
  return (
    <div className="lang" role="group" aria-label={t('Ururimi')}>
      <button type="button" className={lang === 'rw' ? 'on' : ''} aria-pressed={lang === 'rw'} onClick={() => setLang('rw')}>Kinyarwanda</button>
      <button type="button" className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
    </div>
  );
}
