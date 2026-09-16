import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { OmnibookMark } from './OmnibookMark'
import { AnimatedNumber } from './AnimatedNumber'
import { formatOmni } from '../lib/money'
import { useAppStore } from '../lib/appStore'

export function Navbar() {
  const { theme, toggleTheme, portfolio, deskMode, setDeskMode } = useAppStore()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <header className="ob-nav" role="banner">
      <div className="ob-nav-inner">
        <div className="ob-nav-left">
          <NavLink to="/" className="ob-nav-brand" aria-label="Omnibook">
            <OmnibookMark width={20} height={14} />
            <span className="ob-nav-word">omnibook</span>
          </NavLink>
          <nav className="ob-nav-links" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => `ob-nav-link ${isActive ? 'is-active' : ''}`}>
              Trade
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) => `ob-nav-link ${isActive ? 'is-active' : ''}`}
            >
              Profile
            </NavLink>
          </nav>
        </div>

        <label className="ob-nav-search">
          <span className="ob-nav-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path
                d="M20 20l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input type="search" placeholder="Search markets" aria-label="Search markets" />
        </label>

        <div className="ob-nav-right">
          <div className="ob-nav-portfolio" aria-label={`Balance ${formatOmni(portfolio)}`}>
            <AnimatedNumber
              value={portfolio}
              format={(n) => formatOmni(n)}
              durationMs={400}
              quiet
            />
          </div>
          <button type="button" className="ob-nav-deposit">
            Deposit
          </button>

          <div className="ob-nav-menu" ref={menuRef}>
            <button
              type="button"
              className="ob-nav-avatar"
              aria-label="Account menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <img src="/avatar.png" alt="" width={32} height={32} />
            </button>

            {open && (
              <div className="ob-dropdown" role="menu">
                <div className="ob-dd-head">
                  <div className="ob-dd-name">alphaDump59</div>
                  <div className="ob-dd-id">#57821</div>
                </div>

                <div className="ob-dd-desk">
                  <span>Desk</span>
                  <div className="ob-dd-toggle" role="group" aria-label="Desk mode">
                    <button
                      type="button"
                      className={deskMode === 'simple' ? 'is-on' : ''}
                      onClick={() => setDeskMode('simple')}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      className={deskMode === 'pro' ? 'is-on' : ''}
                      onClick={() => setDeskMode('pro')}
                    >
                      Pro
                    </button>
                  </div>
                </div>

                <div className="ob-dd-list">
                  <button type="button" className="ob-dd-item" role="menuitem">
                    Settings
                  </button>
                  <div className="ob-dd-item ob-dd-theme" role="menuitem">
                    <span>Theme</span>
                    <div className="ob-dd-toggle">
                      <button
                        type="button"
                        className={theme === 'light' ? 'is-on' : ''}
                        onClick={() => theme !== 'light' && toggleTheme()}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        className={theme === 'dark' ? 'is-on' : ''}
                        onClick={() => theme !== 'dark' && toggleTheme()}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                  <button type="button" className="ob-dd-item" role="menuitem">
                    APIs
                  </button>
                  <button type="button" className="ob-dd-item" role="menuitem">
                    Notifications
                  </button>
                  <NavLink
                    to="/profile"
                    className="ob-dd-item"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </NavLink>
                  <button type="button" className="ob-dd-item" role="menuitem">
                    Help center
                  </button>
                </div>

                <button type="button" className="ob-dd-signout" role="menuitem">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
