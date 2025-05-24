/**
 * 节点管理模块
 * 负责创建、删除和管理各种类型的节点
 */

/**
 * 节点管理器
 */
class NodeManager {
  constructor(app) {
    this.app = app;
    this.graph = app.graph;
    this.paper = app.paper;
  }

  /**
   * 创建节点
   * @param {string} type 节点类型
   * @param {number} x X坐标
   * @param {number} y Y坐标
   * @param {Object} options 额外选项
   * @returns {joint.shapes.Element} 创建的节点
   */
  createNode(type, x, y, options = {}) {
    console.log('[createNode] *** 开始创建节点 ***', type, 'at', x, y);
    let node = null;

    try {
      switch (type) {
        case NODE_TYPES.START:
          node = this.createStartNode(x, y, options);
          break;
        case NODE_TYPES.END:
          node = this.createEndNode(x, y, options);
          break;
        case NODE_TYPES.PROCESS:
          node = this.createProcessNode(x, y, options);
          break;
        case NODE_TYPES.DECISION:
          node = this.createDecisionNode(x, y, options);
          break;
        case NODE_TYPES.SWITCH:
          node = this.createSwitchNode(x, y, options);
          break;
        case NODE_TYPES.CONTAINER:
          node = this.createContainerNode(x, y, options);
          break;
        default:
          throw new Error(`未知的节点类型: ${type}`);
      }

      if (node) {
        console.log(`[createNode] 节点创建后 isContainer 值:`, node.isContainer);

        // 添加端口（除了容器节点外）
        this.addNodePorts(node, type);
        console.log(`[createNode] 添加端口后 isContainer 值:`, node.isContainer);

        // 添加到图形
        node.addTo(this.graph);
        console.log(`[createNode] 添加到图形后 isContainer 值:`, node.isContainer);

        // 检查容器嵌套
        this.checkContainerEmbedding(node);
        console.log(`[createNode] 检查嵌套后 isContainer 值:`, node.isContainer);

        console.log(`创建${type}节点成功:`, node.id);
      }

      return node;

    } catch (error) {
      ErrorHandler.handle(error, `创建${type}节点`);
      return null;
    }
  }

  /**
   * 创建开始节点
   */
  createStartNode(x, y, options = {}) {
    const size = CONFIG.nodes.sizes.start;
    const colors = CONFIG.nodes.colors;

    const node = new joint.shapes.standard.Circle();
    node.position(x - size.width/2, y - size.height/2);
    node.resize(size.width, size.height);
    node.attr({
      body: {
        fill: colors.start,
        stroke: colors.startStroke,
        strokeWidth: 3,
        pointerEvents: 'auto'
      },
      label: {
        text: '开始',
        fill: '#fff',
        fontWeight: 'bold',
        fontSize: 20,
        pointerEvents: 'auto'
      }
    });

    // 标记为非容器节点
    node.isContainer = false;

    // 设置z-index确保可见性
    node.set('z', 10);

    return node;
  }

  /**
   * 创建结束节点
   */
  createEndNode(x, y, options = {}) {
    const size = CONFIG.nodes.sizes.end;
    const colors = CONFIG.nodes.colors;

    const node = new joint.shapes.standard.Circle();
    node.position(x - size.width/2, y - size.height/2);
    node.resize(size.width, size.height);
    node.attr({
      body: {
        fill: colors.end,
        stroke: colors.endStroke,
        strokeWidth: 3,
        pointerEvents: 'auto'
      },
      label: {
        text: '结束',
        fill: '#fff',
        fontWeight: 'bold',
        fontSize: 20,
        pointerEvents: 'auto'
      }
    });

    // 标记为非容器节点
    node.isContainer = false;

    // 设置z-index确保可见性
    node.set('z', 10);

    return node;
  }

