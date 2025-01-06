// //import api from './api';
// import { api } from './api';  // Changed to use named import

// export const fetchPath = async (collection, source, destination, constraint) => {
//     try {
//         let endpoint = 'shortest_path';
//         if (constraint === 'latency') {
//             endpoint = 'shortest_path/latency';
//         } else if (constraint === 'utilization') {
//             endpoint = 'shortest_path/utilization';
//         } else if (constraint === 'scheduled') {
//             endpoint = 'shortest_path/load';
//         }
        
//         const url = `/graphs/${collection}/${endpoint}?source=${source}&destination=${destination}&direction=any`;
        
//         console.log('NetworkGraph: Fetching path:', {
//             url, collection, source, destination, constraint,
//             timestamp: new Date().toISOString()
//         });

//         const response = await api.get(url);
//         return response.data;
//     } catch (error) {
//         console.error('Path API request failed:', error);
//         throw error;
//     }
// };

// export const handlePathCalculation = async (cyRef, collection, source, destination, constraint) => {
//     try {
//         const response = await fetchPath(collection, source, destination, constraint);
        
//         if (response.found && response.path) {
//             let lastFoundNode = null;
//             const pathNodes = [];
//             const pathEdges = [];

//             // Process each hop in the path
//             response.path.forEach((hop, index) => {
//                 const vertex = hop.vertex;
//                 const edge = hop.edge;
//                 const nodeId = vertex._id;

//                 console.log('NetworkGraph: Processing hop:', {
//                     index,
//                     nodeId,
//                     timestamp: new Date().toISOString()
//                 });

//                 // Find node in graph
//                 const currentNode = cyRef.current.$(`node[id = "${nodeId}"]`);
                
//                 if (currentNode.length) {
//                     pathNodes.push(currentNode);
                    
//                     if (lastFoundNode && edge) {
//                         const edgeId = edge._id;
//                         let pathEdge = cyRef.current.edges(`[id = "${edgeId}"]`);
                        
//                         if (pathEdge.length) {
//                             pathEdges.push(pathEdge[0]);
//                         } else {
//                             pathEdge = cyRef.current.edges(`[source = "${edge._from}"][target = "${edge._to}"]`);
//                             if (!pathEdge.length) {
//                                 pathEdge = cyRef.current.edges(`[source = "${edge._to}"][target = "${edge._from}"]`);
//                             }
//                             if (pathEdge.length) {
//                                 pathEdges.push(pathEdge);
//                             }
//                         }
//                     }
                    
//                     lastFoundNode = currentNode;
//                 } else {
//                     console.log('NetworkGraph: Node not found:', {
//                         nodeId,
//                         timestamp: new Date().toISOString()
//                     });
//                 }
//             });

//             // Highlight the path
//             cyRef.current.elements().removeClass('selected');
//             pathNodes.forEach(node => node.addClass('selected'));
            
//             // Highlight edges between consecutive nodes
//             for (let i = 0; i < pathNodes.length - 1; i++) {
//                 const edge = cyRef.current.edges().filter(edge => 
//                     (edge.source().id() === pathNodes[i].id() && edge.target().id() === pathNodes[i + 1].id()) ||
//                     (edge.target().id() === pathNodes[i].id() && edge.source().id() === pathNodes[i + 1].id())
//                 );
//                 edge.addClass('selected');
//             }

//             // Return the path data for the tooltip
//             return {
//                 found: true,
//                 pathNodes,
//                 pathInfo: response.path.map(hop => hop.vertex.prefix).filter(Boolean)
//             };
//         }
        
//         return { found: false };
//     } catch (error) {
//         console.error('NetworkGraph: Path calculation error:', error);
//         return { found: false, error };
//     }
// };

// export const createPathTooltip = (pathInfo) => {
//     const tooltipContent = document.createElement('div');
//     tooltipContent.className = 'path-tooltip';
//     tooltipContent.innerHTML = `
//         <div style="
//             background: white;
//             border: 1px solid #ccc;
//             padding: 6px 12px;
//             border-radius: 4px;
//             box-shadow: 0 2px 4px rgba(0,0,0,0.2);
//             width: 200px;
//             margin-top: 30px;
//             font-family: Consolas, monospace;
//         ">
//             <h4 style="margin: 8px 0; font-size: 14px;">Path Information</h4>
//             <div style="font-size: 12px;">
//                 ${pathInfo.map((prefix, i) => `
//                     <div style="margin: 4px 0">${i + 1}. ${prefix || 'N/A'}</div>
//                 `).join('')}
//             </div>
//         </div>
//     `;

//     // Position tooltip below the dropdown
//     const dropdown = document.querySelector('select');
//     if (dropdown) {
//         const dropdownRect = dropdown.getBoundingClientRect();
//         tooltipContent.style.position = 'absolute';
//         tooltipContent.style.left = `${dropdownRect.left}px`;
//         tooltipContent.style.top = `${dropdownRect.bottom + window.scrollY + 35}px`;
//         tooltipContent.style.zIndex = '10';
        
//         // Remove any existing tooltips
//         const existingTooltip = document.querySelector('.path-tooltip');
//         if (existingTooltip) {
//             existingTooltip.remove();
//         }
        
//         document.body.appendChild(tooltipContent);
//     }
// }; 