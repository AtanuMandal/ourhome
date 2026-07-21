import * as tokenStore from '../../src/auth/tokenStore';

jest.mock('../../src/auth/tokenStore');

const mockTokenStore = tokenStore as jest.Mocked<typeof tokenStore>;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const client = require('../../src/api/client');
const api = client.default;
const setAuthEventListener: (listener: () => void) => void = client.setAuthEventListener;

describe('api client response interceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenStore.clearTokens.mockResolvedValue(undefined);
  });

  function getResponseErrorHandler(): (error: unknown) => Promise<unknown> {
    const handlers = api.interceptors.response.handlers as Array<{ rejected: (error: unknown) => Promise<unknown> }>;
    return handlers[0].rejected;
  }

  test('clears tokens and fires the auth event listener on a 401', async () => {
    const listener = jest.fn();
    setAuthEventListener(listener);

    const rejected = getResponseErrorHandler();
    await expect(rejected({ response: { status: 401, data: {} } })).rejects.toBeDefined();

    expect(mockTokenStore.clearTokens).toHaveBeenCalled();
    expect(listener).toHaveBeenCalled();
  });

  test('clears tokens and fires the auth event listener when the society has been disabled', async () => {
    const listener = jest.fn();
    setAuthEventListener(listener);

    const rejected = getResponseErrorHandler();
    await expect(rejected({
      response: { status: 403, data: { error: 'Your society has been disabled.', errorCode: 'SOCIETY_NOT_ACTIVE' } },
    })).rejects.toBeDefined();

    expect(mockTokenStore.clearTokens).toHaveBeenCalled();
    expect(listener).toHaveBeenCalled();
  });

  test('does not clear tokens on a generic 403', async () => {
    const listener = jest.fn();
    setAuthEventListener(listener);

    const rejected = getResponseErrorHandler();
    await expect(rejected({
      response: { status: 403, data: { error: 'Forbidden', errorCode: 'FORBIDDEN' } },
    })).rejects.toBeDefined();

    expect(mockTokenStore.clearTokens).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── requirements/telemetry_observability.md §7 — mobile trace propagation + relay ─────────

describe('api client request interceptor — traceparent stamping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenStore.getToken.mockResolvedValue('a-jwt');
  });

  function getRequestHandler(): (config: any) => Promise<any> {
    const handlers = api.interceptors.request.handlers as Array<{ fulfilled: (config: any) => Promise<any> }>;
    return handlers[0].fulfilled;
  }

  test('stamps a well-formed W3C traceparent header on a normal request', async () => {
    const fulfilled = getRequestHandler();

    const result = await fulfilled({ headers: {}, url: 'societies/soc-1/complaints' });

    expect(result.headers['traceparent']).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  test('does not stamp a traceparent header on calls to the telemetry relay itself', async () => {
    const fulfilled = getRequestHandler();

    const result = await fulfilled({ headers: {}, url: 'telemetry/client-events' });

    expect(result.headers['traceparent']).toBeUndefined();
  });

  test('generates a different trace id on each call', async () => {
    const fulfilled = getRequestHandler();

    const a = await fulfilled({ headers: {}, url: 'societies/soc-1/complaints' });
    const b = await fulfilled({ headers: {}, url: 'societies/soc-1/complaints' });

    expect(a.headers['traceparent']).not.toBe(b.headers['traceparent']);
  });
});

describe('api client response interceptor — network-failure telemetry relay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenStore.clearTokens.mockResolvedValue(undefined);
  });

  function getResponseErrorHandler(): (error: unknown) => Promise<unknown> {
    const handlers = api.interceptors.response.handlers as Array<{ rejected: (error: unknown) => Promise<unknown> }>;
    return handlers[0].rejected;
  }

  test('reports a pure network failure (no response at all) to the telemetry relay', async () => {
    const postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: undefined });
    const rejected = getResponseErrorHandler();

    await expect(
      rejected({
        message: 'Network Error',
        config: {
          url: 'societies/soc-1/complaints',
          method: 'post',
          headers: { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' },
        },
      })
    ).rejects.toBeDefined();

    expect(postSpy).toHaveBeenCalledWith(
      'telemetry/client-events',
      expect.objectContaining({
        events: [expect.objectContaining({ traceId: '4bf92f3577b34da6a3ce929d0e0e4736', httpStatusCode: 0 })],
      })
    );
  });

  test('does not report to the relay when the server actually responded (not a network failure)', async () => {
    const postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: undefined });
    const rejected = getResponseErrorHandler();

    await expect(
      rejected({ response: { status: 404, data: { error: 'not found' } }, config: { url: 'societies/soc-1/complaints/x' } })
    ).rejects.toBeDefined();

    expect(postSpy).not.toHaveBeenCalled();
  });

  test('does not report a network failure for a call to the relay endpoint itself (no reporting loop)', async () => {
    const postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: undefined });
    const rejected = getResponseErrorHandler();

    await expect(
      rejected({ message: 'Network Error', config: { url: 'telemetry/client-events', headers: {} } })
    ).rejects.toBeDefined();

    expect(postSpy).not.toHaveBeenCalled();
  });

  test('does not report when the network failure carries no traceparent header to correlate', async () => {
    const postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: undefined });
    const rejected = getResponseErrorHandler();

    await expect(
      rejected({ message: 'Network Error', config: { url: 'societies/soc-1/complaints', headers: {} } })
    ).rejects.toBeDefined();

    expect(postSpy).not.toHaveBeenCalled();
  });
});
