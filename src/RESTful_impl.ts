import { DataConnector, IDictionary } from './DataConnector';

import { IRedisConverter } from './Redis_impl';
//import fetch from 'node-fetch';

const API_ENDPOINT = 'http://192.168.2.20:7777/api/v1';

type ResponseData = {
	result: boolean;
	data: string;
}

export class RESTfulConnector<T> extends DataConnector<T> {
	protected _rootPath: string;
	protected _converter: IRedisConverter<T>;
	protected _pool_id: string;

	constructor (pool_id: string, converter: IRedisConverter<T>, rootPath: string = '') {
		super();

		this._converter = converter;
		this._pool_id = pool_id;
		this.rootPath = rootPath;
	}

	set rootPath (path: string) {
		this._rootPath = `${path}`;
	}

	async DeleteRoot () : Promise<boolean> {
	//	const result = await cache.del(this._rootPath);
		console.error('DeleteRoot N/A');
	//	return (result > 0);
		return false;
	}

	async Load(id: string) : Promise<T> {
		const url = `${API_ENDPOINT}/${this._pool_id}/load/${this._rootPath}?id=${id}`;
		console.log(`Load Request: ${url}`);

		const result = await fetch(url);
		const json: ResponseData = await result.json();
		console.log(JSON.stringify(json));
		return this._converter.fromRedis(json.data);;
	}

	async Save(obj: T, force: boolean = false) : Promise<boolean> {
		// const base: any = obj;
		// const data = this._converter.toRedis(obj);
		// const result = await cache.hset(this._rootPath, base.id, data);
		console.error('Save N/A');
		//return (result > 0);
		return false;
	}
	
	async Query(key: string = '', start: number = 0, limit: number = 0) : Promise<T[]> {
		const url = `${API_ENDPOINT}/${this._pool_id}/query/${this._rootPath}?key=${key}`;
		//const url = 'https://api.github.com/users/github';
		console.log(`Query Request: ${url}`);

		const result = await fetch(url);
		console.log('fetching ...');
		const json = await result.json();	
		console.log('decoding ...');
		const data: IDictionary<string> = json.data;
		let list: T[];

		list = await Object.keys(data).map( value => {
			if (data[value] === undefined ||  data[value] == null) {
				console.log(`key = ${value}, data = ${data[value]}`);
			}
			return this._converter.fromRedis(data[value]);
		});

		if (key !== '') {
			list = await list.sort((a, b) => {
				const A: any = a;
				const B: any = b;
				if (A[key] > B[key])
					return 1;
				else if (A[key] < B[key])
					return -1;
				else
					return 0;
			});
		}	
		//console.log(JSON.stringify(data));
		return list;
	}

	async FilterByKey(key: string, value: string) : Promise<T[]> {
		const url = `${API_ENDPOINT}/${this._pool_id}/filter/${this._rootPath}?key=${key}&value=${value}`;
		console.log(`FilterByKey Request: ${url}`);

		const result = await fetch(url);
		const json = await result.json();
		const data = json.data;
		let list: T[];

		list = await Object.keys(data).map( value => this._converter.fromRedis(data[value]) );
		list = await list.filter(item => {
			const obj: any = item;
			return (obj[key] == value);
		});

		return list;
	}
}