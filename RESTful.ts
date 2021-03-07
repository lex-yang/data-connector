import { DataConnector, IDictionary } from './DataConnector';
import { cache } from '../../lib/matrix';
import { IRedisConverter } from './Redis';
import fetch from 'node-fetch';

const API_ENDPOINT = 'http://localhost:3000/api/v1';

export default class RESTfulConnector<T> extends DataConnector<T> {
	protected _rootPath: string;
	protected _converter;
	protected _pool_id: string;

	constructor (pool_id: string, converter: IRedisConverter<T>, rootPath: string = '') {
		super();

		this._converter = converter;
		this._pool_id = pool_id;
		this.rootPath = rootPath;
	}

	set rootPath (path: string) {
		this._rootPath = `${path}/${this._pool_id}`;
	}

	async DeleteRoot () : Promise<boolean> {
		const result = await cache.del(this._rootPath);
		return (result > 0);
	}

	async Load(id: string) : Promise<T> {
		const result = await fetch(`${API_ENDPOINT}/load/${this._rootPath}?id=${id}`);
		console.log(JSON.stringify(result));
		return this._converter.fromRedis(await cache.hget(this._rootPath, id));
	}

	async Save(obj: T, force: boolean = false) : Promise<boolean> {
		const base: any = obj;
		const data = this._converter.toRedis(obj);
		const result = await cache.hset(this._rootPath, base.id, data);
		return (result > 0);
	}
	
	async Query(key: string = '', start: number = 0, limit: number = 0) : Promise<T[]> {
		const result = await fetch(`${API_ENDPOINT}/query/${this._rootPath}?key=${key}`)
		console.log(JSON.stringify(result));

		const data: IDictionary<string> = await cache.hgetall(this._rootPath);
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
		const result = await fetch(`${API_ENDPOINT}/filter/${this._rootPath}?key=${key}&value=${value}`)
		console.log(JSON.stringify(result));

		const data = await cache.hgetall(this._rootPath);
		let list: T[];

		list = await Object.keys(data).map( value => this._converter.fromRedis(data[value]) );
		list = await list.filter(item => {
			const obj: any = item;
			return (obj[key] == value);
		});
		
		//console.log(JSON.stringify(list));
		return list;
	}

	async CloseRedis() {
		await cache.close();
	}
}