/**
 * NodeManager单元测试
 */

// 导入依赖模块
require('../../js/core/constants.js');
require('../../js/utils/helpers.js');
require('../../js/core/graph.js');
require('../../js/features/node-manager.js');

describe('NodeManager测试', () => {
  let mockApp;
  let nodeManager;

  beforeEach(() => {
    // 模拟WorkflowApp实例
    mockApp = {
      graph: new joint.dia.Graph(),
      paper: new joint.dia.Paper({
        width: 800,
        height: 600,
        model: new joint.dia.Graph()
      }),
      eventManager: new EventManager(),
      state: {
        hoveredElement: null,
        selectedLink: null,
        currentEditingNode: null,
        isPanningMode: false,
        isPanning: false,
        lastClientX: 0,
        lastClientY: 0,
        zoomLevel: 1,
        nodeDeleteIcon: null,
        nodePropertyIcon: null,
        hideIconTimeout: null,
        resizingContainer: null,
        resizeDirection: null,
        resizeHandles: [],
        initialSize: null,
        initialPosition: null,
        initialMousePosition: null,
        dragType: null,
        draggedElement: null
      },
      components: {
        sidebar: null,
        minimap: null,
        zoomToolbar: null,
        propertyPanel: null
      }
    };

    nodeManager = new NodeManager(mockApp);
  });

  describe('节点创建测试', () => {
    test('应该成功创建开始节点', () => {
      const node = nodeManager.createNode('start', 100, 200);
      
      expect(node).toBeTruthy();
      expect(node.get('type')).toBe('standard.Circle');
      expect(node.attr('label/text')).toBe('开始');
      expect(node.position()).toEqual({ x: 100, y: 200 });
      
      // 验证节点已添加到图中
      expect(mockApp.graph.getElements()).toContain(node);
    });

    test('应该成功创建结束节点', () => {
      const node = nodeManager.createNode('end', 300, 400);
      
      expect(node).toBeTruthy();
      expect(node.get('type')).toBe('standard.Circle');
      expect(node.attr('label/text')).toBe('结束');
      expect(node.position()).toEqual({ x: 300, y: 400 });
    });

    test('应该成功创建流程节点', () => {
      const node = nodeManager.createNode('process', 200, 300);
      
      expect(node).toBeTruthy();
      expect(node.get('type')).toBe('standard.Rectangle');
      expect(node.attr('label/text')).toBe('Grouping');
      expect(node.position()).toEqual({ x: 200, y: 300 });
    });

    test('应该成功创建决策节点', () => {
      const node = nodeManager.createNode('decision', 150, 250);
      
      expect(node).toBeTruthy();
      expect(node.get('type')).toBe('standard.Polygon');
      expect(node.attr('label/text')).toBe('决策');
      expect(node.position()).toEqual({ x: 150, y: 250 });
    });

    test('应该成功创建Switch节点', () => {
      const node = nodeManager.createNode('switch', 400, 500);
      
      expect(node).toBeTruthy();
      expect(node.get('type')).toBe('standard.Rectangle');
      expect(node.attr('label/text')).toBe('Switch');
      expect(node.get('isSwitch')).toBe(true);
    });

    test('应该成功创建容器节点', () => {
      const node = nodeManager.createNode('container', 500, 600);
      
      expect(node).toBeTruthy();
      expect(node.get('type')).toBe('standard.Rectangle');
      expect(node.attr('label/text')).toBe('容器');
      expect(node.get('isContainer')).toBe(true);
      expect(node.get('isResizable')).toBe(true);
    });

    test('应该拒绝创建无效类型的节点', () => {
      const node = nodeManager.createNode('invalid-type', 100, 100);
      
      expect(node).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    test('应该支持自定义选项创建节点', () => {
      const options = {
        label: '自定义标签',
        size: { width: 150, height: 80 }
      };
      
      const node = nodeManager.createNode('process', 100, 100, options);
      
      expect(node).toBeTruthy();
      expect(node.attr('label/text')).toBe('自定义标签');
      expect(node.size()).toEqual({ width: 150, height: 80 });
    });
  });

  describe('节点删除测试', () => {
    test('应该成功删除节点', () => {
      const node = nodeManager.createNode('start', 100, 100);
      expect(mockApp.graph.getElements()).toContain(node);
      
      const result = nodeManager.deleteNode(node);
      
      expect(result).toBe(true);
      expect(mockApp.graph.getElements()).not.toContain(node);
    });

    test('应该处理删除不存在的节点', () => {
      const fakeNode = new joint.shapes.standard.Circle();
      
      const result = nodeManager.deleteNode(fakeNode);
      
      expect(result).toBe(false);
    });

    test('应该处理删除null节点', () => {
      const result = nodeManager.deleteNode(null);
      
      expect(result).toBe(false);
    });

    test('删除容器时应该删除子节点', () => {
      const container = nodeManager.createNode('container', 100, 100);
      const childNode = nodeManager.createNode('process', 120, 120);
      
      // 模拟子节点在容器内
      container.embed(childNode);
      
      expect(mockApp.graph.getElements()).toHaveLength(2);
      
      nodeManager.deleteNode(container);
      
      // 容器和子节点都应该被删除
      expect(mockApp.graph.getElements()).toHaveLength(0);
    });
  });

  describe('节点验证测试', () => {
    test('应该正确验证有效节点', () => {
      const node = nodeManager.createNode('start', 100, 100);
      
      const result = nodeManager.validateNode(node);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('应该识别无效节点', () => {
      const invalidNode = new joint.shapes.standard.Circle();
      // 不设置label，使其无效
      
      const result = nodeManager.validateNode(invalidNode);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('应该验证节点位置', () => {
      const node = nodeManager.createNode('process', -50, -50);
      
      const result = nodeManager.validateNode(node);
      
      expect(result.warnings).toBeDefined();
      expect(result.warnings.some(w => w.includes('位置'))).toBe(true);
    });
  });

  describe('Switch节点特殊功能测试', () => {
    test('应该正确更新Switch节点端口', () => {
      const switchNode = nodeManager.createNode('switch', 100, 100);
      
      const cases = [
        { name: 'case1', expression: 'value > 10' },
        { name: 'case2', expression: 'value <= 10' },
        { name: 'default', expression: '', isDefault: true }
      ];
      
      nodeManager.updateSwitchPorts(switchNode, cases);
      
      // 验证端口数量（输入端口1个 + 输出端口3个）
      const ports = switchNode.getPorts();
      expect(ports.length).toBe(4);
      
      // 验证输出端口
      const outputPorts = ports.filter(p => p.group === 'out');
      expect(outputPorts).toHaveLength(3);
      expect(outputPorts.map(p => p.id)).toEqual(['case1', 'case2', 'default']);
    });

    test('应该处理空的Switch cases', () => {
      const switchNode = nodeManager.createNode('switch', 100, 100);
      
      nodeManager.updateSwitchPorts(switchNode, []);
      
      // 应该至少有输入端口和默认输出端口
      const ports = switchNode.getPorts();
      expect(ports.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('节点克隆测试', () => {
    test('应该成功克隆节点', () => {
      const originalNode = nodeManager.createNode('process', 100, 100);
      originalNode.attr('label/text', '原始节点');
      
      const clonedNode = nodeManager.cloneNode(originalNode, 50, 50);
      
      expect(clonedNode).toBeTruthy();
      expect(clonedNode.id).not.toBe(originalNode.id);
      expect(clonedNode.attr('label/text')).toBe('原始节点');
      expect(clonedNode.position()).toEqual({ x: 150, y: 150 }); // 原位置 + 偏移
      
      // 验证克隆节点已添加到图中
      expect(mockApp.graph.getElements()).toContain(clonedNode);
    });

    test('应该使用默认偏移克隆节点', () => {
      const originalNode = nodeManager.createNode('start', 200, 200);
      
      const clonedNode = nodeManager.cloneNode(originalNode);
      
      expect(clonedNode).toBeTruthy();
      expect(clonedNode.position()).toEqual({ x: 220, y: 220 }); // 默认偏移20px
    });

    test('应该处理克隆null节点', () => {
      const result = nodeManager.cloneNode(null);
      
      expect(result).toBeNull();
    });
  });

  describe('节点信息获取测试', () => {
    test('应该正确获取节点信息', () => {
      const node = nodeManager.createNode('process', 150, 250);
      node.attr('label/text', '测试节点');
      
      const info = nodeManager.getNodeInfo(node);
      
      expect(info).toHaveProperty('id');
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('label', '测试节点');
      expect(info).toHaveProperty('position', { x: 150, y: 250 });
      expect(info).toHaveProperty('size');
      expect(info).toHaveProperty('properties');
      expect(info).toHaveProperty('isContainer', false);
      expect(info).toHaveProperty('isSwitch', false);
      expect(info).toHaveProperty('ports');
      expect(info).toHaveProperty('connections', 0);
    });

    test('应该正确识别容器节点信息', () => {
      const container = nodeManager.createNode('container', 100, 100);
      
      const info = nodeManager.getNodeInfo(container);
      
      expect(info.isContainer).toBe(true);
      expect(info.type).toBe('standard.Rectangle');
    });

    test('应该正确识别Switch节点信息', () => {
      const switchNode = nodeManager.createNode('switch', 100, 100);
      
      const info = nodeManager.getNodeInfo(switchNode);
      
      expect(info.isSwitch).toBe(true);
      expect(info.type).toBe('standard.Rectangle');
    });

    test('应该计算节点连接数', () => {
      const node1 = nodeManager.createNode('start', 100, 100);
      const node2 = nodeManager.createNode('end', 300, 100);
      
      // 创建连接
      const link = new joint.shapes.standard.Link();
      link.source(node1);
      link.target(node2);
      mockApp.graph.addCell(link);
      
      const info1 = nodeManager.getNodeInfo(node1);
      const info2 = nodeManager.getNodeInfo(node2);
      
      expect(info1.connections).toBe(1);
      expect(info2.connections).toBe(1);
    });
  });

  describe('节点样式和属性测试', () => {
    test('开始节点应该有正确的样式', () => {
      const node = nodeManager.createNode('start', 100, 100);
      
      expect(node.attr('body/fill')).toBe(CONFIG.nodes.colors.start);
      expect(node.attr('body/stroke')).toBeDefined();
      expect(node.attr('label/fontSize')).toBeDefined();
    });

    test('结束节点应该有正确的样式', () => {
      const node = nodeManager.createNode('end', 100, 100);
      
      expect(node.attr('body/fill')).toBe(CONFIG.nodes.colors.end);
      expect(node.attr('body/stroke')).toBeDefined();
    });

    test('容器节点应该有特殊样式', () => {
      const container = nodeManager.createNode('container', 100, 100);
      
      expect(container.attr('body/strokeDasharray')).toBeDefined();
      expect(container.size().width).toBeGreaterThan(CONFIG.nodes.defaultSize.width);
      expect(container.size().height).toBeGreaterThan(CONFIG.nodes.defaultSize.height);
    });
  });

  describe('错误处理测试', () => {
    test('应该处理创建节点时的异常', () => {
      // 模拟错误情况
      const originalAddCell = mockApp.graph.addCell;
      mockApp.graph.addCell = jest.fn().mockImplementation(() => {
        throw new Error('模拟错误');
      });
      
      const node = nodeManager.createNode('start', 100, 100);
      
      expect(node).toBeNull();
      expect(console.error).toHaveBeenCalled();
      
      // 恢复原函数
      mockApp.graph.addCell = originalAddCell;
    });

    test('应该处理删除节点时的异常', () => {
      const node = nodeManager.createNode('start', 100, 100);
      
      // 模拟remove方法抛出异常
      node.remove = jest.fn().mockImplementation(() => {
        throw new Error('删除失败');
      });
      
      const result = nodeManager.deleteNode(node);
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    test('应该能够快速创建大量节点', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        nodeManager.createNode('process', i * 10, i * 10);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(mockApp.graph.getElements()).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });

    test('应该能够快速删除大量节点', () => {
      // 先创建100个节点
      const nodes = [];
      for (let i = 0; i < 100; i++) {
        nodes.push(nodeManager.createNode('process', i * 10, i * 10));
      }
      
      const startTime = performance.now();
      
      // 删除所有节点
      nodes.forEach(node => {
        nodeManager.deleteNode(node);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(mockApp.graph.getElements()).toHaveLength(0);
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});
