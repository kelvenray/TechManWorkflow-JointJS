/**
 * Sidebar组件单元测试
 */

// 导入依赖模块
require('../../js/core/constants.js');
require('../../js/utils/helpers.js');
require('../../js/core/graph.js');
require('../../js/features/node-manager.js');
require('../../js/components/sidebar.js');

describe('Sidebar组件测试', () => {
  let mockApp;
  let sidebar;

  beforeEach(() => {
    // 清理DOM
    document.body.innerHTML = '';
    
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

    sidebar = new Sidebar(mockApp);
  });

  afterEach(() => {
    if (sidebar) {
      sidebar.destroy();
    }
  });

  describe('侧边栏初始化测试', () => {
    test('应该成功初始化侧边栏', () => {
      expect(() => {
        sidebar.init();
      }).not.toThrow();
      
      expect(sidebar.element).toBeTruthy();
      expect(sidebar.element.id).toBe('sidebar');
    });

    test('应该创建正确的DOM结构', () => {
      sidebar.init();
      
      const sidebarElement = document.getElementById('sidebar');
      expect(sidebarElement).toBeTruthy();
      
      // 检查标题
      const title = sidebarElement.querySelector('h3');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('工作流节点');
      
      // 检查节点项
      const nodeItems = sidebarElement.querySelectorAll('.node-item');
      expect(nodeItems.length).toBe(6); // 应该有6种节点类型
    });

    test('应该正确设置侧边栏样式', () => {
      sidebar.init();
      
      const sidebarElement = document.getElementById('sidebar');
      const styles = window.getComputedStyle(sidebarElement);
      
      expect(sidebarElement.style.width).toBe(CONFIG.canvas.sidebarWidth + 'px');
      expect(sidebarElement.style.position).toBe('fixed');
      expect(sidebarElement.style.left).toBe('0');
      expect(sidebarElement.style.top).toBe('0');
    });

    test('应该创建所有节点类型的项', () => {
      sidebar.init();
      
      const expectedTypes = ['start', 'end', 'process', 'decision', 'switch', 'container'];
      
      expectedTypes.forEach(type => {
        const nodeItem = document.querySelector(`[data-node-type="${type}"]`);
        expect(nodeItem).toBeTruthy();
        expect(nodeItem.classList.contains('node-item')).toBe(true);
      });
    });
  });

  describe('节点项创建测试', () => {
    test('应该正确创建开始节点项', () => {
      sidebar.init();
      
      const startItem = document.querySelector('[data-node-type="start"]');
      expect(startItem).toBeTruthy();
      
      const label = startItem.querySelector('span');
      expect(label.textContent).toBe('开始');
      
      const icon = startItem.querySelector('div');
      expect(icon.style.backgroundColor).toBe(CONFIG.nodes.colors.start);
    });

    test('应该正确创建结束节点项', () => {
      sidebar.init();
      
      const endItem = document.querySelector('[data-node-type="end"]');
      expect(endItem).toBeTruthy();
      
      const label = endItem.querySelector('span');
      expect(label.textContent).toBe('结束');
    });

    test('应该为圆形节点设置正确的图标样式', () => {
      sidebar.init();
      
      const startItem = document.querySelector('[data-node-type="start"]');
      const icon = startItem.querySelector('div');
      
      expect(icon.style.borderRadius).toBe('50%');
    });

    test('应该为方形节点设置正确的图标样式', () => {
      sidebar.init();
      
      const processItem = document.querySelector('[data-node-type="process"]');
      const icon = processItem.querySelector('div');
      
      expect(icon.style.borderRadius).toBe('4px');
    });
  });

  describe('拖拽功能测试', () => {
    let mockPaperContainer;

    beforeEach(() => {
      // 创建模拟的paper容器
      mockPaperContainer = document.createElement('div');
      mockPaperContainer.id = 'paper-container';
      mockPaperContainer.style.position = 'absolute';
      mockPaperContainer.style.left = '140px';
      mockPaperContainer.style.top = '0';
      mockPaperContainer.style.width = '660px';
      mockPaperContainer.style.height = '600px';
      document.body.appendChild(mockPaperContainer);

      sidebar.init();
    });

    test('应该开始拖拽节点', () => {
      const startItem = document.querySelector('[data-node-type="start"]');
      
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      
      startItem.dispatchEvent(mouseDownEvent);
      
      expect(sidebar.isDragging).toBe(true);
      expect(mockApp.state.dragType).toBe('start');
      expect(mockApp.state.draggedElement).toBe(startItem);
    });

    test('应该创建拖拽预览', () => {
      const processItem = document.querySelector('[data-node-type="process"]');
      
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      
      processItem.dispatchEvent(mouseDownEvent);
      
      const preview = document.getElementById('drag-preview');
      expect(preview).toBeTruthy();
      expect(preview.style.position).toBe('fixed');
      expect(preview.style.pointerEvents).toBe('none');
    });

    test('应该在画布区域释放时创建节点', () => {
      const decisionItem = document.querySelector('[data-node-type="decision"]');
      
      // 开始拖拽
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      decisionItem.dispatchEvent(mouseDownEvent);
      
      // 在画布区域释放
      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 300, // 在画布区域内
        clientY: 200,
        bubbles: true
      });
      document.dispatchEvent(mouseUpEvent);
      
      // 验证节点已创建
      expect(mockApp.graph.getElements().length).toBeGreaterThan(0);
      
      const createdNode = mockApp.graph.getElements()[0];
      expect(createdNode.get('type')).toBe('standard.Polygon');
    });

    test('应该在画布外释放时不创建节点', () => {
      const containerItem = document.querySelector('[data-node-type="container"]');
      
      // 开始拖拽
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      containerItem.dispatchEvent(mouseDownEvent);
      
      // 在画布外释放
      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 50, // 在侧边栏区域
        clientY: 200,
        bubbles: true
      });
      document.dispatchEvent(mouseUpEvent);
      
      // 验证没有创建节点
      expect(mockApp.graph.getElements().length).toBe(0);
    });

    test('应该在拖拽结束后清理状态', () => {
      const switchItem = document.querySelector('[data-node-type="switch"]');
      
      // 开始拖拽
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      switchItem.dispatchEvent(mouseDownEvent);
      
      expect(sidebar.isDragging).toBe(true);
      
      // 结束拖拽
      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 300,
        clientY: 200,
        bubbles: true
      });
      document.dispatchEvent(mouseUpEvent);
      
      // 验证状态已清理
      expect(sidebar.isDragging).toBe(false);
      expect(mockApp.state.dragType).toBeNull();
      expect(mockApp.state.draggedElement).toBeNull();
      
      // 验证拖拽预览已移除
      const preview = document.getElementById('drag-preview');
      expect(preview).toBeNull();
    });
  });

  describe('悬停效果测试', () => {
    test('应该在鼠标进入时显示悬停效果', () => {
      sidebar.init();
      
      const startItem = document.querySelector('[data-node-type="start"]');
      
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true
      });
      startItem.dispatchEvent(mouseEnterEvent);
      
      expect(startItem.style.backgroundColor).toBe('#e3f2fd');
      expect(startItem.style.borderColor).toBe('#2196f3');
      expect(startItem.style.transform).toBe('translateX(2px)');
    });

    test('应该在鼠标离开时恢复原状', () => {
      sidebar.init();
      
      const endItem = document.querySelector('[data-node-type="end"]');
      
      // 先进入
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true
      });
      endItem.dispatchEvent(mouseEnterEvent);
      
      // 然后离开
      const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true
      });
      endItem.dispatchEvent(mouseLeaveEvent);
      
      expect(endItem.style.backgroundColor).toBe('#fff');
      expect(endItem.style.borderColor).toBe('#ddd');
      expect(endItem.style.transform).toBe('translateX(0)');
    });

    test('拖拽时不应该显示悬停效果', () => {
      sidebar.init();
      
      const processItem = document.querySelector('[data-node-type="process"]');
      
      // 开始拖拽
      sidebar.isDragging = true;
      
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true
      });
      processItem.dispatchEvent(mouseEnterEvent);
      
      // 悬停效果不应该生效
      expect(processItem.style.backgroundColor).not.toBe('#e3f2fd');
    });
  });

  describe('显示隐藏功能测试', () => {
    test('应该能够显示侧边栏', () => {
      sidebar.init();
      sidebar.hide();
      
      sidebar.show();
      
      expect(sidebar.element.style.display).toBe('block');
    });

    test('应该能够隐藏侧边栏', () => {
      sidebar.init();
      
      sidebar.hide();
      
      expect(sidebar.element.style.display).toBe('none');
    });

    test('应该能够切换侧边栏显示状态', () => {
      sidebar.init();
      
      // 初始状态应该是显示的
      sidebar.toggle();
      expect(sidebar.element.style.display).toBe('none');
      
      // 再次切换应该显示
      sidebar.toggle();
      expect(sidebar.element.style.display).toBe('block');
    });
  });

  describe('错误处理测试', () => {
    test('应该处理初始化错误', () => {
      // 模拟DOM创建错误
      const originalCreateElement = DOMUtils.createElement;
      DOMUtils.createElement = jest.fn().mockImplementation(() => {
        throw new Error('DOM创建失败');
      });
      
      expect(() => {
        sidebar.init();
      }).not.toThrow();
      
      expect(console.error).toHaveBeenCalled();
      
      // 恢复原函数
      DOMUtils.createElement = originalCreateElement;
    });

    test('应该处理拖拽结束时的错误', () => {
      sidebar.init();
      
      // 模拟坐标转换错误
      const originalScreenToSvg = CoordinateUtils.screenToSvg;
      CoordinateUtils.screenToSvg = jest.fn().mockImplementation(() => {
        throw new Error('坐标转换失败');
      });
      
      const startItem = document.querySelector('[data-node-type="start"]');
      
      // 开始拖拽
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      startItem.dispatchEvent(mouseDownEvent);
      
      // 结束拖拽
      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: 300,
        clientY: 200,
        bubbles: true
      });
      
      expect(() => {
        document.dispatchEvent(mouseUpEvent);
      }).not.toThrow();
      
      expect(console.error).toHaveBeenCalled();
      
      // 恢复原函数
      CoordinateUtils.screenToSvg = originalScreenToSvg;
    });
  });

  describe('销毁功能测试', () => {
    test('应该正确销毁侧边栏', () => {
      sidebar.init();
      
      const sidebarElement = document.getElementById('sidebar');
      expect(sidebarElement).toBeTruthy();
      
      sidebar.destroy();
      
      // 验证DOM元素已移除
      const removedElement = document.getElementById('sidebar');
      expect(removedElement).toBeNull();
      
      // 验证内部状态已清理
      expect(sidebar.element).toBeNull();
    });

    test('应该在销毁时清理事件监听器', () => {
      sidebar.init();
      
      const removeAllListenersSpy = jest.spyOn(sidebar.eventManager, 'removeAllListeners');
      
      sidebar.destroy();
      
      expect(removeAllListenersSpy).toHaveBeenCalled();
    });

    test('应该处理重复销毁', () => {
      sidebar.init();
      
      sidebar.destroy();
      
      // 再次销毁不应该抛出错误
      expect(() => {
        sidebar.destroy();
      }).not.toThrow();
    });
  });

  describe('颜色工具测试', () => {
    test('应该正确生成更深的颜色', () => {
      sidebar.init();
      
      const darkerGreen = sidebar.getDarkerColor('#4caf50');
      expect(darkerGreen).toBe('#388e3c');
      
      const darkerRed = sidebar.getDarkerColor('#f44336');
      expect(darkerRed).toBe('#b71c1c');
      
      const darkerBlue = sidebar.getDarkerColor('#2196f3');
      expect(darkerBlue).toBe('#1565c0');
    });

    test('应该处理未知颜色', () => {
      sidebar.init();
      
      const unknownColor = '#123456';
      const result = sidebar.getDarkerColor(unknownColor);
      
      expect(result).toBe(unknownColor); // 应该返回原色
    });
  });

  describe('拖拽预览更新测试', () => {
    test('应该正确更新拖拽预览位置', () => {
      sidebar.init();
      
      const startItem = document.querySelector('[data-node-type="start"]');
      
      // 开始拖拽
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true
      });
      startItem.dispatchEvent(mouseDownEvent);
      
      // 移动鼠标
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 300,
        bubbles: true
      });
      document.dispatchEvent(mouseMoveEvent);
      
      const preview = document.getElementById('drag-preview');
      expect(preview).toBeTruthy();
      expect(preview.style.left).toBe('140px'); // 200 - 60
      expect(preview.style.top).toBe('280px');  // 300 - 20
    });
  });
});
