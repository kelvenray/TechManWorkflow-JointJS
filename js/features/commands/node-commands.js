/**
 * 节点相关命令类
 * 实现节点的创建、删除、移动等操作的撤销/重做功能
 */

// 确保BaseCommand类可用
if (typeof BaseCommand === 'undefined') {
  console.error('BaseCommand 类未定义，请确保 command-history.js 已正确加载');
}

// 确保PORT_GROUPS常量可用
if (typeof PORT_GROUPS === 'undefined') {
  console.error('PORT_GROUPS 常量未定义，请确保 constants.js 已正确加载');
}

/**
 * 创建节点命令
 */
class CreateNodeCommand extends BaseCommand {
  constructor(app, nodeType, x, y, options = {}) {
    super(app, `创建${nodeType}节点`);
    this.nodeType = nodeType;
    this.x = x;
    this.y = y;
    this.options = options;
    this.nodeId = null;
    this.nodeData = null;
  }

  execute() {
    try {
      const nodeManager = new NodeManager(this.app);
      const node = nodeManager.createNodeDirect(this.nodeType, this.x, this.y, this.options);

      if (node) {
        this.nodeId = node.id;
        this.nodeData = this.serializeNode(node);
        console.log(`[CreateNodeCommand] 节点已创建: ${this.nodeId}`);
        return node;
      } else {
        throw new Error('节点创建失败');
      }
    } catch (error) {
      console.error('[CreateNodeCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      if (this.nodeId) {
        const node = this.app.graph.getCell(this.nodeId);
        if (node) {
          // 关闭相关的属性面板
          if (this.app.components.propertyPanel &&
              this.app.components.propertyPanel.currentElement === node) {
            this.app.components.propertyPanel.hide();
          }

          // 清除应用状态
          if (this.app.state.selectedElement === node) {
            this.app.clearSelection();
          }

          // 删除节点
          node.remove();
          console.log(`[CreateNodeCommand] 节点已删除: ${this.nodeId}`);
        }
      }
    } catch (error) {
      console.error('[CreateNodeCommand] 撤销失败:', error);
      throw error;
    }
  }

  serializeNode(node) {
    return {
      id: node.id,
      type: node.get('type'),
      position: node.position(),
      size: node.size(),
      attributes: node.attributes,
      properties: node.prop('properties'),
      isContainer: !!node.isContainer,
      isSwitch: !!node.isSwitch
    };
  }
}

/**
 * 删除节点命令
 */
class DeleteNodeCommand extends BaseCommand {
  constructor(app, node) {
    super(app, `删除节点`);
    this.nodeData = this.serializeNode(node);
    this.connections = this.serializeConnections(node);
    this.embeddedNodes = this.serializeEmbeddedNodes(node);
  }

