/**
 * 工具函数模块
 * 提供通用的工具函数和错误处理
 */

/**
 * 防抖函数 - 增强版
 * @param {Function} func 要防抖的函数
 * @param {number} wait 等待时间（毫秒）
 * @param {boolean} [immediate=false] 是否立即执行
 * @param {boolean} [trailing=true] 是否在延迟后执行
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait, immediate = false, trailing = true) {
  let timeout;
  let lastArgs;
  let lastThis;
  let result;
  let lastCallTime;

  // 实际执行函数
  const later = function() {
    const lastInvokeTime = lastCallTime;

    // 重置计时器和最后调用时间
    timeout = null;
    lastCallTime = 0;

    // 如果需要尾部执行，则执行函数
    if (trailing && lastArgs) {
      result = func.apply(lastThis, lastArgs);
      lastArgs = lastThis = null;
    }
  };

  // 返回的防抖函数
  const debounced = function(...args) {
    // 保存上下文和参数
    lastThis = this;
    lastArgs = args;
    lastCallTime = Date.now();

    // 检查是否应该立即执行
    const callNow = immediate && !timeout;

    // 重置计时器
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    // 如果是立即执行模式且没有活动的计时器，则立即执行
    if (callNow) {
      result = func.apply(this, args);
      lastArgs = lastThis = null;
    }

    return result;
  };

  // 添加取消方法
  debounced.cancel = function() {
    clearTimeout(timeout);
    timeout = null;
    lastCallTime = 0;
    lastArgs = lastThis = null;
  };

  return debounced;
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} limit 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 错误处理类
 */
class ErrorHandler {
  /**
   * 处理错误
   * @param {Error} error 错误对象
   * @param {string} context 错误上下文
   */
  static handle(error, context = '') {
    const message = `[${context}] 错误: ${error.message}`;
    console.error(message, error);

    // 可以在这里添加错误上报逻辑
    // 例如发送到监控服务

    // 显示用户友好的错误提示
    if (context.includes('用户操作')) {
      this.showUserError('操作失败，请重试');
    }
  }

  /**
   * 安全执行函数
   * @param {Function} fn 要执行的函数
   * @param {string} context 错误上下文
   * @returns {Promise|any} 执行结果
   */
  static async safeExecute(fn, context = '') {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }

  /**
   * 显示用户错误信息
   * @param {string} message 错误信息
   */
  static showUserError(message) {
    // 这里可以使用更好的UI组件来显示错误
    console.warn('用户错误:', message);
    // alert(message); // 临时使用alert，可以替换为更好的组件
  }
}

/**
 * 事件管理器
 * 用于统一管理事件监听器，防止内存泄漏
 */
class EventManager {
  /**
   * 构造函数
   */
  constructor() {
    /** @type {Array<EventListenerDef>} */
    this.listeners = [];
    /** @type {Object<string, Array<Function>>} */
    this.eventHandlers = {}; // Store handlers by event type
  }

  /**
   * 添加事件监听器
   * @param {Element | string} target DOM元素或事件名称字符串
   * @param {string | Function} eventOrHandler 事件名称或事件处理器
   * @param {Function} [handler] 事件处理器 (如果target是元素)
   * @param {Object} [options] 事件选项 (如果target是元素)
   */
  addEventListener(target, eventOrHandler, handler, options = {}) {
    if (typeof target === 'string') {
      // General event subscription (not tied to a DOM element)
      const eventName = target;
      const eventHandler = /** @type {Function} */ (eventOrHandler);
      if (!this.eventHandlers[eventName]) {
        this.eventHandlers[eventName] = [];
      }
      this.eventHandlers[eventName].push(eventHandler);
      // Store a reference for potential removal if needed
      this.listeners.push({ element: null, event: eventName, handler: eventHandler, options: {} });
    } else if ((target instanceof Element || target === document || target === window) && typeof eventOrHandler === 'string' && typeof handler === 'function') {
      // DOM element event listener
      const element = target;
      const eventName = eventOrHandler;
      element.addEventListener(eventName, /** @type {EventListenerOrEventListenerObject} */ (handler), options);
      this.listeners.push({ element, event: eventName, handler, options });
    } else {
      console.warn('EventManager: Invalid arguments for addEventListener');
    }
  }

