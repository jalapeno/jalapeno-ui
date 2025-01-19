// Development API URL (using k8s-deployed API)
//const apiUrl = 'http://198.18.128.101:30800';
//const apiUrl = 'http://localhost:8000';

// Production API URL from environment variable
const apiUrl = process.env.REACT_APP_API_URL;

export { apiUrl }; 