  execute() {
    try {
      const node = this.app.graph.getCell(this.nodeData.id);
      if (node) {
        // 关闭相关的属性面板
        if (this.app.components.propertyPanel &&
            this.app.components.propertyPanel.currentElement === node) {
          this.app.components.propertyPanel.hide();
        }

        // 清除应用状态
        if (this.app.state.selectedElement === node) {
          this.app.clearSelection();
        }

        // 删除节点
        const nodeManager = new NodeManager(this.app);
        nodeManager.deleteNodeDirect(node);
        console.log(`[DeleteNodeCommand] 节点已删除: ${this.nodeData.id}`);
      }
    } catch (error) {
      console.error('[DeleteNodeCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      // 重新创建节点
      const nodeManager = new NodeManager(this.app);
      const node = this.recreateNode(this.nodeData);

      if (node) {
        // 恢复连接
        this.restoreConnections();

        // 恢复嵌入的节点
        this.restoreEmbeddedNodes();

        console.log(`[DeleteNodeCommand] 节点已恢复: ${this.nodeData.id}`);
        return node;
      }
    } catch (error) {
      console.error('[DeleteNodeCommand] 撤销失败:', error);
      throw error;
    }
  }

  serializeNode(node) {
    return {
      id: node.id,
      type: node.get('type'),
      position: node.position(),
      size: node.size(),
      attributes: JSON.parse(JSON.stringify(node.attributes)),
      properties: node.prop('properties'),
      isContainer: !!node.isContainer,
      isSwitch: !!node.isSwitch,
      ports: node.getPorts()
    };
  }

  serializeConnections(node) {
    const connections = [];
    const links = this.app.graph.getConnectedLinks(node);

    links.forEach(link => {
      connections.push({
        id: link.id,
        source: link.get('source'),
        target: link.get('target'),
        attributes: JSON.parse(JSON.stringify(link.attributes))
      });
    });

    return connections;
  }

  serializeEmbeddedNodes(node) {
    if (!node.isContainer) return [];

    const embedded = [];
    const embeddedCells = node.getEmbeddedCells();

    embeddedCells.forEach(cell => {
      if (cell.isElement()) {
        embedded.push(cell.id);
      }
    });

    return embedded;
  }

  recreateNode(nodeData) {
    try {
      const nodeManager = new NodeManager(this.app);
      let nodeType;

      // 根据节点类型和属性确定正确的节点类型
      switch (nodeData.type) {
        case 'standard.Circle':
          if (nodeData.attributes.label && nodeData.attributes.label.text === '开始') {
            nodeType = 'start';
          } else {
            nodeType = 'end';
          }
          break;
        case 'standard.Rectangle':
          const label = nodeData.attributes.label ? nodeData.attributes.label.text : '';
          if (label === 'Group Setting') {
            nodeType = 'groupSetting';
          } else if (nodeData.isContainer) {
            nodeType = 'container';
          } else {
            nodeType = 'process';
          }
          break;
        case 'standard.Polygon':
          if (nodeData.isSwitch) {
            nodeType = 'switch';
          } else {
            nodeType = 'decision';
          }
          break;
        default:
          console.warn(`[DeleteNodeCommand] 未知的节点类型: ${nodeData.type}`);
          return null;
      }

      // 创建节点但不立即添加到图形，避免在undo过程中的图形状态问题
      let node;

      // 根据节点类型直接创建节点实例，不通过createNodeDirect以避免图形添加问题
      switch (nodeType) {
        case 'start':
          node = nodeManager.createStartNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'end':
          node = nodeManager.createEndNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'process':
          node = nodeManager.createProcessNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'decision':
          node = nodeManager.createDecisionNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'switch':
          node = nodeManager.createSwitchNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'groupSetting':
          node = nodeManager.createGroupSettingNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'container':
          node = nodeManager.createContainerNode(nodeData.position.x, nodeData.position.y);
          break;
        default:
          console.error(`[DeleteNodeCommand] 未知的节点类型: ${nodeType}`);
          return null;
      }

      if (node) {
        console.log(`[DeleteNodeCommand] 成功创建节点: ${nodeType}, 新ID: ${node.id}`);

        // 恢复原始节点ID
        node.set('id', nodeData.id);

        // 恢复属性
        if (nodeData.properties) {
          node.prop('properties', nodeData.properties);
        }

        // 恢复大小
        if (nodeData.size) {
          node.resize(nodeData.size.width, nodeData.size.height);
        }

        // 恢复特殊属性
        if (nodeData.isContainer) {
          node.isContainer = true;
          node.isResizable = true;
        }
        if (nodeData.isSwitch) {
          node.isSwitch = true;
          // 对于Switch节点，需要更新端口以匹配保存的cases
          if (nodeData.properties && nodeData.properties.cases) {
            nodeManager.updateSwitchPorts(node, nodeData.properties.cases);
          }
        }

        // 设置端口分组配置（必须在添加端口之前设置）
        node.set('ports', { groups: PORT_GROUPS });

        // 恢复端口信息（如果有的话）
        if (nodeData.ports && nodeData.ports.length > 0) {
          // 清除默认端口
          const currentPorts = node.getPorts();
          currentPorts.forEach(port => {
            node.removePort(port.id);
          });

          // 恢复原始端口，但确保它们是隐藏的
          nodeData.ports.forEach(portData => {
            // 创建端口数据副本并确保隐藏
            const hiddenPortData = JSON.parse(JSON.stringify(portData));
            if (hiddenPortData.attrs && hiddenPortData.attrs.circle) {
              hiddenPortData.attrs.circle.opacity = 0;
            }
            node.addPort(hiddenPortData);
          });
        } else {
          // 如果没有保存的端口信息，添加默认端口
          try {
            nodeManager.addNodePorts(node, nodeType);
            console.log(`[DeleteNodeCommand] 已为节点添加默认端口: ${nodeData.id}`);
          } catch (error) {
            console.warn(`[DeleteNodeCommand] 添加端口失败: ${nodeData.id}`, error);
          }
        }

        // 确保所有端口都是隐藏的
        try {
          const allPorts = node.getPorts();
          allPorts.forEach(port => {
            node.portProp(port.id, 'attrs/circle/opacity', 0);
          });
          console.log(`[DeleteNodeCommand] 已隐藏节点端口: ${nodeData.id}`);
        } catch (error) {
          console.warn(`[DeleteNodeCommand] 隐藏端口失败: ${nodeData.id}`, error);
        }

        // 手动添加到图形，确保在所有属性恢复后再添加
        try {
          node.addTo(this.app.graph);
          console.log(`[DeleteNodeCommand] 节点已添加到图形: ${nodeData.id}`);
        } catch (error) {
          console.error(`[DeleteNodeCommand] 添加节点到图形失败: ${nodeData.id}`, error);
          return null;
        }

        console.log(`[DeleteNodeCommand] 节点恢复完成: ${nodeData.id}`);
        return node;
      } else {
        console.error(`[DeleteNodeCommand] 创建节点失败: ${nodeType}`);
        return null;
      }
    } catch (error) {
      console.error('[DeleteNodeCommand] recreateNode 失败:', error);
      return null;
    }
  }

  restoreConnections() {
    this.connections.forEach(connData => {
      try {
        const link = new joint.shapes.standard.Link();
        link.set('id', connData.id);
        link.set('source', connData.source);
        link.set('target', connData.target);
        link.attr(connData.attributes);
        link.addTo(this.app.graph);
      } catch (error) {
        console.warn('[DeleteNodeCommand] 恢复连接失败:', error);
      }
    });
  }

  restoreEmbeddedNodes() {
    if (this.embeddedNodes.length === 0) return;

    const containerNode = this.app.graph.getCell(this.nodeData.id);
    if (!containerNode) return;

    this.embeddedNodes.forEach(nodeId => {
      const embeddedNode = this.app.graph.getCell(nodeId);
      if (embeddedNode) {
        containerNode.embed(embeddedNode);
      }
    });
  }
}

/**
 * 移动节点命令
 */
class MoveNodeCommand extends BaseCommand {
  constructor(app, node, oldPosition, newPosition) {
    super(app, `移动节点`);
    this.nodeId = node.id;
    this.oldPosition = { ...oldPosition };
    this.newPosition = { ...newPosition };
  }

