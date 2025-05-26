/**
 * 节点相关命令类
 * 实现节点的创建、删除、移动等操作的撤销/重做功能
 */

// 确保BaseCommand类可用
if (typeof BaseCommand === 'undefined') {
  console.error('BaseCommand 类未定义，请确保 command-history.js 已正确加载');
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
    // 创建新节点实例
    const nodeManager = new NodeManager(this.app);
    let node;

    // 根据节点类型创建
    switch (nodeData.type) {
      case 'standard.Circle':
        if (nodeData.attributes.label && nodeData.attributes.label.text === '开始') {
          node = nodeManager.createStartNode(nodeData.position.x, nodeData.position.y);
        } else {
          node = nodeManager.createEndNode(nodeData.position.x, nodeData.position.y);
        }
        break;
      case 'standard.Rectangle':
        const label = nodeData.attributes.label ? nodeData.attributes.label.text : '';
        if (label === 'Group Setting') {
          node = nodeManager.createGroupSettingNode(nodeData.position.x, nodeData.position.y);
        } else if (nodeData.isContainer) {
          node = nodeManager.createContainerNode(nodeData.position.x, nodeData.position.y);
        } else {
          node = nodeManager.createProcessNode(nodeData.position.x, nodeData.position.y);
        }
        break;
      case 'standard.Polygon':
        if (nodeData.isSwitch) {
          node = nodeManager.createSwitchNode(nodeData.position.x, nodeData.position.y);
        } else {
          node = nodeManager.createDecisionNode(nodeData.position.x, nodeData.position.y);
        }
        break;
      default:
        console.warn(`[DeleteNodeCommand] 未知的节点类型: ${nodeData.type}`);
        return null;
    }

    if (node) {
      // 恢复节点ID
      node.set('id', nodeData.id);

      // 恢复属性
      if (nodeData.properties) {
        node.prop('properties', nodeData.properties);
      }

      // 恢复大小
      node.resize(nodeData.size.width, nodeData.size.height);

      // 恢复特殊属性
      if (nodeData.isContainer) {
        node.isContainer = true;
        node.isResizable = true;
      }
      if (nodeData.isSwitch) {
        node.isSwitch = true;
      }
    }

    return node;
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

// 导出类到全局作用域
if (typeof window !== 'undefined') {
  window.CreateNodeCommand = CreateNodeCommand;
  window.DeleteNodeCommand = DeleteNodeCommand;
  window.MoveNodeCommand = MoveNodeCommand;
} else if (typeof global !== 'undefined') {
  global.CreateNodeCommand = CreateNodeCommand;
  global.DeleteNodeCommand = DeleteNodeCommand;
  global.MoveNodeCommand = MoveNodeCommand;
}
