/**
 * 全局类型定义文件
 */

// JointJS类型扩展
declare namespace joint {
  namespace shapes {
    namespace standard {
      class Element extends joint.dia.Element {
        isContainer?: boolean;
        isSwitch?: boolean;
        isResizable?: boolean;
      }
    }
  }
}

// 应用配置类型
interface AppConfig {
  canvas: {
    gridSize: number;
    background: string;
    minScale: number;
    maxScale: number;
    scaleStep: number;
    sidebarWidth: number;
  };
  nodes: {
    defaultSize: { width: number; height: number };
    colors: Record<string, string>;
    sizes: Record<string, { width: number; height: number }>;
  };
  ui: {
    minimapSize: { width: number; height: number };
    minimapScale: number;
    iconSize: number;
    resizeHandleSize: number;
    debounceDelay: number;
    hideIconDelay: number;
  };
  ports: {
    radius: number;
    hoverRadius: number;
    opacity: {
      hidden: number;
      visible: number;
    };
  };
}

// 端口组配置类型
interface PortGroupConfig {
  position: any;
  attrs: Record<string, any>;
  markup: Array<{
    tagName: string;
    selector: string;
    attributes: Record<string, any>;
  }>;
}

// 快捷键配置类型
type ShortcutAction = 'undo' | 'redo' | 'save' | 'selectAll' | 'deleteSelected' | 'clearSelection' | 
                     'zoomIn' | 'zoomOut' | 'resetZoom' | 'toggleMinimap' | 'panMode';

// 节点类型枚举
type NodeType = 'start' | 'end' | 'process' | 'decision' | 'switch' | 'container';

// 应用状态类型
interface AppState {
  hoveredElement: joint.dia.Element | null;
  selectedLink: joint.dia.Link | null;
  currentEditingNode: joint.dia.Element | null;
  isPanningMode: boolean;
  isPanning: boolean;
  lastClientX: number;
  lastClientY: number;
  zoomLevel: number;
  
  // 图标状态
  nodeDeleteIcon: HTMLElement | null;
  nodePropertyIcon: HTMLElement | null;
  hideIconTimeout: number | null;
  
  // 容器调整大小状态
  resizingContainer: joint.dia.Element | null;
  resizeDirection: string | null;
  resizeHandles: HTMLElement[];
  initialSize: { width: number; height: number } | null;
  initialPosition: { x: number; y: number } | null;
  initialMousePosition: { x: number; y: number } | null;
  
  // 拖拽状态
  dragType: NodeType | null;
  draggedElement: HTMLElement | null;
}

// 组件类型
interface AppComponents {
  sidebar: any | null;
  minimap: any | null;
  zoomToolbar: any | null;
  propertyPanel: any | null;
}

// 节点属性类型
interface NodeProperties {
  name: string;
  description: string;
  [key: string]: any;
}

// 验证结果类型
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// 坐标类型
interface Coordinates {
  x: number;
  y: number;
}

// 矩形类型
interface Rectangle extends Coordinates {
  width: number;
  height: number;
}

// 工作流统计类型
interface WorkflowStats {
  totalNodes: number;
  totalLinks: number;
  nodeTypes: Record<string, number>;
  isolatedNodes: number;
  startNodes: number;
  endNodes: number;
}

// Switch节点Case类型
interface SwitchCase {
  name: string;
  expression: string;
  isDefault?: boolean;
}

// 节点信息类型
interface NodeInfo {
  id: string;
  type: string;
  label: string;
  position: Coordinates;
  size: { width: number; height: number };
  properties: NodeProperties;
  isContainer: boolean;
  isSwitch: boolean;
  ports: any[];
  connections: number;
}

// 事件监听器类型
interface EventListenerDef {
  element: Element | null; // Can be null for general events
  event: string;
  handler: Function;
  options?: any;
}

interface EventListener {
  element: Element;
  event: string;
  handler: Function;
  options?: any;
}

// EventManager class declaration for type checking
declare class EventManager {
  constructor();
  addEventListener(element: Element, event: string, handler: Function, options?: any): void;
  addEventListener(eventName: string, handler: Function): void; // Overload for general events
  removeEventListener(element: Element, event: string, handler: Function): void;
  removeEventListener(eventName: string, handler: Function): void; // Overload for general events
  removeAllListeners(): void;
  getListenerCount(): number;
  emit(eventName: string, data?: any): void;
}

// 全局API类型
interface WorkflowAPI {
  saveWorkflow(): void;
  loadWorkflow(file: File): Promise<any>;
  validateWorkflow(): ValidationResult;
  getWorkflowStats(): WorkflowStats | null;
  clearWorkflow(): void;
  exportWorkflowImage(): void;
  zoomCanvas(delta: number): void;
  resetZoom(): void;
  togglePanMode(): void;
}

// 全局变量声明
declare const CONFIG: AppConfig;
declare const PORT_GROUPS: Record<string, PortGroupConfig>;
declare const SHORTCUTS: Record<string, ShortcutAction>;
declare const NODE_TYPES: Record<string, NodeType>;

declare const WorkflowAPI: WorkflowAPI;

// 工具函数类型
declare function debounce(func: Function, wait: number): Function;
declare function throttle(func: Function, limit: number): Function;

// 类声明
declare class ErrorHandler {
  static handle(error: Error, context?: string): void;
  static safeExecute<T>(fn: () => T | Promise<T>, context?: string): Promise<T | null>;
  static showUserError(message: string): void;
}

declare class DOMUtils {
  static createElement(tagName: string, attributes?: Record<string, any>, textContent?: string): HTMLElement;
  static safeRemove(element: HTMLElement): void;
  static batchRemove(elements: NodeList | HTMLElement[]): void;
}

declare class CoordinateUtils {
  static svgToScreen(paper: joint.dia.Paper, x: number, y: number): Coordinates;
  static screenToSvg(paper: joint.dia.Paper, x: number, y: number): Coordinates;
  static distance(point1: Coordinates, point2: Coordinates): number;
  static isPointInRect(point: Coordinates, rect: Rectangle): boolean;
}

declare class ValidationUtils {
  static validateNode(nodeData: any): ValidationResult;
  static validateWorkflow(graph: joint.dia.Graph): ValidationResult;
}

declare class WorkflowApp {
  graph: joint.dia.Graph;
  paper: joint.dia.Paper;
  eventManager: EventManager;
  state: AppState;
  components: AppComponents;
  
  constructor();
  init(): Promise<void>;
  destroy(): void;
  clearSelection(): void;
}

declare class NodeManager {
  constructor(app: WorkflowApp);
  createNode(type: NodeType, x: number, y: number, options?: any): joint.dia.Element | null;
  deleteNode(node: joint.dia.Element): boolean | null;
  updateSwitchPorts(node: joint.dia.Element, cases: SwitchCase[]): void;
  validateNode(node: joint.dia.Element): ValidationResult;
  cloneNode(node: joint.dia.Element, offsetX?: number, offsetY?: number): joint.dia.Element | null;
  getNodeInfo(node: joint.dia.Element): NodeInfo;
}

declare class Sidebar {
  constructor(app: WorkflowApp);
  init(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  destroy(): void;
}
