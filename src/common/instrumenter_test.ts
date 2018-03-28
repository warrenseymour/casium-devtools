import { expect } from 'chai';
import { identity } from 'ramda';
import * as sinon from 'sinon';
import * as instrumentation from 'casium/instrumentation';
import Message from 'casium/message';

import { Instrumenter, INSTRUMENTER_KEY, InboundMessage } from './instrumenter';

class Increment extends Message { };
class Decrement extends Message { };
class SetText extends Message { };

const contexts = {
  counter: {
    id: 'counter',
    relay: identity,
    dispatch: identity,
    container: {
      name: 'Counter',
      update: new Map([
        [Increment, identity],
        [Decrement, identity]
      ])
    }
  },

  text: {
    id: 'text',
    relay: identity,
    dispatch: identity,
    container: {
      name: 'Text',
      update: new Map([
        [SetText, identity]
      ])
    }
  }
};

const messages = [{
  context: contexts.counter,
  msg: new Increment({ step: 1 }),
  cmds: [],
  path: ['counter'],
  prev: { counter: { value: 10 } },
  next: { value: 11 }
}, {
  context: contexts.counter,
  msg: new Decrement({ step: 2 }),
  cmds: [],
  path: ['counter'],
  prev: { counter: { value: 11 } },
  next: { value: 9 }
}, {
  context: contexts.text,
  msg: new SetText({ value: 'hello' }),
  cmds: [],
  path: ['text'],
  prev: { text: { value: '' } },
  next: { value: 'hello' }
}];

describe('Instrumenter', () => {
  let onMessage: sinon.SinonStub;
  let withStateManager: sinon.SinonStub;
  let instance: Instrumenter;

  beforeEach(() => {
    onMessage = sinon.stub(instrumentation, 'onMessage')
    withStateManager = sinon.stub(instrumentation, 'withStateManager');
    instance = new Instrumenter();
  });


  afterEach(() => {
    onMessage.restore();
    withStateManager.restore();
    delete window[INSTRUMENTER_KEY];
  })

  describe('constructor', () => {
    it('acts as a singleton', () => {
      const another = new Instrumenter();
      expect(another).to.equal(instance);
    });
  });

  it('stores the root state manager as a public property', () => {
    expect(instance.stateManager).to.be.undefined;

    withStateManager.yield('mockStateManager');
    expect(instance.stateManager).to.equal('mockStateManager');
  });

  it('stores each unique context in a public object', () => {
    expect(instance.contexts).to.deep.equal({});

    onMessage.yield(messages[0]);
    expect(instance.contexts).to.deep.equal({ counter: contexts.counter });

    onMessage.yield(messages[1]);
    expect(instance.contexts).to.deep.equal({ counter: contexts.counter });

    onMessage.yield(messages[2]);
    expect(instance.contexts).to.deep.equal({
      counter: contexts.counter,
      text: contexts.text
    });
  });

  context('when a backend is added', () => {
    let connect: () => void;
    let disconnect: () => void;
    let send: (msg: InboundMessage) => void;
    let received: any[];

    beforeEach(() => {
      received = [];

      instance.addBackend('test', spec => {
        connect = spec.connect;
        disconnect = spec.disconnect;
        send = spec.send;

        return msg => received.push(msg);
      })
    });

    it('queues received messages until backend signals that it is connected`', () => {
      messages.forEach(msg => onMessage.yield(msg));
      expect(received).to.have.length(1);

      connect();
      expect(received).to.have.length(4);

      disconnect();
      messages.forEach(msg => onMessage.yield(msg));
      expect(received).to.have.length(4);

      connect();
      expect(received).to.have.length(7);
    });

    describe('when inbound message contains a `selected` property', () => {
      it('uses `withStateManager` to update the state', () => {
        send({
          selected: {
            path: ['counter'],
            prev: {
              counter: {
                value: 10
              }
            },
            next: {
              value: 11
            }
          }
        } as any);

        const stateManager = { set: sinon.spy() };
        withStateManager.yield(stateManager);

        expect(stateManager.set.lastCall.args).to.deep.equal([{
          counter: {
            value: 11
          }
        }]);
      });
    });

    describe('when inbound message contains a `dispatch` property', () => {
      beforeEach(() => {
        onMessage.yield(messages[0]);
      });

      it('creates a Message instance and dispatches it to the appropriate Execution Context', () => {
        const dispatch = sinon.stub(contexts.counter, 'dispatch');

        send({
          dispatch: {
            name: 'Counter',
            message: 'Increment',
            data: { step: 5 }
          }
        });

        expect(dispatch.lastCall.args[0]).to.be.instanceOf(Increment);
        expect(dispatch.lastCall.args[0].data).to.deep.equal({ step: 5 });
      });
    });

    describe('when inbound message contains a `containersHandling` property', () => {
      beforeEach(() => {
        messages.forEach(msg => onMessage.yield(msg));
      });

      it('returns a list of Container names that handle the named message', () => {
        send({
          requestId: 1,
          containersHandling: 'Increment'
        });

        expect(received[1]).to.deep.equal({
          requestId: 1,
          containers: ['Counter']
        });
      });
    });

    describe('when inbound message contains a `messageNames` property', () => {
      beforeEach(() => {
        messages.forEach(msg => onMessage.yield(msg));
      });

      it('returns a list of matching Message names and the Containers they are handled by', () => {
        send({
          requestId: 1,
          messageNames: 'Inc'
        });

        expect(received[1]).to.deep.equal({
          requestId: 1,
          messageNames: {
            Increment: ['Counter']
          }
        });
      });
    });
  });
});
