/**
 * 属性相关命令类
 * 实现节点属性变更的撤销/重做功能
 */

// 确保BaseCommand类可用
if (typeof BaseCommand === 'undefined') {
  console.error('BaseCommand 类未定义，请确保 command-history.js 已正确加载');
}

/**
 * 属性变更命令
 */
class PropertyChangeCommand extends BaseCommand {
  constructor(app, node, oldProperties, newProperties) {
    super(app, `修改节点属性`);
    this.nodeId = node.id;
    this.oldProperties = JSON.parse(JSON.stringify(oldProperties || {}));
    this.newProperties = JSON.parse(JSON.stringify(newProperties || {}));
  }

  execute() {
    try {
      const node = this.app.graph.getCell(this.nodeId);
      if (node) {
        node.prop('properties', this.newProperties);

        // 如果是Switch节点，更新端口
        if (node.isSwitch && this.newProperties.cases) {
          const nodeManager = new NodeManager(this.app);
          nodeManager.updateSwitchPorts(node, this.newProperties.cases);
        }

        console.log(`[PropertyChangeCommand] 节点属性已更新: ${this.nodeId}`);
      }
    } catch (error) {
      console.error('[PropertyChangeCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      const node = this.app.graph.getCell(this.nodeId);
      if (node) {
        node.prop('properties', this.oldProperties);

        // 如果是Switch节点，恢复端口
        if (node.isSwitch && this.oldProperties.cases) {
          const nodeManager = new NodeManager(this.app);
          nodeManager.updateSwitchPorts(node, this.oldProperties.cases);
        }

        console.log(`[PropertyChangeCommand] 节点属性已恢复: ${this.nodeId}`);
      }
    } catch (error) {
      console.error('[PropertyChangeCommand] 撤销失败:', error);
      throw error;
    }
  }
}

/**
 * 容器嵌入命令
 */
class EmbedNodeCommand extends BaseCommand {
  constructor(app, containerNode, embeddedNode, action = 'embed') {
    super(app, action === 'embed' ? `嵌入节点到容器` : `从容器移除节点`);
    this.containerId = containerNode.id;
    this.embeddedNodeId = embeddedNode.id;
    this.action = action; // 'embed' or 'unembed'
    this.oldPosition = { ...embeddedNode.position() };
  }

  execute() {
    try {
      const container = this.app.graph.getCell(this.containerId);
      const embeddedNode = this.app.graph.getCell(this.embeddedNodeId);

      if (container && embeddedNode) {
        if (this.action === 'embed') {
          container.embed(embeddedNode);
          console.log(`[EmbedNodeCommand] 节点已嵌入容器: ${this.embeddedNodeId} -> ${this.containerId}`);
        } else {
          container.unembed(embeddedNode);
          console.log(`[EmbedNodeCommand] 节点已从容器移除: ${this.embeddedNodeId} <- ${this.containerId}`);
        }
      }
    } catch (error) {
      console.error('[EmbedNodeCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      const container = this.app.graph.getCell(this.containerId);
      const embeddedNode = this.app.graph.getCell(this.embeddedNodeId);

      if (container && embeddedNode) {
        if (this.action === 'embed') {
          container.unembed(embeddedNode);
          // 恢复原始位置
          embeddedNode.position(this.oldPosition.x, this.oldPosition.y);
          console.log(`[EmbedNodeCommand] 撤销嵌入: ${this.embeddedNodeId}`);
        } else {
          container.embed(embeddedNode);
          console.log(`[EmbedNodeCommand] 撤销移除: ${this.embeddedNodeId}`);
        }
      }
    } catch (error) {
      console.error('[EmbedNodeCommand] 撤销失败:', error);
      throw error;
    }
  }
}

/**
 * 容器调整大小命令
 */
class ResizeContainerCommand extends BaseCommand {
  constructor(app, container, oldSize, newSize) {
    super(app, `调整容器大小`);
    this.containerId = container.id;
    this.oldSize = { ...oldSize };
    this.newSize = { ...newSize };
  }

