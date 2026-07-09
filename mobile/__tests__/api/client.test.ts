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
