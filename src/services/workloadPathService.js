import { api } from './api';

export const calculateWorkloadPaths = async (collection, selectedNodes) => {
    const paths = [];
    const errors = [];

    // Generate all source/destination pairs
    for (let i = 0; i < selectedNodes.length; i++) {
        for (let j = 0; j < selectedNodes.length; j++) {
            if (i !== j) { // Skip calculating path to self
                const source = selectedNodes[i];
                const destination = selectedNodes[j];
                
                try {
                    console.log('WorkloadPath: Calculating path:', {
                        source: source.id(),
                        destination: destination.id(),
                        timestamp: new Date().toISOString()
                    });

                    const response = await api.get(
                        `/graphs/${collection}/shortest_path/load?source=${source.id()}&destination=${destination.id()}&direction=outbound`
                    );

                    if (response.data.found) {
                        paths.push({
                            source: source.id(),
                            destination: destination.id(),
                            path: response.data.path,
                            srv6Data: response.data.srv6_data
                        });
                    }
                } catch (error) {
                    console.error('WorkloadPath: Path calculation failed:', {
                        source: source.id(),
                        destination: destination.id(),
                        error,
                        timestamp: new Date().toISOString()
                    });
                    errors.push({ source: source.id(), destination: destination.id(), error });
                }
            }
        }
    }

    return {
        paths,
        errors,
        summary: {
            totalPaths: paths.length,
            failedPaths: errors.length,
            timestamp: new Date().toISOString()
        }
    };
};

// Function to highlight all calculated paths
export const highlightWorkloadPaths = (cyRef, paths) => {
    // Clear any existing highlights
    cyRef.current.elements().removeClass('selected');
    
    // Highlight each path
    paths.forEach(pathData => {
        pathData.path.forEach((hop, index) => {
            const nodeId = hop.vertex._id;
            const currentNode = cyRef.current.$(`node[id = "${nodeId}"]`);
            
            if (currentNode.length) {
                currentNode.addClass('selected');

                // If there's a next hop, highlight the edge between them
                if (index < pathData.path.length - 1) {
                    const nextHop = pathData.path[index + 1];
                    const nextNodeId = nextHop.vertex._id;
                    const edge = cyRef.current.edges().filter(edge => 
                        (edge.source().id() === nodeId && edge.target().id() === nextNodeId) ||
                        (edge.target().id() === nodeId && edge.source().id() === nextNodeId)
                    );
                    edge.addClass('selected');
                }
            }
        });
    });
}; 