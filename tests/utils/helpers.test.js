/**
 * 工具函数单元测试
 */

// 导入全局配置和常量（需要先加载这些）
require('../../js/core/constants.js');
require('../../js/utils/helpers.js');

describe('工具函数测试', () => {
  
  describe('ErrorHandler', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('应该正确处理错误', () => {
      const testError = new Error('测试错误');
      
      expect(() => {
        ErrorHandler.handle(testError, '测试上下文');
      }).not.toThrow();
      
      expect(console.error).toHaveBeenCalledWith('错误 [测试上下文]:', testError);
    });

    test('应该安全执行函数并返回结果', async () => {
      const successFn = () => '成功结果';
      const result = await ErrorHandler.safeExecute(successFn, '测试执行');
      
      expect(result).toBe('成功结果');
    });

    test('应该安全处理异步函数错误', async () => {
      const errorFn = async () => {
        throw new Error('异步错误');
      };
      
      const result = await ErrorHandler.safeExecute(errorFn, '异步测试');
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('EventManager', () => {
    let eventManager;
    let mockElement;

    beforeEach(() => {
      eventManager = new EventManager();
      mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
    });

    test('应该正确添加事件监听器', () => {
      const handler = jest.fn();
      
      eventManager.addEventListener(mockElement, 'click', handler);
      
      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', handler, undefined);
      expect(eventManager.getListenerCount()).toBe(1);
    });

    test('应该正确移除事件监听器', () => {
      const handler = jest.fn();
      
      eventManager.addEventListener(mockElement, 'click', handler);
      eventManager.removeEventListener(mockElement, 'click', handler);
      
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('click', handler);
    });

    test('应该正确移除所有事件监听器', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventManager.addEventListener(mockElement, 'click', handler1);
      eventManager.addEventListener(mockElement, 'mouseover', handler2);
      
      expect(eventManager.getListenerCount()).toBe(2);
      
      eventManager.removeAllListeners();
      
      expect(mockElement.removeEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('DOMUtils', () => {
    test('应该正确创建DOM元素', () => {
      const element = DOMUtils.createElement('div', {
        id: 'test-div',
        className: 'test-class'
      }, '测试内容');
      
      expect(element.tagName).toBe('DIV');
      expect(element.id).toBe('test-div');
      expect(element.className).toBe('test-class');
      expect(element.textContent).toBe('测试内容');
    });

    test('应该正确创建带样式的元素', () => {
      const element = DOMUtils.createElement('span', {
        style: {
          color: 'red',
          fontSize: '14px'
        }
      });
      
      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('14px');
    });

    test('应该安全移除DOM元素', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      
      expect(parent.children.length).toBe(1);
      
      DOMUtils.safeRemove(child);
      
      expect(parent.children.length).toBe(0);
    });

    test('应该批量移除DOM元素', () => {
      const parent = document.createElement('div');
      const child1 = document.createElement('span');
      const child2 = document.createElement('div');
      parent.appendChild(child1);
      parent.appendChild(child2);
      
      const elements = [child1, child2];
      DOMUtils.batchRemove(elements);
      
      expect(parent.children.length).toBe(0);
    });
  });

  describe('CoordinateUtils', () => {
    let mockPaper;

    beforeEach(() => {
      mockPaper = new joint.dia.Paper({
        width: 800,
        height: 600
      });
    });

    test('应该正确转换SVG到屏幕坐标', () => {
      const result = CoordinateUtils.svgToScreen(mockPaper, 100, 200);
      
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });

    test('应该正确转换屏幕到SVG坐标', () => {
      const result = CoordinateUtils.screenToSvg(mockPaper, 150, 300);
      
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });

    test('应该正确计算两点距离', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };
      
      const distance = CoordinateUtils.distance(point1, point2);
      
      expect(distance).toBe(5); // 3-4-5直角三角形
    });

    test('应该正确判断点是否在矩形内', () => {
      const point = { x: 50, y: 75 };
      const rect = { x: 0, y: 0, width: 100, height: 100 };
      
      const isInside = CoordinateUtils.isPointInRect(point, rect);
      
      expect(isInside).toBe(true);
    });

    test('应该正确判断点不在矩形内', () => {
      const point = { x: 150, y: 75 };
      const rect = { x: 0, y: 0, width: 100, height: 100 };
      
      const isInside = CoordinateUtils.isPointInRect(point, rect);
      
      expect(isInside).toBe(false);
    });
  });

  describe('ValidationUtils', () => {
    test('应该正确验证节点数据', () => {
      const validNode = {
        type: 'start',
        x: 100,
        y: 200,
        label: '开始节点'
      };
      
      const result = ValidationUtils.validateNode(validNode);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('应该识别无效节点数据', () => {
      const invalidNode = {
        // 缺少type
        x: 100,
        y: 200
      };
      
      const result = ValidationUtils.validateNode(invalidNode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该验证工作流图', () => {
      const mockGraph = new joint.dia.Graph();
      
      // 添加开始节点
      const startNode = new joint.shapes.standard.Circle();
      startNode.attr('label/text', '开始');
      mockGraph.addCell(startNode);
      
      // 添加结束节点
      const endNode = new joint.shapes.standard.Circle();
      endNode.attr('label/text', '结束');
      mockGraph.addCell(endNode);
      
      const result = ValidationUtils.validateWorkflow(mockGraph);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('防抖和节流函数', () => {
    jest.useFakeTimers();

    test('防抖函数应该正确工作', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 300);
      
      // 快速调用多次
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // 函数不应该被立即调用
      expect(mockFn).not.toHaveBeenCalled();
      
      // 等待防抖时间
      jest.advanceTimersByTime(300);
      
      // 现在函数应该被调用一次
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('节流函数应该正确工作', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 300);
      
      // 快速调用多次
      throttledFn();
      throttledFn();
      throttledFn();
      
      // 函数应该被立即调用一次
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // 等待节流时间
      jest.advanceTimersByTime(300);
      
      // 再次调用
      throttledFn();
      
      // 现在应该被调用第二次
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });

  describe('数据验证工具', () => {
    test('应该正确验证必填字段', () => {
      const data = {
        name: 'test',
        value: 123
      };
      
      const isValid = validateRequired(data, ['name', 'value']);
      expect(isValid).toBe(true);
    });

    test('应该识别缺失的必填字段', () => {
      const data = {
        name: 'test'
        // 缺少value字段
      };
      
      const isValid = validateRequired(data, ['name', 'value']);
      expect(isValid).toBe(false);
    });

    test('应该正确验证范围值', () => {
      expect(isInRange(50, 0, 100)).toBe(true);
      expect(isInRange(-10, 0, 100)).toBe(false);
      expect(isInRange(150, 0, 100)).toBe(false);
    });
  });

  // 辅助函数（简化的实现）
  function validateRequired(data, requiredFields) {
    return requiredFields.every(field => 
      data.hasOwnProperty(field) && data[field] !== null && data[field] !== undefined
    );
  }

  function isInRange(value, min, max) {
    return value >= min && value <= max;
  }
});
