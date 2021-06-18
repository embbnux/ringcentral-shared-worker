
// @ts-ignore
globalThis.window = globalThis;
import RingCentral from '@ringcentral/sdk';
import { Subscriptions } from '@ringcentral/subscriptions/lib/Subscriptions';

import { LocalForageStorage } from './LocalForageStorage';

let ports = [];
let sdk;
let subscription;

const eventTypes = {
  closePort: 'ClosePort',
  createSDKInstance: 'CreateSDKInstance',
  request: 'Request',
  response: 'Response',
};

const localStorage = new LocalForageStorage({ storageKey: 'rc-shared-worker-storage' });

// @ts-ignore
onconnect = function(e) {
  console.log('onconnect');
  const port = e.ports[0];
  ports.push(port);

  port.addEventListener('message', async function(e) {
    console.log('message');
    console.log(JSON.stringify(e.data, null, 2));
    console.log(e.data.type);
    if (e.data.type === eventTypes.createSDKInstance) {
      console.log('create SDK');
      const options = e.data.payload.options;
      if (!sdk) {
        try {
          sdk = new RingCentral({
            ...options,
            localStorage: localStorage,
          });
        } catch (e) {
          console.error(e);
        }
        console.log('new SDK');
      }
      return;
    }
    if (e.data.type === eventTypes.closePort) {
      ports = ports.filter(p => p !== port);
      return;
    }
    if (e.data.type === eventTypes.request) {
      const payload = e.data.payload;
      let result;
      let error;
      let isBlob;
      try {
        if (payload.path === 'platform') {
          result = await sdk.platform()[payload.funcName](...payload.args)
        } else if (payload.path === 'subscription') {
          if (!subscription) {
            const subscriptions = new Subscriptions({
              sdk,
            });
            subscription = subscriptions.createSubscription();
            const cacheKey = 'rc-subscription-key';
            const cachedSubscriptionData = sdk.cache().getItem(cacheKey);
            if (cachedSubscriptionData) {
              try {
                subscription.setSubscription(cachedSubscriptionData); // use the cache
              } catch (e) {
                console.warn('Cannot set subscription from cache data', e);
              }
            }
            subscription.on([subscription.events.subscribeSuccess, subscription.events.renewSuccess], function() {
              sdk.cache().setItem(cacheKey, subscription.subscription());
            });
            subscription.on(subscription.events.notification, function(message) {
              ports.forEach((port) => {
                port.postMessage({
                  type: 'Message',
                  message,
                });
              });
            });
          }
          if (payload.funcName === 'setEventFilters') {
            subscription.setEventFilters(...payload.args);
          }
          if (payload.funcName === 'register') {
            await subscription.register();
          }
        } else {
          result = await sdk[payload.funcName](...payload.args);
        }
        if (result && result.blob) {
          result = await result.blob();
          isBlob = true;
        }
      } catch (e) {
        console.error(e);
        error = e.message;
      }

      port.postMessage({
        type: eventTypes.response,
        requestId: e.data.requestId,
        result,
        isBlob,
        error,
      });
    }
  });

  port.start();
}
