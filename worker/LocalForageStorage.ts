import { EventEmitter } from 'events';
import localforage from 'localforage';

export class LocalForageStorage extends EventEmitter {
  private _storageKey: string;
  private _ready: boolean;
  private _localforage: LocalForage;
  private _data = {};

  constructor({ storageKey }: { storageKey: string }) {
    super();
    if (!storageKey) {
      throw Error('LocalforageStorage must be created with a storage key');
    }
    this._storageKey = storageKey;
    this._ready = false;
    localforage.config({ name: this._storageKey });
    this._localforage = localforage.createInstance({
      name: this._storageKey,
    });
    this._syncData();
  }

  async _syncData() {
    this._data = await this.getData();
  }

  async getLocalStorageKeys() {
    const keys = await this._localforage.keys();
    return keys;
  }

  async getData() {
    await this.ready();
    const output = {};
    const keys = await this.getLocalStorageKeys();
    const promises = keys.map((key) =>
      this._getItem(key).then((data) => {
        output[key] = data;
      }),
    );
    await Promise.all(promises);
    return output;
  }

  getItem(key: string) {
    return this._data[key];
  }

  async _getItem(key: string) {
    // TODO: fix MemoryStorage set value with `string`;
    const originalData = await this._localforage.getItem(key);
    return originalData;
  }

  async setItem(key: string, value: any) {
    this._data[key] = value;
    await this._localforage.setItem(key, value);
  }

  async removeItem(key: string) {
    delete this._data[key];
    await this._localforage.removeItem(key);
  }

  keys() {
    return Object.keys(this._data);
  }

  async ready(): Promise<void | boolean> {
    if (this._ready) {
      return;
    }
    if (typeof this._localforage.ready === 'function') {
      await this._localforage.ready();
    }
    this._ready = true;
  }
}
