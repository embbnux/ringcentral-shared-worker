import { EventEmitter } from 'events';
import PlatformBase from '@ringcentral/sdk/lib/platform/Platform';
import Client from '@ringcentral/sdk/lib/http/Client';
import RingCentral, {
  Cache,
  Externals,
}from '@ringcentral/sdk';
import { WorkerTransport } from './WorkerTransport';

const worker = new SharedWorker('../build/worker.js', 'RingCentralSharedWorker');
worker.onerror = (e) => {
  console.error(e);
};
worker.port.start();

const workerTransport = new WorkerTransport({ worker });
// @ts-ignore
window.workerTransport = workerTransport;
// @ts-ignore
class Platform extends PlatformBase {
  private _clientId;

  async send(options: any): Promise<any> {
    const result = await workerTransport.request({
      clientId: this._clientId,
      payload: {
        path: 'platform',
        funcName: 'send',
        args: [options],
      },
    }) as Blob;
    return new Response(result);
  }

  async login(options): Promise<any> {
    const result = await workerTransport.request({
      clientId: this._clientId,
      payload: {
        path: 'platform',
        funcName: 'login',
        args: [options],
      },
    }) as Blob;
    return new Response(result);
  }

  async loggedIn(): Promise<boolean> {
    const result = await workerTransport.request({
      clientId: this._clientId,
      payload: {
        path: 'platform',
        funcName: 'loggedIn',
        args: [],
      },
    });
    return result as boolean;
  }

  async refresh(): Promise<any> {
    const result = await workerTransport.request({
      clientId: this._clientId,
      payload: {
        path: 'platform',
        funcName: 'refresh',
        args: [],
      },
    }) as Blob;
    return new Response(result);
  }

  async logout(): Promise<any> {
    const result = await workerTransport.request({
      clientId: this._clientId,
      payload: {
        path: 'platform',
        funcName: 'logout',
        args: [],
      },
    }) as Blob;
    return new Response(result);
  }

  async loginUrlWithDiscovery(options) : Promise<any> {
    const result = await workerTransport.request({
      clientId: this._clientId,
      payload: {
        path: 'platform',
        funcName: 'loginUrlWithDiscovery',
        args: [options],
      },
    });
    return result;
  }
}

// @ts-ignore
export class SharedSDK extends RingCentral {
  private _externals: Externals;
  private _cache: Cache;
  private _client: Client;

  private _platform: Platform;

  constructor(options) {
    super({
      ...options,
      enableDiscovery: false,
    });

    workerTransport.push({
      type: 'CreateSDKInstance',
      payload: {
        options,
      },
    });
    this._platform = new Platform({
      ...options,
      enableDiscovery: false,
      externals: this._externals,
      client: this._client,
      cache: this._cache,
    });
  }
}

export class SharedSubscription extends EventEmitter {
  constructor() {
    super();

    workerTransport.on(workerTransport.events.message, (message) => {
      this.emit('notification', message);
    });
  }

  async setEventFilters(filters) {
    await workerTransport.request({
      payload: {
        path: 'subscription',
        funcName: 'setEventFilters',
        args: [filters],
      },
    });
  }

  async register() {
    const result = await workerTransport.request({
      payload: {
        path: 'subscription',
        funcName: 'register',
        args: [],
      },
    });
    return result;
  }
}