  execute() {
    try {
      const node = this.app.graph.getCell(this.nodeId);
      if (node) {
        node.position(this.newPosition.x, this.newPosition.y);
        console.log(`[MoveNodeCommand] 节点已移动: ${this.nodeId}`);
      }
    } catch (error) {
      console.error('[MoveNodeCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      const node = this.app.graph.getCell(this.nodeId);
      if (node) {
        node.position(this.oldPosition.x, this.oldPosition.y);
        console.log(`[MoveNodeCommand] 节点位置已恢复: ${this.nodeId}`);
      }
    } catch (error) {
      console.error('[MoveNodeCommand] 撤销失败:', error);
      throw error;
    }
  }
}

/**
 * 多节点删除命令 - 专门处理批量删除操作
 * 解决批量删除时节点状态捕获和恢复的问题
 */
class MultiNodeDeleteCommand extends BaseCommand {
  constructor(app, nodes) {
    super(app, `删除 ${nodes.length} 个节点`);
    this.nodesData = [];
    this.allConnections = [];
    this.embeddingRelationships = [];

    // 预先捕获所有节点的完整状态
    this.captureNodesState(nodes);
  }

  captureNodesState(nodes) {
    try {
      // 首先捕获所有连接关系（在删除任何节点之前）
      this.captureAllConnections(nodes);

      // 然后捕获所有节点的状态
      nodes.forEach(node => {
        const nodeData = this.serializeNode(node);
        const embeddedNodes = this.serializeEmbeddedNodes(node);

        this.nodesData.push({
          nodeData,
          embeddedNodes
        });
      });

      // 捕获容器嵌入关系
      this.captureEmbeddingRelationships(nodes);

      console.log(`[MultiNodeDeleteCommand] 已捕获 ${this.nodesData.length} 个节点的状态`);
    } catch (error) {
      console.error('[MultiNodeDeleteCommand] 捕获节点状态失败:', error);
      throw error;
    }
  }

