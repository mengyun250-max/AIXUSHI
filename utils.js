/* ============================================================
 * 克劳德 - AI卡牌叙事冒险
 * 工具函数（接口）
 * ============================================================ */

/**
 * DOM 元素缓存 - 避免重复查询
 */
const DOM = {
  pages: {},
  elements: {},
  cached: false,
};

/**
 * 缓存DOM元素
 */
function cacheDOM() {
  if (DOM.cached) return;

  // 缓存页面
  DOM.pages = {
    home: document.getElementById('page-home'),
    character: document.getElementById('page-character'),
    world: document.getElementById('page-world'),
    game: document.getElementById('page-game'),
    settings: document.getElementById('page-settings'),
    variables: document.getElementById('page-variables'),
  };

  // 缓存常用元素
  DOM.elements = {
    // 角色表单
    charName: document.getElementById('char-name'),
    charGender: document.getElementById('char-gender'),
    charAge: document.getElementById('char-age'),
    charRace: document.getElementById('char-race'),
    charClass: document.getElementById('char-class'),
    charAppearance: document.getElementById('char-appearance'),
    charBackground: document.getElementById('char-background'),

    // 世界设定
    worldPrompt: document.getElementById('world-prompt'),
    worldPreview: document.getElementById('world-preview'),
    worldBookImport: document.getElementById('world-book-import'),

    // 游戏界面
    narrativeContent: document.getElementById('narrative-content'),
    narrativeInput: document.getElementById('message-input'),
    gameCharName: document.getElementById('game-char-name'),
    gameCharClass: document.getElementById('game-char-class'),
    hpDisplay: document.getElementById('hp-display'),
    hpBar: document.getElementById('hp-bar'),
    statGold: document.getElementById('stat-gold'),
    statFloor: document.getElementById('stat-floor'),

    // 战斗界面
    battlePanel: document.getElementById('battle-panel'),
    narrativePanel: document.getElementById('narrative-panel'),
    turnNumber: document.getElementById('turn-number'),
    enemyName: document.getElementById('enemy-name'),
    enemyLevel: document.getElementById('enemy-level'),
    enemyHpDisplay: document.getElementById('enemy-hp-display'),
    enemyHpBar: document.getElementById('enemy-hp-bar'),
    intentValue: document.getElementById('intent-value'),
    battleHp: document.getElementById('battle-hp'),
    battleBlock: document.getElementById('battle-block'),
    energyCurrent: document.getElementById('energy-current'),
    energyMax: document.getElementById('energy-max'),
    handCards: document.getElementById('hand-cards'),
    drawPileCount: document.getElementById('draw-pile-count'),
    discardPileCount: document.getElementById('discard-pile-count'),
    combatLog: document.getElementById('combat-log'),

    // 设置
    apiEndpoint: document.getElementById('api-endpoint'),
    apiKey: document.getElementById('api-key'),
    modelName: document.getElementById('model-name'),
    temperature: document.getElementById('temperature'),
    tempValue: document.getElementById('temp-value'),
    maxTokens: document.getElementById('max-tokens'),
    tokenValue: document.getElementById('token-value'),
    apiStatus: document.getElementById('api-status'),
    apiStatusText: document.getElementById('api-status-text'),

    // 模态框
    modalDeck: document.getElementById('modal-deck'),
    modalDeckCards: document.getElementById('modal-deck-cards'),

    // Toast
    toast: document.getElementById('toast'),
  };

  DOM.cached = true;
}

/**
 * 显示Toast通知
 * @param {string} message - 消息内容
 * @param {number} duration - 显示时长（毫秒）
 */
function showToast(message, duration = 3000) {
  const toast = DOM.elements.toast;
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/**
 * 页面导航
 * @param {string} pageName - 目标页面名称
 */
function navigateTo(pageName) {
  GameState.previousPage = GameState.currentPage;
  GameState.currentPage = pageName;

  // 移除所有页面的active类
  const allPages = document.querySelectorAll('.page');
  allPages.forEach(page => {
    page.classList.remove('active');
  });

  // 尝试从缓存获取目标页面，如果不存在则直接查询DOM
  let targetPage = DOM.pages[pageName];
  if (!targetPage) {
    targetPage = document.getElementById(`page-${pageName}`);
    // 更新缓存
    if (targetPage) {
      DOM.pages[pageName] = targetPage;
    }
  }

  if (targetPage) {
    targetPage.classList.add('active');
    console.log(`导航到页面: ${pageName}`);
  } else {
    console.error(`页面未找到: page-${pageName}`);
  }
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} - 防抖后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} - 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 洗牌算法（Fisher-Yates）
 * @param {Array} array - 要洗牌的数组
 * @returns {Array} - 洗牌后的新数组
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 生成唯一ID
 * @returns {string} - 唯一ID字符串
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取种族标签
 * @param {string} race - 种族代码
 * @returns {string} - 种族中文名称
 */
function getRaceLabel(race) {
  const labels = {
    human: '人类',
    elf: '精灵',
    dwarf: '矮人',
    halfling: '半身人',
    orc: '兽人',
    other: '其他',
  };
  return labels[race] || '人类';
}

/**
 * 安全的JSON解析
 * @param {string} str - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} - 解析结果或默认值
 */
function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('JSON解析失败:', e);
    return defaultValue;
  }
}

/**
 * 深拷贝对象
 * @param {*} obj - 要拷贝的对象
 * @returns {*} - 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

// 导出工具函数
window.DOM = DOM;
window.cacheDOM = cacheDOM;
window.showToast = showToast;
window.navigateTo = navigateTo;
window.debounce = debounce;
window.throttle = throttle;
window.shuffleArray = shuffleArray;
window.generateId = generateId;
window.getRaceLabel = getRaceLabel;
window.safeJSONParse = safeJSONParse;
window.deepClone = deepClone;
