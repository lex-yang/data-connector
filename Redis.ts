import { DataConnector, IDictionary } from './DataConnector';

const redis = require('redis');
const redisClient = redis.createClient();

const promisify = require('util').promisify;

const cache = {
  // Redis SET
  sismember: promisify(redisClient.sismember).bind(redisClient),
  sadd: promisify(redisClient.sadd).bind(redisClient),
  srem: promisify(redisClient.srem).bind(redisClient),
  scard: promisify(redisClient.scard).bind(redisClient),
  smembers: promisify(redisClient.smembers).bind(redisClient),

  // Redis HASH
  hexists: promisify(redisClient.hexists).bind(redisClient),

  hgetall: promisify(redisClient.hgetall).bind(redisClient),
  hkeys: promisify(redisClient.hkeys).bind(redisClient),
  hvals: promisify(redisClient.hvals).bind(redisClient),
  hdel: promisify(redisClient.hdel).bind(redisClient),

  hset: promisify(redisClient.hset).bind(redisClient),
  hmset: promisify(redisClient.hmset).bind(redisClient),

  hget: promisify(redisClient.hget).bind(redisClient),
  hmget: promisify(redisClient.hmget).bind(redisClient),

  // Redis LIST
  llen: promisify(redisClient.llen).bind(redisClient),
  lpop: promisify(redisClient.lpop).bind(redisClient),
  lpush: promisify(redisClient.lpush).bind(redisClient),
  lrange: promisify(redisClient.lrange).bind(redisClient),

  lrem: promisify(redisClient.lrem).bind(redisClient),
  ltrim: promisify(redisClient.ltrim).bind(redisClient),
  lset: promisify(redisClient.lset).bind(redisClient),

  rpop: promisify(redisClient.rpop).bind(redisClient),
  rpush: promisify(redisClient.rpush).bind(redisClient),

  // Redis Key
  set: promisify(redisClient.set).bind(redisClient),
  get: promisify(redisClient.get).bind(redisClient),
  del: promisify(redisClient.del).bind(redisClient),

  // close connection
  close: promisify(redisClient.quit).bind(redisClient),
}

export interface IRedisConverter<T> {
		toRedis: (stock: T) => string,
		fromRedis: (data: string) => T
}

export default class RedisConnector<T> extends DataConnector<T> {
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
		return this._converter.fromRedis(await cache.hget(this._rootPath, id));
	}

	async Save(obj: T, force: boolean = false) : Promise<boolean> {
		const base: any = obj;
		const data = this._converter.toRedis(obj);
		const result = await cache.hset(this._rootPath, base.id, data);
		return (result > 0);
	}
	
	async Query(key: string = '', start: number = 0, limit: number = 0) : Promise<T[]> {
		const data: IDictionary<string> = await cache.hgetall(this._rootPath);
		let list: T[] = null;

		if (!data) return null;

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