  captureAllConnections(nodes) {
    const nodeIds = new Set(nodes.map(node => node.id));
    const processedLinks = new Set();

    nodes.forEach(node => {
      const links = this.app.graph.getConnectedLinks(node);

      links.forEach(link => {
        // 避免重复处理同一个连接
        if (processedLinks.has(link.id)) return;
        processedLinks.add(link.id);

        const source = link.get('source');
        const target = link.get('target');

        // 只保存涉及到要删除节点的连接
        if (nodeIds.has(source.id) || nodeIds.has(target.id)) {
          this.allConnections.push({
            id: link.id,
            source: source,
            target: target,
            attributes: JSON.parse(JSON.stringify(link.attributes))
          });
        }
      });
    });
  }

  captureEmbeddingRelationships(nodes) {
    nodes.forEach(node => {
      // 如果节点被嵌入到其他容器中
      const parent = node.getParentCell();
      if (parent) {
        this.embeddingRelationships.push({
          childId: node.id,
          parentId: parent.id
        });
      }
    });
  }

  execute() {
    try {
      const nodeManager = new NodeManager(this.app);

      // 删除所有节点
      this.nodesData.forEach(({ nodeData }) => {
        const node = this.app.graph.getCell(nodeData.id);
        if (node) {
          // 关闭相关的属性面板
          if (this.app.components.propertyPanel &&
              this.app.components.propertyPanel.currentElement === node) {
            this.app.components.propertyPanel.hide();
          }

          // 清除应用状态
          if (this.app.state.selectedElement === node) {
            this.app.clearSelection();
          }

          // 删除节点（这会自动删除相关连接）
          nodeManager.deleteNodeDirect(node);
        }
      });

      console.log(`[MultiNodeDeleteCommand] 已删除 ${this.nodesData.length} 个节点`);
    } catch (error) {
      console.error('[MultiNodeDeleteCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      console.log(`[MultiNodeDeleteCommand] 开始撤销删除 ${this.nodesData.length} 个节点`);
      const nodeManager = new NodeManager(this.app);
      const recreatedNodes = new Map();
      let successCount = 0;
      let failureCount = 0;

      // 第一步：重新创建所有节点
      this.nodesData.forEach(({ nodeData }, index) => {
        console.log(`[MultiNodeDeleteCommand] 恢复节点 ${index + 1}/${this.nodesData.length}: ${nodeData.id} (${nodeData.type})`);
        const node = this.recreateNode(nodeData);
        if (node) {
          recreatedNodes.set(nodeData.id, node);
          successCount++;
          console.log(`[MultiNodeDeleteCommand] 节点恢复成功: ${nodeData.id}`);
        } else {
          failureCount++;
          console.error(`[MultiNodeDeleteCommand] 节点恢复失败: ${nodeData.id}`);
        }
      });

      console.log(`[MultiNodeDeleteCommand] 节点恢复统计: 成功 ${successCount}, 失败 ${failureCount}`);

      // 第二步：恢复所有连接
      console.log(`[MultiNodeDeleteCommand] 开始恢复 ${this.allConnections.length} 个连接`);
      this.restoreAllConnections();

      // 第三步：恢复嵌入关系
      console.log(`[MultiNodeDeleteCommand] 开始恢复 ${this.embeddingRelationships.length} 个嵌入关系`);
      this.restoreEmbeddingRelationships();

      // 第四步：恢复容器内的嵌入节点
      this.nodesData.forEach(({ nodeData, embeddedNodes }) => {
        if (embeddedNodes.length > 0) {
          console.log(`[MultiNodeDeleteCommand] 恢复容器 ${nodeData.id} 的 ${embeddedNodes.length} 个嵌入节点`);
          const containerNode = this.app.graph.getCell(nodeData.id);
          if (containerNode) {
            this.restoreEmbeddedNodesForContainer(containerNode, embeddedNodes);
          } else {
            console.warn(`[MultiNodeDeleteCommand] 找不到容器节点: ${nodeData.id}`);
          }
        }
      });

      console.log(`[MultiNodeDeleteCommand] 撤销完成: 成功恢复 ${successCount} 个节点`);

      if (failureCount > 0) {
        console.warn(`[MultiNodeDeleteCommand] 警告: ${failureCount} 个节点恢复失败`);
      }
    } catch (error) {
      console.error('[MultiNodeDeleteCommand] 撤销失败:', error);
      throw error;
    }
  }

  restoreAllConnections() {
    this.allConnections.forEach(connData => {
      try {
        // 检查连接的源和目标节点是否存在
        const sourceNode = this.app.graph.getCell(connData.source.id);
        const targetNode = this.app.graph.getCell(connData.target.id);

        if (sourceNode && targetNode) {
          const link = new joint.shapes.standard.Link();
          link.set('id', connData.id);
          link.set('source', connData.source);
          link.set('target', connData.target);
          link.attr(connData.attributes);
          link.addTo(this.app.graph);
        }
      } catch (error) {
        console.warn('[MultiNodeDeleteCommand] 恢复连接失败:', error);
      }
    });
  }

  restoreEmbeddingRelationships() {
    this.embeddingRelationships.forEach(({ childId, parentId }) => {
      const child = this.app.graph.getCell(childId);
      const parent = this.app.graph.getCell(parentId);

      if (child && parent) {
        parent.embed(child);
      }
    });
  }

  restoreEmbeddedNodesForContainer(containerNode, embeddedNodeIds) {
    embeddedNodeIds.forEach(nodeId => {
      const embeddedNode = this.app.graph.getCell(nodeId);
      if (embeddedNode) {
        containerNode.embed(embeddedNode);
      }
    });
  }

  // 复用 DeleteNodeCommand 的方法
  serializeNode(node) {
    return {
      id: node.id,
      type: node.get('type'),
      position: node.position(),
      size: node.size(),
      attributes: JSON.parse(JSON.stringify(node.attributes)),
      properties: node.prop('properties'),
      isContainer: !!node.isContainer,
      isSwitch: !!node.isSwitch,
      ports: node.getPorts()
    };
  }

  serializeEmbeddedNodes(node) {
    if (!node.isContainer) return [];

    const embedded = [];
    const embeddedCells = node.getEmbeddedCells();

    embeddedCells.forEach(cell => {
      if (cell.isElement()) {
        embedded.push(cell.id);
      }
    });

    return embedded;
  }

  recreateNode(nodeData) {
    try {
      const nodeManager = new NodeManager(this.app);
      let nodeType;

      // 根据节点类型和属性确定正确的节点类型
      switch (nodeData.type) {
        case 'standard.Circle':
          if (nodeData.attributes.label && nodeData.attributes.label.text === '开始') {
            nodeType = 'start';
          } else {
            nodeType = 'end';
          }
          break;
        case 'standard.Rectangle':
          const label = nodeData.attributes.label ? nodeData.attributes.label.text : '';
          if (label === 'Group Setting') {
            nodeType = 'groupSetting';
          } else if (nodeData.isContainer) {
            nodeType = 'container';
          } else {
            nodeType = 'process';
          }
          break;
        case 'standard.Polygon':
          if (nodeData.isSwitch) {
            nodeType = 'switch';
          } else {
            nodeType = 'decision';
          }
          break;
        default:
          console.warn(`[MultiNodeDeleteCommand] 未知的节点类型: ${nodeData.type}`);
          return null;
      }

      // 创建节点但不立即添加到图形，避免在undo过程中的图形状态问题
      let node;

      // 根据节点类型直接创建节点实例，不通过createNodeDirect以避免图形添加问题
      switch (nodeType) {
        case 'start':
          node = nodeManager.createStartNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'end':
          node = nodeManager.createEndNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'process':
          node = nodeManager.createProcessNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'decision':
          node = nodeManager.createDecisionNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'switch':
          node = nodeManager.createSwitchNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'groupSetting':
          node = nodeManager.createGroupSettingNode(nodeData.position.x, nodeData.position.y);
          break;
        case 'container':
          node = nodeManager.createContainerNode(nodeData.position.x, nodeData.position.y);
          break;
        default:
          console.error(`[MultiNodeDeleteCommand] 未知的节点类型: ${nodeType}`);
          return null;
      }

      if (node) {
        console.log(`[MultiNodeDeleteCommand] 成功创建节点: ${nodeType}, 新ID: ${node.id}`);

        // 恢复原始节点ID
        node.set('id', nodeData.id);

        // 恢复属性
        if (nodeData.properties) {
          node.prop('properties', nodeData.properties);
        }

        // 恢复大小
        if (nodeData.size) {
          node.resize(nodeData.size.width, nodeData.size.height);
        }

        // 恢复特殊属性
        if (nodeData.isContainer) {
          node.isContainer = true;
          node.isResizable = true;
        }
        if (nodeData.isSwitch) {
          node.isSwitch = true;
          // 对于Switch节点，需要更新端口以匹配保存的cases
          if (nodeData.properties && nodeData.properties.cases) {
            nodeManager.updateSwitchPorts(node, nodeData.properties.cases);
          }
        }

        // 设置端口分组配置（必须在添加端口之前设置）
        node.set('ports', { groups: PORT_GROUPS });

        // 恢复端口信息（如果有的话）
        if (nodeData.ports && nodeData.ports.length > 0) {
          // 清除默认端口
          const currentPorts = node.getPorts();
          currentPorts.forEach(port => {
            node.removePort(port.id);
          });

          // 恢复原始端口，但确保它们是隐藏的
          nodeData.ports.forEach(portData => {
            // 创建端口数据副本并确保隐藏
            const hiddenPortData = JSON.parse(JSON.stringify(portData));
            if (hiddenPortData.attrs && hiddenPortData.attrs.circle) {
              hiddenPortData.attrs.circle.opacity = 0;
            }
            node.addPort(hiddenPortData);
          });
        } else {
          // 如果没有保存的端口信息，添加默认端口
          try {
            nodeManager.addNodePorts(node, nodeType);
            console.log(`[MultiNodeDeleteCommand] 已为节点添加默认端口: ${nodeData.id}`);
          } catch (error) {
            console.warn(`[MultiNodeDeleteCommand] 添加端口失败: ${nodeData.id}`, error);
          }
        }

        // 确保所有端口都是隐藏的
        try {
          const allPorts = node.getPorts();
          allPorts.forEach(port => {
            node.portProp(port.id, 'attrs/circle/opacity', 0);
          });
          console.log(`[MultiNodeDeleteCommand] 已隐藏节点端口: ${nodeData.id}`);
        } catch (error) {
          console.warn(`[MultiNodeDeleteCommand] 隐藏端口失败: ${nodeData.id}`, error);
        }

        // 手动添加到图形，确保在所有属性恢复后再添加
        try {
          node.addTo(this.app.graph);
          console.log(`[MultiNodeDeleteCommand] 节点已添加到图形: ${nodeData.id}`);
        } catch (error) {
          console.error(`[MultiNodeDeleteCommand] 添加节点到图形失败: ${nodeData.id}`, error);
          return null;
        }

        console.log(`[MultiNodeDeleteCommand] 节点恢复完成: ${nodeData.id}`);
        return node;
      } else {
        console.error(`[MultiNodeDeleteCommand] 创建节点失败: ${nodeType}`);
        return null;
      }
    } catch (error) {
      console.error('[MultiNodeDeleteCommand] recreateNode 失败:', error);
      return null;
    }
  }
}

// 导出类到全局作用域
if (typeof window !== 'undefined') {
  window.CreateNodeCommand = CreateNodeCommand;
  window.DeleteNodeCommand = DeleteNodeCommand;
  window.MoveNodeCommand = MoveNodeCommand;
  window.MultiNodeDeleteCommand = MultiNodeDeleteCommand;
} else if (typeof global !== 'undefined') {
  global.CreateNodeCommand = CreateNodeCommand;
  global.DeleteNodeCommand = DeleteNodeCommand;
  global.MoveNodeCommand = MoveNodeCommand;
  global.MultiNodeDeleteCommand = MultiNodeDeleteCommand;
}
