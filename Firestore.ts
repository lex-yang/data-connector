import { firestore } from "firebase-admin";
import { IDictionary, DataConnector } from './DataConnector';

let _store: firestore.Firestore | null;

export const setupFirestore = (app: firestore.Firestore) => _store = app;

export default class FirestoreConnector<T> extends DataConnector<T> {
	protected _rootPath: FirebaseFirestore.DocumentReference | FirebaseFirestore.Firestore;
	protected _converter: FirebaseFirestore.FirestoreDataConverter<T>;
	protected _pool_id: string;
	
	constructor(pool_id: string, converter: FirebaseFirestore.FirestoreDataConverter<T>, rootPath: string = '') {
		super();

		this.rootPath = rootPath;
		this._pool_id = pool_id;
		this._converter = converter;
	}

	// General operations.
	set rootPath (path: string) {
		const tokens = path.split('/');

 		while (tokens[0] === '') tokens.splice(0, 1);

		if (tokens.length % 2) throw 'FirestoreConnect root must be Document !!!';

		this._rootPath = _store;
		for (let i = 0; i < tokens.length; i += 2) {
			this._rootPath = this._rootPath.collection(tokens[i]).doc(tokens[i + 1]);
		}
	}

	async _setObject (pool: string, obj: T, force = false) {
		const base: any = obj;

		if (!force) {
			const snap = await this._rootPath.collection(pool).doc(base.id).get();
			if (!snap.exists)
				force = true;
			else
				return false;
		}

		if (force) await this._rootPath.collection(pool)
			.withConverter(this._converter).doc(base.id).set(obj);

		return true;
	}

	async _updateObject (pool: string, obj: T, path: string, value: any) {
		const base: any = obj
		const field: IDictionary<any> = {};
		field[`${path}`] = value;
		return await this._rootPath.collection(pool).doc(base.id).update(field);
	}

	async _addObject (pool: string, obj: T, check = true) {
		//const base: any = obj
		const doc = await this._rootPath.collection(pool).withConverter(this._converter).add(obj);
		return (await doc.get()).data()
		//base.id = doc.id;
		//return doc;
	}

	async Load (id: string) : Promise<T> {
		const snap = await this._rootPath.collection(this._pool_id).withConverter(this._converter).doc(id).get();
		return snap.data();
	}

	async Save (obj: T, force: boolean = false) {
		return await this._setObject(this._pool_id, obj, force);
	};

	/*
	async Add (obj: T, check = true) {
		return await this._addObject(this._pool_id, obj, check);
	}
	*/

	async Query(key: string = '', start: number = 0, limit: number = 0) {
		console.log(`pool_id: ${this._pool_id}`);
		const collection = this._rootPath.collection(this._pool_id).withConverter<T>(this._converter);
		let queryRef: FirebaseFirestore.Query<T> | FirebaseFirestore.CollectionReference<T>;

		queryRef = collection;
		if (key !== '') queryRef = collection.orderBy(key).startAt(start);
		if (limit) queryRef = queryRef.limit(limit);

		const snapshot = await queryRef.get();
		const list: T[] = [];

		for (let i = 0; i < snapshot.size; i ++) {
			//const unwrapped: any = snapshot.docs[i].data();
			list.push(snapshot.docs[i].data());
		}
		return list;
	}

	async FilterByKey (key: string, value: string, op: FirebaseFirestore.WhereFilterOp = '==') {
		let snapshot = await this._rootPath.collection(this._pool_id)
																				.where(key, op, value)
																				.withConverter(this._converter).get();

		const list = [];

		for (let i = 0; i < snapshot.size; i ++) {
			list.push(snapshot.docs[i].data());
		}
		return list;
	}
}
