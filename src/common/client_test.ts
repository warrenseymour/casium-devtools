import { expect } from 'chai';
import { Client } from './client';

let client: Client;

beforeEach(() => {
  client = new Client();

  client.contexts = {
    empty: {} as any,
    test: {
      container: {
        update: new Map([
          [{ name: 'Increment' }, (model: any, message: any, relay: any) => ({
            count: relay.token === 'test' ? model.count + message.step : 0
          })],
          [{ name: 'IncrementTwice' }, (model: any, message: any, relay: any) => ({
            count: relay.token.length > 0 && relay.token.length < 5 ? model.count + model.count + message.step : 0
          })],
          [{ name: 'IncrementCounter' }, (model: any, message: any) => ({ count: model.counter.count + message.step })],
          [{ name: 'IncrementKeys' }, (model: any, message: any) => ({ count: model.count + Object.keys(message).length })]
        ])
      }
    } as any
  }
});

describe('#getUpdater', () => {
  it('throws an error when `context` does not exist', () => {
    expect(() => client.getUpdater({ context: '1234' } as any))
      .to.throw(`Context '1234' does not exist`);
  });

  it('throws an error when `context` does not have a container', () => {
    expect(() => client.getUpdater({ context: 'empty' } as any))
      .to.throw(`Context 'empty' does not have a container`);
  });

  it('throws an error when Updater of type `Name` does not exist', () => {
    expect(() => client.getUpdater({ context: 'test', message: 'Test' } as any))
      .to.throw(`Context 'test' does not contain an Updater of type 'Test'`);
  });
});

describe('#dependencyTrace()', () => {
  it('returns paths accessed by Updater on `model`, `message` and `relay`', () => {
    const trace = client.dependencyTrace({
      context: 'test',
      message: 'Increment',
      prev: { count: 0 },
      data: { step: 1 },
      relay: { token: 'test' }
    } as any);

    expect(trace).to.deep.equal({
      model: [['count']],
      message: [['step']],
      relay: [['token']]
    });
  });

  it('handles deeply nested paths', () => {
    const trace = client.dependencyTrace({
      context: 'test',
      message: 'IncrementCounter',
      prev: { counter: { count: 0 } },
      data: { step: 1 },
      relay: { token: 'test' }
    } as any);

    expect(trace).to.deep.equal({
      model: [
        ['counter'],
        ['counter', 'count']
      ],
      message: [['step']],
      relay: []
    });
  });

  it('de-duplicates paths', () => {
    const trace = client.dependencyTrace({
      context: 'test',
      message: 'IncrementTwice',
      prev: { count: 0 },
      data: { step: 1 },
      relay: { token: 'test' }
    } as any);

    expect(trace).to.deep.equal({
      model: [['count']],
      message: [['step']],
      relay: [['token']]
    });
  });

  it('handles key enumeration', () => {
    const trace = client.dependencyTrace({
      context: 'test',
      message: 'IncrementKeys',
      prev: { count: 0 },
      data: { step: 1, other: 2 },
      relay: { token: 'test' }
    } as any);

    expect(trace).to.deep.equal({
      model: [['count']],
      message: [
        ['step'],
        ['other']
      ],
      relay: []
    });
  });
})
