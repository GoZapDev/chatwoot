import { afterEach, describe, expect, it, vi } from 'vitest';
import { IFrameHelper } from './IFrameHelper';

describe('IFrameHelper identity replay', () => {
  afterEach(() => {
    delete window.$chatwoot;
    delete window.playAudioAlert;
    vi.restoreAllMocks();
  });

  it('replays the identifier together with the user after iframe load', () => {
    const user = { email: 'customer@example.com', name: 'Customer' };
    window.$chatwoot = {
      baseDomain: '',
      identifier: 'customer@example.com',
      user,
      hasLoaded: false,
      resetTriggered: false,
    };
    vi.spyOn(IFrameHelper, 'sendMessage').mockImplementation(() => {});
    vi.spyOn(IFrameHelper, 'onLoad').mockImplementation(() => {});
    vi.spyOn(IFrameHelper, 'toggleCloseButton').mockImplementation(() => {});

    IFrameHelper.events.loaded({
      config: {
        authToken: 'auth-token',
        channelConfig: { widgetColor: '#000' },
      },
    });

    expect(IFrameHelper.sendMessage).toHaveBeenCalledWith('set-user', {
      identifier: 'customer@example.com',
      user,
    });
    expect(IFrameHelper.onLoad).not.toHaveBeenCalled();

    IFrameHelper.events.userIdentified();

    expect(IFrameHelper.onLoad).toHaveBeenCalledWith({ widgetColor: '#000' });
  });
});
