/* ============================================================
 * 克劳德 - AI卡牌叙事冒险
 * 卡牌系统
 * ============================================================ */

/**
 * 卡牌类型枚举
 */
const CardTypes = {
  ATTACK: 'attack',
  SKILL: 'skill',
  POWER: 'power',
  STATUS: 'status',
  CURSE: 'curse',
};

/**
 * 卡牌稀有度枚举
 */
const CardRarity = {
  BASIC: 'basic',
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
};

/**
 * 卡牌类
 */
class Card {
  constructor(config) {
    this.id = config.id || `card_${generateId()}`;
    this.name = config.name || '未命名卡牌';
    this.type = config.type || CardTypes.ATTACK;
    this.cost = config.cost !== undefined ? config.cost : 1;
    this.description = config.description || '';
    this.rarity = config.rarity || CardRarity.BASIC;
    this.effects = config.effects || [];
    this.exhaust = config.exhaust || false;
    this.ethereal = config.ethereal || false;
    this.innate = config.innate || false;
    this.upgraded = config.upgraded || false;
  }

  /**
   * 播放卡牌
   * @param {Object} battleState - 战斗状态
   * @param {Object} target - 目标（通常是敌人）
   * @returns {Object} - 执行结果
   */
  play(battleState, target) {
    if (battleState.energy < this.cost) {
      return { success: false, message: '能量不足' };
    }

    battleState.energy -= this.cost;
    const results = [];

    for (const effect of this.effects) {
      const result = this.executeEffect(effect, battleState, target);
      results.push(result);
    }

    return { success: true, results };
  }

  /**
   * 执行效果
   * @param {Object} effect - 效果配置
   * @param {Object} battleState - 战斗状态
   * @param {Object} target - 目标
   * @returns {Object} - 效果结果
   */
  executeEffect(effect, battleState, target) {
    switch (effect.type) {
      case 'damage': {
        const damage = effect.value;
        if (target && target.hp !== undefined) {
          const actualDamage = Math.max(0, damage - (target.block || 0));
          target.hp = Math.max(0, target.hp - actualDamage);
          if (target.block) {
            target.block = Math.max(0, target.block - damage);
          }

          // 同步更新GameVariables.battle.enemy（MVU系统）
          if (typeof GameVariables !== 'undefined' && GameVariables.battle.enemy) {
            GameVariables.battle.enemy.hp = target.hp;
            if (GameVariables.battle.enemy.block !== undefined) {
              GameVariables.battle.enemy.block = target.block;
            }

            // 触发变更事件
            if (typeof VariableChangeEmitter !== 'undefined') {
              VariableChangeEmitter.emit('/battle/enemy/hp', target.hp, target.hp + actualDamage);
            }
          }

          return { type: 'damage', value: actualDamage };
        }
        break;
      }

      case 'block':
        battleState.block += effect.value;
        return { type: 'block', value: effect.value };

      case 'draw':
        for (let i = 0; i < effect.value; i++) {
          CardSystem.drawCard(battleState);
        }
        return { type: 'draw', value: effect.value };

      case 'energy':
        battleState.energy += effect.value;
        return { type: 'energy', value: effect.value };

      case 'heal': {
        const healAmount = Math.min(effect.value, battleState.playerMaxHp - battleState.playerHp);
        battleState.playerHp += healAmount;

        // 同步更新GameVariables.battle.core.hp（MVU系统）
        if (typeof GameVariables !== 'undefined') {
          GameVariables.battle.core.hp = battleState.playerHp;

          // 触发变更事件
          if (typeof VariableChangeEmitter !== 'undefined') {
            VariableChangeEmitter.emit('/battle/core/hp', battleState.playerHp, battleState.playerHp - healAmount);
          }
        }

        return { type: 'heal', value: healAmount };
      }

      case 'status':
        if (target && target.statuses) {
          if (!target.statuses[effect.status]) {
            target.statuses[effect.status] = 0;
          }
          target.statuses[effect.status] += effect.value;
        }
        return { type: 'status', status: effect.status, value: effect.value };

      default:
        return { type: 'unknown' };
    }
  }

