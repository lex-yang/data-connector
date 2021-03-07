export interface IDictionary<TValue> {
	[id: string]: TValue;
}

export abstract class DataConnector<T> {
	abstract set rootPath (path: string);

	abstract Load(id: string) : Promise<T>;

	abstract Save(obj: T, force: boolean) : Promise<boolean>;

	//abstract Add(obj: T, check: boolean) : Promise<T>;
	
	abstract Query(key: string, start: number, limit: number) : Promise<T[]>;

	abstract FilterByKey(key: string, value: string) : Promise<T[]>;
}
