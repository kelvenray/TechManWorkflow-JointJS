/**
 * 属性面板组件
 * 提供节点属性编辑功能
 */

class PropertyPanel {
  constructor(app) {
    this.app = app;
    this.panel = null;
    this.currentElement = null;
    this.isVisible = false;
    this.eventManager = new EventManager();
  }

  /**
   * 初始化属性面板
   */
  init() {
    try {
      this.createPanel();
      this.bindEvents();
      
      console.log('属性面板初始化完成');
      
    } catch (error) {
      ErrorHandler.handle(error, '属性面板初始化');
    }
  }

  /**
   * 创建属性面板
   */
  createPanel() {
    // 移除旧面板
    const existingPanel = document.getElementById('property-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    this.panel = document.createElement('div');
    this.panel.id = 'property-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      max-height: 600px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      display: none;
      overflow: hidden;
    `;

    document.body.appendChild(this.panel);
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 阻止面板内点击事件冒泡
    this.eventManager.addEventListener(this.panel, 'click', (e) => {
      e.stopPropagation();
    });

    // ESC键关闭面板
    this.eventManager.addEventListener(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * 显示属性面板
   */
  show(element) {
    if (!element) return;

    this.currentElement = element;
    this.isVisible = true;
    
    // 生成面板内容
    this.generatePanelContent(element);
    
    // 显示面板
    this.panel.style.display = 'block';
    
    console.log('属性面板已显示，编辑元素:', element.id);
  }

  /**
   * 隐藏属性面板
   */
  hide() {
    this.isVisible = false;
    this.currentElement = null;
    this.panel.style.display = 'none';
    
    console.log('属性面板已隐藏');
  }

  /**
   * 生成面板内容
   */
  generatePanelContent(element) {
    const type = element.get('type');
    const attrs = element.attributes;
    
    let content = `
      <div style="padding: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; color: #333;">节点属性</h3>
          <button id="close-panel" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">节点类型:</label>
          <div style="padding: 8px; background: #f5f5f5; border-radius: 4px; color: #666;">
            ${this.getNodeTypeName(type)}
          </div>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">节点ID:</label>
          <div style="padding: 8px; background: #f5f5f5; border-radius: 4px; color: #666; font-family: monospace; font-size: 12px;">
            ${element.id}
          </div>
        </div>
    `;

    // 根据节点类型生成特定属性编辑器
    if (type === 'standard.Circle') {
      content += this.generateCircleProperties(element);
    } else if (type === 'standard.Rectangle') {
      content += this.generateRectangleProperties(element);
    } else if (type === 'workflow.Decision') {
      content += this.generateDecisionProperties(element);
    } else if (type === 'workflow.Container') {
      content += this.generateContainerProperties(element);
    } else {
      content += this.generateGenericProperties(element);
    }

    content += `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
          <button id="apply-changes" style="
            background: #2196f3;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
          ">应用更改</button>
          <button id="cancel-changes" style="
            background: #666;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          ">取消</button>
        </div>
      </div>
    `;

    this.panel.innerHTML = content;
    this.bindPanelEvents();
  }

  /**
   * 获取节点类型名称
   */
  getNodeTypeName(type) {
    const typeNames = {
      'standard.Circle': '圆形节点',
      'standard.Rectangle': '矩形节点',
      'workflow.Decision': '判断节点',
      'workflow.Container': '容器节点',
      'workflow.Switch': 'Switch节点'
    };
    return typeNames[type] || '未知类型';
  }

  /**
   * 生成圆形节点属性
   */
  generateCircleProperties(element) {
    const label = element.attr('label/text') || '';
    const fillColor = element.attr('body/fill') || '#4caf50';
    const strokeColor = element.attr('body/stroke') || '#2e7d32';

    return `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">标签文本:</label>
        <input type="text" id="node-label" value="${label}" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        ">
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">填充颜色:</label>
        <input type="color" id="fill-color" value="${fillColor}" style="
          width: 100%;
          height: 40px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">边框颜色:</label>
        <input type="color" id="stroke-color" value="${strokeColor}" style="
          width: 100%;
          height: 40px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">
      </div>
    `;
  }

  /**
   * 生成矩形节点属性
   */
  generateRectangleProperties(element) {
    const label = element.attr('label/text') || '';
    const fillColor = element.attr('body/fill') || '#2196f3';
    const strokeColor = element.attr('body/stroke') || '#1976d2';

    return `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">标签文本:</label>
        <input type="text" id="node-label" value="${label}" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        ">
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">填充颜色:</label>
        <input type="color" id="fill-color" value="${fillColor}" style="
          width: 100%;
          height: 40px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">边框颜色:</label>
        <input type="color" id="stroke-color" value="${strokeColor}" style="
          width: 100%;
          height: 40px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">
      </div>
    `;
  }

  /**
   * 生成判断节点属性
   */
  generateDecisionProperties(element) {
    const label = element.attr('label/text') || '';
    const condition = element.prop('condition') || '';

    return `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">标签文本:</label>
        <input type="text" id="node-label" value="${label}" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        ">
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">判断条件:</label>
        <textarea id="node-condition" rows="3" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
          resize: vertical;
        ">${condition}</textarea>
      </div>
    `;
  }

  /**
   * 生成容器节点属性
   */
  generateContainerProperties(element) {
    const label = element.attr('headerText/text') || '';
    const description = element.prop('description') || '';

    return `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">容器标题:</label>
        <input type="text" id="container-title" value="${label}" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        ">
      </div>

      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">描述:</label>
        <textarea id="container-description" rows="3" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
          resize: vertical;
        ">${description}</textarea>
      </div>
    `;
  }

  /**
   * 生成通用属性
   */
  generateGenericProperties(element) {
    const label = element.attr('label/text') || element.attr('text/text') || '';

    return `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">标签文本:</label>
        <input type="text" id="node-label" value="${label}" style="
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        ">
      </div>
    `;
  }

  /**
   * 绑定面板事件
   */
  bindPanelEvents() {
    // 关闭按钮
    const closeBtn = this.panel.querySelector('#close-panel');
    if (closeBtn) {
      this.eventManager.addEventListener(closeBtn, 'click', () => {
        this.hide();
      });
    }

    // 应用更改按钮
    const applyBtn = this.panel.querySelector('#apply-changes');
    if (applyBtn) {
      this.eventManager.addEventListener(applyBtn, 'click', () => {
        this.applyChanges();
      });
    }

    // 取消按钮
    const cancelBtn = this.panel.querySelector('#cancel-changes');
    if (cancelBtn) {
      this.eventManager.addEventListener(cancelBtn, 'click', () => {
        this.hide();
      });
    }
  }

  /**
   * 应用更改
   */
  applyChanges() {
    if (!this.currentElement) return;

    try {
      const type = this.currentElement.get('type');

      // 通用属性更改
      const labelInput = this.panel.querySelector('#node-label');
      if (labelInput) {
        const newLabel = labelInput.value.trim();
        if (type === 'standard.Circle' || type === 'standard.Rectangle') {
          this.currentElement.attr('label/text', newLabel);
        } else {
          this.currentElement.attr('text/text', newLabel);
        }
      }

      // 颜色属性更改
      const fillColorInput = this.panel.querySelector('#fill-color');
      if (fillColorInput) {
        this.currentElement.attr('body/fill', fillColorInput.value);
      }

      const strokeColorInput = this.panel.querySelector('#stroke-color');
      if (strokeColorInput) {
        this.currentElement.attr('body/stroke', strokeColorInput.value);
      }

      // 特定类型属性更改
      if (type === 'workflow.Decision') {
        const conditionInput = this.panel.querySelector('#node-condition');
        if (conditionInput) {
          this.currentElement.prop('condition', conditionInput.value);
        }
      } else if (type === 'workflow.Container') {
        const titleInput = this.panel.querySelector('#container-title');
        if (titleInput) {
          this.currentElement.attr('headerText/text', titleInput.value);
        }

        const descInput = this.panel.querySelector('#container-description');
        if (descInput) {
          this.currentElement.prop('description', descInput.value);
        }
      }

      console.log('属性更改已应用');
      this.hide();

    } catch (error) {
      ErrorHandler.handle(error, '应用属性更改');
    }
  }

  /**
   * 获取当前编辑的元素
   */
  getCurrentElement() {
    return this.currentElement;
  }

  /**
   * 检查面板是否可见
   */
  isShown() {
    return this.isVisible;
  }

  /**
   * 销毁属性面板
   */
  destroy() {
    try {
      // 清理事件监听器
      this.eventManager.removeAllListeners();
      
      // 清理DOM元素
      if (this.panel) {
        this.panel.remove();
        this.panel = null;
      }
      
      // 重置状态
      this.currentElement = null;
      this.isVisible = false;
      
      console.log('属性面板已销毁');
      
    } catch (error) {
      ErrorHandler.handle(error, '属性面板销毁');
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PropertyPanel };
} else {
  window.PropertyPanel = PropertyPanel;
}
