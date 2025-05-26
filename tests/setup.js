/**
 * Jest测试环境设置文件
 */

// 模拟JointJS库
global.joint = {
  dia: {
    Graph: class MockGraph {
      constructor() {
        this.elements = [];
        this.links = [];
      }

      addCell(cell) {
        if (cell.isLink?.()) {
          this.links.push(cell);
        } else {
          this.elements.push(cell);
        }
        return cell;
      }

      getElements() {
        return this.elements;
      }

      getLinks() {
        return this.links;
      }

      clear() {
        this.elements = [];
        this.links = [];
      }

      toJSON() {
        return {
          cells: [...this.elements, ...this.links]
        };
      }

      fromJSON(data) {
        this.elements = data.cells?.filter(cell => !cell.type?.includes('Link')) || [];
        this.links = data.cells?.filter(cell => cell.type?.includes('Link')) || [];
      }

      getConnectedLinks(element) {
        return this.links.filter(link =>
          link.get('source')?.id === element.id ||
          link.get('target')?.id === element.id
        );
      }
    },

    Paper: class MockPaper {
      constructor(options) {
        this.options = options;
        this.scale = 1;
        this.translate = { tx: 0, ty: 0 };
      }

      setDimensions(width, height) {
        this.options.width = width;
        this.options.height = height;
      }

      scale(scaleX, scaleY) {
        this.scale = scaleX;
      }

      translate(tx, ty) {
        this.translate = { tx, ty };
      }

      clientToLocalPoint(x, y) {
        return { x: x / this.scale, y: y / this.scale };
      }

      localToClientPoint(x, y) {
        return { x: x * this.scale, y: y * this.scale };
      }
    },

    Element: class MockElement {
      constructor(attributes) {
        this.attributes = attributes || {};
        this.id = attributes?.id || 'element_' + Math.random().toString(36).substr(2, 9);
        this.ports = [];
      }

      get(key) {
        return this.attributes[key];
      }

      set(key, value) {
        if (typeof key === 'object') {
          Object.assign(this.attributes, key);
        } else {
          this.attributes[key] = value;
        }
        return this;
      }

      attr(path, value) {
        if (arguments.length === 1) {
          return this.attributes[path];
        }
        this.attributes[path] = value;
        return this;
      }

      position(x, y) {
        if (arguments.length === 0) {
          return this.attributes.position || { x: 0, y: 0 };
        }
        this.attributes.position = { x, y };
        return this;
      }

      size() {
        return this.attributes.size || { width: 100, height: 60 };
      }

      resize(width, height) {
        this.attributes.size = { width, height };
        return this;
      }

      remove() {
        // Mock remove
        return this;
      }

      isLink() {
        return false;
      }

      clone() {
        return new MockElement({
          ...this.attributes,
          id: 'element_' + Math.random().toString(36).substr(2, 9)
        });
      }

      addPort(port) {
        this.ports.push(port);
        return this;
      }

      removePort(portId) {
        this.ports = this.ports.filter(p => p.id !== portId);
        return this;
      }

      getPorts() {
        return this.ports;
      }
    },

    Link: class MockLink {
      constructor(attributes) {
        this.attributes = attributes || {};
        this.id = attributes?.id || 'link_' + Math.random().toString(36).substr(2, 9);
      }

      get(key) {
        return this.attributes[key];
      }

      set(key, value) {
        if (typeof key === 'object') {
          Object.assign(this.attributes, key);
        } else {
          this.attributes[key] = value;
        }
        return this;
      }

      source(source) {
        if (arguments.length === 0) {
          return this.attributes.source;
        }
        this.attributes.source = source;
        return this;
      }

      target(target) {
        if (arguments.length === 0) {
          return this.attributes.target;
        }
        this.attributes.target = target;
        return this;
      }

      remove() {
        return this;
      }

      isLink() {
        return true;
      }
    }
  },

  shapes: {
    standard: {}
  }
};

// 添加shapes到joint对象（在joint对象定义之后）
global.joint.shapes.standard.Circle = class MockCircle extends global.joint.dia.Element {
  constructor(attributes) {
    super(attributes);
    this.attributes.type = 'standard.Circle';
  }
};

global.joint.shapes.standard.Rectangle = class MockRectangle extends global.joint.dia.Element {
  constructor(attributes) {
    super(attributes);
    this.attributes.type = 'standard.Rectangle';
  }
};

global.joint.shapes.standard.Polygon = class MockPolygon extends global.joint.dia.Element {
  constructor(attributes) {
    super(attributes);
    this.attributes.type = 'standard.Polygon';
  }
};

global.joint.shapes.standard.Link = class MockStandardLink extends global.joint.dia.Link {
  constructor(attributes) {
    super(attributes);
    this.attributes.type = 'standard.Link';
  }
};

// 模拟jQuery（简化版）
global.$ = global.jQuery = {
  fn: {},
  extend: (target, ...sources) => Object.assign(target, ...sources)
};

// 模拟underscore/lodash
global._ = {
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  clone: (obj) => JSON.parse(JSON.stringify(obj)),
  isObject: (obj) => typeof obj === 'object' && obj !== null,
  isArray: Array.isArray,
  isFunction: (obj) => typeof obj === 'function'
};

// 模拟Backbone
global.Backbone = {
  Model: class MockModel {
    constructor(attributes) {
      this.attributes = attributes || {};
    }

    get(key) {
      return this.attributes[key];
    }

    set(key, value) {
      if (typeof key === 'object') {
        Object.assign(this.attributes, key);
      } else {
        this.attributes[key] = value;
      }
      return this;
    }
  }
};

// 模拟DOM环境
Object.defineProperty(window, 'performance', {
  value: {
    now: () => Date.now()
  }
});

// 模拟console方法（避免测试输出太多）
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// 加载应用模块
require('../js/utils/helpers.js');
require('../js/core/constants.js');

// 测试前重置模拟对象
beforeEach(() => {
  jest.clearAllMocks();
});