  /**
   * 移除特定的事件监听器
   * @param {Element | string} target DOM元素或事件名称字符串
   * @param {string | Function} eventOrHandler 事件名称或事件处理器
   * @param {Function} [handler] 事件处理器 (如果target是元素)
   */
  removeEventListener(target, eventOrHandler, handler) {
    if (typeof target === 'string') {
      const eventName = target;
      const eventHandler = /** @type {Function} */ (eventOrHandler);
      if (this.eventHandlers[eventName]) {
        this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(h => h !== eventHandler);
      }
      this.listeners = this.listeners.filter(
        listener => !(listener.element === null && listener.event === eventName && listener.handler === eventHandler)
      );
    } else if ((target instanceof Element || target === document || target === window) && typeof eventOrHandler === 'string' && typeof handler === 'function') {
      const element = target;
      const eventName = eventOrHandler;
      element.removeEventListener(eventName, /** @type {EventListenerOrEventListenerObject} */ (handler));
      this.listeners = this.listeners.filter(
        listener => !(listener.element === element &&
                     listener.event === eventName &&
                     listener.handler === handler)
      );
    } else {
      console.warn('EventManager: Invalid arguments for removeEventListener');
    }
  }

  /**
   * 触发事件
   * @param {string} eventName 要触发的事件名称
   * @param {any} [data] 传递给事件处理器的数据
   */
  emit(eventName, data) {
    if (this.eventHandlers[eventName]) {
      this.eventHandlers[eventName].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
          ErrorHandler.handle(/** @type {Error} */ (error), `EventManager emit (${eventName})`);
        }
      });
    }
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners() {
    this.listeners.forEach(({ element, event, handler }) => {
      try {
        if (element) { // Check if element is not null
          element.removeEventListener(event, /** @type {EventListenerOrEventListenerObject} */ (handler));
        }
      } catch (error) {
        console.warn('移除事件监听器失败:', error);
      }
    });
    this.listeners = [];
    this.eventHandlers = {}; // Also clear general event handlers
  }

  /**
   * 获取当前监听器数量
   * @returns {number} 监听器数量
   */
  getListenerCount() {
    return this.listeners.length;
  }
}

/**
 * DOM操作工具
 */
class DOMUtils {
  /**
   * 创建DOM元素
   * @param {string} tagName 标签名
   * @param {Object} attributes 属性对象
   * @param {string} textContent 文本内容
   * @returns {Element} 创建的DOM元素
   */
  static createElement(tagName, attributes = {}, textContent = '') {
    const element = document.createElement(tagName);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });

    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  }

  /**
   * 安全移除DOM元素
   * @param {Element} element 要移除的元素
   */
  static safeRemove(element) {
    if (element && element.parentNode) {
      try {
        element.parentNode.removeChild(element);
      } catch (error) {
        console.warn('移除DOM元素失败:', error);
      }
    }
  }

  /**
   * 批量移除DOM元素
   * @param {NodeList|Array} elements 要移除的元素集合
   */
  static batchRemove(elements) {
    if (!elements) return;

    const elementsArray = Array.from(elements);
    elementsArray.forEach(element => this.safeRemove(element));
  }
}

/**
 * 坐标转换工具
 */
class CoordinateUtils {
  /**
   * 将SVG坐标转换为屏幕坐标
   * @param {joint.dia.Paper} paper JointJS Paper实例
   * @param {number} x SVG X坐标
   * @param {number} y SVG Y坐标
   * @returns {Object} 屏幕坐标 {x, y}
   */
  static svgToScreen(paper, x, y) {
    const svgPoint = paper.svg.createSVGPoint();
    svgPoint.x = x;
    svgPoint.y = y;
    const screenPoint = svgPoint.matrixTransform(paper.svg.getScreenCTM());
    return { x: screenPoint.x, y: screenPoint.y };
  }

