// All icons are inline SVG strings — no external assets

export function icon(name: string, size = 24, color?: string): string {
  const c = color || 'currentColor';
  const s = size;
  const icons: Record<string, string> = {
    // ── Nav / UI ─────────────────────────────
    home: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>`,

    flask: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M9 3h6M10 3v6.5L4 20a1 1 0 001 1h14a1 1 0 001-1L14 9.5V3"/><path d="M7 16h10" opacity=".4"/></svg>`,

    leaf: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M6 21c3-3 7-5 14-7-2 7-4 11-7 14C10 25 6 21 6 21z"/><path d="M6 21C9 18 12 14 20 14" opacity=".4"/><path d="M4 22l2-1"/></svg>`,

    box: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M21 8v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8"/><path d="M1 4h22v4H1z"/><path d="M10 12h4"/></svg>`,

    backpack: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M8 7V5a4 4 0 018 0v2"/><path d="M8 14h8" opacity=".4"/><path d="M8 17h4" opacity=".3"/></svg>`,

    upgrade: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,

    // ── Resources ────────────────────────────
    gold: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#b8860b"/><circle cx="12" cy="12" r="8" fill="#fbbf24"/><circle cx="12" cy="12" r="7" fill="none" stroke="#b8860b" stroke-width=".5" opacity=".4"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="#7c5200" font-family="serif">G</text></svg>`,

    mana: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#93c5fd"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs><path d="M12 2C12 2 6 10 6 14a6 6 0 0012 0c0-4-6-12-6-12z" fill="url(#mg)"/><ellipse cx="10" cy="13" rx="1.5" ry="2" fill="#bfdbfe" opacity=".5"/></svg>`,

    xp: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.5 5.5,21 7.5,13.5 2,9 9,9" fill="#fbbf24"/><polygon points="12,5 14,9.5 18.5,9.5 14.8,12.5 16.2,17.5 12,14.5 7.8,17.5 9.2,12.5 5.5,9.5 10,9.5" fill="#fde68a"/></svg>`,

    // ── Cauldron ─────────────────────────────
    cauldron: `<svg width="${s}" height="${s}" viewBox="0 0 64 64"><ellipse cx="32" cy="18" rx="22" ry="5" fill="#2d2555" stroke="#4a3d6a" stroke-width="1.5"/><path d="M10 18v18c0 12 10 20 22 20s22-8 22-20V18" fill="#1e1838" stroke="#4a3d6a" stroke-width="1.5"/><ellipse cx="32" cy="18" rx="22" ry="5" fill="#2d2555"/><path d="M6 16c-3-2-4-6-2-8M58 16c3-2 4-6 2-8" stroke="#4a3d6a" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,

    // ── Potion Bottles ──────────────────────
    potion: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M9 2h6v4l4 8v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6l4-8V2z" fill="#1e1838" stroke="#4a3d6a" stroke-width="1"/><rect x="8" y="1" width="8" height="3" rx="1" fill="#3d3555" stroke="#4a3d6a" stroke-width=".5"/><path d="M7 14h10v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6z" fill="LIQUID_COLOR" opacity=".7"/><ellipse cx="12" cy="14" rx="5" ry="1" fill="LIQUID_COLOR" opacity=".9"/></svg>`,

    // ── Ingredients ──────────────────────────
    herb: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"><path d="M12 22V8" stroke="#4ade80" stroke-width="2"/><path d="M8 8c0-3 4-6 4-6s4 3 4 6" fill="#4ade80" opacity=".8"/><path d="M5 14c0-3 3.5-5 7-5" stroke="#4ade80" stroke-width="1.5" fill="none"/><path d="M19 14c0-3-3.5-5-7-5" stroke="#4ade80" stroke-width="1.5" fill="none"/><circle cx="5" cy="14" r="1.5" fill="#4ade80" opacity=".4"/><circle cx="19" cy="14" r="1.5" fill="#4ade80" opacity=".4"/></svg>`,

    mushroom: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 3C7 3 3 7 3 10h18c0-3-4-7-9-7z" fill="#7c3aed"/><circle cx="9" cy="7" r="1.5" fill="#a78bfa" opacity=".6"/><circle cx="14" cy="8" r="1" fill="#a78bfa" opacity=".6"/><rect x="10" y="10" width="4" height="11" rx="1" fill="#d4c9a8"/></svg>`,

    crystal: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><polygon points="12,2 17,9 15,22 9,22 7,9" fill="#60a5fa" opacity=".7"/><polygon points="12,2 14,9 12,22 10,9" fill="#93c5fd" opacity=".5"/><polygon points="12,2 17,9 14,9" fill="#bfdbfe" opacity=".3"/></svg>`,

    flame: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 2c0 0 8 7 8 14a8 8 0 01-16 0C4 9 12 2 12 2z" fill="#f87171" opacity=".8"/><path d="M12 8c0 0 4 4 4 8a4 4 0 01-8 0c0-4 4-8 4-8z" fill="#fbbf24" opacity=".7"/><ellipse cx="12" cy="18" rx="2" ry="3" fill="#fde68a" opacity=".6"/></svg>`,

    droplet: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 2C12 2 6 10 6 15a6 6 0 0012 0c0-5-6-13-6-13z" fill="#86efac" opacity=".7"/><ellipse cx="10" cy="14" rx="1.5" ry="2" fill="#bbf7d0" opacity=".5"/></svg>`,

    sparkle: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z" fill="#fde047" opacity=".8"/></svg>`,

    dust: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="8" cy="8" r="2" fill="${c}" opacity=".6"/><circle cx="16" cy="6" r="1.5" fill="${c}" opacity=".4"/><circle cx="12" cy="14" r="2.5" fill="${c}" opacity=".5"/><circle cx="6" cy="17" r="1.5" fill="${c}" opacity=".3"/><circle cx="18" cy="16" r="2" fill="${c}" opacity=".5"/><circle cx="14" cy="20" r="1" fill="${c}" opacity=".4"/></svg>`,

    bomb: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="14" r="8" fill="#1e1838" stroke="#4a3d6a" stroke-width="1.5"/><path d="M14 6l2-3" stroke="#f87171" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="2" r="2" fill="#fbbf24" opacity=".8"/><ellipse cx="9" cy="11" rx="2" ry="2.5" fill="#2d2555" opacity=".5"/></svg>`,

    scroll: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" fill="#2d1b4e" stroke="#7c3aed" stroke-width="1"/><path d="M8 7h8M8 10h8M8 13h5" stroke="#a78bfa" stroke-width="1" opacity=".5" stroke-linecap="round"/><circle cx="17" cy="17" r="3" fill="#7c3aed" opacity=".3"/></svg>`,

    wand: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><line x1="4" y1="20" x2="18" y2="6" stroke="#d4c9a8" stroke-width="2.5" stroke-linecap="round"/><circle cx="19" cy="5" r="2" fill="#fbbf24"/><circle cx="17" cy="3" r="1" fill="#fde68a" opacity=".5"/><circle cx="21" cy="4" r=".8" fill="#fde68a" opacity=".4"/></svg>`,

    // ── Distributor Avatars ─────────────────
    goblin: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><circle cx="24" cy="26" r="16" fill="#2d5a2d"/><circle cx="24" cy="24" r="14" fill="#4ade80"/><ellipse cx="18" cy="21" rx="3" ry="3.5" fill="white"/><ellipse cx="30" cy="21" rx="3" ry="3.5" fill="white"/><circle cx="18" cy="21" r="2" fill="#1a1a2e"/><circle cx="30" cy="21" r="2" fill="#1a1a2e"/><ellipse cx="24" cy="28" rx="4" ry="2" fill="#2d5a2d"/><path d="M8 18c-2-6 2-10 6-8" fill="#4ade80"/><path d="M40 18c2-6-2-10-6-8" fill="#4ade80"/><path d="M22 30l2 2 2-2" stroke="#2d5a2d" stroke-width="1" fill="none"/></svg>`,

    fairy: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><circle cx="24" cy="24" r="12" fill="#fce7f3"/><circle cx="24" cy="22" r="10" fill="#fdf2f8"/><ellipse cx="20" cy="20" rx="2" ry="2.5" fill="#ec4899"/><ellipse cx="28" cy="20" rx="2" ry="2.5" fill="#ec4899"/><path d="M21 26c1.5 2 4.5 2 6 0" stroke="#ec4899" stroke-width="1" fill="none"/><path d="M10 16c-6-4-4-12 2-12s4 8 2 12" fill="#f9a8d4" opacity=".5"/><path d="M38 16c6-4 4-12-2-12s-4 8-2 12" fill="#f9a8d4" opacity=".5"/><circle cx="16" cy="10" r="1.5" fill="#fbbf24" opacity=".6"/><circle cx="32" cy="8" r="1" fill="#fbbf24" opacity=".5"/><circle cx="24" cy="6" r="1.5" fill="#fbbf24" opacity=".7"/></svg>`,

    imp: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><circle cx="24" cy="26" r="14" fill="#7f1d1d"/><circle cx="24" cy="24" r="12" fill="#dc2626"/><ellipse cx="19" cy="21" rx="3" ry="2.5" fill="#fbbf24"/><ellipse cx="29" cy="21" rx="3" ry="2.5" fill="#fbbf24"/><circle cx="19" cy="21" r="1.5" fill="#1a1a2e"/><circle cx="29" cy="21" r="1.5" fill="#1a1a2e"/><path d="M20 28c2 2 6 2 8 0" stroke="#7f1d1d" stroke-width="1.5" fill="none"/><path d="M14 12l-4-8" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/><path d="M34 12l4-8" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/></svg>`,

    merchant: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><circle cx="24" cy="26" r="14" fill="#78350f"/><circle cx="24" cy="24" r="12" fill="#fde68a"/><ellipse cx="20" cy="20" rx="2" ry="2.5" fill="#1a1a2e"/><ellipse cx="28" cy="20" rx="2" ry="2.5" fill="#1a1a2e"/><path d="M21 27c1 1.5 5 1.5 6 0" stroke="#92400e" stroke-width="1" fill="none"/><path d="M16 30c2 3 5 4 8 4s6-1 8-4" fill="#92400e"/><rect x="10" y="8" width="28" height="8" rx="4" fill="#78350f"/><rect x="14" y="4" width="20" height="8" rx="3" fill="#92400e"/></svg>`,

    cat: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><circle cx="24" cy="26" r="14" fill="#c2410c"/><circle cx="24" cy="24" r="12" fill="#fb923c"/><ellipse cx="19" cy="22" rx="3" ry="3.5" fill="#fef3c7"/><ellipse cx="29" cy="22" rx="3" ry="3.5" fill="#fef3c7"/><ellipse cx="19" cy="22" rx="1.5" ry="3" fill="#1a1a2e"/><ellipse cx="29" cy="22" rx="1.5" ry="3" fill="#1a1a2e"/><ellipse cx="24" cy="28" rx="2" ry="1" fill="#c2410c"/><path d="M22 28l-4 2M26 28l4 2M22 29l-3 2.5M26 29l3 2.5" stroke="#fb923c" stroke-width=".8"/><polygon points="11,8 10,20 18,18" fill="#fb923c"/><polygon points="37,8 38,20 30,18" fill="#fb923c"/></svg>`,

    // ── Zones ────────────────────────────────
    meadow: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#14532d" opacity=".3"/><path d="M8 36c4-8 8-12 16-10s12 2 16 10" fill="#16a34a" opacity=".4"/><path d="M12 32v-8M12 32l-3-5M12 32l3-5" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round"/><path d="M24 28v-10M24 28l-4-6M24 28l4-6" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round"/><path d="M36 34v-6M36 34l-2-4M36 34l2-4" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round"/><circle cx="18" cy="18" r="5" fill="#fbbf24" opacity=".3"/><circle cx="18" cy="18" r="3" fill="#fde68a" opacity=".5"/></svg>`,

    swamp: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#14532d" opacity=".2"/><ellipse cx="24" cy="34" rx="20" ry="8" fill="#16a34a" opacity=".3"/><ellipse cx="24" cy="34" rx="16" ry="6" fill="#065f46" opacity=".3"/><circle cx="16" cy="32" r="2" fill="#86efac" opacity=".4"/><circle cx="28" cy="30" r="1.5" fill="#86efac" opacity=".3"/><circle cx="36" cy="34" r="1" fill="#86efac" opacity=".4"/><path d="M20 16v12M20 16l-4 4M20 16l2 5" stroke="#4ade80" stroke-width="1.5" opacity=".6" stroke-linecap="round"/><circle cx="32" cy="20" r="4" fill="#7c3aed" opacity=".3"/><circle cx="32" cy="20" r="2.5" fill="#a78bfa" opacity=".2"/></svg>`,

    cave: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#1e1b4b" opacity=".3"/><path d="M8 40L18 12h12l10 28z" fill="#312e81" opacity=".4"/><path d="M14 40L20 18h8l6 22z" fill="#1e1b4b" opacity=".3"/><polygon points="20,28 22,20 24,28" fill="#60a5fa" opacity=".6"/><polygon points="28,30 30,22 32,30" fill="#818cf8" opacity=".5"/><polygon points="16,34 17,28 19,34" fill="#a78bfa" opacity=".4"/><circle cx="24" cy="34" r="1" fill="#60a5fa" opacity=".6"/></svg>`,

    ruins: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#44403c" opacity=".2"/><rect x="8" y="20" width="6" height="20" rx="1" fill="#78716c" opacity=".4"/><rect x="8" y="16" width="6" height="4" rx="1" fill="#78716c" opacity=".5"/><rect x="20" y="14" width="8" height="26" rx="1" fill="#78716c" opacity=".4"/><path d="M20 14h8l-4-6z" fill="#78716c" opacity=".5"/><rect x="34" y="24" width="6" height="16" rx="1" fill="#78716c" opacity=".3"/><circle cx="24" cy="26" r="2" fill="#7c3aed" opacity=".4"/><circle cx="24" cy="26" r="1" fill="#a78bfa" opacity=".6"/></svg>`,

    mountain: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#1e3a5f" opacity=".2"/><path d="M4 40L20 10l16 30z" fill="#475569" opacity=".4"/><path d="M20 10l8 15 8 15z" fill="#64748b" opacity=".3"/><path d="M16 22l4-12 4 8z" fill="white" opacity=".2"/><path d="M28 34L36 18l8 22z" fill="#475569" opacity=".3"/><circle cx="36" cy="14" r="1.5" fill="#fde68a" opacity=".6"/><circle cx="34" cy="16" r="1" fill="#fde68a" opacity=".4"/></svg>`,

    // ── Upgrades ─────────────────────────────
    cauldron_sm: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><ellipse cx="12" cy="8" rx="8" ry="2.5" fill="#2d2555"/><path d="M4 8v7c0 4 4 7 8 7s8-3 8-7V8" fill="#1e1838" stroke="#4a3d6a" stroke-width="1"/><ellipse cx="12" cy="8" rx="8" ry="2.5" fill="#2d2555" stroke="#4a3d6a" stroke-width=".5"/></svg>`,

    book: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" fill="#4c1d95"/><rect x="4" y="2" width="4" height="20" fill="#5b21b6" opacity=".5"/><path d="M10 7h6M10 10h6M10 13h4" stroke="#c4b5fd" stroke-width="1" opacity=".4" stroke-linecap="round"/></svg>`,

    gem: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><polygon points="12,2 20,9 17,22 7,22 4,9" fill="#2563eb" opacity=".6"/><polygon points="12,2 16,9 12,22 8,9" fill="#60a5fa" opacity=".5"/><polygon points="12,2 16,9 8,9" fill="#93c5fd" opacity=".4"/></svg>`,

    fountain: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="8" y="14" width="8" height="8" rx="1" fill="#6b7280"/><path d="M12 4v10" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/><path d="M12 4c-2 2-4 4-4 6" stroke="#60a5fa" stroke-width="1.5" fill="none" opacity=".5"/><path d="M12 4c2 2 4 4 4 6" stroke="#60a5fa" stroke-width="1.5" fill="none" opacity=".5"/></svg>`,

    well: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><ellipse cx="12" cy="16" rx="8" ry="4" fill="none" stroke="#6b7280" stroke-width="1.5"/><path d="M4 16v-2a8 4 0 0116 0v2" fill="none" stroke="#6b7280" stroke-width="1.5"/><path d="M8 14l4-10 4 10" fill="none" stroke="#6b7280" stroke-width="1.5"/><path d="M6 8h12" stroke="#6b7280" stroke-width="1"/></svg>`,

    shelf: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="3" y="2" width="18" height="20" rx="1" fill="none" stroke="#92400e" stroke-width="1.5"/><path d="M3 8h18M3 14h18" stroke="#92400e" stroke-width="1.5"/><rect x="6" y="4" width="3" height="3" rx=".5" fill="#a78bfa" opacity=".5"/><rect x="11" y="4" width="3" height="3" rx=".5" fill="#4ade80" opacity=".5"/><rect x="7" y="10" width="3" height="3" rx=".5" fill="#fb923c" opacity=".5"/><rect x="13" y="10" width="3" height="3" rx=".5" fill="#60a5fa" opacity=".5"/></svg>`,

    bag: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="12" rx="3" fill="#92400e"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="#b8860b" stroke-width="1.5"/><path d="M8 14h8" stroke="#b8860b" stroke-width="1" opacity=".5"/></svg>`,

    cart: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M4 4h2l3 12h10l2-8H8" fill="none" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="20" r="2" fill="#6b7280"/><circle cx="18" cy="20" r="2" fill="#6b7280"/></svg>`,

    enchant_cart: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M4 4h2l3 12h10l2-8H8" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="20" r="2" fill="#7c3aed"/><circle cx="18" cy="20" r="2" fill="#7c3aed"/><circle cx="16" cy="6" r="1" fill="#fbbf24" opacity=".7"/><circle cx="18" cy="4" r=".8" fill="#fbbf24" opacity=".5"/></svg>`,

    // ── Misc ─────────────────────────────────
    fire_streak: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 2c0 0 8 6 8 13a8 8 0 01-16 0C4 8 12 2 12 2z" fill="#f97316" opacity=".8"/><path d="M12 8c0 0 4 3.5 4 7.5a4 4 0 01-8 0c0-4 4-7.5 4-7.5z" fill="#fbbf24" opacity=".7"/></svg>`,

    check: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round"><path d="M6 12l4 4 8-8"/></svg>`,

    lock: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="#4a3d6a"/><path d="M8 11V7a4 4 0 018 0v4" fill="none" stroke="#6b7280" stroke-width="2"/><circle cx="12" cy="16" r="1.5" fill="#8b83a8"/></svg>`,

    close: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,

    wizard: `<svg width="${s}" height="${s}" viewBox="0 0 48 48"><path d="M24 4l-12 24h24z" fill="#4c1d95"/><path d="M24 4l-8 18h16z" fill="#5b21b6" opacity=".7"/><circle cx="24" cy="32" r="10" fill="#fde68a"/><ellipse cx="20" cy="30" rx="2" ry="2.5" fill="#4c1d95"/><ellipse cx="28" cy="30" rx="2" ry="2.5" fill="#4c1d95"/><path d="M22 36c1 1 3 1 4 0" stroke="#92400e" stroke-width="1" fill="none"/><path d="M16 20l-2 6" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/><circle cx="14" cy="18" r="2" fill="#fbbf24" opacity=".7"/></svg>`,
  };

  return icons[name] || `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="${c}" opacity=".3"/></svg>`;
}

// Potion bottle with custom liquid color
export function potionIcon(size: number, liquidColor: string): string {
  return icon('potion', size).replace(/LIQUID_COLOR/g, liquidColor);
}

// Category colors for potions
export const CATEGORY_COLORS: Record<string, string> = {
  potion: '#a855f7',
  candy: '#fb923c',
  prank: '#f87171',
  enchant: '#60a5fa',
};

// Distributor icon map
export const DISTRIBUTOR_ICONS: Record<string, string> = {
  grix: 'goblin',
  whisper: 'fairy',
  skrag: 'imp',
  barnaby: 'merchant',
  patches: 'cat',
};

// Zone icon map
export const ZONE_ICONS: Record<string, string> = {
  meadow: 'meadow',
  swamp: 'swamp',
  caves: 'cave',
  ruins: 'ruins',
  skyreach: 'mountain',
};

// Upgrade icon map
export const UPGRADE_ICONS: Record<string, string> = {
  copper_cauldron: 'cauldron_sm',
  iron_cauldron: 'cauldron_sm',
  enchanted_cauldron: 'cauldron_sm',
  recipe_book: 'book',
  master_recipes: 'book',
  mana_crystal: 'gem',
  mana_fountain: 'fountain',
  mana_well: 'well',
  extra_shelves: 'shelf',
  big_shelves: 'shelf',
  herbalist_bag: 'bag',
  deep_pockets: 'bag',
  bigger_carts: 'cart',
  enchanted_carts: 'enchant_cart',
};
