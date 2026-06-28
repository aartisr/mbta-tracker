import { describe, expect, it, vi } from 'vitest';
import { ProtobufFeedPoller, decodeProtobufFeed, normalizeProtobufFeed } from './poller';

describe('server poller helpers', () => {
  it('normalizes protobuf entities into vehicles', () => {
    const vehicles = normalizeProtobufFeed({
      entity: [
        {
          id: 'veh-1',
          vehicle: {
            trip: { routeId: 'Red' },
            position: { latitude: 42.36, longitude: -71.06, bearing: 180 },
            timestamp: '1234'
          }
        },
        {
          id: 'bad',
          vehicle: {}
        }
      ]
    });

    expect(vehicles).toEqual([
      {
        id: 'veh-1',
        route: 'Red',
        lat: 42.36,
        lon: -71.06,
        bearing: 180,
        timestamp: '1234'
      }
    ]);
  });

  it('delegates buffer decoding to the protobuf feed message type', () => {
    const decode = vi.fn(() => ({ ok: true }));
    const toObject = vi.fn(() => ({ entity: [] }));

    const output = decodeProtobufFeed({ decode, toObject }, new Uint8Array([1, 2, 3]).buffer);

    expect(decode).toHaveBeenCalled();
    expect(toObject).toHaveBeenCalledWith({ ok: true }, { longs: String });
    expect(output).toEqual({ entity: [] });
  });

  it('diffs successive protobuf poll results', async () => {
    const poller = new ProtobufFeedPoller({
      decode: () => ({ feed: true }),
      toObject: () => ({
        entity: [
          {
            id: 'veh-1',
            vehicle: {
              trip: { routeId: '1' },
              position: { latitude: 42.36, longitude: -71.06, bearing: 0 },
              timestamp: '1000'
            }
          }
        ]
      })
    }, 'mock://feed');

    const axios = await import('axios');
    const getSpy = vi.spyOn(axios.default, 'get').mockResolvedValue({ data: new Uint8Array([1]).buffer });

    const first = await poller.poll();
    const second = await poller.poll();

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);

    getSpy.mockRestore();
  });
});