  /**
   * 创建Grouping节点
   */
  createProcessNode(x, y, options = {}) {
    const size = CONFIG.nodes.sizes.process;
    const colors = CONFIG.nodes.colors;

    const node = new joint.shapes.standard.Rectangle();
    node.position(x - size.width/2, y - size.height/2);
    node.resize(size.width, size.height);
    node.attr({
      body: {
        fill: colors.process,
        stroke: colors.processStroke,
        strokeWidth: 3,
        rx: 10,
        ry: 10,
        pointerEvents: 'auto'
      },
      label: {
        text: 'Grouping',
        fill: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
        pointerEvents: 'auto'
      }
    });

    // 设置默认属性
    node.prop('properties', {
      name: 'Grouping',
      description: '',
      field: '',
      fieldValue: '',
      wrapperFields: '',
      categoryValue: ''
    });

    // 标记为非容器节点
    node.isContainer = false;
    console.log('[createProcessNode] 设置 isContainer = false，当前值:', node.isContainer);

    // 设置z-index确保可见性
    node.set('z', 5);

    return node;
  }

  /**
   * 创建决策节点
   */
  createDecisionNode(x, y, options = {}) {
    const size = CONFIG.nodes.sizes.decision;
    const colors = CONFIG.nodes.colors;

    const node = new joint.shapes.standard.Polygon();
    node.position(x - size.width/2, y - size.height/2);
    node.resize(size.width, size.height);
    node.attr({
      body: {
        fill: colors.decision,
        stroke: colors.decisionStroke,
        strokeWidth: 3,
        refPoints: '50,0 100,60 50,120 0,60',
        pointerEvents: 'auto'
      },
      label: {
        text: '决策',
        fill: '#333',
        fontWeight: 'bold',
        fontSize: 18,
        pointerEvents: 'auto'
      }
    });

    // 设置默认属性
    node.prop('properties', {
      name: '决策',
      description: '',
      condition: ''
    });

    // 标记为非容器节点
    node.isContainer = false;

    // 设置z-index确保可见性
    node.set('z', 5);

    return node;
  }

  /**
   * 创建Switch节点
   */
  createSwitchNode(x, y, options = {}) {
    const size = CONFIG.nodes.sizes.switch;
    const colors = CONFIG.nodes.colors;

    const node = new joint.shapes.standard.Rectangle();
    node.position(x - size.width/2, y - size.height/2);
    node.resize(size.width, size.height);
    node.attr({
      body: {
        fill: colors.switch,
        stroke: colors.switchStroke,
        strokeWidth: 3,
        rx: 10,
        ry: 10,
        pointerEvents: 'auto'
      },
      label: {
        text: 'Switch',
        fill: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
        pointerEvents: 'auto'
      }
    });

    // 设置初始cases属性
    const defaultCases = [
      { name: 'Default', expression: '', isDefault: true },
      { name: 'Case 1', expression: '' }
    ];

    node.prop('properties', {
      name: 'Switch',
      description: '评估多个条件并根据结果继续执行',
      cases: defaultCases
    });

    // 标记为Switch节点和非容器节点
    node.isSwitch = true;
    node.isContainer = false;

    // 设置z-index确保可见性
    node.set('z', 5);

    return node;
  }

  /**
   * 创建容器节点
   */
  createContainerNode(x, y, options = {}) {
    const size = CONFIG.nodes.sizes.container;
    const colors = CONFIG.nodes.colors;

    const node = new joint.shapes.standard.Rectangle();
    node.position(x - size.width/2, y - size.height/2);
    node.resize(size.width, size.height);
    node.attr({
      body: {
        fill: colors.container,
        stroke: colors.containerStroke,
        strokeWidth: 1,
        rx: 2,
        ry: 2,
        pointerEvents: 'auto'
      },
      label: {
        text: '容器',
        fill: '#666666',
        fontWeight: 'bold',
        fontSize: 14,
        refX: 10,
        refY: 10,
        textAnchor: 'start',
        textVerticalAnchor: 'top',
        pointerEvents: 'auto'
      }
    });

    // 设置默认属性
    node.prop('properties', {
      name: '容器',
      description: '',
      category: ''
    });

    // 标记为容器节点
    node.isContainer = true;
    node.isResizable = true;

    return node;
  }

  /**
   * 为节点添加端口
   */
  addNodePorts(node, type) {
    try {
      // 容器节点单独处理端口
      if (type === NODE_TYPES.CONTAINER) {
        node.set('ports', { groups: PORT_GROUPS });
        node.addPort({ group: 'bottom' });
        return;
      }

      // Switch节点需要特殊处理
      if (type === NODE_TYPES.SWITCH) {
        this.addSwitchPorts(node);
        return;
      }

      // 其他节点添加底部端口
      node.set('ports', { groups: PORT_GROUPS });
      node.addPort({ group: 'bottom' });

    } catch (error) {
      ErrorHandler.handle(error, `添加${type}节点端口`);
    }
  }

