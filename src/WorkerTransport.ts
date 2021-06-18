import uuid from 'uuid';
import { EventEmitter } from 'events';

const events = {
  request: 'Request',
  response: 'Response',
  push: 'Push',
  timeout: 'Timeout',
  message: 'Message',
};

export class WorkerTransport extends EventEmitter {
  private _timeout: number;
  private _worker: SharedWorker;
  private _requests: Map<string, any>;
  constructor({ worker, timeout = 15 * 1000 }) {
    super();

    this._timeout = timeout;
    this._worker = worker;
    this._requests = new Map();
    this._worker.port.addEventListener('message', this._onMessage);
  }

  _onMessage = (e) => {
    const data  = e.data;
    console.log(data);
    if (data.type === this.events.request) {
      this.emit(this.events.request, { requestId: data.requestId, payload: data.payload });
      return;
    }
    if (data.type === events.response) {
      const requestId = data && data.requestId;
      if (requestId && this._requests.has(requestId)) {
        const error = data.error;
        if (error) {
          this._requests.get(requestId).reject(new Error(error));
        } else {
          const result = data.result
          this._requests.get(requestId).resolve(result);
        }
      }
      return;
    }
    if (data.type === this.events.message) {
      this.emit(this.events.message, data.message);
    }
  }

  request({ payload, clientId } : { payload: any, clientId?: string }) {
    const requestId = uuid.v4();
    let promise = new Promise((resolve, reject) => {
      this._requests.set(requestId, {
        resolve,
        reject,
      });
      this._worker.port.postMessage({
        type: this.events.request,
        payload,
        clientId,
        requestId,
      });
    });
    let timeout = setTimeout(() => {
      timeout = null;
      this._requests.get(requestId).reject(new Error(this.events.timeout));
    }, this._timeout);
    promise = promise
      .then((result) => {
        if (timeout !== undefined && timeout !== null) clearTimeout(timeout);
        this._requests.delete(requestId);
        return Promise.resolve(result);
      })
      .catch((error) => {
        if (timeout !== undefined && timeout !== null) clearTimeout(timeout);
        this._requests.delete(requestId);
        return Promise.reject(error);
      });
    return promise;
  }

  response({ requestId, result, error }) {
    this._worker.port.postMessage({
      type: this.events.response,
      data: {
        requestId,
        result: result,
        error: error,
      },
    });
  }

  push({ type, payload }) {
    this._worker.port.postMessage({
      type,
      payload,
    });
  }

  dispose() {
    this._requests = new Map();;
    this._worker.port.removeEventListener('message', this._onMessage);
  }

  get events() {
    return events;
  }
}
