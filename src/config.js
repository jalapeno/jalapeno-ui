const config = {
  development: {
    apiUrl: 'http://198.18.133.104:30800'
  },
  production: {
    apiUrl: '/api' // This will be the internal k8s service path
  }
};

const environment = process.env.NODE_ENV || 'development';
export const apiUrl = config[environment].apiUrl; 