  /**
   * 为Switch节点添加端口
   */
  addSwitchPorts(node) {
    const cases = node.prop('properties').cases || [];
    const casesCount = cases.length;

    console.log('创建Switch节点，Cases数量:', casesCount);

    // 设置端口分组配置
    node.set('ports', { groups: PORT_GROUPS });

    // 为每个case添加一个端口
    for (let i = 0; i < casesCount; i++) {
      const portId = `case_${i}`;
      console.log(`添加端口 ${portId} 对应 Case: ${cases[i].name}`);

      node.addPort({
        id: portId,
        group: 'switchPorts',
        attrs: {
          text: {
            text: cases[i].name,
            fill: '#333',
            fontSize: 10,
            textAnchor: 'middle',
            yAlignment: 'bottom',
            refY: 20
          },
          circle: {
            fill: '#fff',
            stroke: '#333',
            r: 5,
            opacity: 0
          }
        }
      });
    }
  }

  /**
   * 更新Switch节点端口
   */
  updateSwitchPorts(node, cases) {
    if (!node || !node.isSwitch) return;

    console.log('更新Switch节点端口，Cases数量:', cases.length);

    try {
      // 移除所有现有端口
      const ports = node.getPorts();
      ports.forEach(port => {
        node.removePort(port.id);
      });

      // 为每个case添加新端口
      const casesCount = cases.length;
      for (let i = 0; i < casesCount; i++) {
        const portId = `case_${i}`;
        console.log(`添加端口 ${portId} 对应 Case: ${cases[i].name}`);

        node.addPort({
          id: portId,
          group: 'switchPorts',
          attrs: {
            text: {
              text: cases[i].name,
              fill: '#333',
              fontSize: 10,
              textAnchor: 'middle',
              yAlignment: 'bottom',
              refY: 20
            },
            circle: {
              fill: '#fff',
              stroke: '#333',
              r: 5,
              opacity: 0
            }
          }
        });
      }

      // 确保端口可见
      setTimeout(() => {
        this.ensurePortsVisible(node);
      }, 100);

    } catch (error) {
      ErrorHandler.handle(error, 'Switch节点端口更新');
    }
  }

  /**
   * 确保端口可见
   */
  ensurePortsVisible(node) {
    try {
      const elementView = this.paper.findViewByModel(node);
      if (elementView) {
        const ports = elementView.el.querySelectorAll('.joint-port');
        if (ports && ports.length > 0) {
          ports.forEach(port => {
            port.style.opacity = 1;
            port.style.visibility = 'visible';
          });
        }

        node.getPorts().forEach(port => {
          node.portProp(port.id, 'attrs/circle/opacity', 1);
        });
      }
    } catch (error) {
      ErrorHandler.handle(error, '端口可见性设置');
    }
  }

  /**
   * 检查容器嵌套
   */
  checkContainerEmbedding(node) {
    const containers = this.graph.getElements().filter(e => e.isContainer);

    for (const container of containers) {
      const bbox = container.getBBox();
      const nodeBBox = node.getBBox();
      const center = nodeBBox.center();

      if (CoordinateUtils.isPointInRect(center, bbox)) {
        // 开始和结束节点不能被嵌套
        if (this.isStartOrEndNode(node)) {
          node.toFront();
          continue;
        }

        if (!node.isContainer) {
          node.toFront();
          container.embed(node);
          this.adjustNodeInContainer(node, container);

          setTimeout(() => {
            node.toFront();
          }, 50);

          break;
        }
      }
    }
  }

  /**
   * 检查是否为开始或结束节点
   */
  isStartOrEndNode(node) {
    const nodeType = node.get('type');
    const nodeLabel = node.attr('label/text');
    return nodeType === 'standard.Circle' &&
           (nodeLabel === '开始' || nodeLabel === '结束');
  }

