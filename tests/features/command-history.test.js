/**
 * 命令历史管理器测试
 */

// Mock JointJS
global.joint = {
  dia: {
    Graph: jest.fn(() => ({
      getCell: jest.fn(),
      getElements: jest.fn(() => []),
      getConnectedLinks: jest.fn(() => [])
    })),
    Element: jest.fn(),
    Link: jest.fn()
  },
  shapes: {
    standard: {
      Circle: jest.fn(),
      Rectangle: jest.fn(),
      Polygon: jest.fn(),
      Link: jest.fn()
    }
  }
};

// Mock CONFIG
global.CONFIG = {
  history: {
    maxSize: 50,
    enableAutoSave: true
  },
  clipboard: {
    pasteOffset: { x: 30, y: 30 },
    maxCopyCount: 100
  },
  nodes: {
    sizes: {
      start: { width: 80, height: 80 },
      process: { width: 120, height: 60 }
    },
    colors: {
      start: '#4CAF50',
      startStroke: '#388E3C',
      process: '#2196F3',
      processStroke: '#1976D2'
    }
  }
};

global.NODE_TYPES = {
  START: 'start',
  END: 'end',
  PROCESS: 'process',
  DECISION: 'decision',
  SWITCH: 'switch',
  CONTAINER: 'container',
  GROUP_SETTING: 'groupSetting'
};

// Mock ErrorHandler
global.ErrorHandler = {
  handle: jest.fn()
};

// Mock BaseCommand class for testing
global.BaseCommand = class BaseCommand {
  constructor(app, description = '') {
    this.app = app;
    this.description = description;
    this.timestamp = Date.now();
  }

  execute() {
    throw new Error('子类必须实现 execute 方法');
  }

  undo() {
    throw new Error('子类必须实现 undo 方法');
  }

  getDescription() {
    return this.description || this.constructor.name;
  }

  getTimestamp() {
    return this.timestamp;
  }
};

// Import the classes to test
require('../../js/features/command-history.js');
require('../../js/features/commands/node-commands.js');
require('../../js/features/clipboard-manager.js');

describe('CommandHistory', () => {
  let app, commandHistory;

  beforeEach(() => {
    app = {
      graph: new joint.dia.Graph(),
      state: {
        selectedElement: null,
        hoveredElement: null
      },
      components: {
        propertyPanel: {
          currentElement: null,
          hide: jest.fn()
        }
      },
      clearSelection: jest.fn()
    };
    commandHistory = new CommandHistory(app);
  });

  test('should initialize with empty stacks', () => {
    expect(commandHistory.canUndo()).toBe(false);
    expect(commandHistory.canRedo()).toBe(false);
    expect(commandHistory.getStatus().undoCount).toBe(0);
    expect(commandHistory.getStatus().redoCount).toBe(0);
  });

  test('should execute command and add to undo stack', () => {
    const mockCommand = {
      execute: jest.fn(() => 'result'),
      undo: jest.fn(),
      constructor: { name: 'MockCommand' }
    };

    const result = commandHistory.executeCommand(mockCommand);

    expect(mockCommand.execute).toHaveBeenCalled();
    expect(result).toBe('result');
    expect(commandHistory.canUndo()).toBe(true);
    expect(commandHistory.canRedo()).toBe(false);
  });

  test('should undo command and move to redo stack', () => {
    const mockCommand = {
      execute: jest.fn(() => 'result'),
      undo: jest.fn(),
      constructor: { name: 'MockCommand' }
    };

    commandHistory.executeCommand(mockCommand);
    const undoResult = commandHistory.undo();

    expect(undoResult).toBe(true);
    expect(mockCommand.undo).toHaveBeenCalled();
    expect(commandHistory.canUndo()).toBe(false);
    expect(commandHistory.canRedo()).toBe(true);
  });

  test('should redo command and move back to undo stack', () => {
    const mockCommand = {
      execute: jest.fn(() => 'result'),
      undo: jest.fn(),
      constructor: { name: 'MockCommand' }
    };

    commandHistory.executeCommand(mockCommand);
    commandHistory.undo();
    const redoResult = commandHistory.redo();

    expect(redoResult).toBe(true);
    expect(mockCommand.execute).toHaveBeenCalledTimes(2);
    expect(commandHistory.canUndo()).toBe(true);
    expect(commandHistory.canRedo()).toBe(false);
  });

  test('should clear redo stack when new command is executed', () => {
    const mockCommand1 = {
      execute: jest.fn(() => 'result1'),
      undo: jest.fn(),
      constructor: { name: 'MockCommand1' }
    };
    const mockCommand2 = {
      execute: jest.fn(() => 'result2'),
      undo: jest.fn(),
      constructor: { name: 'MockCommand2' }
    };

    commandHistory.executeCommand(mockCommand1);
    commandHistory.undo();
    expect(commandHistory.canRedo()).toBe(true);

    commandHistory.executeCommand(mockCommand2);
    expect(commandHistory.canRedo()).toBe(false);
  });

  test('should limit history size', () => {
    const maxSize = commandHistory.maxSize;

    // Execute more commands than the limit
    for (let i = 0; i < maxSize + 5; i++) {
      const mockCommand = {
        execute: jest.fn(() => `result${i}`),
        undo: jest.fn(),
        constructor: { name: `MockCommand${i}` }
      };
      commandHistory.executeCommand(mockCommand);
    }

    expect(commandHistory.getStatus().undoCount).toBe(maxSize);
  });
});

