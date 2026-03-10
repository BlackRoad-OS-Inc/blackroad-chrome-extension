/**
 * Unit tests for popup.js – BlackRoad Command Center
 * Test environment: jsdom (configured via package.json)
 */

// Mock the Chrome Extension API before requiring popup.js
global.chrome = {
  tabs: {
    create: jest.fn(),
  },
};

const { openUrl, updateStats, initSearch, initActionButtons, initKeyboardShortcuts } = require('../popup.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeElement(className, textContent = '') {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = textContent;
  return el;
}

// ---------------------------------------------------------------------------
// openUrl
// ---------------------------------------------------------------------------

describe('openUrl', () => {
  beforeEach(() => {
    chrome.tabs.create.mockClear();
  });

  test('calls chrome.tabs.create with the correct URL', () => {
    openUrl('https://example.com');
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com' });
  });

  test('opens GitHub organisation URL', () => {
    openUrl('https://github.com/BlackRoad-OS');
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://github.com/BlackRoad-OS' });
  });

  test('opens Cloudflare dashboard URL', () => {
    openUrl('https://dash.cloudflare.com');
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://dash.cloudflare.com' });
  });

  test('opens 30K Agents URL', () => {
    openUrl('https://blackroad-30k-agents.pages.dev');
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://blackroad-30k-agents.pages.dev' });
  });
});

// ---------------------------------------------------------------------------
// updateStats
// ---------------------------------------------------------------------------

describe('updateStats', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span class="stat-value green">28,547</span>
      <span class="stat-value amber">1,453</span>
    `;
  });

  test('sets active stat to a number within expected range', () => {
    updateStats();
    const value = parseInt(document.querySelector('.stat-value.green').textContent.replace(/,/g, ''), 10);
    expect(value).toBeGreaterThanOrEqual(28500);
    expect(value).toBeLessThanOrEqual(28599);
  });

  test('sets learning stat to a number within expected range', () => {
    updateStats();
    const value = parseInt(document.querySelector('.stat-value.amber').textContent.replace(/,/g, ''), 10);
    expect(value).toBeGreaterThanOrEqual(1400);
    expect(value).toBeLessThanOrEqual(1500);
  });

  test('does not throw when stat elements are absent', () => {
    document.body.innerHTML = '';
    expect(() => updateStats()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// initSearch
// ---------------------------------------------------------------------------

describe('initSearch', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input type="text" id="search" />
      <div class="service">Lucidia Earth</div>
      <div class="service">BlackRoad AI</div>
      <a class="link-card">GitHub</a>
      <a class="org">OS</a>
    `;
    initSearch();
  });

  function setSearch(value) {
    const input = document.getElementById('search');
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  test('shows all elements when query is empty', () => {
    setSearch('');
    document.querySelectorAll('.service, .link-card, .org').forEach(el => {
      expect(el.style.opacity).toBe('1');
    });
  });

  test('shows matching elements and dims non-matching ones', () => {
    setSearch('lucidia');
    expect(document.querySelectorAll('.service')[0].style.opacity).toBe('1');
    expect(document.querySelectorAll('.service')[1].style.opacity).toBe('0.3');
  });

  test('is case-insensitive', () => {
    setSearch('GITHUB');
    expect(document.querySelector('.link-card').style.opacity).toBe('1');
  });

  test('dims all elements when query matches nothing', () => {
    setSearch('zzznomatch');
    document.querySelectorAll('.service, .link-card, .org').forEach(el => {
      expect(el.style.opacity).toBe('0.3');
    });
  });
});

// ---------------------------------------------------------------------------
// initActionButtons
// ---------------------------------------------------------------------------

describe('initActionButtons', () => {
  beforeEach(() => {
    chrome.tabs.create.mockClear();
    document.body.innerHTML = `
      <button class="action-btn" data-url="https://github.com/orgs/BlackRoad-OS/repositories">Recent Repos</button>
      <button class="action-btn" data-url="https://dash.cloudflare.com/?to=/:account/pages">Pages</button>
      <button class="action-btn" data-url="https://dash.cloudflare.com/?to=/:account/workers">Workers</button>
      <button class="action-btn" data-url="https://dashboard.stripe.com">Stripe</button>
    `;
    initActionButtons();
  });

  test('clicking Recent Repos button opens the correct URL', () => {
    document.querySelectorAll('.action-btn')[0].click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://github.com/orgs/BlackRoad-OS/repositories',
    });
  });

  test('clicking Pages button opens Cloudflare Pages URL', () => {
    document.querySelectorAll('.action-btn')[1].click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://dash.cloudflare.com/?to=/:account/pages',
    });
  });

  test('clicking Workers button opens Cloudflare Workers URL', () => {
    document.querySelectorAll('.action-btn')[2].click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://dash.cloudflare.com/?to=/:account/workers',
    });
  });

  test('clicking Stripe button opens Stripe dashboard URL', () => {
    document.querySelectorAll('.action-btn')[3].click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://dashboard.stripe.com',
    });
  });

  test('buttons without data-url do not trigger chrome.tabs.create', () => {
    document.body.innerHTML = `<button class="action-btn">No URL</button>`;
    initActionButtons();
    document.querySelector('.action-btn').click();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// initKeyboardShortcuts
// ---------------------------------------------------------------------------

describe('initKeyboardShortcuts', () => {
  beforeEach(() => {
    chrome.tabs.create.mockClear();
    document.body.innerHTML = `<input type="text" id="search" />`;
    initKeyboardShortcuts();
  });

  function fireKey(key, modifiers = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      metaKey: modifiers.metaKey || false,
      ctrlKey: modifiers.ctrlKey || false,
      bubbles: true,
    });
    document.dispatchEvent(event);
    return event;
  }

  test('Ctrl+G opens GitHub', () => {
    fireKey('g', { ctrlKey: true });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://github.com/BlackRoad-OS' });
  });

  test('Meta+G opens GitHub', () => {
    fireKey('g', { metaKey: true });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://github.com/BlackRoad-OS' });
  });

  test('Ctrl+C opens Cloudflare', () => {
    fireKey('c', { ctrlKey: true });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://dash.cloudflare.com' });
  });

  test('Ctrl+A opens 30K Agents', () => {
    fireKey('a', { ctrlKey: true });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://blackroad-30k-agents.pages.dev' });
  });

  test('"/" key focuses the search input', () => {
    const input = document.getElementById('search');
    jest.spyOn(input, 'focus');
    fireKey('/');
    expect(input.focus).toHaveBeenCalled();
  });

  test('plain letter key focuses the search input', () => {
    const input = document.getElementById('search');
    jest.spyOn(input, 'focus');
    fireKey('b');
    expect(input.focus).toHaveBeenCalled();
  });
});
