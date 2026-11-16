import { createFixture, builtins, LIMITS, setValue, addField, preview } from './state.js'
import { catalogs } from './messages.js'

// Display-only component tree. All state is disposable synthetic presentation state.
export function mountPrototype(root, initialLocale = 'en') {
  const d = root.ownerDocument
  const state = createFixture()
  let locale = catalogs[initialLocale] ? initialLocale : 'en'
  let error = null
  const draft = { id: '', label: '', type: 'string' }
  const t = key => catalogs[locale][key] ?? key
  function el(tag, attrs = {}, ...children) {
    const node = d.createElement(tag)
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('on')) node.addEventListener(key.slice(2), value)
      else if (value !== false && value != null) node.setAttribute(key, value === true ? '' : value)
    }
    for (const child of children.flat(Infinity)) if (child != null) node.append(typeof child === 'string' ? d.createTextNode(child) : child)
    return node
  }
  const p = key => el('p', { class: 'hint' }, t(key))
  const button = (id, key, fn, disabled = false) => el('button', { id, type: 'button', onclick: fn, disabled }, t(key))
  function update(fn, id) {
    const active = d.activeElement
    const selection = active?.id === id && typeof active.selectionStart === 'number'
      ? [active.selectionStart, active.selectionEnd] : null
    try { fn(); error = null } catch { error = id }
    render(id)
    if (selection) d.getElementById(id)?.setSelectionRange(...selection)
  }
  function field(id, label, control, hint = null) {
    if (error === id) {
      control.setAttribute('aria-invalid', 'true')
      control.setAttribute('aria-describedby', `${id}-error`)
    }
    return el('div', { class: 'field' }, el('label', { for: id }, label), control, hint,
      error === id ? el('p', { id: `${id}-error`, role: 'alert', class: 'error' }, t('invalid')) : null)
  }
  function textEvents(id, fn) {
    const edit = e => { if (!e.isComposing) update(() => fn(e.target.value), id) }
    return { oninput: edit, oncompositionend: edit }
  }
  function input(id, label, value, fn, maximum = LIMITS.personalText, extra = {}) {
    const node = el('input', { id, type: 'text', maxlength: maximum, autocomplete: 'off', ...extra, ...textEvents(id, fn) })
    node.value = value ?? ''
    return field(id, label, node)
  }
  function select(id, label, value, options, fn) {
    const node = el('select', { id, onchange: e => update(() => fn(e.target.value), id) },
      options.map(([v, text]) => el('option', { value: v }, text)))
    node.value = value
    return field(id, label, node)
  }
  function textarea(id, key, value, fn) {
    const node = el('textarea', { id, rows: 6, maxlength: LIMITS.instructions, dir: 'auto', ...textEvents(id, value => {
      if (value.length > LIMITS.instructions) throw new TypeError()
      fn(value)
    }) })
    node.value = value
    return field(id, t(key), node, el('small', {}, `${value.length} / ${LIMITS.instructions}`))
  }
  function card(key, ...children) { return el('section', { class: 'card', 'aria-label': t(key) }, el('h2', {}, t(key)), ...children) }
  function personalField(id, type, label) {
    const value = state.values[id]
    if (type === 'boolean') return select(`value-${id}`, label, value == null ? '' : String(value), ['', 'true', 'false'].map(v => [v, t(v || 'absent')]), v => setValue(state, id, type, v))
    return input(builtins.includes(id) ? id : `value-${id}`, label, value, v => setValue(state, id, type, v), type === 'date' ? 10 : LIMITS.personalText,
      { dir: 'auto', ...(type === 'date' ? { placeholder: 'YYYY-MM-DD' } : type === 'number' ? { inputmode: 'decimal' } : {}) })
  }
  function information() {
    const gender = state.values.gender
    return [card('information', p('infoHint'), el('div', { class: 'grid' },
      builtins.filter(id => id !== 'gender').map(id => personalField(id, id === 'dateOfBirth' ? 'date' : 'string', `${t(id)} · ${t('optional')}`)),
      select('gender', `${t('gender')} · ${t('optional')}`, gender?.kind ?? '', ['', 'male', 'female', 'custom', 'unspecified'].map(v => [v, t(v || 'absent')]), v => {
        if (v === '') delete state.values.gender
        else if (v === 'custom') state.values.gender = { kind: 'custom', customValue: 'Synthetic' }
        else state.values.gender = { kind: v }
      }), gender?.kind === 'custom' ? input('custom-gender', t('customGender'), gender.customValue,
        v => setValue(state, 'gender', 'gender', { kind: 'custom', customValue: v })) : null)),
      card('customTitle', p('customHint'), state.custom.map(def => el('div', { class: 'custom-row' },
        input(`label-${def.id}`, t('label'), def.label, v => { if (!v.trim() || v.length > LIMITS.customLabel) throw new TypeError(); def.label = v }, LIMITS.customLabel),
        personalField(def.id, def.type, def.label),
        button(`remove-${def.id}`, 'remove', () => { state.custom = state.custom.filter(x => x.id !== def.id); delete state.values[def.id]; for (const policy of Object.values(state.permissions)) delete policy[def.id]; render('add-field') }))),
      el('div', { class: 'grid' }, input('custom-id', t('id'), draft.id, v => { draft.id = v }, LIMITS.fieldIdentifier),
        input('custom-label', t('label'), draft.label, v => { draft.label = v }, LIMITS.customLabel),
        select('custom-type', t('type'), draft.type, ['string', 'number', 'boolean', 'date'].map(v => [v, t(v)]), v => { draft.type = v })),
      error === 'add-field' ? el('p', { role: 'alert', class: 'error' }, t('invalid')) : null,
      button('add-field', 'add', () => update(() => { addField(state, draft); draft.id = ''; draft.label = '' }, 'add-field'), state.custom.length >= LIMITS.customFields))]
  }
  function instructions() {
    const overridden = Object.hasOwn(state.overrides, state.profile)
    return [card('global', p('instructionHint'), textarea('global', 'global', state.global, v => { state.global = v }),
      button('suggestion', 'suggestion', () => { state.global = t('suggestionText'); render('global') })),
    card('override', select('instruction-mode', t('mode'), overridden ? 'override' : 'inherit', [['inherit', t('inherit')], ['override', t('overridden')]], v => {
      if (v === 'inherit') delete state.overrides[state.profile]
      else state.overrides[state.profile] = ''
    }), overridden ? textarea('override', 'override', state.overrides[state.profile], v => { state.overrides[state.profile] = v }) : p('inherit')),
    card('effective', el('output', { id: 'effective', 'aria-live': 'polite', dir: 'auto', class: 'preview' }, preview(state) || t(overridden ? 'empty' : 'noInstructions')))]
  }
  function access() {
    const checkbox = el('input', { id: 'opt-in', type: 'checkbox', role: 'switch', 'aria-checked': String(state.optIn), onchange: e => { state.optIn = e.target.checked; state.consent = ''; render('opt-in') } })
    checkbox.checked = state.optIn
    return [card('access', field('opt-in', t('optIn'), checkbox), p('offHint'), p('permissionHint'),
      el('div', { class: 'grid' }, [...builtins.map(id => ({ id, label: t(id) })), ...state.custom].map(def => select(`permission-${def.id}`, def.label,
        state.permissions[state.profile]?.[def.id] ?? 'private', ['private', 'ask_first', 'allow'].map(v => [v, t(v)]), v => {
          state.permissions[state.profile] ??= {}; state.permissions[state.profile][def.id] = v; state.consent = ''
        }))), button('add-profile', 'addProfile', () => {
          state.profile = `Synthetic Profile ${state.profiles.length + 1}`; state.profiles.push(state.profile); render('profile')
        }, state.profiles.length >= LIMITS.environments)),
      card('consentTitle', p('consentHint'), el('div', { class: 'actions' }, ['once', 'session', 'deny'].map(key => button(`consent-${key}`, key, () => {
        state.consent = key; render(`consent-${key}`)
      }))), el('p', { id: 'consent-result', role: 'status' }, state.consent ? `${t('consentResult')} ${t(state.consent)}` : ''))]
  }
  function backup() {
    const password = el('input', { id: 'backup-password', type: 'password', disabled: true, autocomplete: 'off' })
    const confirm = el('input', { id: 'backup-confirm', type: 'checkbox', onchange: e => { state.confirmed = e.target.checked; render('backup-confirm') } })
    confirm.checked = state.confirmed
    return [card('backup', p('backupHint'), field('backup-password', t('password'), password),
      el('div', { class: 'actions' }, ['export', 'import'].map(key => button(`review-${key}`, key, () => { state.backup = key; state.confirmed = false; render('review-heading') }))),
      state.backup ? el('section', { class: 'review', 'aria-labelledby': 'review-heading' },
        el('h3', { id: 'review-heading', tabindex: '-1' }, t(`${state.backup}Review`)),
        state.backup === 'import' ? [select('import-strategy', t('strategy'), state.strategy, [['merge', t('merge')], ['replace', t('replace')]], v => { state.strategy = v; state.confirmed = false }),
          el('p', { role: 'status', class: state.strategy === 'replace' ? 'error' : 'hint' }, t(`${state.strategy}Hint`))] : null,
        field('backup-confirm', t('confirm'), confirm),
        state.confirmed ? button('backup-final', state.backup === 'export' ? 'finalExport' : 'finalImport', () => {}, true) : null,
        button('cancel-backup', 'cancel', () => { state.backup = ''; render('review-export') })) : null)]
  }
  function privacy() {
    return [card('privacy', button('lock', 'lock', () => { state.locked = true; state.consent = ''; render('page-title') }),
      select('auto-lock', t('autoLock'), state.autoLock, [['0', t('never')], ['5', t('five')], ['15', t('fifteen')]], v => { state.autoLock = v }), p('autoHint'), p('policySummary')),
    card('sessions', p(state.sessions ? 'sessionHint' : 'ended'), state.sessions ? button('end-session', 'endSession', () => { state.sessions = false; state.consent = ''; render('page-title') }) : null),
    card('history', p('historyText')), card('limitations', p('limitsText'))]
  }
  function render(focusId) {
    d.documentElement.lang = locale
    d.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    const pages = ['information', 'instructions', 'access', 'backup', 'privacy']
    root.replaceChildren(el('a', { href: '#content', class: 'skip' }, t('skip')),
      el('header', {}, el('div', { class: 'brand' }, el('span', { class: 'mark', 'aria-hidden': 'true' }, 'P'), t('brand')),
        select('locale', t('locale'), locale, [['en', 'English'], ['ar', 'العربية']], v => { locale = v })),
      el('div', { class: 'shell' }, el('aside', {}, el('p', { class: 'eyebrow' }, t('prototype')),
        el('nav', { 'aria-label': t('nav') }, pages.map((page, i) => button(`nav-${page}`, page, () => { state.page = page; error = null; render('page-title') }))),
        el('p', { class: 'rail-note' }, t('footer'))),
      el('main', { id: 'content', tabindex: '-1' }, el('div', { class: 'hero' }, el('p', { class: 'eyebrow' }, t('intro')),
        el('h1', { id: 'page-title', tabindex: '-1' }, t(state.page)), p('subtitle')),
        el('p', { class: 'notice' }, t('notice')),
        select('profile', t('profile'), state.profile, state.profiles.map(v => [v, v]), v => { state.profile = v; state.consent = '' }),
        ...(state.locked ? [card('privacy', el('p', { role: 'status' }, t('locked')), button('reset-lock', 'resetLock', () => { state.locked = false; render('page-title') }))] :
          ({ information, instructions, access, backup, privacy }[state.page])()))))
    d.getElementById(`nav-${state.page}`).setAttribute('aria-current', 'page')
    if (focusId) d.getElementById(focusId)?.focus()
  }
  render()
}
