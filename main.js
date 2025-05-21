if (typeof joint === 'undefined') {
    alert('JointJS未加载成功，请检查CDN或网络！');
    throw new Error('JointJS未加载成功');
  }

  // 获取节点相关的所有连接线（包括内部节点之间的连接线）
  function getAllRelatedLinks(element) {
    const graph = element.graph;
    if (!graph) return [];

    let links = [];

    // 如果是容器节点，获取所有嵌套节点
    if (element.isContainer) {
      const embeddedCells = element.getEmbeddedCells();
      const embeddedElements = embeddedCells.filter(cell => !cell.isLink());

      // 获取容器内每个节点的连接线
      embeddedElements.forEach(cell => {
        // 获取与该节点相连的所有连接线
        const cellLinks = graph.getConnectedLinks(cell, { includeEnclosed: true });
        links = links.concat(cellLinks);
      });

      // 特别处理：获取容器内部节点之间的连接线
      // 这是关键部分，确保容器内部节点之间的连接线也被包含
      const internalLinks = [];
      embeddedElements.forEach(sourceCell => {
        embeddedElements.forEach(targetCell => {
          if (sourceCell.id !== targetCell.id) {
            // 查找从sourceCell到targetCell的连接线
            const directLinks = graph.getConnectedLinks(sourceCell, {
              outbound: true,
              inbound: false,
              includeEnclosed: true
            }).filter(link => {
              const target = link.getTargetCell();
              return target && target.id === targetCell.id;
            });

            internalLinks.push(...directLinks);
          }
        });
      });

      links = links.concat(internalLinks);
    }

    // 获取与元素本身相连的连接线
    const elementLinks = graph.getConnectedLinks(element);
    links = links.concat(elementLinks);

    // 去重
    return Array.from(new Set(links));
  }

  const graph = new joint.dia.Graph();
  const paper = new joint.dia.Paper({
    el: document.getElementById('paper-container'),
    model: graph,
    width: window.innerWidth,
    height: window.innerHeight,
    gridSize: 10,
    drawGrid: true,
    background: { color: '#f8f9fa' },
    defaultLink: () => new joint.shapes.standard.Link({
        attrs: {
            line: {
                stroke: '#333',
                strokeWidth: 2,
                targetMarker: {
                    type: 'path',
                    d: 'M 10 -5 0 0 10 5 z',
                    fill: '#333'
                }
            }
        }
    }),
    interactive: {
        magnet: true,
        elementMove: true,
        linkMove: true,
        addLinkFromMagnet: true,
        validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
            // Allow connections between any elements
            return true;
        }
    },
    highlighting: {
        'default': {
            name: 'stroke',
            options: {
                padding: 6,
                attrs: {
                    'stroke-width': 3,
                    stroke: '#1976d2'
                }
            }
        }
    }
  });

  // Ensure all elements are visible and interactive
  paper.on('cell:pointerdown', function(cellView) {
    const model = cellView.model;

    // 如果是连接线，检查它是否连接了容器内的节点
    if (model.isLink()) {
      const sourceCell = model.getSourceCell();
      const targetCell = model.getTargetCell();

      // 检查源节点或目标节点是否在容器内
      const sourceParent = sourceCell ? sourceCell.getParentCell() : null;
      const targetParent = targetCell ? targetCell.getParentCell() : null;

      // 如果连接线连接的是容器内的节点，确保它在最上层
      if (sourceParent && sourceParent.isContainer || targetParent && targetParent.isContainer) {
        // 找到所有相关的容器
        const containers = [];
        if (sourceParent && sourceParent.isContainer) containers.push(sourceParent);
        if (targetParent && targetParent.isContainer) containers.push(targetParent);

        // 确保容器、容器内节点和连接线都在最上层
        containers.forEach(container => {
          // 先将容器节点移到前面
          container.toFront({ deep: false });

          // 然后将嵌套节点移到前面
          const embeds = container.getEmbeddedCells();
          if (embeds.length > 0) {
            embeds.forEach(embed => {
              embed.toFront();
            });
          }
        });

        // 最后将连接线移到最前面
        model.toFront();
        return;
      }
    }

    // 对于其他元素，正常处理
    model.toFront();
  });

  // ========== 左侧 Palette ========== //
  const palette = document.createElement('div');
  palette.style.position = 'absolute';
  palette.style.left = '0';
  palette.style.top = '0';
  palette.style.width = '140px';
  palette.style.height = '100vh';
  palette.style.background = '#f4f4f4';
  palette.style.borderRight = '1px solid #ddd';
  palette.style.zIndex = 10;
  palette.innerHTML = `
    <div draggable="true" class="palette-item" data-type="start">开始</div>
    <div draggable="true" class="palette-item" data-type="process">流程</div>
    <div draggable="true" class="palette-item" data-type="decision">决策</div>
    <div draggable="true" class="palette-item" data-type="container">容器</div>
    <div draggable="true" class="palette-item" data-type="end">结束</div>
  `;
  document.body.appendChild(palette);

  // Palette 样式
  const style = document.createElement('style');
  style.innerHTML = `
.palette-item {
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 4px;
  padding: 14px 8px;
  margin: 16px 10px;
  text-align: center;
  cursor: grab;
  user-select: none;
  font-size: 18px;
  font-weight: bold;
  color: #333;
  letter-spacing: 2px;
  box-shadow: 0 1px 2px #eee;
  transition: box-shadow 0.2s;
}
.palette-item:active {
  cursor: grabbing;
  box-shadow: 0 2px 8px #aaa;
}

/* Make sure all elements are visible */
.joint-element {
  z-index: 1;
}

/* Ensure start and end nodes are always visible */
.joint-element circle {
  z-index: 2;
}

/* Ensure text labels are visible */
.joint-element text {
  z-index: 3;
}
`;
  document.head.appendChild(style);

  // ========== 锚点分组配置 ========== //
  const portGroups = {
    bottom: {
        position: { name: 'bottom' }, // 使用name: 'bottom'确保位置正确
        attrs: {
            circle: {
                r: 4, // 锚点半径设置为4px，直径8px
                magnet: true,
                stroke: '#333', // 边框颜色
                strokeWidth: 1,
                fill: '#fff', // 填充颜色
                cursor: 'crosshair',
                opacity: 0 // 默认隐藏
            }
        },
        markup: [
            {
                tagName: 'circle',
                selector: 'circle',
                attributes: {
                    'r': 4,
                    'magnet': 'true',
                    'fill': '#fff',
                    'stroke': '#333',
                    'stroke-width': 1
                }
            }
        ]
    }
  };

  // ========== 拖拽创建节点 ========== //
  let dragType = null;
  palette.addEventListener('dragstart', e => {
    dragType = e.target.dataset.type;
    // 设置拖拽数据，虽然这里不用，但标准HTML拖放需要
    e.dataTransfer.setData('text/plain', dragType);
    e.dataTransfer.effectAllowed = 'copy'; // 允许复制效果
  });
  paper.el.addEventListener('dragover', e => {
    // 只有从palette拖拽时才允许默认的dragover行为（例如显示放置提示），否则阻止
    if (dragType) {
        e.preventDefault(); // 允许放置
        e.dataTransfer.dropEffect = 'copy'; // 设置放置效果为复制
    }
  });
  paper.el.addEventListener('drop', e => {
    e.preventDefault(); // 阻止默认行为，处理自定义放置逻辑
    if (!dragType) return; // 如果不是从palette拖拽来的，不处理

    const { left, top } = paper.el.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    let node;

    // 根据 dragType 创建不同类型的节点
    if (dragType === 'start') {
        node = new joint.shapes.standard.Circle();
        node.position(x - 40, y - 40);
        node.resize(80, 80);
        node.attr({
            body: {
                fill: '#4caf50',
                stroke: '#388e3c',
                strokeWidth: 3,
                pointerEvents: 'auto' // Ensure pointer events work
            },
            label: {
                text: '开始',
                fill: '#fff',
                fontWeight: 'bold',
                fontSize: 20,
                pointerEvents: 'auto' // Ensure pointer events work
            }
        });
        // Set z-index to ensure visibility
        node.set('z', 10);
    } else if (dragType === 'end') {
        node = new joint.shapes.standard.Circle();
        node.position(x - 40, y - 40);
        node.resize(80, 80);
        node.attr({
            body: {
                fill: '#f44336',
                stroke: '#b71c1c',
                strokeWidth: 3,
                pointerEvents: 'auto' // Ensure pointer events work
            },
            label: {
                text: '结束',
                fill: '#fff',
                fontWeight: 'bold',
                fontSize: 20,
                pointerEvents: 'auto' // Ensure pointer events work
            }
        });
        // Set z-index to ensure visibility
        node.set('z', 10);
    } else if (dragType === 'process') {
        node = new joint.shapes.standard.Rectangle();
        node.position(x - 60, y - 30);
        node.resize(120, 60);
        node.attr({
            body: {
                fill: '#2196f3',
                stroke: '#1565c0',
                strokeWidth: 3,
                rx: 10,
                ry: 10,
                pointerEvents: 'auto'
            },
            label: {
                text: '流程',
                fill: '#fff',
                fontWeight: 'bold',
                fontSize: 18,
                pointerEvents: 'auto'
            }
        });
        // Set z-index to ensure visibility
        node.set('z', 5);
    } else if (dragType === 'decision') {
        node = new joint.shapes.standard.Polygon();
        node.position(x - 60, y - 60);
        node.resize(120, 120);
        node.attr({
            body: {
                fill: '#ffeb3b',
                stroke: '#fbc02d',
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
        // Set z-index to ensure visibility
        node.set('z', 5);
    } else if (dragType === 'container') {
        node = new joint.shapes.standard.Rectangle();
        node.position(x - 150, y - 120);
        node.resize(300, 240);
        node.attr({
            body: {
                fill: '#FFFFFF', // 纯白色背景
                stroke: '#CCCCCC', // 灰色边框
                strokeWidth: 1, // 细边框
                rx: 2, // 轻微圆角
                ry: 2,
                pointerEvents: 'auto'
            },
            label: {
                text: '容器',
                fill: '#666666', // 深灰色文字
                fontWeight: 'bold',
                fontSize: 14,
                refX: 10, // 左对齐
                refY: 10, // 顶部对齐
                textAnchor: 'start',
                textVerticalAnchor: 'top',
                pointerEvents: 'auto'
            }
        });

        // 标记为容器节点
        node.isContainer = true;
        node.isResizable = true; // 标记为可调整大小

        // 为容器节点添加锚点
        node.set('ports', { groups: portGroups });
        node.addPort({ group: 'bottom' }); // 添加底部锚点
    }



    // 添加节点和端口
    if (node) {
        // 如果不是容器节点，添加锚点
        if (!node.isContainer) {
            // 设置端口分组配置并添加底部锚点
            node.set('ports', { groups: portGroups }); // 使用 set 方法更新 ports 属性
            node.addPort({ group: 'bottom' }); // 添加底部锚点
        }

        // 添加节点到图表
        node.addTo(graph);
    }

    dragType = null; // 重置 dragType，拖拽结束
  });

  // 当拖拽离开画布时，重置 dragType
  paper.el.addEventListener('dragleave', e => {
    // 可以根据需要重置 dragType，或者在 drop/dragend 中重置
    // 这里不在 dragleave 重置，避免拖拽经过子元素时误触
  });

  // 监听拖拽结束事件，在拖拽源上触发
  palette.addEventListener('dragend', e => {
    dragType = null; // 确保拖拽结束时重置
  });

  // ========== 画布自适应 ========== //
  window.addEventListener('resize', () => {
    paper.setDimensions(window.innerWidth, window.innerHeight);
  });

  // ========== 删除连接线 ========== //
  // 存储当前选中的连接线
  let selectedLink = null;

  // 为连接线添加工具按钮
  paper.options.linkTools = {
    'remove': true  // 启用删除工具
  };

  // 创建连接线工具视图
  const linkTools = new joint.dia.ToolsView({
    tools: [
      new joint.linkTools.Remove({
        distance: '50%',  // 在连接线中间位置
        markup: [{
          tagName: 'circle',
          selector: 'button',
          attributes: {
            'r': 10,
            'fill': '#000',
            'cursor': 'pointer'
          }
        }, {
          tagName: 'path',
          selector: 'icon',
          attributes: {
            'd': 'M -4 -4 L 4 4 M -4 4 L 4 -4',
            'stroke': '#fff',
            'stroke-width': 2
          }
        }]
      })
    ]
  });

  // 点击连接线时选中它并显示删除工具
  paper.on('link:pointerclick', function(linkView, evt) {
    // 阻止默认的双击编辑行为
    evt.stopPropagation();

    console.log('Link clicked:', linkView.model.id);

    // 如果按住Ctrl键点击，则直接删除连接线
    if (evt.ctrlKey || evt.metaKey) {
      linkView.model.remove();
      selectedLink = null;
      return;
    }

    // 如果点击的是当前选中的连接线，取消选中
    if (selectedLink === linkView.model) {
      // 取消选中
      selectedLink.attr('line/stroke', '#333');
      selectedLink.attr('line/strokeWidth', 2);
      selectedLink = null;

      // 移除工具
      linkView.removeTools();
      return;
    }

    // 如果之前有选中的连接线，取消它的选中状态
    if (selectedLink) {
      selectedLink.attr('line/stroke', '#333');
      selectedLink.attr('line/strokeWidth', 2);

      // 移除之前连接线的工具
      const prevLinkView = paper.findViewByModel(selectedLink);
      if (prevLinkView) {
        prevLinkView.removeTools();
      }
    }

    // 选中当前连接线
    selectedLink = linkView.model;
    selectedLink.attr('line/stroke', '#ff4081');
    selectedLink.attr('line/strokeWidth', 3);

    // 显示工具
    linkView.addTools(linkTools);
  });

  // 点击空白处取消选中
  paper.on('blank:pointerclick', function() {
    if (selectedLink) {
      // 取消选中状态
      selectedLink.attr('line/stroke', '#333');
      selectedLink.attr('line/strokeWidth', 2);

      // 移除工具
      const linkView = paper.findViewByModel(selectedLink);
      if (linkView) {
        linkView.removeTools();
      }

      selectedLink = null;
    }
  });

  // 监听键盘事件
  document.addEventListener('keydown', function(evt) {
    if ((evt.key === 'Delete' || evt.key === 'Backspace') && selectedLink) {
      selectedLink.remove();
      selectedLink = null;
    }
  });

  // 添加连接线悬停提示样式
  const customStyles = document.createElement('style');
  customStyles.innerHTML = `
    /* 连接线样式 */
    .joint-link {
      cursor: pointer;
    }
    .joint-link:hover {
      stroke-width: 3px;
    }

    /* 连接线删除工具样式 */
    .joint-tool-remove circle {
      fill: black;
      stroke: none;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .joint-tool-remove path {
      stroke: white;
      stroke-width: 2;
      pointer-events: none;
    }
    .joint-tool-remove:hover circle {
      transform: scale(1.2);
    }

    /* 节点删除图标样式 */
    .node-delete-icon {
      position: absolute;
      border-radius: 50%;
      background-color: black;
      box-shadow: 0 0 5px rgba(0,0,0,0.5);
      cursor: pointer;
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: transform 0.2s ease;
      pointer-events: all !important;
    }
    .node-delete-icon:hover {
      transform: scale(1.2) !important;
    }

    /* 确保删除图标在最上层 */
    .joint-tools {
      z-index: 10000;
    }

    /* 容器节点样式 */
    .joint-element.container {
      cursor: move;
    }

    /* 容器节点悬停效果 */
    .joint-element.container:hover rect {
      stroke-width: 1px;
      stroke: #999999;
    }

    /* 容器节点调整大小时的样式 */
    .resize-handle {
      position: absolute;
      width: 8px;
      height: 8px;
      background-color: #FFFFFF;
      border: 1px solid #333333;
      z-index: 10000;
      box-shadow: 0 0 3px rgba(0,0,0,0.3);
      transition: transform 0.1s ease;
    }

    .resize-handle:hover {
      transform: scale(1.2) !important;
      background-color: #EEEEEE;
    }

    .resize-handle.nw {
      cursor: nwse-resize;
    }

    .resize-handle.se {
      cursor: nwse-resize;
    }

    .resize-handle.n {
      cursor: ns-resize;
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
    }

    .resize-handle.e {
      cursor: ew-resize;
      top: 50%;
      right: -4px;
      transform: translateY(-50%);
    }

    .resize-handle.s {
      cursor: ns-resize;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
    }

    .resize-handle.w {
      cursor: ew-resize;
      top: 50%;
      left: -4px;
      transform: translateY(-50%);
    }

    .resize-handle.nw {
      cursor: nwse-resize;
      top: -4px;
      left: -4px;
    }

    .resize-handle.ne {
      cursor: nesw-resize;
      top: -4px;
      right: -4px;
    }

    .resize-handle.se {
      cursor: nwse-resize;
      bottom: -4px;
      right: -4px;
    }

    .resize-handle.sw {
      cursor: nesw-resize;
      bottom: -4px;
      left: -4px;
    }

    /* 锚点样式 */
    .joint-port {
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: auto !important;
    }

    .joint-element:hover .joint-port {
      opacity: 1;
    }

    .joint-port circle {
      fill: #fff;
      stroke: #333;
      stroke-width: 1;
      r: 4;
      pointer-events: auto !important;
    }

    .joint-port:hover circle {
      fill: #f5f5f5;
      stroke: #1976d2;
      r: 5;
    }

    /* 确保所有元素可交互 */
    .joint-element {
      pointer-events: auto !important;
    }

    /* 确保所有SVG元素可见 */
    svg.joint-paper > g {
      pointer-events: auto !important;
    }

    /* 确保所有元素有正确的z-index */
    .joint-cell {
      z-index: auto !important;
    }

    /* 确保容器内的节点可见 */
    .joint-element.joint-type-standard-rectangle {
      pointer-events: auto !important;
    }

    /* 确保锚点在最上层 */
    .joint-port {
      z-index: 1000 !important;
    }

    /* 确保删除图标在最上层 */
    .node-delete-icon {
      z-index: 2000 !important;
    }
  `;
  document.head.appendChild(customStyles);

  // ========== 容器节点大小调整功能 ========== //
  // 存储当前正在调整大小的容器节点和调整方向
  let resizingContainer = null;
  let resizeDirection = null;
  let resizeHandles = [];
  let initialSize = null;
  let initialPosition = null;
  let initialMousePosition = null;

  // 创建调整大小的句柄
  function createResizeHandles(containerView) {
    // 移除旧的调整句柄
    removeResizeHandles();

    const container = containerView.model;
    if (!container.isResizable) return;

    const position = container.position();
    const size = container.size();
    const paperRect = paper.el.getBoundingClientRect();

    // 只创建左上角和右下角的调整大小句柄
    const directions = ['nw', 'se'];

    directions.forEach(direction => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${direction}`;
      handle.setAttribute('data-direction', direction);

      // 设置句柄位置
      const handleRect = calculateHandlePosition(direction, position, size, paperRect);

      // 获取句柄大小
      const handleSize = 8; // 句柄大小为8px

      // 调整位置，使句柄中心点与容器角重叠
      handle.style.left = `${handleRect.left - handleSize/2}px`;
      handle.style.top = `${handleRect.top - handleSize/2}px`;

      // 添加鼠标进入事件，防止句柄消失
      handle.addEventListener('mouseenter', function(evt) {
        handle._isMouseOver = true;
      });

      // 添加鼠标离开事件
      handle.addEventListener('mouseleave', function(evt) {
        handle._isMouseOver = false;
      });

      // 添加鼠标按下事件
      handle.addEventListener('mousedown', function(evt) {
        evt.stopPropagation();

        // 开始调整大小
        resizingContainer = container;
        resizeDirection = direction;
        initialSize = { width: size.width, height: size.height };
        initialPosition = { x: position.x, y: position.y };
        initialMousePosition = { x: evt.clientX, y: evt.clientY };

        // 添加鼠标移动和松开事件
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
      });

      // 将句柄添加到DOM
      paper.el.appendChild(handle);
      resizeHandles.push(handle);
    });
  }

  // 计算句柄位置
  function calculateHandlePosition(direction, position, size, paperRect) {
    // 将模型坐标转换为屏幕坐标
    const svgPoint = paper.svg.createSVGPoint();

    let x, y;

    switch(direction) {
      case 'n':
        x = position.x + size.width / 2;
        y = position.y;
        break;
      case 'e':
        x = position.x + size.width;
        y = position.y + size.height / 2;
        break;
      case 's':
        x = position.x + size.width / 2;
        y = position.y + size.height;
        break;
      case 'w':
        x = position.x;
        y = position.y + size.height / 2;
        break;
      case 'nw':
        // 左上角，使图标中心点与容器角重叠
        x = position.x;
        y = position.y;
        break;
      case 'ne':
        x = position.x + size.width;
        y = position.y;
        break;
      case 'se':
        // 右下角，使图标中心点与容器角重叠
        x = position.x + size.width;
        y = position.y + size.height;
        break;
      case 'sw':
        x = position.x;
        y = position.y + size.height;
        break;
    }

    // 确保坐标有效
    if (x === undefined || y === undefined) {
      console.error('Invalid coordinates for resize handle:', direction, position, size);
      return { left: 0, top: 0 };
    }

    svgPoint.x = x;
    svgPoint.y = y;

    const screenPoint = svgPoint.matrixTransform(paper.svg.getScreenCTM());

    return {
      left: screenPoint.x - paperRect.left,
      top: screenPoint.y - paperRect.top
    };
  }

  // 处理调整大小
  function handleResize(evt) {
    if (!resizingContainer) return;

    const dx = evt.clientX - initialMousePosition.x;
    const dy = evt.clientY - initialMousePosition.y;

    // 计算新的大小和位置
    let newWidth = initialSize.width;
    let newHeight = initialSize.height;
    let newX = initialPosition.x;
    let newY = initialPosition.y;

    // 根据调整方向更新大小和位置
    if (resizeDirection.includes('e')) {
      newWidth = Math.max(100, initialSize.width + dx);
    }
    if (resizeDirection.includes('w')) {
      const widthChange = Math.min(initialSize.width - 100, dx);
      newWidth = initialSize.width - widthChange;
      newX = initialPosition.x + widthChange;
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.max(80, initialSize.height + dy);
    }
    if (resizeDirection.includes('n')) {
      const heightChange = Math.min(initialSize.height - 80, dy);
      newHeight = initialSize.height - heightChange;
      newY = initialPosition.y + heightChange;
    }

    // 更新容器大小和位置
    resizingContainer.resize(newWidth, newHeight);
    resizingContainer.position(newX, newY);

    // 更新调整句柄位置
    updateResizeHandles();
  }

  // 停止调整大小
  function stopResize() {
    resizingContainer = null;
    resizeDirection = null;
    initialSize = null;
    initialPosition = null;
    initialMousePosition = null;

    // 移除事件监听器
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  }

  // 更新调整句柄位置
  function updateResizeHandles() {
    if (!resizingContainer) return;

    const containerView = paper.findViewByModel(resizingContainer);
    if (!containerView) return;

    // 重新创建调整句柄
    createResizeHandles(containerView);
  }

  // 移除调整句柄
  function removeResizeHandles() {
    resizeHandles.forEach(handle => {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    });
    resizeHandles = [];
  }

  // 这部分代码将被删除，因为我们会合并到下面的鼠标事件处理程序中

  // ========== 节点删除功能 ========== //
  // 使用更简单的方法实现节点删除功能
  // 存储当前悬停的节点和删除图标
  let hoveredElement = null;
  let nodeDeleteIcon = null;
  let hideIconTimeout = null; // 用于延迟隐藏图标的定时器

  // 创建删除图标的函数
  function createNodeDeleteIcon(elementView) {
    // 移除旧的图标（如果存在）
    removeNodeDeleteIcon();

    // 获取节点的位置和大小
    const element = elementView.model;
    const position = element.position();
    const size = element.size();

    // 创建一个DOM元素作为删除图标
    const iconSize = 16;
    const iconElement = document.createElement('div');
    iconElement.className = 'node-delete-icon';
    iconElement.style.position = 'fixed'; // 使用fixed定位，避免滚动问题
    iconElement.style.width = `${iconSize}px`;
    iconElement.style.height = `${iconSize}px`;
    iconElement.style.borderRadius = '50%';
    iconElement.style.backgroundColor = 'black';
    iconElement.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
    iconElement.style.cursor = 'pointer';
    iconElement.style.zIndex = '10000';
    iconElement.style.display = 'flex';
    iconElement.style.justifyContent = 'center';
    iconElement.style.alignItems = 'center';
    iconElement.style.transition = 'transform 0.2s ease';
    iconElement.style.pointerEvents = 'auto'; // 确保图标可点击

    // 添加X形状
    iconElement.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10" style="overflow:visible;">
        <path d="M2 2 L8 8 M2 8 L8 2" stroke="white" stroke-width="2"/>
      </svg>
    `;

    // 添加悬停效果和鼠标状态跟踪
    iconElement.onmouseover = function() {
      this.style.transform = 'scale(1.2)';
      this._isMouseOver = true; // 标记鼠标在图标上

      // 清除任何现有的延迟隐藏定时器
      if (hideIconTimeout) {
        clearTimeout(hideIconTimeout);
        hideIconTimeout = null;
      }
    };
    iconElement.onmouseout = function() {
      this.style.transform = 'scale(1)';
      this._isMouseOver = false; // 标记鼠标不在图标上

      // 如果鼠标不在节点上，延迟隐藏图标
      if (!hoveredElement) {
        delayHideNodeDeleteIcon();
      }
    };

    // 添加点击事件
    iconElement.onclick = function(evt) {
      evt.stopPropagation();
      if (hoveredElement) {
        console.log('删除节点:', hoveredElement.id, hoveredElement.get('type'));

        try {
          // 如果是容器节点，需要特殊处理
          if (hoveredElement.isContainer) {
            // 获取容器中的所有嵌套节点
            const embeddedCells = hoveredElement.getEmbeddedCells();

            if (embeddedCells.length > 0) {
              // 先解除所有嵌套关系
              embeddedCells.forEach(cell => {
                hoveredElement.unembed(cell);
              });

              // 然后删除容器节点
              graph.removeCells([hoveredElement]);
            } else {
              // 如果没有嵌套节点，直接删除
              graph.removeCells([hoveredElement]);
            }
          } else {
            // 对于普通节点，直接删除
            graph.removeCells([hoveredElement]);
          }
        } catch (error) {
          console.error('删除节点时出错:', error);
          // 备用方法
          try {
            hoveredElement.remove();
          } catch (e) {
            console.error('备用删除方法也失败:', e);
          }
        }

        hoveredElement = null;
        removeNodeDeleteIcon();
      }
    };

    // 获取paper元素的位置
    const paperRect = paper.el.getBoundingClientRect();

    // 计算图标在页面中的位置（右上角，更靠近节点）
    let iconX, iconY;

    // 检查节点类型，为不同形状的节点调整位置
    const nodeType = element.get('type');

    if (nodeType === 'standard.Polygon') {
      // 对于菱形节点（决策节点），调整位置
      iconX = position.x + size.width * 0.7; // 向左移动，更靠近节点中心
      iconY = position.y + size.height * 0.3; // 向下移动，更靠近节点中心
    } else {
      // 对于其他节点，使用默认位置
      iconX = position.x + size.width - 5; // 向左移动，更靠近节点
      iconY = position.y + 5; // 向下移动，更靠近节点
    }

    // 将SVG坐标转换为页面坐标
    const svgPoint = paper.svg.createSVGPoint();
    svgPoint.x = iconX;
    svgPoint.y = iconY;
    const screenPoint = svgPoint.matrixTransform(paper.svg.getScreenCTM());

    // 设置图标位置
    iconElement.style.left = `${screenPoint.x - iconSize/2}px`;
    iconElement.style.top = `${screenPoint.y - iconSize/2}px`;

    // 将图标添加到body中
    document.body.appendChild(iconElement);

    // 保存图标引用
    nodeDeleteIcon = iconElement;

    return nodeDeleteIcon;
  }

  // 移除删除图标的函数
  function removeNodeDeleteIcon() {
    // 清除任何现有的延迟隐藏定时器
    if (hideIconTimeout) {
      clearTimeout(hideIconTimeout);
      hideIconTimeout = null;
    }

    if (nodeDeleteIcon && nodeDeleteIcon.parentNode) {
      nodeDeleteIcon.parentNode.removeChild(nodeDeleteIcon);
      nodeDeleteIcon = null;
    }
  }

  // 延迟隐藏删除图标的函数
  function delayHideNodeDeleteIcon() {
    // 清除任何现有的延迟隐藏定时器
    if (hideIconTimeout) {
      clearTimeout(hideIconTimeout);
    }

    // 设置新的延迟隐藏定时器
    hideIconTimeout = setTimeout(function() {
      // 检查鼠标是否在删除图标上
      if (nodeDeleteIcon && nodeDeleteIcon._isMouseOver) {
        return; // 如果鼠标在删除图标上，不隐藏
      }

      removeNodeDeleteIcon();
      hideIconTimeout = null;
    }, 300); // 300毫秒延迟
  }

  // 鼠标进入节点时显示删除图标和调整句柄
  paper.on('element:mouseover', function(elementView, evt) {
    const element = elementView.model;

    // 保存当前悬停的节点
    hoveredElement = element;

    // 创建并显示删除图标
    createNodeDeleteIcon(elementView);

    // 如果是容器节点，显示调整大小的句柄
    if (element.isContainer && element.isResizable) {
      createResizeHandles(elementView);
    }

    // 确保锚点可见
    try {
      // 显示端口（锚点）
      const ports = elementView.el.querySelectorAll('.joint-port');
      if (ports && ports.length > 0) {
        ports.forEach(port => {
          port.style.opacity = 1;
          port.style.visibility = 'visible';
        });
      }

      // 另一种方式确保锚点可见
      element.getPorts().forEach(port => {
        element.portProp(port.id, 'attrs/circle/opacity', 1);
      });

      // 如果是容器节点，确保内部节点和连接线可见
      if (element.isContainer) {
        // 获取容器内的所有节点
        const embeds = element.getEmbeddedCells();
        const embeddedElements = embeds.filter(cell => !cell.isLink());

        // 获取所有相关连接线（包括内部节点之间的连接线）
        const relatedLinks = getAllRelatedLinks(element);

        // 先将容器节点移到前面
        element.toFront({ deep: false });

        // 然后将嵌套节点移到前面
        if (embeddedElements.length > 0) {
          embeddedElements.forEach(embed => {
            embed.toFront();
          });
        }

        // 最后将连接线移到最前面
        if (relatedLinks.length > 0) {
          relatedLinks.forEach(link => {
            link.toFront();
          });
        }

        // 延迟执行，再次确保连接线可见
        setTimeout(() => {
          if (relatedLinks.length > 0) {
            relatedLinks.forEach(link => {
              link.toFront();
            });
          }
        }, 50);
      } else {
        // 确保节点在最上层，这样锚点和删除图标才能正确显示
        element.toFront();
      }
    } catch (error) {
      console.log('Error showing ports:', error);
    }
  });

  // 鼠标离开节点时处理
  paper.on('element:mouseout', function(elementView, evt) {
    const element = elementView.model;

    // 检查鼠标是否真的离开了节点（不是移动到子元素上）
    const relatedTarget = evt.relatedTarget || evt.toElement;
    if (elementView.el.contains(relatedTarget)) {
      return; // 如果鼠标仍在节点内部，不做任何处理
    }

    // 检查鼠标是否移动到了删除图标上
    if (nodeDeleteIcon && (relatedTarget === nodeDeleteIcon || nodeDeleteIcon.contains(relatedTarget))) {
      return; // 如果鼠标移动到了删除图标上，不做任何处理
    }

    // 如果是容器节点
    if (element.isContainer && element.isResizable) {
      // 如果正在调整大小，不移除句柄
      if (resizingContainer) return;

      // 检查鼠标是否移动到了调整句柄上
      if (resizeHandles.some(handle => handle === relatedTarget || handle.contains(relatedTarget))) {
        return; // 如果鼠标移动到了调整句柄上，不做任何处理
      }

      // 检查是否有任何调整句柄处于鼠标悬停状态
      if (resizeHandles.some(handle => handle._isMouseOver)) {
        return; // 如果有任何调整句柄处于鼠标悬停状态，不移除句柄
      }

      // 延迟隐藏调整大小的句柄，给用户时间移动到句柄上
      setTimeout(() => {
        // 再次检查是否有任何调整句柄处于鼠标悬停状态
        if (resizeHandles.some(handle => handle._isMouseOver)) {
          return; // 如果有任何调整句柄处于鼠标悬停状态，不移除句柄
        }

        // 隐藏调整大小的句柄
        removeResizeHandles();
      }, 100);
    }

    // 如果离开的是当前悬停的节点，隐藏删除图标和锚点
    if (hoveredElement === element) {
      try {
        // 隐藏端口（锚点）
        const ports = elementView.el.querySelectorAll('.joint-port');
        if (ports && ports.length > 0) {
          ports.forEach(port => {
            port.style.opacity = 0;
            port.style.visibility = 'hidden';
          });
        }

        // 另一种方式确保锚点隐藏
        element.getPorts().forEach(port => {
          element.portProp(port.id, 'attrs/circle/opacity', 0);
        });
      } catch (error) {
        console.log('Error hiding ports:', error);
      }

      // 如果是容器节点，确保内部节点和连接线仍然可见
      if (element.isContainer) {
        // 获取容器内的所有节点
        const embeds = element.getEmbeddedCells();
        const embeddedElements = embeds.filter(cell => !cell.isLink());

        // 获取所有相关连接线（包括内部节点之间的连接线）
        const relatedLinks = getAllRelatedLinks(element);

        // 先将容器节点移到前面
        element.toFront({ deep: false });

        // 然后将嵌套节点移到前面
        if (embeddedElements.length > 0) {
          embeddedElements.forEach(embed => {
            embed.toFront();
          });
        }

        // 最后将连接线移到最前面
        if (relatedLinks.length > 0) {
          relatedLinks.forEach(link => {
            link.toFront();
          });
        }

        // 延迟执行，再次确保连接线可见
        setTimeout(() => {
          if (relatedLinks.length > 0) {
            relatedLinks.forEach(link => {
              link.toFront();
            });
          }
        }, 50);
      }

      hoveredElement = null;
      delayHideNodeDeleteIcon(); // 使用延迟隐藏而不是立即隐藏
    }
  });

  // 当节点移动时，更新删除图标位置
  paper.on('element:pointermove', function(elementView, evt, x, y) {
    if (hoveredElement === elementView.model && nodeDeleteIcon) {
      // 使用requestAnimationFrame来优化性能
      requestAnimationFrame(function() {
        createNodeDeleteIcon(elementView);
      });
    }
  });

  // 当画布缩放或平移时，更新删除图标位置
  paper.on('scale translate', function() {
    if (hoveredElement && nodeDeleteIcon) {
      const elementView = paper.findViewByModel(hoveredElement);
      if (elementView) {
        requestAnimationFrame(function() {
          createNodeDeleteIcon(elementView);
        });
      }
    }
  });

  // 点击空白处取消选中
  paper.on('blank:pointerclick', function() {
    hoveredElement = null;
    removeNodeDeleteIcon();
  });

  // 监听键盘事件，按Delete或Backspace键删除选中的节点
  document.addEventListener('keydown', function(evt) {
    if ((evt.key === 'Delete' || evt.key === 'Backspace') && hoveredElement) {
      console.log('键盘删除节点:', hoveredElement.id, hoveredElement.get('type'));

      try {
        // 如果是容器节点，需要特殊处理
        if (hoveredElement.isContainer) {
          // 获取容器中的所有嵌套节点
          const embeddedCells = hoveredElement.getEmbeddedCells();

          if (embeddedCells.length > 0) {
            // 先解除所有嵌套关系
            embeddedCells.forEach(cell => {
              hoveredElement.unembed(cell);
            });

            // 然后删除容器节点
            graph.removeCells([hoveredElement]);
          } else {
            // 如果没有嵌套节点，直接删除
            graph.removeCells([hoveredElement]);
          }
        } else {
          // 对于普通节点，直接删除
          graph.removeCells([hoveredElement]);
        }
      } catch (error) {
        console.error('键盘删除节点时出错:', error);
        // 备用方法
        try {
          hoveredElement.remove();
        } catch (e) {
          console.error('键盘删除备用方法也失败:', e);
        }
      }

      hoveredElement = null;
      removeNodeDeleteIcon();
    }
  });

  // ========== 容器节点分组/嵌套 ========== //
  paper.on('element:pointerup', function(elementView, evt) {
    const el = elementView.model;

    // 容器节点本身不能被嵌套
    if (el.isContainer) {
      return;
    }

    // 检查节点类型，开始和结束节点不能被嵌套
    const nodeType = el.get('type');
    const isStartOrEnd = nodeType === 'standard.Circle' &&
                        (el.attr('label/text') === '开始' || el.attr('label/text') === '结束');

    if (isStartOrEnd) {
      // 如果是开始或结束节点，确保它们不在任何容器中
      const embeddingParent = el.getParentCell();
      if (embeddingParent) {
        embeddingParent.unembed(el);
      }
      return;
    }

    // 判断是否在某个容器内
    const containers = graph.getElements().filter(e => e.isContainer);
    for (const container of containers) {
      const bbox = container.getBBox();
      const elBBox = el.getBBox();
      // 判断节点中心是否在容器内
      const center = elBBox.center();
      if (
        center.x > bbox.x &&
        center.x < bbox.x + bbox.width &&
        center.y > bbox.y &&
        center.y < bbox.y + bbox.height
      ) {
        // 嵌套前，确保节点在容器上方显示
        el.toFront();

        // 嵌套
        container.embed(el);

        // 自动调整节点到容器内部
        const minX = bbox.x + 10; // 添加内边距
        const maxX = bbox.x + bbox.width - elBBox.width - 10;
        const minY = bbox.y + 30; // 顶部留出更多空间给标题
        const maxY = bbox.y + bbox.height - elBBox.height - 10;
        el.position(
          Math.max(minX, Math.min(elBBox.x, maxX)),
          Math.max(minY, Math.min(elBBox.y, maxY))
        );

        // 确保嵌套后节点仍然可见
        setTimeout(() => {
          el.toFront();
        }, 50);

        return;
      } else {
        // 如果之前嵌套过但现在不在容器内，取消嵌套
        if (container.getEmbeddedCells().includes(el)) {
          container.unembed(el);
          // 确保取消嵌套后节点仍然可见
          el.toFront();
        }
      }
    }
  });

  // 确保嵌套在容器中的节点和连接线始终可见
  graph.on('change:position', function(cell) {
    if (cell.isContainer) {
      // 当容器移动时，确保其中的节点和连接线保持可见
      const embeds = cell.getEmbeddedCells();
      const embeddedElements = embeds.filter(embed => !embed.isLink());

      // 获取所有相关连接线（包括内部节点之间的连接线）
      const relatedLinks = getAllRelatedLinks(cell);

      // 先将容器节点移到前面
      cell.toFront({ deep: false });

      // 然后将嵌套节点移到前面
      if (embeddedElements.length > 0) {
        embeddedElements.forEach(embed => {
          // 将嵌套节点移到前面
          embed.toFront();
        });
      }

      // 最后将连接线移到最前面
      if (relatedLinks.length > 0) {
        relatedLinks.forEach(link => {
          link.toFront();
        });
      }

      // 延迟执行，再次确保连接线可见
      setTimeout(() => {
        if (relatedLinks.length > 0) {
          relatedLinks.forEach(link => {
            link.toFront();
          });
        }
      }, 50);

      // 如果当前悬停的元素是这个容器，更新resize图标位置
      if (hoveredElement === cell) {
        const cellView = paper.findViewByModel(cell);
        if (cellView) {
          // 立即更新一次
          if (cell.isResizable) {
            removeResizeHandles();
            createResizeHandles(cellView);
          }

          // 更新删除图标
          if (nodeDeleteIcon) {
            createNodeDeleteIcon(cellView);
          }
        }
      }
    }
  });



  // 监听容器节点的点击事件，确保内部节点和连接线始终可见
  paper.on('element:pointerdown', function(elementView, evt) {
    const element = elementView.model;

    // 如果点击的是容器节点
    if (element.isContainer) {
      // 获取容器内的所有节点
      const embeds = element.getEmbeddedCells();
      const embeddedElements = embeds.filter(cell => !cell.isLink());

      // 获取所有相关连接线（包括内部节点之间的连接线）
      const relatedLinks = getAllRelatedLinks(element);

      // 立即执行一次，确保连接线可见
      // 先将容器节点移到前面
      element.toFront({ deep: false });

      // 然后将嵌套节点移到前面
      if (embeddedElements.length > 0) {
        embeddedElements.forEach(embed => {
          embed.toFront();
        });
      }

      // 最后将连接线移到最前面
      if (relatedLinks.length > 0) {
        relatedLinks.forEach(link => {
          link.toFront();
        });
      }

      // 延迟执行，再次确保在容器被选中后内部节点和连接线仍然可见
      setTimeout(() => {
        // 先将容器节点移到前面
        element.toFront({ deep: false });

        // 然后将嵌套节点移到前面
        if (embeddedElements.length > 0) {
          embeddedElements.forEach(embed => {
            embed.toFront();
          });
        }

        // 最后将连接线移到最前面
        if (relatedLinks.length > 0) {
          relatedLinks.forEach(link => {
            link.toFront();
          });
        }
      }, 50);
    }
  });

  // 监听容器节点的点击释放事件，再次确保内部节点和连接线可见
  paper.on('element:pointerup', function(elementView, evt) {
    const element = elementView.model;

    // 如果点击的是容器节点
    if (element.isContainer) {
      // 获取容器内的所有节点
      const embeds = element.getEmbeddedCells();
      const embeddedElements = embeds.filter(cell => !cell.isLink());

      // 获取所有相关连接线（包括内部节点之间的连接线）
      const relatedLinks = getAllRelatedLinks(element);

      // 先将容器节点移到前面
      element.toFront({ deep: false });

      // 然后将嵌套节点移到前面
      if (embeddedElements.length > 0) {
        embeddedElements.forEach(embed => {
          embed.toFront();
        });
      }

      // 最后将连接线移到最前面
      if (relatedLinks.length > 0) {
        relatedLinks.forEach(link => {
          link.toFront();
        });
      }

      // 延迟执行，再次确保连接线可见
      setTimeout(() => {
        if (relatedLinks.length > 0) {
          relatedLinks.forEach(link => {
            link.toFront();
          });
        }
      }, 100);
    }
  });