  execute() {
    try {
      const container = this.app.graph.getCell(this.containerId);
      if (container) {
        container.resize(this.newSize.width, this.newSize.height);
        console.log(`[ResizeContainerCommand] 容器大小已调整: ${this.containerId}`);
      }
    } catch (error) {
      console.error('[ResizeContainerCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      const container = this.app.graph.getCell(this.containerId);
      if (container) {
        container.resize(this.oldSize.width, this.oldSize.height);
        console.log(`[ResizeContainerCommand] 容器大小已恢复: ${this.containerId}`);
      }
    } catch (error) {
      console.error('[ResizeContainerCommand] 撤销失败:', error);
      throw error;
    }
  }
}

/**
 * 创建连接命令
 */
class CreateLinkCommand extends BaseCommand {
  constructor(app, sourceId, targetId, sourcePort, targetPort) {
    super(app, `创建连接`);
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.sourcePort = sourcePort;
    this.targetPort = targetPort;
    this.linkId = null;
    this.linkData = null;
  }

  execute() {
    try {
      const source = this.app.graph.getCell(this.sourceId);
      const target = this.app.graph.getCell(this.targetId);

      if (source && target) {
        const link = new joint.shapes.standard.Link();

        // 设置连接源和目标
        link.source({ id: this.sourceId, port: this.sourcePort });
        link.target({ id: this.targetId, port: this.targetPort });

        // 设置连接样式
        link.attr({
          line: {
            stroke: '#333',
            strokeWidth: 2,
            targetMarker: {
              type: 'path',
              d: 'M 10 -5 0 0 10 5 z',
              fill: '#333'
            }
          }
        });

        link.addTo(this.app.graph);
        this.linkId = link.id;
        this.linkData = this.serializeLink(link);

        // 检查源节点是否是Switch节点，添加标签
        this.app.handleSwitchNodeConnection(link);

        console.log(`[CreateLinkCommand] 连接已创建: ${this.linkId}`);
        return link;
      }
    } catch (error) {
      console.error('[CreateLinkCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      if (this.linkId) {
        const link = this.app.graph.getCell(this.linkId);
        if (link) {
          link.remove();
          console.log(`[CreateLinkCommand] 连接已删除: ${this.linkId}`);
        }
      }
    } catch (error) {
      console.error('[CreateLinkCommand] 撤销失败:', error);
      throw error;
    }
  }

  serializeLink(link) {
    return {
      id: link.id,
      source: link.get('source'),
      target: link.get('target'),
      attributes: JSON.parse(JSON.stringify(link.attributes))
    };
  }
}

/**
 * 删除连接命令
 */
class DeleteLinkCommand extends BaseCommand {
  constructor(app, link) {
    super(app, `删除连接`);
    this.linkData = this.serializeLink(link);
  }

  execute() {
    try {
      const link = this.app.graph.getCell(this.linkData.id);
      if (link) {
        // 清除选中状态（如果这个连接被选中）
        if (this.app.state.selectedLink === link) {
          this.app.state.selectedLink = null;
        }

        link.remove();
        console.log(`[DeleteLinkCommand] 连接已删除: ${this.linkData.id}`);
      }
    } catch (error) {
      console.error('[DeleteLinkCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      const link = new joint.shapes.standard.Link();
      link.set('id', this.linkData.id);
      link.set('source', this.linkData.source);
      link.set('target', this.linkData.target);
      link.attr(this.linkData.attributes);
      link.addTo(this.app.graph);

      console.log(`[DeleteLinkCommand] 连接已恢复: ${this.linkData.id}`);
      return link;
    } catch (error) {
      console.error('[DeleteLinkCommand] 撤销失败:', error);
      throw error;
    }
  }

  serializeLink(link) {
    return {
      id: link.id,
      source: link.get('source'),
      target: link.get('target'),
      attributes: JSON.parse(JSON.stringify(link.attributes))
    };
  }
}

/**
 * 批量命令 - 用于组合多个命令
 */
class BatchCommand extends BaseCommand {
  constructor(app, commands, description = '批量操作') {
    super(app, description);
    this.commands = commands || [];
  }