  /**
   * 调整节点在容器内的位置
   */
  adjustNodeInContainer(node, container) {
    const bbox = container.getBBox();
    const nodeBBox = node.getBBox();

    const minX = bbox.x + 10;
    const maxX = bbox.x + bbox.width - nodeBBox.width - 10;
    const minY = bbox.y + 30;
    const maxY = bbox.y + bbox.height - nodeBBox.height - 10;

    node.position(
      Math.max(minX, Math.min(nodeBBox.x, maxX)),
      Math.max(minY, Math.min(nodeBBox.y, maxY))
    );
  }

  /**
   * 删除节点
   */
  deleteNode(node) {
    return ErrorHandler.safeExecute(() => {
      console.log('删除节点:', node.id, node.get('type'));

      // 清除应用状态
      this.clearNodeFromAppState(node);

      // 根据节点类型使用不同的删除策略
      if (node.isContainer) {
        this.deleteContainerNode(node);
      } else if (this.isStartOrEndNode(node)) {
        this.deleteSpecialNode(node);
      } else {
        node.remove();
      }

      return true;
    }, '节点删除');
  }

  /**
   * 从应用状态中清除节点引用
   */
  clearNodeFromAppState(node) {
    const state = this.app.state;

    if (state.hoveredElement === node) {
      state.hoveredElement = null;
    }

    if (state.currentEditingNode === node) {
      state.currentEditingNode = null;
    }

    if (state.resizingContainer === node) {
      state.resizingContainer = null;
    }
  }

  /**
   * 删除容器节点
   */
  deleteContainerNode(node) {
    console.log(`容器节点 ${node.id} 将被删除`);

    // 获取容器中的所有嵌套节点
    const embeddedCells = node.getEmbeddedCells ? node.getEmbeddedCells() : [];
    console.log(`容器节点包含 ${embeddedCells.length} 个嵌套节点`);

    // 先解除所有嵌套关系
    if (embeddedCells.length > 0) {
      embeddedCells.forEach(cell => {
        try {
          node.unembed(cell);
          console.log(`解除嵌套关系: ${cell.id}`);
        } catch (e) {
          console.warn(`解除嵌套关系失败: ${cell.id}`, e);
        }
      });
    }

    // 删除容器节点
    this.forceRemoveNode(node);
  }

  /**
   * 删除特殊节点（开始/结束节点）
   */
  deleteSpecialNode(node) {
    const nodeType = node.get('type');
    const nodeLabel = node.attr('label/text');
    console.log(`特殊节点 ${node.id} (${nodeLabel}) 将被删除`);

    this.forceRemoveNode(node);
  }

  /**
   * 强制删除节点（多重方法）
   */
  forceRemoveNode(node) {
    const methods = [
      () => node.remove(),
      () => this.graph.removeCells([node]),
      () => {
        if (node.collection) {
          node.collection.remove(node);
        }
      }
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        methods[i]();
        console.log(`节点删除成功 (方法${i + 1})`);
        return;
      } catch (error) {
        console.warn(`节点删除方法${i + 1}失败:`, error);
        if (i === methods.length - 1) {
          throw error;
        }
      }
    }
  }

  /**
   * 获取节点验证信息
   */
  validateNode(node) {
    const nodeData = {
      type: node.get('type'),
      position: node.position(),
      size: node.size(),
      properties: node.prop('properties')
    };

    return ValidationUtils.validateNode(nodeData);
  }

  /**
   * 克隆节点
   */
  cloneNode(node, offsetX = 50, offsetY = 50) {
    try {
      const clonedNode = node.clone();
      const position = node.position();

      clonedNode.position(position.x + offsetX, position.y + offsetY);
      clonedNode.addTo(this.graph);

      console.log('节点克隆成功:', clonedNode.id);
      return clonedNode;

    } catch (error) {
      ErrorHandler.handle(error, '节点克隆');
      return null;
    }
  }

  /**
   * 获取节点信息
   */
  getNodeInfo(node) {
    return {
      id: node.id,
      type: node.get('type'),
      label: node.attr('label/text'),
      position: node.position(),
      size: node.size(),
      properties: node.prop('properties'),
      isContainer: !!node.isContainer,
      isSwitch: !!node.isSwitch,
      ports: node.getPorts(),
      connections: this.graph.getConnectedLinks(node).length
    };
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NodeManager };
} else {
  window.NodeManager = NodeManager;
}
