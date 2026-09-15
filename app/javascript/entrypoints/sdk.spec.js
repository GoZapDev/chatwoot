import Cookies from 'js-cookie';
import { IFrameHelper } from '../sdk/IFrameHelper';
import { computeHashForUserData } from '../sdk/cookieHelpers';
import './sdk';

vi.mock('../sdk/IFrameHelper', () => ({
  IFrameHelper: {
    createFrame: vi.fn(),
    sendMessage: vi.fn(),
    events: { toggleBubble: vi.fn() },
    getAppFrame: vi.fn(() => ({ src: '' })),
    getUrl: vi.fn(
      ({ baseUrl, websiteToken }) =>
        `${baseUrl}/widget?website_token=${websiteToken}`
    ),
  },
}));

describe('$chatwoot.setUser', () => {
  beforeEach(() => {
    delete window.$chatwoot;
    window.chatwootSettings = {};
    IFrameHelper.sendMessage.mockClear();
    vi.spyOn(Cookies, 'get').mockReturnValue(undefined);
    vi.spyOn(Cookies, 'set').mockImplementation(() => {});

    window.chatwootSDK.run({
      baseUrl: 'https://app.chatwoot.com',
      websiteToken: 'website-token',
    });
  });

  afterEach(() => {
    delete window.$chatwoot;
    delete window.chatwootSettings;
    vi.restoreAllMocks();
  });

  it('updates the SDK identity synchronously', () => {
    const user = { name: 'Pranav' };

    const result = window.$chatwoot.setUser('first-user', user);

    expect(result).toBeUndefined();
    expect(window.$chatwoot.identifier).toBe('first-user');
    expect(window.$chatwoot.user).toBe(user);
    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith('set-user', {
      identifier: 'first-user',
      user,
    });
  });

  it('keeps the latest identity after consecutive calls', () => {
    const firstUser = { name: 'First user' };
    const secondUser = { name: 'Second user' };

    window.$chatwoot.setUser('first-user', firstUser);
    window.$chatwoot.setUser('second-user', secondUser);

    expect(window.$chatwoot.identifier).toBe('second-user');
    expect(window.$chatwoot.user).toBe(secondUser);
    expect(IFrameHelper.sendMessage).toHaveBeenLastCalledWith('set-user', {
      identifier: 'second-user',
      user: secondUser,
    });
  });

  it('replays a cached identity when the current iframe is already loaded', () => {
    const user = { email: 'known@example.com', name: 'Known user' };
    window.$chatwoot.hasLoaded = true;
    Cookies.get.mockReturnValue(
      computeHashForUserData({ identifier: 'known-user', user })
    );

    window.$chatwoot.setUser('known-user', user);

    expect(window.$chatwoot.identifier).toBe('known-user');
    expect(window.$chatwoot.user).toBe(user);
    expect(IFrameHelper.sendMessage).toHaveBeenLastCalledWith('set-user', {
      identifier: 'known-user',
      user,
    });
  });

  it('keeps a cached identity in memory for replay when the iframe is loading', () => {
    const user = { email: 'known@example.com', name: 'Known user' };
    Cookies.get.mockReturnValue(
      computeHashForUserData({ identifier: 'known-user', user })
    );

    window.$chatwoot.setUser('known-user', user);

    expect(window.$chatwoot.identifier).toBe('known-user');
    expect(window.$chatwoot.user).toBe(user);
    expect(IFrameHelper.sendMessage).not.toHaveBeenCalledWith('set-user', {
      identifier: 'known-user',
      user,
    });
  });

  it('clears the in-memory identity on reset', () => {
    window.$chatwoot.setUser('first-user', { name: 'First user' });
    window.$chatwoot.pendingIdentityMessage = { config: {} };

    window.$chatwoot.reset();

    expect(window.$chatwoot.identifier).toBeUndefined();
    expect(window.$chatwoot.user).toBeUndefined();
    expect(window.$chatwoot.pendingIdentityMessage).toBeUndefined();
  });

  it('keeps the close bubble enabled by default', () => {
    expect(window.$chatwoot.hideCloseBubble).toBe(false);
  });

  it('accepts disabling the close bubble for hosts that close on outside click', () => {
    delete window.$chatwoot;
    window.chatwootSettings = { hideCloseBubble: true };
    window.chatwootSDK.run({
      baseUrl: 'https://app.chatwoot.com',
      websiteToken: 'website-token',
    });

    expect(window.$chatwoot.hideCloseBubble).toBe(true);
  });
});
