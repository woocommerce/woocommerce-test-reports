import config from './config.json';

export function getDataSourceUrl() {
	return process.env.NODE_ENV === 'development' ? '' : config.dataSourceURL;
}