  execute() {
    try {
      console.log(`[BatchCommand] 开始执行批量命令，包含 ${this.commands.length} 个操作`);
      const results = [];
      for (let i = 0; i < this.commands.length; i++) {
        const command = this.commands[i];
        console.log(`[BatchCommand] 执行第 ${i + 1} 个命令: ${command.constructor.name}`);
        results.push(command.execute());
      }
      console.log(`[BatchCommand] 批量命令已执行完成，包含 ${this.commands.length} 个操作`);
      return results;
    } catch (error) {
      console.error('[BatchCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      console.log(`[BatchCommand] 开始撤销批量命令，包含 ${this.commands.length} 个操作`);
      // 反向执行撤销
      for (let i = this.commands.length - 1; i >= 0; i--) {
        const command = this.commands[i];
        console.log(`[BatchCommand] 撤销第 ${this.commands.length - i} 个命令: ${command.constructor.name}`);
        command.undo();
      }
      console.log(`[BatchCommand] 批量命令已撤销完成，包含 ${this.commands.length} 个操作`);
    } catch (error) {
      console.error('[BatchCommand] 撤销失败:', error);
      throw error;
    }
  }

  addCommand(command) {
    this.commands.push(command);
  }

  getCommandCount() {
    return this.commands.length;
  }
}

/**
 * 多选移动命令
 */
class MultiSelectionMoveCommand extends BaseCommand {
  constructor(app, elements, oldPositions, newPositions) {
    super(app, `移动 ${elements.length} 个节点`);
    this.elementIds = elements.map(el => el.id);
    this.oldPositions = new Map();
    this.newPositions = new Map();

    // 存储位置信息
    elements.forEach((element, index) => {
      this.oldPositions.set(element.id, { ...oldPositions[index] });
      this.newPositions.set(element.id, { ...newPositions[index] });
    });
  }

  execute() {
    try {
      this.elementIds.forEach(elementId => {
        const element = this.app.graph.getCell(elementId);
        const newPos = this.newPositions.get(elementId);
        if (element && newPos) {
          element.position(newPos.x, newPos.y);
        }
      });
      console.log(`[MultiSelectionMoveCommand] ${this.elementIds.length} 个节点已移动`);
    } catch (error) {
      console.error('[MultiSelectionMoveCommand] 执行失败:', error);
      throw error;
    }
  }

  undo() {
    try {
      this.elementIds.forEach(elementId => {
        const element = this.app.graph.getCell(elementId);
        const oldPos = this.oldPositions.get(elementId);
        if (element && oldPos) {
          element.position(oldPos.x, oldPos.y);
        }
      });
      console.log(`[MultiSelectionMoveCommand] ${this.elementIds.length} 个节点位置已恢复`);
    } catch (error) {
      console.error('[MultiSelectionMoveCommand] 撤销失败:', error);
      throw error;
    }
  }
}

// 导出类到全局作用域
if (typeof window !== 'undefined') {
  window.PropertyChangeCommand = PropertyChangeCommand;
  window.EmbedNodeCommand = EmbedNodeCommand;
  window.ResizeContainerCommand = ResizeContainerCommand;
  window.CreateLinkCommand = CreateLinkCommand;
  window.DeleteLinkCommand = DeleteLinkCommand;
  window.BatchCommand = BatchCommand;
  window.MultiSelectionMoveCommand = MultiSelectionMoveCommand;
} else if (typeof global !== 'undefined') {
  global.PropertyChangeCommand = PropertyChangeCommand;
  global.EmbedNodeCommand = EmbedNodeCommand;
  global.ResizeContainerCommand = ResizeContainerCommand;
  global.CreateLinkCommand = CreateLinkCommand;
  global.DeleteLinkCommand = DeleteLinkCommand;
  global.BatchCommand = BatchCommand;
  global.MultiSelectionMoveCommand = MultiSelectionMoveCommand;
}
