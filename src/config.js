// Development API URL (using k8s-deployed API)
//const apiUrl = 'http://198.18.133.104:30800';

// Production API URL from environment variable
const apiUrl = process.env.REACT_APP_API_URL;

export { apiUrl }; 