describe('ClipboardManager', () => {
  let app, clipboardManager, mockNode;

  beforeEach(() => {
    mockNode = {
      id: 'test-node-1',
      isElement: () => true,
      get: jest.fn((key) => {
        if (key === 'type') return 'standard.Rectangle';
        return null;
      }),
      attr: jest.fn((path) => {
        if (path === 'label/text') return 'Test Node';
        return {};
      }),
      position: jest.fn(() => ({ x: 100, y: 100 })),
      size: jest.fn(() => ({ width: 120, height: 60 })),
      prop: jest.fn((key) => {
        if (key === 'properties') return { name: 'Test Node' };
        return null;
      }),
      getPorts: jest.fn(() => []),
      isContainer: false,
      isSwitch: false
    };

    app = {
      graph: new joint.dia.Graph(),
      state: {
        selectedElement: mockNode,
        hoveredElement: null
      },
      commandHistory: {
        executeCommand: jest.fn()
      }
    };
    clipboardManager = new ClipboardManager(app);
  });

  test('should initialize with empty clipboard', () => {
    expect(clipboardManager.isEmpty()).toBe(true);
    expect(clipboardManager.getStatus().nodeCount).toBe(0);
  });

  test('should copy selected node', () => {
    const result = clipboardManager.copy();

    expect(result).toBe(true);
    expect(clipboardManager.isEmpty()).toBe(false);
    expect(clipboardManager.getStatus().nodeCount).toBe(1);
  });

  test('should not copy start/end nodes', () => {
    const startNode = {
      ...mockNode,
      get: jest.fn((key) => {
        if (key === 'type') return 'standard.Circle';
        return null;
      }),
      attr: jest.fn((path) => {
        if (path === 'label/text') return '开始';
        return {};
      })
    };

    app.state.selectedElement = startNode;
    const result = clipboardManager.copy();

    expect(result).toBe(false);
    expect(clipboardManager.isEmpty()).toBe(true);
  });

  test('should clear clipboard', () => {
    clipboardManager.copy();
    expect(clipboardManager.isEmpty()).toBe(false);

    clipboardManager.clear();
    expect(clipboardManager.isEmpty()).toBe(true);
    expect(clipboardManager.getStatus().pasteCount).toBe(0);
  });

  test('should return false when pasting from empty clipboard', () => {
    const result = clipboardManager.paste();
    expect(result).toBe(false);
  });
});

describe('CreateNodeCommand', () => {
  let app, command;

  beforeEach(() => {
    app = {
      graph: new joint.dia.Graph(),
      state: {},
      components: {}
    };

    // Mock NodeManager
    global.NodeManager = jest.fn(() => ({
      createNodeDirect: jest.fn(() => ({
        id: 'new-node-1',
        position: () => ({ x: 100, y: 100 }),
        size: () => ({ width: 120, height: 60 }),
        get: () => 'standard.Rectangle',
        attr: () => ({}),
        prop: () => ({}),
        isContainer: false,
        isSwitch: false
      }))
    }));

    command = new CreateNodeCommand(app, 'process', 100, 100);
  });

  test('should execute and create node', () => {
    const result = command.execute();

    expect(result).toBeDefined();
    expect(result.id).toBe('new-node-1');
    expect(command.nodeId).toBe('new-node-1');
  });

  test('should undo and remove node', () => {
    command.execute();

    // Mock the node removal
    app.graph.getCell = jest.fn(() => ({
      remove: jest.fn()
    }));

    command.undo();

    expect(app.graph.getCell).toHaveBeenCalledWith('new-node-1');
  });
});
