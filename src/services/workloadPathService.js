// import { api } from './api';

// export const calculateWorkloadPaths = async (collection, selectedNodes) => {
//     if (selectedNodes.length < 2) {
//         console.log('WorkloadPath: Not enough nodes selected:', {
//             nodesSelected: selectedNodes.length,
//             timestamp: new Date().toISOString()
//         });
//         return { paths: [], errors: [] };
//     }

//     const pathResults = [];
//     const errors = [];

//     // Calculate paths between each pair of nodes
//     for (let i = 0; i < selectedNodes.length; i++) {
//         for (let j = i + 1; j < selectedNodes.length; j++) {
//             const source = selectedNodes[i];
//             const dest = selectedNodes[j];

//             try {
//                 console.log('WorkloadPath: Calculating path:', {
//                     source: source.id(),
//                     destination: dest.id(),
//                     timestamp: new Date().toISOString()
//                 });

//                 const response = await api.get(
//                     `/graphs/${collection}/shortest_path/load?source=${source.id()}&destination=${dest.id()}&direction=outbound`
//                 );

//                 if (response.data.found) {
//                     pathResults.push({
//                         source: source.id(),
//                         destination: dest.id(),
//                         path: response.data.path,
//                         srv6Data: response.data.srv6_data
//                     });
//                 }
//             } catch (error) {
//                 console.error('WorkloadPath: Path calculation failed:', {
//                     source: source.id(),
//                     destination: dest.id(),
//                     error,
//                     timestamp: new Date().toISOString()
//                 });
//                 errors.push({ source: source.id(), destination: dest.id(), error });
//             }
//         }
//     }

//     console.log('WorkloadPath: Paths calculated:', {
//         totalPaths: pathResults.length,
//         errors: errors.length,
//         timestamp: new Date().toISOString()
//     });

//     return { pathResults, errors };
// };

// export const highlightWorkloadPaths = (cyRef, pathResults) => {
//     // Clear existing highlights
//     cyRef.elements().removeClass('workload-path');
    
//     pathResults.forEach(result => {
//         result.path.forEach((hop, index) => {
//             const nodeId = hop.vertex._id;
//             const currentNode = cyRef.$(`node[id = "${nodeId}"]`);
            
//             if (currentNode.length) {
//                 currentNode.addClass('workload-path');

//                 // If there's a next hop, highlight the edge between them
//                 if (index < result.path.length - 1) {
//                     const nextHop = result.path[index + 1];
//                     const nextNodeId = nextHop.vertex._id;
//                     const edge = cyRef.edges().filter(edge => 
//                         (edge.source().id() === nodeId && edge.target().id() === nextNodeId) ||
//                         (edge.target().id() === nodeId && edge.source().id() === nextNodeId)
//                     );
//                     edge.addClass('workload-path');
//                 }
//             }
//         });
//     });
// }; 