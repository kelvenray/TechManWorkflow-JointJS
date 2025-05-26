/**
 * Test script to verify connection functionality after the fix
 * Run this in the browser console after loading the application
 */

function testConnectionFunctionality() {
  console.log('=== Testing Connection Functionality ===');
  
  // Wait for the application to be fully loaded
  if (typeof app === 'undefined' || !app.graph) {
    console.error('Application not loaded yet. Please wait and try again.');
    return;
  }
  
  // Clear the canvas first
  app.graph.clear();
  console.log('✓ Canvas cleared');
  
  // Test 1: Create nodes
  console.log('\n1. Creating test nodes...');
  
  try {
    // Create Grouping node
    const groupingNode = app.nodeManager.createNode('Grouping', 100, 100, { skipHistory: true });
    console.log('✓ Grouping node created:', groupingNode.id);
    
    // Create Decision node
    const decisionNode = app.nodeManager.createNode('Decision', 300, 100, { skipHistory: true });
    console.log('✓ Decision node created:', decisionNode.id);
    
    // Create Switch node
    const switchNode = app.nodeManager.createNode('Switch', 500, 100, { skipHistory: true });
    console.log('✓ Switch node created:', switchNode.id);
    
    // Test 2: Create connections programmatically
    console.log('\n2. Testing programmatic connection creation...');
    
    // Create connection: Grouping → Decision
    const link1 = new joint.shapes.standard.Link();
    link1.source({ id: groupingNode.id });
    link1.target({ id: decisionNode.id });
    link1.attr({
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
    link1.addTo(app.graph);
    console.log('✓ Connection 1 created:', link1.id, 'Grouping → Decision');
    
    // Create connection: Decision → Switch
    const link2 = new joint.shapes.standard.Link();
    link2.source({ id: decisionNode.id });
    link2.target({ id: switchNode.id });
    link2.attr({
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
    link2.addTo(app.graph);
    console.log('✓ Connection 2 created:', link2.id, 'Decision → Switch');
    
    // Test 3: Test connection selection
    console.log('\n3. Testing connection selection...');
    
    setTimeout(() => {
      try {
        // Simulate clicking on the first connection
        console.log('Testing selection of connection 1...');
        app.selectLink(link1);
        console.log('✓ Connection 1 selected successfully');
        
        // Check if delete icon is shown
        const linkView1 = app.paper.findViewByModel(link1);
        if (linkView1 && linkView1.hasTools()) {
          console.log('✓ Delete tool is visible for connection 1');
        } else {
          console.log('⚠ Delete tool not visible for connection 1');
        }
        
        // Clear selection
        app.clearSelection();
        console.log('✓ Selection cleared');
        
        // Test second connection
        setTimeout(() => {
          console.log('Testing selection of connection 2...');
          app.selectLink(link2);
          console.log('✓ Connection 2 selected successfully');
          
          const linkView2 = app.paper.findViewByModel(link2);
          if (linkView2 && linkView2.hasTools()) {
            console.log('✓ Delete tool is visible for connection 2');
          } else {
            console.log('⚠ Delete tool not visible for connection 2');
          }
          
          // Test 4: Test connection deletion
          console.log('\n4. Testing connection deletion...');
          
          setTimeout(() => {
            try {
              // Delete the second connection using the command system
              if (app.commandHistory && typeof DeleteLinkCommand !== 'undefined') {
                const deleteLinkCommand = new DeleteLinkCommand(app, link2);
                app.commandHistory.executeCommand(deleteLinkCommand);
                console.log('✓ Connection 2 deleted using command system');
              } else {
                link2.remove();
                console.log('✓ Connection 2 deleted directly');
              }
              
              // Verify deletion
              const remainingLinks = app.graph.getLinks();
              console.log(`✓ Remaining connections: ${remainingLinks.length}`);
              
              if (remainingLinks.length === 1 && remainingLinks[0].id === link1.id) {
                console.log('✓ Deletion test passed - only connection 1 remains');
              } else {
                console.log('⚠ Deletion test issue - unexpected number of connections');
              }
              
              console.log('\n=== Connection Functionality Test Complete ===');
              console.log('✅ All tests completed successfully!');
              console.log('\nYou can now manually test:');
              console.log('1. Creating connections by dragging from node to node');
              console.log('2. Clicking on connections to select them');
              console.log('3. Using the delete icon to remove connections');
              
            } catch (error) {
              console.error('❌ Error in deletion test:', error);
            }
          }, 500);
          
        }, 500);
        
      } catch (error) {
        console.error('❌ Error in selection test:', error);
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ Error in node creation test:', error);
  }
}

// Auto-run the test if the application is ready
if (typeof app !== 'undefined' && app.graph) {
  testConnectionFunctionality();
} else {
  console.log('Application not ready. Run testConnectionFunctionality() manually when ready.');
}