  /**
   * 生成卡牌HTML（完整版）
   * @param {number} index - 卡牌索引
   * @returns {string} - HTML字符串
   */
  toHTML(index) {
    const typeClass = this.type;
    return `
            <div class="game-card ${typeClass}" data-index="${index}" data-id="${this.id}">
                <div class="card-cost">${this.cost}</div>
                <div class="card-name">${this.name}</div>
                <div class="card-type">${this.getTypeLabel()}</div>
                <div class="card-desc">${this.description}</div>
            </div>
        `;
  }

  /**
   * 生成卡牌HTML（迷你版）
   * @param {number} index - 卡牌索引
   * @returns {string} - HTML字符串
   */
  toMiniHTML(index) {
    const typeClass = this.type;
    return `
            <div class="deck-card-mini ${typeClass}" data-index="${index}" data-id="${this.id}">
                <div class="card-cost">${this.cost}</div>
                <div class="card-name">${this.name}</div>
            </div>
        `;
  }

  /**
   * 获取卡牌类型标签
   * @returns {string} - 类型中文名称
   */
  getTypeLabel() {
    const labels = {
      [CardTypes.ATTACK]: '攻击',
      [CardTypes.SKILL]: '技能',
      [CardTypes.POWER]: '能力',
      [CardTypes.STATUS]: '状态',
      [CardTypes.CURSE]: '诅咒',
    };
    return labels[this.type] || '未知';
  }

  /**
   * 转换为存档数据
   * @returns {Object} - 存档数据对象
   */
  toSaveData() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      cost: this.cost,
      description: this.description,
      rarity: this.rarity,
      effects: this.effects,
      exhaust: this.exhaust,
      ethereal: this.ethereal,
      innate: this.innate,
      upgraded: this.upgraded,
    };
  }

  /**
   * 从存档数据创建卡牌
   * @param {Object} data - 存档数据
   * @returns {Card} - 卡牌实例
   */
  static fromSaveData(data) {
    return new Card(data);
  }
}

/**
 * 卡牌系统
 */
