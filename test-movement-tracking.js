/**
 * Test script to verify node movement tracking functionality
 * Run this in the browser console after loading the application
 */

function testMovementTracking() {
  console.log('=== Testing Node Movement Tracking ===');
  
  // Wait for the application to be fully loaded
  if (typeof app === 'undefined' || !app.graph) {
    console.error('Application not loaded yet. Please wait and try again.');
    return;
  }
  
  // Clear the canvas first
  app.graph.clear();
  console.log('✓ Canvas cleared');
  
  // Test 1: Create test nodes
  console.log('\n1. Creating test nodes...');
  
  try {
    // Create test nodes
    const groupingNode = app.nodeManager.createNode('Grouping', 100, 100, { skipHistory: true });
    const decisionNode = app.nodeManager.createNode('Decision', 300, 100, { skipHistory: true });
    const switchNode = app.nodeManager.createNode('Switch', 500, 100, { skipHistory: true });
    
    console.log('✓ Test nodes created:', groupingNode.id, decisionNode.id, switchNode.id);
    
    // Store initial positions
    const initialPositions = {
      grouping: groupingNode.position(),
      decision: decisionNode.position(),
      switch: switchNode.position()
    };
    
    console.log('✓ Initial positions recorded:', initialPositions);
    
    // Test 2: Check command history status
    console.log('\n2. Checking command history...');
    
    if (app.commandHistory) {
      const status = app.commandHistory.getStatus();
      console.log('✓ Command history available:', status);
    } else {
      console.error('❌ Command history not available');
      return;
    }
    
    // Test 3: Simulate node movement (programmatic)
    console.log('\n3. Testing programmatic node movement...');
    
    // Move nodes to new positions
    const newPositions = {
      grouping: { x: 150, y: 200 },
      decision: { x: 350, y: 200 },
      switch: { x: 550, y: 200 }
    };
    
    groupingNode.position(newPositions.grouping.x, newPositions.grouping.y);
    decisionNode.position(newPositions.decision.x, newPositions.decision.y);
    switchNode.position(newPositions.switch.x, newPositions.switch.y);
    
    console.log('✓ Nodes moved programmatically to:', newPositions);
    
    // Test 4: Check if MoveNodeCommand is available
    console.log('\n4. Checking MoveNodeCommand availability...');
    
    if (typeof MoveNodeCommand !== 'undefined') {
      console.log('✓ MoveNodeCommand is available');
      
      // Test creating a move command
      try {
        const testMoveCommand = new MoveNodeCommand(
          app, 
          groupingNode, 
          initialPositions.grouping, 
          newPositions.grouping
        );
        console.log('✓ MoveNodeCommand can be created:', testMoveCommand);
      } catch (error) {
        console.error('❌ Error creating MoveNodeCommand:', error);
      }
    } else {
      console.error('❌ MoveNodeCommand not available');
    }
    
    // Test 5: Test manual movement simulation
    console.log('\n5. Testing manual movement simulation...');
    
    // Simulate the drag start and end process
    try {
      // Simulate pointer down (drag start)
      const elementView = app.paper.findViewByModel(groupingNode);
      if (elementView) {
        // Simulate the drag start
        app.state.isDragging = true;
        app.state.draggedNode = groupingNode;
        app.state.dragInitialPosition = groupingNode.position();
        
        console.log('✓ Drag start simulated, initial position recorded:', app.state.dragInitialPosition);
        
        // Move the node
        const finalPosition = { x: 200, y: 250 };
        groupingNode.position(finalPosition.x, finalPosition.y);
        
        // Simulate drag end
        app.recordNodeMovement(groupingNode);
        
        // Clean up state
        app.state.isDragging = false;
        app.state.draggedNode = null;
        app.state.dragInitialPosition = null;
        
        console.log('✓ Manual movement simulation completed');
        
        // Check command history
        const newStatus = app.commandHistory.getStatus();
        console.log('✓ Command history after movement:', newStatus);
        
        if (newStatus.canUndo) {
          console.log('✓ Undo is available - movement was recorded!');
          
          // Test undo
          console.log('\n6. Testing undo functionality...');
          const positionBeforeUndo = groupingNode.position();
          console.log('Position before undo:', positionBeforeUndo);
          
          app.commandHistory.undo();
          
          const positionAfterUndo = groupingNode.position();
          console.log('Position after undo:', positionAfterUndo);
          
          // Check if position was restored
          const deltaX = Math.abs(positionAfterUndo.x - app.state.dragInitialPosition?.x || 0);
          const deltaY = Math.abs(positionAfterUndo.y - app.state.dragInitialPosition?.y || 0);
          
          if (deltaX < 1 && deltaY < 1) {
            console.log('✅ Undo successful - node returned to original position!');
          } else {
            console.log('⚠ Undo may not have worked correctly');
          }
          
          // Test redo
          console.log('\n7. Testing redo functionality...');
          app.commandHistory.redo();
          
          const positionAfterRedo = groupingNode.position();
          console.log('Position after redo:', positionAfterRedo);
          
          const redoDeltaX = Math.abs(positionAfterRedo.x - finalPosition.x);
          const redoDeltaY = Math.abs(positionAfterRedo.y - finalPosition.y);
          
          if (redoDeltaX < 1 && redoDeltaY < 1) {
            console.log('✅ Redo successful - node returned to moved position!');
          } else {
            console.log('⚠ Redo may not have worked correctly');
          }
          
        } else {
          console.log('❌ Movement was not recorded in command history');
        }
        
      } else {
        console.error('❌ Could not find element view for grouping node');
      }
    } catch (error) {
      console.error('❌ Error in manual movement simulation:', error);
    }
    
    console.log('\n=== Node Movement Tracking Test Complete ===');
    console.log('✅ Test completed! Check the results above.');
    console.log('\nTo test manually:');
    console.log('1. Drag any node to a new position');
    console.log('2. Press Ctrl+Z to undo the movement');
    console.log('3. Press Ctrl+Y to redo the movement');
    
  } catch (error) {
    console.error('❌ Error in movement tracking test:', error);
  }
}

// Auto-run the test if the application is ready
if (typeof app !== 'undefined' && app.graph) {
  testMovementTracking();
} else {
  console.log('Application not ready. Run testMovementTracking() manually when ready.');
}