  /**
   * 将屏幕坐标转换为SVG坐标
   * @param {joint.dia.Paper} paper JointJS Paper实例
   * @param {number} x 屏幕X坐标
   * @param {number} y 屏幕Y坐标
   * @returns {Object} SVG坐标 {x, y}
   */
  static screenToSvg(paper, x, y) {
    const svgPoint = paper.svg.createSVGPoint();
    svgPoint.x = x;
    svgPoint.y = y;
    const svgCoord = svgPoint.matrixTransform(paper.svg.getScreenCTM().inverse());
    return { x: svgCoord.x, y: svgCoord.y };
  }

  /**
   * 计算两点之间的距离
   * @param {Object} point1 点1 {x, y}
   * @param {Object} point2 点2 {x, y}
   * @returns {number} 距离
   */
  static distance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 检查点是否在矩形内
   * @param {Object} point 点 {x, y}
   * @param {Object} rect 矩形 {x, y, width, height}
   * @returns {boolean} 是否在矩形内
   */
  static isPointInRect(point, rect) {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height;
  }
}

/**
 * 数据验证工具
 */
class ValidationUtils {
  /**
   * 验证节点数据
   * @param {Object} nodeData 节点数据
   * @returns {Object} 验证结果 {isValid, errors}
   */
  static validateNode(nodeData) {
    const errors = [];

    if (!nodeData.type) {
      errors.push('节点类型不能为空');
    }

    if (!nodeData.position || typeof nodeData.position.x !== 'number' || typeof nodeData.position.y !== 'number') {
      errors.push('节点位置无效');
    }

    if (!nodeData.size || typeof nodeData.size.width !== 'number' || typeof nodeData.size.height !== 'number') {
      errors.push('节点大小无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证工作流数据
   * @param {joint.dia.Graph} graph JointJS Graph实例
   * @returns {Object} 验证结果 {isValid, errors, warnings}
   */
  static validateWorkflow(graph) {
    const errors = [];
    const warnings = [];
    const elements = graph.getElements();

    // 检查是否有开始节点
    const startNodes = elements.filter(el =>
      el.get('type') === 'standard.Circle' && el.attr('label/text') === '开始'
    );
    if (startNodes.length === 0) {
      errors.push('工作流必须包含至少一个开始节点');
    } else if (startNodes.length > 1) {
      warnings.push('发现多个开始节点，建议只保留一个');
    }

    // 检查是否有结束节点
    const endNodes = elements.filter(el =>
      el.get('type') === 'standard.Circle' && el.attr('label/text') === '结束'
    );
    if (endNodes.length === 0) {
      warnings.push('建议添加结束节点');
    }

    // 检查孤立节点
    elements.forEach(el => {
      const links = graph.getConnectedLinks(el);
      if (links.length === 0) {
        const label = el.attr('label/text') || '未命名节点';
        warnings.push(`节点 "${label}" 没有连接线`);
      }
    });

    // 检查断开的连接线
    const links = graph.getLinks();
    links.forEach(link => {
      const source = link.getSourceCell();
      const target = link.getTargetCell();
      if (!source || !target) {
        errors.push('发现断开的连接线');
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// 导出工具函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debounce,
    throttle,
    ErrorHandler,
    EventManager,
    DOMUtils,
    CoordinateUtils,
    ValidationUtils
  };
} else {
  window.debounce = debounce;
  window.throttle = throttle;
  window.ErrorHandler = ErrorHandler;
  window.EventManager = EventManager;
  window.DOMUtils = DOMUtils;
  window.CoordinateUtils = CoordinateUtils;
  window.ValidationUtils = ValidationUtils;
}