const CardSystem = {
  /**
   * 生成初始卡组
   * @param {Object} character - 角色信息
   * @returns {Array<Card>} - 卡组数组
   */
  generateInitialDeck(character) {
    const deck = [];

    // 基础打击牌 x5
    for (let i = 0; i < 5; i++) {
      deck.push(
        new Card({
          name: '打击',
          type: CardTypes.ATTACK,
          cost: 1,
          description: '造成 6 点伤害',
          rarity: CardRarity.BASIC,
          effects: [{ type: 'damage', value: 6 }],
        }),
      );
    }

    // 基础防御牌 x4
    for (let i = 0; i < 4; i++) {
      deck.push(
        new Card({
          name: '防御',
          type: CardTypes.SKILL,
          cost: 1,
          description: '获得 5 点格挡',
          rarity: CardRarity.BASIC,
          effects: [{ type: 'block', value: 5 }],
        }),
      );
    }

    // 根据背景添加特殊牌
    if (character.class) {
      const specialCards = this.generateClassCards(character.class);
      deck.push(...specialCards);
    }

    return deck;
  },

  /**
   * 根据职业生成特殊卡牌
   * @param {string} characterClass - 角色职业
   * @returns {Array<Card>} - 特殊卡牌数组
   */
  generateClassCards(characterClass) {
    const cards = [];
    const classLower = characterClass.toLowerCase();

    if (classLower.includes('剑') || classLower.includes('战') || classLower.includes('士')) {
      cards.push(
        new Card({
          name: '重斩',
          type: CardTypes.ATTACK,
          cost: 2,
          description: '造成 12 点伤害',
          rarity: CardRarity.COMMON,
          effects: [{ type: 'damage', value: 12 }],
        }),
      );
    }

    if (classLower.includes('法') || classLower.includes('魔') || classLower.includes('术')) {
      cards.push(
        new Card({
          name: '火球术',
          type: CardTypes.ATTACK,
          cost: 2,
          description: '造成 10 点伤害，施加 2 层灼烧',
          rarity: CardRarity.COMMON,
          effects: [
            { type: 'damage', value: 10 },
            { type: 'status', status: 'burn', value: 2 },
          ],
        }),
      );
    }

    if (classLower.includes('游') || classLower.includes('盗') || classLower.includes('刺')) {
      cards.push(
        new Card({
          name: '疾步',
          type: CardTypes.SKILL,
          cost: 1,
          description: '获得 3 点格挡，抽 1 张牌',
          rarity: CardRarity.COMMON,
          effects: [
            { type: 'block', value: 3 },
            { type: 'draw', value: 1 },
          ],
        }),
      );
    }

    // 如果没有匹配到任何职业，添加通用牌
    if (cards.length === 0) {
      cards.push(
        new Card({
          name: '勇气',
          type: CardTypes.SKILL,
          cost: 0,
          description: '抽 2 张牌',
          rarity: CardRarity.COMMON,
          effects: [{ type: 'draw', value: 2 }],
        }),
      );
    }

    return cards;
  },

  /**
   * 抽一张牌
   * @param {Object} battleState - 战斗状态
   * @returns {Card|null} - 抽到的牌或null
   */
  drawCard(battleState) {
    if (battleState.drawPile.length === 0) {
      if (battleState.discardPile.length === 0) {
        return null;
      }
      battleState.drawPile = shuffleArray(battleState.discardPile);
      battleState.discardPile = [];
    }

    const card = battleState.drawPile.pop();
    if (card) {
      battleState.hand.push(card);
    }
    return card;
  },

  /**
   * 抽多张牌
   * @param {Object} battleState - 战斗状态
   * @param {number} count - 抽牌数量
   * @returns {Array<Card>} - 抽到的牌数组
   */
  drawCards(battleState, count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCard(battleState);
      if (card) drawn.push(card);
    }
    return drawn;
  },

  /**
   * 弃掉所有手牌
   * @param {Object} battleState - 战斗状态
   */
  discardHand(battleState) {
    while (battleState.hand.length > 0) {
      const card = battleState.hand.pop();
      if (card.ethereal) {
        battleState.exhaustPile.push(card);
      } else {
        battleState.discardPile.push(card);
      }
    }
  },

  /**
   * 获取卡牌模板库
   * @returns {Object} - 卡牌模板库
   */
  getCardTemplates() {
    return {
      // 基础攻击牌
      strike: {
        name: '打击',
        type: CardTypes.ATTACK,
        cost: 1,
        description: '造成 6 点伤害',
        rarity: CardRarity.BASIC,
        effects: [{ type: 'damage', value: 6 }],
      },
      // 基础防御牌
      defend: {
        name: '防御',
        type: CardTypes.SKILL,
        cost: 1,
        description: '获得 5 点格挡',
        rarity: CardRarity.BASIC,
        effects: [{ type: 'block', value: 5 }],
      },
      // 重斩
      heavySlash: {
        name: '重斩',
        type: CardTypes.ATTACK,
        cost: 2,
        description: '造成 12 点伤害',
        rarity: CardRarity.COMMON,
        effects: [{ type: 'damage', value: 12 }],
      },
      // 双斩
      twinStrike: {
        name: '双斩',
        type: CardTypes.ATTACK,
        cost: 1,
        description: '造成 4 点伤害两次',
        rarity: CardRarity.COMMON,
        effects: [
          { type: 'damage', value: 4 },
          { type: 'damage', value: 4 },
        ],
      },
      // 铁壁
      ironWall: {
        name: '铁壁',
        type: CardTypes.SKILL,
        cost: 2,
        description: '获得 12 点格挡',
        rarity: CardRarity.COMMON,
        effects: [{ type: 'block', value: 12 }],
      },
      // 冥想
      meditation: {
        name: '冥想',
        type: CardTypes.SKILL,
        cost: 1,
        description: '获得 1 点能量',
        rarity: CardRarity.UNCOMMON,
        effects: [{ type: 'energy', value: 1 }],
      },
      // 战吼
      battleCry: {
        name: '战吼',
        type: CardTypes.POWER,
        cost: 2,
        description: '每回合开始时获得 2 点格挡',
        rarity: CardRarity.UNCOMMON,
        effects: [{ type: 'power', power: 'battleCry', value: 2 }],
      },
    };
  },

  /**
   * 根据模板创建卡牌
   * @param {string} templateName - 模板名称
   * @returns {Card|null} - 卡牌实例或null
   */
  createFromTemplate(templateName) {
    const templates = this.getCardTemplates();
    const template = templates[templateName];
    if (!template) return null;
    return new Card(template);
  },

  /**
   * 从数据对象创建卡牌
   * 用于从GameVariables或存档中恢复卡牌
   * @param {Object} cardData - 卡牌数据对象
   * @returns {Card} - 卡牌实例
   */
  createFromData(cardData) {
    if (!cardData) {
      console.warn('CardSystem.createFromData: 收到空的卡牌数据');
      return null;
    }

    // 如果已经是Card实例，直接返回
    if (cardData instanceof Card) {
      return cardData;
    }

    // 从数据对象创建新的Card实例
    return new Card({
      id: cardData.id || `card_${generateId()}`,
      name: cardData.name || '未命名卡牌',
      type: cardData.type || CardTypes.ATTACK,
      cost: cardData.cost !== undefined ? cardData.cost : 1,
      description: cardData.description || '',
      rarity: cardData.rarity || CardRarity.BASIC,
      effects: cardData.effects || [],
      exhaust: cardData.exhaust || false,
      ethereal: cardData.ethereal || false,
      innate: cardData.innate || false,
      upgraded: cardData.upgraded || false,
    });
  },

  /**
   * 从数据数组批量创建卡牌
   * @param {Array} cardsData - 卡牌数据数组
   * @returns {Array<Card>} - 卡牌实例数组
   */
  createDeckFromData(cardsData) {
    if (!Array.isArray(cardsData)) {
      console.warn('CardSystem.createDeckFromData: 期望数组，收到', typeof cardsData);
      return [];
    }

    const deck = [];
    cardsData.forEach(cardData => {
      // 处理quantity字段，用于批量创建同类卡牌
      const quantity = cardData.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        const card = this.createFromData(cardData);
        if (card) {
          deck.push(card);
        }
      }
    });

    return deck;
  },

  /**
   * 将卡牌添加到仓库
   * 当获得卡牌奖励时，自动添加到仓库
   * @param {Object} cardData - 卡牌数据对象
   * @returns {Card} - 创建的卡牌实例
   */
  addCardToWarehouse(cardData) {
    if (!cardData) {
      console.warn('CardSystem.addCardToWarehouse: 收到空的卡牌数据');
      return null;
    }

    // 确保仓库存在
    if (!GameVariables.battle.warehouse) {
      GameVariables.battle.warehouse = [];
    }

    // 创建卡牌实例
    const card = this.createFromData(cardData);
    if (!card) {
      console.warn('CardSystem.addCardToWarehouse: 创建卡牌失败');
      return null;
    }

    // 将卡牌数据添加到仓库
    const saveData = card.toSaveData();
    GameVariables.battle.warehouse.push(saveData);

    // 触发MVU变更事件
    if (typeof VariableChangeEmitter !== 'undefined') {
      VariableChangeEmitter.emit('/battle/warehouse', GameVariables.battle.warehouse, null);
    }

    console.log('卡牌已添加到仓库:', saveData.name);
    return card;
  },

  /**
   * 批量将卡牌添加到仓库
   * @param {Array} cardsData - 卡牌数据数组
   * @returns {Array<Card>} - 创建的卡牌实例数组
   */
  addCardsToWarehouse(cardsData) {
    if (!Array.isArray(cardsData) || cardsData.length === 0) {
      return [];
    }

    const addedCards = [];
    cardsData.forEach(cardData => {
      const card = this.addCardToWarehouse(cardData);
      if (card) {
        addedCards.push(card);
      }
    });

    if (addedCards.length > 0 && typeof showToast === 'function') {
      showToast(`获得 ${addedCards.length} 张新卡牌，已添加到仓库`);
    }

    return addedCards;
  },

  /**
   * 处理卡牌奖励
   * 从GameVariables.reward.card中获取奖励卡牌并添加到仓库
   * @returns {Array<Card>} - 添加的卡牌数组
   */
  processCardRewards() {
    const rewardCards = GameVariables.reward.card || [];
    if (rewardCards.length === 0) {
      return [];
    }

    // 添加到仓库
    const addedCards = this.addCardsToWarehouse(rewardCards);

    // 清空奖励卡牌列表
    GameVariables.reward.card = [];

    // 触发奖励变更事件
    if (typeof VariableChangeEmitter !== 'undefined') {
      VariableChangeEmitter.emit('/reward/card', [], rewardCards);
    }

    return addedCards;
  },
};

// 导出
window.CardTypes = CardTypes;
window.CardRarity = CardRarity;
window.Card = Card;
window.CardSystem = CardSystem;
